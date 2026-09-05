import type { CompletionOptions, CompletionResult } from "./openrouter.ts";

export type AiProviderName =
  | "openrouter"
  | "groq"
  | "gemini"
  | "openai"
  | "deepseek"
  | "anthropic"
  | "ollama";

export type AiTaskType =
  | "article_generation"
  | "article_review"
  | "image_prompt"
  | "chat";

export interface AiProviderConfig {
  id?: string;
  provider: AiProviderName;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  priority: number;
  enabled?: boolean;
  tasks?: AiTaskType[];
}

export interface CircuitBreakerState {
  isAvailable: boolean;
  cooldownUntil: number;
  failureCount: number;
  lastError?: string;
}

export class CircuitBreaker {
  private states = new Map<string, CircuitBreakerState>();
  private defaultCooldownMs: number;

  constructor(cooldownMinutes = 15) {
    this.defaultCooldownMs = cooldownMinutes * 60 * 1000;
  }

  setCooldownMinutes(minutes: number): void {
    this.defaultCooldownMs = Math.max(1, minutes) * 60 * 1000;
  }

  isAvailable(key: string): boolean {
    const state = this.states.get(key);
    if (!state) return true;
    if (Date.now() < state.cooldownUntil) {
      return false;
    }
    return true;
  }

  getState(key: string): CircuitBreakerState {
    const state = this.states.get(key);
    if (!state) {
      return { isAvailable: true, cooldownUntil: 0, failureCount: 0 };
    }
    const isAvail = Date.now() >= state.cooldownUntil;
    return { ...state, isAvailable: isAvail };
  }

  recordSuccess(key: string): void {
    this.states.delete(key);
  }

  recordFailure(key: string, error: unknown, forceCooldown = false): void {
    const errStr = error instanceof Error ? error.message : String(error);
    const isRateLimitOrQuota =
      forceCooldown ||
      /429|rate\s*limit|quota|credit|insufficient|balance|402|billing/i.test(errStr);

    const prev = this.states.get(key) || {
      isAvailable: true,
      cooldownUntil: 0,
      failureCount: 0,
    };

    const newFailureCount = prev.failureCount + 1;
    const shouldCooldown = isRateLimitOrQuota || newFailureCount >= 2;
    const cooldownUntil = shouldCooldown
      ? Date.now() + this.defaultCooldownMs
      : 0;

    this.states.set(key, {
      isAvailable: !shouldCooldown,
      cooldownUntil,
      failureCount: newFailureCount,
      lastError: errStr,
    });
  }

  clear(): void {
    this.states.clear();
  }
}

export const DEFAULT_PROVIDER_MODELS: Record<AiProviderName, string> = {
  openrouter: "deepseek/deepseek-chat",
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  anthropic: "claude-3-5-haiku-20241022",
  ollama: "llama3.2:latest",
};

export const PROVIDER_ENDPOINTS: Record<AiProviderName, string> = {
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  ollama: "http://localhost:11434/v1/chat/completions",
};

export class AiProviderPool {
  private circuitBreaker = new CircuitBreaker(15);

  constructor(
    private getPoolConfigs: () => AiProviderConfig[],
    private appTitle = "Blog Agent OS",
  ) {}

  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  /**
   * Executa chamada de chat com failover automático entre provedores habilitados.
   */
  async chat(
    opts: CompletionOptions,
    taskType?: AiTaskType,
  ): Promise<CompletionResult> {
    const rawConfigs = this.getPoolConfigs();
    const activeConfigs = rawConfigs
      .filter((c) => c.enabled !== false && (c.apiKey?.trim() || c.provider === "ollama"))
      .filter((c) => {
        if (!taskType || !c.tasks || c.tasks.length === 0) return true;
        return c.tasks.includes(taskType);
      })
      .sort((a, b) => a.priority - b.priority);

    if (activeConfigs.length === 0) {
      throw new Error(
        "Nenhum provedor de IA configurado ou habilitado para esta operação. Verifique a aba Configurações.",
      );
    }

    const errors: string[] = [];

    for (const config of activeConfigs) {
      const key = `${config.provider}:${config.model || "default"}:${(config.apiKey || "").slice(-6)}`;
      
      // Checa se o provedor está em cooldown no Circuit Breaker
      if (!this.circuitBreaker.isAvailable(key)) {
        const state = this.circuitBreaker.getState(key);
        const remainingMinutes = Math.max(1, Math.ceil((state.cooldownUntil - Date.now()) / 60000));
        console.log(
          `[AI Pool] Provedor ${config.provider.toUpperCase()} (${config.model}) está em cooldown por mais ${remainingMinutes} min. Pulando...`,
        );
        continue;
      }

      const modelToUse = opts.model && opts.model.includes("/") && config.provider === "openrouter"
        ? opts.model
        : config.model || DEFAULT_PROVIDER_MODELS[config.provider];

      try {
        console.log(
          `[AI Pool] Tentando gerar via ${config.provider.toUpperCase()} (${modelToUse})${taskType ? ` [Tarefa: ${taskType}]` : ""}...`,
        );
        const result = await this.callProvider(config, {
          ...opts,
          model: modelToUse,
        });

        // Sucesso! Limpa histórico de falhas do provedor
        this.circuitBreaker.recordSuccess(key);
        return result;
      } catch (err: any) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `[AI Pool] Falha no provedor ${config.provider.toUpperCase()} (${modelToUse}): ${message}`,
        );
        this.circuitBreaker.recordFailure(key, err);
        errors.push(`${config.provider} (${modelToUse}): ${message}`);
      }
    }

    throw new Error(
      `Todos os provedores de IA cadastrados falharam ou estão em cooldown:\n${errors.join("\n")}`,
    );
  }

  private async callProvider(
    config: AiProviderConfig,
    opts: CompletionOptions,
  ): Promise<CompletionResult> {
    const apiKey = (config.apiKey || "").trim();

    if (config.provider === "anthropic") {
      return this.callAnthropic(config, opts, apiKey);
    }

    // Provedores com padrão OpenAI-compatible (OpenRouter, Groq, Gemini, OpenAI, DeepSeek, Ollama)
    return this.callOpenAiCompatible(config, opts, apiKey);
  }

  private async callOpenAiCompatible(
    config: AiProviderConfig,
    opts: CompletionOptions,
    apiKey: string,
  ): Promise<CompletionResult> {
    const endpoint = config.baseUrl || PROVIDER_ENDPOINTS[config.provider];
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    if (config.provider === "openrouter") {
      headers["X-OpenRouter-Title"] = this.appTitle;
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (opts.system) {
      messages.push({ role: "system", content: opts.system });
    }
    messages.push({ role: "user", content: opts.user });

    const payload: Record<string, unknown> = {
      model: opts.model,
      messages,
      temperature: opts.temperature ?? 0.85,
      max_tokens: opts.maxTokens ?? 8192,
    };

    if (config.provider === "openrouter") {
      payload.plugins = [
        { id: "response-healing" },
      ];
    }

    if (opts.webSearch && config.provider === "openrouter") {
      payload.tools = [
        {
          type: "openrouter:web_search",
          parameters: {
            engine: "auto",
            max_results: 5,
          },
        },
      ];
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 400 && (payload.tools || payload.plugins)) {
        delete payload.tools;
        delete payload.plugins;
        const retryRes = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (retryRes.ok) {
          const retryData = (await retryRes.json()) as any;
          const retryChoice = retryData.choices?.[0];
          if (retryChoice) {
            const usage = retryData.usage ?? {};
            return {
              content: retryChoice.message?.content ?? "",
              model: retryData.model ?? opts.model,
              promptTokens: usage.prompt_tokens ?? 0,
              completionTokens: usage.completion_tokens ?? 0,
              cost: 0,
            };
          }
        }
      }
      throw new Error(`${config.provider} ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as any;
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error(`${config.provider}: resposta sem choices válidas`);
    }

    const usage = data.usage ?? {};
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;

    return {
      content: choice.message?.content ?? "",
      model: data.model ?? opts.model,
      promptTokens,
      completionTokens,
      cost: 0,
    };
  }

  private async callAnthropic(
    config: AiProviderConfig,
    opts: CompletionOptions,
    apiKey: string,
  ): Promise<CompletionResult> {
    const endpoint = config.baseUrl || PROVIDER_ENDPOINTS.anthropic;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };

    const payload: Record<string, unknown> = {
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.85,
      messages: [{ role: "user", content: opts.user }],
    };

    if (opts.system) {
      payload.system = opts.system;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Anthropic ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as any;
    const contentBlocks = data.content ?? [];
    const textContent = contentBlocks
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    const usage = data.usage ?? {};
    return {
      content: textContent,
      model: data.model ?? opts.model,
      promptTokens: usage.input_tokens ?? 0,
      completionTokens: usage.output_tokens ?? 0,
      cost: 0,
    };
  }
}
