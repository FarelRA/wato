import { createWatoConfig } from "@wato/config";
import { createLocalControlClient } from "@wato/ipc";

const args = process.argv.slice(2);

function printHelp(): void {
  console.log(`wato CLI

Usage:
  wato system status
  wato account list
  wato account qr <accountId>
  wato account set-status <accountId> <status>
  wato workflow list
  wato workflow providers
  wato workflow executions
  wato workflow validate
  wato workflow upsert '<json>'
  wato workflow test '<json>'
  wato webhook list
  wato webhook deliveries
  wato webhook upsert '<json>'
  wato webhook remove '<json>'
  wato webhook replay '<json>'
  wato webhook test-event '<json>'
  wato message list [accountId]
  wato message send <accountId> <chatId> <text>
  wato message send-media '<json>'
  wato message send-contacts '<json>'
  wato message send-location '<json>'
  wato message reply '<json>'
  wato message forward '<json>'
  wato message edit '<json>'
  wato message delete '<json>'
  wato message star '<json>'
  wato message unstar '<json>'
  wato message pin '<json>'
  wato message unpin '<json>'
  wato message info '<json>'
  wato message reactions '<json>'
  wato message poll-votes '<json>'
  wato message react '<json>'
  wato label list <accountId>
  wato label info '<json>'
  wato label chats '<json>'
  wato label chat-labels '<json>'
  wato label update-chats '<json>'
  wato broadcast list <accountId>
  wato broadcast info '<json>'
  wato chat list <accountId>
  wato chat info '<json>'
  wato chat messages '<json>'
  wato chat search-messages '<json>'
  wato chat archive '<json>'
  wato chat unarchive '<json>'
  wato chat pin '<json>'
  wato chat unpin '<json>'
  wato chat mark-unread '<json>'
  wato chat seen '<json>'
  wato chat typing '<json>'
  wato chat recording '<json>'
  wato chat clear-state '<json>'
  wato chat clear-messages '<json>'
  wato chat delete '<json>'
  wato chat sync-history '<json>'
  wato poll create '<json>'
  wato poll vote '<json>'
  wato group join-invite '<json>'
  wato group invite-info '<json>'
  wato group accept-v4-invite '<json>'
  wato group create '<json>'
  wato group get-invite '<json>'
  wato group revoke-invite '<json>'
  wato group info '<json>'
  wato group leave '<json>'
  wato group membership-requests '<json>'
  wato group approve-requests '<json>'
  wato group reject-requests '<json>'
  wato group update '<json>'
  wato group add '<json>'
  wato group kick '<json>'
  wato group promote '<json>'
  wato group demote '<json>'
  wato chat mute '<json>'
  wato chat unmute '<json>'
  wato contact block '<json>'
  wato contact unblock '<json>'
  wato contact list <accountId>
  wato contact blocked <accountId>
  wato contact info '<json>'
  wato contact common-groups '<json>'
  wato contact formatted-number '<json>'
  wato contact country-code '<json>'
  wato contact is-registered '<json>'
  wato contact number-id '<json>'
  wato contact device-count '<json>'
  wato contact profile-picture '<json>'
  wato contact save-address-book '<json>'
  wato contact delete-address-book '<json>'
  wato contact lid-phone '<json>'
  wato contact add-note '<json>'
  wato contact get-note '<json>'
  wato account display-name '<json>'
  wato account revoke-status '<json>'
  wato account profile-picture '<json>'
  wato account delete-profile-picture '<json>'
  wato account pairing-code '<json>'
  wato account presence-available '<json>'
  wato account presence-unavailable '<json>'
  wato account state '<json>'
  wato account version '<json>'
  wato account auto-download '<json>'
  wato account call-link '<json>'
  wato event create-scheduled '<json>'
  wato event respond-scheduled '<json>'
  wato channel list <accountId>
  wato channel search '<json>'
  wato channel create '<json>'
  wato channel by-invite '<json>'
  wato channel update '<json>'
  wato channel subscribers '<json>'
  wato channel messages '<json>'
  wato channel subscribe '<json>'
  wato channel unsubscribe '<json>'
  wato channel mute '<json>'
  wato channel unmute '<json>'
  wato channel seen '<json>'
  wato channel send '<json>'
  wato channel invite-admin '<json>'
  wato channel accept-admin '<json>'
  wato channel revoke-admin '<json>'
  wato channel demote-admin '<json>'
  wato channel transfer-ownership '<json>'
  wato channel delete '<json>'
`);
}

async function main(): Promise<void> {
  const config = await createWatoConfig();
  const client = createLocalControlClient(config);
  const [group, command] = args;

  if (!group) {
    printHelp();
    return;
  }

  if (group === "system" && command === "status") {
    console.log(JSON.stringify(await client.systemStatus(), null, 2));
    return;
  }

  if (group === "account" && command === "list") {
    console.log(JSON.stringify((await client.accounts()).accounts, null, 2));
    return;
  }

  if (group === "account" && command === "qr") {
    const accountId = args[2];
    const account = (await client.accounts()).accounts.find((item) => item.id === accountId);
    if (!account) {
      throw new Error(`Unknown account: ${accountId}`);
    }

    console.log(account.qrCode ?? "No QR available");
    return;
  }

  if (group === "account" && command === "set-status") {
    await client.setStatus({ accountId: args[2], status: args.slice(3).join(" ") });
    console.log(JSON.stringify({ ok: true }, null, 2));
    return;
  }

  if (group === "account" && command === "display-name") {
    console.log(JSON.stringify(await client.setDisplayName(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "account" && command === "revoke-status") {
    console.log(JSON.stringify(await client.revokeStatusMessage(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "account" && command === "profile-picture") {
    console.log(JSON.stringify(await client.setProfilePicture(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "account" && command === "delete-profile-picture") {
    console.log(JSON.stringify(await client.deleteProfilePicture(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "account" && command === "pairing-code") {
    console.log(JSON.stringify(await client.pairingCode(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "account" && command === "presence-available") {
    console.log(JSON.stringify(await client.presenceAvailable(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "account" && command === "presence-unavailable") {
    console.log(JSON.stringify(await client.presenceUnavailable(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "account" && command === "state") {
    console.log(JSON.stringify(await client.accountState(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "account" && command === "version") {
    console.log(JSON.stringify(await client.accountVersion(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "account" && command === "auto-download") {
    console.log(JSON.stringify(await client.autoDownload(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "account" && command === "call-link") {
    console.log(JSON.stringify(await client.callLink(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "workflow" && command === "list") {
    console.log(JSON.stringify((await client.workflows()).workflows, null, 2));
    return;
  }

  if (group === "workflow" && command === "providers") {
    console.log(JSON.stringify(await client.workflowProviders(), null, 2));
    return;
  }

  if (group === "workflow" && command === "executions") {
    console.log(JSON.stringify((await client.workflowExecutions()).executions, null, 2));
    return;
  }

  if (group === "workflow" && command === "validate") {
    const sample = {
      id: "sample-workflow",
      name: "Sample Workflow",
      version: 1,
      enabled: true,
      accountScope: { mode: "all" as const },
      trigger: { type: "message.received", config: { pattern: "order (?<orderId>[A-Z0-9-]+)" } },
      conditions: [{ type: "message.textContains", config: { contains: "${trigger.data.groups.orderId}" } }],
      actions: [{ id: "reply", type: "message.sendText", config: { text: "ack ${trigger.data.groups.orderId}" } }]
    };

    console.log(JSON.stringify(await client.validateWorkflow(sample), null, 2));
    return;
  }

  if (group === "workflow" && command === "upsert") {
    console.log(JSON.stringify(await client.upsertWorkflow(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "workflow" && command === "test") {
    const sample = {
      eventType: "message.received",
      accountId: "default",
      payload: {
        accountId: "default",
        chatId: "12345@c.us",
        messageId: "msg-1",
        from: "12345@c.us",
        body: "order A-42",
        timestamp: new Date().toISOString()
      },
      workflow: {
        id: "sample-workflow-test",
        name: "Sample Workflow Test",
        version: 1,
        enabled: true,
        accountScope: { mode: "all" as const },
        trigger: { type: "message.received", config: { pattern: "order (?<orderId>[A-Z0-9-]+)" } },
        conditions: [{ type: "message.textContains", config: { contains: "${trigger.data.groups.orderId}" } }],
        actions: [
          { id: "context", type: "data.set", config: { value: { orderId: "${trigger.data.groups.orderId}" } } },
          { id: "reply", type: "message.sendText", config: { text: "received ${actionsById.context.output.orderId}", chatId: "${input.chatId}" } }
        ]
      }
    };

    console.log(JSON.stringify(await client.testWorkflow(args[2] ? parseJsonArg(args[2]) : sample), null, 2));
    return;
  }

  if (group === "webhook" && command === "list") {
    console.log(JSON.stringify((await client.webhooks()).webhooks, null, 2));
    return;
  }

  if (group === "webhook" && command === "deliveries") {
    console.log(JSON.stringify((await client.webhookDeliveries()).deliveries, null, 2));
    return;
  }

  if (group === "webhook" && command === "upsert") {
    console.log(JSON.stringify(await client.upsertWebhook(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "webhook" && command === "remove") {
    console.log(JSON.stringify(await client.removeWebhook(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "webhook" && command === "replay") {
    console.log(JSON.stringify(await client.replayWebhookDelivery(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "webhook" && command === "test-event") {
    console.log(JSON.stringify(await client.testWebhookEvent(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "list") {
    console.log(JSON.stringify((await client.messages(args[2])).messages, null, 2));
    return;
  }

  if (group === "message" && command === "send") {
    const [, , accountId, chatId, ...textParts] = args;
    await client.sendMessage({ accountId, chatId, text: textParts.join(" ") });
    console.log(JSON.stringify({ ok: true }, null, 2));
    return;
  }

  if (group === "message" && command === "send-media") {
    console.log(JSON.stringify(await client.sendMedia(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "send-contacts") {
    console.log(JSON.stringify(await client.sendContacts(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "send-location") {
    console.log(JSON.stringify(await client.sendLocation(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "reply") {
    console.log(JSON.stringify(await client.reply(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "forward") {
    console.log(JSON.stringify(await client.forward(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "edit") {
    console.log(JSON.stringify(await client.editMessage(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "delete") {
    console.log(JSON.stringify(await client.deleteMessage(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "star") {
    console.log(JSON.stringify(await client.starMessage(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "unstar") {
    console.log(JSON.stringify(await client.unstarMessage(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "pin") {
    console.log(JSON.stringify(await client.pinMessage(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "unpin") {
    console.log(JSON.stringify(await client.unpinMessage(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "info") {
    console.log(JSON.stringify(await client.messageInfo(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "reactions") {
    console.log(JSON.stringify(await client.messageReactions(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "poll-votes") {
    console.log(JSON.stringify(await client.messagePollVotes(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "message" && command === "react") {
    console.log(JSON.stringify(await client.react(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "label" && command === "list") {
    console.log(JSON.stringify(await client.labels(args[2]), null, 2));
    return;
  }

  if (group === "label" && command === "info") {
    console.log(JSON.stringify(await client.labelInfo(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "label" && command === "chats") {
    console.log(JSON.stringify(await client.chatsByLabel(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "label" && command === "chat-labels") {
    console.log(JSON.stringify(await client.chatLabels(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "label" && command === "update-chats") {
    console.log(JSON.stringify(await client.updateChatLabels(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "broadcast" && command === "list") {
    console.log(JSON.stringify(await client.broadcasts(args[2]), null, 2));
    return;
  }

  if (group === "broadcast" && command === "info") {
    console.log(JSON.stringify(await client.broadcastInfo(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "poll" && command === "create") {
    console.log(JSON.stringify(await client.createPoll(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "poll" && command === "vote") {
    console.log(JSON.stringify(await client.votePoll(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "list") {
    console.log(JSON.stringify(await client.chats(args[2]), null, 2));
    return;
  }

  if (group === "chat" && command === "info") {
    console.log(JSON.stringify(await client.chatInfo(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "messages") {
    console.log(JSON.stringify(await client.chatMessages(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "search-messages") {
    console.log(JSON.stringify(await client.chatSearchMessages(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "archive") {
    console.log(JSON.stringify(await client.archiveChat(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "unarchive") {
    console.log(JSON.stringify(await client.unarchiveChat(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "pin") {
    console.log(JSON.stringify(await client.pinChat(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "unpin") {
    console.log(JSON.stringify(await client.unpinChat(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "mark-unread") {
    console.log(JSON.stringify(await client.markChatUnread(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "seen") {
    console.log(JSON.stringify(await client.sendSeen(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "typing") {
    console.log(JSON.stringify(await client.sendTyping(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "recording") {
    console.log(JSON.stringify(await client.sendRecording(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "clear-state") {
    console.log(JSON.stringify(await client.clearChatState(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "clear-messages") {
    console.log(JSON.stringify(await client.clearChatMessages(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "delete") {
    console.log(JSON.stringify(await client.deleteChat(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "sync-history") {
    console.log(JSON.stringify(await client.syncHistory(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "join-invite") {
    console.log(JSON.stringify(await client.joinGroupByInvite(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "invite-info") {
    console.log(JSON.stringify(await client.getInviteInfo(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "accept-v4-invite") {
    console.log(JSON.stringify(await client.acceptGroupV4Invite(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "create") {
    console.log(JSON.stringify(await client.createGroup(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "get-invite") {
    console.log(JSON.stringify(await client.getGroupInvite(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "revoke-invite") {
    console.log(JSON.stringify(await client.revokeGroupInvite(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "info") {
    console.log(JSON.stringify(await client.getGroupInfo(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "leave") {
    console.log(JSON.stringify(await client.leaveGroup(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "membership-requests") {
    console.log(JSON.stringify(await client.groupMembershipRequests(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "approve-requests") {
    console.log(JSON.stringify(await client.approveGroupMembershipRequests(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "reject-requests") {
    console.log(JSON.stringify(await client.rejectGroupMembershipRequests(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "update") {
    console.log(JSON.stringify(await client.updateGroup(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "add") {
    console.log(JSON.stringify(await client.addGroupParticipants(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "kick") {
    console.log(JSON.stringify(await client.kickGroupParticipants(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "promote") {
    console.log(JSON.stringify(await client.promoteGroupParticipants(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "group" && command === "demote") {
    console.log(JSON.stringify(await client.demoteGroupParticipants(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "mute") {
    console.log(JSON.stringify(await client.muteChat(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "chat" && command === "unmute") {
    console.log(JSON.stringify(await client.unmuteChat(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "block") {
    console.log(JSON.stringify(await client.blockContact(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "unblock") {
    console.log(JSON.stringify(await client.unblockContact(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "list") {
    console.log(JSON.stringify(await client.contacts(args[2]), null, 2));
    return;
  }

  if (group === "contact" && command === "blocked") {
    console.log(JSON.stringify(await client.blockedContacts(args[2]), null, 2));
    return;
  }

  if (group === "contact" && command === "info") {
    console.log(JSON.stringify(await client.contactInfo(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "common-groups") {
    console.log(JSON.stringify(await client.commonGroups(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "formatted-number") {
    console.log(JSON.stringify(await client.formattedNumber(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "country-code") {
    console.log(JSON.stringify(await client.countryCode(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "is-registered") {
    console.log(JSON.stringify(await client.isRegistered(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "number-id") {
    console.log(JSON.stringify(await client.numberId(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "device-count") {
    console.log(JSON.stringify(await client.contactDeviceCount(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "profile-picture") {
    console.log(JSON.stringify(await client.profilePicture(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "save-address-book") {
    console.log(JSON.stringify(await client.saveAddressBookContact(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "delete-address-book") {
    console.log(JSON.stringify(await client.deleteAddressBookContact(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "lid-phone") {
    console.log(JSON.stringify(await client.contactLidPhone(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "add-note") {
    console.log(JSON.stringify(await client.addCustomerNote(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "contact" && command === "get-note") {
    console.log(JSON.stringify(await client.customerNote(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "event" && command === "create-scheduled") {
    console.log(JSON.stringify(await client.createScheduledEvent(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "event" && command === "respond-scheduled") {
    console.log(JSON.stringify(await client.respondScheduledEvent(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "list") {
    console.log(JSON.stringify(await client.listChannels(args[2]), null, 2));
    return;
  }

  if (group === "channel" && command === "search") {
    console.log(JSON.stringify(await client.searchChannels(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "create") {
    console.log(JSON.stringify(await client.createChannel(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "by-invite") {
    console.log(JSON.stringify(await client.getChannelByInvite(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "update") {
    console.log(JSON.stringify(await client.updateChannel(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "subscribers") {
    console.log(JSON.stringify(await client.channelSubscribers(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "messages") {
    console.log(JSON.stringify(await client.channelMessages(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "subscribe") {
    console.log(JSON.stringify(await client.subscribeChannel(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "unsubscribe") {
    console.log(JSON.stringify(await client.unsubscribeChannel(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "mute") {
    console.log(JSON.stringify(await client.muteChannel(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "unmute") {
    console.log(JSON.stringify(await client.unmuteChannel(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "seen") {
    console.log(JSON.stringify(await client.seenChannel(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "send") {
    console.log(JSON.stringify(await client.sendChannelMessage(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "invite-admin") {
    console.log(JSON.stringify(await client.inviteChannelAdmin(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "accept-admin") {
    console.log(JSON.stringify(await client.acceptChannelAdminInvite(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "revoke-admin") {
    console.log(JSON.stringify(await client.revokeChannelAdminInvite(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "demote-admin") {
    console.log(JSON.stringify(await client.demoteChannelAdmin(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "transfer-ownership") {
    console.log(JSON.stringify(await client.transferChannelOwnership(parseJsonArg(args[2])), null, 2));
    return;
  }

  if (group === "channel" && command === "delete") {
    console.log(JSON.stringify(await client.deleteChannel(parseJsonArg(args[2])), null, 2));
    return;
  }

  printHelp();
}

function parseJsonArg(value?: string): any {
  if (!value) {
    throw new Error("Missing JSON argument");
  }

  return JSON.parse(value);
}

void main();
