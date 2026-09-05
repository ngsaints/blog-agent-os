import type { AppConfig } from "./config.ts";
import type { AgentInput, AgentRole, AgentStatus, ImageSourceMode, SqlStore } from "./turso_store.ts";
import type { OpenRouterClient } from "./openrouter.ts";
import { PexelsClient } from "./pexels.ts";
import { BlogApiClient, type CategoryInfo, normalizeBlogBaseUrl } from "./blog_api.ts";
import type { AgentRunner } from "./scheduler.ts";
import { runAgentOnce } from "./agent.ts";
import { isAgentRunning, runAgentNow, runDueAgents } from "./scheduler.ts";
import { systemLogger } from "./logger.ts";
import { type PanelSettings, SettingsService } from "./settings.ts";
import { ChatService } from "./chat.ts";
import { chatPage } from "./chat_page.ts";
import {
  cookieHeader,
  createSession,
  parseCookies,
  SESSION_COOKIE,
  verifySession,
} from "./auth.ts";
import {
  type AgentRankingItem,
  type DashboardData,
  databasePage,
  dashboardPage,
  loginPage,
  rankingPage,
  settingsPage,
} from "./dashboard.ts";
import { fetchMultiFeedRadar } from "./rss.ts";

export interface ServerContext {
  config: AppConfig;
  store: SqlStore;
  settings: SettingsService;
  openrouter: OpenRouterClient;
  pexels: PexelsClient;
  runner: AgentRunner;
  chat: ChatService;
}

export type Handler = (req: Request) =>Promise<Response> | Response;

function redirect(location: string, msg?: string, msgError = false): Response {
  const target = msg
    ? `${location}${location.includes("?") ? "&" : "?"}msg=${encodeURIComponent(msg)}${
      msgError ? "&err=1" : ""
    }`
    : location;
  return new Response(null, { status: 302, headers: { Location: target } });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function parseAgentInput(form: FormData): Promise<AgentInput> {
  const status: AgentStatus = form.get("status_active") ? "active" : "paused";
  const roleStr = String(form.get("role") ?? "writer");
  const role: AgentRole = roleStr === "reviewer"
    ? "reviewer"
    : roleStr === "image_creator"
    ? "image_creator"
    : "writer";
  const ratioStr = String(form.get("image_aspect_ratio") ?? "9:16");
  const imageAspectRatio = ratioStr === "16:9" || ratioStr === "1:1" ? ratioStr : "9:16";
  const modeStr = String(form.get("image_source_mode") ?? "ai_only");
  const imageSourceMode: ImageSourceMode =
    modeStr === "pexels_only" || modeStr === "hybrid" || modeStr === "auto_cost"
      ? modeStr
      : "ai_only";
  const blogId = Number(form.get("blog_id") ?? 0);
  const reviewerId = Number(form.get("reviewer_id") ?? 0);
  const dailyPostLimit = Number(form.get("daily_post_limit") ?? 0) || 0;

  let avatar = "bot";
  const avatarFile = form.get("avatar_file");
  if (avatarFile && typeof avatarFile === "object" && "arrayBuffer" in avatarFile) {
    const file = avatarFile as File;
    if (file.size > 0) {
      const bytes = await file.arrayBuffer();
      const b64 = Buffer.from(bytes).toString("base64");
      avatar = `data:${file.type || "image/png"};base64,${b64}`;
    }
  }
  if (avatar === "bot") {
    const avatarUrl = String(form.get("avatar_url") ?? "").trim();
    const avatarPreset = String(form.get("avatar") ?? "").trim();
    if (avatarUrl) {
      avatar = avatarUrl;
    } else if (avatarPreset) {
      avatar = avatarPreset;
    }
  }

  return {
    name: String(form.get("name") ?? "").trim(),
    description: String(form.get("description") ?? "").trim(),
    model: String(form.get("model") ?? "").trim().replace(/^[~]+/, "").trim(),
    imageModel: String(form.get("image_model") ?? "").trim().replace(/^[~]+/, "").trim(),
    imageSourceMode,
    toolsEnabled: form.has("tools_enabled"),
    role,
    reviewerId: Number.isFinite(reviewerId) && reviewerId > 0 ? reviewerId : null,
    avatar,
    imageAspectRatio,
    dailyPostLimit: Math.max(0, dailyPostLimit),
    blogId: Number.isFinite(blogId) && blogId > 0 ? blogId : null,
    categoryId: Number(form.get("category_id") ?? 0) || 1,
    publishToBlog: form.has("publish_to_blog"),
    pinterestEnabled: form.has("pinterest_enabled"),
    imageGen: form.has("image_gen"),
    scheduleMinutes: Math.max(15, Number(form.get("schedule_minutes") ?? 720) || 720),
    maxTokens: Math.min(65536, Math.max(512, Number(form.get("max_tokens") ?? 8192) || 8192)),
    prompt: String(form.get("prompt") ?? "").trim(),
    status,
  };
}

async function validateAgentInput(input: AgentInput, store: SqlStore): Promise<string | null> {
  if (!input.name) return "O nome do agente é obrigatório.";
  if (input.name.length < 2 || input.name.length > 60) {
    return "O nome deve ter entre 2 e 60 caracteres.";
  }
  if (!input.model) return "O modelo do OpenRouter é obrigatório.";
  if (input.role === "writer" || input.role === "image_creator") {
    if (!input.blogId) return "Escolha o blog onde o agente vai publicar.";
    const blog = await store.getBlog(input.blogId);
    if (!blog) return "O blog escolhido não existe.";
  }
  return null;
}

export function createHandler(ctx: ServerContext): Handler {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    if (path === "/health") {
      return json({ ok: true, ts: new Date().toISOString() });
    }

    if (path === "/__cron") {
      if (method !== "GET" && method !== "POST") return json({ error: "method" }, 405);
      const token = url.searchParams.get("token") ?? req.headers.get("x-cron-token") ?? "";
      if (!ctx.config.cronToken || token !== ctx.config.cronToken) {
        return json({ error: "token inválido" }, 403);
      }
      const result = await runDueAgents(ctx.store, ctx.runner, true);
      return json({ ok: true, ran: result.count, agents: result.agents });
    }

    if (path === "/") {
      return redirect("/admin");
    }

    if (path === "/admin/login") {
      const authed = await isAuthenticated(req, ctx.config);
      if (authed) return redirect("/admin");
      if (method === "POST") {
        const form = await req.formData();
        const username = String(form.get("username") ?? "");
        const password = String(form.get("password") ?? "");
        if (
          username === ctx.config.adminUsername &&
          password === ctx.config.adminPassword
        ) {
          const session = await createSession(username, ctx.config.sessionSecret);
          return new Response(null, {
            status: 302,
            headers: {
              Location: "/admin",
              "Set-Cookie": cookieHeader(session),
            },
          });
        }
        return loginPage(true);
      }
      return loginPage();
    }

    if (path === "/admin/logout") {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/admin/login",
          "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
        },
      });
    }

    if ((path === "/admin" || path === "/admin/") && method === "GET") {
      const authed = await isAuthenticated(req, ctx.config);
      if (!authed) return redirect("/admin/login");
      return dashboard(ctx, url);
    }

    if (path === "/admin/ranking" && method === "GET") {
      const blogId = url.searchParams.get("blog_id");
      return redirect(blogId ? `/admin?tab=ranking&blog_id=${blogId}` : "/admin?tab=ranking");
    }

    if (path === "/admin/database" && method === "GET") {
      return redirect("/admin?tab=database");
    }

    if (path === "/admin/settings" && method === "GET") {
      return redirect("/admin?tab=settings");
    }

    if (path === "/admin/database/clear-runs" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return redirect("/admin/login");
      const form = await req.formData();
      const keepLatest = Math.max(10, Number(form.get("keep_latest") ?? 50) || 50);
      const deleted = await ctx.store.clearOldRuns(keepLatest);
      return redirect(
        "/admin?tab=database",
        deleted > 0
          ? `${deleted} execuções antigas foram removidas do banco.`
          : "Nenhuma execução precisava ser limpa.",
      );
    }

    if (path === "/admin/database/vacuum" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return redirect("/admin/login");
      await ctx.store.optimizeDatabase();
      return redirect("/admin?tab=database", "Banco de dados otimizado e compactado com sucesso.");
    }

    if (path === "/admin/settings" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return redirect("/admin/login");
      const form = await req.formData();
      const values: PanelSettings = {
        openrouterApiKey: String(form.get("openrouter_api_key") ?? (ctx.settings.get().openrouterApiKey || "")).trim(),
        openrouterBackupKeys: String(form.get("openrouter_backup_keys") ?? (ctx.settings.get().openrouterBackupKeys || "")).trim(),
        chatModel: String(form.get("chat_model") ?? (ctx.settings.get().chatModel || "")).trim(),
        pexelsApiKey: String(form.get("pexels_api_key") ?? (ctx.settings.get().pexelsApiKey || "")).trim(),
        groqApiKey: String(form.get("groq_api_key") ?? (ctx.settings.get().groqApiKey || "")).trim(),
        geminiApiKey: String(form.get("gemini_api_key") ?? (ctx.settings.get().geminiApiKey || "")).trim(),
        openaiApiKey: String(form.get("openai_api_key") ?? (ctx.settings.get().openaiApiKey || "")).trim(),
        deepseekApiKey: String(form.get("deepseek_api_key") ?? (ctx.settings.get().deepseekApiKey || "")).trim(),
        anthropicApiKey: String(form.get("anthropic_api_key") ?? (ctx.settings.get().anthropicApiKey || "")).trim(),
        ollamaBaseUrl: String(form.get("ollama_base_url") ?? (ctx.settings.get().ollamaBaseUrl || "")).trim(),
        maxDailyPostsPerAgent: Number(form.get("max_daily_posts_per_agent") ?? ctx.settings.get().maxDailyPostsPerAgent ?? 0) || 0,
        maxDailyPostsGlobal: Number(form.get("max_daily_posts_global") ?? ctx.settings.get().maxDailyPostsGlobal ?? 0) || 0,
        dailyBudgetUsd: Number(form.get("daily_budget_usd") ?? ctx.settings.get().dailyBudgetUsd ?? 0) || 0,
        minCreditBalance: Number(form.get("min_credit_balance") ?? ctx.settings.get().minCreditBalance ?? 0) || 0,
        cooldownSeconds: Number(form.get("cooldown_seconds") ?? ctx.settings.get().cooldownSeconds ?? 0) || 0,
      };
      try {
        await ctx.settings.save(values);
        return redirect("/admin?tab=settings", "Configurações salvas.");
      } catch (err) {
        return redirect(
          "/admin?tab=settings",
          `Falha ao salvar: ${err instanceof Error ? err.message : err}`,
          true,
        );
      }
    }

    if (path === "/admin/blogs" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return redirect("/admin/login");
      const form = await req.formData();
      const name = String(form.get("name") ?? "").trim();
      const baseUrl = String(form.get("base_url") ?? "").trim();
      const token = String(form.get("token") ?? "").trim();
      if (!name || !baseUrl || !token) {
        return redirect(
          "/admin?tab=settings",
          "Nome, domínio e token são obrigatórios para cadastrar o blog.",
          true,
        );
      }
      try {
        const normalizedBaseUrl = normalizeBlogBaseUrl(baseUrl);
        const client = new BlogApiClient(normalizedBaseUrl, token);
        const cats = await client.listCategories();
        const id = await ctx.store.saveBlog({ name, baseUrl: normalizedBaseUrl, token });
        return redirect(
          "/admin?tab=settings",
          `Blog "${name}" cadastrado com sucesso (${cats.length} categorias carregadas, id ${id}).`,
        );
      } catch (err) {
        return redirect(
          "/admin?tab=settings",
          `Falha ao conectar no blog: ${err instanceof Error ? err.message : err}`,
          true,
        );
      }
    }

    const blogDeleteMatch = path.match(/^\/admin\/blogs\/(\d+)\/delete$/);
    if (blogDeleteMatch && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return redirect("/admin/login");
      const blogId = Number(blogDeleteMatch[1]);
      const blog = await ctx.store.getBlog(blogId);
      if (!blog) return redirect("/admin?tab=settings", "Blog não encontrado.", true);
      const agents = await ctx.store.listAgents();
      const inUse = agents.some((a) => a.blogId === blogId);
      if (inUse) {
        return redirect(
          "/admin?tab=settings",
          `Não é possível excluir "${blog.name}": há agentes usando este blog.`,
          true,
        );
      }
      await ctx.store.deleteBlog(blogId);
      return redirect("/admin?tab=settings", `Blog "${blog.name}" excluído.`);
    }

    if (path === "/admin/run-due" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return redirect("/admin/login");
      const result = await runDueAgents(ctx.store, ctx.runner);
      const msg = result.count > 0
        ? `${result.count} agente(s) iniciado(s): ${result.agents.join(", ")}`
        : "Nenhum agente devido no momento.";
      return redirect("/admin", msg);
    }



    if (path === "/admin/agents" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return redirect("/admin/login");
      const input = await parseAgentInput(await req.formData());
      const error = await validateAgentInput(input, ctx.store);
      if (error) return redirect("/admin", error, true);
      const id = await ctx.store.createAgent(input);
      return redirect("/admin", `Agente criado (id ${id}).`);
    }

    const agentMatch = path.match(/^\/admin\/agents\/(\d+)\/(run|toggle|update|delete)$/);
    if (agentMatch && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return redirect("/admin/login");
      const id = Number(agentMatch[1]);
      const action = agentMatch[2];
      const agent = await ctx.store.getAgent(id);
      if (!agent) return redirect("/admin", "Agente não encontrado.", true);

      switch (action) {
        case "run": {
          if (isAgentRunning(id)) {
            return redirect("/admin", "Este agente já está em execução no momento.", true);
          }
          systemLogger.info("Dashboard", `Disparo manual do agente "${agent.name}" (#${id})`, undefined, { agentId: id });
          try {
            await runAgentNow(ctx.store, ctx.runner, id, true);
            const fresh = await ctx.store.getAgent(id);
            if (fresh?.lastError) {
              return redirect(
                "/admin",
                `Falha na execução de "${agent.name}": ${fresh.lastError}. Verifique a aba de Logs.`,
                true,
              );
            }
            return redirect("/admin", `Execução de "${agent.name}" concluída com sucesso!`);
          } catch (runErr) {
            const msg = runErr instanceof Error ? runErr.message : String(runErr);
            return redirect(
              "/admin",
              `Falha na execução de "${agent.name}": ${msg}. Verifique a aba de Logs.`,
              true,
            );
          }
        }
        case "toggle": {
          const next = await ctx.store.toggleAgent(id);
          return redirect(
            "/admin",
            `Agente "${agent.name}" ${next === "active" ? "ativado" : "pausado"}.`,
          );
        }
        case "update": {
          const input = await parseAgentInput(await req.formData());
          const error = await validateAgentInput(input, ctx.store);
          if (error) return redirect("/admin", error, true);
          await ctx.store.updateAgent(id, input);
          return redirect("/admin", `Agente "${input.name}" atualizado.`);
        }
        case "delete": {
          const form = await req.formData();
          if (form.get("confirm") !== "1") {
            return redirect("/admin", "Exclusão não confirmada.", true);
          }
          await ctx.store.deleteAgent(id);
          return redirect("/admin", `Agente "${agent.name}" excluído.`);
        }
      }
    }

    if (path === "/chat" && method === "GET") {
      if (!(await isAuthenticated(req, ctx.config))) return redirect("/admin/login");
      const settings = ctx.settings.get();
      const credits = settings.openrouterApiKey ? await ctx.openrouter.getCredits() : null;
      return chatPage({
        conversations: await ctx.store.listChatConversations(),
        models: await fetchModels(ctx),
        blogs: await ctx.store.listBlogs(),
        settings,
        defaultModel: settings.chatModel,
        credits: credits ? `Créditos: $${credits.totalCredits.toFixed(2)}` : null,
      });
    }

    if (path === "/chat/api/conversations" && method === "GET") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      return json(await ctx.store.listChatConversations());
    }

    if (path === "/chat/api/conversations" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const conv = await ctx.chat.createConversation(String(body?.model ?? ""));
      return json(conv, 201);
    }

    const chatConvMatch = path.match(/^\/chat\/api\/conversations\/(\d+)$/);
    if (chatConvMatch) {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const convId = Number(chatConvMatch[1]);
      if (method === "PATCH") {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        if (!(await ctx.store.getChatConversation(convId))) {
          return json({ error: "Conversa não encontrada" }, 404);
        }
        await ctx.store.updateChatConversation(convId, {
          title: typeof body?.title === "string" ? body.title : undefined,
          model: typeof body?.model === "string" ? body.model : undefined,
        });
        return json({ ok: true });
      }
      if (method === "DELETE") {
        await ctx.chat.deleteConversation(convId);
        return json({ ok: true });
      }
    }

    const chatMessagesMatch = path.match(/^\/chat\/api\/conversations\/(\d+)\/messages$/);
    if (chatMessagesMatch) {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const convId = Number(chatMessagesMatch[1]);
      if (method === "GET") {
        const beforeId = url.searchParams.get("before") ? Number(url.searchParams.get("before")) : undefined;
        const limit = Number(url.searchParams.get("limit") ?? 30) || 30;
        return json(await ctx.chat.messages(convId, { beforeId, limit }));
      }
      if (method === "POST") {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        const text = typeof body?.text === "string" ? body.text : "";
        const model = typeof body?.model === "string" ? body.model : undefined;
        try {
          const result = await ctx.chat.sendMessage(convId, text, model);
          return json(result);
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : String(err) },
            400,
          );
        }
      }
    }

    const chatProposalMatch = path.match(/^\/chat\/api\/proposals\/([\w-]+)\/(approve|reject)$/);
    if (chatProposalMatch && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const proposalId = chatProposalMatch[1];
      if (chatProposalMatch[2] === "approve") {
        return json(await ctx.chat.approveProposal(proposalId));
      }
      ctx.chat.rejectProposal(proposalId);
      return json({ ok: true, message: "Proposta recusada." });
    }

    if (path === "/admin/create-post/generate-content" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const prompt = String(body?.prompt ?? "").trim();
      const model = String(body?.model ?? (ctx.settings.get().chatModel || "deepseek/deepseek-chat")).trim();
      const useWebSearch = Boolean(body?.web_search ?? true);
      const categoryId = Number(body?.category_id ?? 0);
      if (!prompt) return json({ error: "Prompt obrigatorio." }, 400);
      try {
        let newsGrounding = "";
        try {
          const sources = await ctx.store.listRssSources(categoryId > 0 ? categoryId : undefined);
          const active = sources.filter((s) => s.isActive);
          if (active.length > 0) {
            const articles = await fetchMultiFeedRadar(active, 4);
            if (articles.length > 0) {
              newsGrounding = "\n\nNOTÍCIAS E FATOS REAIS DE HOJE (ÚLTIMAS HORAS):\n" +
                articles.map((a, i) => `${i + 1}. "${a.title}" — Fonte: ${a.source} (${a.pubDate || "Hoje"})`).join("\n") +
                "\nBaseie-se rigorosamente nesses fatos e novidades reais como referência factual e gancho editorial.";
            }
          }
        } catch { /* fallback */ }

        const system = `Voce e um redator profissional de blog brasileiro senior. Escreva artigos em portugues do Brasil, com otima qualidade editorial, SEO otimizado e HTML semantico pronto para publicacao.
${useWebSearch ? "\nIMPORTANTE: A pesquisa web em tempo real esta ativada. Incorpore fatos recentes, estatisticas, referencias e informacoes atualizadas com autoridade editorial." : ""}
${newsGrounding}

**FORMATO DE RESPOSTA:** Retorne APENAS um JSON valido com:
{
  "title": "Titulo do artigo",
  "excerpt": "Resumo em 2 frases",
  "content_html": "<p>Conteudo completo em HTML com h2, h3, <strong>, <em>, <a>, <ul>, <li>...</p>",
  "slug": "slug-do-artigo",
  "tags": "tag1, tag2, tag3"
}

REGRAS:
- Nao use marcadores markdown como **. Use tags HTML.
- Nao inclua emojis.
- Links internos use href=\"#\" se nao souber o destino.
- O content_html deve ser auto-contido e profissional pronto para publicacao.
- Maximo 2500 palavras.`;
        const result = await ctx.openrouter.chat({
          model,
          system,
          user: `Escreva um artigo completo de blog sobre: ${prompt}`,
          maxTokens: 4096,
          temperature: 0.8,
          webSearch: useWebSearch,
        });
        let parsed: Record<string, unknown> = {};
        try {
          const raw = result.content.trim();
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        } catch { /* fallback */ }
        return json({
          title: parsed.title || "",
          excerpt: parsed.excerpt || "",
          content_html: parsed.content_html || "",
          content: parsed.content_html || result.content,
          slug: parsed.slug || "",
          tags: parsed.tags || "",
          model: result.model,
          cost: result.cost,
        });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    }

    if (path === "/admin/create-post/generate-image" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const prompt = String(body?.prompt ?? "").trim();
      const model = String(body?.model ?? "google/gemini-2.5-flash-image").trim();
      if (!prompt) return json({ error: "Prompt obrigatorio." }, 400);
      try {
        const imageResult = await ctx.openrouter.generateImage(
          prompt,
          model,
          "1:1",
        );
        if (!imageResult || !imageResult.bytes) {
          return json({ error: "Falha ao gerar imagem." }, 500);
        }
        // Upload to blog - use first available blog
        const blogs = await ctx.store.listBlogs();
        if (blogs.length === 0) {
          // Return base64 data URL if no blog is configured
          const b64 = btoa(String.fromCharCode(...imageResult.bytes));
          return json({ url: `data:${imageResult.type};base64,${b64}`, note: "Sem blog configurado. Use o data URL temporario." });
        }
        const blog = blogs[0];
        const blogClient = new BlogApiClient(blog.baseUrl, blog.token);
        const filename = `ai-cover-${Date.now()}.${imageResult.type.includes("png") ? "png" : "jpg"}`;
        const uploadedUrl = await blogClient.uploadImage(imageResult.bytes, filename, imageResult.type);
        return json({ url: uploadedUrl, cost: imageResult.cost });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    }

    if (path === "/admin/create-post/upload-image" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const blogId = Number(formData.get("blog_id") ?? 0);
        if (!file || typeof file === "string") {
          return json({ error: "Arquivo de imagem não enviado." }, 400);
        }
        const blogs = await ctx.store.listBlogs();
        const blog = (blogId > 0 ? await ctx.store.getBlog(blogId) : null) || blogs[0];
        if (!blog) {
          return json({ error: "Cadastre ao menos um blog para enviar imagens." }, 400);
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const blogClient = new BlogApiClient(blog.baseUrl, blog.token);
        const ext = file.name ? file.name.split(".").pop() || "jpg" : "jpg";
        const filename = `upload-cover-${Date.now()}.${ext}`;
        const uploadedUrl = await blogClient.uploadImage(bytes, filename, file.type || "image/jpeg", "blog");
        return json({ url: uploadedUrl });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    }

    if (path === "/admin/create-post/search-pexels" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const query = String(body?.query ?? "").trim();
      if (!query) return json({ error: "Termo de busca obrigatório." }, 400);
      try {
        const photos = await ctx.pexels.searchPhotos(query, "landscape", 8);
        const mapped = photos.map((p) => ({
          id: p.id,
          url: p.src.landscape || p.src.large || p.src.medium,
          alt: p.alt || p.photographer,
          photographer: p.photographer,
        }));
        return json({ photos: mapped });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    }

    if (path === "/admin/create-post/ai-assist" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const action = String(body?.action ?? "");
      const title = String(body?.title ?? "");
      const content = String(body?.content ?? "");
      const model = String(body?.model ?? (ctx.settings.get().chatModel || "deepseek/deepseek-chat")).trim();

      try {
        const system = "Você é um assistente sênior de redação e SEO para blogs em português do Brasil. Responda de forma direta e concisa, sem introduções ou enrolação.";
        let user = "";

        if (action === "improve_title") {
          user = `Crie 3 opções de títulos altamente atraentes, com excelente CTR e otimizados para SEO para este artigo.\nTítulo atual: "${title}"\nConteúdo: ${content.slice(0, 600)}\nRetorne apenas os 3 títulos numerados.`;
        } else if (action === "generate_excerpt") {
          user = `Escreva um resumo atraente e direto para meta-description (entre 120 e 155 caracteres) para o artigo:\nTítulo: "${title}"\nConteúdo: ${content.slice(0, 1000)}\nRetorne apenas o texto do resumo.`;
        } else if (action === "suggest_tags") {
          user = `Sugira entre 4 e 6 tags relevantes separadas por vírgula para este artigo:\nTítulo: "${title}"\nConteúdo: ${content.slice(0, 800)}\nRetorne apenas as tags separadas por vírgula.`;
        } else if (action === "generate_slug") {
          user = `Gere apenas o slug de URL otimizado em minúsculas com hifens (sem acentos nem pontuação) para o título: "${title}". Retorne apenas o slug.`;
        } else {
          return json({ error: "Ação de assistência inválida." }, 400);
        }

        const result = await ctx.openrouter.chat({
          model,
          system,
          user,
          maxTokens: 500,
          temperature: 0.7,
        });

        return json({ result: result.content.trim() });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    }

    if (path === "/admin/create-post/publish" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const blogId = Number(body?.blog_id ?? 0);
      const blog = await ctx.store.getBlog(blogId);
      if (!blog) return json({ error: "Blog nao encontrado." }, 400);
      try {
        const blogClient = new BlogApiClient(blog.baseUrl, blog.token);
        const result = await blogClient.createPost({
          title: String(body?.title ?? ""),
          content: String(body?.content ?? ""),
          excerpt: typeof body?.excerpt === "string" && body.excerpt ? body.excerpt : undefined,
          slug: typeof body?.slug === "string" && body.slug ? body.slug : undefined,
          cover_image: typeof body?.cover_image === "string" && body.cover_image ? body.cover_image : undefined,
          published: Boolean(body?.published) ?? true,
          pinterest_enabled: Boolean(body?.pinterest_enabled) ?? false,
          category_ids: [Number(body?.category_id ?? 1)],
          tags: typeof body?.tags === "string" && body.tags ? body.tags : undefined,
        });
        return json({ id: result.id, slug: result.slug });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    }

    if (path === "/admin/api/logs" && method === "GET") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get("limit") ?? "100") || 100;
      const level = (url.searchParams.get("level") || undefined) as any;
      const source = url.searchParams.get("source") || undefined;
      const search = url.searchParams.get("search") || undefined;
      const agentIdParam = url.searchParams.get("agentId");
      const agentId = agentIdParam ? Number(agentIdParam) : undefined;
      const runIdParam = url.searchParams.get("runId");
      const runId = runIdParam ? Number(runIdParam) : undefined;

      const entries = systemLogger.getEntries({
        limit,
        level,
        source,
        search,
        agentId,
        runId,
      });
      return json({ logs: entries, total: entries.length });
    }

    if (path === "/admin/api/logs/clear" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      systemLogger.clear();
      systemLogger.info("System", "Buffer de logs do sistema limpo pelo usuário.");
      return json({ ok: true });
    }

    const runMatch = path.match(/^\/admin\/api\/runs\/(\d+)$/);
    if (runMatch && method === "GET") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const runId = Number(runMatch[1]);
      const run = await ctx.store.getRun(runId);
      if (!run) return json({ error: "Execução não encontrada." }, 404);
      const agent = await ctx.store.getAgent(run.agentId);
      return json({
        run,
        agentName: agent ? agent.name : `Agente #${run.agentId}`,
      });
    }

    if (path === "/admin/api/rss-sources" && method === "GET") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const catParam = url.searchParams.get("categoryId");
      const categoryId = catParam ? Number(catParam) : undefined;
      const sources = await ctx.store.listRssSources(categoryId);
      return json({ sources });
    }

    if (path === "/admin/api/rss-sources" && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const name = String(body?.name ?? "").trim();
      const feedUrl = String(body?.url ?? "").trim();
      const categoryId = Number(body?.categoryId ?? 1);
      if (!name || !feedUrl) {
        return json({ error: "Nome e URL do feed são obrigatórios." }, 400);
      }
      try {
        const id = await ctx.store.addRssSource(name, feedUrl, categoryId);
        return json({ id, ok: true }, 201);
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) }, 500);
      }
    }

    const rssToggleMatch = path.match(/^\/admin\/api\/rss-sources\/(\d+)\/toggle$/);
    if (rssToggleMatch && method === "POST") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const id = Number(rssToggleMatch[1]);
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const isActive = Boolean(body?.isActive);
      await ctx.store.toggleRssSource(id, isActive);
      return json({ ok: true });
    }

    const rssDeleteMatch = path.match(/^\/admin\/api\/rss-sources\/(\d+)$/);
    if (rssDeleteMatch && method === "DELETE") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const id = Number(rssDeleteMatch[1]);
      await ctx.store.deleteRssSource(id);
      return json({ ok: true });
    }

    if (path === "/admin/api/rss-radar" && method === "GET") {
      if (!(await isAuthenticated(req, ctx.config))) return json({ error: "auth" }, 401);
      const catParam = url.searchParams.get("categoryId");
      const categoryId = catParam ? Number(catParam) : undefined;
      const sources = await ctx.store.listRssSources(categoryId);
      const articles = await fetchMultiFeedRadar(sources, 30);
      return json({ articles });
    }

    return json({ error: "Não encontrado" }, 404);
  };
}

async function isAuthenticated(req: Request, config: AppConfig): Promise<boolean> {
  const cookies = parseCookies(req.headers.get("cookie"));
  return verifySession(cookies[SESSION_COOKIE] ?? null, config.sessionSecret);
}

async function dashboard(ctx: ServerContext, url: URL): Promise<Response> {
  const blogIdParam = url.searchParams.get("blog_id");
  const selectedBlogId = blogIdParam ? Number(blogIdParam) : null;
  const activeTab = url.searchParams.get("tab") || "agents";

  const [agents, runs, stats, blogs, categoriesByBlog, databaseMetrics, rssSources] = await Promise.all([
    ctx.store.listAgents(),
    ctx.store.listRuns(30),
    ctx.store.getStats(),
    ctx.store.listBlogs(),
    fetchAllCategories(ctx),
    ctx.store.getDatabaseMetrics(),
    ctx.store.listRssSources(),
  ]);
  const settings = ctx.settings.get();
  const credits = settings.openrouterApiKey ? await ctx.openrouter.getCredits() : null;
  const configMissing: string[] = [];
  if (!settings.openrouterApiKey) configMissing.push("chave da API OpenRouter");
  if (blogs.length === 0) configMissing.push("cadastro de pelo menos um blog");

  // Ranking data calculation (with in-memory 60s cache)
  const agentsToRank = selectedBlogId
    ? agents.filter((a) => a.blogId === selectedBlogId)
    : agents;

  const nowMs = Date.now();
  const postsByBlogId: Record<number, Map<number, { view_count?: number; views_7d?: number; unique_visitors?: number }>> = {};
  await Promise.all(
    blogs.map(async (b) => {
      const cached = postsCache.get(b.id);
      if (cached && cached.token === b.token && nowMs - cached.ts < 60_000) {
        postsByBlogId[b.id] = cached.data;
        return;
      }
      try {
        const client = new BlogApiClient(b.baseUrl, b.token);
        const res = await client.listPosts({ limit: 100 });
        const map = new Map<number, { view_count?: number; views_7d?: number; unique_visitors?: number }>();
        for (const p of res.posts) {
          map.set(p.id, p);
        }
        postsCache.set(b.id, { data: map, ts: nowMs, token: b.token });
        postsByBlogId[b.id] = map;
      } catch {
        postsByBlogId[b.id] = cached?.data ?? new Map();
      }
    }),
  );

  const costByAgentId = new Map<number, number>();
  for (const item of databaseMetrics.agentConsumption) {
    costByAgentId.set(item.agentId, item.totalCostUsd);
  }

  const rankingItems: AgentRankingItem[] = [];
  for (const agent of agentsToRank) {
    const blog = blogs.find((b) => b.id === agent.blogId);
    const blogMap = agent.blogId ? postsByBlogId[agent.blogId] : null;

    const agentRuns = await ctx.store.listRuns(100, agent.id);
    let totalViews = 0;
    let views7d = 0;
    let uniqueVisitors = 0;

    const countedPostIds = new Set<number>();
    for (const r of agentRuns) {
      if (r.status === "success" && r.postId && !countedPostIds.has(r.postId)) {
        countedPostIds.add(r.postId);
        const postData = blogMap ? blogMap.get(r.postId) : null;
        if (postData) {
          totalViews += postData.view_count || 0;
          views7d += postData.views_7d || 0;
          uniqueVisitors += postData.unique_visitors || 0;
        }
      }
    }

    const totalCostUsd = costByAgentId.get(agent.id) || 0;
    const roiScore = totalCostUsd > 0 ? Math.round(totalViews / totalCostUsd) : totalViews;

    rankingItems.push({
      agent,
      blogName: blog ? blog.name : (agent.role === "reviewer" ? "Todos (Revisão)" : "Sem blog"),
      totalPosts: agent.postCount,
      totalViews,
      views7d,
      uniqueVisitors,
      totalCostUsd,
      roiScore,
      rank: 0,
    });
  }

  rankingItems.sort((a, b) => b.totalViews - a.totalViews || b.views7d - a.views7d || b.totalPosts - a.totalPosts);
  const maxViews7d = Math.max(0, ...rankingItems.map((i) => i.views7d));
  const maxRoi = Math.max(0, ...rankingItems.map((i) => i.roiScore));

  rankingItems.forEach((it, idx) => {
    it.rank = idx + 1;
    if (it.rank === 1 && it.totalViews > 0) it.highlightBadge = '<span class="highlight-pill highlight-leader">Líder Geral</span>';
    else if (it.views7d > 0 && it.views7d === maxViews7d) it.highlightBadge = '<span class="highlight-pill highlight-viral">Viral 7D</span>';
    else if (it.roiScore > 0 && it.roiScore === maxRoi) it.highlightBadge = '<span class="highlight-pill highlight-roi">Alta Eficiência</span>';
  });

  const data: DashboardData = {
    activeTab,
    agents,
    runs,
    stats,
    credits: credits ? `Créditos: $${credits.totalCredits.toFixed(2)}` : null,
    runInterval: ctx.config.runIntervalMinutes,
    msg: url.searchParams.get("msg"),
    msgError: url.searchParams.get("err") === "1",
    configMissing,
    runningIds: new Set(agents.filter((a) => isAgentRunning(a.id)).map((a) => a.id)),
    defaultModel: settings.chatModel,
    models: await fetchModels(ctx),
    blogs,
    categoriesByBlog,
    rankingItems,
    selectedBlogId,
    databaseMetrics,
    settings,
    isServerless: ctx.config.isServerless,
    isDenoDeploy: ctx.config.isDenoDeploy,
    cronUrl: `${url.origin}/__cron?token=${ctx.config.cronToken || "SEU_CRON_TOKEN"}`,
    hasCronToken: Boolean(ctx.config.cronToken),
    rssSources,
  };
  return dashboardPage(data);
}

const categoriesCache = new Map<number, { data: CategoryInfo[]; ts: number; token: string }>();
const postsCache = new Map<number, { data: Map<number, { view_count?: number; views_7d?: number; unique_visitors?: number }>; ts: number; token: string }>();

async function fetchAllCategories(ctx: ServerContext): Promise<Record<number, CategoryInfo[]>> {
  const blogs = await ctx.store.listBlogs();
  const out: Record<number, CategoryInfo[]> = {};
  const nowMs = Date.now();
  await Promise.all(blogs.map(async (blog) => {
    const cached = categoriesCache.get(blog.id);
    if (cached && cached.token === blog.token && nowMs - cached.ts < 60_000) {
      out[blog.id] = cached.data;
      return;
    }
    try {
      const cats = await new BlogApiClient(blog.baseUrl, blog.token).listCategories();
      categoriesCache.set(blog.id, { data: cats, ts: nowMs, token: blog.token });
      out[blog.id] = cats;
    } catch (err) {
      console.warn(
        `Falha ao carregar categorias de "${blog.name}": ${
          err instanceof Error ? err.message : err
        }`,
      );
      out[blog.id] = cached?.data ?? [];
    }
  }));
  return out;
}

async function fetchModels(ctx: ServerContext) {
  if (!ctx.settings.get().openrouterApiKey) return [];
  try {
    return await ctx.openrouter.listModels();
  } catch (err) {
    console.warn(
      `Falha ao carregar modelos OpenRouter: ${err instanceof Error ? err.message : err}`,
    );
    return [];
  }
}

export function makeRunner(
  openrouter: OpenRouterClient,
  pexels: PexelsClient,
  store: SqlStore,
  settings: SettingsService,
): AgentRunner {
  return async (agent) => {
    if (agent.role === "reviewer") {
      const msg = "Agentes com papel de Revisor são acionados automaticamente durante a publicação dos redatores.";
      await store.setLastError(agent.id, msg);
      systemLogger.warn(`Agente: ${agent.name}`, msg, undefined, { agentId: agent.id });
      return;
    }
    if (!agent.blogId) {
      const msg = "Nenhum blog associado a este agente. Vincule um blog em 'Editar Agente'.";
      await store.setLastError(agent.id, msg);
      systemLogger.error(`Agente: ${agent.name}`, msg, undefined, { agentId: agent.id });
      throw new Error(msg);
    }
    const blog = await store.getBlog(agent.blogId);
    if (!blog) {
      const msg = `Blog associado (#${agent.blogId}) não encontrado no banco de dados.`;
      await store.setLastError(agent.id, msg);
      systemLogger.error(`Agente: ${agent.name}`, msg, undefined, { agentId: agent.id });
      throw new Error(msg);
    }
    const client = new BlogApiClient(blog.baseUrl, blog.token);
    await runAgentOnce(agent, openrouter, pexels, client, store, "", settings);
  };
}
