import type {
  AccountRecord,
  ChannelSummary,
  ChatMuteRequest,
  ContactActionRequest,
  ContactSummary,
  CreatePollRequest,
  GroupInviteRequest,
  GroupParticipantsRequest,
  GroupSettingsRequest,
  GroupSummary,
  JoinGroupInviteRequest,
  MessageEnvelope,
  OutboundMessageRequest,
  ReactToMessageRequest,
  ReplyToMessageRequest,
  SendContactCardsRequest,
  SendLocationRequest,
  SendMediaRequest,
  SystemStatus,
  VotePollRequest,
  WebhookDefinition,
  WebhookDeliveryRecord,
  WorkflowExecutionRecord,
  ChannelCreateRequest,
  ChannelInviteRequest,
  ChannelSubscriptionRequest,
  ChannelSendRequest,
  ChannelAdminInviteRequest,
  ChannelOwnershipRequest
} from "@wato/core";
import type { WorkflowDefinition } from "@wato/workflow-types";

export interface SystemStatusResponse extends SystemStatus {}

export interface AccountListResponse {
  accounts: AccountRecord[];
}

export interface WorkflowListResponse {
  workflows: WorkflowDefinition[];
}

export interface MessageListResponse {
  messages: MessageEnvelope[];
}

export interface WorkflowExecutionListResponse {
  executions: WorkflowExecutionRecord[];
}

export interface WorkflowProviderTypesResponse {
  triggers: string[];
  conditions: string[];
  actions: string[];
}

export interface WorkflowValidationResponse {
  ok: boolean;
  issues: string[];
}

export interface WorkflowTestBody {
  workflow?: WorkflowDefinition;
  workflowId?: string;
  eventType: string;
  accountId?: string;
  payload: unknown;
}

export interface WebhookListResponse {
  webhooks: WebhookDefinition[];
}

export interface WebhookDeliveryListResponse {
  deliveries: WebhookDeliveryRecord[];
}

export interface UpsertWebhookBody {
  id: string;
  url: string;
  secret?: string;
  enabled?: boolean;
  eventTypes?: string[];
  accountIds?: string[];
  headers?: Record<string, string>;
}

export interface SendMessageBody {
  accountId: string;
  chatId: string;
  text: string;
}

export type SendTextBody = OutboundMessageRequest & {
  quotedMessageId?: string;
  mentions?: string[];
  groupMentions?: Array<{ id: string; subject: string }>;
};

export type SendMediaBody = SendMediaRequest;
export type SendContactCardsBody = SendContactCardsRequest;
export type SendLocationBody = SendLocationRequest;
export type ReplyToMessageBody = ReplyToMessageRequest;
export type ReactToMessageBody = ReactToMessageRequest;
export type CreatePollBody = CreatePollRequest;
export type VotePollBody = VotePollRequest;
export type JoinGroupInviteBody = JoinGroupInviteRequest;
export type GroupInviteBody = GroupInviteRequest;
export type GroupSettingsBody = GroupSettingsRequest;
export type GroupParticipantsBody = GroupParticipantsRequest;
export type ChatMuteBody = ChatMuteRequest;
export type ContactActionBody = ContactActionRequest;
export type ChannelCreateBody = ChannelCreateRequest;
export type ChannelInviteBody = ChannelInviteRequest;
export type ChannelSubscriptionBody = ChannelSubscriptionRequest;
export type ChannelSendBody = ChannelSendRequest;
export type ChannelAdminInviteBody = ChannelAdminInviteRequest;
export type ChannelOwnershipBody = ChannelOwnershipRequest;

export interface ContactInfoResponse {
  contact: ContactSummary;
}

export interface GroupInfoResponse {
  group: GroupSummary;
}

export interface ChannelListResponse {
  channels: ChannelSummary[];
}

export interface ChannelInfoResponse {
  channel: ChannelSummary;
}
