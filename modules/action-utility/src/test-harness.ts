import type { ActionProvider, WorkflowDefinition, WorkflowExecutionContext } from "@wato/workflow-sdk";
import type { CapabilityRegistry, ModuleContext } from "@wato/sdk";
import { createDomainEvent } from "@wato/sdk";
import { utilityActionModule } from "./index.ts";

export function utilityActionTestHarness() {
  const actions = new Map<string, ActionProvider>();
  const workflow: WorkflowDefinition = {
    id: "wf-data",
    name: "wf-data",
    version: 1,
    enabled: true,
    accountScope: { mode: "all" },
    trigger: { type: "message.received", config: {} },
    conditions: [],
    actions: []
  };
  const execution: WorkflowExecutionContext = {
    workflow,
    executionId: "exec-1",
    accountId: "default",
    input: {
      accountId: "default",
      chatId: "chat-1",
      messageId: "msg-1",
      from: "user-1",
      body: "order A-42",
      timestamp: new Date().toISOString()
    },
    eventType: "message.received",
    event: createDomainEvent({
      type: "message.received",
      sourceModule: "test",
      accountId: "default",
      payload: { body: "order A-42" }
    }),
    trigger: {
      data: {
        groups: {
          orderId: "A-42"
        }
      }
    },
    actionResults: [
      {
        id: "lookup",
        type: "data.set",
        ok: true,
        output: {}
      }
    ]
  };

  const capabilities: CapabilityRegistry = {
    register() {},
    resolve(name) {
      if (name === "workflow-registry") {
        return { registerActionType() {} } as never;
      }
      if (name === "workflow-engine") {
        return {
          registerAction(provider: ActionProvider) {
            actions.set(provider.type, provider);
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
      api: { enabled: false, host: "127.0.0.1", port: 1 },
      workflows: [],
      whatsapp: { autoInitialize: false, archiveMedia: false, headless: true },
      webhooks: { enabled: false, maxAttempts: 1, baseDelayMs: 1, endpoints: [] }
    },
    capabilities,
    events: { async publish() {}, subscribe() { return () => {}; } }
  };

  utilityActionModule.register(context);
  return { actions, workflow, execution };
}
