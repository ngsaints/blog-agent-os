import { test } from "node:test";
import assert from "node:assert/strict";
import { systemLogger, createRunLogger } from "../src/logger.ts";
import { LocalSqliteStore } from "../src/local_store.ts";
import type { AgentInput } from "../src/turso_store.ts";

const TEST_AGENT: AgentInput = {
  name: "Agente Log Teste",
  description: "Teste de Logs",
  model: "openai/gpt-4o-mini",
  imageModel: "black-forest-labs/flux-1-schnell",
  toolsEnabled: false,
  role: "writer",
  reviewerId: null,
  avatar: "bot",
  imageAspectRatio: "9:16",
  dailyPostLimit: 0,
  blogId: null,
  categoryId: 1,
  publishToBlog: true,
  pinterestEnabled: false,
  imageGen: true,
  scheduleMinutes: 60,
  maxTokens: 2000,
  prompt: "Prompt teste",
  status: "active",
};

test("systemLogger: registros, filtros e limpeza", () => {
  systemLogger.clear();
  assert.equal(systemLogger.getEntries().length, 0);

  systemLogger.info("Servidor", "Sistema iniciado");
  systemLogger.warn("OpenRouter", "Alerta de limite de taxa", undefined, { agentId: 42 });
  systemLogger.error("BlogAPI", "Falha crítica ao conectar no blog", "Status 401: Unauthorized", { agentId: 42, runId: 101 });
  systemLogger.success("Agente", "Post publicado com sucesso", undefined, { agentId: 99, runId: 102 });

  const all = systemLogger.getEntries();
  assert.equal(all.length, 4);

  // Filtro por nível
  const errorsOnly = systemLogger.getEntries({ level: "error" });
  assert.equal(errorsOnly.length, 1);
  assert.equal(errorsOnly[0].message, "Falha crítica ao conectar no blog");
  assert.equal(errorsOnly[0].details, "Status 401: Unauthorized");
  assert.equal(errorsOnly[0].runId, 101);

  // Filtro por agentId
  const agent42Logs = systemLogger.getEntries({ agentId: 42 });
  assert.equal(agent42Logs.length, 2);

  // Filtro por busca textual
  const searchResults = systemLogger.getEntries({ search: "Unauthorized" });
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].runId, 101);

  // Limpar histórico
  systemLogger.clear();
  assert.equal(systemLogger.getEntries().length, 0);
});

test("createRunLogger: constrói log estruturado de execução e transmite ao sistema", () => {
  systemLogger.clear();
  const runLog = createRunLogger(555, "Agente Criativo", 12);

  runLog.step("Iniciando geração de conteúdo...");
  runLog.info("Artigo gerado pela IA", "Tokens: 1200 | Custo: $0.0024");
  runLog.warn("Aviso de imagem não encontrada, usando fallback");
  runLog.error("Erro no upload para WordPress", "Timeout de rede 504 Gateway");

  const builtLogs = runLog.build();
  assert.ok(builtLogs.includes("Iniciando geração de conteúdo..."));
  assert.ok(builtLogs.includes("Tokens: 1200 | Custo: $0.0024"));
  assert.ok(builtLogs.includes("Aviso de imagem não encontrada"));
  assert.ok(builtLogs.includes("Timeout de rede 504 Gateway"));

  // Verifica que o systemLogger também recebeu as entradas em tempo real
  const entries = systemLogger.getEntries({ runId: 555 });
  assert.ok(entries.length >= 4);
  assert.ok(entries[0].source.includes("Agente Criativo"));
});

test("SqlStore: persistência e recuperação de logs da execução (getRun)", async () => {
  const store = new LocalSqliteStore(":memory:");
  await store.init();

  const agentId = await store.createAgent(TEST_AGENT);
  const nowIso = new Date().toISOString();
  const runId = await store.addRun(agentId, nowIso);

  // Verifica getRun durante status running
  const runningRun = await store.getRun(runId);
  assert.ok(runningRun);
  assert.equal(runningRun.id, runId);
  assert.equal(runningRun.status, "running");
  assert.equal(runningRun.logs, null);

  const sampleLog = "[22:00:00] [STEP] Iniciando execução\n[22:00:05] [SUCCESS] Publicado com sucesso";

  await store.finishRun(runId, {
    status: "success",
    model: "openai/gpt-4o-mini",
    postId: 777,
    postSlug: "post-teste-sucesso",
    tokensIn: 300,
    tokensOut: 500,
    cost: 0.0015,
    title: "Post de Teste",
    logs: sampleLog,
    finishedAt: new Date().toISOString(),
  });

  // Recupera via getRun
  const finishedRun = await store.getRun(runId);
  assert.ok(finishedRun);
  assert.equal(finishedRun.status, "success");
  assert.equal(finishedRun.postId, 777);
  assert.equal(finishedRun.logs, sampleLog);

  // Recupera via listRuns
  const runs = await store.listRuns(10);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].id, runId);
  assert.equal(runs[0].logs, sampleLog);
});
