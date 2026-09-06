import type { Agent, SqlStore } from "./turso_store.ts";
import type { OpenRouterClient } from "./openrouter.ts";
import { type PexelsClient, type PexelsOrientation } from "./pexels.ts";
import type { BlogApiClient, PostItem } from "./blog_api.ts";
import type { SettingsService } from "./settings.ts";
import { systemLogger } from "./logger.ts";
import { OpenRouter as AgentSdkOpenRouter, tool, stepCountIs, maxCost } from "@openrouter/agent";
import { z } from "zod";
import { fetchMultiFeedRadar } from "./rss.ts";

export interface Article {
  title: string;
  excerpt: string;
  contentHtml: string;
  slug?: string;
  tags?: string;
}

export interface NewsItem {
  title: string;
  source: string;
  pubDate: string;
  link?: string;
}

export type RunLogCallback = {
  info: (msg: string, details?: string) => void;
  warn: (msg: string, details?: string) => void;
  step: (msg: string) => void;
};

export async function fetchRecentNews(query: string, maxItems = 5): Promise<NewsItem[]> {
  try {
    const cleanQuery = query
      .replace(/[\n\r]+/g, " ")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 6)
      .join(" ");

    const encoded = encodeURIComponent(cleanQuery || query.trim());
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: NewsItem[] = [];
    const regex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = regex.exec(xml)) !== null && items.length < maxItems) {
      const block = match[1];
      const rawTitle = block.match(/<title>(.*?)<\/title>/)?.[1] || "";
      const title = rawTitle
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      const rawSource = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || "";
      const source = rawSource
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim() || "Imprensa";
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
      const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "";
      if (title) {
        items.push({ title, source, pubDate, link });
      }
    }
    return items;
  } catch {
    return [];
  }
}

export function createAgentTools(
  blog?: BlogApiClient,
  pexels?: PexelsClient,
  runLog?: RunLogCallback,
) {
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
      runLog?.info(`Pesquisando na web para: "${query}"...`);
      try {
        const news = await fetchRecentNews(query, 5);
        if (news.length > 0) {
          runLog?.info(
            `Busca na web retornou ${news.length} notícias recentes`,
            news.map((n) => `• [${n.source}] ${n.title} (${n.pubDate})`).join("\n"),
          );
          return {
            results: news.map((n) => ({
              title: `[${n.source}] ${n.title}`,
              snippet: `${n.title}. Publicado em: ${n.pubDate} por ${n.source}. Link: ${n.link || ""}`,
            })),
          };
        }

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
          runLog?.info(`Nenhum resultado web específico encontrado para: "${query}".`);
          return { results: [{ title: query, snippet: `Resultados sobre ${query}.` }] };
        }
        runLog?.info(`Busca retornou ${results.length} referências web.`);
        return { results };
      } catch (err) {
        runLog?.warn(`Falha na busca web: ${err}`);
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
      runLog?.info(`Lendo conteúdo da página web: ${url}`);
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
        runLog?.info(`Conteúdo da página lido com sucesso (${cleanText.length} caracteres extraídos).`);
        return { content: cleanText, success: true };
      } catch (err) {
        runLog?.warn(`Falha ao ler página web: ${err}`);
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
      runLog?.info(`Consultando histórico de artigos anteriores do blog (${limit || 5} posts)...`);
      if (!blog) return { posts: [] };
      try {
        const res = await blog.listPosts({ limit: Math.min(15, limit || 5) });
        runLog?.info(`Histórico consultado com sucesso (${res.posts.length} posts recentes retornados).`);
        return {
          posts: res.posts.map((p) => ({ id: p.id, title: p.title, slug: p.slug })),
        };
      } catch (err) {
        runLog?.warn(`Erro ao consultar histórico do blog: ${err}`);
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
      runLog?.info(`Buscando fotos no Pexels para: "${query}"...`);
      if (!pexels || !pexels.isConfigured()) return { photos: [] };
      try {
        const photos = await pexels.searchPhotos(query, orientation, 5);
        runLog?.info(`Pexels retornou ${photos.length} fotos correspondentes.`);
        return {
          photos: photos.map((p) => ({
            id: p.id,
            alt: p.alt,
            photographer: p.photographer,
            previewUrl: p.src.medium,
          })),
        };
      } catch (err) {
        runLog?.warn(`Erro na busca Pexels: ${err}`);
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
- Veracidade e atualidade: Baseie-se rigorosamente em acontecimentos e notícias reais do período atual. É expressamente proibido inventar nomes fictícios de lançamentos, produtos ou acontecimentos.
- Ineditismo e não-repetição: O blog não pode repetir a mesma notícia ou pauta mais de 2 vezes. Se uma notícia já foi abordada anteriormente, escolha outra notícia ou um ângulo inédito.
- Responda APENAS com um objeto JSON válido, sem markdown:
{"title":"Título do artigo","excerpt":"Resumo de até 160 caracteres","content_html":"<p>HTML do artigo completo</p>","slug":"slug-otimizado-para-url","tags":"tag1, tag2"}`;

export function extractCleanKeywords(text: string): string[] {
  const stopwords = new Set([
    "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
    "um", "uma", "uns", "umas", "para", "por", "com", "sem", "sob",
    "que", "como", "mais", "menos", "mas", "bem", "nao",
    "seus", "suas", "seu", "sua", "meu", "minha", "nosso", "nossa",
    "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas",
    "isso", "isto", "aquele", "aquela", "aqueles", "aquelas", "aquilo",
    "pelo", "pela", "pelos", "pelas", "num", "numa", "nuns", "numas",
    "aos", "as", "ao", "a", "o", "os", "e", "ou",
    "qual", "quais", "quando", "quem", "onde", "porque", "por que",
    "muito", "muitos", "muita", "muitas", "pouco", "poucos", "pouca", "poucas",
    "cada", "tudo", "nada", "todo", "toda", "todos", "todas", "outro", "outra", "outros", "outras",
    "sobre", "entre", "ate", "desde", "apos", "durante",
    "artigo", "noticia", "guia", "post", "blog", "dicas", "melhor", "melhores"
  ]);

  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopwords.has(w));
}

export function isSameNewsTopic(newsTitle: string, articleTitle: string): boolean {
  const newsWords = extractCleanKeywords(newsTitle);
  const articleWords = extractCleanKeywords(articleTitle);

  if (newsWords.length === 0 || articleWords.length === 0) return false;

  // 1. Termos compostos ou altamente específicos com hífen, dígitos ou nomes longos (ex: "romi-isetta", "gpt-4", "iphone-16")
  const articleSet = new Set(articleWords);
  const common = newsWords.filter((w) => articleSet.has(w));
  const hasDistinctEntity = common.some((w) => (w.includes("-") && w.length >= 5) || (/\d/.test(w) && w.length >= 4) || w.length >= 10);
  if (hasDistinctEntity) return true;

  // 2. Coincidência por raiz de palavra (stemming leve para português)
  const stem = (w: string) => (w.length >= 6 ? w.slice(0, 5) : w);
  const articleStems = new Set(articleWords.map(stem));
  const stemMatches = new Set(newsWords.map(stem).filter((s) => articleStems.has(s)));

  const minLen = Math.min(newsWords.length, articleWords.length);
  const stemRatio = stemMatches.size / minLen;

  if (common.length >= 4 || stemMatches.size >= 4) return true;
  if (common.length >= 3 && common.length / minLen >= 0.35) return true;
  if (stemMatches.size >= 3 && stemRatio >= 0.35) return true;
  if (stemMatches.size >= 2 && (common.some((w) => w.length >= 7) || stemRatio >= 0.45)) {
    return true;
  }

  return false;
}

export function countNewsOccurrencesInArticles(
  newsTitle: string,
  articleTitles: string[],
): number {
  let count = 0;
  for (const artTitle of articleTitles) {
    if (isSameNewsTopic(newsTitle, artTitle)) {
      count++;
    }
  }
  return count;
}

export function buildUserPrompt(
  agent: Agent,
  topPosts: PostItem[] = [],
  task?: string,
  recentNews: NewsItem[] = [],
  recentArticles: Array<{ title: string; slug?: string } | string> = [],
): string {
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

  let newsContext = "";
  if (recentNews.length > 0) {
    const list = recentNews
      .map((n, i) => `${i + 1}. "${n.title}" — Fonte: ${n.source} (${n.pubDate})`)
      .join("\n");
    newsContext = `\nNOTÍCIAS E ACONTECIMENTOS REAIS DE HOJE (ÚLTIMAS HORAS / DIAS - SELECIONADAS DO RADAR):\n${list}\n\nDIRETRIZ DE VERACIDADE E ATUALIDADE:\n- Baseie o artigo nos fatos, novidades e lançamentos REAIS listados acima ou utilize-os como gancho principal da publicação.\n- Se o agente usar a ferramenta "search_web", busque aprofundar os detalhes desses acontecimentos.\n- É expressamente proibido inventar nomes de produtos ou acontecimentos que não existam na realidade.\n`;
  }

  let recentArticlesContext = "";
  if (recentArticles.length > 0) {
    const list = recentArticles
      .slice(0, 10)
      .map((a, i) => {
        const t = typeof a === "string" ? a : a.title;
        return `${i + 1}. "${t}"`;
      })
      .join("\n");
    recentArticlesContext = `\nÚLTIMOS ARTIGOS JÁ PUBLICADOS RECENTEMENTE NO BLOG (HISTÓRICO RECENTE):\n${list}\n\nDIRETRIZ DE INEDITISMO E NÃO-REPETIÇÃO:\n- Os artigos listados acima foram publicados recentemente no blog.\n- É REGRA MANDATÓRIA: O agente NÃO pode repetir a mesma notícia ou pauta que já tenha sido coberta nos artigos recentes acima (limite máximo de 2 abordagens de uma mesma notícia no blog).\n- Se um tema ou notícia do radar já foi abordado anteriormente, você DEVE escolher outra pauta do radar ou desenvolver um ângulo e desdobramento completamente inédito.\n- Mantenha originalidade máxima no título e no conteúdo.\n`;
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
    topPerformanceContext = `\nDESEMPENHO RECENTE DE AUDIÊNCIA (Posts de maior engajamento deste nicho):\n${list}\n\nDIRETRIZ EDITORIAL DE ALTA PERFORMANCE: Analise o apelo, dinamismo e estrutura que geraram o alto interesse nos artigos acima neste nicho. Aplique técnicas de retenção semelhantes no seu novo artigo, mantendo 100% de originalidade e fidelidade estrita ao foco editorial do agente.\n`;
  }

  return `Data de hoje: ${date}.
Publicação para a categoria "${categoryName(agent.categoryId)}".

${themeSection}
${newsContext}
${recentArticlesContext}
${topPerformanceContext}
${pinterestNote}

Gere o artigo completo seguindo rigorosamente o FOCO EDITORIAL, a DIRETRIZ DE INEDITISMO (sem repetir pautas já cobertas nos artigos recentes) e as INSTRUÇÕES acima, conforme o formato JSON solicitado no system prompt.`;
}

export function ensureSemanticHtml(raw: string): string {
  if (!raw) return "";
  let text = String(raw).trim();

  // 1. Desescapar quebras literais de linha se existirem (\n como caracteres em string)
  if (text.includes("\\n") && !text.includes("\n")) {
    text = text.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\n");
  } else if (text.includes("\\n")) {
    text = text.replace(/\\n/g, "\n");
  }

  // 2. Normalizar quebras de linha
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 3. Converter links em Markdown [Texto](url) -> <a href="url" target="_blank" rel="noopener">Texto</a>
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, title, url) => {
    const cleanUrl = String(url).replace(/["'\\]/g, "").trim() || "#";
    return `<a href="${cleanUrl}" target="_blank" rel="noopener">${title}</a>`;
  });

  // 4. Converter negrito e itálico em Markdown (**texto** -> <strong>texto</strong>)
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^\*])\*([^*\n]+)\*([^\*]|$)/g, "$1<em>$2</em>$3");

  // 5. Converter cabeçalhos em Markdown (#, ##, ###)
  text = text.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  text = text.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  text = text.replace(/^#\s+(.+)$/gm, "<h2>$1</h2>");

  // 6. Dividir em blocos separados por 2 ou mais quebras de linha
  const rawBlocks = text.split(/\n{2,}/);
  const processedBlocks: string[] = [];

  for (let block of rawBlocks) {
    block = block.trim();
    if (!block) continue;

    // Se o bloco já é um elemento HTML estrutural completo
    if (/^<(?:h[1-6]|p|ul|ol|blockquote|pre|figure|table|div)\b/i.test(block)) {
      processedBlocks.push(block);
      continue;
    }

    const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);

    // Lista não-ordenada (- ou * ou •)
    const isBulletList = lines.length > 0 && lines.every((l) => /^[-*•]\s+/.test(l));
    if (isBulletList) {
      const items = lines.map((l) => `  <li>${l.replace(/^[-*•]\s+/, "")}</li>`).join("\n");
      processedBlocks.push(`<ul>\n${items}\n</ul>`);
      continue;
    }

    // Lista numerada (1. ou 1))
    const isNumberedList = lines.length > 0 && lines.every((l) => /^\d+[.)]\s+/.test(l));
    if (isNumberedList) {
      const items = lines.map((l) => `  <li>${l.replace(/^\d+[.)]\s+/, "")}</li>`).join("\n");
      processedBlocks.push(`<ol>\n${items}\n</ol>`);
      continue;
    }

    // Identificar subtítulos sem tags: linha única curta (<90 chars), sem ponto final (.!?;), sem tags de link/parágrafo
    const isHeading = lines.length === 1 &&
      block.length < 90 &&
      !/[.!?;]$/.test(block) &&
      !block.includes("<p>") &&
      !block.includes("<a ");

    if (isHeading) {
      processedBlocks.push(`<h2>${block}</h2>`);
      continue;
    }

    // Se o bloco tiver múltiplas linhas com listas ou tópicos misturados
    if (lines.length > 1) {
      let hasMixed = false;
      const subHtml: string[] = [];
      let inList = false;

      for (const line of lines) {
        if (/^[-*•]\s+/.test(line)) {
          if (!inList) { subHtml.push("<ul>"); inList = true; }
          subHtml.push(`  <li>${line.replace(/^[-*•]\s+/, "")}</li>`);
          hasMixed = true;
        } else {
          if (inList) { subHtml.push("</ul>"); inList = false; }
          if (/^<(?:h[1-6]|p|blockquote|pre)\b/i.test(line)) {
            subHtml.push(line);
            hasMixed = true;
          } else if (line.length < 80 && !/[.!?;]$/.test(line) && !line.includes("<a ")) {
            subHtml.push(`<h3>${line}</h3>`);
            hasMixed = true;
          } else {
            subHtml.push(`<p>${line}</p>`);
            hasMixed = true;
          }
        }
      }
      if (inList) subHtml.push("</ul>");

      if (hasMixed) {
        processedBlocks.push(subHtml.join("\n"));
        continue;
      }
    }

    // Parágrafo padrão envolvido em <p>...</p>
    const cleanBlock = block.replace(/^<p>/i, "").replace(/<\/p>$/i, "").trim();
    processedBlocks.push(`<p>${cleanBlock}</p>`);
  }

  let finalHtml = processedBlocks.join("\n\n");

  // Limpeza de tags aninhadas indevidas
  finalHtml = finalHtml.replace(/<p>\s*<(?:h[1-6]|ul|ol|blockquote|pre|figure)\b([^>]*)>/gi, "<$1>");
  finalHtml = finalHtml.replace(/<\/(?:h[1-6]|ul|ol|blockquote|pre|figure)>\s*<\/p>/gi, "</$1>");
  finalHtml = finalHtml.replace(/<p>\s*<p>/gi, "<p>");
  finalHtml = finalHtml.replace(/<\/p>\s*<\/p>/gi, "</p>");
  finalHtml = finalHtml.replace(/<p>\s*<\/p>/gi, "");

  return finalHtml.trim();
}

export function cleanJsonText(raw: string): string {
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
  const rawContent = String(data.content_html ?? data.content ?? "").trim();
  const contentHtml = ensureSemanticHtml(rawContent);
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
    webSearch: Boolean(reviewer.toolsEnabled),
    subagent: Boolean(reviewer.toolsEnabled),
    advisor: Boolean(reviewer.toolsEnabled),
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
  const runLog = systemLogger.createRunLogger(runId, agent.name, agent.id);
  runLog.info(
    `Iniciando Criador Visual para "${agent.name}"`,
    `Modelo: ${agent.model} | Proporção: ${agent.imageAspectRatio || "9:16"} | Categoria ID: ${agent.categoryId} | Blog ID: ${agent.blogId ?? "nenhum"}`,
  );

  try {
    let topPosts: PostItem[] = [];
    try {
      runLog.step("Buscando posts de maior audiência no blog para inspiração visual...");
      topPosts = await blog.getTopPosts("views_7d", 3);
      if (topPosts.length > 0) {
        runLog.info(`Histórico obtido (${topPosts.length} posts): ${topPosts.map((p) => `"${p.title}"`).join(", ")}`);
      }
    } catch (topErr) {
      runLog.warn(`Não foi possível carregar histórico do blog: ${topErr instanceof Error ? topErr.message : topErr}`);
    }

    let topContext = "";
    if (topPosts.length > 0) {
      topContext = `\nPins/Posts de maior audiência recente no blog (Inspiração de nicho):\n` +
        topPosts.map((p, i) => `${i + 1}. "${p.title}"`).join("\n") +
        `\nInspire-se no estilo de interesse do público acima para criar uma imagem e título ainda mais magnéticos.\n`;
    }

    let recentArticles: { title: string }[] = [];
    try {
      const blogPosts = await blog.listPosts({ limit: 10, category_id: agent.categoryId, sort: "created_at" }).catch(() => ({ posts: [] }));
      for (const p of blogPosts.posts) {
        if (p.title && !recentArticles.some((a) => a.title.toLowerCase() === p.title.toLowerCase())) {
          recentArticles.push({ title: p.title });
        }
      }
      const agentRuns = await store.listRuns(15, agent.id).catch(() => []);
      for (const r of agentRuns) {
        if (r.status === "success" && r.title) {
          const clean = r.title.replace(/^\[Visual[^\]]*\]\s*/i, "").trim();
          if (clean && !recentArticles.some((a) => a.title.toLowerCase() === clean.toLowerCase())) {
            recentArticles.push({ title: clean });
          }
        }
      }
    } catch {}

    let recentContext = "";
    if (recentArticles.length > 0) {
      recentContext = `\nPins/Posts já criados recentemente no blog (NÃO REPETIR ESTES TEMAS):\n` +
        recentArticles.slice(0, 8).map((p, i) => `${i + 1}. "${p.title}"`).join("\n") +
        `\nDIRETRIZ DE INEDITISMO: NÃO repita o mesmo tema ou proposta dos pins anteriores. Crie uma nova abordagem visual e de copy 100% inédita.\n`;
    }

    const visualDirectives = (task?.trim() || agent.prompt.trim())
      ? `DIRETRIZES VISUAIS E ESTILO DE IMAGEM OBRIGATÓRIOS (Siga rigorosamente estas instruções para compor o "image_prompt"):\n${task?.trim() || agent.prompt}\n`
      : "";

    const userPrompt = `Formato de imagem desejado: ${agent.imageAspectRatio || "9:16"} (Vertical/Pinterest).
Categoria: "${categoryName(agent.categoryId)}".
Foco / Descrição: ${task?.trim() || agent.description || "Criação visual de alto engajamento"}.
${visualDirectives}${recentContext}${topContext}
Gere o JSON com o "image_prompt" rico e detalhado em inglês (incorporando as diretrizes de estilo acima), título magnético e texto do Pin.`;

    let parsed: ImagePostData;
    let completionTokensIn = 0;
    let completionTokensOut = 0;
    let completionCost = 0;
    let usedModel = agent.model;

    if (agent.toolsEnabled && or.getApiKey()) {
      try {
        runLog.step(`Executando Criador Visual com Agent SDK (Tools & Web)...`);
        const agentSdk = new AgentSdkOpenRouter({ apiKey: or.getApiKey() });
        const tools = createAgentTools(blog, pexels, runLog);
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
        runLog.warn(`Agent SDK fallback acionado: ${err instanceof Error ? err.message : err}`);
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
      runLog.step(`Enviando prompt ao provedor de IA (${agent.model})...`);
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

    runLog.info(`JSON visual recebido com sucesso`, `Título: "${parsed.title}" | Tokens: ${completionTokensIn}+${completionTokensOut} | Custo IA: $${completionCost.toFixed(4)}`);

    const activeImageModel = agent.imageModel || imageModel || "google/gemini-2.5-flash-image";
    runLog.step(`Obtendo imagem (modo: ${agent.imageSourceMode}, modelo: ${activeImageModel})...`);
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
    runLog.info(`Imagem obtida com sucesso via ${imageResult.source.toUpperCase()}`, `Arquivo: ${imageResult.filename} (${imageResult.type})`);

    runLog.step(`Fazendo upload da imagem para o blog (${blog.baseUrl})...`);
    const uploadedUrl = await blog.uploadImage(
      imageResult.bytes,
      imageResult.filename,
      imageResult.type,
    );
    runLog.info(`Upload concluído`, `URL: ${uploadedUrl}`);

    const imagePostContent = (() => {
      let html = parsed.content_html || `<p>${parsed.excerpt}</p>`;
      if (imageResult.source === "pexels" && imageResult.attributionHtml) {
        html += "\n" + imageResult.attributionHtml;
      }
      return html;
    })();

    runLog.step(`Publicando post visual na API do blog...`);
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
    const fullLogText = runLog.formatFullLog();

    await store.finishRun(runId, {
      status: "success",
      model: `${usedModel} + ${imageResult.source === "pexels" ? "Pexels Stock" : activeImageModel}`,
      postId: result.id || null,
      postSlug: result.slug || null,
      title: `[Visual ${agent.imageAspectRatio || "9:16"}] ${parsed.title}`,
      tokensIn: completionTokensIn,
      tokensOut: completionTokensOut,
      cost: finalTotalCost,
      logs: fullLogText,
      finishedAt: new Date().toISOString(),
    });
    await store.bumpPostCount(agent.id);
    await store.setLastError(agent.id, null);
    runLog.success(`Post Visual #${result.id || "?"} publicado: "${parsed.title}" (Slug: ${result.slug || parsed.slug})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    runLog.error(`Falha na geração visual: ${message}`, stack);
    const fullLogText = runLog.formatFullLog();

    await store.finishRun(runId, {
      status: "error",
      model: agent.model,
      error: message,
      logs: fullLogText,
      finishedAt: new Date().toISOString(),
    });
    await store.setLastError(agent.id, message);
    throw err;
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
  const runLog = systemLogger.createRunLogger(runId, agent.name, agent.id);
  runLog.info(
    `Iniciando Redator Autônomo para "${agent.name}"`,
    `Modelo: ${agent.model} | Categoria ID: ${agent.categoryId} | Limite de Tokens: ${agent.maxTokens} | Blog ID: ${agent.blogId ?? "nenhum"} | Tools Web: ${agent.toolsEnabled ? "Sim" : "Não"}`,
  );

  try {
    let topPosts: PostItem[] = [];
    try {
      runLog.step("Consultando posts de maior audiência recente no blog...");
      topPosts = await blog.getTopPosts("views_7d", 3);
      if (topPosts.length > 0) {
        runLog.info(`Histórico recente de audiência obtido (${topPosts.length} posts): ${topPosts.map((p) => `"${p.title}"`).join(", ")}`);
      }
    } catch (topErr) {
      runLog.warn(`Não foi possível carregar histórico do blog: ${topErr instanceof Error ? topErr.message : topErr}`);
    }

    let recentArticles: { title: string; slug?: string }[] = [];
    try {
      runLog.step("Consultando últimos artigos publicados para evitar repetição...");
      // 1. Artigos recentes da categoria no blog
      const blogPosts = await blog.listPosts({ limit: 15, category_id: agent.categoryId, sort: "created_at" }).catch(() => ({ posts: [] }));
      for (const p of blogPosts.posts) {
        if (p.title && !recentArticles.some((a) => a.title.toLowerCase() === p.title.toLowerCase())) {
          recentArticles.push({ title: p.title, slug: p.slug });
        }
      }
      // 2. Execuções recentes salvas no banco local deste agente
      const agentRuns = await store.listRuns(25, agent.id).catch(() => []);
      for (const r of agentRuns) {
        if (r.status === "success" && r.title) {
          const clean = r.title.replace(/^\[Visual[^\]]*\]\s*/i, "").trim();
          if (clean && !recentArticles.some((a) => a.title.toLowerCase() === clean.toLowerCase())) {
            recentArticles.push({ title: clean, slug: r.postSlug || undefined });
          }
        }
      }
      if (recentArticles.length > 0) {
        runLog.info(`Histórico recente verificado (${recentArticles.length} artigos anteriores): ${recentArticles.slice(0, 5).map((a) => `"${a.title}"`).join(", ")}`);
      }
    } catch (recErr) {
      runLog.warn(`Não foi possível consultar artigos recentes: ${recErr instanceof Error ? recErr.message : recErr}`);
    }

    const recentArticleTitles = recentArticles.map((a) => a.title);

    let recentNews: NewsItem[] = [];
    try {
      // 1. Consultar biblioteca de fontes RSS ativas da categoria
      const rssSources = await store.listRssSources(agent.categoryId);
      const activeRss = rssSources.filter((s) => s.isActive);
      if (activeRss.length > 0) {
        runLog.step(`Consultando ${activeRss.length} fontes RSS ativas cadastradas para a categoria...`);
        const feedArticles = await fetchMultiFeedRadar(activeRss, 15);
        for (const art of feedArticles) {
          const occurrences = countNewsOccurrencesInArticles(art.title, recentArticleTitles);
          if (occurrences >= 2) {
            runLog.info(`Notícia do radar descartada (já coberta ${occurrences}x nos artigos recentes): "${art.title}"`);
            continue;
          }
          recentNews.push({
            title: art.title,
            source: art.source,
            pubDate: art.pubDate,
            link: art.link,
          });
        }
      }
    } catch (rssErr) {
      runLog.warn(`Erro ao consultar biblioteca RSS: ${rssErr instanceof Error ? rssErr.message : rssErr}`);
    }

    if (agent.toolsEnabled && recentNews.length < 4) {
      try {
        // 2. Complementar com Google News RSS em tempo real se necessário
        runLog.step("Pesquisando notícias de última hora complementares...");
        const newsQuery = task?.trim() || agent.description?.trim() || "tecnologia inovacao inteligencia artificial";
        const googleNews = await fetchRecentNews(newsQuery, 8);
        for (const item of googleNews) {
          const occurrences = countNewsOccurrencesInArticles(item.title, recentArticleTitles);
          if (occurrences >= 2) {
            runLog.info(`Notícia complementar descartada (já coberta ${occurrences}x): "${item.title}"`);
            continue;
          }
          if (!recentNews.some((rn) => rn.title.slice(0, 30).toLowerCase() === item.title.slice(0, 30).toLowerCase())) {
            recentNews.push(item);
          }
        }
      } catch (newsErr) {
        runLog.warn(`Feed de notícias complementares indisponível: ${newsErr instanceof Error ? newsErr.message : newsErr}`);
      }
    }

    if (recentNews.length > 0) {
      recentNews = recentNews.slice(0, 6);
      runLog.info(
        `Notícias inéditas em tempo real filtradas (${recentNews.length} fontes)`,
        recentNews.map((n) => `• [${n.source}] ${n.title} (${n.pubDate})`).join("\n"),
      );
    } else {
      runLog.info("Nenhuma notícia inédita nos feeds diretos (ou todas já atingiram o limite de 2 coberturas); o agente usará foco editorial autônomo.");
    }

    const userPrompt = buildUserPrompt(agent, topPosts, task, recentNews, recentArticles);

    let article: Article;
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let totalCost = 0;
    let usedModel = agent.model;

    if (agent.toolsEnabled && or.getApiKey()) {
      try {
        runLog.step(`Executando Redator com Agent SDK (Tools & Web Search ativas)...`);
        const agentSdk = new AgentSdkOpenRouter({ apiKey: or.getApiKey() });
        const tools = createAgentTools(blog, pexels, runLog);
        const result = agentSdk.callModel({
          model: agent.model,
          instructions: (ctx) =>
            ctx.numberOfTurns > 1
              ? `${SYSTEM_PROMPT}\n\nIMPORTANTE: Agora que você já consultou as ferramentas e coletou os dados da web, sintetize as informações coletadas e responda EXCLUSIVAMENTE com o objeto JSON final do artigo, sem qualquer texto ou markdown externo.`
              : `${SYSTEM_PROMPT}\n\nDIRETRIZ DE EXECUÇÃO: Você tem a ferramenta de pesquisa "search_web" disponível. Se precisar de mais detalhes ou notícias atualizadas sobre o tema, utilize obrigatoriamente a ferramenta search_web antes de escrever.`,
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
        runLog.warn(`Agent SDK fallback acionado: ${agentSdkErr instanceof Error ? agentSdkErr.message : agentSdkErr}`);
        const completion = await or.chat({
          model: agent.model,
          system: SYSTEM_PROMPT,
          user: userPrompt,
          maxTokens: agent.maxTokens,
          temperature: 0.85,
          webSearch: true,
          subagent: true,
          advisor: true,
        }, "article_generation");
        article = parseArticleJson(completion.content);
        totalTokensIn = completion.promptTokens;
        totalTokensOut = completion.completionTokens;
        totalCost = completion.cost;
        usedModel = completion.model;
      }
    } else {
      runLog.step(`Gerando artigo via IA (${agent.model})...`);
      const completion = await or.chat({
        model: agent.model,
        system: SYSTEM_PROMPT,
        user: userPrompt,
        maxTokens: agent.maxTokens,
        temperature: 0.85,
        webSearch: Boolean(agent.toolsEnabled),
        subagent: Boolean(agent.toolsEnabled),
        advisor: Boolean(agent.toolsEnabled),
      }, "article_generation");
      article = parseArticleJson(completion.content);
      totalTokensIn = completion.promptTokens;
      totalTokensOut = completion.completionTokens;
      totalCost = completion.cost;
      usedModel = completion.model;
    }

    runLog.info(`Artigo gerado com sucesso: "${article.title}"`, `Tokens: ${totalTokensIn}+${totalTokensOut} | Custo IA: $${totalCost.toFixed(4)} | Modelo: ${usedModel}`);

    if (agent.reviewerId) {
      const reviewer = await store.getAgent(agent.reviewerId);
      if (reviewer && reviewer.status === "active") {
        try {
          runLog.step(`Encaminhando artigo para revisão pelo agente "${reviewer.name}" (${reviewer.model})...`);
          const revResult = await reviewAndPolishArticle(article, reviewer, or);
          article = revResult.article;
          totalTokensIn += revResult.tokensIn;
          totalTokensOut += revResult.tokensOut;
          totalCost += revResult.cost;
          usedModel = `${usedModel} → ${reviewer.name}`;
          runLog.info(`Revisão concluída`, `Tokens adicionais: ${revResult.tokensIn}+${revResult.tokensOut} | Custo extra: $${revResult.cost.toFixed(4)}`);
        } catch (revErr) {
          runLog.warn(`Revisão editorial ignorada por falha técnica: ${revErr instanceof Error ? revErr.message : revErr}`);
        }
      }
    }

    let coverImage: string | undefined;
    const activeImageModel = agent.imageModel || imageModel;
    if (agent.imageGen) {
      try {
        runLog.step(`Gerando imagem de capa (modo: ${agent.imageSourceMode}, modelo: ${activeImageModel})...`);
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
          runLog.info(`Imagem obtida via ${imageResult.source.toUpperCase()}`, `Arquivo: ${imageResult.filename}`);
          runLog.step(`Fazendo upload da imagem de capa para o blog...`);
          coverImage = await blog.uploadImage(
            imageResult.bytes,
            imageResult.filename,
            imageResult.type,
          );
          if (imageResult.source === "ai") {
            totalCost += (imageResult.cost ?? 0.03);
          }
          if (imageResult.source === "pexels" && imageResult.attributionHtml) {
            article = { ...article, contentHtml: article.contentHtml + "\n" + imageResult.attributionHtml };
          }
          runLog.info(`Upload de capa concluído`, `URL: ${coverImage}`);
        }
      } catch (imgErr) {
        runLog.warn(`Obtenção de imagem ignorada: ${imgErr instanceof Error ? imgErr.message : imgErr}`);
      }
    }

    runLog.step(`Publicando artigo na API do blog (${blog.baseUrl})...`);
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

    const fullLogText = runLog.formatFullLog();

    await store.finishRun(runId, {
      status: "success",
      model: finalModelInfo,
      postId: result.id || null,
      postSlug: result.slug || null,
      title: article.title,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      cost: totalCost,
      logs: fullLogText,
      finishedAt: new Date().toISOString(),
    });
    await store.bumpPostCount(agent.id);
    await store.setLastError(agent.id, null);
    runLog.success(
      `Post #${result.id || "?"} publicado com sucesso: "${article.title}"`,
      `Slug: ${result.slug || article.slug} | Tokens totais: ${totalTokensIn}+${totalTokensOut} | Custo total: $${totalCost.toFixed(4)}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    runLog.error(`Falha na execução do Redator: ${message}`, stack);
    const fullLogText = runLog.formatFullLog();

    await store.finishRun(runId, {
      status: "error",
      model: agent.model,
      error: message,
      logs: fullLogText,
      finishedAt: new Date().toISOString(),
    });
    await store.setLastError(agent.id, message);
    throw err;
  }
}
