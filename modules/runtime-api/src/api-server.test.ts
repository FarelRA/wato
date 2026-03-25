import { createHash } from "node:crypto";
import { expect, test } from "bun:test";
import type { ModuleContext, StoredApiKeyRecord } from "@wato/core";
import { capabilityNames } from "@wato/core";
import { createApiFetchHandler } from "./index.ts";

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function createTestStorage() {
  const apiKeys = new Map<string, StoredApiKeyRecord>([["bootstrap", { id: "bootstrap", name: "Bootstrap", keyHash: hashApiKey("secret"), enabled: true, permissions: ["*"], source: "config", createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() }]]);
  return {
    listWorkflows: () => [],
    listWorkflowExecutions: () => [],
    listWebhookDeliveries: () => [],
    getWebhookDelivery: () => undefined,
    upsertAccounts() {}, saveEvent() {}, getEvent() { return undefined; }, saveWorkflow() {}, saveWorkflowExecution() {}, saveWebhook() {}, deleteWebhook() {}, listWebhooks: () => [], saveWebhookDelivery() {},
    saveApiKey(record: StoredApiKeyRecord) { apiKeys.set(record.id, record); },
    getApiKey(id: string) { return apiKeys.get(id); },
    getApiKeyByHash(keyHash: string) { return [...apiKeys.values()].find((item) => item.keyHash === keyHash); },
    listApiKeys() { return [...apiKeys.values()].map(({ keyHash: _keyHash, ...safe }) => safe); },
    deleteApiKey(id: string) { apiKeys.delete(id); },
    touchApiKey() {}
  };
}

function createContext(): ModuleContext {
  return {
    appName: "test",
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    config: { dataDir: "/tmp", logLevel: "error", accounts: [{ id: "default", label: "Default", enabled: true }], api: { enabled: true, host: "127.0.0.1", port: 1, keys: [{ id: "bootstrap", name: "Bootstrap", key: "secret", enabled: true, permissions: ["*"] }] }, workflows: [], whatsapp: { autoInitialize: false, archiveMedia: false, headless: true }, webhooks: { enabled: true, maxAttempts: 2, baseDelayMs: 1, endpoints: [] } },
    capabilities: { register() {}, resolve(name) { if (name === capabilityNames.workflowRegistry) return { validate: () => ({ ok: true, issues: [] }), listProviderTypes: () => ({ triggers: ["message.received"], conditions: [], actions: [] }), async test() { return { ok: true }; } } as never; return undefined as never; }, has() { return true; }, list() { return []; } },
    events: { async publish() {}, subscribe() { return () => {}; } }
  };
}

function createGateway() {
  return {
    async getMessage() { return { accountId: "default", chatId: "chat", messageId: "msg-1", from: "a", body: "hello", timestamp: new Date().toISOString() }; },
    async sendText() { return { messageId: "msg-1" }; },
    async sendMedia() { return { messageId: "msg-1" }; },
    async sendContactCards() { return { messageId: "msg-1" }; },
    async sendLocation() { return { messageId: "msg-1" }; },
    async replyToMessage() { return { messageId: "msg-2" }; },
    async reactToMessage() {}, async forwardMessage() {}, async editMessage() { return { messageId: "msg-3" }; }, async deleteMessage() {}, async starMessage() {}, async unstarMessage() {}, async pinMessage() { return true; }, async unpinMessage() { return true; }, async getMessageInfo() { return {}; }, async getMessageReactions() { return []; }, async getPollVotesForMessage() { return []; }, async createPoll() { return { messageId: "poll-1" }; }, async voteInPoll() {}, async listMessages() { return []; },
    async listChats() { return []; }, async getChat() { return { id: "chat", name: "Chat", isGroup: false, archived: false, pinned: false, isMuted: false, unreadCount: 0, timestamp: 0 }; }, async fetchChatMessages() { return []; }, async searchMessages() { return []; }, async archiveChat() { return true; }, async unarchiveChat() { return true; }, async pinChat() { return true; }, async unpinChat() { return true; }, async markChatUnread() {}, async sendSeen() { return true; }, async sendTyping() {}, async sendRecording() {}, async clearChatState() { return true; }, async clearChatMessages() { return true; }, async deleteChat() { return true; }, async syncHistory() { return true; },
    async joinGroupByInvite() { return "group-1"; }, async getInviteInfo() { return {}; }, async acceptGroupV4Invite() { return { status: 200 }; }, async createGroup() { return { id: "group-1" }; }, async getGroupInvite() { return "invite"; }, async revokeGroupInvite() {}, async updateGroupSettings() { return {}; }, async leaveGroup() {}, async getGroupMembershipRequests() { return []; }, async approveGroupMembershipRequests() { return []; }, async rejectGroupMembershipRequests() { return []; }, async addGroupParticipants() { return {}; }, async kickGroupParticipants() { return {}; }, async promoteGroupParticipants() { return {}; }, async demoteGroupParticipants() { return {}; },
    async muteChat() { return { isMuted: true, muteExpiration: 0 }; }, async unmuteChat() { return { isMuted: false, muteExpiration: 0 }; },
    async blockContact() { return true; }, async unblockContact() { return true; }, async getContactInfo() { return { id: "contact", isGroup: false, isMyContact: true, isBlocked: false }; }, async getProfilePicture() { return null; }, async listContacts() { return []; }, async listBlockedContacts() { return []; }, async getCommonGroups() { return []; }, async getFormattedNumber() { return "+1 555"; }, async getCountryCode() { return "1"; }, async isRegisteredUser() { return true; }, async getNumberId() { return null; }, async getContactDeviceCount() { return 1; }, async saveAddressBookContact() {}, async deleteAddressBookContact() {}, async getContactLidAndPhone() { return [{ lid: "lid", pn: "123" }]; }, async addCustomerNote() {}, async getCustomerNote() { return { note: "hi" }; },
    async setStatus() {}, async revokeStatusMessage() {}, async setDisplayName() { return true; }, async setProfilePicture() { return true; }, async deleteProfilePicture() { return true; }, async requestPairingCode() { return "PAIRCODE"; }, async sendPresenceAvailable() {}, async sendPresenceUnavailable() {}, async getState() { return "READY"; }, async getWWebVersion() { return "1.0"; }, async setAutoDownload() {}, async createCallLink() { return "https://call"; }, async createScheduledEvent() { return { messageId: "event-1" }; }, async respondToScheduledEvent() { return true; }, async getGroupInfo() { return { id: "group-1", name: "Group", participants: [] }; },
    async createChannel() { return { id: "channel-1" }; }, async getChannel() { return { id: "channel-1", name: "Channel", unreadCount: 0, isMuted: false }; }, async listChannels() { return []; }, async searchChannels() { return []; }, async getChannelByInvite() { return { id: "channel-1", name: "Channel", unreadCount: 0, isMuted: false }; }, async updateChannel() { return {}; }, async getChannelSubscribers() { return []; }, async fetchChannelMessages() { return []; }, async subscribeToChannel() { return true; }, async unsubscribeFromChannel() { return true; }, async muteChannel() { return true; }, async unmuteChannel() { return true; }, async sendSeenToChannel() { return true; }, async sendChannelMessage() { return { messageId: "channel-msg-1" }; }, async inviteChannelAdmin() { return true; }, async acceptChannelAdminInvite() { return true; }, async revokeChannelAdminInvite() { return true; }, async demoteChannelAdmin() { return true; }, async transferChannelOwnership() { return true; }, async deleteChannel() { return true; },
    async listLabels() { return [{ id: "l1", name: "Ops", hexColor: "#fff" }]; }, async getLabel() { return { id: "l1", name: "Ops", hexColor: "#fff" }; }, async getChatLabels() { return []; }, async getChatsByLabel() { return []; }, async updateChatLabels() {}, async listBroadcasts() { return []; }, async getBroadcast() { return { id: "b1", timestamp: 1, totalCount: 1, unreadCount: 0, messageIds: [] }; }
  } as never;
}

test("uses v1 system routes", async () => {
  let reloadReason: string | undefined;
  const handler = createApiFetchHandler({ context: createContext(), accounts: { list: () => [{ id: "default", label: "Default", enabled: true, state: "ready" }], get: () => ({ id: "default", label: "Default", enabled: true, state: "ready" }) } as never, storage: createTestStorage(), system: { getStatus: () => ({ name: "test", status: "ready", uptimeMs: 1, moduleCount: 1, accountCount: 1 }), reload(reason) { reloadReason = reason; } }, sender: { async sendText() { return { messageId: "1" }; } }, gateway: createGateway(), webhookRegistry: { list: () => [], upsert() {}, remove() {}, async replayDelivery() {} } });
  expect((await handler(new Request("http://localhost/v1/system", { headers: { authorization: "Bearer secret" } }))).status).toBe(200);
  expect((await handler(new Request("http://localhost/v1/system:reload", { method: "POST", headers: { authorization: "Bearer secret" } }))).status).toBe(200);
  await new Promise((resolve) => queueMicrotask(resolve));
  expect(reloadReason).toBe("api");
});

test("sends unified chat message on nested v1 route", async () => {
  let seenText: string | undefined;
  const handler = createApiFetchHandler({ context: createContext(), accounts: { list: () => [], get: () => undefined } as never, storage: createTestStorage(), system: { getStatus: () => ({ name: "test", status: "ready", uptimeMs: 1, moduleCount: 1, accountCount: 0 }), reload() {} }, sender: { async sendText(_accountId, _chatId, text) { seenText = text; return { messageId: "1" }; } }, gateway: createGateway(), webhookRegistry: { list: () => [], upsert() {}, remove() {}, async replayDelivery() {} } });
  const response = await handler(new Request("http://localhost/v1/accounts/default/chats/chat-1/messages", { method: "POST", headers: { authorization: "Bearer secret", "content-type": "application/json" }, body: JSON.stringify({ text: "hello" }) }));
  expect(response.status).toBe(200);
  expect(seenText).toBe("hello");
});

test("lists labels on nested v1 account route", async () => {
  const handler = createApiFetchHandler({ context: createContext(), accounts: { list: () => [], get: () => undefined } as never, storage: createTestStorage(), system: { getStatus: () => ({ name: "test", status: "ready", uptimeMs: 1, moduleCount: 1, accountCount: 0 }), reload() {} }, sender: { async sendText() { return { messageId: "1" }; } }, gateway: createGateway(), webhookRegistry: { list: () => [], upsert() {}, remove() {}, async replayDelivery() {} } });
  const response = await handler(new Request("http://localhost/v1/accounts/default/labels", { headers: { authorization: "Bearer secret" } }));
  expect(((await response.json()) as { labels: Array<{ id: string }> }).labels[0]?.id).toBe("l1");
});

test("rotates api keys on resource route", async () => {
  const storage = createTestStorage();
  const handler = createApiFetchHandler({ context: createContext(), accounts: { list: () => [], get: () => undefined } as never, storage, system: { getStatus: () => ({ name: "test", status: "ready", uptimeMs: 1, moduleCount: 1, accountCount: 0 }), reload() {} }, sender: { async sendText() { return { messageId: "1" }; } }, gateway: createGateway(), webhookRegistry: { list: () => [], upsert() {}, remove() {}, async replayDelivery() {} } });
  const response = await handler(new Request("http://localhost/v1/system/keys/bootstrap:rotate", { method: "POST", headers: { authorization: "Bearer secret", "content-type": "application/json" }, body: "{}" }));
  const body = await response.json() as { apiKey: { id: string }; key: string };
  expect(body.apiKey.id).toBe("bootstrap");
  expect(storage.getApiKeyByHash(hashApiKey(body.key))?.id).toBe("bootstrap");
});
