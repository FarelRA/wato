import { expect, test } from "bun:test";
import { createApiFetchHandler } from "./index.ts";
import { capabilityNames, type ModuleContext } from "@wato/core";

test("api handler lists and upserts webhooks", async () => {
  const webhooks: Array<{ id: string; url: string; enabled: boolean; eventTypes: string[] }> = [];
  const context: ModuleContext = {
    appName: "test",
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    config: {
      dataDir: "/tmp",
      logLevel: "error",
      accounts: [],
      api: { enabled: true, host: "127.0.0.1", port: 1, authToken: "secret" },
      workflows: [],
      whatsapp: { autoInitialize: false, archiveMedia: false, headless: true },
      webhooks: { enabled: true, maxAttempts: 2, baseDelayMs: 1, endpoints: [] }
    },
    capabilities: { register() {}, resolve() { return undefined as never; }, has() { return true; }, list() { return []; } },
    events: { async publish() {}, subscribe() { return () => {}; } }
  };
  const handler = createApiFetchHandler({
    context,
    accounts: { list: () => [] } as never,
    storage: {
      listWorkflows: () => [],
      listWorkflowExecutions: () => [],
      listWebhookDeliveries: () => [],
      getWebhookDelivery: () => undefined,
      upsertAccounts() {},
      saveEvent() {},
      getEvent() { return undefined; },
      saveWorkflow() {},
      saveWorkflowExecution() {},
      saveWebhook() {},
      deleteWebhook() {},
      listWebhooks: () => webhooks,
      saveWebhookDelivery() {}
    },
    system: { getStatus: () => ({ name: "test", status: "ready", uptimeMs: 1, moduleCount: 1, accountCount: 0 }) },
    sender: { async sendText() { return { messageId: "1" }; } },
    gateway: {
      async sendMedia() { return { messageId: "1" }; },
      async sendContactCards() { return { messageId: "1" }; },
      async sendLocation() { return { messageId: "1" }; },
      async replyToMessage() { return { messageId: "1" }; },
      async forwardMessage() {},
      async editMessage() { return { messageId: "1" }; },
      async deleteMessage() {},
      async starMessage() {},
      async unstarMessage() {},
      async pinMessage() { return true; },
      async unpinMessage() { return true; },
      async getMessageInfo() { return {}; },
      async getMessageReactions() { return []; },
      async getPollVotesForMessage() { return []; },
      async reactToMessage() {},
      async createPoll() { return { messageId: "1" }; },
      async voteInPoll() {},
      async listMessages() { return []; },
      async listLabels() { return [{ id: "l1", name: "Ops", hexColor: "#fff" }]; },
      async getLabel() { return { id: "l1", name: "Ops", hexColor: "#fff" }; },
      async getChatLabels() { return []; },
      async getChatsByLabel() { return []; },
      async updateChatLabels() {},
      async listBroadcasts() { return [{ id: "b1", timestamp: 1, totalCount: 1, unreadCount: 0, messageIds: [] }]; },
      async getBroadcast() { return { id: "b1", timestamp: 1, totalCount: 1, unreadCount: 0, messageIds: [] }; },
      async listChats() { return []; },
      async getChat() { return { id: "c", name: "Chat", isGroup: false, archived: false, pinned: false, isMuted: false, unreadCount: 0, timestamp: 0 }; },
      async fetchChatMessages() { return []; },
      async searchMessages() { return []; },
      async archiveChat() { return true; },
      async unarchiveChat() { return true; },
      async pinChat() { return true; },
      async unpinChat() { return true; },
      async markChatUnread() {},
      async sendSeen() { return true; },
      async sendTyping() {},
      async sendRecording() {},
      async clearChatState() { return true; },
      async clearChatMessages() { return true; },
      async deleteChat() { return true; },
      async syncHistory() { return true; },
      async joinGroupByInvite() { return "group"; },
      async getInviteInfo() { return {}; },
      async acceptGroupV4Invite() { return { status: 200 }; },
      async createGroup() { return { gid: { _serialized: "g" } }; },
      async getGroupInvite() { return "invite"; },
      async revokeGroupInvite() {},
      async updateGroupSettings() { return {}; },
      async leaveGroup() {},
      async getGroupMembershipRequests() { return []; },
      async approveGroupMembershipRequests() { return []; },
      async rejectGroupMembershipRequests() { return []; },
      async addGroupParticipants() { return {}; },
      async kickGroupParticipants() { return {}; },
      async promoteGroupParticipants() { return {}; },
      async demoteGroupParticipants() { return {}; },
      async muteChat() { return { isMuted: true, muteExpiration: 0 }; },
      async unmuteChat() { return { isMuted: false, muteExpiration: 0 }; },
      async blockContact() { return true; },
      async unblockContact() { return true; },
      async listContacts() { return []; },
      async listBlockedContacts() { return []; },
      async getCommonGroups() { return []; },
      async getFormattedNumber() { return "+1 555"; },
      async getCountryCode() { return "1"; },
      async isRegisteredUser() { return true; },
      async getNumberId() { return null; },
      async getContactDeviceCount() { return 1; },
      async saveAddressBookContact() {},
      async deleteAddressBookContact() {},
      async getContactLidAndPhone() { return [{ lid: "lid", pn: "123" }]; },
      async addCustomerNote() {},
      async getCustomerNote() { return { id: "note-1", content: "hi" }; },
      async getContactInfo() { return { id: "c", isGroup: false, isMyContact: true, isBlocked: false }; },
      async getProfilePicture() { return null; },
      async setStatus() {},
      async revokeStatusMessage() {},
      async setDisplayName() { return true; },
      async setProfilePicture() { return true; },
      async deleteProfilePicture() { return true; },
      async requestPairingCode() { return "PAIRCODE"; },
      async sendPresenceAvailable() {},
      async sendPresenceUnavailable() {},
      async getState() { return "READY"; },
      async getWWebVersion() { return "1.0"; },
      async setAutoDownload() {},
      async createCallLink() { return "https://call"; },
      async createScheduledEvent() { return { messageId: "scheduled-1" }; },
      async respondToScheduledEvent() { return true; },
      async getGroupInfo() { return { id: "g", name: "g", participants: [] }; },
      async createChannel() { return { id: "ch" }; },
      async listChannels() { return []; },
      async searchChannels() { return []; },
      async getChannelByInvite() { return { id: "ch", name: "Channel", unreadCount: 0, isMuted: false }; },
      async updateChannel() { return {}; },
      async getChannelSubscribers() { return []; },
      async fetchChannelMessages() { return []; },
      async subscribeToChannel() { return true; },
      async unsubscribeFromChannel() { return true; },
      async muteChannel() { return true; },
      async unmuteChannel() { return true; },
      async sendSeenToChannel() { return true; },
      async sendChannelMessage() { return { messageId: "1" }; },
      async inviteChannelAdmin() { return true; },
      async acceptChannelAdminInvite() { return true; },
      async revokeChannelAdminInvite() { return true; },
      async demoteChannelAdmin() { return true; },
      async transferChannelOwnership() { return true; },
      async deleteChannel() { return true; },
      async sendText() { return { messageId: "1" }; }
    },
    webhookRegistry: {
      list: () => webhooks as never,
      remove() {},
      async replayDelivery() {},
      upsert(definition) {
        webhooks.push({ id: definition.id, url: definition.url, enabled: definition.enabled, eventTypes: definition.eventTypes });
      }
    }
  });

  const createResponse = await handler(
    new Request("http://localhost/webhooks", {
      method: "POST",
      headers: { authorization: "Bearer secret", "content-type": "application/json" },
      body: JSON.stringify({ id: "wh-1", url: "https://example.com/hook", eventTypes: ["message.received"] })
    })
  );
  expect(createResponse.status).toBe(200);

  const listResponse = await handler(new Request("http://localhost/webhooks", { headers: { authorization: "Bearer secret" } }));
  const body = (await listResponse.json()) as { webhooks: Array<{ id: string }> };
  expect(body.webhooks[0]?.id).toBe("wh-1");
});

test("api handler lists labels", async () => {
  const context: ModuleContext = {
    appName: "test",
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    config: {
      dataDir: "/tmp",
      logLevel: "error",
      accounts: [],
      api: { enabled: true, host: "127.0.0.1", port: 1, authToken: undefined },
      workflows: [],
      whatsapp: { autoInitialize: false, archiveMedia: false, headless: true },
      webhooks: { enabled: true, maxAttempts: 2, baseDelayMs: 1, endpoints: [] }
    },
    capabilities: { register() {}, resolve() { return undefined as never; }, has() { return true; }, list() { return []; } },
    events: { async publish() {}, subscribe() { return () => {}; } }
  };
  const gateway = {
    async listLabels() { return [{ id: "l1", name: "Ops", hexColor: "#fff" }]; }
  } as never;
  const handler = createApiFetchHandler({
    context,
    accounts: { list: () => [] } as never,
    storage: { listWorkflows: () => [], listWorkflowExecutions: () => [], listWebhookDeliveries: () => [], getWebhookDelivery: () => undefined, upsertAccounts() {}, saveEvent() {}, getEvent() { return undefined; }, saveWorkflow() {}, saveWorkflowExecution() {}, saveWebhook() {}, deleteWebhook() {}, listWebhooks: () => [], saveWebhookDelivery() {} },
    system: { getStatus: () => ({ name: "test", status: "ready", uptimeMs: 1, moduleCount: 1, accountCount: 0 }) },
    sender: { async sendText() { return { messageId: "1" }; } },
    gateway,
    webhookRegistry: { list: () => [], upsert() {}, remove() {}, async replayDelivery() {} }
  });

  const response = await handler(new Request("http://localhost/labels?accountId=default"));
  const body = (await response.json()) as { labels: Array<{ id: string }> };
  expect(body.labels[0]?.id).toBe("l1");
});

test("api handler validates workflow and emits webhook test event", async () => {
  const published: Array<{ type: string }> = [];
  const context: ModuleContext = {
    appName: "test",
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    config: {
      dataDir: "/tmp",
      logLevel: "error",
      accounts: [],
      api: { enabled: true, host: "127.0.0.1", port: 1, authToken: undefined },
      workflows: [],
      whatsapp: { autoInitialize: false, archiveMedia: false, headless: true },
      webhooks: { enabled: true, maxAttempts: 2, baseDelayMs: 1, endpoints: [] }
    },
    capabilities: {
      register() {},
      resolve(name) {
        if (name === capabilityNames.workflowRegistry) {
          return {
            validate: () => ({ ok: true, issues: [] }),
            listProviderTypes: () => ({ triggers: ["message.received"], conditions: ["message.textContains"], actions: ["message.sendText", "data.set"] }),
            async test() {
              return { ok: true, steps: ["action_ok:data.set"] };
            }
          } as never;
        }
        return undefined as never;
      },
      has() { return true; },
      list() { return []; }
    },
    events: { async publish(event) { published.push({ type: (event as { type: string }).type }); }, subscribe() { return () => {}; } }
  };
  const handler = createApiFetchHandler({
    context,
    accounts: { list: () => [] } as never,
    storage: { listWorkflows: () => [], listWorkflowExecutions: () => [], listWebhookDeliveries: () => [], getWebhookDelivery: () => undefined, upsertAccounts() {}, saveEvent() {}, getEvent() { return undefined; }, saveWorkflow() {}, saveWorkflowExecution() {}, saveWebhook() {}, deleteWebhook() {}, listWebhooks: () => [], saveWebhookDelivery() {} },
    system: { getStatus: () => ({ name: "test", status: "ready", uptimeMs: 1, moduleCount: 1, accountCount: 0 }) },
    sender: { async sendText() { return { messageId: "1" }; } },
    gateway: {} as never,
    webhookRegistry: { list: () => [], upsert() {}, remove() {}, async replayDelivery() {} }
  });

  const validateResponse = await handler(new Request("http://localhost/workflows/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "wf", trigger: { type: "message.received" }, actions: [{}] }) }));
  const validateBody = (await validateResponse.json()) as { ok: boolean };
  expect(validateBody.ok).toBe(true);

  const providersResponse = await handler(new Request("http://localhost/workflow-providers"));
  const providersBody = (await providersResponse.json()) as { triggers: string[] };
  expect(providersBody.triggers).toEqual(["message.received"]);

  const testResponse = await handler(new Request("http://localhost/workflows/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId: "wf", eventType: "message.received", payload: {} }) }));
  const testBody = (await testResponse.json()) as { ok: boolean };
  expect(testBody.ok).toBe(true);

  await handler(new Request("http://localhost/webhooks/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventType: "message.received" }) }));
  expect(published[0]?.type).toBe("message.received");
});
