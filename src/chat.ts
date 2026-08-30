import type {
  Agent,
  AgentInput,
  ChatConversation,
  ChatMessage,
  ListChatMessagesOptions,
  SqlStore,
} from "./turso_store.ts";
import type { OpenRouterClient } from "./openrouter.ts";
import type { SettingsService } from "./settings.ts";
import { OpenRouter as AgentSdkOpenRouter, tool, stepCountIs, maxCost } from "@openrouter/agent";
import type { Tool } from "@openrouter/agent";
import { z } from "zod";
import { BlogApiClient, type PostItem } from "./blog_api.ts";
import { runAgentOnce } from "./agent.ts";
import type { PexelsClient } from "./pexels.ts";
import { runAgentNow, type AgentRunner } from "./scheduler.ts";

export type ProposalType =
  | "create_post"
  | "create_agent"
  | "update_agent"
  | "delete_agent"
  | "run_agent"
  | "toggle_agent"
  | "delegate_task";

export interface ChatProposal {
  id: string;
  type: ProposalType;
  label: string;
  summary: string;
  detail: Record<string, unknown>;
  createdAt: number;
}

export interface ChatTurnResult {
  reply: string;
  model: string;
  proposals: ChatProposal[];
  tokensIn: number;
  tokensOut: number;
  cost: number;
}

export interface RankingEntry {
  rank: number;
  agentName: string;
  role: string;
  totalPosts: number;
  totalViews: number;
  views7d: number;
  totalCostUsd: number;
  roiScore: number;
}

const PROPOSAL_TTL_MS = 30 * 60 * 1000;

export function proposalTypeLabel(type: ProposalType): string {
  const labels: Record<ProposalType, string> = {
    create_post: "Publicar post",
    create_agent: "Criar agente",
    update_agent: "Editar agente",
    delete_agent: "Excluir agente",
    run_agent: "Executar agente",
    toggle_agent: "Ativar/pausar agente",
    delegate_task: "Delegar tarefa",
  };
  return labels[type];
}

interface StoredProposal {
  proposal: ChatProposal;
  expiresAt: number;
}

class ProposalStore {
  private map = new Map<string, StoredProposal>();

  add(proposal: ChatProposal): void {
    this.map.set(proposal.id, {
      proposal,
      expiresAt: Date.now() + PROPOSAL_TTL_MS,
    });
  }

  get(id: string): ChatProposal | null {
    const entry = this.map.get(id);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(id);
      return null;
    }
    return entry.proposal;
  }

  remove(id: string): void {
    this.map.delete(id);
  }

  list(): ChatProposal[] {
    const now = Date.now();
    for (const [id, entry] of this.map) {
      if (now > entry.expiresAt) this.map.delete(id);
    }
    return [...this.map.values()].map((e) => e.proposal);
  }
}

const CHAT_SYSTEM_PROMPT =
  `Você é o "Agent OS" — a Inteligência Central e Cérebro Operacional do sistema Blog Agent OS.
Você possui controle em tempo real e visão completa de todo o ecossistema: blogs conectados, agentes autônomos, publicações, estatísticas, métricas de banco e custos de IA.

SUA PERSONALIDADE E POSTURA:
- Você é VIVO, PROATIVO, CONSULTIVO e ÁGIL. Você não é um chatbot genérico; você é o Diretor Operacional e Engenheiro de IA do painel.
- Você entende o contexto do negócio, fala em português do Brasil com naturalidade, segurança e tom prestativo e profissional.

MOTOR DE DIÁLOGO E EXECUÇÃO DE COMANDOS (EM ETAPAS):
1. CONSULTORIA & ALINHAMENTO DE TEMA:
   - Quando o usuário perguntar se você consegue fazer algo ou pedir algo amplo (ex: 'Consegue criar um post no DailyitGirl?', 'Pode fazer um post sobre tecnologia?'):
     * Responda confirmando com entusiasmo e precisão: 'Com certeza! O blog [Nome] está conectado (nicho: [Nicho/Categorias]).'
     * Pergunte qual tema/ângulo ele prefere e ofereça prontamente 3 ideias de pauta criativas e em alta alinhadas ao nicho do blog.
2. EXECUÇÃO DE COMANDOS (COM PROPOSTA VISUAL):
   - Assim que o usuário escolher ou especificar o tema (ex: 'faça a ideia 2', 'quero sobre tendências de vestidos minimalistas'):
     * Consulte list_blogs e list_categories para garantir o blogId e categorias corretos.
     * Crie o artigo em padrão editorial com título atraente, tags e HTML estruturado.
     * Chame IMEDIATAMENTE a ferramenta propose_create_post (ou propose_delegate_task) para disparar o card interativo de aprovação!
3. ENGENHARIA DE AGENTES:
   - Quando o usuário pedir para criar um agente ou melhorar um existente (ex: 'melhore o agente de GTA', 'crie um agente de vestidos de noiva'):
     * Atue como um Engenheiro Editorial Sênior.
     * Crie nome marcante, persona envolvente, e um PROMPT altamente detalhado e blindado (regras estritas para não misturar assuntos do blog, diretivas de tom e SEO).
     * Configure os melhores modelos (visual 9:16 para Pinterest com qwen/qwen-image-3 ou gemini-2.5-flash-image; texto com deepseek/deepseek-chat ou z-ai/glm-5.2).
     * Chame propose_create_agent ou propose_update_agent para o usuário aprovar no chat.
4. CONTROLE TOTAL DO SISTEMA:
   - Use list_agents, list_blogs, list_recent_runs, get_ranking, get_database_metrics e get_stats para manter o usuário sempre informado com tabelas tratadas.
   - NUNCA execute ações destrutivas ou de publicação sem chamar a ferramenta 'propose_*' correspondente.`;

export class ChatService {
  private proposals = new ProposalStore();

  constructor(
    private store: SqlStore,
    private openrouter: OpenRouterClient,
    private settings: SettingsService,
    private runner: AgentRunner,
    private pexels?: PexelsClient,
  ) {}

  async listConversations(): Promise<ChatConversation[]> {
    return this.store.listChatConversations();
  }

  async getConversation(id: number): Promise<ChatConversation | null> {
    return this.store.getChatConversation(id);
  }

  async createConversation(model?: string): Promise<ChatConversation> {
    const activeModel = (this.settings.get().chatModel || model || "").trim();
    const id = await this.store.createChatConversation(
      "Nova conversa",
      activeModel,
    );
    const conv = await this.store.getChatConversation(id);
    if (!conv) throw new Error("Falha ao criar conversa");
    return conv;
  }

  async deleteConversation(id: number): Promise<void> {
    await this.store.deleteChatConversation(id);
  }

  async messages(
    conversationId: number,
    opts?: ListChatMessagesOptions,
  ): Promise<ChatMessage[]> {
    return this.store.listChatMessages(conversationId, opts);
  }

  listProposals(): ChatProposal[] {
    return this.proposals.list();
  }

  async approveProposal(id: string): Promise<{ ok: boolean; message: string }> {
    const proposal = this.proposals.get(id);
    if (!proposal) return { ok: false, message: "Proposta expirada ou inexistente." };
    try {
      const message = await this.executeProposal(proposal);
      this.proposals.remove(id);
      return { ok: true, message };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  rejectProposal(id: string): void {
    this.proposals.remove(id);
  }

  private async executeProposal(proposal: ChatProposal): Promise<string> {
    const d = proposal.detail;
    switch (proposal.type) {
      case "create_post": {
        const blogId = Number(d.blogId);
        const blog = await this.store.getBlog(blogId);
        if (!blog) throw new Error("Blog da proposta não encontrado.");
        const client = new BlogApiClient(blog.baseUrl, blog.token);

        let coverImage: string | undefined;
        if (typeof d.cover_image === "string" && d.cover_image) {
          coverImage = d.cover_image;
        }
        const imageUrl = typeof d.image_url === "string" ? d.image_url : "";
        if (imageUrl) {
          const imgRes = await fetch(imageUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            signal: AbortSignal.timeout(20_000),
          });
          if (!imgRes.ok) throw new Error(`Falha ao baixar imagem: HTTP ${imgRes.status}`);
          const bytes = new Uint8Array(await imgRes.arrayBuffer());
          const type = imgRes.headers.get("content-type") ?? "image/png";
          const ext = type.includes("png") ? "png" : type.includes("gif") ? "gif" : "jpg";
          coverImage = await client.uploadImage(bytes, `chat-${Date.now()}.${ext}`, type);
        }

        const result = await client.createPost({
          title: String(d.title ?? ""),
          content: String(d.content ?? ""),
          excerpt: d.excerpt ? String(d.excerpt) : undefined,
          cover_image: coverImage,
          published: d.published !== false,
          pinterest_enabled: Boolean(d.pinterest_enabled),
          pinterest_image: d.pinterest_enabled && coverImage ? coverImage : undefined,
          category_ids: Array.isArray(d.category_ids)
            ? d.category_ids.map(Number).filter((n) =>Number.isFinite(n) && n > 0)
            : undefined,
          tags: d.tags ? String(d.tags) : undefined,
          slug: d.slug ? String(d.slug) : undefined,
        });
        return result.id
          ? `Post publicado no blog "${blog.name}" → #${result.id} (${result.slug || "sem slug"}).`
          : "Post criado no blog, mas sem ID retornado.";
      }

      case "create_agent": {
        const input = this.toAgentInput(d, undefined);
        const id = await this.store.createAgent(input);
        return `Agente criado → id ${id} ("${input.name}", modelo ${input.model}).`;
      }

      case "update_agent": {
        const agentId = Number(d.agentId);
        const current = await this.store.getAgent(agentId);
        if (!current) throw new Error("Agente da proposta não encontrado.");
        const merged = { ...current, ...this.toAgentInput(d, current) };
        await this.store.updateAgent(agentId, merged);
        return `Agente "${current.name}" atualizado.`;
      }

      case "delete_agent": {
        const agentId = Number(d.agentId);
        const agent = await this.store.getAgent(agentId);
        if (!agent) throw new Error("Agente da proposta não encontrado.");
        await this.store.deleteAgent(agentId);
        return `Agente "${agent.name}" excluído.`;
      }

      case "run_agent": {
        const agentId = Number(d.agentId);
        const agent = await this.store.getAgent(agentId);
        if (!agent) throw new Error("Agente da proposta não encontrado.");
        if (agent.role === "reviewer") {
          throw new Error("Revisores não são executados diretamente — são acionados pelos redatores.");
        }
        const started = await runAgentNow(this.store, this.runner, agentId);
        return started
          ? `Execução do agente "${agent.name}" iniciada em segundo plano.`
          : `O agente "${agent.name}" já está em execução.`;
      }

      case "toggle_agent": {
        const agentId = Number(d.agentId);
        const agent = await this.store.getAgent(agentId);
        if (!agent) throw new Error("Agente da proposta não encontrado.");
        const next = await this.store.toggleAgent(agentId);
        return `Agente "${agent.name}" ${next === "active" ? "ativado" : "pausado"}.`;
      }

      case "delegate_task": {
        const agentId = Number(d.agentId);
        const task = String(d.task ?? "").trim();
        const agent = await this.store.getAgent(agentId);
        if (!agent) throw new Error("Agente da proposta não encontrado.");
        if (!task) throw new Error("Nenhuma tarefa definida para o agente.");
        if (agent.role === "reviewer") {
          throw new Error("Revisores não executam tarefas — são acionados pelos redatores.");
        }
        if (!agent.blogId) {
          throw new Error(`O agente "${agent.name}" não tem um blog de publicação definido.`);
        }
        const blog = await this.store.getBlog(agent.blogId);
        if (!blog) throw new Error("Blog do agente não encontrado.");
        const client = new BlogApiClient(blog.baseUrl, blog.token);
        await runAgentOnce(
          agent,
          this.openrouter,
          this.pexels,
          client,
          this.store,
          "",
          this.settings,
          task,
        );
        return `Tarefa delegada ao agente "${agent.name}": "${task}". O resultado aparecerá no histórico de execuções do painel.`;
      }

      default:
        throw new Error(`Tipo de proposta desconhecido: ${proposal.type}`);
    }
  }

  private toAgentInput(d: Record<string, unknown>, current: Agent | undefined): AgentInput {
    const role = d.role === "reviewer" || d.role === "image_creator" ? d.role : "writer";
    const ratio = d.imageAspectRatio === "16:9" || d.imageAspectRatio === "1:1"
      ? d.imageAspectRatio
      : "9:16";
    return {
      name: String(d.name ?? current?.name ?? "").trim(),
      description: String(d.description ?? current?.description ?? "").trim(),
      model: String(d.model ?? current?.model ?? "").trim(),
      imageModel: String(d.imageModel ?? current?.imageModel ?? "").trim(),
      imageSourceMode: "ai_only",
      toolsEnabled: false,
      role,
      reviewerId: d.reviewerId ? Number(d.reviewerId) : (current?.reviewerId ?? null),
      avatar: String(d.avatar ?? current?.avatar ?? "bot"),
      imageAspectRatio: ratio,
      dailyPostLimit: Math.max(0, Number(d.dailyPostLimit ?? current?.dailyPostLimit ?? 0) || 0),
      blogId: d.blogId ? Number(d.blogId) : (current?.blogId ?? null),
      categoryId: Math.max(1, Number(d.categoryId ?? current?.categoryId ?? 1) || 1),
      publishToBlog: d.publishToBlog === undefined
        ? (current?.publishToBlog ?? true)
        : Boolean(d.publishToBlog),
      pinterestEnabled: d.pinterestEnabled === undefined
        ? (current?.pinterestEnabled ?? false)
        : Boolean(d.pinterestEnabled),
      imageGen: d.imageGen === undefined
        ? (current?.imageGen ?? false)
        : Boolean(d.imageGen),
      scheduleMinutes: Math.max(15, Number(d.scheduleMinutes ?? current?.scheduleMinutes ?? 720) || 720),
      maxTokens: Math.min(65536, Math.max(512, Number(d.maxTokens ?? current?.maxTokens ?? 8192) || 8192)),
      prompt: String(d.prompt ?? current?.prompt ?? "").trim(),
      status: d.status === "paused" ? "paused" : (current?.status ?? "active"),
    };
  }

  async sendMessage(
    conversationId: number,
    text: string,
    model?: string,
  ): Promise<ChatTurnResult> {
    const conv = await this.store.getChatConversation(conversationId);
    if (!conv) throw new Error("Conversa não encontrada.");
    const useModel = (this.settings.get().chatModel || model || conv.model || "").trim();
    if (!useModel) throw new Error("Nenhum modelo configurado. Defina o modelo do chat em Configurações.");
    const apiKey = this.openrouter.getApiKey();
    const hasPool = Boolean(this.openrouter.getAiPool() && this.settings.getAiProviderConfigs().length > 0);
    if (!apiKey && !hasPool) throw new Error("Nenhum provedor de IA configurado. Adicione suas chaves na aba Configurações.");

    const trimmed = text.trim();
    if (!trimmed) throw new Error("Mensagem vazia.");

    const isFirst = (await this.store.listChatMessages(conversationId, { limit: 1 })).length === 0;
    await this.store.addChatMessage(conversationId, "user", trimmed);
    if (isFirst) {
      const title = trimmed.slice(0, 48) + (trimmed.length > 48 ? "…" : "");
      await this.store.updateChatConversation(conversationId, { title });
    }

    const history = await this.store.listChatMessages(conversationId, { limit: 20 });
    const historyBlock = history
      .map((m) => `${m.role === "user" ? "Usuário" : "Agent OS"}: ${m.content}`)
      .join("\n\n");

    const createdProposals: ChatProposal[] = [];
    const proposalCollector = (type: ProposalType, label: string, summary: string, detail: Record<string, unknown>): ChatProposal => {
      const proposal: ChatProposal = {
        id: crypto.randomUUID(),
        type,
        label,
        summary,
        detail,
        createdAt: Date.now(),
      };
      this.proposals.add(proposal);
      createdProposals.push(proposal);
      return proposal;
    };

    let reply = "";
    let tokensIn = 0;
    let tokensOut = 0;
    let cost = 0;
    let usedModel = useModel;

    if (apiKey) {
      try {
        const sdk = new AgentSdkOpenRouter({ apiKey });
        const result = sdk.callModel({
          model: useModel,
          instructions: (ctx) =>
            ctx.numberOfTurns > 1
              ? `${CHAT_SYSTEM_PROMPT}\n\nIMPORTANTE: Você já consultou ferramentas. Agora responda ao usuário resumindo o que encontrou e/ou confirmando que a proposta de ação foi criada para aprovação.`
              : CHAT_SYSTEM_PROMPT,
          input: `Histórico da conversa:\n${historyBlock}\n\nNova mensagem do usuário: ${trimmed}`,
          tools: this.buildTools(proposalCollector) as readonly Tool[],
          temperature: (ctx) => (ctx.numberOfTurns > 1 ? 0.4 : 0.7),
          maxOutputTokens: 4096,
          stopWhen: [stepCountIs(8), maxCost(0.08)],
        });
        const rawText = await result.getText();
        reply = rawText.trim() || (createdProposals.length > 0
          ? "Ação preparada! Revise a proposta acima e clique em Aprovar quando quiser executar."
          : "Concluído.");
        const resp = await result.getResponse().catch(() => null);
        tokensIn = (resp?.usage as { promptTokens?: number } | undefined)?.promptTokens || 0;
        tokensOut = (resp?.usage as { completionTokens?: number } | undefined)?.completionTokens || 0;
        cost = (resp?.usage as { cost?: number } | undefined)?.cost || 0;
      } catch (err) {
        console.warn(`[Chat] Agent SDK falhou, usando fallback direto: ${err}`);
        const completion = await this.openrouter.chat({
          model: useModel,
          system: CHAT_SYSTEM_PROMPT,
          user: `Histórico da conversa:\n${historyBlock}\n\nNova mensagem do usuário: ${trimmed}`,
          maxTokens: 4096,
          temperature: 0.7,
        }, "chat");
        reply = completion.content.trim() || "Concluído.";
        tokensIn = completion.promptTokens;
        tokensOut = completion.completionTokens;
        cost = completion.cost;
        usedModel = completion.model;
      }
    } else {
      const completion = await this.openrouter.chat({
        model: useModel,
        system: CHAT_SYSTEM_PROMPT,
        user: `Histórico da conversa:\n${historyBlock}\n\nNova mensagem do usuário: ${trimmed}`,
        maxTokens: 4096,
        temperature: 0.7,
      }, "chat");
      reply = completion.content.trim() || "Concluído.";
      tokensIn = completion.promptTokens;
      tokensOut = completion.completionTokens;
      cost = completion.cost;
      usedModel = completion.model;
    }

    await this.store.addChatMessage(conversationId, "assistant", reply);
    await this.store.touchChatConversation(conversationId);

    return { reply, model: usedModel, proposals: createdProposals, tokensIn, tokensOut, cost };
  }

  private buildTools(
    addProposal: (type: ProposalType, label: string, summary: string, detail: Record<string, unknown>) =>ChatProposal,
  ): any[] {
    const store = this.store;
    const settings = this.settings;

    const proposalTool = (
      name: string,
      description: string,
      inputSchema: z.ZodObject<any>,
      type: ProposalType,
      label: string,
      makeSummary: (data: Record<string, unknown>) => string,
    ) =>
      tool({
        name,
        description,
        inputSchema,
        outputSchema: z.object({
          ok: z.boolean(),
          proposal_id: z.string().optional(),
          message: z.string(),
          blogs: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
        }),
        nextTurnParams: {
          instructions: (_params, ctx) =>
            `${ctx.instructions ?? ""}\n\n[PROPOSTA]: Uma proposta foi criada e aguarda aprovação do usuário no chat. Informe ao usuário o que será feito e que ele deve clicar em Aprovar.`,
          temperature: () => 0.4,
        },
        execute: async (data: Record<string, unknown>) => {
          const raw = data as Record<string, unknown>;
          if (type === "create_post" && !raw.blogId) {
            const blogs = await store.listBlogs();
            return {
              ok: false,
              message: "Escolha o blog de publicação (campo blogId) ou pergunte ao usuário qual blog usar.",
              blogs: blogs.map((b) => ({ id: b.id, name: b.name })),
            };
          }
          if ((type === "create_agent" || type === "update_agent") && !String(raw.name ?? "").trim()) {
            return { ok: false, message: "O nome do agente é obrigatório." };
          }
          if (type === "create_agent" && !String(raw.model ?? "").trim()) {
            return { ok: false, message: "O modelo OpenRouter do agente é obrigatório." };
          }
          if (type === "delegate_task" && !String(raw.task ?? "").trim()) {
            return { ok: false, message: "Defina a tarefa a ser delegada ao agente (campo task)." };
          }
          const idField = ["delete_agent", "run_agent", "toggle_agent", "update_agent", "delegate_task"].includes(type)
            ? raw.agentId
            : undefined;
          if (idField !== undefined) {
            const agent = await store.getAgent(Number(idField));
            if (!agent) return { ok: false, message: `Agente id ${idField} não existe. Liste os agentes para obter o id correto.` };
          }
          const proposal = addProposal(type, label, makeSummary(raw), raw);
          return {
            ok: true,
            proposal_id: proposal.id,
            message: `Proposta criada (${label}). Aguardando aprovação do usuário.`,
          };
        },
      });

    return [
      tool({
        name: "list_blogs",
        description: "Lista os blogs cadastrados no painel (id e nome). Use para saber em qual blog publicar.",
        inputSchema: z.object({}),
        outputSchema: z.object({
          blogs: z.array(z.object({ id: z.number(), name: z.string(), baseUrl: z.string() })),
        }),
        execute: async () => ({
          blogs: (await store.listBlogs()).map((b) => ({ id: b.id, name: b.name, baseUrl: b.baseUrl })),
        }),
      }),
      tool({
        name: "list_agents",
        description: "Lista os agentes do painel com id, nome, papel, status, modelo, categoria, blog e estatísticas.",
        inputSchema: z.object({}),
        outputSchema: z.object({
          agents: z.array(z.object({
            id: z.number(), name: z.string(), role: z.string(), status: z.string(),
            model: z.string(), categoryId: z.number(), blogId: z.number().nullable(),
            postCount: z.number(), lastRunAt: z.string().nullable(), lastError: z.string().nullable(),
          })),
        }),
        execute: async () => ({
          agents: (await store.listAgents()).map((a) => ({
            id: a.id, name: a.name, role: a.role, status: a.status, model: a.model,
            categoryId: a.categoryId, blogId: a.blogId, postCount: a.postCount,
            lastRunAt: a.lastRunAt, lastError: a.lastError,
          })),
        }),
      }),
      tool({
        name: "get_ranking",
        description: "Retorna o ranking de desempenho dos agentes (visualizações, views 7d, custo, ROI) calculado a partir dos posts reais dos blogs.",
        inputSchema: z.object({}),
        outputSchema: z.object({
          ranking: z.array(z.object({
            rank: z.number(), agentName: z.string(), role: z.string(), totalPosts: z.number(),
            totalViews: z.number(), views7d: z.number(), totalCostUsd: z.number(), roiScore: z.number(),
          })),
        }),
        execute: async () => ({ ranking: await computeRanking(store) }),
      }),
      tool({
        name: "list_posts",
        description: "Lista posts recentes de um blog (id, título, slug, views, capa). Use blogId do list_blogs.",
        inputSchema: z.object({
          blogId: z.number().describe("Id do blog"),
          limit: z.number().default(10).describe("Quantidade de posts (máx 50)"),
        }),
        outputSchema: z.object({
          posts: z.array(z.object({
            id: z.number(), title: z.string(), slug: z.string(), viewCount: z.number(),
            views7d: z.number().optional(), coverImage: z.string().optional(), createdAt: z.string().optional(),
          })),
        }),
        execute: async ({ blogId, limit }) => {
          const blog = await store.getBlog(blogId);
          if (!blog) return { posts: [] };
          try {
            const res = await new BlogApiClient(blog.baseUrl, blog.token)
              .listPosts({ limit: Math.min(50, Math.max(1, limit || 10)) });
            return {
              posts: res.posts.map((p) => ({
                id: p.id, title: p.title, slug: p.slug,
                viewCount: p.view_count || 0, views7d: p.views_7d,
                coverImage: p.cover_image, createdAt: p.created_at,
              })),
            };
          } catch {
            return { posts: [] };
          }
        },
      }),
      tool({
        name: "list_categories",
        description: "Lista as categorias disponíveis de um blog (id e nome).",
        inputSchema: z.object({ blogId: z.number() }),
        outputSchema: z.object({ categories: z.array(z.object({ id: z.number(), name: z.string() })) }),
        execute: async ({ blogId }) => {
          const blog = await store.getBlog(blogId);
          if (!blog) return { categories: [] };
          try {
            const cats = await new BlogApiClient(blog.baseUrl, blog.token).listCategories();
            return { categories: cats.map((c) => ({ id: c.id, name: c.name })) };
          } catch {
            return { categories: [] };
          }
        },
      }),
      tool({
        name: "get_database_metrics",
        description: "Retorna métricas do banco de dados: contagens de tabelas, tokens consumidos, custo total e consumo por agente.",
        inputSchema: z.object({}),
        outputSchema: z.object({ metrics: z.record(z.string(), z.unknown()) }),
        execute: async () => ({ metrics: await store.getDatabaseMetrics() }),
      }),
      tool({
        name: "get_stats",
        description: "Retorna estatísticas gerais do painel: total de agentes, ativos, posts publicados, execuções, taxa de sucesso.",
        inputSchema: z.object({}),
        outputSchema: z.object({ stats: z.record(z.string(), z.unknown()) }),
        execute: async () => ({ stats: await store.getStats() }),
      }),
      tool({
        name: "list_recent_runs",
        description: "Lista as execuções mais recentes dos agentes com status, agente, erro (se houver), tokens e data/hora.",
        inputSchema: z.object({ limit: z.number().default(6).optional() }),
        outputSchema: z.object({
          runs: z.array(z.object({
            id: z.number(), agentId: z.number(), agentName: z.string(), status: z.string(),
            error: z.string().nullable(), tokensTotal: z.number(), costUsd: z.number(),
            startedAt: z.string(),
          })),
        }),
        execute: async ({ limit }) => {
          const agents = await store.listAgents();
          const agentMap = new Map(agents.map((a) => [a.id, a.name]));
          const runs = await store.listRuns(limit || 6);
          return {
            runs: runs.map((r) => ({
              id: r.id,
              agentId: r.agentId,
              agentName: agentMap.get(r.agentId) || `Agente #${r.agentId}`,
              status: r.status,
              error: r.error,
              tokensTotal: r.tokensIn + r.tokensOut,
              costUsd: r.cost,
              startedAt: r.startedAt,
            })),
          };
        },
      }),
      proposalTool(
        "propose_create_post",
        "Cria uma PROPOSTA para publicar um post no blog (sujeita à aprovação do usuário no chat). Preencha blogId (do list_blogs), title, content (HTML), excerpt, category_ids, tags, slug. Se o usuário enviar uma URL de imagem, preencha image_url e pinterest_enabled=true para criar post visual do Pinterest.",
        z.object({
          blogId: z.number().optional(),
          title: z.string(),
          content: z.string(),
          excerpt: z.string().optional(),
          cover_image: z.string().optional(),
          image_url: z.string().optional(),
          published: z.boolean().optional(),
          pinterest_enabled: z.boolean().optional(),
          category_ids: z.array(z.number()).optional(),
          tags: z.string().optional(),
          slug: z.string().optional(),
        }),
        "create_post",
        "Publicar post no blog",
        (d) =>
          `Post "${String(d.title ?? "")}" no blog id ${d.blogId ?? "?"}` +
          (d.image_url ? " (com imagem fornecida pelo usuário)" : "") +
          (d.pinterest_enabled ? " + Pinterest" : ""),
      ),
      proposalTool(
        "propose_create_agent",
        "Cria uma PROPOSTA para cadastrar um novo agente no painel (sujeita à aprovação). Campos: name, description, model (modelo OpenRouter), role (writer|reviewer|image_creator), blogId, categoryId, scheduleMinutes, dailyPostLimit, publishToBlog, pinterestEnabled, imageGen, prompt.",
        z.object({
          name: z.string(),
          description: z.string().optional(),
          model: z.string(),
          role: z.enum(["writer", "reviewer", "image_creator"]).optional(),
          blogId: z.number().optional(),
          categoryId: z.number().optional(),
          scheduleMinutes: z.number().optional(),
          dailyPostLimit: z.number().optional(),
          publishToBlog: z.boolean().optional(),
          pinterestEnabled: z.boolean().optional(),
          imageGen: z.boolean().optional(),
          maxTokens: z.number().optional(),
          prompt: z.string().optional(),
          avatar: z.string().optional(),
        }),
        "create_agent",
        "Criar agente no painel",
        (d) => `Novo agente "${String(d.name ?? "")}" (${String(d.role ?? "writer")}) com modelo ${String(d.model ?? "")}`,
      ),
      proposalTool(
        "propose_update_agent",
        "Cria uma PROPOSTA para editar um agente existente (sujeita à aprovação). Informe agentId e os campos a alterar.",
        z.object({
          agentId: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          model: z.string().optional(),
          role: z.enum(["writer", "reviewer", "image_creator"]).optional(),
          blogId: z.number().optional(),
          categoryId: z.number().optional(),
          scheduleMinutes: z.number().optional(),
          dailyPostLimit: z.number().optional(),
          publishToBlog: z.boolean().optional(),
          pinterestEnabled: z.boolean().optional(),
          imageGen: z.boolean().optional(),
          maxTokens: z.number().optional(),
          prompt: z.string().optional(),
          status: z.enum(["active", "paused"]).optional(),
        }),
        "update_agent",
        "Editar agente",
        (d) => `Editar agente id ${d.agentId}${d.name ? ` (${String(d.name)})` : ""}`,
      ),
      proposalTool(
        "propose_delete_agent",
        "Cria uma PROPOSTA para EXCLUIR um agente existente (sujeita à aprovação). Informe agentId.",
        z.object({ agentId: z.number() }),
        "delete_agent",
        "Excluir agente",
        (d) => `Excluir o agente id ${d.agentId} do painel`,
      ),
      proposalTool(
        "propose_run_agent",
        "Cria uma PROPOSTA para EXECUTAR um agente agora (sujeita à aprovação). Informe agentId.",
        z.object({ agentId: z.number() }),
        "run_agent",
        "Executar agente",
        (d) => `Executar o agente id ${d.agentId} agora`,
      ),
      proposalTool(
        "propose_toggle_agent",
        "Cria uma PROPOSTA para ATIVAR ou PAUSAR um agente (sujeita à aprovação). Informe agentId.",
        z.object({ agentId: z.number() }),
        "toggle_agent",
        "Ativar/pausar agente",
        (d) => `Alternar status do agente id ${d.agentId}`,
      ),
      proposalTool(
        "propose_delegate_task",
        "Cria uma PROPOSTA para DELEGAR uma tarefa a um agente já existente (sujeita à aprovação). O usuário pede algo (ex.: escrever artigo sobre X, criar visual Pinterest sobre Y) e o agente executa com a tarefa indicada. Informe agentId (do list_agents) e task (a tarefa em si, texto livre).",
        z.object({
          agentId: z.number(),
          task: z.string().describe("A tarefa a ser executada pelo agente, em texto livre"),
        }),
        "delegate_task",
        "Delegar tarefa ao agente",
        (d) => `Delegar ao agente id ${d.agentId}: "${String(d.task ?? "").slice(0, 80)}${String(d.task ?? "").length > 80 ? "…" : ""}"`,
      ),
    ];
  }
}

async function computeRanking(store: SqlStore): Promise<RankingEntry[]> {
  const [agents, blogs, metrics] = await Promise.all([
    store.listAgents(),
    store.listBlogs(),
    store.getDatabaseMetrics(),
  ]);
  const costByAgent = new Map(metrics.agentConsumption.map((m) => [m.agentId, m.totalCostUsd]));

  const postsByBlog = new Map<number, Map<number, PostItem>>();
  await Promise.all(
    blogs.map(async (b) => {
      const map = new Map<number, PostItem>();
      try {
        const res = await new BlogApiClient(b.baseUrl, b.token).listPosts({ limit: 100 });
        for (const p of res.posts) map.set(p.id, p);
      } catch {
        // blog indisponível
      }
      postsByBlog.set(b.id, map);
    }),
  );

  const entries: RankingEntry[] = [];
  for (const agent of agents) {
    const runs = await store.listRuns(100, agent.id);
    let totalViews = 0;
    let views7d = 0;
    const seen = new Set<number>();
    for (const r of runs) {
      if (r.status === "success" && r.postId && !seen.has(r.postId)) {
        seen.add(r.postId);
        const post = agent.blogId ? postsByBlog.get(agent.blogId)?.get(r.postId) : undefined;
        if (post) {
          totalViews += post.view_count || 0;
          views7d += post.views_7d || 0;
        }
      }
    }
    const totalCostUsd = costByAgent.get(agent.id) || 0;
    entries.push({
      rank: 0,
      agentName: agent.name,
      role: agent.role,
      totalPosts: agent.postCount,
      totalViews,
      views7d,
      totalCostUsd,
      roiScore: totalCostUsd > 0 ? Math.round(totalViews / totalCostUsd) : totalViews,
    });
  }
  entries.sort((a, b) => b.totalViews - a.totalViews || b.views7d - a.views7d || b.totalPosts - a.totalPosts);
  entries.forEach((e, i) => {
    e.rank = i + 1;
  });
  return entries;
}