import type { ActionProvider, WorkflowDefinition } from "@wato/workflow-sdk";
import { sendMessageActionModule } from "./index.ts";
import { capabilityNames, createDomainEvent, type CapabilityRegistry, type MessageEnvelope, type ModuleContext, type OutboundMessageRecord } from "@wato/sdk";

export function actionSendInternalsTestHarness() {
  const actions = new Map<string, ActionProvider>();
  const outbound: OutboundMessageRecord[] = [];
  const sentTexts: Array<{ accountId: string; chatId: string; text: string }> = [];
  const sentMedia: Array<Record<string, unknown>> = [];
  const forwarded: Array<{ accountId: string; messageId: string; chatId: string }> = [];
  const workflow: WorkflowDefinition = {
    id: "wf",
    name: "wf",
    version: 1,
    enabled: true,
    accountScope: { mode: "all" },
    trigger: { type: "message.received", config: {} },
    conditions: [],
    actions: []
  };
  const input: MessageEnvelope = {
    accountId: "default",
    chatId: "chat-1",
    messageId: "msg-1",
    from: "user-1",
    body: "hello",
    timestamp: new Date().toISOString()
  };
  const event = createDomainEvent({
    type: "message.received",
    sourceModule: "test",
    accountId: input.accountId,
    payload: input
  });

  const capabilities: CapabilityRegistry = {
    register() {},
    resolve(name) {
      if (name === capabilityNames.workflowEngine) {
        return {
          registerAction(provider: ActionProvider) {
            actions.set(provider.type, provider);
          }
        } as never;
      }
      if (name === "workflow-registry") {
        return {
          registerActionType() {}
        } as never;
      }
      if (name === capabilityNames.messageSender) {
        return {
          async sendText(accountId: string, chatId: string, text: string) {
            sentTexts.push({ accountId, chatId, text });
            return { messageId: "sent-1" };
          }
        } as never;
      }
      if (name === capabilityNames.storage) {
        return {
          saveOutboundMessage(record: OutboundMessageRecord) {
            outbound.push(record);
          }
        } as never;
      }
      if (name === capabilityNames.whatsappGateway) {
        return {
          async sendMedia(request: Record<string, unknown>) {
            sentMedia.push(request);
            return { messageId: "media-1" };
          },
          async forwardMessage(request: { accountId: string; messageId: string; chatId: string }) {
            forwarded.push(request);
          },
          async editMessage() {
            return { messageId: "edit-1" };
          },
          async deleteMessage() {},
          async starMessage() {},
          async archiveChat() { return true; },
          async sendSeen() { return true; },
          async replyToMessage() {
            return { messageId: "reply-1" };
          },
          async reactToMessage() {},
          async sendLocation() {
            return { messageId: "loc-1" };
          },
          async sendContactCards() {
            return { messageId: "contacts-1" };
          },
          async createPoll() {
            return { messageId: "poll-1" };
          },
          async updateGroupSettings() {
            return {};
          },
          async addGroupParticipants() {
            return {};
          },
          async kickGroupParticipants() {
            return {};
          },
          async promoteGroupParticipants() {
            return {};
          },
          async demoteGroupParticipants() {
            return {};
          },
          async muteChat() {
            return { isMuted: true, muteExpiration: 0 };
          },
          async blockContact() {
            return true;
          },
          async sendChannelMessage() {
            return { messageId: "chan-1" };
          },
          async setStatus() {}
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

  sendMessageActionModule.register(context);
  return { actions, outbound, sentTexts, sentMedia, forwarded, workflow, input, event };
}
