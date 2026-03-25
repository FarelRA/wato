import type { Logger } from "@wato/sdk";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export function createLogger(options: { service: string; level: LogLevel }): Logger {
  const currentLevel = levelOrder[options.level];

  const write = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
    if (levelOrder[level] < currentLevel) {
      return;
    }

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        service: options.service,
        level,
        message,
        context: context ?? {}
      })
    );
  };

  return {
    debug: (message, context) => write("debug", message, context),
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context)
  };
}
