import type { Agent, SqlStore } from "./turso_store.ts";
import type { OpenRouterClient } from "./openrouter.ts";
import { type PexelsClient, type PexelsOrientation } from "./pexels.ts";
import type { BlogApiClient, PostItem } from "./blog_api.ts";
import type { SettingsService } from "./settings.ts";
import { OpenRouter as AgentSdkOpenRouter, tool, stepCountIs, maxCost } from "@openrouter/agent";
import { z } from "zod";

export interface Article {
  title: string;
  excerpt: string;
  contentHtml: string;
  slug?: string;
  tags?: string;
}

export function createAgentTools(blog?: BlogApiClient, pexels?: PexelsClient) {
  const searchWebTool = tool({
    name: "search_web",
    description: "Pesquisa na internet por notícias recentes, fatos, dados e referências sobre qualquer assunto",
    inputSchema: z.object({
      query: z.string().describe("Termo de busca na web"),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        title: z.string(),
        snippet: z.string(),
      })),
    }),
    nextTurnParams: {
      instructions: (params, ctx) => {
        const base = ctx.instructions ?? "";
        return `${base}\n\n[DADOS WEB]: A busca por "${params.query}" foi realizada. Incorpore estes dados no artigo com máxima autoridade editorial.`;
      },
      temperature: () => 0.35,
    },
    execute: async ({ query }) => {
      try {
        const encoded = encodeURIComponent(query);
        const res = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(5000),
        });
        const html = await res.text();
        const results: { title: string; snippet: string }[] = [];
        const regex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        while ((match = regex.exec(html)) !== null && results.length < 5) {
          const snippet = match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
          if (snippet) {
            results.push({
              title: `Info sobre: ${query}`,
              snippet,
            });
          }
        }
        if (results.length === 0) {
          return { results: [{ title: query, snippet: `Resultados sobre ${query}.` }] };
        }
        return { results };
      } catch (err) {
        return { results: [{ title: query, snippet: `Não foi possível carregar dados da web: ${err}` }] };
      }
    },
  });

  const fetchWebpageTool = tool({
    name: "fetch_webpage",
    description: "Lê o conteúdo em texto de um link ou página da internet para usar como referência",
    inputSchema: z.object({
      url: z.string().url().describe("URL completa da página web (https://...)"),
    }),
    outputSchema: z.object({
      content: z.string(),
      success: z.boolean(),
    }),
    nextTurnParams: {
      instructions: (params, ctx) => {
        const base = ctx.instructions ?? "";
        return `${base}\n\n[FONTE EXTERNA]: Conteúdo de "${params.url}" extraído. Utilize essas informações para enriquecer os detalhes técnicos do artigo.`;
      },
      temperature: () => 0.35,
    },
    execute: async ({ url }) => {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(5000),
        });
        const html = await res.text();
        const cleanText = html.replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 3000);
        return { content: cleanText, success: true };
      } catch (err) {
        return { content: `Falha ao ler URL: ${err}`, success: false };
      }
    },
  });

  const blogHistoryTool = tool({
    name: "get_blog_history",
    description: "Consulta os títulos e temas dos últimos artigos publicados no blog para evitar temas repetidos e encontrar tópicos complementares",
    inputSchema: z.object({
      limit: z.number().default(5).describe("Quantidade de posts para consultar"),
    }),
    outputSchema: z.object({
      posts: z.array(z.object({ id: z.number(), title: z.string(), slug: z.string() })),
    }),
    nextTurnParams: {
      instructions: (_params, ctx) => {
        const base = ctx.instructions ?? "";
        return `${base}\n\n[HISTÓRICO BLOG]: O histórico de artigos foi consultado. Crie um artigo com ângulo inédito e complementar aos existentes.`;
      },
      temperature: () => 0.4,
    },
    execute: async ({ limit }) => {
      if (!blog) return { posts: [] };
      try {
        const res = await blog.listPosts({ limit: Math.min(15, limit || 5) });
        return {
          posts: res.posts.map((p) => ({ id: p.id, title: p.title, slug: p.slug })),
        };
      } catch {
        return { posts: [] };
      }
    },
  });

  const pexelsStockTool = tool({
    name: "search_stock_photos",
    description: "Pesquisa por fotos reais de alta qualidade no banco Pexels pelo assunto do post",
    inputSchema: z.object({
      query: z.string().describe("Palavra-chave ou tema da foto"),
      orientation: z.enum(["landscape", "portrait", "square"]).optional().describe("Orientação da foto"),
    }),
    outputSchema: z.object({
      photos: z.array(z.object({
        id: z.number(),
        alt: z.string(),
        photographer: z.string(),
        previewUrl: z.string(),
      })),
    }),
    nextTurnParams: {
      instructions: (params, ctx) => {
        const base = ctx.instructions ?? "";
        return `${base}\n\n[FOTOS PEXELS]: Fotos reais sobre "${params.query}" foram localizadas no Pexels.`;
      },
      temperature: () => 0.35,
    },
    execute: async ({ query, orientation }) => {
      if (!pexels || !pexels.isConfigured()) return { photos: [] };
      try {
        const photos = await pexels.searchPhotos(query, orientation, 5);
        return {
          photos: photos.map((p) => ({
            id: p.id,
            alt: p.alt,
            photographer: p.photographer,
            previewUrl: p.src.medium,
          })),
        };
      } catch {
        return { photos: [] };
      }
    },
  });

  return [searchWebTool, fetchWebpageTool, blogHistoryTool, pexelsStockTool];
}

const SYSTEM_PROMPT =
  `Você é um redator sênior de SEO e especialista em marketing de conteúdo para blogs.
Escreva artigos completos, envolventes, originais e práticos, sempre em português do Brasil e 100% alinhados com o foco editorial do agente.
Regras obrigatórias:
- Mínimo de 800 palavras, com introdução atraente, subtítulos semânticos (h2, h3) e conclusão prática.
- Mantenha-se 100% fiel e estrito ao tema solicitado. NÃO misture assuntos de outros nichos (como moda, fitness ou outros artigos antigos do blog), a menos que explicitamente pedido no foco editorial.
- Conteúdo em HTML semântico: h2, h3, p, ul, li, strong, a.
- Responda APENAS com um objeto JSON válido, sem markdown:
{"title":"Título do artigo","excerpt":"Resumo de até 160 caracteres","content_html":"<p>HTML do artigo completo</p>","slug":"slug-otimizado-para-url","tags":"tag1, tag2"}`;

export function buildUserPrompt(agent: Agent, topPosts: PostItem[] = [], task?: string): string {
  const date = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const focus = agent.description.trim() || "assuntos atuais e relevantes do nicho";
  const customInstructions = agent.prompt.trim();
  const explicitTask = task?.trim();

  let themeSection = `FOCO EDITORIAL PRINCIPAL (OBRIGATÓRIO SEGUIR RIGOROSAMENTE):\n${focus}`;
  if (explicitTask) {
    themeSection += `\n\nPAUTA ESPECÍFICA DESTA PUBLICAÇÃO:\n${explicitTask}`;
  }
  if (customInstructions) {
    themeSection += `\n\nINSTRUÇÕES EXTRAS E DIRETRIZES ESPECÍFICAS:\n${customInstructions}`;
  }

  const pinterestNote = agent.pinterestEnabled
    ? "- Crie também 1 frase de chamada curta e impactante (até 120 caracteres) para ser usada em pin do Pinterest."
    : "";

  let topPerformanceContext = "";
  if (topPosts.length > 0) {
    const list = topPosts
      .slice(0, 3)
      .map((p, i) => {
        const v = typeof p.views_7d === "number" ? p.views_7d : (typeof p.view_count === "number" ? p.view_count : 0);
        const viewsStr = v > 0 ? ` (${v.toLocaleString("pt-BR")} visualizações)` : "";
        return `${i + 1}. "${p.title}"${viewsStr}`;
      })
      .join("\n");
    topPerformanceContext = `\nDESEMPENHO RECENTE DE AUDIÊNCIA (Posts de maior engajamento):\n${list}\n\nDIRETRIZ EDITORIAL DE ALTA PERFORMANCE: Analise o apelo, dinamismo e estrutura que geraram o alto interesse nos artigos acima. Aplique técnicas de retenção semelhantes no seu novo artigo, mantendo 100% de originalidade e fidelidade estrita ao foco editorial do agente.\n`;
  }

  return `Data de hoje: ${date}.
Publicação para a categoria "${categoryName(agent.categoryId)}".

${themeSection}
${topPerformanceContext}
${pinterestNote}

Gere o artigo completo seguindo rigorosamente o FOCO EDITORIAL e INSTRUÇÕES acima, conforme o formato JSON solicitado no system prompt.`;
}

function cleanJsonText(raw: string): string {
  let text = String(raw ?? "").trim();
  if (!text) return "";
  // Remove reasoning <think>...</think>
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Strip markdown code fences
  text = text.replace(/```(?:json)?([\s\S]*?)```/gi, "$1").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1).trim();
  }
  return text;
}

export function safeParseJson(raw: string): Record<string, unknown> {
  const text = cleanJsonText(raw);
  if (!text || !text.startsWith("{")) {
    throw new Error("Modelo não retornou JSON válido");
  }
  try {
    return JSON.parse(text);
  } catch {
    try {
      const sanitized = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
        if (c === "\n") return "\\n";
        if (c === "\r") return "\\r";
        if (c === "\t") return "\\t";
        return "";
      });
      return JSON.parse(sanitized);
    } catch (err) {
      throw new Error(`Falha ao interpretar JSON: ${err instanceof Error ? err.message : err}`);
    }
  }
}

export function parseArticleJson(raw: string): Article {
  const data = safeParseJson(raw);
  const title = String(data.title ?? "").trim();
  const contentHtml = String(data.content_html ?? "").trim();
  if (!title || title.length < 3) throw new Error("Artigo sem título válido");
  if (contentHtml.length < 200) {
    throw new Error("Artigo muito curto (conteúdo HTML com menos de 200 caracteres)");
  }
  return {
    title,
    excerpt: String(data.excerpt ?? "").trim(),
    contentHtml,
    slug: data.slug ? String(data.slug).trim() : undefined,
    tags: data.tags ? String(data.tags).trim() : undefined,
  };
}

export function categoryName(id: number): string {
  const names: Record<number, string> = {
    1: "Inteligência Artificial",
    2: "Economia",
    3: "Ganhar Dinheiro",
    4: "Home Office",
  };
  return names[id] ?? `Categoria ${id}`;
}

const REVIEWER_SYSTEM_PROMPT =
  `Você é um Editor-Chefe e Revisor Sênior de Conteúdo e SEO.
Sua missão é ler o artigo rascunho em JSON e entregar a versão final aprimorada, corrigida e pronta para publicação.

Diretrizes de Edição:
1. Título: Melhore o título para maximizar o CTR e o interesse do leitor, mantendo autoridade e clareza.
2. Resumo (excerpt): Deve ser conciso, persuasivo e ter no máximo 160 caracteres.
3. Conteúdo (content_html):
   - Elimine clichês comuns de IA ("No mundo de hoje...", "Em suma...", "É fundamental ressaltar...", etc.).
   - Garanta excelente fluência em português do Brasil natural e cativante.
   - Preserve e aprimore a formatação HTML semântica (h2, p, ul, li, strong, a).
   - Mantenha a profundidade completa do artigo (não resuma nem corte seções).
4. Slug e Tags: Deixe o slug limpo e direto, e tags relevantes.

Responda APENAS com um objeto JSON válido, sem markdown:
{"title":"Título polido","excerpt":"Resumo até 160 chars","content_html":"<p>HTML revisado completo</p>","slug":"slug-otimizado","tags":"tag1, tag2"}`;

export async function reviewAndPolishArticle(
  draft: Article,
  reviewer: Agent,
  or: OpenRouterClient,
): Promise<{ article: Article; tokensIn: number; tokensOut: number; cost: number; model: string }> {
  const userPrompt = `Aqui está o artigo rascunho para revisão e aprimoramento editorial:
Instruções editoriais específicas do revisor: ${reviewer.prompt || reviewer.description || "Otimize para clareza, SEO e retenção de leitura."}

RASCUNHO ATUAL:
${JSON.stringify(draft, null, 2)}

Por favor, faça a revisão completa e retorne o JSON final aprimorado.`;

  const completion = await or.chat({
    model: reviewer.model,
    system: REVIEWER_SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: reviewer.maxTokens || 8192,
    temperature: 0.7,
  }, "article_review");

  const polished = parseArticleJson(completion.content);
  return {
    article: polished,
    tokensIn: completion.promptTokens,
    tokensOut: completion.completionTokens,
    cost: completion.cost,
    model: completion.model,
  };
}

const IMAGE_CREATOR_SYSTEM_PROMPT =
  `Você é um Especialista em Copywriting e Conteúdo Visual para Pinterest e Redes Sociais.
Sua missão é conceber um post visual de altíssimo engajamento: com título próprio para Pinterest, descrição curta com hashtags (#), texto curto de apoio e prompt visual em inglês para geração de imagem.

Regras obrigatórias:
1. "title": Título curto, chamativo e magnético próprio para o Pinterest (até 70 caracteres, em português).
2. "excerpt": Descrição concisa e persuasiva acompanhada de hashtags relevantes (ex.: "Descubra como dominar... #dicas #tecnologia #ia").
3. "tags": Hashtags e termos de busca separados por vírgula.
4. "content_html": Texto curto e objetivo de apoio (1 a 2 parágrafos <p> ou lista <ul>) contextualizando o tema visual sem enrolação.
5. "image_prompt": Prompt descritivo em INGLÊS detalhando sujeito, iluminação, atmosfera e estética para a IA de imagem.
6. Responda APENAS com um objeto JSON válido, sem markdown:
{"title":"Título próprio do Pin","excerpt":"Descrição curta com hashtags #tag1 #tag2","image_prompt":"Detailed English prompt for image generation...","content_html":"<p>Texto curto de apoio...</p>","tags":"tag1, tag2","slug":"slug-do-pin"}`;

export interface ImagePostData {
  title: string;
  excerpt: string;
  image_prompt: string;
  content_html?: string;
  tags?: string;
  slug?: string;
}

export function parseImagePostJson(raw: string): ImagePostData {
  const data = safeParseJson(raw);
  const title = String(data.title ?? "").trim();
  const imagePrompt = String(data.image_prompt ?? "").trim();
  if (!title) throw new Error("Post sem título");
  if (!imagePrompt) throw new Error("Prompt de imagem ausente");
  return {
    title,
    excerpt: String(data.excerpt ?? "").trim(),
    image_prompt: imagePrompt,
    content_html: data.content_html ? String(data.content_html).trim() : `<p>${String(data.excerpt ?? title)}</p>`,
    tags: data.tags ? String(data.tags).trim() : undefined,
    slug: data.slug ? String(data.slug).trim() : undefined,
  };
}

export async function resolveImageForAgent(
  agent: Agent,
  promptText: string,
  or: OpenRouterClient,
  pexels?: PexelsClient,
  activeImageModel?: string,
  settings?: SettingsService,
): Promise<{
  bytes: Uint8Array;
  type: string;
  filename: string;
  source: "ai" | "pexels";
  attributionHtml?: string;
  photographer?: string;
  photographerUrl?: string;
  photoUrl?: string;
  cost?: number;
} | null> {
  const mode = agent.imageSourceMode || "ai_only";
  const orientation: PexelsOrientation =
    agent.imageAspectRatio === "16:9"
      ? "landscape"
      : agent.imageAspectRatio === "1:1"
      ? "square"
      : "portrait";

  const pexelsAvailable = Boolean(pexels && pexels.isConfigured());

  // Decision logic for budget and balance
  let preferPexels = false;
  if (mode === "pexels_only") {
    preferPexels = true;
  } else if (mode === "hybrid") {
    preferPexels = pexelsAvailable && agent.postCount % 2 === 0;
  } else if (mode === "auto_cost") {
    const currentSettings = settings?.get();
    const isBudgetConstrained = (currentSettings?.dailyBudgetUsd ?? 0) > 0 || (currentSettings?.minCreditBalance ?? 0) > 0;
    preferPexels = pexelsAvailable && (isBudgetConstrained || agent.postCount % 2 === 1);
  }

  // 1. Try Pexels if preferred
  if (preferPexels && pexels && pexelsAvailable) {
    try {
      const keywords = promptText
        .replace(/["'“”«»]/g, "")
        .replace(/Imagem de capa profissional[^:]*:\s*/i, "")
        .replace(/High quality[^:]*:\s*/i, "")
        .slice(0, 80)
        .trim();
      console.log(`[${agent.name}] Buscando foto real no Pexels (${orientation}) para: "${keywords}"...`);
      const photos = await pexels.searchPhotos(keywords, orientation, 3);
      if (photos.length > 0) {
        const photo = photos[0];
        const imgUrl = orientation === "landscape"
          ? (photo.src.landscape || photo.src.large2x || photo.src.large)
          : orientation === "portrait"
          ? (photo.src.portrait || photo.src.large2x || photo.src.large)
          : (photo.src.large || photo.src.medium);
        const downloaded = await pexels.downloadImage(imgUrl, {
          photographer: photo.photographer,
          photographerUrl: photo.photographerUrl,
          photoUrl: photo.url,
        });
        if (downloaded) {
          console.log(`[${agent.name}] Foto Pexels obtida: "${photo.alt || photo.id}" por ${photo.photographer}`);
          return { ...downloaded, source: "pexels" };
        }
      }
    } catch (err) {
      console.warn(`[${agent.name}] Falha na busca Pexels: ${err instanceof Error ? err.message : err}`);
    }
  }

  // 2. Try OpenRouter AI Generation
  const modelToUse = activeImageModel || agent.imageModel || "black-forest-labs/flux-1-schnell";
  if (modelToUse && mode !== "pexels_only") {
    try {
      console.log(`[${agent.name}] Gerando imagem ${agent.imageAspectRatio || "9:16"} com modelo IA ${modelToUse}...`);
      const generated = await or.generateImage(
        promptText,
        modelToUse,
        agent.imageAspectRatio || "9:16",
      );
      if (generated) {
        return {
          bytes: generated.bytes,
          type: generated.type,
          filename: `ai-${Date.now()}.png`,
          source: "ai",
          cost: generated.cost ?? 0.03,
        };
      }
    } catch (err) {
      console.warn(`[${agent.name}] Falha na geração IA: ${err instanceof Error ? err.message : err}`);
    }
  }

  // 3. Fallback to Pexels if AI failed or mode is pexels_only
  if (pexels && pexelsAvailable) {
    try {
      const keywords = promptText
        .replace(/["'“”«»]/g, "")
        .replace(/Imagem de capa profissional[^:]*:\s*/i, "")
        .replace(/High quality[^:]*:\s*/i, "")
        .slice(0, 80)
        .trim();
      console.log(`[${agent.name}] Fallback para Pexels com termo: "${keywords}"...`);
      const photos = await pexels.searchPhotos(keywords, orientation, 3);
      if (photos.length > 0) {
        const photo = photos[0];
        const imgUrl = orientation === "landscape"
          ? (photo.src.landscape || photo.src.large2x || photo.src.large)
          : orientation === "portrait"
          ? (photo.src.portrait || photo.src.large2x || photo.src.large)
          : (photo.src.large || photo.src.medium);
        const downloaded = await pexels.downloadImage(imgUrl, {
          photographer: photo.photographer,
          photographerUrl: photo.photographerUrl,
          photoUrl: photo.url,
        });
        if (downloaded) {
          return { ...downloaded, source: "pexels" };
        }
      }
    } catch {
      // fallback falhou
    }
  }

  return null;
}

export async function runImageAgentOnce(
  agent: Agent,
  or: OpenRouterClient,
  pexels: PexelsClient | undefined,
  blog: BlogApiClient,
  store: SqlStore,
  imageModel: string,
  settings?: SettingsService,
  task?: string,
): Promise<void> {
  const now = new Date().toISOString();
  const runId = await store.addRun(agent.id, now);
  await store.touchLastRun(agent.id, now);
  try {
    let topPosts: PostItem[] = [];
    try {
      topPosts = await blog.getTopPosts("views_7d", 3);
    } catch {
      // continua sem historico
    }

    let topContext = "";
    if (topPosts.length > 0) {
      topContext = `\nPins/Posts de maior audiência recente no blog:\n` +
        topPosts.map((p, i) => `${i + 1}. "${p.title}"`).join("\n") +
        `\nInspire-se no estilo de interesse do público acima para criar uma imagem e título ainda mais magnéticos.\n`;
    }

    const visualDirectives = (task?.trim() || agent.prompt.trim())
      ? `DIRETRIZES VISUAIS E ESTILO DE IMAGEM OBRIGATÓRIOS (Siga rigorosamente estas instruções para compor o "image_prompt"):\n${task?.trim() || agent.prompt}\n`
      : "";

    const userPrompt = `Formato de imagem desejado: ${agent.imageAspectRatio || "9:16"} (Vertical/Pinterest).
Categoria: "${categoryName(agent.categoryId)}".
Foco / Descrição: ${task?.trim() || agent.description || "Criação visual de alto engajamento"}.
${visualDirectives}${topContext}
Gere o JSON com o "image_prompt" rico e detalhado em inglês (incorporando as diretrizes de estilo acima), título magnético e texto do Pin.`;

    let parsed: ImagePostData;
    let completionTokensIn = 0;
    let completionTokensOut = 0;
    let completionCost = 0;
    let usedModel = agent.model;

    if (agent.toolsEnabled && or.getApiKey()) {
      try {
        console.log(`[${agent.name}] Executando Criador Visual com Agent SDK (Tools & Web)...`);
        const agentSdk = new AgentSdkOpenRouter({ apiKey: or.getApiKey() });
        const tools = createAgentTools(blog, pexels);
        const result = agentSdk.callModel({
          model: agent.model,
          instructions: (ctx) =>
            ctx.numberOfTurns > 1
              ? `${IMAGE_CREATOR_SYSTEM_PROMPT}\n\nIMPORTANTE: Agora sintetize as referências e responda APENAS com o JSON final com image_prompt rico em inglês.`
              : IMAGE_CREATOR_SYSTEM_PROMPT,
          input: userPrompt,
          tools,
          temperature: (ctx) => (ctx.numberOfTurns > 1 ? 0.35 : 0.85),
          maxOutputTokens: 2048,
          stopWhen: [stepCountIs(3), maxCost(0.05)],
        });
        const text = await result.getText();
        parsed = parseImagePostJson(text);
        const resp = await result.getResponse().catch(() => null);
        completionTokensIn = (resp?.usage as any)?.promptTokens || 0;
        completionTokensOut = (resp?.usage as any)?.completionTokens || 0;
        completionCost = (resp?.usage as any)?.cost || 0;
      } catch (err) {
        console.warn(`[${agent.name}] Agent SDK fallback: ${err}`);
        const completion = await or.chat({
          model: agent.model,
          system: IMAGE_CREATOR_SYSTEM_PROMPT,
          user: userPrompt,
          maxTokens: 2048,
          temperature: 0.85,
        }, "image_prompt");
        parsed = parseImagePostJson(completion.content);
        completionTokensIn = completion.promptTokens;
        completionTokensOut = completion.completionTokens;
        completionCost = completion.cost;
        usedModel = completion.model;
      }
    } else {
      const completion = await or.chat({
        model: agent.model,
        system: IMAGE_CREATOR_SYSTEM_PROMPT,
        user: userPrompt,
        maxTokens: 2048,
        temperature: 0.85,
      }, "image_prompt");
      parsed = parseImagePostJson(completion.content);
      completionTokensIn = completion.promptTokens;
      completionTokensOut = completion.completionTokens;
      completionCost = completion.cost;
      usedModel = completion.model;
    }

    const activeImageModel = agent.imageModel || imageModel || "google/gemini-2.5-flash-image";
    const imageResult = await resolveImageForAgent(
      agent,
      parsed.image_prompt || parsed.title,
      or,
      pexels,
      activeImageModel,
      settings,
    );

    if (!imageResult) {
      throw new Error("Falha ao obter imagem (OpenRouter IA e Pexels indisponíveis).");
    }

    const uploadedUrl = await blog.uploadImage(
      imageResult.bytes,
      imageResult.filename,
      imageResult.type,
    );

    const imagePostContent = (() => {
      let html = parsed.content_html || `<p>${parsed.excerpt}</p>`;
      if (imageResult.source === "pexels" && imageResult.attributionHtml) {
        html += "\n" + imageResult.attributionHtml;
      }
      return html;
    })();

    const result = await blog.createPost({
      title: parsed.title,
      content: imagePostContent,
      excerpt: parsed.excerpt || undefined,
      cover_image: uploadedUrl,
      published: Boolean(agent.publishToBlog ?? true),
      pinterest_enabled: true,
      pinterest_image: uploadedUrl,
      category_ids: [agent.categoryId],
      tags: parsed.tags,
      slug: parsed.slug,
    });

    const imageCost = imageResult.source === "ai" ? (imageResult.cost ?? 0.03) : 0;
    const finalTotalCost = completionCost + imageCost;

    await store.finishRun(runId, {
      status: "success",
      model: `${usedModel} + ${imageResult.source === "pexels" ? "Pexels Stock" : activeImageModel}`,
      postId: result.id || null,
      postSlug: result.slug || null,
      title: `[Visual ${agent.imageAspectRatio || "9:16"}] ${parsed.title}`,
      tokensIn: completionTokensIn,
      tokensOut: completionTokensOut,
      cost: finalTotalCost,
      finishedAt: new Date().toISOString(),
    });
    await store.bumpPostCount(agent.id);
    await store.setLastError(agent.id, null);
    console.log(`[${agent.name}] Post Visual #${result.id || "?"} publicado: ${parsed.title}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await store.finishRun(runId, {
      status: "error",
      model: agent.model,
      error: message,
      finishedAt: new Date().toISOString(),
    });
    await store.setLastError(agent.id, message);
    console.error(`[${agent.name}] Falha na geração visual: ${message}`);
  }
}

export async function runAgentOnce(
  agent: Agent,
  or: OpenRouterClient,
  pexels: PexelsClient | undefined,
  blog: BlogApiClient,
  store: SqlStore,
  imageModel: string,
  settings?: SettingsService,
  task?: string,
): Promise<void> {
  if (agent.role === "image_creator") {
    return runImageAgentOnce(agent, or, pexels, blog, store, imageModel, settings, task);
  }

  const now = new Date().toISOString();
  const runId = await store.addRun(agent.id, now);
  await store.touchLastRun(agent.id, now);
  try {
    let topPosts: PostItem[] = [];
    try {
      topPosts = await blog.getTopPosts("views_7d", 3);
    } catch {
      // continua sem histórico
    }

    let article: Article;
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let totalCost = 0;
    let usedModel = agent.model;

    if (agent.toolsEnabled && or.getApiKey()) {
      try {
        console.log(`[${agent.name}] Executando Redator com Agent SDK (Tools & Web Search)...`);
        const agentSdk = new AgentSdkOpenRouter({ apiKey: or.getApiKey() });
        const tools = createAgentTools(blog, pexels);
        const userPrompt = buildUserPrompt(agent, topPosts, task);
        const result = agentSdk.callModel({
          model: agent.model,
          instructions: (ctx) =>
            ctx.numberOfTurns > 1
              ? `${SYSTEM_PROMPT}\n\nIMPORTANTE: Agora que você já consultou as ferramentas, sintetize as informações coletadas e responda EXCLUSIVAMENTE com o objeto JSON final do artigo, sem qualquer texto ou markdown externo.`
              : SYSTEM_PROMPT,
          input: userPrompt,
          tools,
          temperature: (ctx) => (ctx.numberOfTurns > 1 ? 0.35 : 0.85),
          maxOutputTokens: agent.maxTokens,
          stopWhen: [stepCountIs(3), maxCost(0.05)],
        });
        const text = await result.getText();
        article = parseArticleJson(text);
        const resp = await result.getResponse().catch(() => null);
        totalTokensIn = (resp?.usage as any)?.promptTokens || 0;
        totalTokensOut = (resp?.usage as any)?.completionTokens || 0;
        totalCost = (resp?.usage as any)?.cost || 0;
      } catch (agentSdkErr) {
        console.warn(`[${agent.name}] Agent SDK fallback: ${agentSdkErr}`);
        const completion = await or.chat({
          model: agent.model,
          system: SYSTEM_PROMPT,
          user: buildUserPrompt(agent, topPosts, task),
          maxTokens: agent.maxTokens,
          temperature: 0.85,
        }, "article_generation");
        article = parseArticleJson(completion.content);
        totalTokensIn = completion.promptTokens;
        totalTokensOut = completion.completionTokens;
        totalCost = completion.cost;
        usedModel = completion.model;
      }
    } else {
      const completion = await or.chat({
        model: agent.model,
        system: SYSTEM_PROMPT,
        user: buildUserPrompt(agent, topPosts, task),
        maxTokens: agent.maxTokens,
        temperature: 0.85,
      }, "article_generation");
      article = parseArticleJson(completion.content);
      totalTokensIn = completion.promptTokens;
      totalTokensOut = completion.completionTokens;
      totalCost = completion.cost;
      usedModel = completion.model;
    }

    if (agent.reviewerId) {
      const reviewer = await store.getAgent(agent.reviewerId);
      if (reviewer && reviewer.status === "active") {
        try {
          const revResult = await reviewAndPolishArticle(article, reviewer, or);
          article = revResult.article;
          totalTokensIn += revResult.tokensIn;
          totalTokensOut += revResult.tokensOut;
          totalCost += revResult.cost;
          usedModel = `${usedModel} → ${reviewer.name}`;
          console.log(
            `[${agent.name}] Artigo revisado pelo agente "${reviewer.name}" (${reviewer.model})`,
          );
        } catch (revErr) {
          console.warn(
            `[${agent.name}] Revisão ignorada por erro: ${revErr instanceof Error ? revErr.message : revErr}`,
          );
        }
      }
    }

    let coverImage: string | undefined;
    const activeImageModel = agent.imageModel || imageModel;
    if (agent.imageGen) {
      try {
        const visualDirectives = agent.prompt.trim() ? ` Diretrizes visuais: ${agent.prompt.trim()}.` : "";
        const imagePrompt = `Imagem de capa profissional de alta qualidade para artigo de blog: "${article.title}". ${agent.description.slice(0, 150)}.${visualDirectives} Iluminação cinematográfica, alta resolução 8k, composição limpa, sem textos sobrepostos.`;
        const imageResult = await resolveImageForAgent(
          agent,
          imagePrompt,
          or,
          pexels,
          activeImageModel,
          settings,
        );
        if (imageResult) {
          coverImage = await blog.uploadImage(
            imageResult.bytes,
            imageResult.filename,
            imageResult.type,
          );
          if (imageResult.source === "ai") {
            totalCost += (imageResult.cost ?? 0.03);
          }
          // Inject photographer credit per Pexels API guidelines
          if (imageResult.source === "pexels" && imageResult.attributionHtml) {
            article = { ...article, contentHtml: article.contentHtml + "\n" + imageResult.attributionHtml };
          }
        }
      } catch (err) {
        console.warn(
          `[${agent.name}] Obtenção de imagem ignorada: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    const result = await blog.createPost({
      title: article.title,
      content: article.contentHtml,
      excerpt: article.excerpt || undefined,
      cover_image: coverImage,
      published: Boolean(agent.publishToBlog ?? true),
      pinterest_enabled: Boolean(agent.pinterestEnabled),
      pinterest_image: agent.pinterestEnabled ? coverImage : undefined,
      category_ids: [agent.categoryId],
      tags: article.tags,
      slug: article.slug,
    });

    const finalModelInfo = (() => {
      let m = usedModel || agent.model;
      if (agent.imageGen && coverImage) {
        m += ` + ${agent.imageSourceMode === "pexels_only" ? "Pexels Stock" : (activeImageModel || "google/gemini-2.5-flash-image")}`;
      }
      return m;
    })();

    await store.finishRun(runId, {
      status: "success",
      model: finalModelInfo,
      postId: result.id || null,
      postSlug: result.slug || null,
      title: article.title,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      cost: totalCost,
      finishedAt: new Date().toISOString(),
    });
    await store.bumpPostCount(agent.id);
    await store.setLastError(agent.id, null);
    console.log(
      `[${agent.name}] Post #${result.id || "?"} publicado: ${article.title}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await store.finishRun(runId, {
      status: "error",
      model: agent.model,
      error: message,
      finishedAt: new Date().toISOString(),
    });
    await store.setLastError(agent.id, message);
    console.error(`[${agent.name}] Falha na execução: ${message}`);
  }
}
