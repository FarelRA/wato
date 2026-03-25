import type {
  AccountRecord,
  ApiKeyRecord,
  BroadcastSummary,
  ChannelSummary,
  ChatSummary,
  ContactSummary,
  GroupSummary,
  LabelSummary,
  MessageEnvelope,
  SystemStatus,
  UnifiedChannelSendRequest,
  UnifiedMessageSendRequest,
  WebhookDefinition,
  WebhookDeliveryRecord,
  WorkflowExecutionRecord
} from "@wato/core";
import type { WorkflowDefinition } from "@wato/workflow-types";

export interface SystemStatusResponse extends SystemStatus {}
export interface AccountListResponse { accounts: AccountRecord[] }
export interface ApiKeyListResponse { apiKeys: ApiKeyRecord[] }
export interface WorkflowListResponse { workflows: WorkflowDefinition[] }
export interface WorkflowExecutionListResponse { executions: WorkflowExecutionRecord[] }
export interface WorkflowProviderTypesResponse { triggers: string[]; conditions: string[]; actions: string[] }
export interface WorkflowValidationResponse { ok: boolean; issues: string[] }
export interface WebhookListResponse { webhooks: WebhookDefinition[] }
export interface WebhookDeliveryListResponse { deliveries: WebhookDeliveryRecord[] }
export interface MessageListResponse { messages: MessageEnvelope[] }
export interface ChatListResponse { chats: ChatSummary[] }
export interface ChannelListResponse { channels: ChannelSummary[] }
export interface ContactListResponse { contacts: ContactSummary[] }
export interface LabelListResponse { labels: LabelSummary[] }
export interface BroadcastListResponse { broadcasts: BroadcastSummary[] }
export interface GroupMembershipRequestListResponse { requests: unknown[] }

export type SendMessageBody = UnifiedMessageSendRequest;
export type SendChannelMessageBody = UnifiedChannelSendRequest;

export interface WorkflowTestBody {
  workflow?: WorkflowDefinition;
  workflowId?: string;
  eventType: string;
  accountId?: string;
  payload: unknown;
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

export interface ContactInfoResponse { contact: ContactSummary }
export interface GroupInfoResponse { group: GroupSummary }
export interface ChannelInfoResponse { channel: ChannelSummary }
