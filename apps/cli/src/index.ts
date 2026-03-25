import { Command } from "commander";
import qrcode from "qrcode-terminal";
import { createApiClient } from "@wato/api-client";
import { createWatoConfig } from "@wato/config";
import type { UnifiedChannelSendRequest, UnifiedMessageSendRequest } from "@wato/core";

type ApiClient = ReturnType<typeof createApiClient>;
type PositionalSpec = { token: string; name: string; description: string; required?: boolean; variadic?: boolean; transform?: (value: unknown) => unknown };
type OptionSpec = { flags: string; name: string; description: string; parser?: (value: string, previous?: unknown) => unknown; defaultValue?: unknown };
type ObjectCommandConfig<TInput extends Record<string, unknown>> = { parent: Command; client: ApiClient; name: string; description: string; positionals?: PositionalSpec[]; options?: OptionSpec[]; examples?: string[]; defaultInput?: () => TInput; run: (client: ApiClient, input: TInput) => Promise<unknown> };

async function main(): Promise<void> {
  const config = await createWatoConfig();
  const abortController = new AbortController();
  installCliSignalHandlers(abortController);
  await buildProgram(createApiClient(config, { signal: abortController.signal })).parseAsync(process.argv);
}

function buildProgram(client: ApiClient): Command {
  const program = new Command();
  program.name("wato").description("Resource-first CLI for the local wato daemon").showHelpAfterError().showSuggestionAfterError();
  registerSystem(program, client);
  registerAccounts(program, client);
  registerChats(program, client);
  registerMessages(program, client);
  registerGroups(program, client);
  registerChannels(program, client);
  registerContacts(program, client);
  registerLabels(program, client);
  registerBroadcasts(program, client);
  registerWorkflows(program, client);
  registerWebhooks(program, client);
  return program;
}

function registerSystem(program: Command, client: ApiClient): void {
  const system = createGroupCommand(program, "system", "System operations", ["wato system status", "wato system reload", "wato system key list"]);
  addSimpleCommand(system, "status", async () => client.systemStatus());
  addSimpleCommand(system, "reload", async () => client.reloadSystem());
  registerKeys(system, client);
}

function registerKeys(parent: Command, client: ApiClient): void {
  const group = createGroupCommand(parent, "key", "API key operations", ["wato system key list", "wato system key get bootstrap", "wato system key rotate bootstrap"]);
  addSimpleCommand(group, "list", async () => (await client.apiKeys()).apiKeys);
  addObjectCommand({ parent: group, client, name: "get", description: "Get API key", positionals: [{ token: "apiKeyId", name: "apiKeyId", description: "API key id" }], run: (cli, input) => cli.getApiKey(requireString(input.apiKeyId, "apiKeyId")) });
  addObjectCommand({ parent: group, client, name: "create", description: "Create API key", positionals: [{ token: "name", name: "name", description: "name", required: false }], options: [{ flags: "--id <id>", name: "id", description: "id" }, { flags: "--key <key>", name: "key", description: "key" }, { flags: "--enabled <true|false>", name: "enabled", description: "enabled", parser: parseBoolean }, { flags: "--permissions <items>", name: "permissions", description: "permissions", parser: parseCsv }, { flags: "--expires-at <iso>", name: "expiresAt", description: "expiration" }], defaultInput: () => ({ name: "Ops key", permissions: ["*"] }), run: (cli, input) => cli.createApiKey(input as never) });
  addObjectCommand({ parent: group, client, name: "update", description: "Update API key", positionals: [{ token: "apiKeyId", name: "apiKeyId", description: "API key id" }], options: [{ flags: "--name <name>", name: "name", description: "name" }, { flags: "--enabled <true|false>", name: "enabled", description: "enabled", parser: parseBoolean }, { flags: "--permissions <items>", name: "permissions", description: "permissions", parser: parseCsv }, { flags: "--expires-at <iso>", name: "expiresAt", description: "expiration" }, { flags: "--clear-expires-at <true|false>", name: "clearExpiresAt", description: "clear expiration", parser: parseBoolean }], run: (cli, input) => cli.updateApiKey(requireString(input.apiKeyId, "apiKeyId"), { name: asOptionalString(input.name), enabled: input.enabled as boolean | undefined, permissions: input.permissions as string[] | undefined, expiresAt: input.clearExpiresAt ? null : asOptionalString(input.expiresAt) }) });
  addObjectCommand({ parent: group, client, name: "rotate", description: "Rotate API key", positionals: [{ token: "apiKeyId", name: "apiKeyId", description: "API key id" }], options: [{ flags: "--key <key>", name: "key", description: "replacement key" }], run: (cli, input) => cli.rotateApiKey({ apiKeyId: requireString(input.apiKeyId, "apiKeyId"), key: asOptionalString(input.key) }) });
  addObjectCommand({ parent: group, client, name: "delete", description: "Delete API key", positionals: [{ token: "apiKeyId", name: "apiKeyId", description: "API key id" }], run: (cli, input) => cli.deleteApiKey(requireString(input.apiKeyId, "apiKeyId")) });
}

function registerAccounts(program: Command, client: ApiClient): void {
  const account = createGroupCommand(program, "account", "Account operations", ["wato account list", "wato account login qr default", "wato account profile status set default \"online\""]);
  addSimpleCommand(account, "list", async () => (await client.accounts()).accounts);
  addObjectCommand({ parent: account, client, name: "get", description: "Get account", positionals: [accountIdPositional()], run: (cli, input) => cli.getAccount(requireString(input.accountId, "accountId")) });

  const login = createGroupCommand(account, "login", "Account login", []);
  addObjectCommand({ parent: login, client, name: "qr", description: "Show QR code", positionals: [accountIdPositional()], run: async (cli, input) => {
    const result = await cli.loginQr(requireString(input.accountId, "accountId"));
    if (result.qrCode) qrcode.generate(result.qrCode, { small: true });
    return result;
  } });
  addObjectCommand({ parent: login, client, name: "pairing-code", description: "Get pairing code", positionals: [accountIdPositional(), { token: "phoneNumber", name: "phoneNumber", description: "phone number" }], options: [{ flags: "--show-notification <true|false>", name: "showNotification", description: "show notification", parser: parseBoolean }, { flags: "--interval-ms <n>", name: "intervalMs", description: "interval", parser: parseInteger }], run: (cli, input) => cli.pairingCode(input as never) });

  const profile = createGroupCommand(account, "profile", "Profile operations", []);
  const status = createGroupCommand(profile, "status", "Profile status", []);
  addObjectCommand({ parent: status, client, name: "set", description: "Set profile status", positionals: [accountIdPositional(), joinTextPositional("status", "status text")], run: (cli, input) => cli.setStatus({ accountId: requireString(input.accountId, "accountId"), status: requireString(input.status, "status") }) });
  addObjectCommand({ parent: status, client, name: "revoke", description: "Revoke profile status", positionals: [accountIdPositional(), messageIdPositional()], run: (cli, input) => cli.revokeStatusMessage({ accountId: requireString(input.accountId, "accountId"), messageId: requireString(input.messageId, "messageId") }) });
  const name = createGroupCommand(profile, "name", "Profile name", []);
  addObjectCommand({ parent: name, client, name: "set", description: "Set display name", positionals: [accountIdPositional(), joinTextPositional("displayName", "display name")], run: (cli, input) => cli.setDisplayName({ accountId: requireString(input.accountId, "accountId"), displayName: requireString(input.displayName, "displayName") }) });
  const photo = createGroupCommand(profile, "photo", "Profile photo", []);
  addObjectCommand({ parent: photo, client, name: "set", description: "Set profile photo", positionals: [accountIdPositional(), pathPositional()], run: (cli, input) => cli.setProfilePicture({ accountId: requireString(input.accountId, "accountId"), media: { filePath: requireString(input.path, "path") } }) });
  addObjectCommand({ parent: photo, client, name: "clear", description: "Clear profile photo", positionals: [accountIdPositional()], run: (cli, input) => cli.deleteProfilePicture(requireString(input.accountId, "accountId")) });

  const presence = createGroupCommand(account, "presence", "Presence operations", []);
  addObjectCommand({ parent: presence, client, name: "set", description: "Set presence", positionals: [accountIdPositional(), { token: "presence", name: "presence", description: "available|unavailable" }], run: (cli, input) => cli.presenceSet({ accountId: requireString(input.accountId, "accountId"), presence: requirePresence(input.presence) }) });
  addObjectCommand({ parent: account, client, name: "state", description: "Get account state", positionals: [accountIdPositional()], run: (cli, input) => cli.accountState(requireString(input.accountId, "accountId")) });
  addObjectCommand({ parent: account, client, name: "version", description: "Get account version", positionals: [accountIdPositional()], run: (cli, input) => cli.accountVersion(requireString(input.accountId, "accountId")) });

  const settings = createGroupCommand(account, "settings", "Account settings", []);
  addObjectCommand({ parent: settings, client, name: "auto-download", description: "Update auto-download", positionals: [accountIdPositional()], options: [{ flags: "--audio <true|false>", name: "audio", description: "audio", parser: parseBoolean }, { flags: "--documents <true|false>", name: "documents", description: "documents", parser: parseBoolean }, { flags: "--photos <true|false>", name: "photos", description: "photos", parser: parseBoolean }, { flags: "--videos <true|false>", name: "videos", description: "videos", parser: parseBoolean }, { flags: "--background-sync <true|false>", name: "backgroundSync", description: "background sync", parser: parseBoolean }], run: (cli, input) => cli.autoDownload(input as never) });

  const callLink = createGroupCommand(account, "call-link", "Call links", []);
  addObjectCommand({ parent: callLink, client, name: "create", description: "Create call link", positionals: [accountIdPositional(), { token: "startTime", name: "startTime", description: "start time" }, { token: "callType", name: "callType", description: "voice|video" }], run: (cli, input) => cli.callLink({ accountId: requireString(input.accountId, "accountId"), startTime: requireString(input.startTime, "startTime"), callType: requireString(input.callType, "callType") }) });
}

function registerChats(program: Command, client: ApiClient): void {
  const chat = createGroupCommand(program, "chat", "Chat operations", ["wato chat list default", "wato chat message list default 12345@c.us"]);
  addObjectCommand({ parent: chat, client, name: "list", description: "List chats", positionals: [accountIdPositional()], run: (cli, input) => cli.chats(requireString(input.accountId, "accountId")) });
  addObjectCommand({ parent: chat, client, name: "get", description: "Get chat", positionals: [accountIdPositional(), chatIdPositional()], run: (cli, input) => cli.chatInfo(input as never) });
  const message = createGroupCommand(chat, "message", "Chat messages", []);
  addObjectCommand({ parent: message, client, name: "list", description: "List chat messages", positionals: [accountIdPositional(), chatIdPositional()], options: [{ flags: "--limit <n>", name: "limit", description: "limit", parser: parseInteger }, { flags: "--from-me <true|false>", name: "fromMe", description: "from me", parser: parseBoolean }], run: (cli, input) => cli.chatMessages(input as never) });
  addObjectCommand({ parent: message, client, name: "clear", description: "Clear chat messages", positionals: [accountIdPositional(), chatIdPositional()], run: (cli, input) => cli.clearChatMessages(input as never) });
  addObjectCommand({ parent: message, client, name: "search", description: "Search messages", positionals: [accountIdPositional(), joinTextPositional("query", "query")], options: [{ flags: "--chat-id <id>", name: "chatId", description: "chat id" }, { flags: "--page <n>", name: "page", description: "page", parser: parseInteger }, { flags: "--limit <n>", name: "limit", description: "limit", parser: parseInteger }], run: (cli, input) => cli.chatSearchMessages(input as never) });
  addSetClearCommand(chat, client, "archive", (cli, body, set) => set ? cli.archiveChat(body as never) : cli.unarchiveChat(body as never));
  addSetClearCommand(chat, client, "pin", (cli, body, set) => set ? cli.pinChat(body as never) : cli.unpinChat(body as never));
  const mute = createGroupCommand(chat, "mute", "Mute operations", []);
  addObjectCommand({ parent: mute, client, name: "set", description: "Mute chat", positionals: [accountIdPositional(), chatIdPositional()], options: [{ flags: "--until <iso>", name: "until", description: "until" }], run: (cli, input) => cli.muteChat(input as never) });
  addObjectCommand({ parent: mute, client, name: "clear", description: "Unmute chat", positionals: [accountIdPositional(), chatIdPositional()], run: (cli, input) => cli.unmuteChat(input as never) });
  const read = createGroupCommand(chat, "read", "Read state", []);
  addObjectCommand({ parent: read, client, name: "seen", description: "Mark seen", positionals: [accountIdPositional(), chatIdPositional()], run: (cli, input) => cli.sendSeen(input as never) });
  addObjectCommand({ parent: read, client, name: "mark-unread", description: "Mark unread", positionals: [accountIdPositional(), chatIdPositional()], run: (cli, input) => cli.markChatUnread(input as never) });
  const activity = createGroupCommand(chat, "activity", "Activity state", []);
  const typing = createGroupCommand(activity, "typing", "Typing state", []);
  addObjectCommand({ parent: typing, client, name: "start", description: "Start typing", positionals: [accountIdPositional(), chatIdPositional()], run: (cli, input) => cli.sendTyping(input as never, true) });
  addObjectCommand({ parent: typing, client, name: "stop", description: "Stop typing", positionals: [accountIdPositional(), chatIdPositional()], run: (cli, input) => cli.sendTyping(input as never, false) });
  const recording = createGroupCommand(activity, "recording", "Recording state", []);
  addObjectCommand({ parent: recording, client, name: "start", description: "Start recording", positionals: [accountIdPositional(), chatIdPositional()], run: (cli, input) => cli.sendRecording(input as never, true) });
  addObjectCommand({ parent: recording, client, name: "stop", description: "Stop recording", positionals: [accountIdPositional(), chatIdPositional()], run: (cli, input) => cli.sendRecording(input as never, false) });
  const history = createGroupCommand(chat, "history", "History", []);
  addObjectCommand({ parent: history, client, name: "sync", description: "Sync history", positionals: [accountIdPositional(), chatIdPositional()], run: (cli, input) => cli.syncHistory(input as never) });
  addObjectCommand({ parent: chat, client, name: "delete", description: "Delete chat", positionals: [accountIdPositional(), chatIdPositional()], run: (cli, input) => cli.deleteChat(input as never) });
}

function registerMessages(program: Command, client: ApiClient): void {
  const message = createGroupCommand(program, "message", "Message operations", ["wato message send default 12345@c.us hello", "wato message send default 12345@c.us --image /tmp/demo.png --caption demo"]);
  addObjectCommand({ parent: message, client, name: "list", description: "List messages", positionals: [{ token: "accountId", name: "accountId", description: "account id", required: false }], run: (cli, input) => cli.messages(asOptionalString(input.accountId)) });
  addObjectCommand({ parent: message, client, name: "get", description: "Get message", positionals: [accountIdPositional(), messageIdPositional()], run: (cli, input) => cli.getMessage(input as never) });
  addObjectCommand({ parent: message, client, name: "send", description: "Send message", positionals: [accountIdPositional(), chatIdPositional(), joinTextPositional("text", "text")], options: sendOptions(), run: (cli, input) => cli.sendMessage(buildUnifiedMessageSend(input)) });
  addObjectCommand({ parent: message, client, name: "reply", description: "Reply to message", positionals: [accountIdPositional(), messageIdPositional(), joinTextPositional("text", "text")], run: (cli, input) => cli.reply(input as never) });
  addObjectCommand({ parent: message, client, name: "forward", description: "Forward message", positionals: [accountIdPositional(), messageIdPositional(), chatIdPositional()], run: (cli, input) => cli.forward(input as never) });
  addObjectCommand({ parent: message, client, name: "edit", description: "Edit message", positionals: [accountIdPositional(), messageIdPositional(), joinTextPositional("text", "text")], run: (cli, input) => cli.editMessage(input as never) });
  addObjectCommand({ parent: message, client, name: "delete", description: "Delete message", positionals: [accountIdPositional(), messageIdPositional()], options: [{ flags: "--everyone <true|false>", name: "everyone", description: "for everyone", parser: parseBoolean }, { flags: "--clear-media <true|false>", name: "clearMedia", description: "clear media", parser: parseBoolean }], run: (cli, input) => cli.deleteMessage(input as never) });
  addObjectCommand({ parent: message, client, name: "react", description: "React to message", positionals: [accountIdPositional(), messageIdPositional(), { token: "reaction", name: "reaction", description: "reaction" }], run: (cli, input) => cli.react(input as never) });
  const reaction = createGroupCommand(message, "reaction", "Message reactions", []);
  addObjectCommand({ parent: reaction, client, name: "list", description: "List reactions", positionals: [accountIdPositional(), messageIdPositional()], run: (cli, input) => cli.messageReactions(input as never) });
  addSetClearCommand(message, client, "star", (cli, body, set) => set ? cli.starMessage(body as never) : cli.unstarMessage(body as never), [accountIdPositional(), messageIdPositional()]);
  const pin = createGroupCommand(message, "pin", "Pin message", []);
  addObjectCommand({ parent: pin, client, name: "set", description: "Pin message", positionals: [accountIdPositional(), messageIdPositional(), integerPositional("duration", "duration")], run: (cli, input) => cli.pinMessage(input as never) });
  addObjectCommand({ parent: pin, client, name: "clear", description: "Unpin message", positionals: [accountIdPositional(), messageIdPositional()], run: (cli, input) => cli.unpinMessage(input as never) });
  const poll = createGroupCommand(message, "poll", "Poll actions", []);
  addObjectCommand({ parent: poll, client, name: "vote", description: "Vote in poll", positionals: [accountIdPositional(), messageIdPositional(), stringListPositional("selectedOptions", "option")], run: (cli, input) => cli.votePoll(input as never) });
  addObjectCommand({ parent: poll, client, name: "votes", description: "List poll votes", positionals: [accountIdPositional(), messageIdPositional()], run: (cli, input) => cli.messagePollVotes(input as never) });
  const event = createGroupCommand(message, "event", "Event actions", []);
  addObjectCommand({ parent: event, client, name: "respond", description: "Respond to event", positionals: [accountIdPositional(), messageIdPositional(), integerPositional("response", "response")], run: (cli, input) => cli.respondScheduledEvent({ accountId: requireString(input.accountId, "accountId"), eventMessageId: requireString(input.messageId, "messageId"), response: input.response as number }) });
}

function registerGroups(program: Command, client: ApiClient): void {
  const group = createGroupCommand(program, "group", "Group operations", ["wato group create default Team"]);
  addObjectCommand({ parent: group, client, name: "create", description: "Create group", positionals: [accountIdPositional(), joinTextPositional("title", "title")], options: [{ flags: "--participants <ids>", name: "participants", description: "participants", parser: parseCsv }, { flags: "--message-timer <n>", name: "messageTimer", description: "timer", parser: parseInteger }, { flags: "--parent-group-id <id>", name: "parentGroupId", description: "parent group" }, { flags: "--auto-send-invite-v4 <true|false>", name: "autoSendInviteV4", description: "auto invite", parser: parseBoolean }, { flags: "--comment <text>", name: "comment", description: "comment" }, { flags: "--member-add-mode <true|false>", name: "memberAddMode", description: "member add mode", parser: parseBoolean }, { flags: "--membership-approval-mode <true|false>", name: "membershipApprovalMode", description: "approval mode", parser: parseBoolean }, { flags: "--restrict <true|false>", name: "isRestrict", description: "restrict", parser: parseBoolean }, { flags: "--announce <true|false>", name: "isAnnounce", description: "announce", parser: parseBoolean }], run: (cli, input) => cli.createGroup(input as never) });
  addObjectCommand({ parent: group, client, name: "get", description: "Get group", positionals: [accountIdPositional(), groupIdPositional()], run: (cli, input) => cli.getGroupInfo(input as never) });
  addObjectCommand({ parent: group, client, name: "update", description: "Update group", positionals: [accountIdPositional(), groupIdPositional()], options: [{ flags: "--subject <text>", name: "subject", description: "subject" }, { flags: "--description <text>", name: "description", description: "description" }, { flags: "--messages-admins-only <true|false>", name: "messagesAdminsOnly", description: "admins only messages", parser: parseBoolean }, { flags: "--info-admins-only <true|false>", name: "infoAdminsOnly", description: "admins only info", parser: parseBoolean }, { flags: "--add-members-admins-only <true|false>", name: "addMembersAdminsOnly", description: "admins only add", parser: parseBoolean }], run: (cli, input) => cli.updateGroup(input as never) });
  addObjectCommand({ parent: group, client, name: "leave", description: "Leave group", positionals: [accountIdPositional(), groupIdPositional()], run: (cli, input) => cli.leaveGroup(input as never) });
  const invite = createGroupCommand(group, "invite", "Invites", []);
  addObjectCommand({ parent: invite, client, name: "join", description: "Join invite", positionals: [accountIdPositional(), { token: "inviteCode", name: "inviteCode", description: "invite code" }], run: (cli, input) => cli.joinGroupByInvite(input as never) });
  addObjectCommand({ parent: invite, client, name: "info", description: "Invite info", positionals: [accountIdPositional(), { token: "inviteCode", name: "inviteCode", description: "invite code" }], run: (cli, input) => cli.getInviteInfo(input as never) });
  addObjectCommand({ parent: invite, client, name: "private-accept", description: "Accept private invite", positionals: [accountIdPositional(), { token: "inviteCode", name: "inviteCode", description: "invite code" }, integerPositional("inviteCodeExp", "invite expiration"), groupIdPositional(), { token: "fromId", name: "fromId", description: "from id" }, { token: "toId", name: "toId", description: "to id" }], options: [{ flags: "--group-name <text>", name: "groupName", description: "group name" }], run: (cli, input) => cli.acceptGroupV4Invite(input as never) });
  const code = createGroupCommand(invite, "code", "Invite code", []);
  addObjectCommand({ parent: code, client, name: "get", description: "Get invite code", positionals: [accountIdPositional(), groupIdPositional()], run: (cli, input) => cli.getGroupInvite(input as never) });
  addObjectCommand({ parent: code, client, name: "revoke", description: "Revoke invite code", positionals: [accountIdPositional(), groupIdPositional()], run: (cli, input) => cli.revokeGroupInvite(input as never) });
  const participant = createGroupCommand(group, "participant", "Participants", []);
  addParticipantAction(participant, client, "add", (cli, input) => cli.addGroupParticipants(input as never));
  addParticipantAction(participant, client, "remove", (cli, input) => cli.kickGroupParticipants(input as never));
  addParticipantAction(participant, client, "promote", (cli, input) => cli.promoteGroupParticipants(input as never));
  addParticipantAction(participant, client, "demote", (cli, input) => cli.demoteGroupParticipants(input as never));
  const request = createGroupCommand(group, "request", "Membership requests", []);
  addObjectCommand({ parent: request, client, name: "list", description: "List requests", positionals: [accountIdPositional(), groupIdPositional()], run: (cli, input) => cli.groupMembershipRequests(input as never) });
  addObjectCommand({ parent: request, client, name: "approve", description: "Approve requests", positionals: [accountIdPositional(), groupIdPositional()], options: groupRequestOptions(), run: (cli, input) => cli.approveGroupMembershipRequests(input as never) });
  addObjectCommand({ parent: request, client, name: "reject", description: "Reject requests", positionals: [accountIdPositional(), groupIdPositional()], options: groupRequestOptions(), run: (cli, input) => cli.rejectGroupMembershipRequests(input as never) });
}

function registerChannels(program: Command, client: ApiClient): void {
  const channel = createGroupCommand(program, "channel", "Channel operations", ["wato channel message send default 120363000000000000@newsletter \"hello\""]);
  addObjectCommand({ parent: channel, client, name: "list", description: "List channels", positionals: [accountIdPositional()], run: (cli, input) => cli.listChannels(requireString(input.accountId, "accountId")) });
  addObjectCommand({ parent: channel, client, name: "search", description: "Search channels", positionals: [accountIdPositional()], options: [{ flags: "--search-text <text>", name: "searchText", description: "search text" }, { flags: "--country-code <code>", name: "countryCodes", description: "country code", parser: collectString, defaultValue: [] }, { flags: "--skip-subscribed-newsletters <true|false>", name: "skipSubscribedNewsletters", description: "skip subscribed", parser: parseBoolean }, { flags: "--view <n>", name: "view", description: "view", parser: parseInteger }, { flags: "--limit <n>", name: "limit", description: "limit", parser: parseInteger }], run: (cli, input) => cli.searchChannels(input as never) });
  addObjectCommand({ parent: channel, client, name: "create", description: "Create channel", positionals: [accountIdPositional(), joinTextPositional("title", "title")], options: [{ flags: "--description <text>", name: "description", description: "description" }], run: (cli, input) => cli.createChannel(input as never) });
  addObjectCommand({ parent: channel, client, name: "get", description: "Get channel", positionals: [accountIdPositional(), channelIdPositional()], run: (cli, input) => cli.getChannel(input as never) });
  addObjectCommand({ parent: channel, client, name: "get-by-invite", description: "Get channel by invite", positionals: [accountIdPositional(), { token: "inviteCode", name: "inviteCode", description: "invite code" }], run: (cli, input) => cli.getChannelByInvite(input as never) });
  addObjectCommand({ parent: channel, client, name: "update", description: "Update channel", positionals: [accountIdPositional(), channelIdPositional()], options: [{ flags: "--subject <text>", name: "subject", description: "subject" }, { flags: "--description <text>", name: "description", description: "description" }, { flags: "--reaction-setting <n>", name: "reactionSetting", description: "reaction setting", parser: parseInteger }, { flags: "--profile-picture <path>", name: "profilePicture", description: "profile picture", parser: toFileInput }], run: (cli, input) => cli.updateChannel(input as never) });
  const subscriber = createGroupCommand(channel, "subscriber", "Subscribers", []);
  addObjectCommand({ parent: subscriber, client, name: "list", description: "List subscribers", positionals: [accountIdPositional(), channelIdPositional()], options: [{ flags: "--limit <n>", name: "limit", description: "limit", parser: parseInteger }], run: (cli, input) => cli.channelSubscribers(input as never) });
  const message = createGroupCommand(channel, "message", "Channel messages", []);
  addObjectCommand({ parent: message, client, name: "list", description: "List channel messages", positionals: [accountIdPositional(), channelIdPositional()], options: [{ flags: "--limit <n>", name: "limit", description: "limit", parser: parseInteger }, { flags: "--from-me <true|false>", name: "fromMe", description: "from me", parser: parseBoolean }], run: (cli, input) => cli.channelMessages(input as never) });
  addObjectCommand({ parent: message, client, name: "send", description: "Send channel message", positionals: [accountIdPositional(), channelIdPositional(), joinTextPositional("text", "text")], options: channelSendOptions(), run: (cli, input) => cli.sendChannelMessage(buildUnifiedChannelSend(input)) });
  addSetClearCommand(channel, client, "subscription", (cli, body, set) => set ? cli.subscribeChannel(body as never) : cli.unsubscribeChannel(body as never), [accountIdPositional(), channelIdPositional()]);
  addSetClearCommand(channel, client, "mute", (cli, body, set) => set ? cli.muteChannel(body as never) : cli.unmuteChannel(body as never), [accountIdPositional(), channelIdPositional()]);
  const read = createGroupCommand(channel, "read", "Read state", []);
  addObjectCommand({ parent: read, client, name: "seen", description: "Mark seen", positionals: [accountIdPositional(), channelIdPositional()], run: (cli, input) => cli.seenChannel(input as never) });
  const admin = createGroupCommand(channel, "admin", "Admins", []);
  addObjectCommand({ parent: admin, client, name: "invite", description: "Invite admin", positionals: [accountIdPositional(), channelIdPositional(), { token: "userId", name: "userId", description: "user id" }], options: [{ flags: "--comment <text>", name: "comment", description: "comment" }], run: (cli, input) => cli.inviteChannelAdmin(input as never) });
  addObjectCommand({ parent: admin, client, name: "accept", description: "Accept admin invite", positionals: [accountIdPositional(), channelIdPositional()], run: (cli, input) => cli.acceptChannelAdminInvite(input as never) });
  addObjectCommand({ parent: admin, client, name: "revoke-invite", description: "Revoke admin invite", positionals: [accountIdPositional(), channelIdPositional(), { token: "userId", name: "userId", description: "user id" }], options: [{ flags: "--comment <text>", name: "comment", description: "comment" }], run: (cli, input) => cli.revokeChannelAdminInvite(input as never) });
  addObjectCommand({ parent: admin, client, name: "demote", description: "Demote admin", positionals: [accountIdPositional(), channelIdPositional(), { token: "userId", name: "userId", description: "user id" }], run: (cli, input) => cli.demoteChannelAdmin(input as never) });
  const ownership = createGroupCommand(channel, "ownership", "Ownership", []);
  addObjectCommand({ parent: ownership, client, name: "transfer", description: "Transfer ownership", positionals: [accountIdPositional(), channelIdPositional(), { token: "newOwnerId", name: "newOwnerId", description: "new owner id" }], options: [{ flags: "--dismiss-self-as-admin <true|false>", name: "shouldDismissSelfAsAdmin", description: "dismiss self", parser: parseBoolean }], run: (cli, input) => cli.transferChannelOwnership(input as never) });
  addObjectCommand({ parent: channel, client, name: "delete", description: "Delete channel", positionals: [accountIdPositional(), channelIdPositional()], run: (cli, input) => cli.deleteChannel(input as never) });
}

function registerContacts(program: Command, client: ApiClient): void {
  const contact = createGroupCommand(program, "contact", "Contact operations", ["wato contact list default"]);
  addObjectCommand({ parent: contact, client, name: "list", description: "List contacts", positionals: [accountIdPositional()], run: (cli, input) => cli.contacts(requireString(input.accountId, "accountId")) });
  const blocked = createGroupCommand(contact, "blocked", "Blocked contacts", []);
  addObjectCommand({ parent: blocked, client, name: "list", description: "List blocked contacts", positionals: [accountIdPositional()], run: (cli, input) => cli.blockedContacts(requireString(input.accountId, "accountId")) });
  addObjectCommand({ parent: contact, client, name: "get", description: "Get contact", positionals: [accountIdPositional(), contactIdPositional()], run: (cli, input) => cli.contactInfo(input as never) });
  addSetClearCommand(contact, client, "block", (cli, body, set) => set ? cli.blockContact(body as never) : cli.unblockContact(body as never), [accountIdPositional(), contactIdPositional()]);
  const group = createGroupCommand(contact, "group", "Group relations", []);
  addObjectCommand({ parent: group, client, name: "common", description: "Common groups", positionals: [accountIdPositional(), contactIdPositional()], run: (cli, input) => cli.commonGroups(input as never) });
  const number = createGroupCommand(contact, "number", "Number tools", []);
  addObjectCommand({ parent: number, client, name: "format", description: "Format number", positionals: [accountIdPositional(), { token: "value", name: "value", description: "value" }], run: (cli, input) => cli.formattedNumber(input as never) });
  addObjectCommand({ parent: number, client, name: "country-code", description: "Country code", positionals: [accountIdPositional(), { token: "value", name: "value", description: "value" }], run: (cli, input) => cli.countryCode(input as never) });
  addObjectCommand({ parent: number, client, name: "resolve-id", description: "Resolve number id", positionals: [accountIdPositional(), { token: "number", name: "number", description: "number" }], run: (cli, input) => cli.numberId(input as never) });
  const registration = createGroupCommand(contact, "registration", "Registration", []);
  addObjectCommand({ parent: registration, client, name: "get", description: "Get registration", positionals: [accountIdPositional(), contactIdPositional()], run: (cli, input) => cli.isRegistered(input as never) });
  addObjectCommand({ parent: contact, client, name: "device-count", description: "Device count", positionals: [accountIdPositional(), contactIdPositional()], run: (cli, input) => cli.contactDeviceCount(input as never) });
  const photo = createGroupCommand(contact, "photo", "Photo", []);
  addObjectCommand({ parent: photo, client, name: "get", description: "Get photo", positionals: [accountIdPositional(), contactIdPositional()], run: (cli, input) => cli.profilePicture(input as never) });
  const addressBook = createGroupCommand(contact, "address-book", "Address book", []);
  addObjectCommand({ parent: addressBook, client, name: "upsert", description: "Upsert address book", positionals: [accountIdPositional(), { token: "phoneNumber", name: "phoneNumber", description: "phone number" }, { token: "firstName", name: "firstName", description: "first name" }, { token: "lastName", name: "lastName", description: "last name", required: false }], options: [{ flags: "--sync-to-addressbook <true|false>", name: "syncToAddressbook", description: "sync", parser: parseBoolean }], run: (cli, input) => cli.saveAddressBookContact({ accountId: requireString(input.accountId, "accountId"), phoneNumber: requireString(input.phoneNumber, "phoneNumber"), firstName: requireString(input.firstName, "firstName"), lastName: asOptionalString(input.lastName) ?? "", syncToAddressbook: input.syncToAddressbook as boolean | undefined }) });
  addObjectCommand({ parent: addressBook, client, name: "delete", description: "Delete address book", positionals: [accountIdPositional(), { token: "phoneNumber", name: "phoneNumber", description: "phone number" }], run: (cli, input) => cli.deleteAddressBookContact(input as never) });
  const identity = createGroupCommand(contact, "identity", "Identity", []);
  addObjectCommand({ parent: identity, client, name: "resolve-lid-phone", description: "Resolve LID/phone", positionals: [accountIdPositional(), stringListPositional("userIds", "user ids")], run: (cli, input) => cli.contactLidPhone(input as never) });
  const note = createGroupCommand(contact, "note", "Notes", []);
  addObjectCommand({ parent: note, client, name: "set", description: "Set note", positionals: [accountIdPositional(), { token: "userId", name: "userId", description: "user id" }, joinTextPositional("note", "note")], run: (cli, input) => cli.addCustomerNote(input as never) });
  addObjectCommand({ parent: note, client, name: "get", description: "Get note", positionals: [accountIdPositional(), { token: "userId", name: "userId", description: "user id" }], run: (cli, input) => cli.customerNote(input as never) });
}

function registerLabels(program: Command, client: ApiClient): void {
  const label = createGroupCommand(program, "label", "Label operations", []);
  addObjectCommand({ parent: label, client, name: "list", description: "List labels", positionals: [accountIdPositional()], run: (cli, input) => cli.labels(requireString(input.accountId, "accountId")) });
  addObjectCommand({ parent: label, client, name: "get", description: "Get label", positionals: [accountIdPositional(), { token: "labelId", name: "labelId", description: "label id" }], run: (cli, input) => cli.labelInfo(input as never) });
  const chat = createGroupCommand(label, "chat", "Label chats", []);
  addObjectCommand({ parent: chat, client, name: "list", description: "List chats by label", positionals: [accountIdPositional(), { token: "labelId", name: "labelId", description: "label id" }], run: (cli, input) => cli.chatsByLabel(input as never) });
  const chatLabel = createGroupCommand(label, "chat-label", "Chat label operations", []);
  addObjectCommand({ parent: chatLabel, client, name: "list", description: "List chat labels", positionals: [accountIdPositional(), chatIdPositional()], run: (cli, input) => cli.chatLabels(input as never) });
  addObjectCommand({ parent: chatLabel, client, name: "set", description: "Set chat labels", positionals: [accountIdPositional(), stringListPositional("chatIds", "chat ids")], options: [{ flags: "--label-id <id>", name: "labelIds", description: "label id", parser: collectString, defaultValue: [] }], run: (cli, input) => cli.updateChatLabels({ accountId: requireString(input.accountId, "accountId"), chatIds: input.chatIds as string[], labelIds: input.labelIds as string[] }) });
}

function registerBroadcasts(program: Command, client: ApiClient): void {
  const broadcast = createGroupCommand(program, "broadcast", "Broadcast operations", []);
  addObjectCommand({ parent: broadcast, client, name: "list", description: "List broadcasts", positionals: [accountIdPositional()], run: (cli, input) => cli.broadcasts(requireString(input.accountId, "accountId")) });
  addObjectCommand({ parent: broadcast, client, name: "get", description: "Get broadcast", positionals: [accountIdPositional(), { token: "broadcastId", name: "broadcastId", description: "broadcast id" }], run: (cli, input) => cli.broadcastInfo(input as never) });
}

function registerWorkflows(program: Command, client: ApiClient): void {
  const workflow = createGroupCommand(program, "workflow", "Workflow operations", []);
  addSimpleCommand(workflow, "list", async () => (await client.workflows()).workflows);
  const provider = createGroupCommand(workflow, "provider", "Providers", []);
  addSimpleCommand(provider, "list", async () => client.workflowProviders());
  const execution = createGroupCommand(workflow, "execution", "Executions", []);
  addSimpleCommand(execution, "list", async () => (await client.workflowExecutions()).executions);
  addObjectCommand({ parent: workflow, client, name: "validate", description: "Validate workflow", defaultInput: sampleWorkflowDefinition, run: (cli, input) => cli.validateWorkflow(input) });
  addObjectCommand({ parent: workflow, client, name: "upsert", description: "Upsert workflow", defaultInput: sampleWorkflowDefinition, run: (cli, input) => cli.upsertWorkflow(input) });
  addObjectCommand({ parent: workflow, client, name: "test", description: "Test workflow", defaultInput: sampleWorkflowTestInput, run: (cli, input) => cli.testWorkflow(input as never) });
}

function registerWebhooks(program: Command, client: ApiClient): void {
  const webhook = createGroupCommand(program, "webhook", "Webhook operations", []);
  addSimpleCommand(webhook, "list", async () => (await client.webhooks()).webhooks);
  const delivery = createGroupCommand(webhook, "delivery", "Deliveries", []);
  addSimpleCommand(delivery, "list", async () => (await client.webhookDeliveries()).deliveries);
  addObjectCommand({ parent: webhook, client, name: "upsert", description: "Upsert webhook", positionals: [{ token: "webhookId", name: "id", description: "webhook id" }, { token: "url", name: "url", description: "url" }], options: [{ flags: "--secret <secret>", name: "secret", description: "secret" }, { flags: "--enabled <true|false>", name: "enabled", description: "enabled", parser: parseBoolean }, { flags: "--event-type <type>", name: "eventTypes", description: "event type", parser: collectString, defaultValue: [] }, { flags: "--account-id <id>", name: "accountIds", description: "account id", parser: collectString, defaultValue: [] }, { flags: "--header <key=value>", name: "headers", description: "header", parser: parseHeaderPair, defaultValue: {} }], run: (cli, input) => cli.upsertWebhook({ id: requireString(input.id, "webhookId"), url: requireString(input.url, "url"), secret: asOptionalString(input.secret), enabled: input.enabled as boolean | undefined, eventTypes: input.eventTypes as string[] | undefined, accountIds: input.accountIds as string[] | undefined, headers: input.headers as Record<string, string> | undefined }) });
  addObjectCommand({ parent: webhook, client, name: "delete", description: "Delete webhook", positionals: [{ token: "webhookId", name: "webhookId", description: "webhook id" }], run: (cli, input) => cli.removeWebhook(requireString(input.webhookId, "webhookId")) });
  addObjectCommand({ parent: delivery, client, name: "replay", description: "Replay delivery", positionals: [{ token: "deliveryId", name: "deliveryId", description: "delivery id" }], run: (cli, input) => cli.replayWebhookDelivery(requireString(input.deliveryId, "deliveryId")) });
  const event = createGroupCommand(webhook, "event", "Webhook events", []);
  addObjectCommand({ parent: event, client, name: "test", description: "Test event", positionals: [{ token: "eventType", name: "eventType", description: "event type" }], options: [{ flags: "--account-id <id>", name: "accountId", description: "account id" }, { flags: "--payload-json <json>", name: "payload", description: "payload json", parser: parseJsonValue }], run: (cli, input) => cli.testWebhookEvent(input as never) });
}

function sendOptions(): OptionSpec[] {
  return [
    { flags: "--image <path>", name: "image", description: "image path", parser: toFileInput },
    { flags: "--video <path>", name: "video", description: "video path", parser: toFileInput },
    { flags: "--audio <path>", name: "audio", description: "audio path", parser: toFileInput },
    { flags: "--voice <path>", name: "voice", description: "voice path", parser: toFileInput },
    { flags: "--document <path>", name: "document", description: "document path", parser: toFileInput },
    { flags: "--sticker <path>", name: "sticker", description: "sticker path", parser: toFileInput },
    { flags: "--gif <path>", name: "gif", description: "gif path", parser: toFileInput },
    { flags: "--contact <id>", name: "contacts", description: "contact id", parser: collectString, defaultValue: [] },
    { flags: "--latitude <n>", name: "latitude", description: "latitude", parser: parseFloatValue },
    { flags: "--longitude <n>", name: "longitude", description: "longitude", parser: parseFloatValue },
    { flags: "--poll-question <text>", name: "pollQuestion", description: "poll question" },
    { flags: "--poll-option <text>", name: "pollOptions", description: "poll option", parser: collectString, defaultValue: [] },
    { flags: "--poll-allow-multiple-answers <true|false>", name: "pollAllowMultipleAnswers", description: "allow multiple", parser: parseBoolean },
    { flags: "--event-name <text>", name: "eventName", description: "event name" },
    { flags: "--event-start <iso>", name: "eventStart", description: "event start" },
    { flags: "--event-description <text>", name: "eventDescription", description: "event description" },
    { flags: "--event-end <iso>", name: "eventEnd", description: "event end" },
    { flags: "--event-location <text>", name: "eventLocation", description: "event location" },
    { flags: "--event-call-type <type>", name: "eventCallType", description: "event call type" },
    { flags: "--event-canceled <true|false>", name: "eventCanceled", description: "event canceled", parser: parseBoolean },
    { flags: "--caption <text>", name: "caption", description: "caption" },
    { flags: "--quoted-message-id <id>", name: "quotedMessageId", description: "quoted message id" },
    { flags: "--mention <id>", name: "mentions", description: "mention", parser: collectString, defaultValue: [] },
    { flags: "--view-once <true|false>", name: "viewOnce", description: "view once", parser: parseBoolean },
    { flags: "--hd <true|false>", name: "hd", description: "hd", parser: parseBoolean },
    { flags: "--sticker-name <text>", name: "stickerName", description: "sticker name" },
    { flags: "--sticker-author <text>", name: "stickerAuthor", description: "sticker author" },
    { flags: "--sticker-category <text>", name: "stickerCategories", description: "sticker category", parser: collectString, defaultValue: [] }
  ];
}

function channelSendOptions(): OptionSpec[] {
  return [
    { flags: "--image <path>", name: "image", description: "image path", parser: toFileInput },
    { flags: "--video <path>", name: "video", description: "video path", parser: toFileInput },
    { flags: "--audio <path>", name: "audio", description: "audio path", parser: toFileInput },
    { flags: "--document <path>", name: "document", description: "document path", parser: toFileInput },
    { flags: "--gif <path>", name: "gif", description: "gif path", parser: toFileInput },
    { flags: "--caption <text>", name: "caption", description: "caption" },
    { flags: "--mention <id>", name: "mentions", description: "mention", parser: collectString, defaultValue: [] }
  ];
}

function buildUnifiedMessageSend(input: Record<string, unknown>): UnifiedMessageSendRequest {
  return buildUnifiedSendBase(input, "chatId") as unknown as UnifiedMessageSendRequest;
}

function buildUnifiedChannelSend(input: Record<string, unknown>): UnifiedChannelSendRequest {
  return buildUnifiedSendBase(input, "channelId") as unknown as UnifiedChannelSendRequest;
}

function buildUnifiedSendBase(input: Record<string, unknown>, targetKey: "chatId" | "channelId"): Record<string, unknown> {
  const payload: Record<string, unknown> = { accountId: requireString(input.accountId, "accountId"), [targetKey]: requireString(input[targetKey], targetKey), text: asOptionalString(input.text), caption: asOptionalString(input.caption), quotedMessageId: asOptionalString(input.quotedMessageId), mentions: (input.mentions as string[] | undefined)?.length ? input.mentions : undefined, viewOnce: input.viewOnce as boolean | undefined, hd: input.hd as boolean | undefined, stickerName: asOptionalString(input.stickerName), stickerAuthor: asOptionalString(input.stickerAuthor), stickerCategories: (input.stickerCategories as string[] | undefined)?.length ? input.stickerCategories : undefined };
  for (const key of ["image", "video", "audio", "voice", "document", "sticker", "gif"] as const) if (input[key]) payload[key] = input[key];
  if ((input.contacts as string[] | undefined)?.length) payload.contacts = input.contacts;
  if (typeof input.latitude === "number" || typeof input.longitude === "number") payload.location = { latitude: input.latitude, longitude: input.longitude };
  if (input.pollQuestion || (input.pollOptions as string[] | undefined)?.length) payload.poll = { question: requireString(input.pollQuestion, "pollQuestion"), options: input.pollOptions as string[] ?? [], allowMultipleAnswers: input.pollAllowMultipleAnswers as boolean | undefined };
  if (input.eventName || input.eventStart) payload.event = { name: requireString(input.eventName, "eventName"), startTime: requireString(input.eventStart, "eventStart"), description: asOptionalString(input.eventDescription), endTime: asOptionalString(input.eventEnd), location: asOptionalString(input.eventLocation), callType: asOptionalString(input.eventCallType), isEventCanceled: input.eventCanceled as boolean | undefined };
  return payload;
}

function addParticipantAction(parent: Command, client: ApiClient, name: string, run: (client: ApiClient, input: Record<string, unknown>) => Promise<unknown>): void {
  addObjectCommand({ parent, client, name, description: `${name} group participants`, positionals: [accountIdPositional(), groupIdPositional(), stringListPositional("participantIds", "participant ids")], options: [{ flags: "--comment <text>", name: "comment", description: "comment" }], run });
}

function groupRequestOptions(): OptionSpec[] {
  return [{ flags: "--requester-id <id>", name: "requesterIds", description: "requester id", parser: collectString, defaultValue: [] }, { flags: "--sleep <n>", name: "sleep", description: "sleep", parser: parseInteger }];
}

function addSetClearCommand(parent: Command, client: ApiClient, name: string, run: (client: ApiClient, body: Record<string, unknown>, set: boolean) => Promise<unknown>, positionals = [accountIdPositional(), chatIdPositional()]): void {
  const group = createGroupCommand(parent, name, `${name} operations`, []);
  addObjectCommand({ parent: group, client, name: "set", description: `Set ${name}`, positionals, run: (cli, input) => run(cli, input as Record<string, unknown>, true) });
  addObjectCommand({ parent: group, client, name: "clear", description: `Clear ${name}`, positionals, run: (cli, input) => run(cli, input as Record<string, unknown>, false) });
}

function addSimpleCommand(parent: Command, name: string, run: () => Promise<unknown>): void {
  parent.command(name).action(async () => printResult(await run()));
}

function addObjectCommand<TInput extends Record<string, unknown>>(config: ObjectCommandConfig<TInput>): void {
  if (!config.name) return;
  const command = config.parent.command(config.name).description(config.description);
  for (const positional of config.positionals ?? []) command.argument(positional.variadic ? `[${positional.token}...]` : `[${positional.token}]`, positional.description);
  command.option("--json <json>", "JSON payload alternative");
  for (const option of config.options ?? []) command.option(option.flags, option.description, option.parser as never, option.defaultValue);
  command.action(async (...actionArgs: unknown[]) => {
    const commandInstance = actionArgs[actionArgs.length - 1] as Command;
    const optionsArg = actionArgs[actionArgs.length - 2] as Record<string, unknown> | undefined;
    const args = actionArgs.slice(0, -2);
    const options = optionsArg ?? commandInstance.opts<Record<string, unknown>>();
    const input = mergeInputs(parseOptionalJson(asOptionalString(options.json)), buildPositionalObject(args, config.positionals ?? []), buildOptionsObject(options, config.options ?? []), config.defaultInput && noMeaningfulInput(options, args) ? config.defaultInput() : {}) as TInput;
    printResult(await config.run(config.client, input));
  });
}

function createGroupCommand(parent: Command, name: string, description: string, examples: string[]): Command {
  const command = parent.command(name).description(description);
  if (examples.length) command.addHelpText("after", `\nExamples:\n${examples.map((example) => `  ${example}`).join("\n")}\n`);
  return command;
}

function buildPositionalObject(values: unknown[], specs: PositionalSpec[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  specs.forEach((spec, index) => {
    const rawValue = spec.variadic ? values.slice(index) : values[index];
    if (rawValue === undefined || (Array.isArray(rawValue) && rawValue.length === 0)) return;
    result[spec.name] = spec.transform ? spec.transform(rawValue) : rawValue;
  });
  return result;
}

function buildOptionsObject(options: Record<string, unknown>, specs: OptionSpec[]): Record<string, unknown> {
  return Object.fromEntries(specs.map((spec) => [spec.name, options[spec.name]]).filter(([, value]) => value !== undefined));
}

function printResult(value: unknown): void {
  console.log(typeof value === "string" ? value : JSON.stringify(value ?? { ok: true }, null, 2));
}

function parseOptionalJson(value?: string): Record<string, unknown> {
  if (!value) return {};
  const parsed = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("JSON payload must be an object");
  return parsed as Record<string, unknown>;
}

function accountIdPositional(required = true): PositionalSpec { return { token: "accountId", name: "accountId", description: "account id", required }; }
function chatIdPositional(required = true): PositionalSpec { return { token: "chatId", name: "chatId", description: "chat id", required }; }
function messageIdPositional(required = true): PositionalSpec { return { token: "messageId", name: "messageId", description: "message id", required }; }
function contactIdPositional(required = true): PositionalSpec { return { token: "contactId", name: "contactId", description: "contact id", required }; }
function groupIdPositional(required = true): PositionalSpec { return { token: "groupId", name: "groupId", description: "group id", required }; }
function channelIdPositional(required = true): PositionalSpec { return { token: "channelId", name: "channelId", description: "channel id", required }; }
function pathPositional(): PositionalSpec { return { token: "path", name: "path", description: "path" }; }
function joinTextPositional(name: string, description: string): PositionalSpec { return { token: name, name, description, variadic: true, required: false, transform: (value) => (value as string[]).join(" ") }; }
function stringListPositional(name: string, description: string): PositionalSpec { return { token: name, name, description, variadic: true, transform: (value) => value as string[] }; }
function integerPositional(name: string, description: string): PositionalSpec { return { token: name, name, description, transform: (value) => parseInteger(String(value)) }; }

function mergeInputs(...values: Array<Record<string, unknown>>): Record<string, unknown> { return Object.assign({}, ...values); }
function noMeaningfulInput(options: Record<string, unknown>, args: unknown[]): boolean { return !Object.keys(options).filter((key) => key !== "json").length && args.length === 0; }
function asOptionalString(value: unknown): string | undefined { return typeof value === "string" && value.length > 0 ? value : undefined; }
function requireString(value: unknown, field: string): string { const resolved = asOptionalString(value); if (!resolved) throw new Error(`Missing required field: ${field}`); return resolved; }
function requirePresence(value: unknown): "available" | "unavailable" { const resolved = requireString(value, "presence"); if (resolved !== "available" && resolved !== "unavailable") throw new Error("presence must be available or unavailable"); return resolved; }
function parseJsonValue(value: string): unknown { return JSON.parse(value); }
function parseCsv(value: string): string[] { return value.split(",").map((item) => item.trim()).filter(Boolean); }
function parseBoolean(value: string): boolean { if (["true", "1", "yes", "y", "on"].includes(value.toLowerCase())) return true; if (["false", "0", "no", "n", "off"].includes(value.toLowerCase())) return false; throw new Error(`Invalid boolean value: ${value}`); }
function parseInteger(value: string): number { const parsed = Number.parseInt(value, 10); if (Number.isNaN(parsed)) throw new Error(`Invalid integer value: ${value}`); return parsed; }
function parseFloatValue(value: string): number { const parsed = Number.parseFloat(value); if (Number.isNaN(parsed)) throw new Error(`Invalid numeric value: ${value}`); return parsed; }
function toFileInput(value: string): { filePath: string } { return { filePath: value }; }
function collectString(value: string, previous?: unknown): string[] { return [...(Array.isArray(previous) ? previous as string[] : []), value]; }
function parseHeaderPair(value: string, previous?: unknown): Record<string, string> { const [key, ...rest] = value.split("="); if (!key || rest.length === 0) throw new Error(`Invalid header: ${value}`); return { ...(isRecord(previous) ? previous : {}), [key]: rest.join("=") }; }
function isRecord(value: unknown): value is Record<string, string> { return typeof value === "object" && value !== null; }
function installCliSignalHandlers(abortController: AbortController): void { for (const signal of ["SIGINT", "SIGTERM", "SIGQUIT", "SIGHUP"] as const) process.once(signal, () => abortController.abort(signal)); }
function isAbortError(error: unknown): boolean { return error instanceof Error && error.name === "AbortError"; }
function sampleWorkflowDefinition(): Record<string, unknown> { return { id: "sample-workflow", name: "Sample Workflow", version: 1, enabled: true, accountScope: { mode: "all" }, trigger: { type: "message.received", config: { pattern: "hello" } }, conditions: [], actions: [{ id: "reply", type: "message.sendText", config: { chatId: "${input.chatId}", text: "ack" } }] }; }
function sampleWorkflowTestInput(): Record<string, unknown> { return { workflowId: "sample-workflow", eventType: "message.received", payload: { body: "hello" } }; }

void main().catch((error) => {
  if (isAbortError(error)) return;
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
