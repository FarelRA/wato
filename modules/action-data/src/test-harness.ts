import type { ActionProvider, WorkflowDefinition, WorkflowExecutionContext } from "@wato/workflow-types";
import { capabilityNames, createDomainEvent, type CapabilityRegistry, type ModuleContext } from "@wato/core";
import { actionDataModule } from "./index.ts";

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
      if (name === capabilityNames.workflowRegistry) {
        return { registerActionType() {} } as never;
      }
      if (name === capabilityNames.workflowEngine) {
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
      api: { enabled: false, host: "127.0.0.1", port: 1, keys: [{ id: "test", name: "Test", key: "secret", permissions: ["*"] }] },
      workflows: [],
      whatsapp: { autoInitialize: false, archiveMedia: false, headless: true },
      webhooks: { enabled: false, maxAttempts: 1, baseDelayMs: 1, endpoints: [] }
    },
    capabilities,
    events: { async publish() {}, subscribe() { return () => {}; } }
  };

  actionDataModule.register(context);
  return { actions, workflow, execution };
}
