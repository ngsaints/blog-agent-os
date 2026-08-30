import { DatabaseSync } from "node:sqlite";
import { mkdirSync, statSync } from "node:fs";
import {
  type Agent,
  type AgentConsumptionMetric,
  type AgentInput,
  type AgentRole,
  type AgentStatus,
  type Blog,
  type BlogInput,
  type DatabaseUsageMetrics,
  type DailyUsageStats,
  type ImageAspectRatio,
  type ChatConversation,
  type ChatMessage,
  type ListChatMessagesOptions,
  type Run,
  type RunFinishFields,
  type SqlStore,
  type Stats,
  toAgent,
  toBlog,
  toRun,
} from "./turso_store.ts";

type Row = Record<string, unknown>;

function num(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  return Number(v ?? 0) || 0;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function nullableStr(v: unknown): string | null {
  return v === null || v === undefined ? null : str(v);
}

const AGENTS_COLUMNS =
  "(name, description, model, image_model, image_source_mode, tools_enabled, role, reviewer_id, avatar, image_aspect_ratio, daily_post_limit, blog_id, category_id, publish_to_blog, pinterest_enabled, image_gen, schedule_minutes, max_tokens, prompt, status, created_at)";

function agentArgs(input: AgentInput): (string | number | null)[] {
  return [
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
  ];
}

export class LocalSqliteStore implements SqlStore {
  private db: DatabaseSync;
  private filePath: string;

  constructor(path = ":memory:") {
    this.filePath = path;
    if (path !== ":memory:") {
      const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
      if (slash > 0) mkdirSync(path.slice(0, slash), { recursive: true });
    }
    this.db = new DatabaseSync(path);
  }

  async init(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS blogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        base_url TEXT NOT NULL,
        token TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS agents (
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
      );
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'running',
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
      );
      CREATE INDEX IF NOT EXISTS idx_runs_agent ON runs(agent_id);
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        model TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, id);
    `);
    try {
      this.db.prepare("UPDATE runs SET status = 'error', error = 'Execução interrompida por reinício' WHERE status = 'running'").run();
    } catch {
      // ignore
    }
    try {
      this.db.exec(`ALTER TABLE agents ADD COLUMN blog_id INTEGER`);
    } catch {
      // coluna já existe
    }
    try {
      this.db.exec(`ALTER TABLE agents ADD COLUMN role TEXT NOT NULL DEFAULT 'writer'`);
    } catch {
      // coluna já existe
    }
    try {
      this.db.exec(`ALTER TABLE agents ADD COLUMN reviewer_id INTEGER`);
    } catch {
      // coluna já existe
    }
    try {
      this.db.exec(`ALTER TABLE agents ADD COLUMN avatar TEXT NOT NULL DEFAULT 'bot'`);
    } catch {
      // coluna já existe
    }
    try {
      this.db.exec(`ALTER TABLE agents ADD COLUMN image_aspect_ratio TEXT DEFAULT '9:16'`);
    } catch {
      // coluna já existe
    }
    try {
      this.db.exec(`ALTER TABLE agents ADD COLUMN daily_post_limit INTEGER DEFAULT 0`);
    } catch {
      // coluna já existe
    }
    try {
      this.db.exec(`ALTER TABLE agents ADD COLUMN image_model TEXT NOT NULL DEFAULT ''`);
    } catch {
      // coluna já existe
    }
    try {
      this.db.exec(`ALTER TABLE agents ADD COLUMN tools_enabled INTEGER NOT NULL DEFAULT 0`);
    } catch {
      // coluna já existe
    }
    try {
      this.db.exec(`ALTER TABLE agents ADD COLUMN image_source_mode TEXT NOT NULL DEFAULT 'ai_only'`);
    } catch {
      // coluna já existe
    }
  }

  async listBlogs(): Promise<Blog[]> {
    return this.db.prepare(
      `SELECT * FROM blogs ORDER BY created_at DESC, id DESC`,
    ).all().map((r) => toBlog(r as Row));
  }

  async getBlog(id: number): Promise<Blog | null> {
    const row = this.db.prepare(`SELECT * FROM blogs WHERE id = ?`).get(id);
    return row ? toBlog(row as Row) : null;
  }

  async saveBlog(input: BlogInput): Promise<number> {
    const res = this.db.prepare(
      `INSERT INTO blogs (name, base_url, token, created_at) VALUES (?, ?, ?, ?)`,
    ).run(input.name, input.baseUrl, input.token, new Date().toISOString());
    return num(res.lastInsertRowid);
  }

  async deleteBlog(id: number): Promise<void> {
    this.db.prepare(`DELETE FROM blogs WHERE id = ?`).run(id);
  }

  async listAgents(role?: AgentRole): Promise<Agent[]> {
    const sql = role
      ? `SELECT * FROM agents WHERE role = ? ORDER BY created_at DESC`
      : `SELECT * FROM agents ORDER BY created_at DESC`;
    const rows = role
      ? this.db.prepare(sql).all(role)
      : this.db.prepare(sql).all();
    return rows.map((r) => toAgent(r as Row));
  }

  async getAgent(id: number): Promise<Agent | null> {
    const row = this.db.prepare(`SELECT * FROM agents WHERE id = ?`).get(id);
    return row ? toAgent(row as Row) : null;
  }

  async createAgent(input: AgentInput): Promise<number> {
    const res = this.db.prepare(
      `INSERT INTO agents ${AGENTS_COLUMNS} VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...agentArgs(input));
    return num(res.lastInsertRowid);
  }

  async updateAgent(id: number, input: AgentInput): Promise<void> {
    this.db.prepare(
      `UPDATE agents SET
        name = ?, description = ?, model = ?, image_model = ?, image_source_mode = ?, tools_enabled = ?, role = ?, reviewer_id = ?, avatar = ?, image_aspect_ratio = ?, daily_post_limit = ?, blog_id = ?, category_id = ?,
        publish_to_blog = ?, pinterest_enabled = ?, image_gen = ?,
        schedule_minutes = ?, max_tokens = ?, prompt = ?, status = ?
        WHERE id = ?`,
    ).run(
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
    );
  }

  async toggleAgent(id: number): Promise<AgentStatus> {
    const agent = await this.getAgent(id);
    if (!agent) throw new Error("Agente não encontrado");
    const next: AgentStatus = agent.status === "active" ? "paused" : "active";
    this.db.prepare(`UPDATE agents SET status = ? WHERE id = ?`).run(next, id);
    return next;
  }

  async deleteAgent(id: number): Promise<void> {
    this.db.prepare(`DELETE FROM runs WHERE agent_id = ?`).run(id);
    this.db.prepare(`DELETE FROM agents WHERE id = ?`).run(id);
  }

  async touchLastRun(id: number, iso: string): Promise<void> {
    this.db.prepare(`UPDATE agents SET last_run_at = ? WHERE id = ?`).run(iso, id);
  }

  async setLastError(id: number, error: string | null): Promise<void> {
    this.db.prepare(`UPDATE agents SET last_error = ? WHERE id = ?`).run(error, id);
  }

  async bumpPostCount(id: number): Promise<void> {
    this.db.prepare(`UPDATE agents SET post_count = post_count + 1 WHERE id = ?`)
      .run(id);
  }

  async addRun(agentId: number, startedAt: string): Promise<number> {
    const res = this.db.prepare(
      `INSERT INTO runs (agent_id, status, started_at) VALUES (?, 'running', ?)`,
    ).run(agentId, startedAt);
    return num(res.lastInsertRowid);
  }

  async finishRun(id: number, fields: RunFinishFields): Promise<void> {
    this.db.prepare(
      `UPDATE runs SET
        status = ?, model = ?, post_id = ?, post_slug = ?, title = ?,
        tokens_in = ?, tokens_out = ?, cost = ?, error = ?, finished_at = ?
        WHERE id = ?`,
    ).run(
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
    );
  }

  async listRuns(limit = 20, agentId?: number): Promise<Run[]> {
    const sql = agentId
      ? `SELECT * FROM runs WHERE agent_id = ? ORDER BY id DESC LIMIT ?`
      : `SELECT * FROM runs ORDER BY id DESC LIMIT ?`;
    const rows = agentId
      ? this.db.prepare(sql).all(agentId, limit)
      : this.db.prepare(sql).all(limit);
    return rows.map((r) => toRun(r as Row));
  }

  async getStats(): Promise<Stats> {
    const row = this.db.prepare(
      `SELECT
        (SELECT COUNT(*) FROM agents) AS agents,
        (SELECT COUNT(*) FROM agents WHERE status = 'active') AS active_agents,
        (SELECT COALESCE(SUM(post_count), 0) FROM agents) AS total_posts,
        (SELECT COUNT(*) FROM runs) AS total_runs,
        (SELECT COUNT(*) FROM runs WHERE status = 'success') AS success_runs,
        (SELECT COUNT(*) FROM runs WHERE status = 'error') AS error_runs,
        (SELECT MAX(started_at) FROM runs) AS last_run_at`,
    ).get() as Row;
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

  async getSettings(): Promise<Record<string, string>> {
    const rows = this.db.prepare(`SELECT key, value FROM settings`).all();
    const out: Record<string, string> = {};
    for (const r of rows as Row[]) out[str(r.key)] = str(r.value);
    return out;
  }

  async setSettings(settings: Record<string, string>): Promise<void> {
    const upsert = this.db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    );
    for (const [key, value] of Object.entries(settings)) upsert.run(key, value);
  }

  async getDatabaseMetrics(): Promise<DatabaseUsageMetrics> {
    let fileSizeBytes: number | undefined;
    if (this.filePath !== ":memory:") {
      try {
        fileSizeBytes = statSync(this.filePath).size;
      } catch {
        // arquivo pode não existir ainda em disco
      }
    }

    const cRow = this.db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM agents) as total_agents,
        (SELECT COUNT(*) FROM agents WHERE role = 'writer' OR role IS NULL) as writers,
        (SELECT COUNT(*) FROM agents WHERE role = 'reviewer') as reviewers,
        (SELECT COUNT(*) FROM runs) as total_runs,
        (SELECT COUNT(*) FROM blogs) as total_blogs,
        (SELECT COALESCE(SUM(tokens_in), 0) FROM runs) as total_tokens_in,
        (SELECT COALESCE(SUM(tokens_out), 0) FROM runs) as total_tokens_out,
        (SELECT COALESCE(SUM(cost), 0) FROM runs) as total_cost
    `).get() as Row;

    const agentRows = this.db.prepare(`
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
    `).all() as Row[];

    const agentConsumption: AgentConsumptionMetric[] = agentRows.map((row) => ({
      agentId: num(row.agent_id),
      agentName: str(row.agent_name),
      role: (str(row.role) === "reviewer" ? "reviewer" : "writer") as AgentRole,
      model: str(row.model),
      runsCount: num(row.runs_count),
      tokensIn: num(row.tokens_in),
      tokensOut: num(row.tokens_out),
      totalCostUsd: num(row.total_cost),
    }));

    return {
      driver: "sqlite",
      location: this.filePath,
      fileSizeBytes,
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
    const countRow = this.db.prepare(`SELECT COUNT(*) as count FROM runs`).get() as Row;
    const total = num(countRow.count);
    if (total <= keepLatestCount) return 0;
    const toDelete = total - keepLatestCount;
    this.db.prepare(`
      DELETE FROM runs WHERE id NOT IN (
        SELECT id FROM runs ORDER BY id DESC LIMIT ?
      )
    `).run(keepLatestCount);
    return toDelete;
  }

  async optimizeDatabase(): Promise<void> {
    this.db.exec("VACUUM;");
  }

  async getDailyStats(dateIsoPrefix?: string): Promise<DailyUsageStats> {
    const prefix = (dateIsoPrefix || new Date().toISOString().slice(0, 10)) + "%";
    const tRow = this.db.prepare(`
      SELECT
        COUNT(*) as total_runs,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(SUM(CASE WHEN post_id IS NOT NULL THEN 1 ELSE 0 END), 0) as total_posts
      FROM runs WHERE started_at LIKE ?
    `).get(prefix) as Row;

    const agentRows = this.db.prepare(`
      SELECT
        agent_id,
        COALESCE(SUM(CASE WHEN post_id IS NOT NULL THEN 1 ELSE 0 END), 0) as posts_count
      FROM runs WHERE started_at LIKE ?
      GROUP BY agent_id
    `).all(prefix) as Row[];

    const agentPostsToday: Record<number, number> = {};
    for (const r of agentRows) {
      agentPostsToday[num(r.agent_id)] = num(r.posts_count);
    }

    return {
      dateIso: dateIsoPrefix || new Date().toISOString().slice(0, 10),
      totalPostsToday: num(tRow?.total_posts),
      totalRunsToday: num(tRow?.total_runs),
      totalCostUsdToday: num(tRow?.total_cost),
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
    const rows = this.db.prepare(
      `SELECT * FROM chat_conversations ORDER BY updated_at DESC, id DESC`,
    ).all();
    return rows.map((r) => this.toChatConversation(r as Row));
  }

  async getChatConversation(id: number): Promise<ChatConversation | null> {
    const row = this.db.prepare(
      `SELECT * FROM chat_conversations WHERE id = ?`,
    ).get(id);
    return row ? this.toChatConversation(row as Row) : null;
  }

  async createChatConversation(title: string, model: string): Promise<number> {
    const now = new Date().toISOString();
    const res = this.db.prepare(
      `INSERT INTO chat_conversations (title, model, created_at, updated_at)
        VALUES (?, ?, ?, ?)`,
    ).run(title, model, now, now);
    return num(res.lastInsertRowid);
  }

  async updateChatConversation(
    id: number,
    fields: { title?: string; model?: string },
  ): Promise<void> {
    if (fields.title !== undefined) {
      this.db.prepare(`UPDATE chat_conversations SET title = ? WHERE id = ?`)
        .run(fields.title, id);
    }
    if (fields.model !== undefined) {
      this.db.prepare(`UPDATE chat_conversations SET model = ? WHERE id = ?`)
        .run(fields.model, id);
    }
  }

  async touchChatConversation(id: number): Promise<void> {
    this.db.prepare(`UPDATE chat_conversations SET updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), id);
  }

  async deleteChatConversation(id: number): Promise<void> {
    this.db.prepare(`DELETE FROM chat_messages WHERE conversation_id = ?`).run(id);
    this.db.prepare(`DELETE FROM chat_conversations WHERE id = ?`).run(id);
  }

  async listChatMessages(
    conversationId: number,
    opts: ListChatMessagesOptions = {},
  ): Promise<ChatMessage[]> {
    const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
    const rows = opts.beforeId
      ? this.db.prepare(
        `SELECT * FROM chat_messages WHERE conversation_id = ? AND id < ?
          ORDER BY id DESC LIMIT ?`,
      ).all(conversationId, opts.beforeId, limit)
      : this.db.prepare(
        `SELECT * FROM chat_messages WHERE conversation_id = ?
          ORDER BY id DESC LIMIT ?`,
      ).all(conversationId, limit);
    return (rows as Row[]).map((r) => this.toChatMessage(r)).reverse();
  }

  async addChatMessage(
    conversationId: number,
    role: "user" | "assistant",
    content: string,
  ): Promise<number> {
    const res = this.db.prepare(
      `INSERT INTO chat_messages (conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?)`,
    ).run(conversationId, role, content, new Date().toISOString());
    return num(res.lastInsertRowid);
  }
}
