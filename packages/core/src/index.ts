export type AccountScope =
  | { mode: "single"; accountId: string }
  | { mode: "set"; accountIds: string[] }
  | { mode: "all" };

export type AccountState =
  | "created"
  | "initializing"
  | "qr_required"
  | "authenticating"
  | "ready"
  | "degraded"
  | "disconnected"
  | "stopped"
  | "failed";

export interface AccountDefinition {
  id: string;
  label: string;
  enabled: boolean;
  sessionDir?: string;
  metadata?: Record<string, string>;
}

export interface AccountRecord extends AccountDefinition {
  state: AccountState;
  lastError?: string;
  lastSeenAt?: string;
  qrCode?: string;
}

export interface DomainEvent<TPayload = unknown> {
  eventId: string;
  type: string;
  timestamp: string;
  sourceModule: string;
  accountId?: string;
  correlationId?: string;
  payload: TPayload;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface ModuleManifest {
  name: string;
  version: string;
  kind: "core" | "integration" | "workflow-trigger" | "workflow-action" | "utility";
  dependsOn?: string[];
  provides?: string[];
  accountScopeSupport: "single" | "multi" | "cross-account";
}

export interface KernelConfig {
  dataDir: string;
  logLevel: "debug" | "info" | "warn" | "error";
  accounts: AccountDefinition[];
  api: {
    enabled: boolean;
    host: string;
    port: number;
    authToken?: string;
  };
  workflows: unknown[];
  whatsapp: {
    autoInitialize: boolean;
    archiveMedia: boolean;
    browserPath?: string;
    headless: boolean;
  };
  webhooks: {
    enabled: boolean;
    maxAttempts: number;
    baseDelayMs: number;
    endpoints: WebhookDefinition[];
  };
}

export interface CapabilityRegistry {
  register<T>(name: string, value: T): void;
  resolve<T>(name: string): T;
  has(name: string): boolean;
  list(): string[];
}

export interface EventPublisher {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
  subscribe<TPayload>(
    eventType: string,
    handler: (event: DomainEvent<TPayload>) => Promise<void> | void
  ): () => void;
}

export interface ModuleContext {
  appName: string;
  logger: Logger;
  config: KernelConfig;
  capabilities: CapabilityRegistry;
  events: EventPublisher;
}

export interface ModuleRegistration {
  start?(): Promise<void>;
  stop?(): Promise<void>;
}

export interface WatoModule {
  manifest: ModuleManifest;
  register(context: ModuleContext): ModuleRegistration | Promise<ModuleRegistration>;
}

export interface KernelOptions {
  appName: string;
  logger: Logger;
  config: KernelConfig;
  modules: WatoModule[];
}

export interface MessageEnvelope {
  accountId: string;
  chatId: string;
  messageId: string;
  from: string;
  body: string;
  timestamp: string;
  type?: string;
  fromMe?: boolean;
  hasMedia?: boolean;
  mediaMimeType?: string;
  mediaFilename?: string;
  mediaPath?: string;
  mediaSize?: number;
  duration?: string;
  ack?: number;
  isForwarded?: boolean;
  forwardingScore?: number;
  isStarred?: boolean;
  isStatus?: boolean;
  quotedMessageId?: string;
  mentionedIds?: string[];
  groupMentions?: Array<{ id: string; subject: string }>;
  location?: {
    latitude: string;
    longitude: string;
    name?: string;
    address?: string;
    url?: string;
    description?: string;
  };
  vCards?: string[];
  raw?: Record<string, unknown>;
}

export interface OutboundMessageRequest {
  accountId: string;
  chatId: string;
  text: string;
}

export interface MessageSender {
  sendText(accountId: string, chatId: string, text: string, options?: SendTextOptions): Promise<{ messageId?: string }>;
}

export interface SendTextOptions {
  quotedMessageId?: string;
  mentions?: string[];
  groupMentions?: Array<{ id: string; subject: string }>;
}

export interface MediaInput {
  filePath?: string;
  base64?: string;
  mimeType?: string;
  filename?: string;
  url?: string;
}

export interface SendMediaRequest {
  accountId: string;
  chatId: string;
  media: MediaInput;
  caption?: string;
  mentions?: string[];
  groupMentions?: Array<{ id: string; subject: string }>;
  quotedMessageId?: string;
  asDocument?: boolean;
  asSticker?: boolean;
  asVoice?: boolean;
  asGif?: boolean;
  asHd?: boolean;
  isViewOnce?: boolean;
  stickerName?: string;
  stickerAuthor?: string;
  stickerCategories?: string[];
}

export interface SendContactCardsRequest {
  accountId: string;
  chatId: string;
  contactIds: string[];
  quotedMessageId?: string;
}

export interface SendLocationRequest {
  accountId: string;
  chatId: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  url?: string;
  description?: string;
  quotedMessageId?: string;
}

export interface ReplyToMessageRequest {
  accountId: string;
  messageId: string;
  text: string;
  chatId?: string;
  mentions?: string[];
}

export interface ReactToMessageRequest {
  accountId: string;
  messageId: string;
  reaction: string;
}

export interface MessageActionRequest {
  accountId: string;
  messageId: string;
}

export interface ForwardMessageRequest extends MessageActionRequest {
  chatId: string;
}

export interface EditMessageRequest extends MessageActionRequest {
  text: string;
}

export interface DeleteMessageRequest extends MessageActionRequest {
  everyone?: boolean;
  clearMedia?: boolean;
}

export interface PinMessageRequest extends MessageActionRequest {
  duration: number;
}

export interface ChatActionRequest {
  accountId: string;
  chatId: string;
}

export interface FetchChatMessagesRequest extends ChatActionRequest {
  limit?: number;
  fromMe?: boolean;
}

export interface SearchMessagesRequest {
  accountId: string;
  query: string;
  chatId?: string;
  page?: number;
  limit?: number;
}

export interface GroupCreateRequest {
  accountId: string;
  title: string;
  participants?: string[];
  messageTimer?: number;
  parentGroupId?: string;
  autoSendInviteV4?: boolean;
  comment?: string;
  memberAddMode?: boolean;
  membershipApprovalMode?: boolean;
  isRestrict?: boolean;
  isAnnounce?: boolean;
}

export interface GroupMembershipRequest {
  accountId: string;
  groupId: string;
  requesterIds?: string[];
  sleep?: number | [number, number];
}

export interface GroupLeaveRequest {
  accountId: string;
  groupId: string;
}

export interface GroupV4InviteRequest {
  accountId: string;
  inviteCode: string;
  inviteCodeExp: number;
  groupId: string;
  groupName?: string;
  fromId: string;
  toId: string;
}

export interface ChannelActionRequest {
  accountId: string;
  channelId: string;
}

export interface ChannelUpdateRequest extends ChannelActionRequest {
  subject?: string;
  description?: string;
  reactionSetting?: number;
  profilePicture?: MediaInput;
}

export interface ChannelSubscribersRequest extends ChannelActionRequest {
  limit?: number;
}

export interface ChannelMessagesRequest extends ChannelActionRequest {
  limit?: number;
  fromMe?: boolean;
}

export interface ChannelSearchRequest {
  accountId: string;
  searchText?: string;
  countryCodes?: string[];
  skipSubscribedNewsletters?: boolean;
  view?: number;
  limit?: number;
}

export interface AccountPairingCodeRequest {
  accountId: string;
  phoneNumber: string;
  showNotification?: boolean;
  intervalMs?: number;
}

export interface AccountDisplayNameRequest {
  accountId: string;
  displayName: string;
}

export interface AccountProfilePictureRequest {
  accountId: string;
  media: MediaInput;
}

export interface AccountAutoDownloadRequest {
  accountId: string;
  audio?: boolean;
  documents?: boolean;
  photos?: boolean;
  videos?: boolean;
  backgroundSync?: boolean;
}

export interface CallLinkRequest {
  accountId: string;
  startTime: string;
  callType: string;
}

export interface AddressBookContactUpsertRequest {
  accountId: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  syncToAddressbook?: boolean;
}

export interface AddressBookContactDeleteRequest {
  accountId: string;
  phoneNumber: string;
}

export interface ContactLidLookupRequest {
  accountId: string;
  userIds: string[];
}

export interface CustomerNoteRequest {
  accountId: string;
  userId: string;
  note: string;
}

export interface CustomerNoteLookupRequest {
  accountId: string;
  userId: string;
}

export interface ScheduleEventCreateRequest {
  accountId: string;
  chatId: string;
  name: string;
  startTime: string;
  description?: string;
  endTime?: string;
  location?: string;
  callType?: string;
  isEventCanceled?: boolean;
  quotedMessageId?: string;
}

export interface ScheduleEventResponseRequest {
  accountId: string;
  response: number;
  eventMessageId: string;
}

export interface StatusRevokeRequest {
  accountId: string;
  messageId: string;
}

export interface CreatePollRequest {
  accountId: string;
  chatId: string;
  question: string;
  options: string[];
  allowMultipleAnswers?: boolean;
  quotedMessageId?: string;
}

export interface VotePollRequest {
  accountId: string;
  messageId: string;
  selectedOptions: string[];
}

export interface JoinGroupInviteRequest {
  accountId: string;
  inviteCode: string;
}

export interface ChatMuteRequest {
  accountId: string;
  chatId: string;
  until?: string;
}

export interface ContactActionRequest {
  accountId: string;
  contactId: string;
}

export interface GroupParticipantsRequest {
  accountId: string;
  groupId: string;
  participantIds: string[];
  comment?: string;
}

export interface GroupSettingsRequest {
  accountId: string;
  groupId: string;
  subject?: string;
  description?: string;
  messagesAdminsOnly?: boolean;
  infoAdminsOnly?: boolean;
  addMembersAdminsOnly?: boolean;
}

export interface GroupInviteRequest {
  accountId: string;
  groupId: string;
}

export interface ChannelCreateRequest {
  accountId: string;
  title: string;
  description?: string;
}

export interface ChannelInviteRequest {
  accountId: string;
  inviteCode: string;
}

export interface ChannelSubscriptionRequest {
  accountId: string;
  channelId: string;
}

export interface ChannelAdminInviteRequest {
  accountId: string;
  channelId: string;
  userId: string;
  comment?: string;
}

export interface ChannelOwnershipRequest {
  accountId: string;
  channelId: string;
  newOwnerId: string;
  shouldDismissSelfAsAdmin?: boolean;
}

export interface ChannelSendRequest {
  accountId: string;
  channelId: string;
  text?: string;
  media?: MediaInput;
  caption?: string;
  mentions?: string[];
}

export interface ContactSummary {
  id: string;
  pushname?: string;
  name?: string;
  shortName?: string;
  number?: string;
  isGroup: boolean;
  isMyContact: boolean;
  isBlocked: boolean;
  about?: string | null;
  profilePicUrl?: string | null;
}

export interface LabelSummary {
  id: string;
  name: string;
  hexColor: string;
}

export interface BroadcastSummary {
  id: string;
  timestamp: number;
  totalCount: number;
  unreadCount: number;
  messageIds: string[];
}

export interface GroupSummary {
  id: string;
  name: string;
  description?: string;
  participants: Array<{ id: string; isAdmin: boolean; isSuperAdmin: boolean }>;
}

export interface ChannelSummary {
  id: string;
  name: string;
  description?: string;
  unreadCount: number;
  isMuted: boolean;
}

export interface ChatSummary {
  id: string;
  name: string;
  isGroup: boolean;
  archived: boolean;
  pinned: boolean;
  isMuted: boolean;
  unreadCount: number;
  timestamp: number;
}

export interface WebhookDefinition {
  id: string;
  url: string;
  secret?: string;
  enabled: boolean;
  eventTypes: string[];
  accountIds?: string[];
  headers?: Record<string, string>;
}

export interface WebhookDeliveryRecord {
  id: string;
  webhookId: string;
  eventId: string;
  eventType: string;
  accountId?: string;
  attempt: number;
  status: "pending" | "delivered" | "failed";
  responseStatus?: number;
  error?: string;
  nextRetryAt?: string;
  createdAt: string;
  deliveredAt?: string;
}

export interface WebhookRegistry {
  list(): WebhookDefinition[];
  upsert(definition: WebhookDefinition): void;
  remove(webhookId: string): void;
  replayDelivery(deliveryId: string): Promise<void>;
}

export interface WorkflowRegistry {
  list(): unknown[];
  upsert(workflow: unknown): void;
  validate(workflow: unknown): { ok: boolean; issues: string[] };
  listProviderTypes(): { triggers: string[]; conditions: string[]; actions: string[] };
  registerTriggerType(type: string): void;
  registerActionType(type: string): void;
  test(input: { workflow?: unknown; workflowId?: string; eventType: string; accountId?: string; payload: unknown }): Promise<unknown>;
}

export interface WhatsAppGateway {
  sendText(request: OutboundMessageRequest & SendTextOptions): Promise<{ messageId?: string }>;
  sendMedia(request: SendMediaRequest): Promise<{ messageId?: string }>;
  sendContactCards(request: SendContactCardsRequest): Promise<{ messageId?: string }>;
  sendLocation(request: SendLocationRequest): Promise<{ messageId?: string }>;
  replyToMessage(request: ReplyToMessageRequest): Promise<{ messageId?: string }>;
  reactToMessage(request: ReactToMessageRequest): Promise<void>;
  forwardMessage(request: ForwardMessageRequest): Promise<void>;
  editMessage(request: EditMessageRequest): Promise<{ messageId?: string } | null>;
  deleteMessage(request: DeleteMessageRequest): Promise<void>;
  starMessage(request: MessageActionRequest): Promise<void>;
  unstarMessage(request: MessageActionRequest): Promise<void>;
  pinMessage(request: PinMessageRequest): Promise<boolean>;
  unpinMessage(request: MessageActionRequest): Promise<boolean>;
  getMessageInfo(request: MessageActionRequest): Promise<unknown>;
  getMessageReactions(request: MessageActionRequest): Promise<unknown>;
  getPollVotesForMessage(request: MessageActionRequest): Promise<unknown>;
  createPoll(request: CreatePollRequest): Promise<{ messageId?: string }>;
  voteInPoll(request: VotePollRequest): Promise<void>;
  listMessages(request: { accountId?: string; limit?: number }): Promise<MessageEnvelope[]>;
  listChats(request: { accountId: string }): Promise<ChatSummary[]>;
  getChat(request: ChatActionRequest): Promise<ChatSummary>;
  fetchChatMessages(request: FetchChatMessagesRequest): Promise<MessageEnvelope[]>;
  searchMessages(request: SearchMessagesRequest): Promise<MessageEnvelope[]>;
  listLabels(request: { accountId: string }): Promise<LabelSummary[]>;
  getLabel(request: { accountId: string; labelId: string }): Promise<LabelSummary>;
  getChatLabels(request: ChatActionRequest): Promise<LabelSummary[]>;
  getChatsByLabel(request: { accountId: string; labelId: string }): Promise<ChatSummary[]>;
  updateChatLabels(request: { accountId: string; chatIds: string[]; labelIds: Array<string | number> }): Promise<void>;
  listBroadcasts(request: { accountId: string }): Promise<BroadcastSummary[]>;
  getBroadcast(request: { accountId: string; broadcastId: string }): Promise<BroadcastSummary>;
  archiveChat(request: ChatActionRequest): Promise<boolean>;
  unarchiveChat(request: ChatActionRequest): Promise<boolean>;
  pinChat(request: ChatActionRequest): Promise<boolean>;
  unpinChat(request: ChatActionRequest): Promise<boolean>;
  markChatUnread(request: ChatActionRequest): Promise<void>;
  sendSeen(request: ChatActionRequest): Promise<boolean>;
  sendTyping(request: ChatActionRequest): Promise<void>;
  sendRecording(request: ChatActionRequest): Promise<void>;
  clearChatState(request: ChatActionRequest): Promise<boolean>;
  clearChatMessages(request: ChatActionRequest): Promise<boolean>;
  deleteChat(request: ChatActionRequest): Promise<boolean>;
  syncHistory(request: ChatActionRequest): Promise<boolean>;
  joinGroupByInvite(request: JoinGroupInviteRequest): Promise<string>;
  getInviteInfo(request: { accountId: string; inviteCode: string }): Promise<unknown>;
  acceptGroupV4Invite(request: GroupV4InviteRequest): Promise<{ status: number }>;
  createGroup(request: GroupCreateRequest): Promise<unknown>;
  getGroupInvite(request: GroupInviteRequest): Promise<string>;
  revokeGroupInvite(request: GroupInviteRequest): Promise<void>;
  updateGroupSettings(request: GroupSettingsRequest): Promise<Record<string, boolean>>;
  leaveGroup(request: GroupLeaveRequest): Promise<void>;
  getGroupMembershipRequests(request: GroupInviteRequest): Promise<unknown[]>;
  approveGroupMembershipRequests(request: GroupMembershipRequest): Promise<unknown[]>;
  rejectGroupMembershipRequests(request: GroupMembershipRequest): Promise<unknown[]>;
  addGroupParticipants(request: GroupParticipantsRequest): Promise<unknown>;
  kickGroupParticipants(request: GroupParticipantsRequest): Promise<unknown>;
  promoteGroupParticipants(request: GroupParticipantsRequest): Promise<unknown>;
  demoteGroupParticipants(request: GroupParticipantsRequest): Promise<unknown>;
  muteChat(request: ChatMuteRequest): Promise<{ isMuted: boolean; muteExpiration: number }>;
  unmuteChat(request: { accountId: string; chatId: string }): Promise<{ isMuted: boolean; muteExpiration: number }>;
  blockContact(request: ContactActionRequest): Promise<boolean>;
  unblockContact(request: ContactActionRequest): Promise<boolean>;
  getContactInfo(request: ContactActionRequest): Promise<ContactSummary>;
  getProfilePicture(request: ContactActionRequest): Promise<string | null>;
  listContacts(request: { accountId: string }): Promise<ContactSummary[]>;
  listBlockedContacts(request: { accountId: string }): Promise<ContactSummary[]>;
  getCommonGroups(request: ContactActionRequest): Promise<string[]>;
  getFormattedNumber(request: ContactActionRequest): Promise<string>;
  getCountryCode(request: ContactActionRequest): Promise<string>;
  isRegisteredUser(request: ContactActionRequest): Promise<boolean>;
  getNumberId(request: { accountId: string; number: string }): Promise<string | null>;
  getContactDeviceCount(request: ContactActionRequest): Promise<number>;
  saveAddressBookContact(request: AddressBookContactUpsertRequest): Promise<void>;
  deleteAddressBookContact(request: AddressBookContactDeleteRequest): Promise<void>;
  getContactLidAndPhone(request: ContactLidLookupRequest): Promise<Array<{ lid: string; pn: string }>>;
  addCustomerNote(request: CustomerNoteRequest): Promise<void>;
  getCustomerNote(request: CustomerNoteLookupRequest): Promise<unknown>;
  setStatus(request: { accountId: string; status: string }): Promise<void>;
  revokeStatusMessage(request: StatusRevokeRequest): Promise<void>;
  setDisplayName(request: AccountDisplayNameRequest): Promise<boolean>;
  setProfilePicture(request: AccountProfilePictureRequest): Promise<boolean>;
  deleteProfilePicture(request: { accountId: string }): Promise<boolean>;
  requestPairingCode(request: AccountPairingCodeRequest): Promise<string>;
  sendPresenceAvailable(request: { accountId: string }): Promise<void>;
  sendPresenceUnavailable(request: { accountId: string }): Promise<void>;
  getState(request: { accountId: string }): Promise<string>;
  getWWebVersion(request: { accountId: string }): Promise<string>;
  setAutoDownload(request: AccountAutoDownloadRequest): Promise<void>;
  createCallLink(request: CallLinkRequest): Promise<string>;
  createScheduledEvent(request: ScheduleEventCreateRequest): Promise<{ messageId?: string }>;
  respondToScheduledEvent(request: ScheduleEventResponseRequest): Promise<boolean>;
  getGroupInfo(request: { accountId: string; groupId: string }): Promise<GroupSummary>;
  createChannel(request: ChannelCreateRequest): Promise<unknown>;
  listChannels(request: { accountId: string }): Promise<ChannelSummary[]>;
  searchChannels(request: ChannelSearchRequest): Promise<ChannelSummary[]>;
  getChannelByInvite(request: ChannelInviteRequest): Promise<ChannelSummary>;
  updateChannel(request: ChannelUpdateRequest): Promise<Record<string, boolean>>;
  getChannelSubscribers(request: ChannelSubscribersRequest): Promise<unknown[]>;
  fetchChannelMessages(request: ChannelMessagesRequest): Promise<MessageEnvelope[]>;
  subscribeToChannel(request: ChannelSubscriptionRequest): Promise<boolean>;
  unsubscribeFromChannel(request: ChannelSubscriptionRequest): Promise<boolean>;
  muteChannel(request: ChannelActionRequest): Promise<boolean>;
  unmuteChannel(request: ChannelActionRequest): Promise<boolean>;
  sendSeenToChannel(request: ChannelActionRequest): Promise<boolean>;
  sendChannelMessage(request: ChannelSendRequest): Promise<{ messageId?: string }>;
  inviteChannelAdmin(request: ChannelAdminInviteRequest): Promise<boolean>;
  acceptChannelAdminInvite(request: ChannelActionRequest): Promise<boolean>;
  revokeChannelAdminInvite(request: ChannelAdminInviteRequest): Promise<boolean>;
  demoteChannelAdmin(request: ChannelAdminInviteRequest): Promise<boolean>;
  transferChannelOwnership(request: ChannelOwnershipRequest): Promise<boolean>;
  deleteChannel(request: ChannelActionRequest): Promise<boolean>;
}

export interface StorageEngine {
  upsertAccounts(accounts: AccountRecord[]): void;
  saveEvent(event: DomainEvent): void;
  getEvent(eventId: string): DomainEvent | undefined;
  saveWorkflow(workflow: unknown): void;
  listWorkflows(): unknown[];
  saveWorkflowExecution(record: WorkflowExecutionRecord): void;
  listWorkflowExecutions(limit?: number): WorkflowExecutionRecord[];
  saveWebhook(definition: WebhookDefinition): void;
  deleteWebhook(webhookId: string): void;
  listWebhooks(): WebhookDefinition[];
  saveWebhookDelivery(record: WebhookDeliveryRecord): void;
  listWebhookDeliveries(limit?: number): WebhookDeliveryRecord[];
  getWebhookDelivery(deliveryId: string): WebhookDeliveryRecord | undefined;
}

export interface WorkflowExecutionRecord {
  id: string;
  workflowId: string;
  workflowVersion: number;
  accountId?: string;
  eventType: string;
  status: "matched" | "skipped" | "failed" | "completed";
  steps: string[];
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

export interface SystemStatus {
  name: string;
  status: "starting" | "ready" | "degraded" | "stopped";
  uptimeMs: number;
  moduleCount: number;
  accountCount: number;
}

export interface SystemController {
  getStatus(): SystemStatus;
}

export const capabilityNames = {
  accountRegistry: "account-registry",
  workflowEngine: "workflow-engine",
  workflowRegistry: "workflow-registry",
  storage: "storage-engine",
  messageSender: "message-sender",
  systemController: "system-controller",
  whatsappGateway: "whatsapp-gateway",
  webhookRegistry: "webhook-registry",
  apiRouter: "api-router",
  healthChecks: "health-checks"
} as const;

export function createDomainEvent<TPayload>(input: Omit<DomainEvent<TPayload>, "eventId" | "timestamp">): DomainEvent<TPayload> {
  return {
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...input
  };
}
