import process from "node:process";

export interface AppConfig {
  tursoDbUrl: string;
  tursoAuthToken: string;
  sqlitePath: string;
  adminUsername: string;
  adminPassword: string;
  sessionSecret: string;
  port: number;
  runIntervalMinutes: number;
  cronToken: string;
  isDenoDeploy: boolean;
  isServerless: boolean;
}

function env(name: string): string {
  const denoEnv = (globalThis as { Deno?: { env?: { get: (k: string) => string | undefined } } })
    .Deno?.env?.get(name);
  return denoEnv ?? process.env[name] ?? "";
}

export function loadConfig(): AppConfig {
  const adminPassword = env("ADMIN_PASSWORD");
  const isDenoDeploy = Boolean(
    env("DENO_DEPLOYMENT_ID") || env("DENO_REGION") || env("DENO_PROJECT_ID"),
  );
  const isServerless = isDenoDeploy || Boolean(
    env("VERCEL") ||
    env("AWS_LAMBDA_FUNCTION_NAME") ||
    env("NETLIFY") ||
    env("SERVERLESS"),
  );
  return {
    tursoDbUrl: env("TURSO_DB_URL"),
    tursoAuthToken: env("TURSO_AUTH_TOKEN"),
    sqlitePath: env("SQLITE_PATH") || "data/blog-agent.db",
    adminUsername: env("ADMIN_USERNAME") || "admin",
    adminPassword,
    sessionSecret: env("SESSION_SECRET") || adminPassword,
    port: Number(env("PORT") || "8000"),
    runIntervalMinutes: Number(env("RUN_INTERVAL_MINUTES") || "15"),
    cronToken: env("CRON_TOKEN"),
    isDenoDeploy,
    isServerless,
  };
}

export function validateConfig(config: AppConfig): string[] {
  const missing: string[] = [];
  if (!config.adminPassword) missing.push("ADMIN_PASSWORD");
  if (config.isServerless) {
    if (!config.tursoDbUrl) missing.push("TURSO_DB_URL");
    if (!config.tursoAuthToken) missing.push("TURSO_AUTH_TOKEN");
  }
  return missing;
}
