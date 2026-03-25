import type {
  AccountAutoDownloadRequest,
  AccountDisplayNameRequest,
  AccountPairingCodeRequest,
  AccountProfilePictureRequest,
  AddressBookContactDeleteRequest,
  AddressBookContactUpsertRequest,
  ApiKeyCreateRequest,
  ApiKeyRotateRequest,
  ApiKeyUpdateRequest,
  CallLinkRequest,
  ChannelActionRequest,
  ChannelAdminInviteRequest,
  ChannelCreateRequest,
  ChannelInviteRequest,
  ChannelMessagesRequest,
  ChannelOwnershipRequest,
  ChannelSubscribersRequest,
  ChannelUpdateRequest,
  ChatActionRequest,
  ChatMuteRequest,
  ContactActionRequest,
  GroupCreateRequest,
  GroupInviteRequest,
  GroupLeaveRequest,
  GroupMembershipRequest,
  GroupParticipantsRequest,
  GroupSettingsRequest,
  GroupV4InviteRequest,
  JoinGroupInviteRequest,
  KernelConfig,
  MessageActionRequest,
  PinMessageRequest,
  ReactToMessageRequest,
  ReplyToMessageRequest,
  SearchMessagesRequest,
  StatusRevokeRequest,
  UnifiedChannelSendRequest,
  UnifiedMessageSendRequest
} from "@wato/core";
import type {
  AccountListResponse,
  ApiKeyListResponse,
  BroadcastListResponse,
  ChannelListResponse,
  ChatListResponse,
  ContactListResponse,
  LabelListResponse,
  MessageListResponse,
  SystemStatusResponse,
  WebhookDeliveryListResponse,
  WebhookListResponse,
  WorkflowExecutionListResponse,
  WorkflowListResponse,
  WorkflowProviderTypesResponse,
  WorkflowTestBody,
  WorkflowValidationResponse
} from "@wato/api-types";

export interface ApiClient {
  systemStatus(): Promise<SystemStatusResponse>;
  reloadSystem(): Promise<{ ok: true }>;
  apiKeys(): Promise<ApiKeyListResponse>;
  getApiKey(apiKeyId: string): Promise<{ apiKey: import("@wato/core").ApiKeyRecord }>;
  createApiKey(body: ApiKeyCreateRequest): Promise<{ apiKey: import("@wato/core").ApiKeyRecord; key: string }>;
  updateApiKey(apiKeyId: string, body: Omit<ApiKeyUpdateRequest, "apiKeyId">): Promise<{ apiKey: import("@wato/core").ApiKeyRecord }>;
  rotateApiKey(body: ApiKeyRotateRequest): Promise<{ apiKey: import("@wato/core").ApiKeyRecord; key: string }>;
  deleteApiKey(apiKeyId: string): Promise<{ ok: true }>;
  accounts(): Promise<AccountListResponse>;
  getAccount(accountId: string): Promise<{ account: import("@wato/core").AccountRecord }>;
  loginQr(accountId: string): Promise<{ account: import("@wato/core").AccountRecord; qrCode?: string }>;
  pairingCode(body: AccountPairingCodeRequest): Promise<{ pairingCode: string }>;
  setStatus(body: { accountId: string; status: string }): Promise<{ ok: true }>;
  revokeStatusMessage(body: StatusRevokeRequest): Promise<{ ok: true }>;
  setDisplayName(body: AccountDisplayNameRequest): Promise<{ ok: boolean }>;
  setProfilePicture(body: AccountProfilePictureRequest): Promise<{ ok: boolean }>;
  deleteProfilePicture(accountId: string): Promise<{ ok: boolean }>;
  presenceSet(body: { accountId: string; presence: "available" | "unavailable" }): Promise<{ ok: true }>;
  accountState(accountId: string): Promise<{ state: string }>;
  accountVersion(accountId: string): Promise<{ version: string }>;
  autoDownload(body: AccountAutoDownloadRequest): Promise<{ ok: true }>;
  callLink(body: CallLinkRequest): Promise<{ url: string }>;
  messages(accountId?: string): Promise<MessageListResponse>;
  getMessage(body: MessageActionRequest): Promise<{ message: import("@wato/core").MessageEnvelope }>;
  sendMessage(body: UnifiedMessageSendRequest): Promise<{ messageId?: string }>;
  reply(body: ReplyToMessageRequest): Promise<{ messageId?: string }>;
  forward(body: import("@wato/core").ForwardMessageRequest): Promise<{ ok: true }>;
  editMessage(body: import("@wato/core").EditMessageRequest): Promise<{ messageId?: string } | null>;
  deleteMessage(body: import("@wato/core").DeleteMessageRequest): Promise<{ ok: true }>;
  react(body: ReactToMessageRequest): Promise<{ ok: true }>;
  messageReactions(body: MessageActionRequest): Promise<unknown>;
  messagePollVotes(body: MessageActionRequest): Promise<unknown>;
  starMessage(body: MessageActionRequest): Promise<{ ok: true }>;
  unstarMessage(body: MessageActionRequest): Promise<{ ok: true }>;
  pinMessage(body: PinMessageRequest): Promise<{ ok: boolean }>;
  unpinMessage(body: MessageActionRequest): Promise<{ ok: boolean }>;
  votePoll(body: { accountId: string; messageId: string; selectedOptions: string[] }): Promise<{ ok: true }>;
  respondScheduledEvent(body: { accountId: string; eventMessageId: string; response: number }): Promise<{ ok: boolean }>;
  chats(accountId: string): Promise<ChatListResponse>;
  chatInfo(body: ChatActionRequest): Promise<unknown>;
  chatMessages(body: import("@wato/core").FetchChatMessagesRequest): Promise<MessageListResponse>;
  chatSearchMessages(body: SearchMessagesRequest): Promise<MessageListResponse>;
  archiveChat(body: ChatActionRequest): Promise<{ ok: boolean }>;
  unarchiveChat(body: ChatActionRequest): Promise<{ ok: boolean }>;
  pinChat(body: ChatActionRequest): Promise<{ ok: boolean }>;
  unpinChat(body: ChatActionRequest): Promise<{ ok: boolean }>;
  muteChat(body: ChatMuteRequest): Promise<unknown>;
  unmuteChat(body: ChatActionRequest): Promise<unknown>;
  markChatUnread(body: ChatActionRequest): Promise<{ ok: true }>;
  sendSeen(body: ChatActionRequest): Promise<{ ok: boolean }>;
  sendTyping(body: ChatActionRequest, active: boolean): Promise<{ ok: true }>;
  sendRecording(body: ChatActionRequest, active: boolean): Promise<{ ok: true }>;
  clearChatMessages(body: ChatActionRequest): Promise<{ ok: boolean }>;
  deleteChat(body: ChatActionRequest): Promise<{ ok: boolean }>;
  syncHistory(body: ChatActionRequest): Promise<{ ok: boolean }>;
  createGroup(body: GroupCreateRequest): Promise<unknown>;
  getGroupInfo(body: GroupInviteRequest): Promise<unknown>;
  updateGroup(body: GroupSettingsRequest): Promise<Record<string, boolean>>;
  leaveGroup(body: GroupLeaveRequest): Promise<{ ok: true }>;
  joinGroupByInvite(body: JoinGroupInviteRequest): Promise<{ groupId: string }>;
  getInviteInfo(body: { accountId: string; inviteCode: string }): Promise<unknown>;
  acceptGroupV4Invite(body: GroupV4InviteRequest): Promise<{ status: number }>;
  getGroupInvite(body: GroupInviteRequest): Promise<{ inviteCode: string }>;
  revokeGroupInvite(body: GroupInviteRequest): Promise<{ ok: true }>;
  groupMembershipRequests(body: GroupInviteRequest): Promise<{ requests: unknown[] }>;
  approveGroupMembershipRequests(body: GroupMembershipRequest): Promise<{ results: unknown[] }>;
  rejectGroupMembershipRequests(body: GroupMembershipRequest): Promise<{ results: unknown[] }>;
  addGroupParticipants(body: GroupParticipantsRequest): Promise<unknown>;
  kickGroupParticipants(body: GroupParticipantsRequest): Promise<unknown>;
  promoteGroupParticipants(body: GroupParticipantsRequest): Promise<unknown>;
  demoteGroupParticipants(body: GroupParticipantsRequest): Promise<unknown>;
  listChannels(accountId: string): Promise<ChannelListResponse>;
  searchChannels(body: import("@wato/core").ChannelSearchRequest): Promise<ChannelListResponse>;
  createChannel(body: ChannelCreateRequest): Promise<unknown>;
  getChannel(body: ChannelActionRequest): Promise<{ channel: import("@wato/core").ChannelSummary }>;
  getChannelByInvite(body: ChannelInviteRequest): Promise<unknown>;
  updateChannel(body: ChannelUpdateRequest): Promise<Record<string, boolean>>;
  channelSubscribers(body: ChannelSubscribersRequest): Promise<{ subscribers: unknown[] }>;
  channelMessages(body: ChannelMessagesRequest): Promise<MessageListResponse>;
  sendChannelMessage(body: UnifiedChannelSendRequest): Promise<{ messageId?: string }>;
  subscribeChannel(body: ChannelActionRequest): Promise<{ ok: boolean }>;
  unsubscribeChannel(body: ChannelActionRequest): Promise<{ ok: boolean }>;
  muteChannel(body: ChannelActionRequest): Promise<{ ok: boolean }>;
  unmuteChannel(body: ChannelActionRequest): Promise<{ ok: boolean }>;
  seenChannel(body: ChannelActionRequest): Promise<{ ok: boolean }>;
  inviteChannelAdmin(body: ChannelAdminInviteRequest): Promise<{ ok: boolean }>;
  acceptChannelAdminInvite(body: ChannelActionRequest): Promise<{ ok: boolean }>;
  revokeChannelAdminInvite(body: ChannelAdminInviteRequest): Promise<{ ok: boolean }>;
  demoteChannelAdmin(body: ChannelAdminInviteRequest): Promise<{ ok: boolean }>;
  transferChannelOwnership(body: ChannelOwnershipRequest): Promise<{ ok: boolean }>;
  deleteChannel(body: ChannelActionRequest): Promise<{ ok: boolean }>;
  labels(accountId: string): Promise<LabelListResponse>;
  labelInfo(body: { accountId: string; labelId: string }): Promise<unknown>;
  chatsByLabel(body: { accountId: string; labelId: string }): Promise<{ chats: unknown[] }>;
  chatLabels(body: ChatActionRequest): Promise<{ labels: unknown[] }>;
  updateChatLabels(body: { accountId: string; chatIds: string[]; labelIds: Array<string | number> }): Promise<{ ok: true }>;
  broadcasts(accountId: string): Promise<BroadcastListResponse>;
  broadcastInfo(body: { accountId: string; broadcastId: string }): Promise<unknown>;
  contacts(accountId: string): Promise<ContactListResponse>;
  blockedContacts(accountId: string): Promise<ContactListResponse>;
  contactInfo(body: ContactActionRequest): Promise<unknown>;
  blockContact(body: ContactActionRequest): Promise<{ ok: boolean }>;
  unblockContact(body: ContactActionRequest): Promise<{ ok: boolean }>;
  commonGroups(body: ContactActionRequest): Promise<{ groups: string[] }>;
  formattedNumber(body: { accountId: string; value: string }): Promise<{ formattedNumber: string }>;
  countryCode(body: { accountId: string; value: string }): Promise<{ countryCode: string }>;
  numberId(body: { accountId: string; number: string }): Promise<{ numberId: string | null }>;
  isRegistered(body: ContactActionRequest): Promise<{ registered: boolean }>;
  contactDeviceCount(body: ContactActionRequest): Promise<{ count: number }>;
  profilePicture(body: ContactActionRequest): Promise<{ url: string | null }>;
  saveAddressBookContact(body: AddressBookContactUpsertRequest): Promise<{ ok: true }>;
  deleteAddressBookContact(body: AddressBookContactDeleteRequest): Promise<{ ok: true }>;
  contactLidPhone(body: { accountId: string; userIds: string[] }): Promise<{ records: Array<{ lid: string; pn: string }> }>;
  addCustomerNote(body: { accountId: string; userId: string; note: string }): Promise<{ ok: true }>;
  customerNote(body: { accountId: string; userId: string }): Promise<unknown>;
  workflows(): Promise<WorkflowListResponse>;
  workflowProviders(): Promise<WorkflowProviderTypesResponse>;
  workflowExecutions(): Promise<WorkflowExecutionListResponse>;
  validateWorkflow(body: Record<string, unknown>): Promise<WorkflowValidationResponse>;
  upsertWorkflow(body: Record<string, unknown>): Promise<{ ok: true }>;
  testWorkflow(body: WorkflowTestBody): Promise<unknown>;
  webhooks(): Promise<WebhookListResponse>;
  webhookDeliveries(): Promise<WebhookDeliveryListResponse>;
  upsertWebhook(body: { id: string; url: string; secret?: string; enabled?: boolean; eventTypes?: string[]; accountIds?: string[]; headers?: Record<string, string> }): Promise<{ ok: true }>;
  removeWebhook(webhookId: string): Promise<{ ok: true }>;
  replayWebhookDelivery(deliveryId: string): Promise<{ ok: true }>;
  testWebhookEvent(body: { eventType: string; accountId?: string; payload?: unknown }): Promise<{ ok: true }>;
}

export function createApiClient(config: KernelConfig, options?: { signal?: AbortSignal }): ApiClient {
  const baseUrl = `http://${config.api.host}:${config.api.port}/v1`;
  const configuredApiKey = config.api.keys.find((item) => item.enabled !== false)?.key;
  const headers = configuredApiKey ? { authorization: `Bearer ${configuredApiKey}` } : undefined;
  const signal = options?.signal;
  const accountPath = (accountId: string) => `${baseUrl}/accounts/${encode(accountId)}`;
  const messagePath = (accountId: string, messageId: string) => `${accountPath(accountId)}/messages/${encode(messageId)}`;
  const chatPath = (accountId: string, chatId: string) => `${accountPath(accountId)}/chats/${encode(chatId)}`;
  const groupPath = (accountId: string, groupId: string) => `${accountPath(accountId)}/groups/${encode(groupId)}`;
  const channelPath = (accountId: string, channelId: string) => `${accountPath(accountId)}/channels/${encode(channelId)}`;
  const contactPath = (accountId: string, contactId: string) => `${accountPath(accountId)}/contacts/${encode(contactId)}`;

  return {
    systemStatus: () => request(`${baseUrl}/system`, headers, signal),
    reloadSystem: () => post(`${baseUrl}/system:reload`, headers, {}, signal),
    apiKeys: () => request(`${baseUrl}/system/keys`, headers, signal),
    getApiKey: (apiKeyId) => request(`${baseUrl}/system/keys/${encode(apiKeyId)}`, headers, signal),
    createApiKey: (body) => post(`${baseUrl}/system/keys`, headers, body, signal),
    updateApiKey: (apiKeyId, body) => patch(`${baseUrl}/system/keys/${encode(apiKeyId)}`, headers, body, signal),
    rotateApiKey: (body) => post(`${baseUrl}/system/keys/${encode(body.apiKeyId)}:rotate`, headers, body.key ? { key: body.key } : {}, signal),
    deleteApiKey: (apiKeyId) => del(`${baseUrl}/system/keys/${encode(apiKeyId)}`, headers, signal),
    accounts: () => request(`${baseUrl}/accounts`, headers, signal),
    getAccount: (accountId) => request(`${accountPath(accountId)}`, headers, signal),
    loginQr: (accountId) => post(`${accountPath(accountId)}/login/qr`, headers, {}, signal),
    pairingCode: (body) => post(`${accountPath(body.accountId)}/login/pairing-code`, headers, without(body, "accountId"), signal),
    setStatus: (body) => post(`${accountPath(body.accountId)}/profile/status`, headers, { text: body.status }, signal),
    revokeStatusMessage: (body) => del(`${accountPath(body.accountId)}/profile/status/${encode(body.messageId)}`, headers, signal),
    setDisplayName: (body) => post(`${accountPath(body.accountId)}/profile/name`, headers, { displayName: body.displayName }, signal),
    setProfilePicture: (body) => post(`${accountPath(body.accountId)}/profile/photo`, headers, { media: body.media }, signal),
    deleteProfilePicture: (accountId) => del(`${accountPath(accountId)}/profile/photo`, headers, signal),
    presenceSet: (body) => post(`${accountPath(body.accountId)}/presence`, headers, { presence: body.presence }, signal),
    accountState: (accountId) => request(`${accountPath(accountId)}/state`, headers, signal),
    accountVersion: (accountId) => request(`${accountPath(accountId)}/version`, headers, signal),
    autoDownload: (body) => patch(`${accountPath(body.accountId)}/settings/auto-download`, headers, without(body, "accountId"), signal),
    callLink: (body) => post(`${accountPath(body.accountId)}/call-links`, headers, without(body, "accountId"), signal),
    messages: (accountId) => request(`${baseUrl}/messages${query(accountId ? { accountId } : {})}`, headers, signal),
    getMessage: (body) => request(`${messagePath(body.accountId, body.messageId)}`, headers, signal),
    sendMessage: (body) => post(`${chatPath(body.accountId, body.chatId)}/messages`, headers, without(body, "accountId", "chatId"), signal),
    reply: (body) => post(`${messagePath(body.accountId, body.messageId)}:reply`, headers, without(body, "accountId", "messageId"), signal),
    forward: (body) => post(`${messagePath(body.accountId, body.messageId)}:forward`, headers, { chatId: body.chatId }, signal),
    editMessage: (body) => patch(`${messagePath(body.accountId, body.messageId)}`, headers, { text: body.text }, signal),
    deleteMessage: (body) => del(`${messagePath(body.accountId, body.messageId)}${query({ everyone: body.everyone, clearMedia: body.clearMedia })}`, headers, signal),
    react: (body) => put(`${messagePath(body.accountId, body.messageId)}/reaction`, headers, { reaction: body.reaction }, signal),
    messageReactions: (body) => request(`${messagePath(body.accountId, body.messageId)}/reaction`, headers, signal),
    messagePollVotes: (body) => request(`${messagePath(body.accountId, body.messageId)}/poll-votes`, headers, signal),
    starMessage: (body) => put(`${messagePath(body.accountId, body.messageId)}/star`, headers, {}, signal),
    unstarMessage: (body) => del(`${messagePath(body.accountId, body.messageId)}/star`, headers, signal),
    pinMessage: (body) => put(`${messagePath(body.accountId, body.messageId)}/pin`, headers, { duration: body.duration }, signal),
    unpinMessage: (body) => del(`${messagePath(body.accountId, body.messageId)}/pin`, headers, signal),
    votePoll: (body) => post(`${messagePath(body.accountId, body.messageId)}/poll-votes`, headers, { selectedOptions: body.selectedOptions }, signal),
    respondScheduledEvent: (body) => post(`${messagePath(body.accountId, body.eventMessageId)}/event-response`, headers, { response: body.response }, signal),
    chats: (accountId) => request(`${accountPath(accountId)}/chats`, headers, signal),
    chatInfo: (body) => request(`${chatPath(body.accountId, body.chatId)}`, headers, signal),
    chatMessages: (body) => request(`${chatPath(body.accountId, body.chatId)}/messages${query({ limit: body.limit, fromMe: body.fromMe })}`, headers, signal),
    chatSearchMessages: (body) => request(`${accountPath(body.accountId)}/messages:search${query({ query: body.query, chatId: body.chatId, page: body.page, limit: body.limit })}`, headers, signal),
    archiveChat: (body) => put(`${chatPath(body.accountId, body.chatId)}/archive`, headers, {}, signal),
    unarchiveChat: (body) => del(`${chatPath(body.accountId, body.chatId)}/archive`, headers, signal),
    pinChat: (body) => put(`${chatPath(body.accountId, body.chatId)}/pin`, headers, {}, signal),
    unpinChat: (body) => del(`${chatPath(body.accountId, body.chatId)}/pin`, headers, signal),
    muteChat: (body) => put(`${chatPath(body.accountId, body.chatId)}/mute`, headers, body.until ? { until: body.until } : {}, signal),
    unmuteChat: (body) => del(`${chatPath(body.accountId, body.chatId)}/mute`, headers, signal),
    markChatUnread: (body) => post(`${chatPath(body.accountId, body.chatId)}/read:mark-unread`, headers, {}, signal),
    sendSeen: (body) => post(`${chatPath(body.accountId, body.chatId)}/read:seen`, headers, {}, signal),
    sendTyping: (body, active) => post(`${chatPath(body.accountId, body.chatId)}/activity/typing:${active ? "start" : "stop"}`, headers, {}, signal),
    sendRecording: (body, active) => post(`${chatPath(body.accountId, body.chatId)}/activity/recording:${active ? "start" : "stop"}`, headers, {}, signal),
    clearChatMessages: (body) => del(`${chatPath(body.accountId, body.chatId)}/messages`, headers, signal),
    deleteChat: (body) => del(`${chatPath(body.accountId, body.chatId)}`, headers, signal),
    syncHistory: (body) => post(`${chatPath(body.accountId, body.chatId)}/history:sync`, headers, {}, signal),
    createGroup: (body) => post(`${accountPath(body.accountId)}/groups`, headers, without(body, "accountId"), signal),
    getGroupInfo: (body) => request(`${groupPath(body.accountId, body.groupId)}`, headers, signal),
    updateGroup: (body) => patch(`${groupPath(body.accountId, body.groupId)}`, headers, without(body, "accountId", "groupId"), signal),
    leaveGroup: (body) => post(`${groupPath(body.accountId, body.groupId)}:leave`, headers, {}, signal),
    joinGroupByInvite: (body) => post(`${accountPath(body.accountId)}/group-invites/${encode(body.inviteCode)}:join`, headers, {}, signal),
    getInviteInfo: (body) => request(`${accountPath(body.accountId)}/group-invites/${encode(body.inviteCode)}`, headers, signal),
    acceptGroupV4Invite: (body) => post(`${accountPath(body.accountId)}/group-invites/${encode(body.inviteCode)}:private-accept`, headers, without(body, "accountId", "inviteCode"), signal),
    getGroupInvite: (body) => request(`${groupPath(body.accountId, body.groupId)}/invite-code`, headers, signal),
    revokeGroupInvite: (body) => del(`${groupPath(body.accountId, body.groupId)}/invite-code`, headers, signal),
    groupMembershipRequests: (body) => request(`${groupPath(body.accountId, body.groupId)}/membership-requests`, headers, signal),
    approveGroupMembershipRequests: (body) => post(`${groupPath(body.accountId, body.groupId)}/membership-requests:approve`, headers, without(body, "accountId", "groupId"), signal),
    rejectGroupMembershipRequests: (body) => post(`${groupPath(body.accountId, body.groupId)}/membership-requests:reject`, headers, without(body, "accountId", "groupId"), signal),
    addGroupParticipants: (body) => post(`${groupPath(body.accountId, body.groupId)}/participants:add`, headers, { participantIds: body.participantIds, comment: body.comment }, signal),
    kickGroupParticipants: (body) => post(`${groupPath(body.accountId, body.groupId)}/participants:remove`, headers, { participantIds: body.participantIds, comment: body.comment }, signal),
    promoteGroupParticipants: (body) => post(`${groupPath(body.accountId, body.groupId)}/participants:promote`, headers, { participantIds: body.participantIds, comment: body.comment }, signal),
    demoteGroupParticipants: (body) => post(`${groupPath(body.accountId, body.groupId)}/participants:demote`, headers, { participantIds: body.participantIds, comment: body.comment }, signal),
    listChannels: (accountId) => request(`${accountPath(accountId)}/channels`, headers, signal),
    searchChannels: (body) => request(`${accountPath(body.accountId)}/channels:search${query(without(body, "accountId"))}`, headers, signal),
    createChannel: (body) => post(`${accountPath(body.accountId)}/channels`, headers, without(body, "accountId"), signal),
    getChannel: (body) => request(`${channelPath(body.accountId, body.channelId)}`, headers, signal),
    getChannelByInvite: (body) => request(`${accountPath(body.accountId)}/channels:by-invite${query({ inviteCode: body.inviteCode })}`, headers, signal),
    updateChannel: (body) => patch(`${channelPath(body.accountId, body.channelId)}`, headers, without(body, "accountId", "channelId"), signal),
    channelSubscribers: (body) => request(`${channelPath(body.accountId, body.channelId)}/subscribers${query({ limit: body.limit })}`, headers, signal),
    channelMessages: (body) => request(`${channelPath(body.accountId, body.channelId)}/messages${query({ limit: body.limit, fromMe: body.fromMe })}`, headers, signal),
    sendChannelMessage: (body) => post(`${channelPath(body.accountId, body.channelId)}/messages`, headers, without(body, "accountId", "channelId"), signal),
    subscribeChannel: (body) => put(`${channelPath(body.accountId, body.channelId)}/subscription`, headers, {}, signal),
    unsubscribeChannel: (body) => del(`${channelPath(body.accountId, body.channelId)}/subscription`, headers, signal),
    muteChannel: (body) => put(`${channelPath(body.accountId, body.channelId)}/mute`, headers, {}, signal),
    unmuteChannel: (body) => del(`${channelPath(body.accountId, body.channelId)}/mute`, headers, signal),
    seenChannel: (body) => post(`${channelPath(body.accountId, body.channelId)}/read:seen`, headers, {}, signal),
    inviteChannelAdmin: (body) => post(`${channelPath(body.accountId, body.channelId)}/admins:invite`, headers, { userId: body.userId, comment: body.comment }, signal),
    acceptChannelAdminInvite: (body) => post(`${channelPath(body.accountId, body.channelId)}/admins:accept`, headers, {}, signal),
    revokeChannelAdminInvite: (body) => post(`${channelPath(body.accountId, body.channelId)}/admins:revoke-invite`, headers, { userId: body.userId, comment: body.comment }, signal),
    demoteChannelAdmin: (body) => post(`${channelPath(body.accountId, body.channelId)}/admins:demote`, headers, { userId: body.userId }, signal),
    transferChannelOwnership: (body) => post(`${channelPath(body.accountId, body.channelId)}/ownership:transfer`, headers, { newOwnerId: body.newOwnerId, shouldDismissSelfAsAdmin: body.shouldDismissSelfAsAdmin }, signal),
    deleteChannel: (body) => del(`${channelPath(body.accountId, body.channelId)}`, headers, signal),
    labels: (accountId) => request(`${accountPath(accountId)}/labels`, headers, signal),
    labelInfo: (body) => request(`${accountPath(body.accountId)}/labels/${encode(body.labelId)}`, headers, signal),
    chatsByLabel: (body) => request(`${accountPath(body.accountId)}/labels/${encode(body.labelId)}/chats`, headers, signal),
    chatLabels: (body) => request(`${chatPath(body.accountId, body.chatId)}/labels`, headers, signal),
    updateChatLabels: (body) => put(`${accountPath(body.accountId)}/chat-labels`, headers, { chatIds: body.chatIds, labelIds: body.labelIds }, signal),
    broadcasts: (accountId) => request(`${accountPath(accountId)}/broadcasts`, headers, signal),
    broadcastInfo: (body) => request(`${accountPath(body.accountId)}/broadcasts/${encode(body.broadcastId)}`, headers, signal),
    contacts: (accountId) => request(`${accountPath(accountId)}/contacts`, headers, signal),
    blockedContacts: (accountId) => request(`${accountPath(accountId)}/contacts/blocked`, headers, signal),
    contactInfo: (body) => request(`${contactPath(body.accountId, body.contactId)}`, headers, signal),
    blockContact: (body) => put(`${contactPath(body.accountId, body.contactId)}/block`, headers, {}, signal),
    unblockContact: (body) => del(`${contactPath(body.accountId, body.contactId)}/block`, headers, signal),
    commonGroups: (body) => request(`${contactPath(body.accountId, body.contactId)}/groups/common`, headers, signal),
    formattedNumber: (body) => request(`${accountPath(body.accountId)}/numbers:format${query({ value: body.value })}`, headers, signal),
    countryCode: (body) => request(`${accountPath(body.accountId)}/numbers:country-code${query({ value: body.value })}`, headers, signal),
    numberId: (body) => request(`${accountPath(body.accountId)}/numbers:resolve-id${query({ number: body.number })}`, headers, signal),
    isRegistered: (body) => request(`${contactPath(body.accountId, body.contactId)}/registration`, headers, signal),
    contactDeviceCount: (body) => request(`${contactPath(body.accountId, body.contactId)}/device-count`, headers, signal),
    profilePicture: (body) => request(`${contactPath(body.accountId, body.contactId)}/photo`, headers, signal),
    saveAddressBookContact: (body) => put(`${accountPath(body.accountId)}/address-book/${encode(body.phoneNumber)}`, headers, { firstName: body.firstName, lastName: body.lastName, syncToAddressbook: body.syncToAddressbook }, signal),
    deleteAddressBookContact: (body) => del(`${accountPath(body.accountId)}/address-book/${encode(body.phoneNumber)}`, headers, signal),
    contactLidPhone: (body) => post(`${accountPath(body.accountId)}/identities:resolve-lid-phone`, headers, { userIds: body.userIds }, signal),
    addCustomerNote: (body) => put(`${accountPath(body.accountId)}/contacts/${encode(body.userId)}/note`, headers, { note: body.note }, signal),
    customerNote: (body) => request(`${accountPath(body.accountId)}/contacts/${encode(body.userId)}/note`, headers, signal),
    workflows: () => request(`${baseUrl}/workflows`, headers, signal),
    workflowProviders: () => request(`${baseUrl}/workflows/providers`, headers, signal),
    workflowExecutions: () => request(`${baseUrl}/workflows/executions`, headers, signal),
    validateWorkflow: (body) => post(`${baseUrl}/workflows:validate`, headers, body, signal),
    upsertWorkflow: (body) => put(`${baseUrl}/workflows`, headers, body, signal),
    testWorkflow: (body) => post(`${baseUrl}/workflows:test`, headers, body, signal),
    webhooks: () => request(`${baseUrl}/webhooks`, headers, signal),
    webhookDeliveries: () => request(`${baseUrl}/webhooks/deliveries`, headers, signal),
    upsertWebhook: (body) => put(`${baseUrl}/webhooks/${encode(body.id)}`, headers, without(body, "id"), signal),
    removeWebhook: (webhookId) => del(`${baseUrl}/webhooks/${encode(webhookId)}`, headers, signal),
    replayWebhookDelivery: (deliveryId) => post(`${baseUrl}/webhooks/deliveries/${encode(deliveryId)}:replay`, headers, {}, signal),
    testWebhookEvent: (body) => post(`${baseUrl}/webhooks/events/${encode(body.eventType)}:test`, headers, without(body, "eventType"), signal)
  };
}

async function post<T>(url: string, headers: Record<string, string> | undefined, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(url, headers, signal, jsonInit("POST", body, headers));
}

async function put<T>(url: string, headers: Record<string, string> | undefined, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(url, headers, signal, jsonInit("PUT", body, headers));
}

async function patch<T>(url: string, headers: Record<string, string> | undefined, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(url, headers, signal, jsonInit("PATCH", body, headers));
}

async function del<T>(url: string, headers: Record<string, string> | undefined, signal?: AbortSignal): Promise<T> {
  return request<T>(url, headers, signal, { method: "DELETE", headers });
}

async function request<T>(url: string, headers?: Record<string, string>, signal?: AbortSignal, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: init?.headers ?? headers, signal: init?.signal ?? signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  return (await response.json()) as T;
}

function jsonInit(method: string, body: unknown, headers?: Record<string, string>): RequestInit {
  return { method, body: JSON.stringify(body), headers: { "content-type": "application/json", ...(headers ?? {}) } };
}

function encode(value: string): string {
  return encodeURIComponent(value);
}

function without<T extends object, K extends keyof T>(value: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...value } as Record<string, unknown>;
  for (const key of keys) delete copy[key as string];
  return copy as Omit<T, K>;
}

function query(values: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}
