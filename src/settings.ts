import type { SqlStore } from "./turso_store.ts";
import type { AiProviderConfig } from "./ai_pool.ts";

export interface PanelSettings {
  openrouterApiKey: string;
  openrouterBackupKeys?: string;
  chatModel: string;
  pexelsApiKey: string;
  groqApiKey?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  deepseekApiKey?: string;
  anthropicApiKey?: string;
  ollamaBaseUrl?: string;
  providerPoolJson?: string;
  maxDailyPostsPerAgent: number;
  maxDailyPostsGlobal: number;
  dailyBudgetUsd: number;
  minCreditBalance: number;
  cooldownSeconds: number;
}

export const SETTINGS_DEFAULTS: PanelSettings = {
  openrouterApiKey: "",
  openrouterBackupKeys: "",
  chatModel: "",
  pexelsApiKey: "",
  groqApiKey: "",
  geminiApiKey: "",
  openaiApiKey: "",
  deepseekApiKey: "",
  anthropicApiKey: "",
  ollamaBaseUrl: "",
  providerPoolJson: "",
  maxDailyPostsPerAgent: 0,
  maxDailyPostsGlobal: 0,
  dailyBudgetUsd: 0,
  minCreditBalance: 0,
  cooldownSeconds: 0,
};

export class SettingsService {
  private current: PanelSettings = { ...SETTINGS_DEFAULTS };

  constructor(private store: SqlStore) {}

  async load(): Promise<void> {
    this.current = mergeSettings(await this.store.getSettings());
  }

  get(): PanelSettings {
    return this.current;
  }

  async save(values: PanelSettings): Promise<void> {
    await this.store.setSettings(toRecord(values));
    this.current = mergeSettings(toRecord(values));
  }

  getAiProviderConfigs(): AiProviderConfig[] {
    const s = this.current;
    if (s.providerPoolJson?.trim()) {
      try {
        const parsed = JSON.parse(s.providerPoolJson) as AiProviderConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => {
            let apiKey = item.apiKey;
            if (!apiKey) {
              if (item.provider === "openrouter") apiKey = s.openrouterApiKey;
              else if (item.provider === "groq") apiKey = s.groqApiKey;
              else if (item.provider === "gemini") apiKey = s.geminiApiKey;
              else if (item.provider === "openai") apiKey = s.openaiApiKey;
              else if (item.provider === "deepseek") apiKey = s.deepseekApiKey;
              else if (item.provider === "anthropic") apiKey = s.anthropicApiKey;
            }
            return {
              ...item,
              apiKey,
              baseUrl: item.baseUrl || (item.provider === "ollama" ? s.ollamaBaseUrl : undefined),
            };
          });
        }
      } catch {
        // fallback to default auto-generated pool
      }
    }

    const pool: AiProviderConfig[] = [];
    let priority = 1;

    const backupKeys = (s.openrouterBackupKeys || "")
      .split(/[\n,;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5);

    if (s.openrouterApiKey?.trim()) {
      pool.push({
        id: "openrouter:primary",
        provider: "openrouter",
        model: s.chatModel?.trim() || "deepseek/deepseek-chat",
        apiKey: s.openrouterApiKey.trim(),
        priority: priority++,
        enabled: true,
      });
    }

    backupKeys.forEach((key, idx) => {
      pool.push({
        id: `openrouter:backup_${idx + 1}`,
        provider: "openrouter",
        model: s.chatModel?.trim() || "deepseek/deepseek-chat",
        apiKey: key,
        priority: priority++,
        enabled: true,
      });
    });

    if (s.groqApiKey?.trim()) {
      pool.push({
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        apiKey: s.groqApiKey.trim(),
        priority: priority++,
        enabled: true,
      });
    }

    if (s.geminiApiKey?.trim()) {
      pool.push({
        provider: "gemini",
        model: "gemini-2.5-flash",
        apiKey: s.geminiApiKey.trim(),
        priority: priority++,
        enabled: true,
      });
    }

    if (s.deepseekApiKey?.trim()) {
      pool.push({
        provider: "deepseek",
        model: "deepseek-chat",
        apiKey: s.deepseekApiKey.trim(),
        priority: priority++,
        enabled: true,
      });
    }

    if (s.openaiApiKey?.trim()) {
      pool.push({
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: s.openaiApiKey.trim(),
        priority: priority++,
        enabled: true,
      });
    }

    if (s.anthropicApiKey?.trim()) {
      pool.push({
        provider: "anthropic",
        model: "claude-3-5-haiku-20241022",
        apiKey: s.anthropicApiKey.trim(),
        priority: priority++,
        enabled: true,
      });
    }

    if (s.ollamaBaseUrl?.trim()) {
      pool.push({
        provider: "ollama",
        model: "llama3.2:latest",
        baseUrl: s.ollamaBaseUrl.trim(),
        priority: priority++,
        enabled: true,
      });
    }

    return pool;
  }
}

function mergeSettings(stored: Record<string, string>): PanelSettings {
  return {
    openrouterApiKey: stored.openrouterApiKey ?? "",
    openrouterBackupKeys: stored.openrouterBackupKeys ?? "",
    chatModel: stored.chatModel || "",
    pexelsApiKey: stored.pexelsApiKey || "",
    groqApiKey: stored.groqApiKey || "",
    geminiApiKey: stored.geminiApiKey || "",
    openaiApiKey: stored.openaiApiKey || "",
    deepseekApiKey: stored.deepseekApiKey || "",
    anthropicApiKey: stored.anthropicApiKey || "",
    ollamaBaseUrl: stored.ollamaBaseUrl || "",
    providerPoolJson: stored.providerPoolJson || "",
    maxDailyPostsPerAgent: Number(stored.maxDailyPostsPerAgent ?? 0) || 0,
    maxDailyPostsGlobal: Number(stored.maxDailyPostsGlobal ?? 0) || 0,
    dailyBudgetUsd: Number(stored.dailyBudgetUsd ?? 0) || 0,
    minCreditBalance: Number(stored.minCreditBalance ?? 0) || 0,
    cooldownSeconds: Number(stored.cooldownSeconds ?? 0) || 0,
  };
}

function toRecord(values: PanelSettings): Record<string, string> {
  return {
    openrouterApiKey: values.openrouterApiKey || "",
    openrouterBackupKeys: values.openrouterBackupKeys || "",
    chatModel: values.chatModel || "",
    pexelsApiKey: values.pexelsApiKey || "",
    groqApiKey: values.groqApiKey || "",
    geminiApiKey: values.geminiApiKey || "",
    openaiApiKey: values.openaiApiKey || "",
    deepseekApiKey: values.deepseekApiKey || "",
    anthropicApiKey: values.anthropicApiKey || "",
    ollamaBaseUrl: values.ollamaBaseUrl || "",
    providerPoolJson: values.providerPoolJson || "",
    maxDailyPostsPerAgent: String(values.maxDailyPostsPerAgent || 0),
    maxDailyPostsGlobal: String(values.maxDailyPostsGlobal || 0),
    dailyBudgetUsd: String(values.dailyBudgetUsd || 0),
    minCreditBalance: String(values.minCreditBalance || 0),
    cooldownSeconds: String(values.cooldownSeconds || 0),
  };
}
