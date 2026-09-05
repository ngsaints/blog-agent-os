export type LogLevel = "info" | "warn" | "error" | "success";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  details?: string;
  agentId?: number;
  runId?: number;
}

export interface RunStepLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: string;
}

export interface RunLogger {
  step(message: string, level?: LogLevel, details?: string): void;
  info(message: string, details?: string): void;
  warn(message: string, details?: string): void;
  error(message: string, details?: string): void;
  success(message: string, details?: string): void;
  getLogs(): RunStepLog[];
  formatFullLog(): string;
  build(): string;
}

class SystemLogger {
  private buffer: LogEntry[] = [];
  private readonly maxEntries: number;
  private idCounter = 0;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  private addEntry(
    level: LogLevel,
    source: string,
    message: string,
    details?: string,
    meta?: { agentId?: number; runId?: number },
  ): LogEntry {
    const entry: LogEntry = {
      id: `${Date.now()}-${++this.idCounter}`,
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      details: details?.trim() || undefined,
      agentId: meta?.agentId,
      runId: meta?.runId,
    };

    this.buffer.unshift(entry);
    if (this.buffer.length > this.maxEntries) {
      this.buffer.length = this.maxEntries;
    }

    // Output formatado no console para terminal/Deno Deploy logs
    const tag = `[${entry.source}]`;
    const prefix = `[${entry.timestamp.substring(11, 19)}] ${tag}`;
    if (level === "error") {
      console.error(`${prefix} [ERRO] ${message}${details ? `\n${details}` : ""}`);
    } else if (level === "warn") {
      console.warn(`${prefix} [AVISO] ${message}${details ? `\n${details}` : ""}`);
    } else if (level === "success") {
      console.log(`${prefix} [OK] ${message}`);
    } else {
      console.log(`${prefix} [INFO] ${message}`);
    }

    return entry;
  }

  info(source: string, message: string, details?: string, meta?: { agentId?: number; runId?: number }): LogEntry {
    return this.addEntry("info", source, message, details, meta);
  }

  warn(source: string, message: string, details?: string, meta?: { agentId?: number; runId?: number }): LogEntry {
    return this.addEntry("warn", source, message, details, meta);
  }

  error(source: string, message: string, details?: string, meta?: { agentId?: number; runId?: number }): LogEntry {
    return this.addEntry("error", source, message, details, meta);
  }

  success(source: string, message: string, details?: string, meta?: { agentId?: number; runId?: number }): LogEntry {
    return this.addEntry("success", source, message, details, meta);
  }

  getEntries(options?: {
    limit?: number;
    level?: LogLevel;
    source?: string;
    agentId?: number;
    runId?: number;
    search?: string;
  }): LogEntry[] {
    let result = this.buffer;

    if (options?.level) {
      result = result.filter((e) => e.level === options.level);
    }
    if (options?.source) {
      const s = options.source.toLowerCase();
      result = result.filter((e) => e.source.toLowerCase().includes(s));
    }
    if (options?.agentId !== undefined) {
      result = result.filter((e) => e.agentId === options.agentId);
    }
    if (options?.runId !== undefined) {
      result = result.filter((e) => e.runId === options.runId);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.message.toLowerCase().includes(q) ||
          e.source.toLowerCase().includes(q) ||
          (e.details && e.details.toLowerCase().includes(q)),
      );
    }

    const limit = options?.limit ?? 100;
    return result.slice(0, limit);
  }

  clear(): void {
    this.buffer = [];
  }

  createRunLogger(runId: number, agentName: string, agentId: number): RunLogger {
    const steps: RunStepLog[] = [];
    const source = `Agente #${agentId} (${agentName})`;

    const recordStep = (msg: string, level: LogLevel = "info", details?: string) => {
      const step: RunStepLog = {
        timestamp: new Date().toISOString(),
        level,
        message: msg,
        details: details?.trim() || undefined,
      };
      steps.push(step);
      this.addEntry(level, source, msg, details, { agentId, runId });
    };

    return {
      step: (msg, level, details) => recordStep(msg, level || "info", details),
      info: (msg, details) => recordStep(msg, "info", details),
      warn: (msg, details) => recordStep(msg, "warn", details),
      error: (msg, details) => recordStep(msg, "error", details),
      success: (msg, details) => recordStep(msg, "success", details),
      getLogs: () => [...steps],
      formatFullLog: () => {
        return steps
          .map((s) => {
            const time = s.timestamp.substring(11, 19);
            const icon = s.level === "error" ? "[ERRO]" : s.level === "warn" ? "[AVISO]" : s.level === "success" ? "[OK]" : "[INFO]";
            let line = `[${time}] ${icon} ${s.message}`;
            if (s.details) {
              line += `\n   Detalhes: ${s.details.replace(/\n/g, "\n   ")}`;
            }
            return line;
          })
          .join("\n");
      },
      build: () => {
        return steps
          .map((s) => {
            const time = s.timestamp.substring(11, 19);
            const icon = s.level === "error" ? "[ERRO]" : s.level === "warn" ? "[AVISO]" : s.level === "success" ? "[OK]" : "[INFO]";
            let line = `[${time}] ${icon} ${s.message}`;
            if (s.details) {
              line += `\n   Detalhes: ${s.details.replace(/\n/g, "\n   ")}`;
            }
            return line;
          })
          .join("\n");
      },
    };
  }
}

export const systemLogger = new SystemLogger();

export function createRunLogger(runId: number, agentName: string, agentId: number): RunLogger {
  return systemLogger.createRunLogger(runId, agentName, agentId);
}
