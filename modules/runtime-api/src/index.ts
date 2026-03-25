import { createHash, randomBytes } from "node:crypto";
import { accountRegistryCapability, type AccountRegistry } from "@wato/account-registry";
import type { WorkflowDefinition } from "@wato/workflow-types";
import type {
  ApiKeyCreateRequest,
  ApiKeyDeleteRequest,
  ApiKeyRecord,
  ApiKeyRotateRequest,
  ApiKeySeed,
  ApiKeyUpdateRequest,
  ChannelActionRequest,
  MessageActionRequest,
  MessageSender,
  StorageEngine,
  StoredApiKeyRecord,
  SystemController,
  UnifiedChannelSendRequest,
  UnifiedMessageSendRequest,
  WebhookRegistry,
  WatoModule,
  WhatsAppGateway
} from "@wato/core";
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

        syncConfiguredApiKeys(storage, context.config.api.keys);
        server = Bun.serve({ hostname: context.config.api.host, port: context.config.api.port, fetch: fetchHandler });
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
    const url = new URL(request.url);
    const authorization = authorizeRequest(request, storage);
    if (!authorization.ok) return Response.json({ error: authorization.error }, { status: authorization.status });

    const requiredPermission = permissionForRoute(request.method, url.pathname);
    if (!hasApiKeyPermission(authorization.apiKey, requiredPermission)) {
      return Response.json({ error: `forbidden: missing ${requiredPermission}` }, { status: 403 });
    }

    storage.touchApiKey(authorization.apiKey.id, new Date().toISOString());

    try {
      const method = request.method;
      const path = url.pathname;
      let match: RegExpMatchArray | null;

      if (method === "GET" && path === "/v1/system") return Response.json(system.getStatus());
      if (method === "POST" && path === "/v1/system:reload") {
        queueMicrotask(() => void Promise.resolve(system.reload("api")).catch((error) => context.logger.error("system reload request failed", { error: toErrorMessage(error) })));
        return Response.json({ ok: true });
      }

      if (method === "GET" && path === "/v1/system/keys") return Response.json({ apiKeys: storage.listApiKeys() });
      if (method === "POST" && path === "/v1/system/keys") return Response.json(createManagedApiKey(storage, await parseBody<ApiKeyCreateRequest>(request)));
      if ((match = path.match(/^\/v1\/system\/keys\/([^/:]+)$/))) {
        const apiKeyId = decodeURIComponent(match[1]);
        if (method === "GET") return Response.json({ apiKey: requireApiKey(storage, apiKeyId) });
        if (method === "PATCH") return Response.json({ apiKey: updateApiKey(storage, { ...(await parseBody<Omit<ApiKeyUpdateRequest, "apiKeyId">>(request)), apiKeyId }) });
        if (method === "DELETE") {
          deleteApiKey(storage, { apiKeyId });
          return Response.json({ ok: true });
        }
      }
      if ((match = path.match(/^\/v1\/system\/keys\/([^/:]+):rotate$/)) && method === "POST") {
        return Response.json(rotateApiKey(storage, { ...(await parseBody<Omit<ApiKeyRotateRequest, "apiKeyId">>(request)), apiKeyId: decodeURIComponent(match[1]) }));
      }

      if (method === "GET" && path === "/v1/accounts") return Response.json({ accounts: accounts.list() });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)$/)) && method === "GET") {
        return Response.json({ account: requireAccount(accounts, decodeURIComponent(match[1])) });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/login\/qr$/)) && method === "POST") {
        const account = requireAccount(accounts, decodeURIComponent(match[1]));
        return Response.json({ account, qrCode: account.qrCode });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/login\/pairing-code$/)) && method === "POST") {
        const accountId = decodeURIComponent(match[1]);
        return Response.json({ pairingCode: await gateway.requestPairingCode({ ...(await parseBody(request)), accountId }) });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/profile\/status$/)) && method === "POST") {
        await gateway.setStatus({ accountId: decodeURIComponent(match[1]), status: (await parseBody<{ text: string }>(request)).text });
        return Response.json({ ok: true });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/profile\/status\/([^/]+)$/)) && method === "DELETE") {
        await gateway.revokeStatusMessage({ accountId: decodeURIComponent(match[1]), messageId: decodeURIComponent(match[2]) });
        return Response.json({ ok: true });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/profile\/name$/)) && method === "POST") {
        return Response.json({ ok: await gateway.setDisplayName({ accountId: decodeURIComponent(match[1]), displayName: (await parseBody<{ displayName: string }>(request)).displayName }) });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/profile\/photo$/))) {
        const accountId = decodeURIComponent(match[1]);
        if (method === "POST") return Response.json({ ok: await gateway.setProfilePicture({ accountId, media: (await parseBody<{ media: { filePath?: string } }>(request)).media }) });
        if (method === "DELETE") return Response.json({ ok: await gateway.deleteProfilePicture({ accountId }) });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/presence$/)) && method === "POST") {
        const accountId = decodeURIComponent(match[1]);
        const { presence } = await parseBody<{ presence: "available" | "unavailable" }>(request);
        if (presence === "available") await gateway.sendPresenceAvailable({ accountId }); else await gateway.sendPresenceUnavailable({ accountId });
        return Response.json({ ok: true });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/state$/)) && method === "GET") return Response.json({ state: await gateway.getState({ accountId: decodeURIComponent(match[1]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/version$/)) && method === "GET") return Response.json({ version: await gateway.getWWebVersion({ accountId: decodeURIComponent(match[1]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/settings\/auto-download$/)) && method === "PATCH") {
        await gateway.setAutoDownload({ ...(await parseBody(request)), accountId: decodeURIComponent(match[1]) });
        return Response.json({ ok: true });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/call-links$/)) && method === "POST") {
        return Response.json({ url: await gateway.createCallLink({ ...(await parseBody(request)), accountId: decodeURIComponent(match[1]) }) });
      }

      if (method === "GET" && path === "/v1/messages") {
        return Response.json({ messages: await gateway.listMessages({ accountId: url.searchParams.get("accountId") ?? undefined, limit: 100 }) });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/messages:search$/)) && method === "GET") {
        return Response.json({ messages: await gateway.searchMessages({ accountId: decodeURIComponent(match[1]), query: requiredQuery(url, "query"), chatId: url.searchParams.get("chatId") ?? undefined, page: intQuery(url, "page"), limit: intQuery(url, "limit") }) });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/messages\/([^/]+)$/))) {
        const body: MessageActionRequest = { accountId: decodeURIComponent(match[1]), messageId: decodeURIComponent(match[2]) };
        if (method === "GET") return Response.json({ message: await gateway.getMessage(body) });
        if (method === "PATCH") return Response.json(await gateway.editMessage({ ...body, text: (await parseBody<{ text: string }>(request)).text }));
        if (method === "DELETE") {
          await gateway.deleteMessage({ ...body, everyone: booleanQuery(url, "everyone"), clearMedia: booleanQuery(url, "clearMedia") });
          return Response.json({ ok: true });
        }
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/messages\/([^/]+):reply$/)) && method === "POST") {
        return Response.json(await gateway.replyToMessage({ ...(await parseBody(request)), accountId: decodeURIComponent(match[1]), messageId: decodeURIComponent(match[2]) }));
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/messages\/([^/]+):forward$/)) && method === "POST") {
        await gateway.forwardMessage({ ...(await parseBody(request)), accountId: decodeURIComponent(match[1]), messageId: decodeURIComponent(match[2]) });
        return Response.json({ ok: true });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/messages\/([^/]+)\/reaction$/))) {
        const body: MessageActionRequest = { accountId: decodeURIComponent(match[1]), messageId: decodeURIComponent(match[2]) };
        if (method === "GET") return Response.json(await gateway.getMessageReactions(body));
        if (method === "PUT") {
          await gateway.reactToMessage({ ...body, reaction: (await parseBody<{ reaction: string }>(request)).reaction });
          return Response.json({ ok: true });
        }
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/messages\/([^/]+)\/star$/))) {
        const body: MessageActionRequest = { accountId: decodeURIComponent(match[1]), messageId: decodeURIComponent(match[2]) };
        if (method === "PUT") {
          await gateway.starMessage(body);
          return Response.json({ ok: true });
        }
        if (method === "DELETE") {
          await gateway.unstarMessage(body);
          return Response.json({ ok: true });
        }
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/messages\/([^/]+)\/pin$/))) {
        const body: MessageActionRequest = { accountId: decodeURIComponent(match[1]), messageId: decodeURIComponent(match[2]) };
        if (method === "PUT") return Response.json({ ok: await gateway.pinMessage({ ...body, duration: (await parseBody<{ duration: number }>(request)).duration }) });
        if (method === "DELETE") return Response.json({ ok: await gateway.unpinMessage(body) });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/messages\/([^/]+)\/poll-votes$/))) {
        const body: MessageActionRequest = { accountId: decodeURIComponent(match[1]), messageId: decodeURIComponent(match[2]) };
        if (method === "GET") return Response.json(await gateway.getPollVotesForMessage(body));
        if (method === "POST") {
          await gateway.voteInPoll({ ...body, selectedOptions: (await parseBody<{ selectedOptions: string[] }>(request)).selectedOptions });
          return Response.json({ ok: true });
        }
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/messages\/([^/]+)\/event-response$/)) && method === "POST") {
        return Response.json({ ok: await gateway.respondToScheduledEvent({ accountId: decodeURIComponent(match[1]), eventMessageId: decodeURIComponent(match[2]), response: (await parseBody<{ response: number }>(request)).response }) });
      }

      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/chats$/)) && method === "GET") return Response.json({ chats: await gateway.listChats({ accountId: decodeURIComponent(match[1]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/chats\/([^/]+)$/))) {
        const body = { accountId: decodeURIComponent(match[1]), chatId: decodeURIComponent(match[2]) };
        if (method === "GET") return Response.json(await gateway.getChat(body));
        if (method === "DELETE") return Response.json({ ok: await gateway.deleteChat(body) });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/chats\/([^/]+)\/messages$/))) {
        const body = { accountId: decodeURIComponent(match[1]), chatId: decodeURIComponent(match[2]) };
        if (method === "GET") return Response.json({ messages: await gateway.fetchChatMessages({ ...body, limit: intQuery(url, "limit"), fromMe: boolQuery(url, "fromMe") }) });
        if (method === "POST") return Response.json(await dispatchUnifiedMessageSend(sender, gateway, { ...(await parseBody<UnifiedMessageSendRequest>(request)), ...body }));
        if (method === "DELETE") return Response.json({ ok: await gateway.clearChatMessages(body) });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/chats\/([^/]+)\/archive$/))) {
        const body = { accountId: decodeURIComponent(match[1]), chatId: decodeURIComponent(match[2]) };
        if (method === "PUT") return Response.json({ ok: await gateway.archiveChat(body) });
        if (method === "DELETE") return Response.json({ ok: await gateway.unarchiveChat(body) });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/chats\/([^/]+)\/pin$/))) {
        const body = { accountId: decodeURIComponent(match[1]), chatId: decodeURIComponent(match[2]) };
        if (method === "PUT") return Response.json({ ok: await gateway.pinChat(body) });
        if (method === "DELETE") return Response.json({ ok: await gateway.unpinChat(body) });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/chats\/([^/]+)\/mute$/))) {
        const body = { accountId: decodeURIComponent(match[1]), chatId: decodeURIComponent(match[2]) };
        if (method === "PUT") return Response.json(await gateway.muteChat({ ...body, until: (await parseBody<{ until?: string }>(request)).until }));
        if (method === "DELETE") return Response.json(await gateway.unmuteChat(body));
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/chats\/([^/]+)\/read:seen$/)) && method === "POST") return Response.json({ ok: await gateway.sendSeen({ accountId: decodeURIComponent(match[1]), chatId: decodeURIComponent(match[2]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/chats\/([^/]+)\/read:mark-unread$/)) && method === "POST") {
        await gateway.markChatUnread({ accountId: decodeURIComponent(match[1]), chatId: decodeURIComponent(match[2]) });
        return Response.json({ ok: true });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/chats\/([^/]+)\/activity\/typing:(start|stop)$/)) && method === "POST") {
        const body = { accountId: decodeURIComponent(match[1]), chatId: decodeURIComponent(match[2]) };
        if (match[3] === "start") await gateway.sendTyping(body); else await gateway.clearChatState(body);
        return Response.json({ ok: true });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/chats\/([^/]+)\/activity\/recording:(start|stop)$/)) && method === "POST") {
        const body = { accountId: decodeURIComponent(match[1]), chatId: decodeURIComponent(match[2]) };
        if (match[3] === "start") await gateway.sendRecording(body); else await gateway.clearChatState(body);
        return Response.json({ ok: true });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/chats\/([^/]+)\/history:sync$/)) && method === "POST") return Response.json({ ok: await gateway.syncHistory({ accountId: decodeURIComponent(match[1]), chatId: decodeURIComponent(match[2]) }) });

      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/groups$/)) && method === "POST") return Response.json(await gateway.createGroup({ ...(await parseBody(request)), accountId: decodeURIComponent(match[1]) }));
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/groups\/([^/]+)$/))) {
        const body = { accountId: decodeURIComponent(match[1]), groupId: decodeURIComponent(match[2]) };
        if (method === "GET") return Response.json(await gateway.getGroupInfo(body));
        if (method === "PATCH") return Response.json(await gateway.updateGroupSettings({ ...body, ...(await parseBody(request)) }));
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/groups\/([^/]+):leave$/)) && method === "POST") {
        await gateway.leaveGroup({ accountId: decodeURIComponent(match[1]), groupId: decodeURIComponent(match[2]) });
        return Response.json({ ok: true });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/group-invites\/([^/:]+)$/)) && method === "GET") return Response.json(await gateway.getInviteInfo({ accountId: decodeURIComponent(match[1]), inviteCode: decodeURIComponent(match[2]) }));
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/group-invites\/([^/:]+):join$/)) && method === "POST") return Response.json({ groupId: await gateway.joinGroupByInvite({ accountId: decodeURIComponent(match[1]), inviteCode: decodeURIComponent(match[2]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/group-invites\/([^/:]+):private-accept$/)) && method === "POST") return Response.json(await gateway.acceptGroupV4Invite({ ...(await parseBody(request)), accountId: decodeURIComponent(match[1]), inviteCode: decodeURIComponent(match[2]) }));
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/groups\/([^/]+)\/invite-code$/))) {
        const body = { accountId: decodeURIComponent(match[1]), groupId: decodeURIComponent(match[2]) };
        if (method === "GET") return Response.json({ inviteCode: await gateway.getGroupInvite(body) });
        if (method === "DELETE") {
          await gateway.revokeGroupInvite(body);
          return Response.json({ ok: true });
        }
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/groups\/([^/]+)\/membership-requests$/)) && method === "GET") return Response.json({ requests: await gateway.getGroupMembershipRequests({ accountId: decodeURIComponent(match[1]), groupId: decodeURIComponent(match[2]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/groups\/([^/]+)\/membership-requests:(approve|reject)$/)) && method === "POST") {
        const body = { ...(await parseBody<Record<string, unknown>>(request)), accountId: decodeURIComponent(match[1]), groupId: decodeURIComponent(match[2]) };
        const results = match[3] === "approve" ? await gateway.approveGroupMembershipRequests(body) : await gateway.rejectGroupMembershipRequests(body);
        return Response.json({ results });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/groups\/([^/]+)\/participants:(add|remove|promote|demote)$/)) && method === "POST") {
        const parsed = await parseBody<{ participantIds: string[]; comment?: string }>(request);
        const body = { ...parsed, accountId: decodeURIComponent(match[1]), groupId: decodeURIComponent(match[2]) };
        const action = match[3];
        if (action === "add") return Response.json(await gateway.addGroupParticipants(body));
        if (action === "remove") return Response.json(await gateway.kickGroupParticipants(body));
        if (action === "promote") return Response.json(await gateway.promoteGroupParticipants(body));
        return Response.json(await gateway.demoteGroupParticipants(body));
      }

      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/channels$/))) {
        const accountId = decodeURIComponent(match[1]);
        if (method === "GET") return Response.json({ channels: await gateway.listChannels({ accountId }) });
        if (method === "POST") return Response.json(await gateway.createChannel({ ...(await parseBody(request)), accountId }));
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/channels:search$/)) && method === "GET") return Response.json({ channels: await gateway.searchChannels({ accountId: decodeURIComponent(match[1]), searchText: url.searchParams.get("searchText") ?? undefined, countryCodes: url.searchParams.getAll("countryCodes"), skipSubscribedNewsletters: boolQuery(url, "skipSubscribedNewsletters"), view: intQuery(url, "view"), limit: intQuery(url, "limit") }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/channels:by-invite$/)) && method === "GET") return Response.json(await gateway.getChannelByInvite({ accountId: decodeURIComponent(match[1]), inviteCode: requiredQuery(url, "inviteCode") }));
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/channels\/([^/]+)$/))) {
        const body: ChannelActionRequest = { accountId: decodeURIComponent(match[1]), channelId: decodeURIComponent(match[2]) };
        if (method === "GET") return Response.json({ channel: await gateway.getChannel(body) });
        if (method === "PATCH") return Response.json(await gateway.updateChannel({ ...body, ...(await parseBody(request)) }));
        if (method === "DELETE") return Response.json({ ok: await gateway.deleteChannel(body) });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/channels\/([^/]+)\/subscribers$/)) && method === "GET") return Response.json({ subscribers: await gateway.getChannelSubscribers({ accountId: decodeURIComponent(match[1]), channelId: decodeURIComponent(match[2]), limit: intQuery(url, "limit") }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/channels\/([^/]+)\/messages$/))) {
        const body = { accountId: decodeURIComponent(match[1]), channelId: decodeURIComponent(match[2]) };
        if (method === "GET") return Response.json({ messages: await gateway.fetchChannelMessages({ ...body, limit: intQuery(url, "limit"), fromMe: boolQuery(url, "fromMe") }) });
        if (method === "POST") return Response.json(await dispatchUnifiedChannelSend(gateway, { ...(await parseBody<UnifiedChannelSendRequest>(request)), ...body }));
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/channels\/([^/]+)\/(subscription|mute)$/))) {
        const body = { accountId: decodeURIComponent(match[1]), channelId: decodeURIComponent(match[2]) };
        if (match[3] === "subscription") {
          if (method === "PUT") return Response.json({ ok: await gateway.subscribeToChannel(body) });
          if (method === "DELETE") return Response.json({ ok: await gateway.unsubscribeFromChannel(body) });
        }
        if (match[3] === "mute") {
          if (method === "PUT") return Response.json({ ok: await gateway.muteChannel(body) });
          if (method === "DELETE") return Response.json({ ok: await gateway.unmuteChannel(body) });
        }
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/channels\/([^/]+)\/read:seen$/)) && method === "POST") return Response.json({ ok: await gateway.sendSeenToChannel({ accountId: decodeURIComponent(match[1]), channelId: decodeURIComponent(match[2]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/channels\/([^/]+)\/(admins:invite|admins:accept|admins:revoke-invite|admins:demote|ownership:transfer)$/)) && method === "POST") {
        const accountId = decodeURIComponent(match[1]);
        const channelId = decodeURIComponent(match[2]);
        const body = await parseBody<Record<string, unknown>>(request);
        switch (match[3]) {
          case "admins:invite": return Response.json({ ok: await gateway.inviteChannelAdmin({ accountId, channelId, userId: String(body.userId), comment: stringValue(body.comment) }) });
          case "admins:accept": return Response.json({ ok: await gateway.acceptChannelAdminInvite({ accountId, channelId }) });
          case "admins:revoke-invite": return Response.json({ ok: await gateway.revokeChannelAdminInvite({ accountId, channelId, userId: String(body.userId), comment: stringValue(body.comment) }) });
          case "admins:demote": return Response.json({ ok: await gateway.demoteChannelAdmin({ accountId, channelId, userId: String(body.userId) }) });
          default: return Response.json({ ok: await gateway.transferChannelOwnership({ accountId, channelId, newOwnerId: String(body.newOwnerId), shouldDismissSelfAsAdmin: booleanValue(body.shouldDismissSelfAsAdmin) }) });
        }
      }

      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/labels$/)) && method === "GET") return Response.json({ labels: await gateway.listLabels({ accountId: decodeURIComponent(match[1]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/labels\/([^/]+)$/)) && method === "GET") return Response.json(await gateway.getLabel({ accountId: decodeURIComponent(match[1]), labelId: decodeURIComponent(match[2]) }));
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/labels\/([^/]+)\/chats$/)) && method === "GET") return Response.json({ chats: await gateway.getChatsByLabel({ accountId: decodeURIComponent(match[1]), labelId: decodeURIComponent(match[2]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/chats\/([^/]+)\/labels$/)) && method === "GET") return Response.json({ labels: await gateway.getChatLabels({ accountId: decodeURIComponent(match[1]), chatId: decodeURIComponent(match[2]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/chat-labels$/)) && method === "PUT") {
        await gateway.updateChatLabels({ ...(await parseBody(request)), accountId: decodeURIComponent(match[1]) });
        return Response.json({ ok: true });
      }

      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/broadcasts$/)) && method === "GET") return Response.json({ broadcasts: await gateway.listBroadcasts({ accountId: decodeURIComponent(match[1]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/broadcasts\/([^/]+)$/)) && method === "GET") return Response.json(await gateway.getBroadcast({ accountId: decodeURIComponent(match[1]), broadcastId: decodeURIComponent(match[2]) }));

      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/contacts$/)) && method === "GET") return Response.json({ contacts: await gateway.listContacts({ accountId: decodeURIComponent(match[1]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/contacts\/blocked$/)) && method === "GET") return Response.json({ contacts: await gateway.listBlockedContacts({ accountId: decodeURIComponent(match[1]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/contacts\/([^/]+)$/)) && method === "GET") return Response.json(await gateway.getContactInfo({ accountId: decodeURIComponent(match[1]), contactId: decodeURIComponent(match[2]) }));
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/contacts\/([^/]+)\/block$/))) {
        const body = { accountId: decodeURIComponent(match[1]), contactId: decodeURIComponent(match[2]) };
        if (method === "PUT") return Response.json({ ok: await gateway.blockContact(body) });
        if (method === "DELETE") return Response.json({ ok: await gateway.unblockContact(body) });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/contacts\/([^/]+)\/groups\/common$/)) && method === "GET") return Response.json({ groups: await gateway.getCommonGroups({ accountId: decodeURIComponent(match[1]), contactId: decodeURIComponent(match[2]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/numbers:format$/)) && method === "GET") return Response.json({ formattedNumber: await gateway.getFormattedNumber({ accountId: decodeURIComponent(match[1]), contactId: requiredQuery(url, "value") }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/numbers:country-code$/)) && method === "GET") return Response.json({ countryCode: await gateway.getCountryCode({ accountId: decodeURIComponent(match[1]), contactId: requiredQuery(url, "value") }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/numbers:resolve-id$/)) && method === "GET") return Response.json({ numberId: await gateway.getNumberId({ accountId: decodeURIComponent(match[1]), number: requiredQuery(url, "number") }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/contacts\/([^/]+)\/registration$/)) && method === "GET") return Response.json({ registered: await gateway.isRegisteredUser({ accountId: decodeURIComponent(match[1]), contactId: decodeURIComponent(match[2]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/contacts\/([^/]+)\/device-count$/)) && method === "GET") return Response.json({ count: await gateway.getContactDeviceCount({ accountId: decodeURIComponent(match[1]), contactId: decodeURIComponent(match[2]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/contacts\/([^/]+)\/photo$/)) && method === "GET") return Response.json({ url: await gateway.getProfilePicture({ accountId: decodeURIComponent(match[1]), contactId: decodeURIComponent(match[2]) }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/address-book\/([^/]+)$/)) && method === "PUT") {
        const body = await parseBody<{ firstName: string; lastName?: string; syncToAddressbook?: boolean }>(request);
        await gateway.saveAddressBookContact({ accountId: decodeURIComponent(match[1]), phoneNumber: decodeURIComponent(match[2]), firstName: body.firstName, lastName: body.lastName ?? "", syncToAddressbook: body.syncToAddressbook });
        return Response.json({ ok: true });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/address-book\/([^/]+)$/)) && method === "DELETE") {
        await gateway.deleteAddressBookContact({ accountId: decodeURIComponent(match[1]), phoneNumber: decodeURIComponent(match[2]) });
        return Response.json({ ok: true });
      }
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/identities:resolve-lid-phone$/)) && method === "POST") return Response.json({ records: await gateway.getContactLidAndPhone({ accountId: decodeURIComponent(match[1]), userIds: (await parseBody<{ userIds: string[] }>(request)).userIds }) });
      if ((match = path.match(/^\/v1\/accounts\/([^/]+)\/contacts\/([^/]+)\/note$/))) {
        const accountId = decodeURIComponent(match[1]);
        const userId = decodeURIComponent(match[2]);
        if (method === "PUT") {
          await gateway.addCustomerNote({ accountId, userId, note: (await parseBody<{ note: string }>(request)).note });
          return Response.json({ ok: true });
        }
        if (method === "GET") return Response.json(await gateway.getCustomerNote({ accountId, userId }));
      }

      if (method === "GET" && path === "/v1/workflows") return Response.json({ workflows: storage.listWorkflows() as WorkflowDefinition[] });
      if (method === "GET" && path === "/v1/workflows/providers") {
        const registry = context.capabilities.resolve<{ listProviderTypes?: () => { triggers: string[]; conditions: string[]; actions: string[] } }>(capabilityNames.workflowRegistry);
        return Response.json(registry.listProviderTypes?.() ?? { triggers: [], conditions: [], actions: [] });
      }
      if (method === "GET" && path === "/v1/workflows/executions") return Response.json({ executions: storage.listWorkflowExecutions(100) });
      if (method === "POST" && path === "/v1/workflows:validate") {
        const registry = context.capabilities.resolve<{ validate?: (workflow: WorkflowDefinition) => { ok: boolean; issues: string[] } }>(capabilityNames.workflowRegistry);
        return Response.json(registry.validate?.(await parseBody(request)) ?? { ok: false, issues: ["workflow registry unavailable"] });
      }
      if (method === "PUT" && path === "/v1/workflows") {
        const registry = context.capabilities.resolve<{ upsert?: (workflow: WorkflowDefinition) => void }>(capabilityNames.workflowRegistry);
        registry.upsert?.(await parseBody(request));
        return Response.json({ ok: true });
      }
      if (method === "POST" && path === "/v1/workflows:test") {
        const registry = context.capabilities.resolve<{ test?: (input: { workflow?: WorkflowDefinition; workflowId?: string; eventType: string; accountId?: string; payload: unknown }) => Promise<unknown> }>(capabilityNames.workflowRegistry);
        return Response.json(await registry.test?.(await parseBody(request)) ?? { ok: false, error: "workflow registry unavailable" });
      }

      if (method === "GET" && path === "/v1/webhooks") return Response.json({ webhooks: webhookRegistry.list() });
      if (method === "GET" && path === "/v1/webhooks/deliveries") return Response.json({ deliveries: storage.listWebhookDeliveries(100) });
      if ((match = path.match(/^\/v1\/webhooks\/([^/]+)$/))) {
        const webhookId = decodeURIComponent(match[1]);
        if (method === "PUT") {
          const body = await parseBody<{ url: string; secret?: string; enabled?: boolean; eventTypes?: string[]; accountIds?: string[]; headers?: Record<string, string> }>(request);
          webhookRegistry.upsert({ id: webhookId, url: body.url, secret: body.secret, enabled: body.enabled ?? true, eventTypes: body.eventTypes ?? ["*"], accountIds: body.accountIds, headers: body.headers });
          return Response.json({ ok: true });
        }
        if (method === "DELETE") {
          webhookRegistry.remove(webhookId);
          return Response.json({ ok: true });
        }
      }
      if ((match = path.match(/^\/v1\/webhooks\/deliveries\/([^/:]+):replay$/)) && method === "POST") {
        await webhookRegistry.replayDelivery(decodeURIComponent(match[1]));
        return Response.json({ ok: true });
      }
      if ((match = path.match(/^\/v1\/webhooks\/events\/([^/:]+):test$/)) && method === "POST") {
        const body = await parseBody<{ accountId?: string; payload?: unknown }>(request);
        await context.events.publish({ eventId: crypto.randomUUID(), timestamp: new Date().toISOString(), sourceModule: "runtime-api", type: decodeURIComponent(match[1]), accountId: body.accountId, payload: body.payload ?? {} });
        return Response.json({ ok: true });
      }

      return Response.json({ error: "not found" }, { status: 404 });
    } catch (error) {
      context.logger.error("api request failed", { path: url.pathname, error: toErrorMessage(error) });
      return Response.json({ error: toErrorMessage(error) }, { status: 500 });
    }
  };
}

async function dispatchUnifiedMessageSend(sender: MessageSender, gateway: WhatsAppGateway, request: UnifiedMessageSendRequest): Promise<{ messageId?: string }> {
  const primary = getPrimaryMessagePayload(request);
  switch (primary.kind) {
    case "text":
      return sender.sendText(request.accountId, request.chatId, primary.text, { quotedMessageId: request.quotedMessageId, mentions: request.mentions, groupMentions: request.groupMentions });
    case "media":
      return gateway.sendMedia({ accountId: request.accountId, chatId: request.chatId, media: primary.media, caption: request.caption, mentions: request.mentions, groupMentions: request.groupMentions, quotedMessageId: request.quotedMessageId, asDocument: primary.mode === "document", asSticker: primary.mode === "sticker", asVoice: primary.mode === "voice", asGif: primary.mode === "gif", asHd: request.hd, isViewOnce: request.viewOnce, stickerName: request.stickerName, stickerAuthor: request.stickerAuthor, stickerCategories: request.stickerCategories });
    case "contacts":
      return gateway.sendContactCards({ accountId: request.accountId, chatId: request.chatId, contactIds: primary.contactIds, quotedMessageId: request.quotedMessageId });
    case "location":
      return gateway.sendLocation({ accountId: request.accountId, chatId: request.chatId, quotedMessageId: request.quotedMessageId, ...primary.location });
    case "poll":
      return gateway.createPoll({ accountId: request.accountId, chatId: request.chatId, question: primary.poll.question, options: primary.poll.options, allowMultipleAnswers: primary.poll.allowMultipleAnswers, quotedMessageId: request.quotedMessageId });
    case "event":
      return gateway.createScheduledEvent({ accountId: request.accountId, chatId: request.chatId, quotedMessageId: request.quotedMessageId, ...primary.event });
  }
}

async function dispatchUnifiedChannelSend(gateway: WhatsAppGateway, request: UnifiedChannelSendRequest): Promise<{ messageId?: string }> {
  const primary = getPrimaryMessagePayload({ ...request, chatId: request.channelId });
  if (primary.kind === "contacts" || primary.kind === "location" || primary.kind === "poll" || primary.kind === "event") throw new Error(`channel messages do not support ${primary.kind}`);
  if (request.viewOnce || request.hd || request.stickerName || request.stickerAuthor || request.stickerCategories?.length) throw new Error("channel messages do not support chat-only send modifiers");
  if (primary.kind === "media" && ["voice", "sticker"].includes(primary.mode)) throw new Error(`channel messages do not support ${primary.mode}`);
  return gateway.sendChannelMessage({ accountId: request.accountId, channelId: request.channelId, text: primary.kind === "text" ? primary.text : request.text, media: primary.kind === "media" ? primary.media : undefined, caption: request.caption, mentions: request.mentions });
}

function getPrimaryMessagePayload(request: UnifiedMessageSendRequest):
  | { kind: "text"; text: string }
  | { kind: "media"; mode: "image" | "video" | "audio" | "voice" | "document" | "sticker" | "gif"; media: NonNullable<UnifiedMessageSendRequest["image"]> }
  | { kind: "contacts"; contactIds: string[] }
  | { kind: "location"; location: NonNullable<UnifiedMessageSendRequest["location"]> }
  | { kind: "poll"; poll: NonNullable<UnifiedMessageSendRequest["poll"]> }
  | { kind: "event"; event: NonNullable<UnifiedMessageSendRequest["event"]> } {
  const candidates = [
    request.image ? { kind: "media", mode: "image", media: request.image } : undefined,
    request.video ? { kind: "media", mode: "video", media: request.video } : undefined,
    request.audio ? { kind: "media", mode: "audio", media: request.audio } : undefined,
    request.voice ? { kind: "media", mode: "voice", media: request.voice } : undefined,
    request.document ? { kind: "media", mode: "document", media: request.document } : undefined,
    request.sticker ? { kind: "media", mode: "sticker", media: request.sticker } : undefined,
    request.gif ? { kind: "media", mode: "gif", media: request.gif } : undefined,
    request.contacts?.length ? { kind: "contacts", contactIds: request.contacts } : undefined,
    request.location ? { kind: "location", location: request.location } : undefined,
    request.poll ? { kind: "poll", poll: request.poll } : undefined,
    request.event ? { kind: "event", event: request.event } : undefined
  ].filter(Boolean);
  if (candidates.length > 1) throw new Error("send requests must include exactly one primary payload family");
  if (candidates.length === 1) return candidates[0] as never;
  const text = request.text?.trim();
  if (!text) throw new Error("text is required when no other primary payload is provided");
  return { kind: "text", text };
}

function authorizeRequest(request: Request, storage: StorageEngine): { ok: true; apiKey: StoredApiKeyRecord } | { ok: false; status: number; error: string } {
  const authorization = request.headers.get("authorization");
  if (!authorization) return { ok: false, status: 401, error: "missing bearer token" };
  const presentedKey = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!presentedKey) return { ok: false, status: 401, error: "invalid bearer token" };
  const apiKey = storage.getApiKeyByHash(hashApiKey(presentedKey));
  if (!apiKey) return { ok: false, status: 401, error: "invalid api key" };
  if (!apiKey.enabled) return { ok: false, status: 403, error: "api key disabled" };
  if (apiKey.expiresAt && Date.parse(apiKey.expiresAt) <= Date.now()) return { ok: false, status: 403, error: "api key expired" };
  return { ok: true, apiKey };
}

async function parseBody<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

function permissionForRoute(method: string, pathname: string): string {
  if (pathname.startsWith("/v1/system/keys")) return method === "GET" ? "keys:read" : "keys:write";
  if (pathname === "/v1/system:reload") return "system:reload";
  return method === "GET" ? "read" : "write";
}

function hasApiKeyPermission(apiKey: ApiKeyRecord, requiredPermission: string): boolean {
  const permissions = new Set(apiKey.permissions);
  if (permissions.has("*") || permissions.has(requiredPermission)) return true;
  const [scope, action] = requiredPermission.split(":");
  return permissions.has(`${scope}:*`) || (action ? permissions.has(action) : false);
}

function syncConfiguredApiKeys(storage: StorageEngine, configuredKeys: ApiKeySeed[]): void {
  for (const configuredKey of configuredKeys) {
    const existing = storage.getApiKey(configuredKey.id);
    const now = new Date().toISOString();
    storage.saveApiKey({ id: configuredKey.id, name: configuredKey.name, keyHash: hashApiKey(configuredKey.key), enabled: configuredKey.enabled ?? true, permissions: normalizePermissions(configuredKey.permissions), expiresAt: configuredKey.expiresAt, source: "config", createdAt: existing?.createdAt ?? now, updatedAt: now, lastUsedAt: existing?.lastUsedAt });
  }
}

function createManagedApiKey(storage: StorageEngine, request: ApiKeyCreateRequest): { apiKey: ApiKeyRecord; key: string } {
  const now = new Date().toISOString();
  const id = request.id?.trim() || crypto.randomUUID();
  const key = request.key?.trim() || randomBytes(24).toString("base64url");
  const record: StoredApiKeyRecord = { id, name: request.name.trim(), keyHash: hashApiKey(key), enabled: request.enabled ?? true, permissions: normalizePermissions(request.permissions), expiresAt: request.expiresAt ?? undefined, source: "managed", createdAt: now, updatedAt: now };
  storage.saveApiKey(record);
  return { apiKey: stripApiKeySecret(record), key };
}

function requireApiKey(storage: StorageEngine, apiKeyId: string): ApiKeyRecord {
  const apiKey = storage.getApiKey(apiKeyId);
  if (!apiKey) throw new Error(`Unknown API key: ${apiKeyId}`);
  return stripApiKeySecret(apiKey);
}

function updateApiKey(storage: StorageEngine, request: ApiKeyUpdateRequest): ApiKeyRecord {
  const existing = storage.getApiKey(request.apiKeyId);
  if (!existing) throw new Error(`Unknown API key: ${request.apiKeyId}`);
  const updated: StoredApiKeyRecord = { ...existing, name: request.name?.trim() || existing.name, enabled: request.enabled ?? existing.enabled, permissions: request.permissions ? normalizePermissions(request.permissions) : existing.permissions, expiresAt: request.expiresAt === null ? undefined : request.expiresAt ?? existing.expiresAt, updatedAt: new Date().toISOString() };
  ensureAtLeastOneActiveApiKey(storage, updated, existing.id);
  storage.saveApiKey(updated);
  return stripApiKeySecret(updated);
}

function rotateApiKey(storage: StorageEngine, request: ApiKeyRotateRequest): { apiKey: ApiKeyRecord; key: string } {
  const existing = storage.getApiKey(request.apiKeyId);
  if (!existing) throw new Error(`Unknown API key: ${request.apiKeyId}`);
  const key = request.key?.trim() || randomBytes(24).toString("base64url");
  const updated: StoredApiKeyRecord = { ...existing, keyHash: hashApiKey(key), updatedAt: new Date().toISOString() };
  storage.saveApiKey(updated);
  return { apiKey: stripApiKeySecret(updated), key };
}

function deleteApiKey(storage: StorageEngine, request: ApiKeyDeleteRequest): void {
  const existing = storage.getApiKey(request.apiKeyId);
  if (!existing) throw new Error(`Unknown API key: ${request.apiKeyId}`);
  ensureAtLeastOneActiveApiKey(storage, undefined, existing.id);
  storage.deleteApiKey(existing.id);
}

function ensureAtLeastOneActiveApiKey(storage: StorageEngine, replacement?: ApiKeyRecord, removedApiKeyId?: string): void {
  const now = Date.now();
  const activeKeys = storage.listApiKeys().filter((apiKey) => {
    if (removedApiKeyId && apiKey.id === removedApiKeyId) return false;
    if (replacement && apiKey.id === replacement.id) return replacement.enabled && (!replacement.expiresAt || Date.parse(replacement.expiresAt) > now);
    return apiKey.enabled && (!apiKey.expiresAt || Date.parse(apiKey.expiresAt) > now);
  });
  if (activeKeys.length === 0) throw new Error("At least one active API key must remain");
}

function normalizePermissions(permissions?: string[]): string[] {
  const values = permissions?.map((value) => value.trim()).filter(Boolean) ?? ["*"];
  return [...new Set(values)];
}

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function stripApiKeySecret(apiKey: StoredApiKeyRecord): ApiKeyRecord {
  const { keyHash: _keyHash, ...safeRecord } = apiKey;
  return safeRecord;
}

function requireAccount(accounts: AccountRegistry, accountId: string) {
  const account = accounts.get(accountId);
  if (!account) throw new Error(`Unknown account: ${accountId}`);
  return account;
}

function requiredQuery(url: URL, key: string): string {
  const value = url.searchParams.get(key);
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function intQuery(url: URL, key: string): number | undefined {
  const value = url.searchParams.get(key);
  return value ? Number.parseInt(value, 10) : undefined;
}

function boolQuery(url: URL, key: string): boolean | undefined {
  const value = url.searchParams.get(key);
  return value === null ? undefined : value === "true";
}

function booleanQuery(url: URL, key: string): boolean | undefined {
  return boolQuery(url, key);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
