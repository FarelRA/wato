import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import {
  Client,
  LocalAuth,
  Location,
  MessageMedia,
  Poll,
  ScheduledEvent,
  type Chat,
  type Channel,
  type Contact,
  type Broadcast,
  type GroupChat,
  type Label,
  type Message,
  type MessageSendOptions,
  type AddParticipantsOptions
} from "whatsapp-web.js";
import { accountManagerCapability, type AccountManager } from "@wato/account-manager";
import {
  capabilityNames,
  createDomainEvent,
  type AccountAutoDownloadRequest,
  type AccountDisplayNameRequest,
  type AccountPairingCodeRequest,
  type AccountProfilePictureRequest,
  type AddressBookContactDeleteRequest,
  type AddressBookContactUpsertRequest,
  type BroadcastSummary,
  type CallLinkRequest,
  type ChannelActionRequest,
  type ChannelAdminInviteRequest,
  type ChannelCreateRequest,
  type ChannelInviteRequest,
  type ChannelMessagesRequest,
  type ChannelOwnershipRequest,
  type ChannelSendRequest,
  type ChannelSearchRequest,
  type ChannelSubscribersRequest,
  type ChannelSubscriptionRequest,
  type ChannelSummary,
  type ChannelUpdateRequest,
  type ChatActionRequest,
  type ChatSummary,
  type ChatMuteRequest,
  type DeleteMessageRequest,
  type EditMessageRequest,
  type FetchChatMessagesRequest,
  type ForwardMessageRequest,
  type ContactActionRequest,
  type ContactLidLookupRequest,
  type ContactSummary,
  type CreatePollRequest,
  type CustomerNoteLookupRequest,
  type CustomerNoteRequest,
  type GroupCreateRequest,
  type GroupInviteRequest,
  type GroupLeaveRequest,
  type GroupMembershipRequest,
  type GroupV4InviteRequest,
  type GroupParticipantsRequest,
  type GroupSettingsRequest,
  type GroupSummary,
  type JoinGroupInviteRequest,
  type MediaInput,
  type MessageActionRequest,
  type MessageEnvelope,
  type MessageSender,
  type OutboundMessageRequest,
  type PinMessageRequest,
  type ReactToMessageRequest,
  type ReplyToMessageRequest,
  type ScheduleEventCreateRequest,
  type ScheduleEventResponseRequest,
  type SearchMessagesRequest,
  type SendContactCardsRequest,
  type SendLocationRequest,
  type SendMediaRequest,
  type SendTextOptions,
  type StatusRevokeRequest,
  type StorageEngine,
  type VotePollRequest,
  type WatoModule,
  type WhatsAppGateway,
  type LabelSummary
} from "@wato/sdk";

type WhatsappClientMap = Map<string, Client>;

export const whatsappCoreModule: WatoModule = {
  manifest: {
    name: "whatsapp-core",
    version: "0.1.0",
    kind: "core",
    accountScopeSupport: "cross-account"
  },
  register(context) {
    const accountManager = context.capabilities.resolve<AccountManager>(accountManagerCapability);
    const storage = context.capabilities.resolve<StorageEngine>(capabilityNames.storage);
    const clients: WhatsappClientMap = new Map();

    const gateway: WhatsAppGateway = {
      sendText: async (request) => {
        const client = getClient(clients, request.accountId);
        const sent = await client.sendMessage(request.chatId, request.text, buildSendOptions(request));
        context.logger.info("sent text message", { accountId: request.accountId, chatId: request.chatId, textLength: request.text.length });
        return { messageId: sent.id.id };
      },
      sendMedia: async (request) => {
        const client = getClient(clients, request.accountId);
        const media = await resolveMedia(request.media);
        const sent = await client.sendMessage(request.chatId, media, buildMediaSendOptions(request));
        return { messageId: sent.id.id };
      },
      sendContactCards: async (request) => {
        const client = getClient(clients, request.accountId);
        const contacts = await Promise.all(request.contactIds.map((contactId) => client.getContactById(contactId)));
        const content = contacts.length === 1 ? contacts[0] : contacts;
        const sent = await client.sendMessage(request.chatId, content, buildSendOptions(request));
        return { messageId: sent.id.id };
      },
      sendLocation: async (request) => {
        const client = getClient(clients, request.accountId);
        const location = new Location(request.latitude, request.longitude, {
          name: request.name,
          address: request.address,
          url: request.url
        });
        if (request.description) {
          location.description = request.description;
        }
        const sent = await client.sendMessage(request.chatId, location, buildSendOptions(request));
        return { messageId: sent.id.id };
      },
      replyToMessage: async (request) => {
        const message = await getMessage(clients, request.accountId, request.messageId);
        const sent = await message.reply(request.text, request.chatId, { mentions: request.mentions });
        return { messageId: sent.id.id };
      },
      forwardMessage: async (request) => {
        const message = await getMessage(clients, request.accountId, request.messageId);
        await message.forward(request.chatId);
      },
      editMessage: async (request) => {
        const message = await getMessage(clients, request.accountId, request.messageId);
        const edited = await message.edit(request.text);
        return edited ? { messageId: edited.id.id } : null;
      },
      deleteMessage: async (request) => {
        const message = await getMessage(clients, request.accountId, request.messageId);
        await message.delete(request.everyone, request.clearMedia);
      },
      starMessage: async (request) => {
        const message = await getMessage(clients, request.accountId, request.messageId);
        await message.star();
      },
      unstarMessage: async (request) => {
        const message = await getMessage(clients, request.accountId, request.messageId);
        await message.unstar();
      },
      pinMessage: async (request) => {
        const message = await getMessage(clients, request.accountId, request.messageId);
        return message.pin(request.duration);
      },
      unpinMessage: async (request) => {
        const message = await getMessage(clients, request.accountId, request.messageId);
        return message.unpin();
      },
      getMessageInfo: async (request) => {
        const message = await getMessage(clients, request.accountId, request.messageId);
        return message.getInfo();
      },
      getMessageReactions: async (request) => {
        const message = await getMessage(clients, request.accountId, request.messageId);
        return message.getReactions();
      },
      getPollVotesForMessage: async (request) => {
        const message = await getMessage(clients, request.accountId, request.messageId);
        return message.getPollVotes();
      },
      reactToMessage: async (request) => {
        const message = await getMessage(clients, request.accountId, request.messageId);
        await message.react(request.reaction);
      },
      createPoll: async (request) => {
        const client = getClient(clients, request.accountId);
        const poll = new Poll(request.question, request.options, {
          allowMultipleAnswers: request.allowMultipleAnswers,
          messageSecret: Array.from(crypto.getRandomValues(new Uint8Array(32)))
        });
        const sent = await client.sendMessage(request.chatId, poll, buildSendOptions(request));
        return { messageId: sent.id.id };
      },
      voteInPoll: async (request) => {
        const message = await getMessage(clients, request.accountId, request.messageId);
        await message.vote(request.selectedOptions);
      },
      listChats: async (request) => {
        const client = getClient(clients, request.accountId);
        return (await client.getChats()).map(toChatSummary);
      },
      listLabels: async (request) => {
        const client = getClient(clients, request.accountId);
        return (await client.getLabels()).map(toLabelSummary);
      },
      getLabel: async (request) => {
        const client = getClient(clients, request.accountId);
        return toLabelSummary(await client.getLabelById(request.labelId));
      },
      getChatLabels: async (request) => {
        const client = getClient(clients, request.accountId);
        return (await client.getChatLabels(request.chatId)).map(toLabelSummary);
      },
      getChatsByLabel: async (request) => {
        const client = getClient(clients, request.accountId);
        return (await client.getChatsByLabelId(request.labelId)).map(toChatSummary);
      },
      updateChatLabels: async (request) => {
        const client = getClient(clients, request.accountId);
        await client.addOrRemoveLabels(request.labelIds, request.chatIds);
      },
      listBroadcasts: async (request) => {
        const client = getClient(clients, request.accountId);
        return (await client.getBroadcasts()).map(toBroadcastSummary);
      },
      getBroadcast: async (request) => {
        const client = getClient(clients, request.accountId);
        return toBroadcastSummary(await client.getBroadcastById(request.broadcastId));
      },
      getChat: async (request) => {
        return toChatSummary(await getChat(clients, request.accountId, request.chatId));
      },
      fetchChatMessages: async (request) => {
        const chat = await getChat(clients, request.accountId, request.chatId);
        const messages = await chat.fetchMessages({ limit: request.limit, fromMe: request.fromMe });
        return Promise.all(messages.map((message) => normalizeMessage({ accountId: request.accountId, message, context })));
      },
      searchMessages: async (request) => {
        const client = getClient(clients, request.accountId);
        const messages = await client.searchMessages(request.query, { chatId: request.chatId, page: request.page, limit: request.limit });
        return Promise.all(messages.map((message) => normalizeMessage({ accountId: request.accountId, message, context })));
      },
      archiveChat: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.archiveChat(request.chatId);
      },
      unarchiveChat: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.unarchiveChat(request.chatId);
      },
      pinChat: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.pinChat(request.chatId);
      },
      unpinChat: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.unpinChat(request.chatId);
      },
      markChatUnread: async (request) => {
        const client = getClient(clients, request.accountId);
        await client.markChatUnread(request.chatId);
      },
      sendSeen: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.sendSeen(request.chatId);
      },
      sendTyping: async (request) => {
        const chat = await getChat(clients, request.accountId, request.chatId);
        await chat.sendStateTyping();
      },
      sendRecording: async (request) => {
        const chat = await getChat(clients, request.accountId, request.chatId);
        await chat.sendStateRecording();
      },
      clearChatState: async (request) => {
        const chat = await getChat(clients, request.accountId, request.chatId);
        return chat.clearState();
      },
      clearChatMessages: async (request) => {
        const chat = await getChat(clients, request.accountId, request.chatId);
        return chat.clearMessages();
      },
      deleteChat: async (request) => {
        const chat = await getChat(clients, request.accountId, request.chatId);
        return chat.delete();
      },
      syncHistory: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.syncHistory(request.chatId);
      },
      joinGroupByInvite: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.acceptInvite(request.inviteCode);
      },
      getInviteInfo: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.getInviteInfo(request.inviteCode);
      },
      acceptGroupV4Invite: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.acceptGroupV4Invite({
          inviteCode: request.inviteCode,
          inviteCodeExp: request.inviteCodeExp,
          groupId: request.groupId,
          groupName: request.groupName,
          fromId: request.fromId,
          toId: request.toId
        });
      },
      createGroup: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.createGroup(request.title, request.participants, {
          messageTimer: request.messageTimer,
          parentGroupId: request.parentGroupId,
          autoSendInviteV4: request.autoSendInviteV4,
          comment: request.comment,
          memberAddMode: request.memberAddMode,
          membershipApprovalMode: request.membershipApprovalMode,
          isRestrict: request.isRestrict,
          isAnnounce: request.isAnnounce
        });
      },
      getGroupInvite: async (request) => {
        const group = await getGroupChat(clients, request.accountId, request.groupId);
        return group.getInviteCode();
      },
      revokeGroupInvite: async (request) => {
        const group = await getGroupChat(clients, request.accountId, request.groupId);
        return group.revokeInvite();
      },
      updateGroupSettings: async (request) => {
        const group = await getGroupChat(clients, request.accountId, request.groupId);
        const result: Record<string, boolean> = {};
        if (request.subject !== undefined) result.subject = await group.setSubject(request.subject);
        if (request.description !== undefined) result.description = await group.setDescription(request.description);
        if (request.messagesAdminsOnly !== undefined) result.messagesAdminsOnly = await group.setMessagesAdminsOnly(request.messagesAdminsOnly);
        if (request.infoAdminsOnly !== undefined) result.infoAdminsOnly = await group.setInfoAdminsOnly(request.infoAdminsOnly);
        if (request.addMembersAdminsOnly !== undefined) result.addMembersAdminsOnly = await group.setAddMembersAdminsOnly(request.addMembersAdminsOnly);
        return result;
      },
      addGroupParticipants: async (request) => {
        const group = await getGroupChat(clients, request.accountId, request.groupId);
        const options: AddParticipantsOptions | undefined = request.comment ? { comment: request.comment } : undefined;
        return group.addParticipants(request.participantIds, options);
      },
      kickGroupParticipants: async (request) => {
        const group = await getGroupChat(clients, request.accountId, request.groupId);
        return group.removeParticipants(request.participantIds);
      },
      promoteGroupParticipants: async (request) => {
        const group = await getGroupChat(clients, request.accountId, request.groupId);
        return group.promoteParticipants(request.participantIds);
      },
      demoteGroupParticipants: async (request) => {
        const group = await getGroupChat(clients, request.accountId, request.groupId);
        return group.demoteParticipants(request.participantIds);
      },
      leaveGroup: async (request) => {
        const group = await getGroupChat(clients, request.accountId, request.groupId);
        await group.leave();
      },
      getGroupMembershipRequests: async (request) => {
        const group = await getGroupChat(clients, request.accountId, request.groupId);
        return group.getGroupMembershipRequests();
      },
      approveGroupMembershipRequests: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.approveGroupMembershipRequests(request.groupId, { requesterIds: request.requesterIds ?? null, sleep: request.sleep ?? null });
      },
      rejectGroupMembershipRequests: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.rejectGroupMembershipRequests(request.groupId, { requesterIds: request.requesterIds ?? null, sleep: request.sleep ?? null });
      },
      muteChat: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.muteChat(request.chatId, request.until ? new Date(request.until) : undefined);
      },
      unmuteChat: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.unmuteChat(request.chatId);
      },
      blockContact: async (request) => {
        const client = getClient(clients, request.accountId);
        const contact = await client.getContactById(request.contactId);
        return contact.block();
      },
      unblockContact: async (request) => {
        const client = getClient(clients, request.accountId);
        const contact = await client.getContactById(request.contactId);
        return contact.unblock();
      },
      getContactInfo: async (request) => {
        const client = getClient(clients, request.accountId);
        const contact = await client.getContactById(request.contactId);
        return toContactSummary(contact, await safeProfilePic(contact), await safeAbout(contact));
      },
      getProfilePicture: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.getProfilePicUrl(request.contactId).catch(() => null);
      },
      listContacts: async (request) => {
        const client = getClient(clients, request.accountId);
        const contacts = await client.getContacts();
        return Promise.all(contacts.map(async (contact) => toContactSummary(contact, await safeProfilePic(contact), await safeAbout(contact))));
      },
      listBlockedContacts: async (request) => {
        const client = getClient(clients, request.accountId);
        const contacts = await client.getBlockedContacts();
        return Promise.all(contacts.map(async (contact) => toContactSummary(contact, await safeProfilePic(contact), await safeAbout(contact))));
      },
      getCommonGroups: async (request) => {
        const client = getClient(clients, request.accountId);
        const groups = await client.getCommonGroups(request.contactId);
        return groups.map((group) => group._serialized);
      },
      getFormattedNumber: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.getFormattedNumber(request.contactId);
      },
      getCountryCode: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.getCountryCode(request.contactId);
      },
      isRegisteredUser: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.isRegisteredUser(request.contactId);
      },
      getNumberId: async (request) => {
        const client = getClient(clients, request.accountId);
        const id = await client.getNumberId(request.number);
        return id?._serialized ?? null;
      },
      getContactDeviceCount: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.getContactDeviceCount(request.contactId);
      },
      saveAddressBookContact: async (request) => {
        const client = getClient(clients, request.accountId);
        await client.saveOrEditAddressbookContact(request.phoneNumber, request.firstName, request.lastName, request.syncToAddressbook);
      },
      deleteAddressBookContact: async (request) => {
        const client = getClient(clients, request.accountId);
        await client.deleteAddressbookContact(request.phoneNumber);
      },
      getContactLidAndPhone: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.getContactLidAndPhone(request.userIds);
      },
      addCustomerNote: async (request) => {
        const client = getClient(clients, request.accountId);
        await client.addOrEditCustomerNote(request.userId, request.note);
      },
      getCustomerNote: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.getCustomerNote(request.userId);
      },
      setStatus: async (request) => {
        const client = getClient(clients, request.accountId);
        await client.setStatus(request.status);
      },
      revokeStatusMessage: async (request) => {
        const client = getClient(clients, request.accountId);
        await client.revokeStatusMessage(request.messageId);
      },
      setDisplayName: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.setDisplayName(request.displayName);
      },
      setProfilePicture: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.setProfilePicture(await resolveMedia(request.media));
      },
      deleteProfilePicture: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.deleteProfilePicture();
      },
      requestPairingCode: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.requestPairingCode(request.phoneNumber, request.showNotification, request.intervalMs);
      },
      sendPresenceAvailable: async (request) => {
        const client = getClient(clients, request.accountId);
        await client.sendPresenceAvailable();
      },
      sendPresenceUnavailable: async (request) => {
        const client = getClient(clients, request.accountId);
        await client.sendPresenceUnavailable();
      },
      getState: async (request) => {
        const client = getClient(clients, request.accountId);
        return String(await client.getState());
      },
      getWWebVersion: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.getWWebVersion();
      },
      setAutoDownload: async (request) => {
        const client = getClient(clients, request.accountId);
        if (request.audio !== undefined) await client.setAutoDownloadAudio(request.audio);
        if (request.documents !== undefined) await client.setAutoDownloadDocuments(request.documents);
        if (request.photos !== undefined) await client.setAutoDownloadPhotos(request.photos);
        if (request.videos !== undefined) await client.setAutoDownloadVideos(request.videos);
        if (request.backgroundSync !== undefined) await client.setBackgroundSync(request.backgroundSync);
      },
      createCallLink: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.createCallLink(new Date(request.startTime), request.callType);
      },
      createScheduledEvent: async (request) => {
        const client = getClient(clients, request.accountId);
        const event = new ScheduledEvent(request.name, new Date(request.startTime), {
          description: request.description,
          endTime: request.endTime ? new Date(request.endTime) : undefined,
          location: request.location,
          callType: request.callType,
          isEventCanceled: request.isEventCanceled,
          messageSecret: Array.from(crypto.getRandomValues(new Uint8Array(32)))
        });
        const sent = await client.sendMessage(request.chatId, event, {
          quotedMessageId: request.quotedMessageId
        });
        return { messageId: sent.id.id };
      },
      respondToScheduledEvent: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.sendResponseToScheduledEvent(request.response, request.eventMessageId);
      },
      getGroupInfo: async (request) => {
        const group = await getGroupChat(clients, request.accountId, request.groupId);
        return toGroupSummary(group);
      },
      createChannel: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.createChannel(request.title, request.description ? { description: request.description } : undefined);
      },
      listChannels: async (request) => {
        const client = getClient(clients, request.accountId);
        const channels = await client.getChannels();
        return channels.map(toChannelSummary);
      },
      searchChannels: async (request) => {
        const client = getClient(clients, request.accountId);
        const channels = await client.searchChannels({
          searchText: request.searchText,
          countryCodes: request.countryCodes,
          skipSubscribedNewsletters: request.skipSubscribedNewsletters,
          view: request.view,
          limit: request.limit
        });
        return channels.map(toChannelSummary);
      },
      getChannelByInvite: async (request) => {
        const client = getClient(clients, request.accountId);
        const channel = await client.getChannelByInviteCode(request.inviteCode);
        return toChannelSummary(channel);
      },
      updateChannel: async (request) => {
        const channel = await getChannel(clients, request.accountId, request.channelId);
        const result: Record<string, boolean> = {};
        if (request.subject !== undefined) result.subject = await channel.setSubject(request.subject);
        if (request.description !== undefined) result.description = await channel.setDescription(request.description);
        if (request.reactionSetting !== undefined) result.reactionSetting = await channel.setReactionSetting(request.reactionSetting);
        if (request.profilePicture) result.profilePicture = await channel.setProfilePicture(await resolveMedia(request.profilePicture));
        return result;
      },
      getChannelSubscribers: async (request) => {
        const channel = await getChannel(clients, request.accountId, request.channelId);
        return channel.getSubscribers(request.limit);
      },
      fetchChannelMessages: async (request) => {
        const channel = await getChannel(clients, request.accountId, request.channelId);
        const messages = await channel.fetchMessages({ limit: request.limit, fromMe: request.fromMe });
        return Promise.all(messages.map((message) => normalizeMessage({ accountId: request.accountId, message, context })));
      },
      subscribeToChannel: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.subscribeToChannel(request.channelId);
      },
      unsubscribeFromChannel: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.unsubscribeFromChannel(request.channelId);
      },
      muteChannel: async (request) => {
        const channel = await getChannel(clients, request.accountId, request.channelId);
        return channel.mute();
      },
      unmuteChannel: async (request) => {
        const channel = await getChannel(clients, request.accountId, request.channelId);
        return channel.unmute();
      },
      sendSeenToChannel: async (request) => {
        const channel = await getChannel(clients, request.accountId, request.channelId);
        return channel.sendSeen();
      },
      sendChannelMessage: async (request) => {
        const client = getClient(clients, request.accountId);
        const channel = (await client.getChatById(request.channelId)) as unknown as Channel;
        const media = request.media ? await resolveMedia(request.media) : undefined;
        const sent = await channel.sendMessage(request.text ?? media!, {
          caption: request.caption,
          mentions: request.mentions,
          media
        });
        return { messageId: sent.id.id };
      },
      inviteChannelAdmin: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.sendChannelAdminInvite(request.userId, request.channelId, request.comment ? { comment: request.comment } : undefined);
      },
      acceptChannelAdminInvite: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.acceptChannelAdminInvite(request.channelId);
      },
      revokeChannelAdminInvite: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.revokeChannelAdminInvite(request.channelId, request.userId);
      },
      demoteChannelAdmin: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.demoteChannelAdmin(request.channelId, request.userId);
      },
      transferChannelOwnership: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.transferChannelOwnership(request.channelId, request.newOwnerId, {
          shouldDismissSelfAsAdmin: request.shouldDismissSelfAsAdmin
        });
      },
      deleteChannel: async (request) => {
        const client = getClient(clients, request.accountId);
        return client.deleteChannel(request.channelId);
      }
    };

    const sender: MessageSender = {
      sendText: async (accountId: string, chatId: string, text: string, options?: SendTextOptions) =>
        gateway.sendText({ accountId, chatId, text, ...options })
    };

    context.capabilities.register(capabilityNames.messageSender, sender);
    context.capabilities.register(capabilityNames.whatsappGateway, gateway);

    return {
      async start() {
        for (const account of accountManager.list()) {
          if (!account.enabled) {
            continue;
          }

          if (!context.config.whatsapp.autoInitialize) {
            context.logger.info("whatsapp auto initialization disabled", { accountId: account.id });
            continue;
          }

          try {
            const sessionPath = path.join(context.config.dataDir, "accounts", account.id, "session");
            await mkdir(sessionPath, { recursive: true });
            await mkdir(path.join(context.config.dataDir, "accounts", account.id, "media"), { recursive: true });
            const client = new Client({
              authStrategy: new LocalAuth({ clientId: account.id, dataPath: sessionPath }),
              puppeteer: {
                headless: context.config.whatsapp.headless,
                executablePath: context.config.whatsapp.browserPath,
                args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
              }
            });

            wireClientEvents({ accountId: account.id, client, context, accountManager, storage });
            clients.set(account.id, client);
            accountManager.updateState(account.id, "initializing");
            storage.upsertAccounts(accountManager.list());
            void client.initialize();
          } catch (error) {
            accountManager.updateState(account.id, "failed");
            accountManager.setLastError(account.id, error instanceof Error ? error.message : String(error));
            storage.upsertAccounts(accountManager.list());
            context.logger.error("failed to initialize whatsapp account", { accountId: account.id, error });
          }
        }
      },
      async stop() {
        for (const [accountId, client] of clients.entries()) {
          await client.destroy();
          accountManager.updateState(accountId, "stopped");
        }

        storage.upsertAccounts(accountManager.list());
      }
    };
  }
};

function getClient(clients: WhatsappClientMap, accountId: string): Client {
  const client = clients.get(accountId);
  if (!client) {
    throw new Error(`WhatsApp client is not ready for account ${accountId}`);
  }

  return client;
}

async function getMessage(clients: WhatsappClientMap, accountId: string, messageId: string): Promise<Message> {
  const client = getClient(clients, accountId);
  return client.getMessageById(messageId);
}

async function getChat(clients: WhatsappClientMap, accountId: string, chatId: string): Promise<Chat> {
  const client = getClient(clients, accountId);
  return client.getChatById(chatId);
}

async function getGroupChat(clients: WhatsappClientMap, accountId: string, groupId: string): Promise<GroupChat> {
  const client = getClient(clients, accountId);
  const chat = await client.getChatById(groupId);
  if (!chat.isGroup) {
    throw new Error(`${groupId} is not a group chat`);
  }

  return chat as GroupChat;
}

async function getChannel(clients: WhatsappClientMap, accountId: string, channelId: string): Promise<Channel> {
  return (await getChat(clients, accountId, channelId)) as unknown as Channel;
}

function buildSendOptions(input: { quotedMessageId?: string; mentions?: string[]; groupMentions?: Array<{ id: string; subject: string }> }): MessageSendOptions {
  return {
    quotedMessageId: input.quotedMessageId,
    mentions: input.mentions,
    groupMentions: input.groupMentions
  };
}

function buildMediaSendOptions(request: SendMediaRequest): MessageSendOptions {
  return {
    caption: request.caption,
    mentions: request.mentions,
    groupMentions: request.groupMentions,
    quotedMessageId: request.quotedMessageId,
    sendMediaAsDocument: request.asDocument,
    sendMediaAsSticker: request.asSticker,
    sendAudioAsVoice: request.asVoice,
    sendVideoAsGif: request.asGif,
    sendMediaAsHd: request.asHd,
    isViewOnce: request.isViewOnce,
    stickerName: request.stickerName,
    stickerAuthor: request.stickerAuthor,
    stickerCategories: request.stickerCategories
  };
}

async function resolveMedia(input: MediaInput): Promise<MessageMedia> {
  if (input.filePath) {
    return MessageMedia.fromFilePath(input.filePath);
  }

  if (input.url) {
    return MessageMedia.fromUrl(input.url, { filename: input.filename });
  }

  if (input.base64 && input.mimeType) {
    return new MessageMedia(input.mimeType, input.base64, input.filename);
  }

  throw new Error("Media input must include filePath, url, or base64 + mimeType");
}

function wireClientEvents(input: {
  accountId: string;
  client: Client;
  context: Parameters<WatoModule["register"]>[0];
  accountManager: AccountManager;
  storage: StorageEngine;
}): void {
  const { accountId, client, context, accountManager, storage } = input;

  client.on("qr", async (qr) => {
    accountManager.updateState(accountId, "qr_required");
    accountManager.setQrCode(accountId, qr);
    storage.upsertAccounts(accountManager.list());
    await context.events.publish(createDomainEvent({ type: "account.qr", sourceModule: "whatsapp-core", accountId, payload: { accountId, qr } }));
  });

  client.on("authenticated", async () => {
    accountManager.updateState(accountId, "authenticating");
    accountManager.setLastError(accountId, undefined);
    storage.upsertAccounts(accountManager.list());
  });

  client.on("ready", async () => {
    accountManager.updateState(accountId, "ready");
    accountManager.setQrCode(accountId, undefined);
    accountManager.touch(accountId);
    storage.upsertAccounts(accountManager.list());
    await context.events.publish(createDomainEvent({ type: "account.ready", sourceModule: "whatsapp-core", accountId, payload: { accountId, multiDevice: true } }));
  });

  client.on("message", async (message) => {
    const normalized = await normalizeMessage({ accountId, message, context });
    accountManager.touch(accountId);
    storage.upsertAccounts(accountManager.list());
    await context.events.publish(createDomainEvent({ type: "message.received", sourceModule: "whatsapp-core", accountId, payload: normalized }));
  });

  client.on("message_create", async (message) => {
    const normalized = await normalizeMessage({ accountId, message, context });
    await context.events.publish(createDomainEvent({ type: "message.created", sourceModule: "whatsapp-core", accountId, payload: normalized }));
  });

  client.on("message_ack", async (message, ack) => {
    await context.events.publish(createDomainEvent({ type: "message.ack", sourceModule: "whatsapp-core", accountId, payload: { accountId, messageId: message.id.id, ack } }));
  });

  client.on("message_edit", async (message, newBody, prevBody) => {
    await context.events.publish(createDomainEvent({ type: "message.edit", sourceModule: "whatsapp-core", accountId, payload: { accountId, messageId: message.id.id, newBody, prevBody } }));
  });

  client.on("message_revoke_everyone", async (after, before) => {
    await context.events.publish(createDomainEvent({ type: "message.revoke_everyone", sourceModule: "whatsapp-core", accountId, payload: { accountId, after: after?.id.id, before: before?.id.id } }));
  });

  client.on("message_revoke_me", async (message) => {
    await context.events.publish(createDomainEvent({ type: "message.revoke_me", sourceModule: "whatsapp-core", accountId, payload: { accountId, messageId: message.id.id } }));
  });

  client.on("message_reaction", async (reaction) => {
    await context.events.publish(
      createDomainEvent({
        type: "message.reaction",
        sourceModule: "whatsapp-core",
        accountId,
        payload: {
          accountId,
          msgId: reaction.msgId?._serialized,
          reaction: reaction.reaction,
          senderId: reaction.senderId,
          timestamp: reaction.timestamp
        }
      })
    );
  });

  client.on("vote_update", async (vote) => {
    await context.events.publish(
      createDomainEvent({
        type: "poll.vote",
        sourceModule: "whatsapp-core",
        accountId,
        payload: {
          accountId,
          voter: vote.voter,
          selectedOptions: vote.selectedOptions,
          messageId: vote.parentMessage.id._serialized,
          interactedAtTs: vote.interractedAtTs
        }
      })
    );
  });

  client.on("group_join", async (notification) => {
    await context.events.publish(createDomainEvent({ type: "group.join", sourceModule: "whatsapp-core", accountId, payload: notification }));
  });

  client.on("group_leave", async (notification) => {
    await context.events.publish(createDomainEvent({ type: "group.leave", sourceModule: "whatsapp-core", accountId, payload: notification }));
  });

  client.on("group_admin_changed", async (notification) => {
    await context.events.publish(createDomainEvent({ type: "group.admin_changed", sourceModule: "whatsapp-core", accountId, payload: notification }));
  });

  client.on("group_membership_request", async (notification) => {
    await context.events.publish(createDomainEvent({ type: "group.membership_request", sourceModule: "whatsapp-core", accountId, payload: notification }));
  });

  client.on("group_update", async (notification) => {
    await context.events.publish(createDomainEvent({ type: "group.update", sourceModule: "whatsapp-core", accountId, payload: notification }));
  });

  client.on("chat_archived", async (chat, currState, prevState) => {
    await context.events.publish(createDomainEvent({ type: "chat.archived", sourceModule: "whatsapp-core", accountId, payload: { accountId, chatId: chat.id._serialized, currState, prevState } }));
  });

  client.on("chat_removed", async (chat) => {
    await context.events.publish(createDomainEvent({ type: "chat.removed", sourceModule: "whatsapp-core", accountId, payload: { accountId, chatId: chat.id._serialized } }));
  });

  client.on("contact_changed", async (message, oldId, newId, isContact) => {
    await context.events.publish(createDomainEvent({ type: "contact.changed", sourceModule: "whatsapp-core", accountId, payload: { accountId, messageId: message.id.id, oldId, newId, isContact } }));
  });

  client.on("change_state", async (state) => {
    await context.events.publish(createDomainEvent({ type: "account.state_changed", sourceModule: "whatsapp-core", accountId, payload: { accountId, state } }));
  });

  client.on("incoming_call", async (call) => {
    await context.events.publish(createDomainEvent({ type: "call.incoming", sourceModule: "whatsapp-core", accountId, payload: call }));
  });

  client.on("media_uploaded", async (message) => {
    await context.events.publish(createDomainEvent({ type: "message.media_uploaded", sourceModule: "whatsapp-core", accountId, payload: { accountId, messageId: message.id.id } }));
  });

  client.on("auth_failure", async (message) => {
    accountManager.updateState(accountId, "failed");
    accountManager.setLastError(accountId, message);
    storage.upsertAccounts(accountManager.list());
    await context.events.publish(createDomainEvent({ type: "account.auth_failure", sourceModule: "whatsapp-core", accountId, payload: { accountId, message } }));
  });

  client.on("disconnected", async (reason) => {
    accountManager.updateState(accountId, "disconnected");
    accountManager.setLastError(accountId, String(reason));
    storage.upsertAccounts(accountManager.list());
    await context.events.publish(createDomainEvent({ type: "account.disconnected", sourceModule: "whatsapp-core", accountId, payload: { accountId, reason: String(reason) } }));
  });
}

async function normalizeMessage(input: { accountId: string; message: Message; context: Parameters<WatoModule["register"]>[0] }): Promise<MessageEnvelope> {
  const { accountId, message, context } = input;
  const internalData = message as unknown as { _data?: { notifyName?: string } };
  const mediaRecord = message.hasMedia && context.config.whatsapp.archiveMedia ? await archiveIncomingMedia(accountId, message, context.config.dataDir) : undefined;
  const quotedMessage = message.hasQuotedMsg ? await message.getQuotedMessage().catch(() => null) : null;

  return {
    accountId,
    chatId: message.from,
    messageId: message.id.id,
    from: message.from,
    body: message.body ?? "",
    timestamp: new Date(message.timestamp * 1000).toISOString(),
    type: String(message.type),
    fromMe: message.fromMe,
    hasMedia: message.hasMedia,
    mediaMimeType: mediaRecord?.mimeType,
    mediaFilename: mediaRecord?.filename ?? undefined,
    mediaPath: mediaRecord?.path,
    mediaSize: mediaRecord?.filesize ?? undefined,
    duration: message.duration,
    ack: Number(message.ack),
    isForwarded: message.isForwarded,
    forwardingScore: message.forwardingScore,
    isStarred: message.isStarred,
    isStatus: message.isStatus,
    quotedMessageId: quotedMessage?.id.id,
    mentionedIds: message.mentionedIds,
    groupMentions: message.groupMentions?.map((item) => ({ id: item.groupJid, subject: item.groupSubject })) ?? [],
    location: message.location
      ? {
          latitude: message.location.latitude,
          longitude: message.location.longitude,
          name: message.location.name,
          address: message.location.address,
          url: message.location.url,
          description: message.location.description
        }
      : undefined,
    vCards: message.vCards,
    raw: {
      type: message.type,
      author: message.author,
      notifyName: internalData._data?.notifyName,
      deviceType: message.deviceType,
      isForwarded: message.isForwarded,
      isGif: message.isGif,
      isEphemeral: message.isEphemeral,
      mediaKey: message.mediaKey,
      to: message.to
    }
  };
}

async function archiveIncomingMedia(accountId: string, message: Message, dataDir: string): Promise<{ path: string; filename?: string | null; mimeType: string; filesize?: number | null } | undefined> {
  if (!message.hasMedia) {
    return undefined;
  }

  const media = await message.downloadMedia().catch(() => null);
  if (!media) {
    return undefined;
  }

  const mediaDir = path.join(dataDir, "accounts", accountId, "media");
  await mkdir(mediaDir, { recursive: true });
  const fileName = media.filename ?? `${message.id.id}.${extensionFromMime(media.mimetype)}`;
  const filePath = path.join(mediaDir, fileName);
  await writeFile(filePath, Buffer.from(media.data, "base64"));

  return {
    path: filePath,
    filename: media.filename ?? undefined,
    mimeType: media.mimetype,
    filesize: media.filesize ?? undefined
  };
}

function extensionFromMime(mimeType: string): string {
  const [, extension = "bin"] = mimeType.split("/");
  return extension.replace(/[^a-zA-Z0-9]/g, "") || "bin";
}

async function safeProfilePic(contact: Contact): Promise<string | null> {
  return contact.getProfilePicUrl().catch(() => null);
}

async function safeAbout(contact: Contact): Promise<string | null> {
  return contact.getAbout().catch(() => null);
}

function toContactSummary(contact: Contact, profilePicUrl: string | null, about: string | null): ContactSummary {
  return {
    id: contact.id._serialized,
    pushname: contact.pushname,
    name: contact.name,
    shortName: contact.shortName,
    number: contact.number,
    isGroup: contact.isGroup,
    isMyContact: contact.isMyContact,
    isBlocked: contact.isBlocked,
    about,
    profilePicUrl
  };
}

function toLabelSummary(label: Label): LabelSummary {
  return {
    id: label.id,
    name: label.name,
    hexColor: label.hexColor
  };
}

function toBroadcastSummary(broadcast: Broadcast): BroadcastSummary {
  return {
    id: broadcast.id._serialized,
    timestamp: broadcast.timestamp,
    totalCount: broadcast.totalCount,
    unreadCount: broadcast.unreadCount,
    messageIds: broadcast.msgs.map((message) => message.id.id)
  };
}

function toGroupSummary(group: GroupChat): GroupSummary {
  return {
    id: group.id._serialized,
    name: group.name,
    description: group.description,
    participants: group.participants.map((participant) => ({
      id: participant.id._serialized,
      isAdmin: participant.isAdmin,
      isSuperAdmin: participant.isSuperAdmin
    }))
  };
}

function toChatSummary(chat: Chat): ChatSummary {
  return {
    id: chat.id._serialized,
    name: chat.name,
    isGroup: chat.isGroup,
    archived: chat.archived,
    pinned: chat.pinned,
    isMuted: chat.isMuted,
    unreadCount: chat.unreadCount,
    timestamp: chat.timestamp
  };
}

function toChannelSummary(channel: Channel): ChannelSummary {
  return {
    id: channel.id._serialized,
    name: channel.name,
    description: channel.description,
    unreadCount: channel.unreadCount,
    isMuted: channel.isMuted
  };
}
