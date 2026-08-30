import { createClient } from "@libsql/client/web";
import type { Client } from "@libsql/client/web";

export type AgentStatus = "active" | "paused";
export type AgentRole = "writer" | "reviewer" | "image_creator";
export type ImageAspectRatio = "9:16" | "16:9" | "1:1";
export type ImageSourceMode = "ai_only" | "pexels_only" | "hybrid" | "auto_cost";

export interface Blog {
  id: number;
  name: string;
  baseUrl: string;
  token: string;
  createdAt: string;
}

export interface BlogInput {
  name: string;
  baseUrl: string;
  token: string;
}

export interface Agent {
  id: number;
  name: string;
  description: string;
  model: string;
  imageModel: string;
  imageSourceMode: ImageSourceMode;
  toolsEnabled: boolean;
  role: AgentRole;
  reviewerId: number | null;
  avatar: string;
  imageAspectRatio: ImageAspectRatio;
  dailyPostLimit: number;
  blogId: number | null;
  categoryId: number;
  publishToBlog: boolean;
  pinterestEnabled: boolean;
  imageGen: boolean;
  scheduleMinutes: number;
  maxTokens: number;
  prompt: string;
  status: AgentStatus;
  postCount: number;
  lastRunAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface AgentInput {
  name: string;
  description: string;
  model: string;
  imageModel: string;
  imageSourceMode?: ImageSourceMode;
  toolsEnabled?: boolean;
  role: AgentRole;
  reviewerId: number | null;
  avatar: string;
  imageAspectRatio: ImageAspectRatio;
  dailyPostLimit: number;
  blogId: number | null;
  categoryId: number;
  publishToBlog: boolean;
  pinterestEnabled: boolean;
  imageGen: boolean;
  scheduleMinutes: number;
  maxTokens: number;
  prompt: string;
  status: AgentStatus;
}

export type RunStatus = "success" | "error" | "running";

export interface Run {
  id: number;
  agentId: number;
  status: RunStatus;
  model: string;
  postId: number | null;
  postSlug: string | null;
  title: string | null;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface Stats {
  agents: number;
  activeAgents: number;
  totalPosts: number;
  totalRuns: number;
  successRuns: number;
  errorRuns: number;
  lastRunAt: string | null;
}

type Row = Record<string, unknown>;

export interface RunFinishFields {
  status: RunStatus;
  model?: string;
  postId?: number | null;
  postSlug?: string | null;
  title?: string | null;
  tokensIn?: number;
  tokensOut?: number;
  cost?: number;
  error?: string | null;
  finishedAt: string;
}

export interface AgentConsumptionMetric {
  agentId: number;
  agentName: string;
  role: AgentRole;
  model: string;
  runsCount: number;
  tokensIn: number;
  tokensOut: number;
  totalCostUsd: number;
}

export interface DatabaseUsageMetrics {
  driver: "sqlite" | "turso";
  location: string;
  fileSizeBytes?: number;
  tableCounts: {
    agents: number;
    writers: number;
    reviewers: number;
    runs: number;
    blogs: number;
  };
  tokenUsage: {
    totalTokensIn: number;
    totalTokensOut: number;
    totalCostUsd: number;
  };
  agentConsumption: AgentConsumptionMetric[];
}

export interface DailyUsageStats {
  dateIso: string;
  totalPostsToday: number;
  totalRunsToday: number;
  totalCostUsdToday: number;
  agentPostsToday: Record<number, number>;
}

export interface ChatConversation {
  id: number;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ListChatMessagesOptions {
  beforeId?: number;
  limit?: number;
}

export interface SqlStore {
  init(): Promise<void>;
  listBlogs(): Promise<Blog[]>;
  getBlog(id: number): Promise<Blog | null>;
  saveBlog(input: BlogInput): Promise<number>;
  deleteBlog(id: number): Promise<void>;
  listAgents(role?: AgentRole): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | null>;
  createAgent(input: AgentInput): Promise<number>;
  updateAgent(id: number, input: AgentInput): Promise<void>;
  toggleAgent(id: number): Promise<AgentStatus>;
  deleteAgent(id: number): Promise<void>;
  touchLastRun(id: number, iso: string): Promise<void>;
  setLastError(id: number, error: string | null): Promise<void>;
  bumpPostCount(id: number): Promise<void>;
  addRun(agentId: number, startedAt: string): Promise<number>;
  finishRun(id: number, fields: RunFinishFields): Promise<void>;
  listRuns(limit?: number, agentId?: number): Promise<Run[]>;
  getStats(): Promise<Stats>;
  getSettings(): Promise<Record<string, string>>;
  setSettings(settings: Record<string, string>): Promise<void>;
  getDatabaseMetrics(): Promise<DatabaseUsageMetrics>;
  clearOldRuns(keepLatestCount?: number): Promise<number>;
  optimizeDatabase(): Promise<void>;
  getDailyStats(dateIsoPrefix?: string): Promise<DailyUsageStats>;
  listChatConversations(): Promise<ChatConversation[]>;
  getChatConversation(id: number): Promise<ChatConversation | null>;
  createChatConversation(title: string, model: string): Promise<number>;
  updateChatConversation(id: number, fields: { title?: string; model?: string }): Promise<void>;
  touchChatConversation(id: number): Promise<void>;
  deleteChatConversation(id: number): Promise<void>;
  listChatMessages(conversationId: number, opts?: ListChatMessagesOptions): Promise<ChatMessage[]>;
  addChatMessage(conversationId: number, role: "user" | "assistant", content: string): Promise<number>;
}

function num(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  return Number(v ?? 0) || 0;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  return String(v);
}

function bool(v: unknown): boolean {
  return num(v) === 1;
}

function nullableStr(v: unknown): string | null {
  return v === null || v === undefined ? null : str(v);
}

export function toBlog(row: Row): Blog {
  return {
    id: num(row.id),
    name: str(row.name),
    baseUrl: str(row.base_url),
    token: str(row.token),
    createdAt: str(row.created_at),
  };
}

export function toAgent(row: Row): Agent {
  const roleStr = str(row.role);
  const role: AgentRole = roleStr === "reviewer"
    ? "reviewer"
    : roleStr === "image_creator"
    ? "image_creator"
    : "writer";

  const ratioStr = str(row.image_aspect_ratio);
  const imageAspectRatio: ImageAspectRatio = ratioStr === "16:9" || ratioStr === "1:1"
    ? ratioStr
    : "9:16";

  const modeStr = str(row.image_source_mode);
  const imageSourceMode: ImageSourceMode =
    modeStr === "pexels_only" || modeStr === "hybrid" || modeStr === "auto_cost"
      ? modeStr
      : "ai_only";

  return {
    id: num(row.id),
    name: str(row.name),
    description: str(row.description),
    model: str(row.model),
    imageModel: str(row.image_model),
    imageSourceMode,
    toolsEnabled: bool(row.tools_enabled),
    role,
    reviewerId: row.reviewer_id === null || row.reviewer_id === undefined ? null : num(row.reviewer_id),
    avatar: str(row.avatar) || "bot",
    imageAspectRatio,
    dailyPostLimit: num(row.daily_post_limit),
    blogId: row.blog_id === null || row.blog_id === undefined ? null : num(row.blog_id),
    categoryId: num(row.category_id),
    publishToBlog: bool(row.publish_to_blog),
    pinterestEnabled: bool(row.pinterest_enabled),
    imageGen: bool(row.image_gen),
    scheduleMinutes: num(row.schedule_minutes),
    maxTokens: num(row.max_tokens),
    prompt: str(row.prompt),
    status: (str(row.status) === "paused" ? "paused" : "active") as AgentStatus,
    postCount: num(row.post_count),
    lastRunAt: nullableStr(row.last_run_at),
    lastError: nullableStr(row.last_error),
    createdAt: str(row.created_at),
  };
}

export function toRun(row: Row): Run {
  return {
    id: num(row.id),
    agentId: num(row.agent_id),
    status: (str(row.status) === "success" ? "success" : "error") as RunStatus,
    model: str(row.model),
    postId: row.post_id === null ? null : num(row.post_id),
    postSlug: nullableStr(row.post_slug),
    title: nullableStr(row.title),
    tokensIn: num(row.tokens_in),
    tokensOut: num(row.tokens_out),
    cost: num(row.cost),
    error: nullableStr(row.error),
    startedAt: str(row.started_at),
    finishedAt: nullableStr(row.finished_at),
  };
}

export class TursoStore implements SqlStore {
  private client: Client;

  constructor(url: string, authToken: string) {
    this.client = createClient({ url, authToken });
  }

  async init(): Promise<void> {
    await this.client.batch([
      `CREATE TABLE IF NOT EXISTS blogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        base_url TEXT NOT NULL,
        token TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        model TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'writer',
        reviewer_id INTEGER,
        avatar TEXT NOT NULL DEFAULT 'bot',
        image_aspect_ratio TEXT NOT NULL DEFAULT '9:16',
        daily_post_limit INTEGER NOT NULL DEFAULT 0,
        blog_id INTEGER,
        category_id INTEGER NOT NULL DEFAULT 1,
        publish_to_blog INTEGER NOT NULL DEFAULT 1,
        pinterest_enabled INTEGER NOT NULL DEFAULT 0,
        image_gen INTEGER NOT NULL DEFAULT 0,
        schedule_minutes INTEGER NOT NULL DEFAULT 720,
        max_tokens INTEGER NOT NULL DEFAULT 8192,
        prompt TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        post_count INTEGER NOT NULL DEFAULT 0,
        last_run_at TEXT,
        last_error TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        model TEXT NOT NULL DEFAULT '',
        post_id INTEGER,
        post_slug TEXT,
        title TEXT,
        tokens_in INTEGER NOT NULL DEFAULT 0,
        tokens_out INTEGER NOT NULL DEFAULT 0,
        cost REAL NOT NULL DEFAULT 0,
        error TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_runs_agent ON runs(agent_id)`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS chat_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        model TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, id)`,
    ], "write");
    try {
      await this.client.execute(
        `ALTER TABLE agents ADD COLUMN blog_id INTEGER`,
      );
    } catch {
      // coluna já existe
    }
    try {
      await this.client.execute(
        `ALTER TABLE agents ADD COLUMN role TEXT NOT NULL DEFAULT 'writer'`,
      );
    } catch {
      // coluna já existe
    }
    try {
      await this.client.execute(
        `ALTER TABLE agents ADD COLUMN reviewer_id INTEGER`,
      );
    } catch {
      // coluna já existe
    }
    try {
      await this.client.execute(
        `ALTER TABLE agents ADD COLUMN avatar TEXT NOT NULL DEFAULT 'bot'`,
      );
    } catch {
      // coluna já existe
    }
    try {
      await this.client.execute(
        `ALTER TABLE agents ADD COLUMN image_aspect_ratio TEXT DEFAULT '9:16'`,
      );
    } catch {
      // coluna já existe
    }
    try {
      await this.client.execute(
        `ALTER TABLE agents ADD COLUMN daily_post_limit INTEGER DEFAULT 0`,
      );
    } catch {
      // coluna já existe
    }
    try {
      await this.client.execute(
        `ALTER TABLE agents ADD COLUMN image_model TEXT NOT NULL DEFAULT ''`,
      );
    } catch {
      // coluna já existe
    }
    try {
      await this.client.execute(
        `ALTER TABLE agents ADD COLUMN tools_enabled INTEGER NOT NULL DEFAULT 0`,
      );
    } catch {
      // coluna já existe
    }
    try {
      await this.client.execute(
        `ALTER TABLE agents ADD COLUMN image_source_mode TEXT NOT NULL DEFAULT 'ai_only'`,
      );
    } catch {
      // coluna já existe
    }
  }

  async listBlogs(): Promise<Blog[]> {
    const res = await this.client.execute(
      `SELECT * FROM blogs ORDER BY created_at DESC, id DESC`,
    );
    return res.rows.map((row) => toBlog(row as Row));
  }

  async getBlog(id: number): Promise<Blog | null> {
    const res = await this.client.execute({
      sql: `SELECT * FROM blogs WHERE id = ?`,
      args: [id],
    });
    if (res.rows.length === 0) return null;
    return toBlog(res.rows[0] as Row);
  }

  async saveBlog(input: BlogInput): Promise<number> {
    const res = await this.client.execute({
      sql: `INSERT INTO blogs (name, base_url, token, created_at)
        VALUES (?, ?, ?, ?)`,
      args: [
        input.name,
        input.baseUrl,
        input.token,
        new Date().toISOString(),
      ],
    });
    return Number(res.lastInsertRowid);
  }

  async deleteBlog(id: number): Promise<void> {
    await this.client.execute({
      sql: `DELETE FROM blogs WHERE id = ?`,
      args: [id],
    });
  }

  async getSettings(): Promise<Record<string, string>> {
    const res = await this.client.execute(`SELECT key, value FROM settings`);
    const out: Record<string, string> = {};
    for (const row of res.rows) {
      const r = row as Row;
      out[str(r.key)] = str(r.value);
    }
    return out;
  }

  async setSettings(settings: Record<string, string>): Promise<void> {
    const stmts = Object.entries(settings).map(([key, value]) => ({
      sql: `INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [key, value],
    }));
    if (stmts.length === 0) return;
    await this.client.batch(stmts, "write");
  }

  async listAgents(role?: AgentRole): Promise<Agent[]> {
    const res = role
      ? await this.client.execute({
        sql: `SELECT * FROM agents WHERE role = ? ORDER BY created_at DESC`,
        args: [role],
      })
      : await this.client.execute(
        `SELECT * FROM agents ORDER BY created_at DESC`,
      );
    return res.rows.map((row) => toAgent(row as Row));
  }

  async getAgent(id: number): Promise<Agent | null> {
    const res = await this.client.execute({
      sql: `SELECT * FROM agents WHERE id = ?`,
      args: [id],
    });
    if (res.rows.length === 0) return null;
    return toAgent(res.rows[0] as Row);
  }

  async createAgent(input: AgentInput): Promise<number> {
    const res = await this.client.execute({
      sql: `INSERT INTO agents
        (name, description, model, image_model, image_source_mode, tools_enabled, role, reviewer_id, avatar, image_aspect_ratio, daily_post_limit, blog_id, category_id, publish_to_blog, pinterest_enabled,
         image_gen, schedule_minutes, max_tokens, prompt, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        input.name,
        input.description,
        input.model,
        input.imageModel || "",
        input.imageSourceMode || "ai_only",
        input.toolsEnabled ? 1 : 0,
        input.role || "writer",
        input.reviewerId ?? null,
        input.avatar || "bot",
        input.imageAspectRatio || "9:16",
        input.dailyPostLimit || 0,
        input.blogId,
        input.categoryId,
        input.publishToBlog ? 1 : 0,
        input.pinterestEnabled ? 1 : 0,
        input.imageGen ? 1 : 0,
        input.scheduleMinutes,
        input.maxTokens,
        input.prompt,
        input.status,
        new Date().toISOString(),
      ],
    });
    return Number(res.lastInsertRowid);
  }

  async updateAgent(id: number, input: AgentInput): Promise<void> {
    await this.client.execute({
      sql: `UPDATE agents SET
        name = ?, description = ?, model = ?, image_model = ?, image_source_mode = ?, tools_enabled = ?, role = ?, reviewer_id = ?, avatar = ?, image_aspect_ratio = ?, daily_post_limit = ?, blog_id = ?, category_id = ?,
        publish_to_blog = ?, pinterest_enabled = ?, image_gen = ?,
        schedule_minutes = ?, max_tokens = ?, prompt = ?, status = ?
        WHERE id = ?`,
      args: [
        input.name,
        input.description,
        input.model,
        input.imageModel || "",
        input.imageSourceMode || "ai_only",
        input.toolsEnabled ? 1 : 0,
        input.role || "writer",
        input.reviewerId ?? null,
        input.avatar || "bot",
        input.imageAspectRatio || "9:16",
        input.dailyPostLimit || 0,
        input.blogId,
        input.categoryId,
        input.publishToBlog ? 1 : 0,
        input.pinterestEnabled ? 1 : 0,
        input.imageGen ? 1 : 0,
        input.scheduleMinutes,
        input.maxTokens,
        input.prompt,
        input.status,
        id,
      ],
    });
  }

  async toggleAgent(id: number): Promise<AgentStatus> {
    const agent = await this.getAgent(id);
    if (!agent) throw new Error("Agente não encontrado");
    const next: AgentStatus = agent.status === "active" ? "paused" : "active";
    await this.client.execute({
      sql: `UPDATE agents SET status = ? WHERE id = ?`,
      args: [next, id],
    });
    return next;
  }

  async deleteAgent(id: number): Promise<void> {
    await this.client.execute({
      sql: `DELETE FROM runs WHERE agent_id = ?`,
      args: [id],
    });
    await this.client.execute({
      sql: `DELETE FROM agents WHERE id = ?`,
      args: [id],
    });
  }

  async touchLastRun(id: number, iso: string): Promise<void> {
    await this.client.execute({
      sql: `UPDATE agents SET last_run_at = ? WHERE id = ?`,
      args: [iso, id],
    });
  }

  async setLastError(id: number, error: string | null): Promise<void> {
    await this.client.execute({
      sql: `UPDATE agents SET last_error = ? WHERE id = ?`,
      args: [error, id],
    });
  }

  async bumpPostCount(id: number): Promise<void> {
    await this.client.execute({
      sql: `UPDATE agents SET post_count = post_count + 1 WHERE id = ?`,
      args: [id],
    });
  }

  async addRun(agentId: number, startedAt: string): Promise<number> {
    const res = await this.client.execute({
      sql: `INSERT INTO runs (agent_id, status, started_at) VALUES (?, 'running', ?)`,
      args: [agentId, startedAt],
    });
    return Number(res.lastInsertRowid);
  }

  async finishRun(
    id: number,
    fields: RunFinishFields,
  ): Promise<void> {
    await this.client.execute({
      sql: `UPDATE runs SET
        status = ?, model = ?, post_id = ?, post_slug = ?, title = ?,
        tokens_in = ?, tokens_out = ?, cost = ?, error = ?, finished_at = ?
        WHERE id = ?`,
      args: [
        fields.status,
        fields.model ?? "",
        fields.postId ?? null,
        fields.postSlug ?? null,
        fields.title ?? null,
        fields.tokensIn ?? 0,
        fields.tokensOut ?? 0,
        fields.cost ?? 0,
        fields.error ?? null,
        fields.finishedAt,
        id,
      ],
    });
  }

  async listRuns(limit = 20, agentId?: number): Promise<Run[]> {
    const res = agentId
      ? await this.client.execute({
        sql: `SELECT * FROM runs WHERE agent_id = ? ORDER BY id DESC LIMIT ?`,
        args: [agentId, limit],
      })
      : await this.client.execute({
        sql: `SELECT * FROM runs ORDER BY id DESC LIMIT ?`,
        args: [limit],
      });
    return res.rows.map((row) => toRun(row as Row));
  }

  async getStats(): Promise<Stats> {
    const res = await this.client.execute(
      `SELECT
        (SELECT COUNT(*) FROM agents) AS agents,
        (SELECT COUNT(*) FROM agents WHERE status = 'active') AS active_agents,
        (SELECT COALESCE(SUM(post_count), 0) FROM agents) AS total_posts,
        (SELECT COUNT(*) FROM runs) AS total_runs,
        (SELECT COUNT(*) FROM runs WHERE status = 'success') AS success_runs,
        (SELECT COUNT(*) FROM runs WHERE status = 'error') AS error_runs,
        (SELECT MAX(started_at) FROM runs) AS last_run_at`,
    );
    const row = res.rows[0] as Row;
    return {
      agents: num(row.agents),
      activeAgents: num(row.active_agents),
      totalPosts: num(row.total_posts),
      totalRuns: num(row.total_runs),
      successRuns: num(row.success_runs),
      errorRuns: num(row.error_runs),
      lastRunAt: nullableStr(row.last_run_at),
    };
  }

  async getDatabaseMetrics(): Promise<DatabaseUsageMetrics> {
    const countsRes = await this.client.execute(`
      SELECT
        (SELECT COUNT(*) FROM agents) as total_agents,
        (SELECT COUNT(*) FROM agents WHERE role = 'writer' OR role IS NULL) as writers,
        (SELECT COUNT(*) FROM agents WHERE role = 'reviewer') as reviewers,
        (SELECT COUNT(*) FROM runs) as total_runs,
        (SELECT COUNT(*) FROM blogs) as total_blogs,
        (SELECT COALESCE(SUM(tokens_in), 0) FROM runs) as total_tokens_in,
        (SELECT COALESCE(SUM(tokens_out), 0) FROM runs) as total_tokens_out,
        (SELECT COALESCE(SUM(cost), 0) FROM runs) as total_cost
    `);
    const cRow = countsRes.rows[0] as Row;

    const agentRes = await this.client.execute(`
      SELECT
        a.id as agent_id,
        a.name as agent_name,
        a.role,
        a.model,
        COUNT(r.id) as runs_count,
        COALESCE(SUM(r.tokens_in), 0) as tokens_in,
        COALESCE(SUM(r.tokens_out), 0) as tokens_out,
        COALESCE(SUM(r.cost), 0) as total_cost
      FROM agents a
      LEFT JOIN runs r ON r.agent_id = a.id
      GROUP BY a.id
      ORDER BY total_cost DESC, runs_count DESC
    `);

    const agentConsumption: AgentConsumptionMetric[] = agentRes.rows.map((r) => {
      const row = r as Row;
      return {
        agentId: num(row.agent_id),
        agentName: str(row.agent_name),
        role: (str(row.role) === "reviewer" ? "reviewer" : "writer") as AgentRole,
        model: str(row.model),
        runsCount: num(row.runs_count),
        tokensIn: num(row.tokens_in),
        tokensOut: num(row.tokens_out),
        totalCostUsd: num(row.total_cost),
      };
    });

    return {
      driver: "turso",
      location: "Turso Cloud (libsql)",
      tableCounts: {
        agents: num(cRow.total_agents),
        writers: num(cRow.writers),
        reviewers: num(cRow.reviewers),
        runs: num(cRow.total_runs),
        blogs: num(cRow.total_blogs),
      },
      tokenUsage: {
        totalTokensIn: num(cRow.total_tokens_in),
        totalTokensOut: num(cRow.total_tokens_out),
        totalCostUsd: num(cRow.total_cost),
      },
      agentConsumption,
    };
  }

  async clearOldRuns(keepLatestCount = 50): Promise<number> {
    const countRes = await this.client.execute(`SELECT COUNT(*) as count FROM runs`);
    const total = num((countRes.rows[0] as Row).count);
    if (total <= keepLatestCount) return 0;
    const toDelete = total - keepLatestCount;
    await this.client.execute({
      sql: `DELETE FROM runs WHERE id NOT IN (
        SELECT id FROM runs ORDER BY id DESC LIMIT ?
      )`,
      args: [keepLatestCount],
    });
    return toDelete;
  }

  async optimizeDatabase(): Promise<void> {
    // Turso gerencia otimizações automaticamente
  }

  async getDailyStats(dateIsoPrefix?: string): Promise<DailyUsageStats> {
    const prefix = (dateIsoPrefix || new Date().toISOString().slice(0, 10)) + "%";
    const totalRes = await this.client.execute({
      sql: `SELECT
        COUNT(*) as total_runs,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(SUM(CASE WHEN post_id IS NOT NULL THEN 1 ELSE 0 END), 0) as total_posts
      FROM runs WHERE started_at LIKE ?`,
      args: [prefix],
    });
    const agentRes = await this.client.execute({
      sql: `SELECT
        agent_id,
        COALESCE(SUM(CASE WHEN post_id IS NOT NULL THEN 1 ELSE 0 END), 0) as posts_count
      FROM runs WHERE started_at LIKE ?
      GROUP BY agent_id`,
      args: [prefix],
    });
    const tRow = (totalRes.rows[0] ?? {}) as Row;
    const agentPostsToday: Record<number, number> = {};
    for (const r of agentRes.rows as Row[]) {
      agentPostsToday[num(r.agent_id)] = num(r.posts_count);
    }
    return {
      dateIso: dateIsoPrefix || new Date().toISOString().slice(0, 10),
      totalPostsToday: num(tRow.total_posts),
      totalRunsToday: num(tRow.total_runs),
      totalCostUsdToday: num(tRow.total_cost),
      agentPostsToday,
    };
  }

  toChatConversation(row: Row): ChatConversation {
    return {
      id: num(row.id),
      title: str(row.title),
      model: str(row.model),
      createdAt: str(row.created_at),
      updatedAt: str(row.updated_at),
    };
  }

  toChatMessage(row: Row): ChatMessage {
    return {
      id: num(row.id),
      conversationId: num(row.conversation_id),
      role: str(row.role) === "assistant" ? "assistant" : "user",
      content: str(row.content),
      createdAt: str(row.created_at),
    };
  }

  async listChatConversations(): Promise<ChatConversation[]> {
    const res = await this.client.execute(
      `SELECT * FROM chat_conversations ORDER BY updated_at DESC, id DESC`,
    );
    return res.rows.map((row) => this.toChatConversation(row as Row));
  }

  async getChatConversation(id: number): Promise<ChatConversation | null> {
    const res = await this.client.execute({
      sql: `SELECT * FROM chat_conversations WHERE id = ?`,
      args: [id],
    });
    if (res.rows.length === 0) return null;
    return this.toChatConversation(res.rows[0] as Row);
  }

  async createChatConversation(title: string, model: string): Promise<number> {
    const now = new Date().toISOString();
    const res = await this.client.execute({
      sql: `INSERT INTO chat_conversations (title, model, created_at, updated_at)
        VALUES (?, ?, ?, ?)`,
      args: [title, model, now, now],
    });
    return Number(res.lastInsertRowid);
  }

  async updateChatConversation(
    id: number,
    fields: { title?: string; model?: string },
  ): Promise<void> {
    if (fields.title !== undefined) {
      await this.client.execute({
        sql: `UPDATE chat_conversations SET title = ? WHERE id = ?`,
        args: [fields.title, id],
      });
    }
    if (fields.model !== undefined) {
      await this.client.execute({
        sql: `UPDATE chat_conversations SET model = ? WHERE id = ?`,
        args: [fields.model, id],
      });
    }
  }

  async touchChatConversation(id: number): Promise<void> {
    await this.client.execute({
      sql: `UPDATE chat_conversations SET updated_at = ? WHERE id = ?`,
      args: [new Date().toISOString(), id],
    });
  }

  async deleteChatConversation(id: number): Promise<void> {
    await this.client.execute({
      sql: `DELETE FROM chat_messages WHERE conversation_id = ?`,
      args: [id],
    });
    await this.client.execute({
      sql: `DELETE FROM chat_conversations WHERE id = ?`,
      args: [id],
    });
  }

  async listChatMessages(
    conversationId: number,
    opts: ListChatMessagesOptions = {},
  ): Promise<ChatMessage[]> {
    const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
    const res = opts.beforeId
      ? await this.client.execute({
        sql: `SELECT * FROM chat_messages WHERE conversation_id = ? AND id < ?
          ORDER BY id DESC LIMIT ?`,
        args: [conversationId, opts.beforeId, limit],
      })
      : await this.client.execute({
        sql: `SELECT * FROM chat_messages WHERE conversation_id = ?
          ORDER BY id DESC LIMIT ?`,
        args: [conversationId, limit],
      });
    return res.rows
      .map((row) => this.toChatMessage(row as Row))
      .reverse();
  }

  async addChatMessage(
    conversationId: number,
    role: "user" | "assistant",
    content: string,
  ): Promise<number> {
    const res = await this.client.execute({
      sql: `INSERT INTO chat_messages (conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?)`,
      args: [conversationId, role, content, new Date().toISOString()],
    });
    return Number(res.lastInsertRowid);
  }
}
