import type {
  MessageEnvelope,
  MessageSender,
  OutboundMessageRecord,
  StorageEngine,
  WatoModule,
  WhatsAppGateway
} from "@wato/sdk";
import { capabilityNames } from "@wato/sdk";
import type { WorkflowEngine } from "@wato/workflow-engine";
import { resolveWorkflowConfig } from "@wato/workflow-sdk";

export const sendMessageActionModule: WatoModule = {
  manifest: {
    name: "action-send-message",
    version: "0.1.0",
    kind: "workflow-action",
    dependsOn: ["whatsapp-core", "workflow-core"],
    accountScopeSupport: "cross-account"
  },
  register(context) {
    const engine = context.capabilities.resolve<WorkflowEngine>(capabilityNames.workflowEngine);
    const messageSender = context.capabilities.resolve<MessageSender>(capabilityNames.messageSender);
    const storage = context.capabilities.resolve<StorageEngine>(capabilityNames.storage);
    const gateway = context.capabilities.resolve<WhatsAppGateway>(capabilityNames.whatsappGateway);
    const workflowRegistry = context.capabilities.resolve<{ registerActionType?: (type: string) => void }>("workflow-registry");
    const registerAction = (type: string, execute: Parameters<typeof engine.registerAction>[0]["execute"]) => {
      workflowRegistry.registerActionType?.(type);
      engine.registerAction({
        type,
        execute: (execution, config) => execute(execution, resolveWorkflowConfig(config, execution))
      });
    };

    registerAction("message.sendText", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        const text = asOptionalString(config.text) ?? "ok";
        const accountId = execution.accountId ?? input.accountId;
        const result = await messageSender.sendText(accountId, resolveChatId(config.chatId, input), text, {
          quotedMessageId: typeof config.quotedMessageId === "string" ? config.quotedMessageId : undefined,
          mentions: asStringArray(config.mentions),
          groupMentions: asGroupMentions(config.groupMentions)
        });
        const outboundRecord: OutboundMessageRecord = {
          id: result.messageId ?? crypto.randomUUID(),
          accountId,
          chatId: resolveChatId(config.chatId, input),
          text,
          status: "sent",
          createdAt: new Date().toISOString()
        };
        storage.saveOutboundMessage(outboundRecord);
        return { ok: true, output: { text } };
    });

    registerAction("message.sendMedia", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        const accountId = execution.accountId ?? input.accountId;
        const result = await gateway.sendMedia({
          accountId,
          chatId: resolveChatId(config.chatId, input),
          media: asMedia(config.media),
          caption: asOptionalString(config.caption),
          mentions: asStringArray(config.mentions),
          groupMentions: asGroupMentions(config.groupMentions),
          quotedMessageId: typeof config.quotedMessageId === "string" ? config.quotedMessageId : undefined,
          asDocument: asBoolean(config.asDocument),
          asSticker: asBoolean(config.asSticker),
          asVoice: asBoolean(config.asVoice),
          asGif: asBoolean(config.asGif),
          asHd: asBoolean(config.asHd),
          isViewOnce: asBoolean(config.isViewOnce),
          stickerName: asOptionalString(config.stickerName),
          stickerAuthor: asOptionalString(config.stickerAuthor),
          stickerCategories: asStringArray(config.stickerCategories)
        });
        return { ok: true, output: result };
    });

    registerAction("message.reply", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        const result = await gateway.replyToMessage({
          accountId: execution.accountId ?? input.accountId,
          messageId: typeof config.messageId === "string" ? config.messageId : input.messageId,
          text: asOptionalString(config.text) ?? "ok",
          chatId: asOptionalString(config.chatId),
          mentions: asStringArray(config.mentions)
        });
        return { ok: true, output: result };
    });

    registerAction("message.forward", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        await gateway.forwardMessage({
          accountId: execution.accountId ?? input.accountId,
          messageId: asOptionalString(config.messageId) ?? input.messageId,
          chatId: resolveChatId(config.chatId, input)
        });
        return { ok: true };
    });

    registerAction("message.edit", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        const result = await gateway.editMessage({
          accountId: execution.accountId ?? input.accountId,
          messageId: asOptionalString(config.messageId) ?? input.messageId,
          text: asOptionalString(config.text) ?? input.body
        });
        return { ok: true, output: result };
    });

    registerAction("message.delete", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        await gateway.deleteMessage({
          accountId: execution.accountId ?? input.accountId,
          messageId: asOptionalString(config.messageId) ?? input.messageId,
          everyone: asBoolean(config.everyone),
          clearMedia: asBoolean(config.clearMedia)
        });
        return { ok: true };
    });

    registerAction("message.star", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        await gateway.starMessage({ accountId: execution.accountId ?? input.accountId, messageId: asOptionalString(config.messageId) ?? input.messageId });
        return { ok: true };
    });

    registerAction("message.unstar", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      await gateway.unstarMessage({ accountId: execution.accountId ?? input.accountId, messageId: asOptionalString(config.messageId) ?? input.messageId });
      return { ok: true };
    });

    registerAction("message.pin", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      const ok = await gateway.pinMessage({
        accountId: execution.accountId ?? input.accountId,
        messageId: asOptionalString(config.messageId) ?? input.messageId,
        duration: typeof config.duration === "number" ? config.duration : 86400
      });
      return { ok: true, output: { ok } };
    });

    registerAction("message.unpin", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      const ok = await gateway.unpinMessage({ accountId: execution.accountId ?? input.accountId, messageId: asOptionalString(config.messageId) ?? input.messageId });
      return { ok: true, output: { ok } };
    });

    registerAction("chat.archive", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        const result = await gateway.archiveChat({ accountId: execution.accountId ?? input.accountId, chatId: resolveChatId(config.chatId, input) });
        return { ok: true, output: { ok: result } };
    });

    registerAction("chat.unarchive", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      const result = await gateway.unarchiveChat({ accountId: execution.accountId ?? input.accountId, chatId: resolveChatId(config.chatId, input) });
      return { ok: true, output: { ok: result } };
    });

    registerAction("chat.markUnread", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      await gateway.markChatUnread({ accountId: execution.accountId ?? input.accountId, chatId: resolveChatId(config.chatId, input) });
      return { ok: true };
    });

    registerAction("chat.sendSeen", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        const result = await gateway.sendSeen({ accountId: execution.accountId ?? input.accountId, chatId: resolveChatId(config.chatId, input) });
        return { ok: true, output: { ok: result } };
    });

    registerAction("chat.pin", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      const result = await gateway.pinChat({ accountId: execution.accountId ?? input.accountId, chatId: resolveChatId(config.chatId, input) });
      return { ok: true, output: { ok: result } };
    });

    registerAction("chat.unpin", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      const result = await gateway.unpinChat({ accountId: execution.accountId ?? input.accountId, chatId: resolveChatId(config.chatId, input) });
      return { ok: true, output: { ok: result } };
    });

    registerAction("chat.sendTyping", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      await gateway.sendTyping({ accountId: execution.accountId ?? input.accountId, chatId: resolveChatId(config.chatId, input) });
      return { ok: true };
    });

    registerAction("chat.sendRecording", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      await gateway.sendRecording({ accountId: execution.accountId ?? input.accountId, chatId: resolveChatId(config.chatId, input) });
      return { ok: true };
    });

    registerAction("message.react", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        await gateway.reactToMessage({
          accountId: execution.accountId ?? input.accountId,
          messageId: typeof config.messageId === "string" ? config.messageId : input.messageId,
          reaction: asOptionalString(config.reaction) ?? "👍"
        });
        return { ok: true };
    });

    registerAction("message.sendLocation", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        const result = await gateway.sendLocation({
          accountId: execution.accountId ?? input.accountId,
          chatId: resolveChatId(config.chatId, input),
          latitude: Number(config.latitude),
          longitude: Number(config.longitude),
          name: asOptionalString(config.name),
          address: asOptionalString(config.address),
          url: asOptionalString(config.url),
          description: asOptionalString(config.description),
          quotedMessageId: asOptionalString(config.quotedMessageId)
        });
        return { ok: true, output: result };
    });

    registerAction("message.sendContacts", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        const result = await gateway.sendContactCards({
          accountId: execution.accountId ?? input.accountId,
          chatId: resolveChatId(config.chatId, input),
          contactIds: asStringArray(config.contactIds) ?? [],
          quotedMessageId: asOptionalString(config.quotedMessageId)
        });
        return { ok: true, output: result };
    });

    registerAction("poll.create", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        const result = await gateway.createPoll({
          accountId: execution.accountId ?? input.accountId,
          chatId: resolveChatId(config.chatId, input),
          question: asOptionalString(config.question) ?? "Poll",
          options: asStringArray(config.options) ?? [],
          allowMultipleAnswers: asBoolean(config.allowMultipleAnswers),
          quotedMessageId: asOptionalString(config.quotedMessageId)
        });
        return { ok: true, output: result };
    });

    registerAction("poll.vote", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      await gateway.voteInPoll({
        accountId: execution.accountId ?? input.accountId,
        messageId: asOptionalString(config.messageId) ?? input.messageId,
        selectedOptions: asStringArray(config.selectedOptions) ?? []
      });
      return { ok: true };
    });

    registerAction("group.update", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        const result = await gateway.updateGroupSettings({
          accountId: execution.accountId ?? input.accountId,
          groupId: asOptionalString(config.groupId) ?? input.chatId,
          subject: asOptionalString(config.subject),
          description: asOptionalString(config.description),
          messagesAdminsOnly: asBoolean(config.messagesAdminsOnly),
          infoAdminsOnly: asBoolean(config.infoAdminsOnly),
          addMembersAdminsOnly: asBoolean(config.addMembersAdminsOnly)
        });
        return { ok: true, output: result };
    });

    registerAction("group.addParticipants", async (execution, config) => groupParticipantAction(gateway.addGroupParticipants, execution, config));

    registerAction("group.kickParticipants", async (execution, config) => groupParticipantAction(gateway.kickGroupParticipants, execution, config));

    registerAction("group.promoteParticipants", async (execution, config) => groupParticipantAction(gateway.promoteGroupParticipants, execution, config));

    registerAction("group.demoteParticipants", async (execution, config) => groupParticipantAction(gateway.demoteGroupParticipants, execution, config));

    registerAction("group.leave", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      await gateway.leaveGroup({ accountId: execution.accountId ?? input.accountId, groupId: asOptionalString(config.groupId) ?? input.chatId });
      return { ok: true };
    });

    registerAction("chat.mute", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        const result = await gateway.muteChat({
          accountId: execution.accountId ?? input.accountId,
          chatId: resolveChatId(config.chatId, input),
          until: asOptionalString(config.until)
        });
        return { ok: true, output: result };
    });

    registerAction("chat.unmute", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      const result = await gateway.unmuteChat({
        accountId: execution.accountId ?? input.accountId,
        chatId: resolveChatId(config.chatId, input)
      });
      return { ok: true, output: result };
    });

    registerAction("contact.block", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        const result = await gateway.blockContact({
          accountId: execution.accountId ?? input.accountId,
          contactId: asOptionalString(config.contactId) ?? input.from
        });
        return { ok: true, output: { ok: result } };
    });

    registerAction("contact.unblock", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      const result = await gateway.unblockContact({
        accountId: execution.accountId ?? input.accountId,
        contactId: asOptionalString(config.contactId) ?? input.from
      });
      return { ok: true, output: { ok: result } };
    });

    registerAction("contact.addNote", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      await gateway.addCustomerNote({
        accountId: execution.accountId ?? input.accountId,
        userId: asOptionalString(config.userId) ?? input.from,
        note: asOptionalString(config.note) ?? input.body
      });
      return { ok: true };
    });

    registerAction("contact.saveAddressBook", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      await gateway.saveAddressBookContact({
        accountId: execution.accountId ?? input.accountId,
        phoneNumber: asOptionalString(config.phoneNumber) ?? input.from,
        firstName: asOptionalString(config.firstName) ?? "wato",
        lastName: asOptionalString(config.lastName) ?? "contact",
        syncToAddressbook: asBoolean(config.syncToAddressbook)
      });
      return { ok: true };
    });

    registerAction("contact.deleteAddressBook", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      await gateway.deleteAddressBookContact({
        accountId: execution.accountId ?? input.accountId,
        phoneNumber: asOptionalString(config.phoneNumber) ?? input.from
      });
      return { ok: true };
    });

    registerAction("label.updateChats", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      await gateway.updateChatLabels({
        accountId: execution.accountId ?? input.accountId,
        chatIds: asStringArray(config.chatIds) ?? [input.chatId],
        labelIds: asIdArray(config.labelIds) ?? []
      });
      return { ok: true };
    });

    registerAction("broadcast.list", async (execution) => {
      const input = execution.input as MessageEnvelope;
      const broadcasts = await gateway.listBroadcasts({ accountId: execution.accountId ?? input.accountId });
      return { ok: true, output: { broadcasts } };
    });

    registerAction("broadcast.get", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      const broadcast = await gateway.getBroadcast({
        accountId: execution.accountId ?? input.accountId,
        broadcastId: asOptionalString(config.broadcastId) ?? input.chatId
      });
      return { ok: true, output: broadcast };
    });

    registerAction("channel.sendMessage", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        const result = await gateway.sendChannelMessage({
          accountId: execution.accountId ?? input.accountId,
          channelId: asOptionalString(config.channelId) ?? input.chatId,
          text: asOptionalString(config.text),
          media: config.media ? asMedia(config.media) : undefined,
          caption: asOptionalString(config.caption),
          mentions: asStringArray(config.mentions)
        });
        return { ok: true, output: result };
    });

    registerAction("channel.subscribe", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      const ok = await gateway.subscribeToChannel({ accountId: execution.accountId ?? input.accountId, channelId: asOptionalString(config.channelId) ?? input.chatId });
      return { ok: true, output: { ok } };
    });

    registerAction("channel.search", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      const channels = await gateway.searchChannels({
        accountId: execution.accountId ?? input.accountId,
        searchText: asOptionalString(config.searchText),
        countryCodes: asStringArray(config.countryCodes),
        skipSubscribedNewsletters: asBoolean(config.skipSubscribedNewsletters),
        view: asOptionalNumber(config.view),
        limit: asOptionalNumber(config.limit)
      });
      return { ok: true, output: { channels } };
    });

    registerAction("channel.unsubscribe", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      const ok = await gateway.unsubscribeFromChannel({ accountId: execution.accountId ?? input.accountId, channelId: asOptionalString(config.channelId) ?? input.chatId });
      return { ok: true, output: { ok } };
    });

    registerAction("account.setStatus", async (execution, config) => {
        const input = execution.input as MessageEnvelope;
        await gateway.setStatus({
          accountId: execution.accountId ?? input.accountId,
          status: asOptionalString(config.status) ?? ""
        });
        return { ok: true };
    });

    registerAction("account.setDisplayName", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      const ok = await gateway.setDisplayName({
        accountId: execution.accountId ?? input.accountId,
        displayName: asOptionalString(config.displayName) ?? "wato"
      });
      return { ok: true, output: { ok } };
    });

    registerAction("account.revokeStatus", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      await gateway.revokeStatusMessage({
        accountId: execution.accountId ?? input.accountId,
        messageId: asOptionalString(config.messageId) ?? input.messageId
      });
      return { ok: true };
    });

    registerAction("event.createScheduled", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      const result = await gateway.createScheduledEvent({
        accountId: execution.accountId ?? input.accountId,
        chatId: resolveChatId(config.chatId, input),
        name: asOptionalString(config.name) ?? "Event",
        startTime: asOptionalString(config.startTime) ?? new Date().toISOString(),
        description: asOptionalString(config.description),
        endTime: asOptionalString(config.endTime),
        location: asOptionalString(config.location),
        callType: asOptionalString(config.callType),
        isEventCanceled: asBoolean(config.isEventCanceled),
        quotedMessageId: asOptionalString(config.quotedMessageId)
      });
      return { ok: true, output: result };
    });

    registerAction("event.respondScheduled", async (execution, config) => {
      const input = execution.input as MessageEnvelope;
      const ok = await gateway.respondToScheduledEvent({
        accountId: execution.accountId ?? input.accountId,
        response: asOptionalNumber(config.response) ?? 1,
        eventMessageId: asOptionalString(config.eventMessageId) ?? input.messageId
      });
      return { ok: true, output: { ok } };
    });

    return {};
  }
};

async function groupParticipantAction(
  handler: WhatsAppGateway["addGroupParticipants"] | WhatsAppGateway["kickGroupParticipants"] | WhatsAppGateway["promoteGroupParticipants"] | WhatsAppGateway["demoteGroupParticipants"],
  execution: { accountId?: string; input: unknown },
  config: Record<string, unknown>
) {
  const input = execution.input as MessageEnvelope;
  const result = await handler({
    accountId: execution.accountId ?? input.accountId,
    groupId: asOptionalString(config.groupId) ?? input.chatId,
    participantIds: asStringArray(config.participantIds) ?? [],
    comment: asOptionalString(config.comment)
  });
  return { ok: true, output: result };
}

function resolveChatId(value: unknown, input: MessageEnvelope): string {
  return asOptionalString(value) ?? input.chatId;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined;
}

function asGroupMentions(value: unknown): Array<{ id: string; subject: string }> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .filter((item): item is { id: string; subject: string } => typeof item === "object" && item !== null)
    .map((item) => ({ id: String(item.id), subject: String(item.subject) }));
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asIdArray(value: unknown): Array<string | number> | undefined {
  return Array.isArray(value) ? value.filter((item): item is string | number => typeof item === "string" || typeof item === "number") : undefined;
}

function asMedia(value: unknown) {
  if (typeof value !== "object" || value === null) {
    throw new Error("media config is required");
  }

  return value as {
    filePath?: string;
    base64?: string;
    mimeType?: string;
    filename?: string;
    url?: string;
  };
}
