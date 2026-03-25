import { expect, test } from "bun:test";
import { Kernel } from "./index.ts";
import { createLogger } from "@wato/logging";
import type { WatoModule } from "@wato/core";

test("kernel exposes workflow engine capability to modules", async () => {
  let found = false;

  const probeModule: WatoModule = {
    manifest: {
      name: "probe-module",
      version: "0.1.0",
      kind: "utility",
      accountScopeSupport: "multi"
    },
    register(context) {
      found = context.capabilities.has("workflow-engine");
      return {};
    }
  };

  const kernel = new Kernel({
    appName: "wato-test",
    logger: createLogger({ service: "test", level: "error" }),
    config: {
      dataDir: "./data",
      logLevel: "error",
      accounts: [{ id: "default", label: "Default", enabled: true }],
      api: { enabled: false, host: "127.0.0.1", port: 3199 },
      workflows: [],
      whatsapp: { autoInitialize: false, archiveMedia: false, headless: true },
      webhooks: { enabled: false, maxAttempts: 1, baseDelayMs: 1, endpoints: [] }
    },
    modules: [probeModule]
  });

  await kernel.start();
  await kernel.stop();

  expect(found).toBe(true);
});
