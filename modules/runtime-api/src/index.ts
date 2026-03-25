import { accountRegistryCapability, type AccountRegistry } from "@wato/account-registry";
import type { WorkflowDefinition } from "@wato/workflow-types";
import type { MessageActionRequest, MessageSender, StorageEngine, SystemController, WebhookRegistry, WatoModule, WhatsAppGateway } from "@wato/core";
import { capabilityNames } from "@wato/core";

export const runtimeApiModule: WatoModule = {
  manifest: {
    name: "runtime-api",
    version: "0.1.0",
    kind: "integration",
    dependsOn: ["runtime-whatsapp", "runtime-workflow"],
    provides: [capabilityNames.apiRouter],
    accountScopeSupport: "cross-account"
  },
  register(context) {
    const accounts = context.capabilities.resolve<AccountRegistry>(accountRegistryCapability);
    const storage = context.capabilities.resolve<StorageEngine>(capabilityNames.storage);
    const system = context.capabilities.resolve<SystemController>(capabilityNames.systemController);
    const sender = context.capabilities.resolve<MessageSender>(capabilityNames.messageSender);
    const gateway = context.capabilities.resolve<WhatsAppGateway>(capabilityNames.whatsappGateway);
    const webhookRegistry = context.capabilities.resolve<WebhookRegistry>(capabilityNames.webhookRegistry);
    const fetchHandler = createApiFetchHandler({ context, accounts, storage, system, sender, gateway, webhookRegistry });

    let server: Bun.Server<undefined> | undefined;

    context.capabilities.register(capabilityNames.apiRouter, {
      getSystemStatus: () => system.getStatus()
    });

    return {
      async start() {
        if (!context.config.api.enabled) {
          context.logger.info("api server disabled by config");
          return;
        }

        server = Bun.serve({
          hostname: context.config.api.host,
          port: context.config.api.port,
          fetch: fetchHandler
        });

        context.logger.info("api server started", { host: context.config.api.host, port: context.config.api.port });
      },
      async stop() {
        server?.stop(true);
      }
    };
  }
};

export function createApiFetchHandler(input: {
  context: Parameters<WatoModule["register"]>[0];
  accounts: AccountRegistry;
  storage: StorageEngine;
  system: SystemController;
  sender: MessageSender;
  gateway: WhatsAppGateway;
  webhookRegistry: WebhookRegistry;
}) {
  const { context, accounts, storage, system, sender, gateway, webhookRegistry } = input;

  return async (request: Request): Promise<Response> => {
    if (!authorize(request, context.config.api.authToken)) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/system/status") {
        return Response.json(system.getStatus());
      }

      if (request.method === "GET" && url.pathname === "/accounts") {
        return Response.json({ accounts: accounts.list() });
      }

      if (request.method === "GET" && url.pathname === "/messages") {
        return Response.json({ messages: await gateway.listMessages({ accountId: url.searchParams.get("accountId") ?? undefined, limit: 100 }) });
      }

      if (request.method === "GET" && url.pathname === "/workflows") {
        return Response.json({ workflows: storage.listWorkflows() as WorkflowDefinition[] });
      }

      if (request.method === "GET" && url.pathname === "/workflow-providers") {
        const registry = context.capabilities.resolve<{ listProviderTypes?: () => { triggers: string[]; conditions: string[]; actions: string[] } }>(capabilityNames.workflowRegistry);
        return Response.json(registry.listProviderTypes?.() ?? { triggers: [], conditions: [], actions: [] });
      }

      if (request.method === "POST" && url.pathname === "/workflows/validate") {
        const registry = context.capabilities.resolve<{ validate?: (workflow: WorkflowDefinition) => { ok: boolean; issues: string[] } }>(capabilityNames.workflowRegistry);
        return Response.json(registry.validate?.(await parseBody(request)) ?? { ok: false, issues: ["workflow registry unavailable"] });
      }

      if (request.method === "POST" && url.pathname === "/workflows") {
        const registry = context.capabilities.resolve<{ upsert?: (workflow: WorkflowDefinition) => void }>(capabilityNames.workflowRegistry);
        registry.upsert?.(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/workflows/test") {
        const registry = context.capabilities.resolve<{
          test?: (input: { workflow?: WorkflowDefinition; workflowId?: string; eventType: string; accountId?: string; payload: unknown }) => Promise<unknown>;
        }>(capabilityNames.workflowRegistry);
        return Response.json(await registry.test?.(await parseBody(request)) ?? { ok: false, error: "workflow registry unavailable" });
      }

      if (request.method === "GET" && url.pathname === "/workflow-executions") {
        return Response.json({ executions: storage.listWorkflowExecutions(100) });
      }

      if (request.method === "GET" && url.pathname === "/webhooks") {
        return Response.json({ webhooks: webhookRegistry.list() });
      }

      if (request.method === "GET" && url.pathname === "/webhook-deliveries") {
        return Response.json({ deliveries: storage.listWebhookDeliveries(100) });
      }

      if (request.method === "DELETE" && url.pathname === "/webhooks") {
        const body = await parseBody<{ webhookId: string }>(request);
        webhookRegistry.remove(body.webhookId);
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/webhooks") {
        const body = await parseBody<{ id: string; url: string; secret?: string; enabled?: boolean; eventTypes?: string[]; accountIds?: string[]; headers?: Record<string, string> }>(request);
        webhookRegistry.upsert({
          id: body.id,
          url: body.url,
          secret: body.secret,
          enabled: body.enabled ?? true,
          eventTypes: body.eventTypes ?? ["*"],
          accountIds: body.accountIds,
          headers: body.headers
        });
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/webhooks/replay") {
        const body = await parseBody<{ deliveryId: string }>(request);
        await webhookRegistry.replayDelivery(body.deliveryId);
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/webhooks/test") {
        const body = await parseBody<{ eventType: string; accountId?: string; payload?: unknown }>(request);
        await context.events.publish({
          eventId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          sourceModule: "runtime-api",
          type: body.eventType,
          accountId: body.accountId,
          payload: body.payload ?? {}
        });
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/messages/send") {
        const body = (await request.json()) as { accountId: string; chatId: string; text: string } & Record<string, unknown>;
        return Response.json(
          await sender.sendText(body.accountId, body.chatId, body.text, {
            quotedMessageId: typeof body.quotedMessageId === "string" ? body.quotedMessageId : undefined,
            mentions: Array.isArray(body.mentions) ? (body.mentions as string[]) : undefined,
            groupMentions: Array.isArray(body.groupMentions) ? (body.groupMentions as Array<{ id: string; subject: string }>) : undefined
          })
        );
      }

      if (request.method === "POST" && url.pathname === "/messages/send-media") {
        return Response.json(await gateway.sendMedia(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/messages/send-contacts") {
        return Response.json(await gateway.sendContactCards(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/messages/send-location") {
        return Response.json(await gateway.sendLocation(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/messages/reply") {
        return Response.json(await gateway.replyToMessage(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/messages/forward") {
        await gateway.forwardMessage(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/messages/edit") {
        return Response.json(await gateway.editMessage(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/messages/delete") {
        await gateway.deleteMessage(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/messages/star") {
        await gateway.starMessage(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/messages/unstar") {
        await gateway.unstarMessage(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/messages/pin") {
        return Response.json({ ok: await gateway.pinMessage(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/messages/unpin") {
        return Response.json({ ok: await gateway.unpinMessage(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/messages/info") {
        const body = await parseBody<MessageActionRequest>(request);
        const info = await gateway.getMessageInfo(body);
        return Response.json(info ?? {
          messageId: body.messageId,
          info: null,
          available: false,
          note: "Message info is only available for messages sent by your account"
        });
      }

      if (request.method === "POST" && url.pathname === "/messages/reactions") {
        return Response.json(await gateway.getMessageReactions(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/messages/polls/votes") {
        return Response.json(await gateway.getPollVotesForMessage(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/messages/react") {
        await gateway.reactToMessage(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/messages/polls") {
        return Response.json(await gateway.createPoll(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/messages/polls/vote") {
        await gateway.voteInPoll(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "GET" && url.pathname === "/chats") {
        const accountId = url.searchParams.get("accountId");
        if (!accountId) {
          return Response.json({ error: "accountId is required" }, { status: 400 });
        }

        return Response.json({ chats: await gateway.listChats({ accountId }) });
      }

      if (request.method === "GET" && url.pathname === "/labels") {
        const accountId = url.searchParams.get("accountId");
        if (!accountId) {
          return Response.json({ error: "accountId is required" }, { status: 400 });
        }

        return Response.json({ labels: await gateway.listLabels({ accountId }) });
      }

      if (request.method === "POST" && url.pathname === "/labels/info") {
        return Response.json(await gateway.getLabel(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/labels/chats") {
        return Response.json({ chats: await gateway.getChatsByLabel(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/labels/chat-labels") {
        return Response.json({ labels: await gateway.getChatLabels(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/labels/update-chats") {
        await gateway.updateChatLabels(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "GET" && url.pathname === "/broadcasts") {
        const accountId = url.searchParams.get("accountId");
        if (!accountId) {
          return Response.json({ error: "accountId is required" }, { status: 400 });
        }

        return Response.json({ broadcasts: await gateway.listBroadcasts({ accountId }) });
      }

      if (request.method === "POST" && url.pathname === "/broadcasts/info") {
        return Response.json(await gateway.getBroadcast(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/chats/info") {
        return Response.json(await gateway.getChat(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/chats/messages") {
        return Response.json({ messages: await gateway.fetchChatMessages(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/chats/search-messages") {
        return Response.json({ messages: await gateway.searchMessages(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/chats/archive") {
        return Response.json({ ok: await gateway.archiveChat(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/chats/unarchive") {
        return Response.json({ ok: await gateway.unarchiveChat(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/chats/pin") {
        return Response.json({ ok: await gateway.pinChat(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/chats/unpin") {
        return Response.json({ ok: await gateway.unpinChat(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/chats/mark-unread") {
        await gateway.markChatUnread(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/chats/seen") {
        return Response.json({ ok: await gateway.sendSeen(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/chats/typing") {
        await gateway.sendTyping(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/chats/recording") {
        await gateway.sendRecording(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/chats/clear-state") {
        return Response.json({ ok: await gateway.clearChatState(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/chats/clear-messages") {
        return Response.json({ ok: await gateway.clearChatMessages(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/chats/delete") {
        return Response.json({ ok: await gateway.deleteChat(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/chats/sync-history") {
        return Response.json({ ok: await gateway.syncHistory(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/groups/join-by-invite") {
        return Response.json({ groupId: await gateway.joinGroupByInvite(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/groups/invite-info") {
        return Response.json(await gateway.getInviteInfo(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/groups/accept-v4-invite") {
        return Response.json(await gateway.acceptGroupV4Invite(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/groups/create") {
        return Response.json(await gateway.createGroup(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/groups/invite-code") {
        return Response.json({ inviteCode: await gateway.getGroupInvite(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/groups/invite-revoke") {
        await gateway.revokeGroupInvite(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/groups/info") {
        return Response.json(await gateway.getGroupInfo(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/groups/leave") {
        await gateway.leaveGroup(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/groups/membership-requests") {
        return Response.json({ requests: await gateway.getGroupMembershipRequests(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/groups/membership-requests/approve") {
        return Response.json({ results: await gateway.approveGroupMembershipRequests(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/groups/membership-requests/reject") {
        return Response.json({ results: await gateway.rejectGroupMembershipRequests(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/groups/update") {
        return Response.json(await gateway.updateGroupSettings(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/groups/participants/add") {
        return Response.json(await gateway.addGroupParticipants(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/groups/participants/kick") {
        return Response.json(await gateway.kickGroupParticipants(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/groups/participants/promote") {
        return Response.json(await gateway.promoteGroupParticipants(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/groups/participants/demote") {
        return Response.json(await gateway.demoteGroupParticipants(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/chats/mute") {
        return Response.json(await gateway.muteChat(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/chats/unmute") {
        return Response.json(await gateway.unmuteChat(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/contacts/block") {
        return Response.json({ ok: await gateway.blockContact(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/contacts/unblock") {
        return Response.json({ ok: await gateway.unblockContact(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/contacts/info") {
        return Response.json(await gateway.getContactInfo(await parseBody(request)));
      }

      if (request.method === "GET" && url.pathname === "/contacts") {
        const accountId = url.searchParams.get("accountId");
        if (!accountId) {
          return Response.json({ error: "accountId is required" }, { status: 400 });
        }

        return Response.json({ contacts: await gateway.listContacts({ accountId }) });
      }

      if (request.method === "GET" && url.pathname === "/contacts/blocked") {
        const accountId = url.searchParams.get("accountId");
        if (!accountId) {
          return Response.json({ error: "accountId is required" }, { status: 400 });
        }

        return Response.json({ contacts: await gateway.listBlockedContacts({ accountId }) });
      }

      if (request.method === "POST" && url.pathname === "/contacts/common-groups") {
        return Response.json({ groups: await gateway.getCommonGroups(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/contacts/formatted-number") {
        return Response.json({ formattedNumber: await gateway.getFormattedNumber(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/contacts/country-code") {
        return Response.json({ countryCode: await gateway.getCountryCode(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/contacts/is-registered") {
        return Response.json({ registered: await gateway.isRegisteredUser(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/contacts/number-id") {
        return Response.json({ numberId: await gateway.getNumberId(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/contacts/device-count") {
        return Response.json({ count: await gateway.getContactDeviceCount(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/contacts/profile-picture") {
        return Response.json({ url: await gateway.getProfilePicture(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/contacts/address-book") {
        await gateway.saveAddressBookContact(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "DELETE" && url.pathname === "/contacts/address-book") {
        await gateway.deleteAddressBookContact(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/contacts/lid-phone") {
        return Response.json({ records: await gateway.getContactLidAndPhone(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/contacts/customer-note") {
        await gateway.addCustomerNote(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/contacts/customer-note/get") {
        return Response.json(await gateway.getCustomerNote(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/accounts/status") {
        await gateway.setStatus(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/accounts/status/revoke") {
        await gateway.revokeStatusMessage(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/accounts/display-name") {
        return Response.json({ ok: await gateway.setDisplayName(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/accounts/profile-picture") {
        return Response.json({ ok: await gateway.setProfilePicture(await parseBody(request)) });
      }

      if (request.method === "DELETE" && url.pathname === "/accounts/profile-picture") {
        return Response.json({ ok: await gateway.deleteProfilePicture(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/accounts/pairing-code") {
        return Response.json({ pairingCode: await gateway.requestPairingCode(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/accounts/presence/available") {
        await gateway.sendPresenceAvailable(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/accounts/presence/unavailable") {
        await gateway.sendPresenceUnavailable(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/accounts/state") {
        return Response.json({ state: await gateway.getState(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/accounts/version") {
        return Response.json({ version: await gateway.getWWebVersion(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/accounts/auto-download") {
        await gateway.setAutoDownload(await parseBody(request));
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/accounts/call-link") {
        return Response.json({ url: await gateway.createCallLink(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/events/scheduled") {
        return Response.json(await gateway.createScheduledEvent(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/events/scheduled/respond") {
        return Response.json({ ok: await gateway.respondToScheduledEvent(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/channels") {
        return Response.json(await gateway.createChannel(await parseBody(request)));
      }

      if (request.method === "GET" && url.pathname === "/channels") {
        const accountId = url.searchParams.get("accountId");
        if (!accountId) {
          return Response.json({ error: "accountId is required" }, { status: 400 });
        }

        return Response.json({ channels: await gateway.listChannels({ accountId }) });
      }

      if (request.method === "POST" && url.pathname === "/channels/search") {
        return Response.json({ channels: await gateway.searchChannels(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/channels/by-invite") {
        return Response.json(await gateway.getChannelByInvite(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/channels/update") {
        return Response.json(await gateway.updateChannel(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/channels/subscribers") {
        return Response.json({ subscribers: await gateway.getChannelSubscribers(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/channels/messages") {
        return Response.json({ messages: await gateway.fetchChannelMessages(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/channels/subscribe") {
        return Response.json({ ok: await gateway.subscribeToChannel(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/channels/unsubscribe") {
        return Response.json({ ok: await gateway.unsubscribeFromChannel(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/channels/mute") {
        return Response.json({ ok: await gateway.muteChannel(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/channels/unmute") {
        return Response.json({ ok: await gateway.unmuteChannel(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/channels/seen") {
        return Response.json({ ok: await gateway.sendSeenToChannel(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/channels/send") {
        return Response.json(await gateway.sendChannelMessage(await parseBody(request)));
      }

      if (request.method === "POST" && url.pathname === "/channels/admin/invite") {
        return Response.json({ ok: await gateway.inviteChannelAdmin(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/channels/admin/accept") {
        return Response.json({ ok: await gateway.acceptChannelAdminInvite(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/channels/admin/revoke") {
        return Response.json({ ok: await gateway.revokeChannelAdminInvite(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/channels/admin/demote") {
        return Response.json({ ok: await gateway.demoteChannelAdmin(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/channels/transfer-ownership") {
        return Response.json({ ok: await gateway.transferChannelOwnership(await parseBody(request)) });
      }

      if (request.method === "POST" && url.pathname === "/channels/delete") {
        return Response.json({ ok: await gateway.deleteChannel(await parseBody(request)) });
      }

      return Response.json({ error: "not found" }, { status: 404 });
    } catch (error) {
      context.logger.error("api request failed", { path: url.pathname, error: error instanceof Error ? error.message : String(error) });
      return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
  };
}

function authorize(request: Request, authToken?: string): boolean {
  if (!authToken) {
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${authToken}`;
}

async function parseBody<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}
