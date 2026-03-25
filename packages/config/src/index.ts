import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { KernelConfig } from "@wato/core";
import { z } from "zod";

const workflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive().default(1),
  enabled: z.boolean().default(true),
  accountScope: z.union([
    z.object({ mode: z.literal("all") }),
    z.object({ mode: z.literal("single"), accountId: z.string().min(1) }),
    z.object({ mode: z.literal("set"), accountIds: z.array(z.string().min(1)).min(1) })
  ]),
  trigger: z.object({ type: z.string().min(1), config: z.record(z.string(), z.unknown()).default({}) }),
  conditions: z.array(z.object({ type: z.string().min(1), config: z.record(z.string(), z.unknown()).default({}) })).default([]),
  actions: z.array(z.object({ type: z.string().min(1), config: z.record(z.string(), z.unknown()).default({}) })).min(1),
  policy: z
    .object({
      concurrency: z.enum(["allow", "dedupe", "serialize"]).optional(),
      retries: z.number().int().min(0).optional(),
      timeoutMs: z.number().int().positive().optional(),
      errorMode: z.enum(["stop", "continue"]).optional()
    })
    .optional()
});

const configSchema = z.object({
  dataDir: z.string().default("./data"),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  accounts: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        enabled: z.boolean().default(true),
        sessionDir: z.string().optional(),
        metadata: z.record(z.string(), z.string()).optional()
      })
    )
    .default([{ id: "default", label: "Default Account", enabled: true }]),
  api: z
    .object({
      enabled: z.boolean().default(true),
      host: z.string().default("127.0.0.1"),
      port: z.number().int().positive().default(3147),
      keys: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        key: z.string().min(1),
        enabled: z.boolean().default(true),
        permissions: z.array(z.string().min(1)).default(["*"]),
        expiresAt: z.string().datetime().optional()
      })).min(1)
    })
    .default({ enabled: true, host: "127.0.0.1", port: 3147, keys: [{ id: "default", name: "Default API key", key: "change-me", enabled: true, permissions: ["*"] }] }),
  workflows: z.array(workflowSchema).default([]),
  whatsapp: z
    .object({
      autoInitialize: z.boolean().default(true),
      archiveMedia: z.boolean().default(true),
      browserPath: z.string().min(1).optional(),
      headless: z.boolean().default(true)
    })
    .default({ autoInitialize: true, archiveMedia: true, headless: true }),
  webhooks: z
    .object({
      enabled: z.boolean().default(true),
      maxAttempts: z.number().int().positive().default(3),
      baseDelayMs: z.number().int().positive().default(1000),
      endpoints: z
        .array(
          z.object({
            id: z.string().min(1),
            url: z.string().url(),
            secret: z.string().min(1).optional(),
            enabled: z.boolean().default(true),
            eventTypes: z.array(z.string().min(1)).default(["message.received"]),
            accountIds: z.array(z.string().min(1)).optional(),
            headers: z.record(z.string(), z.string()).optional()
          })
        )
        .default([])
    })
    .default({ enabled: true, maxAttempts: 3, baseDelayMs: 1000, endpoints: [] })
});

export async function ensureDataDir(config: KernelConfig): Promise<void> {
  await mkdir(config.dataDir, { recursive: true });
}

export async function createWatoConfig(configPath?: string): Promise<KernelConfig> {
  const resolvedConfigPath = configPath ?? process.env.WATO_CONFIG ?? path.resolve(process.cwd(), "wato.config.json");
  const fileConfig = await readConfigFile(resolvedConfigPath);
  const envConfig = {
    dataDir: process.env.WATO_DATA_DIR,
    logLevel: process.env.WATO_LOG_LEVEL,
    accounts: parseAccounts(process.env.WATO_ACCOUNTS),
    api: {
      host: process.env.WATO_API_HOST,
      port: process.env.WATO_API_PORT ? Number(process.env.WATO_API_PORT) : undefined,
      keys: process.env.WATO_API_KEY ? [{ id: "env", name: "Environment API key", key: process.env.WATO_API_KEY, enabled: true, permissions: ["*"] }] : undefined
    },
    whatsapp: {
      browserPath: process.env.WATO_BROWSER_PATH,
      headless: parseBoolean(process.env.WATO_HEADLESS),
      autoInitialize: parseBoolean(process.env.WATO_AUTO_INITIALIZE)
    },
    webhooks: {
      enabled: parseBoolean(process.env.WATO_WEBHOOKS_ENABLED),
      maxAttempts: process.env.WATO_WEBHOOK_MAX_ATTEMPTS ? Number(process.env.WATO_WEBHOOK_MAX_ATTEMPTS) : undefined,
      baseDelayMs: process.env.WATO_WEBHOOK_BASE_DELAY_MS ? Number(process.env.WATO_WEBHOOK_BASE_DELAY_MS) : undefined
    }
  };

  const parsed = configSchema.parse(mergeDefined(defaultConfig(), fileConfig, envConfig));
  await ensureDataDir(parsed);
  return parsed;
}

function defaultConfig(): KernelConfig {
  return {
    dataDir: "./data",
    logLevel: "info",
    accounts: [{ id: "default", label: "Default Account", enabled: true }],
    api: {
      enabled: true,
      host: "127.0.0.1",
      port: 3147,
      keys: [{ id: "default", name: "Default API key", key: "change-me", enabled: true, permissions: ["*"] }]
    },
    workflows: [
      {
        id: "auto-ack",
        name: "Auto acknowledge inbound message",
        version: 1,
        enabled: true,
        accountScope: { mode: "all" as const },
        trigger: { type: "message.received", config: {} },
        conditions: [],
        actions: [{ type: "message.sendText", config: { text: "wato received your message" } }],
        policy: { errorMode: "stop" as const }
      }
    ],
    whatsapp: {
      autoInitialize: true,
      archiveMedia: true,
      headless: true
    },
    webhooks: {
      enabled: true,
      maxAttempts: 3,
      baseDelayMs: 1000,
      endpoints: []
    }
  };
}

async function readConfigFile(configPath: string): Promise<unknown> {
  if (!existsSync(configPath)) {
    return {};
  }

  const raw = await readFile(configPath, "utf8");
  return JSON.parse(raw);
}

function parseAccounts(value: string | undefined): KernelConfig["accounts"] | undefined {
  if (!value) {
    return undefined;
  }

  return value.split(",").map((entry) => {
    const [id, label] = entry.split(":");
    return {
      id: id.trim(),
      label: (label ?? id).trim(),
      enabled: true
    };
  });
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value === "1" || value === "true";
}

function mergeDefined<T>(...values: T[]): T {
  return values.reduce((accumulator, current) => deepMerge(accumulator, current), {} as T);
}

function deepMerge<T>(base: T, extra: T): T {
  if (Array.isArray(base) || Array.isArray(extra)) {
    return (extra ?? base) as T;
  }

  if (!isObject(base) || !isObject(extra)) {
    return (extra ?? base) as T;
  }

  const output: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined) {
      continue;
    }

    output[key] = key in output ? deepMerge(output[key] as T, value as T) : value;
  }

  return output as T;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
