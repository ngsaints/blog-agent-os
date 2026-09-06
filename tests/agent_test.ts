import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildUserPrompt,
  categoryName,
  countNewsOccurrencesInArticles,
  isSameNewsTopic,
  parseArticleJson,
} from "../src/agent.ts";
import { createSession, parseCookies, SESSION_COOKIE, verifySession } from "../src/auth.ts";

const LONG_CONTENT = "<p>" +
  "Conteúdo de exemplo com mais de duzentos caracteres para passar na validação de tamanho mínimo do artigo. "
    .repeat(5) +
  "</p>";

const ARTICLE = {
  title: "Meu artigo incrível",
  excerpt: "Resumo curto",
  content_html: LONG_CONTENT,
  slug: "meu-artigo-incrivel",
  tags: "ia, tutorial",
};

test("parseArticleJson: JSON puro", () => {
  const article = parseArticleJson(JSON.stringify(ARTICLE));
  assert.equal(article.title, "Meu artigo incrível");
  assert.equal(article.slug, "meu-artigo-incrivel");
  assert.ok(article.contentHtml.length > 200);
});

test("parseArticleJson: com fences de markdown", () => {
  const raw = "```json\n" + JSON.stringify(ARTICLE) + "\n```";
  const article = parseArticleJson(raw);
  assert.equal(article.title, "Meu artigo incrível");
});

test("parseArticleJson: texto antes e depois do JSON", () => {
  const raw = "Aqui está seu artigo:\n" + JSON.stringify(ARTICLE) + "\nEspero que goste!";
  const article = parseArticleJson(raw);
  assert.equal(article.tags, "ia, tutorial");
});

test("parseArticleJson: título inválido lança erro", () => {
  assert.throws(() => parseArticleJson(JSON.stringify({ ...ARTICLE, title: "x" })));
});

test("parseArticleJson: conteúdo curto lança erro", () => {
  assert.throws(() =>
    parseArticleJson(JSON.stringify({ ...ARTICLE, content_html: "<p>curto</p>" }))
  );
});

test("parseArticleJson: resposta vazia lança erro", () => {
  assert.throws(() => parseArticleJson("   "));
});

test("parseArticleJson: resposta não-JSON lança erro", () => {
  assert.throws(() => parseArticleJson("Apenas um texto solto sem JSON"));
});

test("buildUserPrompt: inclui tema e categoria", () => {
  const prompt = buildUserPrompt({
    id: 1,
    name: "Agente Teste",
    description: "Foco em IA",
    model: "test/model",
    imageModel: "",
    imageSourceMode: "ai_only",
    toolsEnabled: false,
    role: "writer",
    reviewerId: null,
    avatar: "bot",
    imageAspectRatio: "9:16",
    dailyPostLimit: 0,
    blogId: 1,
    categoryId: 1,
    publishToBlog: true,
    pinterestEnabled: false,
    imageGen: false,
    scheduleMinutes: 720,
    maxTokens: 8192,
    prompt: "Escreva sobre agentes",
    status: "active",
    postCount: 0,
    lastRunAt: null,
    lastError: null,
    createdAt: new Date().toISOString(),
  });
  assert.ok(prompt.includes("Escreva sobre agentes"));
  assert.ok(prompt.includes("Inteligência Artificial"));
});

test("buildUserPrompt: inclui retroalimentação de posts mais vistos", () => {
  const agent = {
    id: 1,
    name: "Agente Analytics",
    description: "Foco em IA",
    model: "test/model",
    imageModel: "",
    imageSourceMode: "ai_only" as const,
    toolsEnabled: false,
    role: "writer" as const,
    reviewerId: null,
    avatar: "bot",
    imageAspectRatio: "9:16" as const,
    dailyPostLimit: 0,
    blogId: 1,
    categoryId: 1,
    publishToBlog: true,
    pinterestEnabled: false,
    imageGen: false,
    scheduleMinutes: 720,
    maxTokens: 8192,
    prompt: "Tendências de mercado",
    status: "active" as const,
    postCount: 0,
    lastRunAt: null,
    lastError: null,
    createdAt: new Date().toISOString(),
  };

  const topPosts = [
    { id: 10, title: "Top 5 Modelos Gratuitos", slug: "top-5-modelos", views_7d: 1450, view_count: 5000, unique_visitors: 1200 },
    { id: 11, title: "Como Criar Agentes", slug: "como-criar-agentes", views_7d: 890, view_count: 3200, unique_visitors: 750 },
  ];

  const prompt = buildUserPrompt(agent, topPosts);
  assert.ok(prompt.includes("DESEMPENHO RECENTE DE AUDIÊNCIA"));
  assert.ok(prompt.includes("Top 5 Modelos Gratuitos"));
  assert.ok(prompt.includes("1.450 visualizações"));
  assert.ok(prompt.includes("DIRETRIZ EDITORIAL DE ALTA PERFORMANCE"));
});

test("buildUserPrompt: inclui histórico recente de artigos e diretriz de não-repetição", () => {
  const agent = {
    id: 1,
    name: "Agente Notícias",
    description: "Foco em Tecnologia",
    model: "test/model",
    imageModel: "",
    imageSourceMode: "ai_only" as const,
    toolsEnabled: false,
    role: "writer" as const,
    reviewerId: null,
    avatar: "bot",
    imageAspectRatio: "16:9" as const,
    dailyPostLimit: 0,
    blogId: 1,
    categoryId: 1,
    publishToBlog: true,
    pinterestEnabled: false,
    imageGen: false,
    scheduleMinutes: 720,
    maxTokens: 8192,
    prompt: "Notícias recentes",
    status: "active" as const,
    postCount: 0,
    lastRunAt: null,
    lastError: null,
    createdAt: new Date().toISOString(),
  };

  const recentArticles = [
    { title: "Romi-Isetta: 70 Anos do Primeiro Carro Fabricado no Brasil", slug: "romi-isetta-70-anos" },
    { title: "Como Ganhar Dinheiro no TikTok em 2026 com Creator Rewards", slug: "tiktok-2026" },
  ];

  const prompt = buildUserPrompt(agent, [], undefined, [], recentArticles);
  assert.ok(prompt.includes("ÚLTIMOS ARTIGOS JÁ PUBLICADOS RECENTEMENTE NO BLOG"));
  assert.ok(prompt.includes("Romi-Isetta: 70 Anos do Primeiro Carro Fabricado no Brasil"));
  assert.ok(prompt.includes("Como Ganhar Dinheiro no TikTok em 2026 com Creator Rewards"));
  assert.ok(prompt.includes("DIRETRIZ DE INEDITISMO E NÃO-REPETIÇÃO"));
  assert.ok(prompt.includes("limite máximo de 2 abordagens"));
});

test("isSameNewsTopic: identifica notícias do mesmo tema e diferencia temas distintos", () => {
  const newsRomi = "Em 1956, a Romi-Isetta estreava como o primeiro carro fabricado no Brasil. Setenta anos depois cidade celebra o ícone.";
  const articleRomi1 = "Romi-Isetta: 70 Anos do Primeiro Carro Fabricado no Brasil";
  const articleRomi2 = "História da Romi-Isetta e sua celebração histórica";
  const articleOutro = "Como Investir em Inteligência Artificial para Pequenos Negócios";

  assert.equal(isSameNewsTopic(newsRomi, articleRomi1), true);
  assert.equal(isSameNewsTopic(newsRomi, articleRomi2), true);
  assert.equal(isSameNewsTopic(newsRomi, articleOutro), false);

  const newsTiktok = "Novas regras do TikTok Creator Rewards para criadores em 2026";
  const articleTiktok = "Como Ganhar Dinheiro no TikTok em 2026: Guia do Creator Rewards";
  assert.equal(isSameNewsTopic(newsTiktok, articleTiktok), true);
});

test("countNewsOccurrencesInArticles: conta corretamente ocorrências e bloqueia limite 2x", () => {
  const news = "Em 1956, a Romi-Isetta estreava como o primeiro carro fabricado no Brasil.";
  const articles0: string[] = ["Como Fazer Gestão Financeira", "Novos Modelos de IA"];
  const articles1: string[] = ["Romi-Isetta: 70 Anos do Primeiro Carro Fabricado no Brasil", "Outro Artigo Qualquer"];
  const articles2: string[] = [
    "Romi-Isetta: 70 Anos do Primeiro Carro Fabricado no Brasil",
    "A História Completa da Romi-Isetta no Brasil",
    "Outro Post Desvinculado",
  ];

  assert.equal(countNewsOccurrencesInArticles(news, articles0), 0);
  assert.equal(countNewsOccurrencesInArticles(news, articles1), 1);
  assert.equal(countNewsOccurrencesInArticles(news, articles2), 2);
  assert.ok(countNewsOccurrencesInArticles(news, articles2) >= 2);
});

test("categoryName: mapa conhecido e fallback", () => {
  assert.equal(categoryName(1), "Inteligência Artificial");
  assert.equal(categoryName(2), "Economia");
  assert.equal(categoryName(99), "Categoria 99");
});

test("auth: sessão válida", async () => {
  const secret = "segredo-super-forte-12345";
  const session = await createSession("admin", secret);
  assert.equal(await verifySession(session, secret), true);
});

test("auth: sessão adulterada é rejeitada", async () => {
  const secret = "segredo-super-forte-12345";
  const session = await createSession("admin", secret);
  const dot = session.lastIndexOf(".");
  const first = session[dot + 1];
  const tampered = session.slice(0, dot + 1) + (first === "a" ? "b" : "a") +
    session.slice(dot + 2);
  assert.equal(await verifySession(tampered, secret), false);
});

test("auth: sessão expirada é rejeitada", async () => {
  const secret = "segredo-super-forte-12345";
  const session = await createSession("admin", secret, Date.now() - 25 * 60 * 60 * 1000);
  assert.equal(await verifySession(session, secret), false);
});

test("auth: cookie inválido é rejeitado", async () => {
  assert.equal(await verifySession("abc", "segredo"), false);
  assert.equal(await verifySession(null, "segredo"), false);
});

test("auth: parseCookies", () => {
  const cookies = parseCookies(`${SESSION_COOKIE}=abc123; outro=def`);
  assert.equal(cookies[SESSION_COOKIE], "abc123");
  assert.equal(cookies.outro, "def");
  assert.deepEqual(parseCookies(null), {});
});

test("BlogApiClient: listPosts com sort e metricas", async () => {
  const { BlogApiClient } = await import("../src/blog_api.ts");
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";

  globalThis.fetch = (async (input: string | URL | Request) => {
    capturedUrl = String(input);
    return new Response(
      JSON.stringify({
        posts: [
          {
            id: 10,
            title: "Post Popular",
            slug: "post-popular",
            view_count: 1500,
            views_7d: 300,
            unique_visitors: 1200,
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const client = new BlogApiClient("https://meublog.com/api/cli", "token123");
    const topPosts = await client.getTopPosts("views", 5);
    assert.ok(capturedUrl.includes("sort=views"));
    assert.ok(capturedUrl.includes("limit=5"));
    assert.equal(topPosts[0].unique_visitors, 1200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reviewAndPolishArticle: aprimora rascunho com agente revisor", async () => {
  const { reviewAndPolishArticle } = await import("../src/agent.ts");
  const { OpenRouterClient } = await import("../src/openrouter.ts");

  const originalFetch = globalThis.fetch;
  const mockPolished = {
    title: "Título Polido e Atraente para SEO",
    excerpt: "Resumo perfeitamente refinado com menos de 160 caracteres.",
    content_html: LONG_CONTENT + "<p>Texto adicional revisado pelo editor.</p>",
    slug: "titulo-polido-e-atraente-para-seo",
    tags: "ia, tecnologia, seo",
  };

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("chat/completions")) {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(mockPolished) } }],
          model: "google/gemini-2.0-flash-001",
          usage: { prompt_tokens: 150, completion_tokens: 250 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.includes("models")) {
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Not Found", { status: 404 });
  }) as typeof fetch;

  try {
    const or = new OpenRouterClient(() => "sk-teste");
    const reviewerAgent = {
      id: 2,
      name: "Revisor Free",
      description: "Editor de qualidade",
      model: "google/gemini-2.0-flash-001",
      imageModel: "",
      imageSourceMode: "ai_only" as const,
      toolsEnabled: false,
      role: "reviewer" as const,
      reviewerId: null,
      avatar: "bot",
      imageAspectRatio: "9:16" as const,
      dailyPostLimit: 0,
      blogId: null,
      categoryId: 1,
      publishToBlog: false,
      pinterestEnabled: false,
      imageGen: false,
      scheduleMinutes: 0,
      maxTokens: 4096,
      prompt: "Elimine clichês de IA",
      status: "active" as const,
      postCount: 0,
      lastRunAt: null,
      lastError: null,
      createdAt: new Date().toISOString(),
    };

    const draft = {
      title: "Rascunho Inicial",
      excerpt: "Resumo preliminar",
      contentHtml: LONG_CONTENT,
      slug: "rascunho-inicial",
      tags: "ia",
    };

    const res = await reviewAndPolishArticle(draft, reviewerAgent, or);
    assert.equal(res.article.title, "Título Polido e Atraente para SEO");
    assert.equal(res.article.slug, "titulo-polido-e-atraente-para-seo");
    assert.equal(res.tokensIn, 150);
    assert.equal(res.tokensOut, 250);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("parseImagePostJson: interpreta JSON de post visual para Pinterest", async () => {
  const { parseImagePostJson } = await import("../src/agent.ts");
  const raw = JSON.stringify({
    title: "10 Ideias de Home Office Minimalista",
    excerpt: "Inspirações e setups organizados para aumentar sua produtividade.",
    image_prompt: "A minimalist modern home office desk setup with warm natural sunlight, wood textures, indoor plants, 8k photography",
    content_html: "<p>Dicas para organizar sua mesa.</p>",
    tags: "home office, decor, produtividade",
  });
  const res = parseImagePostJson(raw);
  assert.equal(res.title, "10 Ideias de Home Office Minimalista");
  assert.ok(res.image_prompt.includes("minimalist"));
  assert.ok(res.excerpt.includes("Inspirações"));
});

test("renderAvatar: renderiza badge 2.5D com SVG ou imagem", async () => {
  const { renderAvatar } = await import("../src/dashboard.ts");
  const svgBadge = renderAvatar("bot", 44, "gold");
  assert.ok(svgBadge.includes("badge-25d"));
  assert.ok(svgBadge.includes("badge-gold"));
  assert.ok(svgBadge.includes("<svg"));

  const imgBadge = renderAvatar("https://meusite.com/avatar.png", 50, "silver");
  assert.ok(imgBadge.includes("badge-silver"));
  assert.ok(imgBadge.includes("<img src=\"https://meusite.com/avatar.png\""));
});

test("ensureSemanticHtml: converte texto puro com quebras em HTML semântico limpo", async () => {
  const { ensureSemanticHtml, parseArticleJson } = await import("../src/agent.ts");

  const rawSample = `Com base nas pesquisas realizadas, preparei o conteúdo editorial completo.
\`\`\`json
{
  "title": "Jogos de hoje (05/09/26): onde assistir ao vivo",
  "excerpt": "Sábado de futebol do amanhecer à madrugada.",
  "content_html": "O sábado do torcedor brasileiro começa antes do café e termina depois da meia-noite.\\n\\nA agenda esportiva desta sexta-feira, 5 de setembro de 2026, anunciada pelo [Olhar Digital](https://exemplo.com), reserva mais de 40 partidas ao vivo.\\n\\n## Onde Assistir aos Principais Jogos\\n\\nConfira os destaques:\\n* Fluminense x Vasco: 18h no Maracanã\\n* Real Madrid x Betis: 16h em streaming\\n\\nPrepare a pipoca e acompanhe cada lance com emoção."
}
\`\`\`
Esperamos que aproveite o artigo!`;

  const parsed = parseArticleJson(rawSample);
  assert.equal(parsed.title, "Jogos de hoje (05/09/26): onde assistir ao vivo");
  assert.equal(parsed.excerpt, "Sábado de futebol do amanhecer à madrugada.");
  
  // Confere que contentHtml é HTML semântico com tags <p>, <h2>, <ul>, <a>
  assert.ok(parsed.contentHtml.includes("<p>O sábado do torcedor brasileiro começa antes do café"));
  assert.ok(parsed.contentHtml.includes('<a href="https://exemplo.com"'));
  assert.ok(parsed.contentHtml.includes("<h2>Onde Assistir aos Principais Jogos</h2>"));
  assert.ok(parsed.contentHtml.includes("<ul>"));
  assert.ok(parsed.contentHtml.includes("<li>Fluminense x Vasco: 18h no Maracanã</li>"));
  assert.ok(parsed.contentHtml.includes("<p>Prepare a pipoca e acompanhe cada lance com emoção.</p>"));
  assert.ok(!parsed.contentHtml.includes("\\n"));
  assert.ok(!parsed.contentHtml.includes("Com base nas pesquisas"));
  assert.ok(!parsed.contentHtml.includes("```"));
});

test("parseArticleJson: JSON sem content_html lança erro e não vaza JSON no corpo", async () => {
  const { parseArticleJson } = await import("../src/agent.ts");

  const sampleWithoutBody = JSON.stringify({
    title: "Como Ganhar Dinheiro no TikTok em 2026",
    excerpt: "Descubra as estratégias mais atualizadas.",
    slug: "como-ganhar-dinheiro-no-tiktok-2026",
    tags: "tiktok, monetizacao",
  });

  assert.throws(() => {
    parseArticleJson(sampleWithoutBody);
  }, /Artigo muito curto|não contém content_html/i);
});


