import test from "node:test";
import assert from "node:assert/strict";
import { AiProviderPool, CircuitBreaker, type AiProviderConfig } from "../src/ai_pool.ts";

test("CircuitBreaker: ativa cooldown após erro 429 ou múltiplos erros", () => {
  const cb = new CircuitBreaker(15);
  const key = "groq:llama-3.3:key123";

  assert.equal(cb.isAvailable(key), true);

  // Erro 429 ativa cooldown imediatamente
  cb.recordFailure(key, new Error("Groq 429: Rate limit reached"));
  assert.equal(cb.isAvailable(key), false);

  const state = cb.getState(key);
  assert.equal(state.isAvailable, false);
  assert.equal(state.failureCount, 1);
  assert.ok(state.cooldownUntil > Date.now());

  // Sucesso remove do cooldown
  cb.recordSuccess(key);
  assert.equal(cb.isAvailable(key), true);
});

test("AiProviderPool: failover automático quando primeiro provedor falha com 429", async () => {
  const poolConfigs: AiProviderConfig[] = [
    {
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      apiKey: "gsk_invalid_test",
      priority: 1,
      enabled: true,
    },
    {
      provider: "openrouter",
      model: "deepseek/deepseek-chat",
      apiKey: "sk-or-test",
      priority: 2,
      enabled: true,
    },
  ];

  const pool = new AiProviderPool(() => poolConfigs);

  // Mock global fetch para simular 429 no groq e 200 no openrouter
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: any, init?: any) => {
    const url = String(input);
    if (url.includes("api.groq.com")) {
      return new Response(JSON.stringify({ error: { message: "Rate limit exceeded" } }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("openrouter.ai")) {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "Artigo gerado com sucesso via OpenRouter!" } }],
          model: "deepseek/deepseek-chat",
          usage: { prompt_tokens: 100, completion_tokens: 200 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const result = await pool.chat({
      model: "deepseek/deepseek-chat",
      user: "Escreva um post sobre IA",
    });

    assert.equal(result.content, "Artigo gerado com sucesso via OpenRouter!");
    assert.equal(result.model, "deepseek/deepseek-chat");

    // Na próxima chamada, o groq já deve estar em cooldown no Circuit Breaker
    const cb = pool.getCircuitBreaker();
    assert.equal(cb.isAvailable("groq:llama-3.3-70b-versatile:d_test"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("AiProviderPool: roteamento por tipo de tarefa respeita taskType", async () => {
  const poolConfigs: AiProviderConfig[] = [
    {
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      apiKey: "gsk_groq",
      priority: 1,
      enabled: true,
      tasks: ["image_prompt"],
    },
    {
      provider: "anthropic",
      model: "claude-3-5-haiku-20241022",
      apiKey: "sk-ant-test",
      priority: 2,
      enabled: true,
      tasks: ["article_review"],
    },
  ];

  const pool = new AiProviderPool(() => poolConfigs);

  let calledUrl = "";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: any) => {
    calledUrl = String(input);
    if (calledUrl.includes("anthropic.com")) {
      return new Response(
        JSON.stringify({
          content: [{ type: "text", text: "Artigo revisado com sucesso!" }],
          model: "claude-3-5-haiku-20241022",
          usage: { input_tokens: 50, output_tokens: 150 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("{}", { status: 400 });
  };

  try {
    const result = await pool.chat(
      { model: "claude-3-5-haiku-20241022", user: "Revise este texto" },
      "article_review",
    );

    assert.ok(calledUrl.includes("anthropic.com"));
    assert.equal(result.content, "Artigo revisado com sucesso!");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
