import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalSqliteStore } from "../src/local_store.ts";
import type { AgentInput } from "../src/turso_store.ts";

const INPUT: AgentInput = {
  name: "Agente Local",
  description: "Teste",
  model: "test/model",
  imageModel: "black-forest-labs/flux-1-schnell",
  toolsEnabled: false,
  role: "writer",
  reviewerId: null,
  avatar: "bot",
  imageAspectRatio: "9:16",
  dailyPostLimit: 0,
  blogId: null,
  categoryId: 2,
  publishToBlog: true,
  pinterestEnabled: false,
  imageGen: true,
  scheduleMinutes: 120,
  maxTokens: 4096,
  prompt: "Tema teste",
  status: "active",
};

function newStore(): LocalSqliteStore {
  return new LocalSqliteStore(":memory:");
}

test("local sqlite: blogs CRUD", async () => {
  const store = newStore();
  await store.init();
  const id = await store.saveBlog({
    name: "Blog Teste",
    baseUrl: "https://exemplo.com/api/cli",
    token: "tok",
  });
  const blogs = await store.listBlogs();
  assert.equal(blogs.length, 1);
  assert.equal(blogs[0].id, id);
  assert.equal(blogs[0].name, "Blog Teste");
  const got = await store.getBlog(id);
  assert.equal(got?.baseUrl, "https://exemplo.com/api/cli");
  await store.deleteBlog(id);
  assert.equal((await store.listBlogs()).length, 0);
});

test("local sqlite: agente com blog_id é persistido", async () => {
  const store = newStore();
  await store.init();
  const blogId = await store.saveBlog({
    name: "Blog",
    baseUrl: "https://exemplo.com/api/cli",
    token: "tok",
  });
  const id = await store.createAgent({ ...INPUT, blogId });
  assert.equal((await store.getAgent(id))?.blogId, blogId);
});

test("local sqlite: cria e lista agente", async () => {
  const store = newStore();
  await store.init();
  const id = await store.createAgent(INPUT);
  const agents = await store.listAgents();
  assert.equal(agents.length, 1);
  assert.equal(agents[0].id, id);
  assert.equal(agents[0].name, "Agente Local");
  assert.equal(agents[0].categoryId, 2);
  assert.equal(agents[0].imageGen, true);
  assert.equal(agents[0].maxTokens, 4096);
});

test("local sqlite: atualiza e alterna status", async () => {
  const store = newStore();
  await store.init();
  const id = await store.createAgent(INPUT);
  await store.updateAgent(id, { ...INPUT, name: "Renomeado" });
  assert.equal((await store.getAgent(id))?.name, "Renomeado");
  const next = await store.toggleAgent(id);
  assert.equal(next, "paused");
  assert.equal((await store.getAgent(id))?.status, "paused");
});

test("local sqlite: execução e estatísticas", async () => {
  const store = newStore();
  await store.init();
  const id = await store.createAgent(INPUT);
  const runId = await store.addRun(id, new Date().toISOString());
  await store.finishRun(runId, {
    status: "success",
    model: "test/model",
    postId: 42,
    postSlug: "slug-test",
    title: "Título",
    tokensIn: 100,
    tokensOut: 200,
    cost: 0.01,
    finishedAt: new Date().toISOString(),
  });
  await store.bumpPostCount(id);
  const runs = await store.listRuns();
  assert.equal(runs.length, 1);
  assert.equal(runs[0].postId, 42);
  assert.equal(runs[0].cost, 0.01);
  const stats = await store.getStats();
  assert.equal(stats.totalRuns, 1);
  assert.equal(stats.successRuns, 1);
  assert.equal(stats.totalPosts, 1);
});

test("local sqlite: role e reviewer_id sao persistidos", async () => {
  const store = newStore();
  await store.init();
  const reviewerId = await store.createAgent({
    ...INPUT,
    name: "Editor Chefe",
    role: "reviewer",
    blogId: null,
  });
  const writerId = await store.createAgent({
    ...INPUT,
    name: "Redator IA",
    role: "writer",
    reviewerId,
  });

  const reviewer = await store.getAgent(reviewerId);
  assert.equal(reviewer?.role, "reviewer");

  const writer = await store.getAgent(writerId);
  assert.equal(writer?.role, "writer");
  assert.equal(writer?.reviewerId, reviewerId);

  const writersList = await store.listAgents("writer");
  assert.equal(writersList.length, 1);
  assert.equal(writersList[0].id, writerId);

  const reviewersList = await store.listAgents("reviewer");
  assert.equal(reviewersList.length, 1);
  assert.equal(reviewersList[0].id, reviewerId);
});

test("local sqlite: database metrics e clear runs", async () => {
  const store = newStore();
  await store.init();
  const agentId = await store.createAgent({ ...INPUT, role: "writer" });

  // Adicionar 5 runs
  for (let i = 1; i <= 5; i++) {
    const rId = await store.addRun(agentId, new Date().toISOString());
    await store.finishRun(rId, {
      status: "success",
      tokensIn: 100,
      tokensOut: 200,
      cost: 0.005,
      finishedAt: new Date().toISOString(),
    });
  }

  const metrics = await store.getDatabaseMetrics();
  assert.equal(metrics.driver, "sqlite");
  assert.equal(metrics.tableCounts.agents, 1);
  assert.equal(metrics.tableCounts.writers, 1);
  assert.equal(metrics.tableCounts.reviewers, 0);
  assert.equal(metrics.tableCounts.runs, 5);
  assert.equal(metrics.tokenUsage.totalTokensIn, 500);
  assert.equal(metrics.tokenUsage.totalTokensOut, 1000);
  assert.equal(metrics.tokenUsage.totalCostUsd, 0.025);
  assert.equal(metrics.agentConsumption.length, 1);
  assert.equal(metrics.agentConsumption[0].runsCount, 5);

  // Limpar mantendo apenas os 2 mais recentes
  const deleted = await store.clearOldRuns(2);
  assert.equal(deleted, 3);
  const runsAfter = await store.listRuns();
  assert.equal(runsAfter.length, 2);

  // Otimização
  await store.optimizeDatabase();
});

test("local sqlite: rss_sources seed, CRUD e toggle", async () => {
  const store = newStore();
  await store.init();

  // Verifica se o seed inicial inseriu as 5 fontes recomendadas
  const initialSources = await store.listRssSources();
  assert.equal(initialSources.length, 5);
  assert.ok(initialSources.some((s) => s.name === "Canaltech"));

  // Adicionar nova fonte
  const newId = await store.addRssSource("TechCrunch", "https://techcrunch.com/feed/", 1);
  assert.ok(newId > 0);

  const updatedSources = await store.listRssSources(1);
  assert.equal(updatedSources.length, 6);

  // Toggle status
  await store.toggleRssSource(newId, false);
  const afterToggle = await store.listRssSources(1);
  const toggled = afterToggle.find((s) => s.id === newId);
  assert.equal(toggled?.isActive, false);

  // Delete
  await store.deleteRssSource(newId);
  const afterDelete = await store.listRssSources(1);
  assert.equal(afterDelete.length, 5);
});

