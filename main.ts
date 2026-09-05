import process from "node:process";
import { loadConfig, validateConfig } from "./src/config.ts";
import { type SqlStore, TursoStore } from "./src/turso_store.ts";
import { LocalSqliteStore } from "./src/local_store.ts";
import { SettingsService } from "./src/settings.ts";
import { OpenRouterClient } from "./src/openrouter.ts";
import { createHandler, makeRunner } from "./src/server.ts";
import { runDueAgents, startScheduler } from "./src/scheduler.ts";
import { serveNode } from "./src/node_server.ts";
import { ChatService } from "./src/chat.ts";

declare const Deno: {
  cron?: (name: string, schedule: string, cb: () => Promise<void> | void) => void;
  serve?: {
    (handler: (req: Request) => Promise<Response> | Response): void;
    (options: { port?: number; onListen?: () => void }, handler: (req: Request) => Promise<Response> | Response): void;
  };
} | undefined;

const config = loadConfig();

const missing = validateConfig(config);
if (missing.length > 0) {
  const targetLocation = (config.isDenoDeploy || config.isServerless)
    ? "nas variáveis de ambiente do Deno Deploy (Settings → Environment Variables para 'Production' e 'Preview')"
    : "no arquivo .env";
  console.error(
    `Configuração incompleta. Defina ${targetLocation}: ${missing.join(", ")}`,
  );
  process.exit(1);
}

const useTurso = Boolean(config.tursoDbUrl && config.tursoAuthToken);
const store: SqlStore = useTurso
  ? new TursoStore(config.tursoDbUrl, config.tursoAuthToken)
  : new LocalSqliteStore(config.sqlitePath);
try {
  await store.init();
} catch (err) {
  const target = useTurso ? "TURSO_DB_URL e TURSO_AUTH_TOKEN" : config.sqlitePath;
  console.error(`Falha ao conectar no banco. Verifique ${target}.`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
if (!useTurso) console.log(`SQLite local ativo → ${config.sqlitePath}`);

const settings = new SettingsService(store);
try {
  await settings.load();
} catch (err) {
  console.error("Falha ao carregar configurações do painel.");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const oldConfig = await store.getSettings();
if (oldConfig.blog_api_base_url && oldConfig.blog_api_token) {
  const existing = await store.listBlogs();
  if (existing.length === 0) {
    let name = "Blog 1";
    try {
      name = new URL(oldConfig.blog_api_base_url).hostname;
    } catch {
      // mantém o nome padrão
    }
    await store.saveBlog({
      name,
      baseUrl: oldConfig.blog_api_base_url,
      token: oldConfig.blog_api_token,
    });
    console.log(`Blog migrado das configurações antigas → "${name}"`);
  }
  await store.setSettings({
    blog_api_base_url: "",
    blog_api_token: "",
  });
}

import { PexelsClient } from "./src/pexels.ts";
import { AiProviderPool } from "./src/ai_pool.ts";

const aiPool = new AiProviderPool(() => settings.getAiProviderConfigs());
const openrouter = new OpenRouterClient(
  () => [settings.get().openrouterApiKey, settings.get().openrouterBackupKeys || ""].filter(Boolean).join("\n"),
  "Blog Agent OS",
  aiPool,
);
const pexels = new PexelsClient(() => settings.get().pexelsApiKey);
const runner = makeRunner(openrouter, pexels, store, settings);
const chat = new ChatService(store, openrouter, settings, runner);

startScheduler(config.runIntervalMinutes, store, runner, config.isServerless);

// Registra cron nativo no Deno Deploy (visível na aba Crons do painel do Deno Deploy)
if (typeof Deno !== "undefined" && typeof Deno.cron === "function") {
  Deno.cron("Blog Agent OS Auto-Runner", "*/15 * * * *", async () => {
    console.log("[Deno.cron] Disparo de verificação periódica de agentes...");
    await runDueAgents(store, runner, true);
  });
}

const handler = createHandler({ config, store, settings, openrouter, pexels, runner, chat });

const deno = (globalThis as unknown as {
  Deno?: {
    serve?: {
      (handler: (req: Request) => Promise<Response> | Response): void;
      (options: { port?: number; onListen?: () => void }, handler: (req: Request) => Promise<Response> | Response): void;
    };
  };
}).Deno;

if (config.isDenoDeploy) {
  // Deno Deploy gerencia o socket e as requisições nativamente
  if (deno && typeof deno.serve === "function") {
    deno.serve(handler);
    console.log("Blog Agent OS (Deno Deploy) inicializado com sucesso.");
  }
} else if (deno && typeof deno.serve === "function") {
  // Deno local
  deno.serve({ port: config.port }, handler);
  console.log(`Blog Agent OS (Deno local) → http://localhost:${config.port}/admin`);
} else {
  // Node.js local
  serveNode(handler, config.port, () => {
    console.log(`Blog Agent OS (Node local) → http://localhost:${config.port}/admin`);
  });
}

export default {
  fetch: handler,
};
