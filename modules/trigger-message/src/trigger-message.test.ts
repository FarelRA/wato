import { expect, test } from "bun:test";
import type { TriggerProvider } from "@wato/workflow-types";
import { capabilityNames, type CapabilityRegistry, type MessageEnvelope, type ModuleContext } from "@wato/core";
import { triggerMessageModule } from "./index.ts";

test("message trigger exposes regex groups and command parsing", () => {
  let provider: TriggerProvider | undefined;
  let registeredType: string | undefined;

  const capabilities: CapabilityRegistry = {
    register() {},
    resolve(name) {
      if (name === capabilityNames.workflowEngine) {
        return {
          registerTrigger(input: TriggerProvider) {
            provider = input;
          }
        } as never;
      }

      if (name === capabilityNames.workflowRegistry) {
        return {
          registerTriggerType(type: string) {
            registeredType = type;
          }
        } as never;
      }

      throw new Error(`unknown capability ${name}`);
    },
    has() {
      return true;
    },
    list() {
      return [];
    }
  };

  const context: ModuleContext = {
    appName: "test",
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    config: {
      dataDir: "/tmp",
      logLevel: "error",
      accounts: [],
      api: { enabled: false, host: "127.0.0.1", port: 1, keys: [{ id: "test", name: "Test", key: "secret", permissions: ["*"] }] },
      workflows: [],
      whatsapp: { autoInitialize: false, archiveMedia: false, headless: true },
      webhooks: { enabled: false, maxAttempts: 1, baseDelayMs: 1, endpoints: [] }
    },
    capabilities,
    events: { async publish() {}, subscribe() { return () => {}; } }
  };

  triggerMessageModule.register(context);

  const payload: MessageEnvelope = {
    accountId: "default",
    chatId: "chat-1",
    messageId: "msg-1",
    from: "user-1",
    body: "/order A-42 now",
    timestamp: new Date().toISOString(),
    mentionedIds: ["user-2"],
    quotedMessageId: "quoted-1"
  };

  const result = provider?.match(payload, {
    commandPrefix: "/",
    commandName: "order",
    pattern: "(?<orderId>A-[0-9]+)"
  });

  expect(registeredType).toBe("message.received");
  expect(result).toEqual({
    matched: true,
    data: {
      message: {
        accountId: "default",
        chatId: "chat-1",
        messageId: "msg-1",
        from: "user-1",
        body: "/order A-42 now",
        type: undefined,
        timestamp: payload.timestamp,
        fromMe: undefined,
        hasMedia: undefined,
        ack: undefined,
        isForwarded: undefined,
        isStatus: undefined
      },
      body: "/order A-42 now",
      lines: ["/order A-42 now"],
      words: ["/order", "A-42", "now"],
      command: {
        prefix: "/",
        name: "order",
        args: ["A-42", "now"],
        raw: "/order A-42 now"
      },
      sender: {
        id: "user-1",
        accountId: "default"
      },
      chat: {
        id: "chat-1"
      },
      media: undefined,
      location: undefined,
      contacts: undefined,
      mentions: {
        ids: ["user-2"],
        groups: []
      },
      quoted: {
        messageId: "quoted-1"
      },
      match: "A-42",
      captures: ["A-42"],
      groups: {
        orderId: "A-42"
      }
    }
  });
});
