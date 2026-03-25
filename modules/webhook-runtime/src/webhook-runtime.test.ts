import { expect, test } from "bun:test";
import { webhookRuntimeInternals, webhookRuntimeModule } from "./index.ts";
import { capabilityNames, createDomainEvent, type ModuleContext } from "@wato/sdk";

test("webhook internals sign payload and match filters", () => {
  const signature = webhookRuntimeInternals.signPayload('{"x":1}', "secret");
  expect(signature.startsWith("sha256=")).toBe(true);
  expect(
    webhookRuntimeInternals.matchesWebhook(
      { id: "w1", url: "https://example.com", enabled: true, eventTypes: ["message.received"], accountIds: ["default"] },
      createDomainEvent({ type: "message.received", sourceModule: "test", accountId: "default", payload: {} })
    )
  ).toBe(true);
});

test("webhook runtime delivers and retries events", async () => {
  let attempts = 0;
  const deliveries: Array<Record<string, unknown>> = [];
  const server = Bun.serve({
    port: 0,
    fetch() {
      attempts += 1;
      return attempts === 1 ? new Response("fail", { status: 500 }) : new Response("ok", { status: 200 });
    }
  });

  const storage = {
    listWebhooks: () => [],
    saveWebhook() {},
    deleteWebhook() {},
    getEvent() { return undefined; },
    getWebhookDelivery() { return undefined; },
    saveWebhookDelivery(record: Record<string, unknown>) {
      deliveries.push(record);
    }
  };
  const subscribers = new Map<string, (event: ReturnType<typeof createDomainEvent>) => Promise<void>>();
  const context: ModuleContext = {
    appName: "test",
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    config: {
      dataDir: "/tmp",
      logLevel: "error",
      accounts: [],
      api: { enabled: false, host: "127.0.0.1", port: 1 },
      workflows: [],
      whatsapp: { autoInitialize: false, archiveMedia: false, headless: true },
      webhooks: {
        enabled: true,
        maxAttempts: 2,
        baseDelayMs: 10,
        endpoints: [{ id: "wh-1", url: `http://127.0.0.1:${server.port}`, enabled: true, eventTypes: ["message.received"], secret: "secret" }]
      }
    },
    capabilities: {
      register() {},
      resolve(name) {
        if (name === capabilityNames.storage) {
          return storage as never;
        }
        throw new Error(`unknown capability ${name}`);
      },
      has() { return true; },
      list() { return []; }
    },
    events: {
      async publish(event) {
        await subscribers.get("*")?.(event as ReturnType<typeof createDomainEvent>);
      },
      subscribe(eventType, handler) {
        subscribers.set(eventType, handler as never);
        return () => subscribers.delete(eventType);
      }
    }
  };

  const registration = await webhookRuntimeModule.register(context);
  await registration.start?.();
  await context.events.publish(createDomainEvent({ type: "message.received", sourceModule: "test", accountId: "default", payload: { body: "hi" } }));
  await Bun.sleep(40);
  await registration.stop?.();
  server.stop(true);

  expect(attempts).toBe(2);
  expect(deliveries.some((delivery) => delivery.status === "delivered")).toBe(true);
});
