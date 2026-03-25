import type {
  AccountListResponse,
  MessageListResponse,
  SendMessageBody,
  SystemStatusResponse,
  WebhookDeliveryListResponse,
  WebhookListResponse,
  WorkflowExecutionListResponse,
   WorkflowListResponse,
   WorkflowProviderTypesResponse,
   WorkflowTestBody,
   WorkflowValidationResponse
} from "@wato/api-types";
import type {
  AccountAutoDownloadRequest,
  AccountDisplayNameRequest,
  AccountPairingCodeRequest,
  AccountProfilePictureRequest,
  AddressBookContactDeleteRequest,
  AddressBookContactUpsertRequest,
  CallLinkRequest,
  ChannelActionRequest,
  ChannelAdminInviteRequest,
  ChannelCreateRequest,
  ChannelInviteRequest,
  ChannelMessagesRequest,
  ChannelOwnershipRequest,
  ChannelSendRequest,
  ChannelSubscribersRequest,
  ChannelSubscriptionRequest,
  ChannelUpdateRequest,
  ChatActionRequest,
  ChatMuteRequest,
  ContactActionRequest,
  CreatePollRequest,
  DeleteMessageRequest,
  EditMessageRequest,
  FetchChatMessagesRequest,
  ForwardMessageRequest,
  GroupCreateRequest,
  GroupInviteRequest,
  GroupLeaveRequest,
  GroupMembershipRequest,
  GroupV4InviteRequest,
  GroupParticipantsRequest,
  GroupSettingsRequest,
  JoinGroupInviteRequest,
  MessageActionRequest,
  PinMessageRequest,
  ReactToMessageRequest,
  ReplyToMessageRequest,
  SearchMessagesRequest,
  SendContactCardsRequest,
  SendLocationRequest,
  SendMediaRequest,
  StatusRevokeRequest,
  VotePollRequest,
  KernelConfig
} from "@wato/core";

export interface ApiClient {
  systemStatus(): Promise<SystemStatusResponse>;
  accounts(): Promise<AccountListResponse>;
  workflows(): Promise<WorkflowListResponse>;
  workflowProviders(): Promise<WorkflowProviderTypesResponse>;
  validateWorkflow(body: Record<string, unknown>): Promise<WorkflowValidationResponse>;
  upsertWorkflow(body: Record<string, unknown>): Promise<{ ok: true }>;
  testWorkflow(body: WorkflowTestBody): Promise<unknown>;
  workflowExecutions(): Promise<WorkflowExecutionListResponse>;
  webhooks(): Promise<WebhookListResponse>;
  webhookDeliveries(): Promise<WebhookDeliveryListResponse>;
  upsertWebhook(body: { id: string; url: string; secret?: string; enabled?: boolean; eventTypes?: string[]; accountIds?: string[]; headers?: Record<string, string> }): Promise<{ ok: true }>;
  removeWebhook(body: { webhookId: string }): Promise<{ ok: true }>;
  replayWebhookDelivery(body: { deliveryId: string }): Promise<{ ok: true }>;
  testWebhookEvent(body: { eventType: string; accountId?: string; payload?: unknown }): Promise<{ ok: true }>;
  messages(accountId?: string): Promise<MessageListResponse>;
  sendMessage(body: SendMessageBody): Promise<{ ok: true }>;
  sendMedia(body: SendMediaRequest): Promise<{ messageId?: string }>;
  sendContacts(body: SendContactCardsRequest): Promise<{ messageId?: string }>;
  sendLocation(body: SendLocationRequest): Promise<{ messageId?: string }>;
  reply(body: ReplyToMessageRequest): Promise<{ messageId?: string }>;
  forward(body: ForwardMessageRequest): Promise<{ ok: true }>;
  editMessage(body: EditMessageRequest): Promise<{ messageId?: string } | null>;
  deleteMessage(body: DeleteMessageRequest): Promise<{ ok: true }>;
  starMessage(body: MessageActionRequest): Promise<{ ok: true }>;
  unstarMessage(body: MessageActionRequest): Promise<{ ok: true }>;
  pinMessage(body: PinMessageRequest): Promise<{ ok: boolean }>;
  unpinMessage(body: MessageActionRequest): Promise<{ ok: boolean }>;
  messageInfo(body: MessageActionRequest): Promise<unknown>;
  messageReactions(body: MessageActionRequest): Promise<unknown>;
  messagePollVotes(body: MessageActionRequest): Promise<unknown>;
  react(body: ReactToMessageRequest): Promise<{ ok: true }>;
  createPoll(body: CreatePollRequest): Promise<{ messageId?: string }>;
  votePoll(body: VotePollRequest): Promise<{ ok: true }>;
  labels(accountId: string): Promise<{ labels: unknown[] }>;
  labelInfo(body: { accountId: string; labelId: string }): Promise<unknown>;
  chatsByLabel(body: { accountId: string; labelId: string }): Promise<{ chats: unknown[] }>;
  chatLabels(body: ChatActionRequest): Promise<{ labels: unknown[] }>;
  updateChatLabels(body: { accountId: string; chatIds: string[]; labelIds: Array<string | number> }): Promise<{ ok: true }>;
  broadcasts(accountId: string): Promise<{ broadcasts: unknown[] }>;
  broadcastInfo(body: { accountId: string; broadcastId: string }): Promise<unknown>;
  chats(accountId: string): Promise<{ chats: unknown[] }>;
  chatInfo(body: ChatActionRequest): Promise<unknown>;
  chatMessages(body: FetchChatMessagesRequest): Promise<MessageListResponse>;
  chatSearchMessages(body: SearchMessagesRequest): Promise<MessageListResponse>;
  archiveChat(body: ChatActionRequest): Promise<{ ok: boolean }>;
  unarchiveChat(body: ChatActionRequest): Promise<{ ok: boolean }>;
  pinChat(body: ChatActionRequest): Promise<{ ok: boolean }>;
  unpinChat(body: ChatActionRequest): Promise<{ ok: boolean }>;
  markChatUnread(body: ChatActionRequest): Promise<{ ok: true }>;
  sendSeen(body: ChatActionRequest): Promise<{ ok: boolean }>;
  sendTyping(body: ChatActionRequest): Promise<{ ok: true }>;
  sendRecording(body: ChatActionRequest): Promise<{ ok: true }>;
  clearChatState(body: ChatActionRequest): Promise<{ ok: boolean }>;
  clearChatMessages(body: ChatActionRequest): Promise<{ ok: boolean }>;
  deleteChat(body: ChatActionRequest): Promise<{ ok: boolean }>;
  syncHistory(body: ChatActionRequest): Promise<{ ok: boolean }>;
  joinGroupByInvite(body: JoinGroupInviteRequest): Promise<{ groupId: string }>;
  getInviteInfo(body: { accountId: string; inviteCode: string }): Promise<unknown>;
  acceptGroupV4Invite(body: GroupV4InviteRequest): Promise<{ status: number }>;
  createGroup(body: GroupCreateRequest): Promise<unknown>;
  getGroupInvite(body: GroupInviteRequest): Promise<{ inviteCode: string }>;
  revokeGroupInvite(body: GroupInviteRequest): Promise<{ ok: true }>;
  getGroupInfo(body: GroupInviteRequest): Promise<unknown>;
  leaveGroup(body: GroupLeaveRequest): Promise<{ ok: true }>;
  groupMembershipRequests(body: GroupInviteRequest): Promise<{ requests: unknown[] }>;
  approveGroupMembershipRequests(body: GroupMembershipRequest): Promise<{ results: unknown[] }>;
  rejectGroupMembershipRequests(body: GroupMembershipRequest): Promise<{ results: unknown[] }>;
  updateGroup(body: GroupSettingsRequest): Promise<Record<string, boolean>>;
  addGroupParticipants(body: GroupParticipantsRequest): Promise<unknown>;
  kickGroupParticipants(body: GroupParticipantsRequest): Promise<unknown>;
  promoteGroupParticipants(body: GroupParticipantsRequest): Promise<boolean>;
  demoteGroupParticipants(body: GroupParticipantsRequest): Promise<boolean>;
  muteChat(body: ChatMuteRequest): Promise<unknown>;
  unmuteChat(body: ChatMuteRequest): Promise<unknown>;
  blockContact(body: ContactActionRequest): Promise<{ ok: boolean }>;
  unblockContact(body: ContactActionRequest): Promise<{ ok: boolean }>;
  contacts(accountId: string): Promise<{ contacts: unknown[] }>;
  blockedContacts(accountId: string): Promise<{ contacts: unknown[] }>;
  contactInfo(body: ContactActionRequest): Promise<unknown>;
  commonGroups(body: ContactActionRequest): Promise<{ groups: string[] }>;
  formattedNumber(body: ContactActionRequest): Promise<{ formattedNumber: string }>;
  countryCode(body: ContactActionRequest): Promise<{ countryCode: string }>;
  isRegistered(body: ContactActionRequest): Promise<{ registered: boolean }>;
  numberId(body: { accountId: string; number: string }): Promise<{ numberId: string | null }>;
  contactDeviceCount(body: ContactActionRequest): Promise<{ count: number }>;
  profilePicture(body: ContactActionRequest): Promise<{ url: string | null }>;
  saveAddressBookContact(body: AddressBookContactUpsertRequest): Promise<{ ok: true }>;
  deleteAddressBookContact(body: AddressBookContactDeleteRequest): Promise<{ ok: true }>;
  contactLidPhone(body: { accountId: string; userIds: string[] }): Promise<{ records: Array<{ lid: string; pn: string }> }>;
  addCustomerNote(body: { accountId: string; userId: string; note: string }): Promise<{ ok: true }>;
  customerNote(body: { accountId: string; userId: string }): Promise<unknown>;
  setStatus(body: { accountId: string; status: string }): Promise<{ ok: true }>;
  revokeStatusMessage(body: StatusRevokeRequest): Promise<{ ok: true }>;
  setDisplayName(body: AccountDisplayNameRequest): Promise<{ ok: boolean }>;
  setProfilePicture(body: AccountProfilePictureRequest): Promise<{ ok: boolean }>;
  deleteProfilePicture(body: { accountId: string }): Promise<{ ok: boolean }>;
  pairingCode(body: AccountPairingCodeRequest): Promise<{ pairingCode: string }>;
  presenceAvailable(body: { accountId: string }): Promise<{ ok: true }>;
  presenceUnavailable(body: { accountId: string }): Promise<{ ok: true }>;
  accountState(body: { accountId: string }): Promise<{ state: string }>;
  accountVersion(body: { accountId: string }): Promise<{ version: string }>;
  autoDownload(body: AccountAutoDownloadRequest): Promise<{ ok: true }>;
  callLink(body: CallLinkRequest): Promise<{ url: string }>;
  createScheduledEvent(body: { accountId: string; chatId: string; name: string; startTime: string; description?: string; endTime?: string; location?: string; callType?: string; isEventCanceled?: boolean; quotedMessageId?: string }): Promise<{ messageId?: string }>;
  respondScheduledEvent(body: { accountId: string; response: number; eventMessageId: string }): Promise<{ ok: boolean }>;
  createChannel(body: ChannelCreateRequest): Promise<unknown>;
  listChannels(accountId: string): Promise<{ channels: unknown[] }>;
  searchChannels(body: { accountId: string; searchText?: string; countryCodes?: string[]; skipSubscribedNewsletters?: boolean; view?: number; limit?: number }): Promise<{ channels: unknown[] }>;
  getChannelByInvite(body: ChannelInviteRequest): Promise<unknown>;
  updateChannel(body: ChannelUpdateRequest): Promise<Record<string, boolean>>;
  channelSubscribers(body: ChannelSubscribersRequest): Promise<{ subscribers: unknown[] }>;
  channelMessages(body: ChannelMessagesRequest): Promise<MessageListResponse>;
  subscribeChannel(body: ChannelSubscriptionRequest): Promise<{ ok: boolean }>;
  unsubscribeChannel(body: ChannelSubscriptionRequest): Promise<{ ok: boolean }>;
  muteChannel(body: ChannelActionRequest): Promise<{ ok: boolean }>;
  unmuteChannel(body: ChannelActionRequest): Promise<{ ok: boolean }>;
  seenChannel(body: ChannelActionRequest): Promise<{ ok: boolean }>;
  sendChannelMessage(body: ChannelSendRequest): Promise<{ messageId?: string }>;
  inviteChannelAdmin(body: ChannelAdminInviteRequest): Promise<{ ok: boolean }>;
  acceptChannelAdminInvite(body: ChannelActionRequest): Promise<{ ok: boolean }>;
  revokeChannelAdminInvite(body: ChannelAdminInviteRequest): Promise<{ ok: boolean }>;
  demoteChannelAdmin(body: ChannelAdminInviteRequest): Promise<{ ok: boolean }>;
  transferChannelOwnership(body: ChannelOwnershipRequest): Promise<{ ok: boolean }>;
  deleteChannel(body: ChannelActionRequest): Promise<{ ok: boolean }>;
}

export function createApiClient(config: KernelConfig): ApiClient {
  const baseUrl = `http://${config.api.host}:${config.api.port}`;
  const headers = config.api.authToken ? { authorization: `Bearer ${config.api.authToken}` } : undefined;

  return {
    async systemStatus() {
      return request<SystemStatusResponse>(`${baseUrl}/system/status`, headers);
    },
    async accounts() {
      return request<AccountListResponse>(`${baseUrl}/accounts`, headers);
    },
    async workflows() {
      return request<WorkflowListResponse>(`${baseUrl}/workflows`, headers);
    },
    async workflowProviders() {
      return request<WorkflowProviderTypesResponse>(`${baseUrl}/workflow-providers`, headers);
    },
    async validateWorkflow(body) {
      return post<WorkflowValidationResponse>(`${baseUrl}/workflows/validate`, headers, body);
    },
    async upsertWorkflow(body) {
      return post(`${baseUrl}/workflows`, headers, body);
    },
    async testWorkflow(body) {
      return post(`${baseUrl}/workflows/test`, headers, body);
    },
    async workflowExecutions() {
      return request<WorkflowExecutionListResponse>(`${baseUrl}/workflow-executions`, headers);
    },
    async webhooks() {
      return request<WebhookListResponse>(`${baseUrl}/webhooks`, headers);
    },
    async webhookDeliveries() {
      return request<WebhookDeliveryListResponse>(`${baseUrl}/webhook-deliveries`, headers);
    },
    async upsertWebhook(body) {
      return post(`${baseUrl}/webhooks`, headers, body);
    },
    async removeWebhook(body) {
      return request(`${baseUrl}/webhooks`, headers, {
        method: "DELETE",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json", ...(headers ?? {}) }
      });
    },
    async replayWebhookDelivery(body) {
      return post(`${baseUrl}/webhooks/replay`, headers, body);
    },
    async testWebhookEvent(body) {
      return post(`${baseUrl}/webhooks/test`, headers, body);
    },
    async messages(accountId?: string) {
      const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
      return request<MessageListResponse>(`${baseUrl}/messages${query}`, headers);
    },
    async sendMessage(body) {
      return request<{ ok: true }>(`${baseUrl}/messages/send`, headers, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json", ...(headers ?? {}) }
      });
    },
    async sendMedia(body) {
      return post(`${baseUrl}/messages/send-media`, headers, body);
    },
    async sendContacts(body) {
      return post(`${baseUrl}/messages/send-contacts`, headers, body);
    },
    async sendLocation(body) {
      return post(`${baseUrl}/messages/send-location`, headers, body);
    },
    async reply(body) {
      return post(`${baseUrl}/messages/reply`, headers, body);
    },
    async forward(body) {
      return post(`${baseUrl}/messages/forward`, headers, body);
    },
    async editMessage(body) {
      return post(`${baseUrl}/messages/edit`, headers, body);
    },
    async deleteMessage(body) {
      return post(`${baseUrl}/messages/delete`, headers, body);
    },
    async starMessage(body) {
      return post(`${baseUrl}/messages/star`, headers, body);
    },
    async unstarMessage(body) {
      return post(`${baseUrl}/messages/unstar`, headers, body);
    },
    async pinMessage(body) {
      return post(`${baseUrl}/messages/pin`, headers, body);
    },
    async unpinMessage(body) {
      return post(`${baseUrl}/messages/unpin`, headers, body);
    },
    async messageInfo(body) {
      return post(`${baseUrl}/messages/info`, headers, body);
    },
    async messageReactions(body) {
      return post(`${baseUrl}/messages/reactions`, headers, body);
    },
    async messagePollVotes(body) {
      return post(`${baseUrl}/messages/polls/votes`, headers, body);
    },
    async react(body) {
      return post(`${baseUrl}/messages/react`, headers, body);
    },
    async createPoll(body) {
      return post(`${baseUrl}/messages/polls`, headers, body);
    },
    async votePoll(body) {
      return post(`${baseUrl}/messages/polls/vote`, headers, body);
    },
    async labels(accountId) {
      return request(`${baseUrl}/labels?accountId=${encodeURIComponent(accountId)}`, headers);
    },
    async labelInfo(body) {
      return post(`${baseUrl}/labels/info`, headers, body);
    },
    async chatsByLabel(body) {
      return post(`${baseUrl}/labels/chats`, headers, body);
    },
    async chatLabels(body) {
      return post(`${baseUrl}/labels/chat-labels`, headers, body);
    },
    async updateChatLabels(body) {
      return post(`${baseUrl}/labels/update-chats`, headers, body);
    },
    async broadcasts(accountId) {
      return request(`${baseUrl}/broadcasts?accountId=${encodeURIComponent(accountId)}`, headers);
    },
    async broadcastInfo(body) {
      return post(`${baseUrl}/broadcasts/info`, headers, body);
    },
    async chats(accountId) {
      return request(`${baseUrl}/chats?accountId=${encodeURIComponent(accountId)}`, headers);
    },
    async chatInfo(body) {
      return post(`${baseUrl}/chats/info`, headers, body);
    },
    async chatMessages(body) {
      return post(`${baseUrl}/chats/messages`, headers, body);
    },
    async chatSearchMessages(body) {
      return post(`${baseUrl}/chats/search-messages`, headers, body);
    },
    async archiveChat(body) {
      return post(`${baseUrl}/chats/archive`, headers, body);
    },
    async unarchiveChat(body) {
      return post(`${baseUrl}/chats/unarchive`, headers, body);
    },
    async pinChat(body) {
      return post(`${baseUrl}/chats/pin`, headers, body);
    },
    async unpinChat(body) {
      return post(`${baseUrl}/chats/unpin`, headers, body);
    },
    async markChatUnread(body) {
      return post(`${baseUrl}/chats/mark-unread`, headers, body);
    },
    async sendSeen(body) {
      return post(`${baseUrl}/chats/seen`, headers, body);
    },
    async sendTyping(body) {
      return post(`${baseUrl}/chats/typing`, headers, body);
    },
    async sendRecording(body) {
      return post(`${baseUrl}/chats/recording`, headers, body);
    },
    async clearChatState(body) {
      return post(`${baseUrl}/chats/clear-state`, headers, body);
    },
    async clearChatMessages(body) {
      return post(`${baseUrl}/chats/clear-messages`, headers, body);
    },
    async deleteChat(body) {
      return post(`${baseUrl}/chats/delete`, headers, body);
    },
    async syncHistory(body) {
      return post(`${baseUrl}/chats/sync-history`, headers, body);
    },
    async joinGroupByInvite(body) {
      return post(`${baseUrl}/groups/join-by-invite`, headers, body);
    },
    async getInviteInfo(body) {
      return post(`${baseUrl}/groups/invite-info`, headers, body);
    },
    async acceptGroupV4Invite(body) {
      return post(`${baseUrl}/groups/accept-v4-invite`, headers, body);
    },
    async createGroup(body) {
      return post(`${baseUrl}/groups/create`, headers, body);
    },
    async getGroupInvite(body) {
      return post(`${baseUrl}/groups/invite-code`, headers, body);
    },
    async revokeGroupInvite(body) {
      return post(`${baseUrl}/groups/invite-revoke`, headers, body);
    },
    async getGroupInfo(body) {
      return post(`${baseUrl}/groups/info`, headers, body);
    },
    async leaveGroup(body) {
      return post(`${baseUrl}/groups/leave`, headers, body);
    },
    async groupMembershipRequests(body) {
      return post(`${baseUrl}/groups/membership-requests`, headers, body);
    },
    async approveGroupMembershipRequests(body) {
      return post(`${baseUrl}/groups/membership-requests/approve`, headers, body);
    },
    async rejectGroupMembershipRequests(body) {
      return post(`${baseUrl}/groups/membership-requests/reject`, headers, body);
    },
    async updateGroup(body) {
      return post(`${baseUrl}/groups/update`, headers, body);
    },
    async addGroupParticipants(body) {
      return post(`${baseUrl}/groups/participants/add`, headers, body);
    },
    async kickGroupParticipants(body) {
      return post(`${baseUrl}/groups/participants/kick`, headers, body);
    },
    async promoteGroupParticipants(body) {
      return post(`${baseUrl}/groups/participants/promote`, headers, body);
    },
    async demoteGroupParticipants(body) {
      return post(`${baseUrl}/groups/participants/demote`, headers, body);
    },
    async muteChat(body) {
      return post(`${baseUrl}/chats/mute`, headers, body);
    },
    async unmuteChat(body) {
      return post(`${baseUrl}/chats/unmute`, headers, body);
    },
    async blockContact(body) {
      return post(`${baseUrl}/contacts/block`, headers, body);
    },
    async unblockContact(body) {
      return post(`${baseUrl}/contacts/unblock`, headers, body);
    },
    async contacts(accountId) {
      return request(`${baseUrl}/contacts?accountId=${encodeURIComponent(accountId)}`, headers);
    },
    async blockedContacts(accountId) {
      return request(`${baseUrl}/contacts/blocked?accountId=${encodeURIComponent(accountId)}`, headers);
    },
    async contactInfo(body) {
      return post(`${baseUrl}/contacts/info`, headers, body);
    },
    async commonGroups(body) {
      return post(`${baseUrl}/contacts/common-groups`, headers, body);
    },
    async formattedNumber(body) {
      return post(`${baseUrl}/contacts/formatted-number`, headers, body);
    },
    async countryCode(body) {
      return post(`${baseUrl}/contacts/country-code`, headers, body);
    },
    async isRegistered(body) {
      return post(`${baseUrl}/contacts/is-registered`, headers, body);
    },
    async numberId(body) {
      return post(`${baseUrl}/contacts/number-id`, headers, body);
    },
    async contactDeviceCount(body) {
      return post(`${baseUrl}/contacts/device-count`, headers, body);
    },
    async profilePicture(body) {
      return post(`${baseUrl}/contacts/profile-picture`, headers, body);
    },
    async saveAddressBookContact(body) {
      return post(`${baseUrl}/contacts/address-book`, headers, body);
    },
    async deleteAddressBookContact(body) {
      return request(`${baseUrl}/contacts/address-book`, headers, {
        method: "DELETE",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json", ...(headers ?? {}) }
      });
    },
    async contactLidPhone(body) {
      return post(`${baseUrl}/contacts/lid-phone`, headers, body);
    },
    async addCustomerNote(body) {
      return post(`${baseUrl}/contacts/customer-note`, headers, body);
    },
    async customerNote(body) {
      return post(`${baseUrl}/contacts/customer-note/get`, headers, body);
    },
    async setStatus(body) {
      return post(`${baseUrl}/accounts/status`, headers, body);
    },
    async revokeStatusMessage(body) {
      return post(`${baseUrl}/accounts/status/revoke`, headers, body);
    },
    async setDisplayName(body) {
      return post(`${baseUrl}/accounts/display-name`, headers, body);
    },
    async setProfilePicture(body) {
      return post(`${baseUrl}/accounts/profile-picture`, headers, body);
    },
    async deleteProfilePicture(body) {
      return request(`${baseUrl}/accounts/profile-picture`, headers, {
        method: "DELETE",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json", ...(headers ?? {}) }
      });
    },
    async pairingCode(body) {
      return post(`${baseUrl}/accounts/pairing-code`, headers, body);
    },
    async presenceAvailable(body) {
      return post(`${baseUrl}/accounts/presence/available`, headers, body);
    },
    async presenceUnavailable(body) {
      return post(`${baseUrl}/accounts/presence/unavailable`, headers, body);
    },
    async accountState(body) {
      return post(`${baseUrl}/accounts/state`, headers, body);
    },
    async accountVersion(body) {
      return post(`${baseUrl}/accounts/version`, headers, body);
    },
    async autoDownload(body) {
      return post(`${baseUrl}/accounts/auto-download`, headers, body);
    },
    async callLink(body) {
      return post(`${baseUrl}/accounts/call-link`, headers, body);
    },
    async createScheduledEvent(body) {
      return post(`${baseUrl}/events/scheduled`, headers, body);
    },
    async respondScheduledEvent(body) {
      return post(`${baseUrl}/events/scheduled/respond`, headers, body);
    },
    async createChannel(body) {
      return post(`${baseUrl}/channels`, headers, body);
    },
    async listChannels(accountId) {
      return request(`${baseUrl}/channels?accountId=${encodeURIComponent(accountId)}`, headers);
    },
    async searchChannels(body) {
      return post(`${baseUrl}/channels/search`, headers, body);
    },
    async getChannelByInvite(body) {
      return post(`${baseUrl}/channels/by-invite`, headers, body);
    },
    async updateChannel(body) {
      return post(`${baseUrl}/channels/update`, headers, body);
    },
    async channelSubscribers(body) {
      return post(`${baseUrl}/channels/subscribers`, headers, body);
    },
    async channelMessages(body) {
      return post(`${baseUrl}/channels/messages`, headers, body);
    },
    async subscribeChannel(body) {
      return post(`${baseUrl}/channels/subscribe`, headers, body);
    },
    async unsubscribeChannel(body) {
      return post(`${baseUrl}/channels/unsubscribe`, headers, body);
    },
    async muteChannel(body) {
      return post(`${baseUrl}/channels/mute`, headers, body);
    },
    async unmuteChannel(body) {
      return post(`${baseUrl}/channels/unmute`, headers, body);
    },
    async seenChannel(body) {
      return post(`${baseUrl}/channels/seen`, headers, body);
    },
    async sendChannelMessage(body) {
      return post(`${baseUrl}/channels/send`, headers, body);
    },
    async inviteChannelAdmin(body) {
      return post(`${baseUrl}/channels/admin/invite`, headers, body);
    },
    async acceptChannelAdminInvite(body) {
      return post(`${baseUrl}/channels/admin/accept`, headers, body);
    },
    async revokeChannelAdminInvite(body) {
      return post(`${baseUrl}/channels/admin/revoke`, headers, body);
    },
    async demoteChannelAdmin(body) {
      return post(`${baseUrl}/channels/admin/demote`, headers, body);
    },
    async transferChannelOwnership(body) {
      return post(`${baseUrl}/channels/transfer-ownership`, headers, body);
    },
    async deleteChannel(body) {
      return post(`${baseUrl}/channels/delete`, headers, body);
    }
  };
}

async function post<T>(url: string, headers: Record<string, string> | undefined, body: unknown): Promise<T> {
  return request<T>(url, headers, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...(headers ?? {}) }
  });
}

async function request<T>(url: string, headers?: Record<string, string>, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.headers ?? headers
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}
