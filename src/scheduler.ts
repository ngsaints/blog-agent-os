import type { Agent, SqlStore } from "./turso_store.ts";

export type AgentRunner = (agent: Agent) => Promise<void>;

const inFlight = new Set<number>();
let lock = false;

export function isAgentRunning(id: number): boolean {
  return inFlight.has(id);
}

function isDue(agent: Agent, now: number): boolean {
  if (agent.status !== "active") return false;
  // Redatores e Criadores Visuais são agendados. Revisores rodam sob demanda.
  if (agent.role === "reviewer") return false;
  if (!agent.lastRunAt) return true;
  const last = new Date(agent.lastRunAt).getTime();
  if (Number.isNaN(last)) return true;
  return now - last >= agent.scheduleMinutes * 60_000;
}

export async function runDueAgents(
  store: SqlStore,
  runner: AgentRunner,
  awaitAll = false,
): Promise<{ agents: string[]; count: number }> {
  if (lock) return { agents: [], count: 0 };
  lock = true;
  try {
    const rawSettings = await store.getSettings();
    const maxGlobal = Number(rawSettings.maxDailyPostsGlobal ?? 0) || 0;
    const maxPerAgent = Number(rawSettings.maxDailyPostsPerAgent ?? 0) || 0;
    const dailyBudget = Number(rawSettings.dailyBudgetUsd ?? 0) || 0;
    const cooldownSec = Number(rawSettings.cooldownSeconds ?? 0) || 0;

    const dailyStats = await store.getDailyStats();

    if (maxGlobal > 0 && dailyStats.totalPostsToday >= maxGlobal) {
      console.warn(
        `[Scheduler] Limite diário global de posts atingido hoje (${dailyStats.totalPostsToday}/${maxGlobal}). Aguardando próximo dia.`,
      );
      return { agents: [], count: 0 };
    }

    if (dailyBudget > 0 && dailyStats.totalCostUsdToday >= dailyBudget) {
      console.warn(
        `[Scheduler] Teto de orçamento diário de IA atingido hoje ($${dailyStats.totalCostUsdToday.toFixed(4)}/$${dailyBudget.toFixed(2)}). Execuções pausadas até amanhã.`,
      );
      return { agents: [], count: 0 };
    }

    const all = await store.listAgents();
    const now = Date.now();
    const due = all.filter((a) => {
      if (!isDue(a, now) || inFlight.has(a.id)) return false;
      const agentLimit = a.dailyPostLimit > 0 ? a.dailyPostLimit : maxPerAgent;
      if (agentLimit > 0) {
        const postsToday = dailyStats.agentPostsToday[a.id] ?? 0;
        if (postsToday >= agentLimit) {
          return false;
        }
      }
      return true;
    });

    const jobs = due.map((agent, index) => async () => {
      if (index > 0 && cooldownSec > 0) {
        await new Promise((resolve) => setTimeout(resolve, cooldownSec * 1000));
      }
      inFlight.add(agent.id);
      try {
        await runner(agent);
      } catch (err) {
        console.error(`[${agent.name}] Erro inesperado: ${err}`);
      } finally {
        inFlight.delete(agent.id);
      }
    });

    if (awaitAll) {
      for (const job of jobs) await job();
    } else {
      for (const job of jobs) void job();
    }
    return { agents: due.map((a) => a.name), count: due.length };
  } finally {
    lock = false;
  }
}

export async function runAgentNow(
  store: SqlStore,
  runner: AgentRunner,
  agentId: number,
): Promise<boolean> {
  if (inFlight.has(agentId)) return false;
  const agent = await store.getAgent(agentId);
  if (!agent) return false;
  inFlight.add(agentId);
  void (async () => {
    try {
      await runner(agent);
    } catch (err) {
      console.error(`[${agent.name}] Erro inesperado: ${err}`);
    } finally {
      inFlight.delete(agentId);
    }
  })();
  return true;
}

export function startScheduler(
  _intervalMinutes: number,
  store: SqlStore,
  runner: AgentRunner,
): void {
  // Verificação inicial rápida ao iniciar o servidor
  setTimeout(() => {
    runDueAgents(store, runner)
      .then((r) => {
        if (r.count > 0) console.log(`Scheduler (boot): ${r.count} agente(s) executado(s)`);
      })
      .catch((err) => console.error(`Scheduler (boot): ${err}`));
  }, 4000);

  // Verifica a cada 1 minuto quais agentes atingiram sua frequência individual (ex: 5min, 15min, 720min)
  setInterval(() => {
    runDueAgents(store, runner)
      .then((r) => {
        if (r.count > 0) console.log(`Scheduler: ${r.count} agente(s) executado(s)`);
      })
      .catch((err) => console.error(`Scheduler: ${err}`));
  }, 60_000);
  console.log(`Scheduler ativo (verificação a cada 1 minuto para frequências individuais)`);
}
