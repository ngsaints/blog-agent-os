export interface CompletionOptions {
  model: string;
  system?: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  webSearch?: boolean;
}

export interface CompletionResult {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
}

export interface GeneratedImage {
  bytes: Uint8Array;
  type: string;
  cost?: number;
}

export interface CreditsInfo {
  totalCredits: number;
  usage: number;
  limit: number | null;
}

export interface ModelInfo {
  id: string;
  name: string;
  image: boolean;
  isFree?: boolean;
  contextLength?: number;
  inputModalities?: string[];
  outputModalities?: string[];
}

interface ModelPricing {
  prompt: number;
  completion: number;
  request: number;
  image: number;
}

const CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const IMAGES_URL = "https://openrouter.ai/api/v1/images/generations";
const CREDITS_URL = "https://openrouter.ai/api/v1/credits";

async function readJson(res: Response): Promise<any> {
  return res.json();
}

import type { AiProviderPool, AiTaskType } from "./ai_pool.ts";

export class OpenRouterClient {
  private pricingCache = new Map<string, ModelPricing>();
  private pricingPromise: Promise<void> | null = null;
  private modelsCache: ModelInfo[] | null = null;
  private modelsKey = "";

  constructor(
    private apiKey: () => string,
    private appTitle = "Blog Agent OS",
    private aiPool?: AiProviderPool,
  ) {}

  setAiPool(pool: AiProviderPool): void {
    this.aiPool = pool;
  }

  getAiPool(): AiProviderPool | undefined {
    return this.aiPool;
  }

  getAllApiKeys(): string[] {
    const raw = this.apiKey() || "";
    const list = raw
      .split(/[\n,;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5);
    return list.length > 0 ? list : (raw.trim() ? [raw.trim()] : []);
  }

  getApiKey(): string {
    const keys = this.getAllApiKeys();
    return keys[0] || "";
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getApiKey()}`,
      "X-OpenRouter-Title": this.appTitle,
      ...extra,
    };
  }

  async chat(opts: CompletionOptions, taskType?: AiTaskType): Promise<CompletionResult> {
    if (this.aiPool) {
      return this.aiPool.chat(opts, taskType);
    }

    const keys = this.getAllApiKeys();
    if (keys.length === 0) {
      throw new Error("Nenhuma chave OpenRouter configurada.");
    }

    let lastError: unknown;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        const payload: Record<string, unknown> = {
          model: opts.model,
          max_tokens: opts.maxTokens ?? 8192,
          temperature: opts.temperature ?? 0.85,
          messages: [
            ...(opts.system ? [{ role: "system", content: opts.system }] : []),
            { role: "user", content: opts.user },
          ],
          plugins: [
            { id: "response-healing" },
          ],
        };
        if (opts.webSearch) {
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
        const res = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "X-OpenRouter-Title": this.appTitle,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.text();
          // Fallback se o modelo ou provedor recusar server tools ou plugins (status 400)
          if (res.status === 400 && (payload.tools || payload.plugins)) {
            delete payload.tools;
            delete payload.plugins;
            const retryRes = await fetch(CHAT_URL, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "X-OpenRouter-Title": this.appTitle,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });
            if (retryRes.ok) {
              const retryData = await readJson(retryRes);
              const retryChoice = retryData.choices?.[0];
              if (retryChoice) {
                const usage = retryData.usage ?? {};
                const promptTokens = usage.prompt_tokens ?? 0;
                const completionTokens = usage.completion_tokens ?? 0;
                const pricing = await this.getPricing(opts.model);
                const cost = pricing
                  ? promptTokens * pricing.prompt + completionTokens * pricing.completion +
                    pricing.request
                  : 0;
                return {
                  content: retryChoice.message?.content ?? "",
                  model: retryData.model ?? opts.model,
                  promptTokens,
                  completionTokens,
                  cost,
                };
              }
            }
          }
          throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`);
        }
        const data = await readJson(res);
        const choice = data.choices?.[0];
        if (!choice) throw new Error("OpenRouter: resposta sem choices");
        const usage = data.usage ?? {};
        const promptTokens = usage.prompt_tokens ?? 0;
        const completionTokens = usage.completion_tokens ?? 0;
        const pricing = await this.getPricing(opts.model);
        const cost = pricing
          ? promptTokens * pricing.prompt + completionTokens * pricing.completion +
            pricing.request
          : 0;
        return {
          content: choice.message?.content ?? "",
          model: data.model ?? opts.model,
          promptTokens,
          completionTokens,
          cost,
        };
      } catch (err) {
        lastError = err;
        if (keys.length > 1) {
          console.warn(
            `[OpenRouter Key ${i + 1}/${keys.length}] Falha no chat: ${err instanceof Error ? err.message : err}. Tentando próxima chave...`,
          );
        }
      }
    }
    throw lastError || new Error("Falha no OpenRouter com todas as chaves");
  }

  async generateImage(
    prompt: string,
    model: string,
    aspectRatio?: "9:16" | "16:9" | "1:1",
  ): Promise<GeneratedImage | null> {
    const bodyPayload: Record<string, unknown> = {
      model,
      prompt: aspectRatio
        ? `${prompt} (aspect ratio ${aspectRatio}, vertical pinterest format: ${aspectRatio === "9:16"})`
        : prompt,
      n: 1,
    };
    if (aspectRatio === "9:16") {
      bodyPayload.size = "768x1344";
    } else if (aspectRatio === "16:9") {
      bodyPayload.size = "1344x768";
    } else if (aspectRatio === "1:1") {
      bodyPayload.size = "1024x1024";
    }

    const keys = this.getAllApiKeys();
    if (keys.length === 0) {
      throw new Error("Nenhuma chave OpenRouter configurada.");
    }

    let lastError: unknown;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        const res = await fetch(IMAGES_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "X-OpenRouter-Title": this.appTitle,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`OpenRouter imagem ${res.status}: ${body.slice(0, 300)}`);
        }
        const data = await readJson(res);
        const item = data.data?.[0] ?? data.images?.[0];
        if (!item) throw new Error("OpenRouter: resposta de imagem sem dados");
        const pricing = await this.getPricing(model);
        const cost = pricing?.image && pricing.image > 0 ? pricing.image : 0.03;

        if (typeof item.url === "string" && item.url) {
          const imgRes = await fetch(item.url);
          if (!imgRes.ok) throw new Error(`Falha ao baixar imagem: ${imgRes.status}`);
          const bytes = new Uint8Array(await imgRes.arrayBuffer());
          return { bytes, type: imgRes.headers.get("content-type") ?? "image/png", cost };
        }
        if (typeof item.b64_json === "string" && item.b64_json) {
          const bytes = base64ToBytes(item.b64_json);
          return { bytes, type: item.content_type ?? "image/png", cost };
        }
        throw new Error("OpenRouter: formato de imagem não reconhecido");
      } catch (err) {
        lastError = err;
        if (keys.length > 1) {
          console.warn(
            `[OpenRouter Key ${i + 1}/${keys.length}] Falha na imagem: ${err instanceof Error ? err.message : err}. Tentando próxima chave...`,
          );
        }
      }
    }
    throw lastError || new Error("Falha ao gerar imagem com todas as chaves OpenRouter");
  }

  private creditsCache: { data: CreditsInfo | null; ts: number; key: string } | null = null;

  async getCredits(): Promise<CreditsInfo | null> {
    const key = this.apiKey();
    const now = Date.now();
    if (this.creditsCache && this.creditsCache.key === key && now - this.creditsCache.ts < 60_000) {
      return this.creditsCache.data;
    }
    try {
      const res = await fetch(CREDITS_URL, {
        headers: this.headers(),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const data = await readJson(res);
      const d = data.data ?? {};
      const total = Number(d.total_credits ?? 0);
      const usage = Number(d.total_usage ?? d.usage ?? 0);
      const remaining = Math.max(0, total - usage);
      const result: CreditsInfo = {
        totalCredits: remaining,
        usage,
        limit: d.limit === null ? null : Number(d.limit ?? 0),
      };
      this.creditsCache = { data: result, ts: now, key };
      return result;
    } catch {
      return this.creditsCache?.data ?? null;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const key = this.apiKey();
    if (this.modelsCache && this.modelsKey === key) return this.modelsCache;
    const res = await fetch(
      "https://openrouter.ai/api/v1/models?output_modalities=all",
      {
        headers: this.headers(),
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = await readJson(res);
    const list: ModelInfo[] = [];
    for (const m of data.data ?? []) {
      if (typeof m?.id !== "string" || !m.id) continue;
      const inMods = Array.isArray(m.architecture?.input_modalities)
        ? m.architecture.input_modalities
        : Array.isArray(m.modality?.input)
        ? m.modality.input
        : [];
      const outMods = Array.isArray(m.architecture?.output_modalities)
        ? m.architecture.output_modalities
        : Array.isArray(m.modality?.output)
        ? m.modality.output
        : [];
      const image = outMods.includes("image") ||
        (typeof m.pricing?.image === "string" &&
          parseFloat(m.pricing.image) > 0);
      const isFree = m.id.endsWith(":free") ||
        (Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0);
      const contextLength = typeof m.context_length === "number" ? m.context_length : undefined;

      list.push({
        id: m.id,
        name: typeof m.name === "string" && m.name ? m.name : m.id,
        image,
        isFree,
        contextLength,
        inputModalities: inMods,
        outputModalities: outMods,
      });
    }
    list.sort((a, b) => a.id.localeCompare(b.id));
    this.modelsCache = list;
    this.modelsKey = key;
    return list;
  }

  async getPricing(model: string): Promise<ModelPricing | null> {
    if (this.pricingCache.has(model)) return this.pricingCache.get(model) ?? null;
    try {
      await this.loadAllPricing();
      return this.pricingCache.get(model) ?? null;
    } catch {
      return null;
    }
  }

  private async loadAllPricing(): Promise<void> {
    if (this.pricingPromise) return this.pricingPromise;
    this.pricingPromise = (async () => {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: this.headers(),
      });
      if (!res.ok) return;
      const data = await readJson(res);
      for (const model of data.data ?? []) {
        const p = model.pricing;
        if (!p) continue;
        const imgPrice = Number(p.image ?? p.image_output) || 0;
        this.pricingCache.set(model.id, {
          prompt: Number(p.prompt) || 0,
          completion: Number(p.completion) || 0,
          request: Number(p.request) || 0,
          image: imgPrice > 0 ? imgPrice : (model.id.includes("image") ? 0.03 : 0),
        });
      }
    })();
    try {
      await this.pricingPromise;
    } finally {
      this.pricingPromise = null;
    }
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
