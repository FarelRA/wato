import { Command } from "commander";
import { createWatoConfig } from "@wato/config";
import { createApiClient } from "@wato/api-client";
import qrcode from "qrcode-terminal";

type ApiClient = ReturnType<typeof createApiClient>;

type PositionalSpec = {
  token: string;
  name: string;
  description: string;
  required?: boolean;
  variadic?: boolean;
  transform?: (value: unknown) => unknown;
};

type OptionSpec = {
  flags: string;
  name: string;
  description: string;
  parser?: (value: string) => unknown;
};

type ObjectCommandConfig<TInput extends Record<string, unknown>> = {
  parent: Command;
  client: ApiClient;
  name: string;
  description: string;
  positionals?: PositionalSpec[];
  options?: OptionSpec[];
  examples?: string[];
  defaultInput?: () => TInput;
  run: (client: ApiClient, input: TInput) => Promise<unknown>;
};

type SimpleCommandConfig = {
  parent: Command;
  name: string;
  description: string;
  examples?: string[];
  run: () => Promise<unknown>;
};

async function main(): Promise<void> {
  const config = await createWatoConfig();
  const client = createApiClient(config);
  const program = buildProgram(client);
  await program.parseAsync(process.argv);
}

function buildProgram(client: ApiClient): Command {
  const program = new Command();

  program
    .name("wato")
    .description("Operator-friendly CLI for the local wato daemon")
    .showHelpAfterError()
    .showSuggestionAfterError()
    .addHelpText(
      "after",
      `
Examples:
  wato system status
  wato account login default qr
  wato account login default pairing-code 628123456789
  wato message send default 12345@c.us "hello from wato"
  wato message send-media default 12345@c.us /tmp/demo.png --caption "demo"
  wato workflow test --json '{"eventType":"message.received","payload":{"body":"hello"}}'
`
    );

  registerSystemCommands(program, client);
  registerAccountCommands(program, client);
  registerWorkflowCommands(program, client);
  registerWebhookCommands(program, client);
  registerMessageCommands(program, client);
  registerLabelCommands(program, client);
  registerBroadcastCommands(program, client);
  registerPollCommands(program, client);
  registerChatCommands(program, client);
  registerGroupCommands(program, client);
  registerContactCommands(program, client);
  registerEventCommands(program, client);
  registerChannelCommands(program, client);

  return program;
}

function registerSystemCommands(program: Command, client: ApiClient): void {
  const system = createGroupCommand(program, "system", "Inspect daemon-wide status and health", ["wato system status"]);
  addSimpleCommand(system, "status", "Show daemon status, uptime, modules, and account counts", async () => client.systemStatus());
}

function registerAccountCommands(program: Command, client: ApiClient): void {
  const account = createGroupCommand(program, "account", "Inspect and control WhatsApp account sessions", ["wato account list", "wato account login default qr", "wato account login default pairing-code 628123456789"]);

  addSimpleCommand(account, "list", "List accounts and their current states", async () => (await client.accounts()).accounts);

  addObjectCommand({
    parent: account,
    client,
    name: "login",
    description: "Choose a login method and start linking the account",
    positionals: [accountIdPositional(), { token: "mode", name: "mode", description: "qr or pairing-code", required: false }, { token: "phoneNumber", name: "phoneNumber", description: "phone number for pairing-code mode", required: false }],
    examples: [
      "wato account login default qr",
      "wato account login default pairing-code 628123456789",
      `wato account login --json '{"accountId":"default","mode":"pairing-code","phoneNumber":"628123456789"}'`
    ],
    run: async (cli, input) => {
      const accountId = requireString(input.accountId, "accountId");
      const mode = asOptionalString(input.mode) ?? "qr";
      if (mode === "qr") {
        const record = (await cli.accounts()).accounts.find((item) => item.id === accountId);
        if (!record) {
          throw new Error(`Unknown account: ${accountId}`);
        }
        if (!record.qrCode) {
          console.log("No QR available");
          return { ok: true };
        }
        qrcode.generate(record.qrCode, { small: true });
        return { ok: true };
      }
      if (mode === "pairing-code") {
        return cli.pairingCode({
          accountId,
          phoneNumber: requireString(input.phoneNumber, "phoneNumber")
        });
      }
      throw new Error(`Unknown login mode: ${mode}`);
    }
  });

  addObjectCommand({
    parent: account,
    client,
    name: "set-status",
    description: "Set WhatsApp account status text",
    positionals: [accountIdPositional(), joinTextPositional("status", "status text")],
    run: (cli, input) => cli.setStatus({ accountId: requireString(input.accountId, "accountId"), status: requireString(input.status, "status") })
  });

  addObjectCommand({
    parent: account,
    client,
    name: "display-name",
    description: "Set the profile display name",
    positionals: [accountIdPositional(), { token: "displayName", name: "displayName", description: "display name", required: false }],
    run: (cli, input) => cli.setDisplayName({ accountId: requireString(input.accountId, "accountId"), displayName: requireString(input.displayName, "displayName") })
  });

  addObjectCommand({
    parent: account,
    client,
    name: "revoke-status",
    description: "Revoke one of your posted status messages",
    positionals: [accountIdPositional(), messageIdPositional()],
    run: (cli, input) => cli.revokeStatusMessage({ accountId: requireString(input.accountId, "accountId"), messageId: requireString(input.messageId, "messageId") })
  });

  addObjectCommand({
    parent: account,
    client,
    name: "profile-picture",
    description: "Set the profile picture from a file path",
    positionals: [accountIdPositional(), mediaFilePositional()],
    run: (cli, input) => cli.setProfilePicture({ accountId: requireString(input.accountId, "accountId"), media: input.media as { filePath: string } })
  });

  addObjectCommand({
    parent: account,
    client,
    name: "delete-profile-picture",
    description: "Delete the current profile picture",
    positionals: [accountIdPositional()],
    run: (cli, input) => cli.deleteProfilePicture({ accountId: requireString(input.accountId, "accountId") })
  });

  for (const [name, description, runner] of [
    ["presence-available", "Mark the account as available", (input: Record<string, unknown>) => client.presenceAvailable({ accountId: requireString(input.accountId, "accountId") })],
    ["presence-unavailable", "Mark the account as unavailable", (input: Record<string, unknown>) => client.presenceUnavailable({ accountId: requireString(input.accountId, "accountId") })],
    ["state", "Get the current WhatsApp connection state", (input: Record<string, unknown>) => client.accountState({ accountId: requireString(input.accountId, "accountId") })],
    ["version", "Get the WhatsApp Web version in use", (input: Record<string, unknown>) => client.accountVersion({ accountId: requireString(input.accountId, "accountId") })]
  ] as const) {
    addObjectCommand({ parent: account, client, name, description, positionals: [accountIdPositional()], run: (_cli, input) => runner(input) });
  }

  addObjectCommand({
    parent: account,
    client,
    name: "auto-download",
    description: "Update auto-download flags for media and background sync",
    positionals: [accountIdPositional()],
    options: [
      { flags: "--audio <true|false>", name: "audio", description: "audio auto-download", parser: parseBoolean },
      { flags: "--documents <true|false>", name: "documents", description: "documents auto-download", parser: parseBoolean },
      { flags: "--photos <true|false>", name: "photos", description: "photos auto-download", parser: parseBoolean },
      { flags: "--videos <true|false>", name: "videos", description: "videos auto-download", parser: parseBoolean },
      { flags: "--background-sync <true|false>", name: "backgroundSync", description: "background sync", parser: parseBoolean }
    ],
    run: (cli, input) => cli.autoDownload({ accountId: requireString(input.accountId, "accountId"), audio: input.audio as boolean | undefined, documents: input.documents as boolean | undefined, photos: input.photos as boolean | undefined, videos: input.videos as boolean | undefined, backgroundSync: input.backgroundSync as boolean | undefined })
  });

  addObjectCommand({
    parent: account,
    client,
    name: "call-link",
    description: "Create a WhatsApp call link",
    positionals: [accountIdPositional(), { token: "startTime", name: "startTime", description: "ISO start time", required: false }, { token: "callType", name: "callType", description: "voice or video", required: false }],
    run: (cli, input) => cli.callLink({ accountId: requireString(input.accountId, "accountId"), startTime: requireString(input.startTime, "startTime"), callType: requireString(input.callType, "callType") })
  });
}

function registerWorkflowCommands(program: Command, client: ApiClient): void {
  const workflow = createGroupCommand(program, "workflow", "Inspect, validate, test, and manage workflows", ["wato workflow list", "wato workflow validate --json '{\"id\":\"sample\"}'", "wato workflow test --json '{\"eventType\":\"message.received\",\"payload\":{\"body\":\"hello\"}}'"]);

  addSimpleCommand(workflow, "list", "List all stored workflows", async () => (await client.workflows()).workflows);
  addSimpleCommand(workflow, "providers", "List available trigger, condition, and action types", async () => client.workflowProviders());
  addSimpleCommand(workflow, "executions", "List workflow execution history", async () => (await client.workflowExecutions()).executions);

  addObjectCommand({
    parent: workflow,
    client,
    name: "validate",
    description: "Validate a workflow definition",
    defaultInput: sampleWorkflowDefinition,
    run: (cli, input) => cli.validateWorkflow(input)
  });

  addObjectCommand({
    parent: workflow,
    client,
    name: "upsert",
    description: "Create or update a workflow definition",
    run: (cli, input) => cli.upsertWorkflow(input)
  });

  addObjectCommand({
    parent: workflow,
    client,
    name: "test",
    description: "Dry-run a workflow with a synthetic event payload",
    positionals: [{ token: "eventType", name: "eventType", description: "event type", required: false }],
    options: [
      { flags: "--workflow-id <id>", name: "workflowId", description: "stored workflow id" },
      { flags: "--account-id <id>", name: "accountId", description: "optional account id" },
      { flags: "--payload-json <json>", name: "payload", description: "JSON payload object", parser: parseJsonValue },
      { flags: "--workflow-json <json>", name: "workflow", description: "inline workflow definition JSON", parser: parseJsonValue }
    ],
    defaultInput: sampleWorkflowTestInput,
    run: (cli, input) => cli.testWorkflow(input as unknown as Parameters<ApiClient["testWorkflow"]>[0])
  });
}

function registerWebhookCommands(program: Command, client: ApiClient): void {
  const webhook = createGroupCommand(program, "webhook", "Manage outbound webhook endpoints and deliveries", ["wato webhook list", "wato webhook upsert orders https://example.com/webhook --secret super-secret", "wato webhook test-event message.received --payload-json '{\"body\":\"hello\"}'"]);

  addSimpleCommand(webhook, "list", "List webhook endpoint definitions", async () => (await client.webhooks()).webhooks);
  addSimpleCommand(webhook, "deliveries", "List webhook delivery attempts", async () => (await client.webhookDeliveries()).deliveries);

  addObjectCommand({
    parent: webhook,
    client,
    name: "upsert",
    description: "Create or update a webhook endpoint",
    positionals: [{ token: "id", name: "id", description: "webhook id", required: false }, { token: "url", name: "url", description: "destination URL", required: false }],
    options: [
      { flags: "--secret <secret>", name: "secret", description: "HMAC signing secret" },
      { flags: "--enabled <true|false>", name: "enabled", description: "enabled flag", parser: parseBoolean },
      { flags: "--event-types <types>", name: "eventTypes", description: "comma-separated event types", parser: parseCsv },
      { flags: "--account-ids <ids>", name: "accountIds", description: "comma-separated account ids", parser: parseCsv },
      { flags: "--headers-json <json>", name: "headers", description: "JSON object for extra headers", parser: parseJsonValue }
    ],
    run: (cli, input) => cli.upsertWebhook(input as { id: string; url: string })
  });

  addObjectCommand({
    parent: webhook,
    client,
    name: "remove",
    description: "Delete a webhook endpoint by id",
    positionals: [{ token: "webhookId", name: "webhookId", description: "webhook id", required: false }],
    run: (cli, input) => cli.removeWebhook({ webhookId: requireString(input.webhookId, "webhookId") })
  });

  addObjectCommand({
    parent: webhook,
    client,
    name: "replay",
    description: "Replay a webhook delivery by delivery id",
    positionals: [{ token: "deliveryId", name: "deliveryId", description: "delivery id", required: false }],
    run: (cli, input) => cli.replayWebhookDelivery({ deliveryId: requireString(input.deliveryId, "deliveryId") })
  });

  addObjectCommand({
    parent: webhook,
    client,
    name: "test-event",
    description: "Publish a synthetic event into the webhook pipeline",
    positionals: [{ token: "eventType", name: "eventType", description: "event type", required: false }],
    options: [
      { flags: "--account-id <id>", name: "accountId", description: "optional account id" },
      { flags: "--payload-json <json>", name: "payload", description: "JSON payload object", parser: parseJsonValue }
    ],
    run: (cli, input) => cli.testWebhookEvent(input as { eventType: string; accountId?: string; payload?: unknown })
  });
}

function registerMessageCommands(program: Command, client: ApiClient): void {
  const message = createGroupCommand(program, "message", "Send, inspect, and modify messages", ["wato message list default", "wato message send default 12345@c.us \"hello from wato\"", "wato message send-media default 12345@c.us /tmp/demo.png --caption demo"]);

  addObjectCommand({
    parent: message,
    client,
    name: "list",
    description: "List stored messages, optionally filtered by account",
    positionals: [{ token: "accountId", name: "accountId", description: "optional account id", required: false }],
    run: async (cli, input) => ({ messages: (await cli.messages(asOptionalString(input.accountId))).messages })
  });

  addObjectCommand({
    parent: message,
    client,
    name: "send",
    description: "Send a plain text message",
    positionals: [accountIdPositional(), chatIdPositional(), joinTextPositional("text", "message text")],
    run: (cli, input) => cli.sendMessage({ accountId: requireString(input.accountId, "accountId"), chatId: requireString(input.chatId, "chatId"), text: requireString(input.text, "text") })
  });

  addObjectCommand({
    parent: message,
    client,
    name: "send-media",
    description: "Send media with optional caption",
    positionals: [accountIdPositional(), chatIdPositional(), mediaFilePositional()],
    options: [
      { flags: "--caption <text>", name: "caption", description: "caption text" },
      { flags: "--mentions <ids>", name: "mentions", description: "comma-separated mentions", parser: parseCsv },
      { flags: "--group-mentions-json <json>", name: "groupMentions", description: "JSON array of group mentions", parser: parseJsonValue },
      { flags: "--quoted-message-id <id>", name: "quotedMessageId", description: "quoted message id" },
      { flags: "--as-document <true|false>", name: "asDocument", description: "send as document", parser: parseBoolean },
      { flags: "--as-sticker <true|false>", name: "asSticker", description: "send as sticker", parser: parseBoolean },
      { flags: "--as-voice <true|false>", name: "asVoice", description: "send as voice", parser: parseBoolean },
      { flags: "--as-gif <true|false>", name: "asGif", description: "send as gif", parser: parseBoolean },
      { flags: "--as-hd <true|false>", name: "asHd", description: "send as HD", parser: parseBoolean },
      { flags: "--view-once <true|false>", name: "isViewOnce", description: "send as view once", parser: parseBoolean },
      { flags: "--sticker-name <text>", name: "stickerName", description: "sticker name" },
      { flags: "--sticker-author <text>", name: "stickerAuthor", description: "sticker author" },
      { flags: "--sticker-categories <items>", name: "stickerCategories", description: "comma-separated sticker categories", parser: parseCsv }
    ],
    run: (cli, input) => cli.sendMedia(input as never)
  });

  addObjectCommand({
    parent: message,
    client,
    name: "send-contacts",
    description: "Send one or more contact cards",
    positionals: [accountIdPositional(), chatIdPositional(), stringListPositional("contactIds", "contact ids")],
    options: [{ flags: "--quoted-message-id <id>", name: "quotedMessageId", description: "quoted message id" }, { flags: "--contact-ids <ids>", name: "contactIds", description: "comma-separated contact ids", parser: parseCsv }],
    run: (cli, input) => cli.sendContacts(input as never)
  });

  addObjectCommand({
    parent: message,
    client,
    name: "send-location",
    description: "Send a location message",
    positionals: [accountIdPositional(), chatIdPositional(), numberPositional("latitude", "latitude"), numberPositional("longitude", "longitude")],
    options: [
      { flags: "--name <text>", name: "name", description: "location name" },
      { flags: "--address <text>", name: "address", description: "address" },
      { flags: "--url <url>", name: "url", description: "related URL" },
      { flags: "--description <text>", name: "description", description: "description" },
      { flags: "--quoted-message-id <id>", name: "quotedMessageId", description: "quoted message id" }
    ],
    run: (cli, input) => cli.sendLocation(input as never)
  });

  addObjectCommand({ parent: message, client, name: "reply", description: "Reply to a message", positionals: [accountIdPositional(), messageIdPositional(), joinTextPositional("text", "reply text")], options: [{ flags: "--chat-id <id>", name: "chatId", description: "optional target chat" }, { flags: "--mentions <ids>", name: "mentions", description: "comma-separated mentions", parser: parseCsv }], run: (cli, input) => cli.reply(input as never) });
  addObjectCommand({ parent: message, client, name: "forward", description: "Forward a message to another chat", positionals: [accountIdPositional(), messageIdPositional(), chatIdPositional()], run: (cli, input) => cli.forward(input as never) });
  addObjectCommand({ parent: message, client, name: "edit", description: "Edit a sent message", positionals: [accountIdPositional(), messageIdPositional(), joinTextPositional("text", "new text")], run: (cli, input) => cli.editMessage(input as never) });
  addObjectCommand({ parent: message, client, name: "delete", description: "Delete a message", positionals: [accountIdPositional(), messageIdPositional()], options: [{ flags: "--everyone <true|false>", name: "everyone", description: "delete for everyone", parser: parseBoolean }, { flags: "--clear-media <true|false>", name: "clearMedia", description: "clear local media", parser: parseBoolean }], run: (cli, input) => cli.deleteMessage(input as never) });
  addObjectCommand({ parent: message, client, name: "star", description: "Star a message", positionals: [accountIdPositional(), messageIdPositional()], run: (cli, input) => cli.starMessage(input as never) });
  addObjectCommand({ parent: message, client, name: "unstar", description: "Remove a star from a message", positionals: [accountIdPositional(), messageIdPositional()], run: (cli, input) => cli.unstarMessage(input as never) });
  addObjectCommand({ parent: message, client, name: "pin", description: "Pin a message", positionals: [accountIdPositional(), messageIdPositional(), integerPositional("duration", "pin duration in seconds")], run: (cli, input) => cli.pinMessage(input as never) });
  addObjectCommand({ parent: message, client, name: "unpin", description: "Unpin a message", positionals: [accountIdPositional(), messageIdPositional()], run: (cli, input) => cli.unpinMessage(input as never) });
  addObjectCommand({ parent: message, client, name: "info", description: "Fetch message metadata", positionals: [accountIdPositional(), messageIdPositional()], run: (cli, input) => cli.messageInfo(input as never) });
  addObjectCommand({ parent: message, client, name: "reactions", description: "List message reactions", positionals: [accountIdPositional(), messageIdPositional()], run: (cli, input) => cli.messageReactions(input as never) });
  addObjectCommand({ parent: message, client, name: "poll-votes", description: "List votes for a poll message", positionals: [accountIdPositional(), messageIdPositional()], run: (cli, input) => cli.messagePollVotes(input as never) });
  addObjectCommand({ parent: message, client, name: "react", description: "React to a message", positionals: [accountIdPositional(), messageIdPositional(), { token: "reaction", name: "reaction", description: "emoji or reaction text", required: false }], run: (cli, input) => cli.react(input as never) });
}

function registerLabelCommands(program: Command, client: ApiClient): void {
  const label = createGroupCommand(program, "label", "Inspect and manage labels", ["wato label list default", "wato label info default label-1", "wato label update-chats default 12345@c.us 67890@c.us --label-ids label-1,label-2"]);

  addObjectCommand({ parent: label, client, name: "list", description: "List labels for an account", positionals: [accountIdPositional()], run: async (cli, input) => cli.labels(requireString(input.accountId, "accountId")) });
  addObjectCommand({ parent: label, client, name: "info", description: "Get a label by id", positionals: [accountIdPositional(), { token: "labelId", name: "labelId", description: "label id", required: false }], run: (cli, input) => cli.labelInfo(input as never) });
  addObjectCommand({ parent: label, client, name: "chats", description: "List chats by label", positionals: [accountIdPositional(), { token: "labelId", name: "labelId", description: "label id", required: false }], run: (cli, input) => cli.chatsByLabel(input as never) });
  addObjectCommand({ parent: label, client, name: "chat-labels", description: "List labels attached to a chat", positionals: [accountIdPositional(), chatIdPositional()], run: (cli, input) => cli.chatLabels(input as never) });
  addObjectCommand({ parent: label, client, name: "update-chats", description: "Update labels attached to chats", positionals: [accountIdPositional(), stringListPositional("chatIds", "chat ids")], options: [{ flags: "--label-ids <ids>", name: "labelIds", description: "comma-separated label ids", parser: parseCsv }], run: (cli, input) => cli.updateChatLabels(input as never) });
}

function registerBroadcastCommands(program: Command, client: ApiClient): void {
  const broadcast = createGroupCommand(program, "broadcast", "Inspect WhatsApp broadcast lists", ["wato broadcast list default", "wato broadcast info default broadcast-1"]);
  addObjectCommand({ parent: broadcast, client, name: "list", description: "List broadcasts for an account", positionals: [accountIdPositional()], run: async (cli, input) => cli.broadcasts(requireString(input.accountId, "accountId")) });
  addObjectCommand({ parent: broadcast, client, name: "info", description: "Get a broadcast by id", positionals: [accountIdPositional(), { token: "broadcastId", name: "broadcastId", description: "broadcast id", required: false }], run: (cli, input) => cli.broadcastInfo(input as never) });
}

function registerPollCommands(program: Command, client: ApiClient): void {
  const poll = createGroupCommand(program, "poll", "Create and vote on polls", ["wato poll create default 12345@c.us \"Lunch?\" yes no", "wato poll vote default msg-123 yes"]);
  addObjectCommand({ parent: poll, client, name: "create", description: "Create a poll in a chat", positionals: [accountIdPositional(), chatIdPositional(), { token: "question", name: "question", description: "poll question", required: false }, stringListPositional("options", "poll options")], options: [{ flags: "--allow-multiple-answers <true|false>", name: "allowMultipleAnswers", description: "allow multiple answers", parser: parseBoolean }, { flags: "--quoted-message-id <id>", name: "quotedMessageId", description: "quoted message id" }], run: (cli, input) => cli.createPoll(input as never) });
  addObjectCommand({ parent: poll, client, name: "vote", description: "Vote in an existing poll", positionals: [accountIdPositional(), messageIdPositional(), stringListPositional("selectedOptions", "selected options")], options: [], run: (cli, input) => cli.votePoll(input as never) });
}

function registerChatCommands(program: Command, client: ApiClient): void {
  const chat = createGroupCommand(program, "chat", "Inspect and operate on chats", ["wato chat list default", "wato chat info default 12345@c.us", "wato chat mute default 12345@c.us --until 2026-03-25T10:00:00.000Z"]);

  addObjectCommand({ parent: chat, client, name: "list", description: "List chats for an account", positionals: [accountIdPositional()], run: async (cli, input) => cli.chats(requireString(input.accountId, "accountId")) });
  addObjectCommand({ parent: chat, client, name: "info", description: "Get chat info", positionals: [accountIdPositional(), chatIdPositional()], run: (cli, input) => cli.chatInfo(input as never) });
  addObjectCommand({ parent: chat, client, name: "messages", description: "Fetch chat messages", positionals: [accountIdPositional(), chatIdPositional()], options: [{ flags: "--limit <n>", name: "limit", description: "message limit", parser: parseInteger }, { flags: "--from-me <true|false>", name: "fromMe", description: "only own messages", parser: parseBoolean }], run: (cli, input) => cli.chatMessages(input as never) });
  addObjectCommand({ parent: chat, client, name: "search-messages", description: "Search messages inside a chat", positionals: [accountIdPositional(), { token: "query", name: "query", description: "search query", required: false }], options: [{ flags: "--chat-id <id>", name: "chatId", description: "optional chat id" }, { flags: "--page <n>", name: "page", description: "page number", parser: parseInteger }, { flags: "--limit <n>", name: "limit", description: "result limit", parser: parseInteger }], run: (cli, input) => cli.chatSearchMessages(input as never) });

  for (const [name, description, runner, options] of [
    ["archive", "Archive a chat", (input: unknown) => client.archiveChat(input as never), []],
    ["unarchive", "Unarchive a chat", (input: unknown) => client.unarchiveChat(input as never), []],
    ["pin", "Pin a chat", (input: unknown) => client.pinChat(input as never), []],
    ["unpin", "Unpin a chat", (input: unknown) => client.unpinChat(input as never), []],
    ["mark-unread", "Mark a chat as unread", (input: unknown) => client.markChatUnread(input as never), []],
    ["seen", "Mark a chat as seen", (input: unknown) => client.sendSeen(input as never), []],
    ["typing", "Send typing state", (input: unknown) => client.sendTyping(input as never), []],
    ["recording", "Send recording state", (input: unknown) => client.sendRecording(input as never), []],
    ["clear-state", "Clear typing or recording state", (input: unknown) => client.clearChatState(input as never), []],
    ["clear-messages", "Clear messages in the chat", (input: unknown) => client.clearChatMessages(input as never), []],
    ["delete", "Delete a chat", (input: unknown) => client.deleteChat(input as never), []],
    ["sync-history", "Start syncing historical messages", (input: unknown) => client.syncHistory(input as never), []],
    ["mute", "Mute a chat", (input: unknown) => client.muteChat(input as never), [{ flags: "--until <iso>", name: "until", description: "ISO time to unmute" }]],
    ["unmute", "Unmute a chat", (input: unknown) => client.unmuteChat(input as never), []]
  ] as const) {
    addObjectCommand({ parent: chat, client, name, description, positionals: [accountIdPositional(), chatIdPositional()], options: [...options], run: async (_cli, input) => runner(input) });
  }
}

function registerGroupCommands(program: Command, client: ApiClient): void {
  const group = createGroupCommand(program, "group", "Manage group invites, metadata, and participants", ["wato group join-invite default AbCdEfGhIj", "wato group create default \"Wato Group\" --participants 12345@c.us,67890@c.us", "wato group add default 120363000000000000@g.us 12345@c.us 67890@c.us"]);

  addObjectCommand({ parent: group, client, name: "join-invite", description: "Join a group by invite code", positionals: [accountIdPositional(), { token: "inviteCode", name: "inviteCode", description: "invite code", required: false }], run: (cli, input) => cli.joinGroupByInvite(input as never) });
  addObjectCommand({ parent: group, client, name: "invite-info", description: "Inspect a group invite code", positionals: [accountIdPositional(), { token: "inviteCode", name: "inviteCode", description: "invite code", required: false }], run: (cli, input) => cli.getInviteInfo(input as never) });
  addObjectCommand({ parent: group, client, name: "accept-v4-invite", description: "Accept a private V4 invite", positionals: [accountIdPositional(), { token: "inviteCode", name: "inviteCode", description: "invite code", required: false }, integerPositional("inviteCodeExp", "invite code expiration"), groupIdPositional(), { token: "fromId", name: "fromId", description: "inviter id", required: false }, { token: "toId", name: "toId", description: "recipient id", required: false }], options: [{ flags: "--group-name <text>", name: "groupName", description: "optional group name" }], run: (cli, input) => cli.acceptGroupV4Invite(input as never) });
  addObjectCommand({ parent: group, client, name: "create", description: "Create a group", positionals: [accountIdPositional(), { token: "title", name: "title", description: "group title", required: false }], options: [{ flags: "--participants <ids>", name: "participants", description: "comma-separated participants", parser: parseCsv }, { flags: "--message-timer <n>", name: "messageTimer", description: "message timer seconds", parser: parseInteger }, { flags: "--parent-group-id <id>", name: "parentGroupId", description: "parent group id" }, { flags: "--auto-send-invite-v4 <true|false>", name: "autoSendInviteV4", description: "send invite automatically", parser: parseBoolean }, { flags: "--comment <text>", name: "comment", description: "invite comment" }, { flags: "--member-add-mode <true|false>", name: "memberAddMode", description: "member add mode", parser: parseBoolean }, { flags: "--membership-approval-mode <true|false>", name: "membershipApprovalMode", description: "membership approval mode", parser: parseBoolean }, { flags: "--restrict <true|false>", name: "isRestrict", description: "restrict group info changes", parser: parseBoolean }, { flags: "--announce <true|false>", name: "isAnnounce", description: "admins only messages", parser: parseBoolean }], run: (cli, input) => cli.createGroup(input as never) });
  addObjectCommand({ parent: group, client, name: "get-invite", description: "Get a group's invite code", positionals: [accountIdPositional(), groupIdPositional()], run: (cli, input) => cli.getGroupInvite(input as never) });
  addObjectCommand({ parent: group, client, name: "revoke-invite", description: "Revoke a group's invite code", positionals: [accountIdPositional(), groupIdPositional()], run: (cli, input) => cli.revokeGroupInvite(input as never) });
  addObjectCommand({ parent: group, client, name: "info", description: "Get group info", positionals: [accountIdPositional(), groupIdPositional()], run: (cli, input) => cli.getGroupInfo(input as never) });
  addObjectCommand({ parent: group, client, name: "leave", description: "Leave a group", positionals: [accountIdPositional(), groupIdPositional()], run: (cli, input) => cli.leaveGroup(input as never) });
  addObjectCommand({ parent: group, client, name: "membership-requests", description: "List pending membership requests", positionals: [accountIdPositional(), groupIdPositional()], run: (cli, input) => cli.groupMembershipRequests(input as never) });
  addObjectCommand({ parent: group, client, name: "approve-requests", description: "Approve pending membership requests", positionals: [accountIdPositional(), groupIdPositional()], options: [{ flags: "--requester-ids <ids>", name: "requesterIds", description: "comma-separated requester ids", parser: parseCsv }, { flags: "--sleep <n>", name: "sleep", description: "sleep milliseconds", parser: parseInteger }, { flags: "--sleep-range <min,max>", name: "sleep", description: "sleep range pair", parser: parseNumberPair }], run: (cli, input) => cli.approveGroupMembershipRequests(input as never) });
  addObjectCommand({ parent: group, client, name: "reject-requests", description: "Reject pending membership requests", positionals: [accountIdPositional(), groupIdPositional()], options: [{ flags: "--requester-ids <ids>", name: "requesterIds", description: "comma-separated requester ids", parser: parseCsv }, { flags: "--sleep <n>", name: "sleep", description: "sleep milliseconds", parser: parseInteger }, { flags: "--sleep-range <min,max>", name: "sleep", description: "sleep range pair", parser: parseNumberPair }], run: (cli, input) => cli.rejectGroupMembershipRequests(input as never) });
  addObjectCommand({ parent: group, client, name: "update", description: "Update group metadata and settings", positionals: [accountIdPositional(), groupIdPositional()], options: [{ flags: "--subject <text>", name: "subject", description: "group subject" }, { flags: "--description <text>", name: "description", description: "group description" }, { flags: "--messages-admins-only <true|false>", name: "messagesAdminsOnly", description: "admins only messages", parser: parseBoolean }, { flags: "--info-admins-only <true|false>", name: "infoAdminsOnly", description: "admins only info edits", parser: parseBoolean }, { flags: "--add-members-admins-only <true|false>", name: "addMembersAdminsOnly", description: "admins only member add", parser: parseBoolean }], run: (cli, input) => cli.updateGroup(input as never) });

  for (const [name, description, runner] of [
    ["add", "Add participants to a group", (input: unknown) => client.addGroupParticipants(input as never)],
    ["kick", "Remove participants from a group", (input: unknown) => client.kickGroupParticipants(input as never)],
    ["promote", "Promote participants to admin", (input: unknown) => client.promoteGroupParticipants(input as never)],
    ["demote", "Demote participants from admin", (input: unknown) => client.demoteGroupParticipants(input as never)]
  ] as const) {
    addObjectCommand({ parent: group, client, name, description, positionals: [accountIdPositional(), groupIdPositional(), stringListPositional("participantIds", "participant ids")], options: [{ flags: "--comment <text>", name: "comment", description: "optional action comment" }], run: async (_cli, input) => runner(input) });
  }
}

function registerContactCommands(program: Command, client: ApiClient): void {
  const contact = createGroupCommand(program, "contact", "Inspect contacts and address book features", ["wato contact list default", "wato contact info default 12345@c.us", "wato contact save-address-book default 628123456789 Farel RA"]);

  addObjectCommand({ parent: contact, client, name: "list", description: "List contacts for an account", positionals: [accountIdPositional()], run: async (cli, input) => cli.contacts(requireString(input.accountId, "accountId")) });
  addObjectCommand({ parent: contact, client, name: "blocked", description: "List blocked contacts for an account", positionals: [accountIdPositional()], run: async (cli, input) => cli.blockedContacts(requireString(input.accountId, "accountId")) });

  addObjectCommand({ parent: contact, client, name: "block", description: "Block a contact", positionals: [accountIdPositional(), contactIdPositional()], run: (cli, input) => cli.blockContact(input as never) });
  addObjectCommand({ parent: contact, client, name: "unblock", description: "Unblock a contact", positionals: [accountIdPositional(), contactIdPositional()], run: (cli, input) => cli.unblockContact(input as never) });
  addObjectCommand({ parent: contact, client, name: "info", description: "Get contact info", positionals: [accountIdPositional(), contactIdPositional()], run: (cli, input) => cli.contactInfo(input as never) });
  addObjectCommand({ parent: contact, client, name: "common-groups", description: "List common groups with a contact", positionals: [accountIdPositional(), contactIdPositional()], run: (cli, input) => cli.commonGroups(input as never) });
  addObjectCommand({ parent: contact, client, name: "formatted-number", description: "Format a number or contact id", positionals: [accountIdPositional(), { token: "contactId", name: "contactId", description: "contact id or number", required: false }], run: (cli, input) => cli.formattedNumber(input as never) });
  addObjectCommand({ parent: contact, client, name: "country-code", description: "Resolve country code for a number", positionals: [accountIdPositional(), { token: "contactId", name: "contactId", description: "contact id or number", required: false }], run: (cli, input) => cli.countryCode(input as never) });
  addObjectCommand({ parent: contact, client, name: "is-registered", description: "Check if a number is a registered user", positionals: [accountIdPositional(), contactIdPositional()], run: (cli, input) => cli.isRegistered(input as never) });
  addObjectCommand({ parent: contact, client, name: "number-id", description: "Resolve a WhatsApp number id", positionals: [accountIdPositional(), { token: "number", name: "number", description: "number", required: false }], run: (cli, input) => cli.numberId(input as { accountId: string; number: string }) });
  addObjectCommand({ parent: contact, client, name: "device-count", description: "Get the number of devices for a contact", positionals: [accountIdPositional(), contactIdPositional()], run: (cli, input) => cli.contactDeviceCount(input as never) });
  addObjectCommand({ parent: contact, client, name: "profile-picture", description: "Get a contact profile picture URL", positionals: [accountIdPositional(), contactIdPositional()], run: (cli, input) => cli.profilePicture(input as never) });
  addObjectCommand({ parent: contact, client, name: "save-address-book", description: "Save or edit an address book contact", positionals: [accountIdPositional(), { token: "phoneNumber", name: "phoneNumber", description: "phone number", required: false }, { token: "firstName", name: "firstName", description: "first name", required: false }, { token: "lastName", name: "lastName", description: "last name", required: false }], options: [{ flags: "--sync-to-addressbook <true|false>", name: "syncToAddressbook", description: "sync to phone address book", parser: parseBoolean }], run: (cli, input) => cli.saveAddressBookContact(input as never) });
  addObjectCommand({ parent: contact, client, name: "delete-address-book", description: "Delete an address book contact", positionals: [accountIdPositional(), { token: "phoneNumber", name: "phoneNumber", description: "phone number", required: false }], run: (cli, input) => cli.deleteAddressBookContact(input as never) });
  addObjectCommand({ parent: contact, client, name: "lid-phone", description: "Resolve LID and phone values for users", positionals: [accountIdPositional(), stringListPositional("userIds", "user ids")], options: [], run: (cli, input) => cli.contactLidPhone(input as never) });
  addObjectCommand({ parent: contact, client, name: "add-note", description: "Add or edit a customer note", positionals: [accountIdPositional(), { token: "userId", name: "userId", description: "user id", required: false }, joinTextPositional("note", "note text")], run: (cli, input) => cli.addCustomerNote(input as never) });
  addObjectCommand({ parent: contact, client, name: "get-note", description: "Get a customer note", positionals: [accountIdPositional(), { token: "userId", name: "userId", description: "user id", required: false }], run: (cli, input) => cli.customerNote(input as never) });
}

function registerEventCommands(program: Command, client: ApiClient): void {
  const event = createGroupCommand(program, "event", "Manage scheduled event messages", ["wato event create-scheduled default 12345@c.us \"Weekly Sync\" 2026-03-25T10:00:00.000Z", "wato event respond-scheduled default 1 msg-123"]);

  addObjectCommand({ parent: event, client, name: "create-scheduled", description: "Create a scheduled event message", positionals: [accountIdPositional(), chatIdPositional(), { token: "name", name: "name", description: "event name", required: false }, { token: "startTime", name: "startTime", description: "ISO start time", required: false }], options: [{ flags: "--description <text>", name: "description", description: "description" }, { flags: "--end-time <iso>", name: "endTime", description: "end time" }, { flags: "--location <text>", name: "location", description: "location" }, { flags: "--call-type <type>", name: "callType", description: "voice or video" }, { flags: "--event-canceled <true|false>", name: "isEventCanceled", description: "mark event canceled", parser: parseBoolean }, { flags: "--quoted-message-id <id>", name: "quotedMessageId", description: "quoted message id" }], run: (cli, input) => cli.createScheduledEvent(input as never) });
  addObjectCommand({ parent: event, client, name: "respond-scheduled", description: "Respond to a scheduled event invitation", positionals: [accountIdPositional(), integerPositional("response", "numeric response code"), { token: "eventMessageId", name: "eventMessageId", description: "scheduled event message id", required: false }], run: (cli, input) => cli.respondScheduledEvent(input as never) });
}

function registerChannelCommands(program: Command, client: ApiClient): void {
  const channel = createGroupCommand(program, "channel", "Manage channels and channel admin operations", ["wato channel list default", "wato channel create default \"Wato Updates\" --description \"Ops announcements\"", "wato channel send default 120363000000000000@newsletter --text \"hello from wato\""]);

  addObjectCommand({ parent: channel, client, name: "list", description: "List channels for an account", positionals: [accountIdPositional()], run: async (cli, input) => cli.listChannels(requireString(input.accountId, "accountId")) });
  addObjectCommand({ parent: channel, client, name: "search", description: "Search channels", positionals: [accountIdPositional()], options: [{ flags: "--search-text <text>", name: "searchText", description: "search text" }, { flags: "--country-codes <codes>", name: "countryCodes", description: "comma-separated country codes", parser: parseCsv }, { flags: "--skip-subscribed <true|false>", name: "skipSubscribedNewsletters", description: "skip subscribed channels", parser: parseBoolean }, { flags: "--view <n>", name: "view", description: "view code", parser: parseInteger }, { flags: "--limit <n>", name: "limit", description: "result limit", parser: parseInteger }], run: (cli, input) => cli.searchChannels(input as never) });
  addObjectCommand({ parent: channel, client, name: "create", description: "Create a channel", positionals: [accountIdPositional(), { token: "title", name: "title", description: "channel title", required: false }], options: [{ flags: "--description <text>", name: "description", description: "channel description" }], run: (cli, input) => cli.createChannel(input as never) });
  addObjectCommand({ parent: channel, client, name: "by-invite", description: "Get a channel by invite code", positionals: [accountIdPositional(), { token: "inviteCode", name: "inviteCode", description: "invite code", required: false }], run: (cli, input) => cli.getChannelByInvite(input as never) });
  addObjectCommand({ parent: channel, client, name: "update", description: "Update channel metadata", positionals: [accountIdPositional(), channelIdPositional()], options: [{ flags: "--subject <text>", name: "subject", description: "channel subject" }, { flags: "--description <text>", name: "description", description: "channel description" }, { flags: "--reaction-setting <n>", name: "reactionSetting", description: "reaction setting code", parser: parseInteger }, { flags: "--profile-picture <path>", name: "profilePicture", description: "profile picture path", parser: (value) => ({ filePath: value }) }], run: (cli, input) => cli.updateChannel(input as never) });
  addObjectCommand({ parent: channel, client, name: "subscribers", description: "List channel subscribers", positionals: [accountIdPositional(), channelIdPositional()], options: [{ flags: "--limit <n>", name: "limit", description: "result limit", parser: parseInteger }], run: (cli, input) => cli.channelSubscribers(input as never) });
  addObjectCommand({ parent: channel, client, name: "messages", description: "List channel messages", positionals: [accountIdPositional(), channelIdPositional()], options: [{ flags: "--limit <n>", name: "limit", description: "message limit", parser: parseInteger }, { flags: "--from-me <true|false>", name: "fromMe", description: "only own messages", parser: parseBoolean }], run: (cli, input) => cli.channelMessages(input as never) });
  addObjectCommand({ parent: channel, client, name: "subscribe", description: "Subscribe to a channel", positionals: [accountIdPositional(), channelIdPositional()], run: (cli, input) => cli.subscribeChannel(input as never) });
  addObjectCommand({ parent: channel, client, name: "unsubscribe", description: "Unsubscribe from a channel", positionals: [accountIdPositional(), channelIdPositional()], run: (cli, input) => cli.unsubscribeChannel(input as never) });
  addObjectCommand({ parent: channel, client, name: "mute", description: "Mute a channel", positionals: [accountIdPositional(), channelIdPositional()], run: (cli, input) => cli.muteChannel(input as never) });
  addObjectCommand({ parent: channel, client, name: "unmute", description: "Unmute a channel", positionals: [accountIdPositional(), channelIdPositional()], run: (cli, input) => cli.unmuteChannel(input as never) });
  addObjectCommand({ parent: channel, client, name: "seen", description: "Mark a channel as seen", positionals: [accountIdPositional(), channelIdPositional()], run: (cli, input) => cli.seenChannel(input as never) });
  addObjectCommand({ parent: channel, client, name: "send", description: "Send a channel message", positionals: [accountIdPositional(), channelIdPositional()], options: [{ flags: "--text <text>", name: "text", description: "message text" }, { flags: "--file <path>", name: "media", description: "media file path", parser: (value) => ({ filePath: value }) }, { flags: "--caption <text>", name: "caption", description: "caption" }, { flags: "--mentions <ids>", name: "mentions", description: "comma-separated mentions", parser: parseCsv }], run: async (cli, input) => {
    if (!input.text && !input.media) {
      throw new Error("Provide either channel text or --file media");
    }
    return cli.sendChannelMessage(input as never);
  } });
  addObjectCommand({ parent: channel, client, name: "invite-admin", description: "Invite a user as channel admin", positionals: [accountIdPositional(), channelIdPositional(), { token: "userId", name: "userId", description: "user id", required: false }], options: [{ flags: "--comment <text>", name: "comment", description: "optional comment" }], run: (cli, input) => cli.inviteChannelAdmin(input as never) });
  addObjectCommand({ parent: channel, client, name: "accept-admin", description: "Accept a channel admin invite", positionals: [accountIdPositional(), channelIdPositional()], run: (cli, input) => cli.acceptChannelAdminInvite(input as never) });
  addObjectCommand({ parent: channel, client, name: "revoke-admin", description: "Revoke a channel admin invite", positionals: [accountIdPositional(), channelIdPositional(), { token: "userId", name: "userId", description: "user id", required: false }], options: [{ flags: "--comment <text>", name: "comment", description: "optional comment" }], run: (cli, input) => cli.revokeChannelAdminInvite(input as never) });
  addObjectCommand({ parent: channel, client, name: "demote-admin", description: "Demote a channel admin", positionals: [accountIdPositional(), channelIdPositional(), { token: "userId", name: "userId", description: "user id", required: false }], run: (cli, input) => cli.demoteChannelAdmin(input as never) });
  addObjectCommand({ parent: channel, client, name: "transfer-ownership", description: "Transfer channel ownership", positionals: [accountIdPositional(), channelIdPositional(), { token: "newOwnerId", name: "newOwnerId", description: "new owner id", required: false }], options: [{ flags: "--dismiss-self-as-admin <true|false>", name: "shouldDismissSelfAsAdmin", description: "dismiss self as admin", parser: parseBoolean }], run: (cli, input) => cli.transferChannelOwnership(input as never) });
  addObjectCommand({ parent: channel, client, name: "delete", description: "Delete a channel", positionals: [accountIdPositional(), channelIdPositional()], run: (cli, input) => cli.deleteChannel(input as never) });
}

function addSimpleCommand(parent: Command, name: string, description: string, run: () => Promise<unknown>, examples?: string[]): void {
  const command = parent.command(name).description(description);
  const resolvedExamples = examples?.length ? examples : [buildCommandPath(parent, name)];
  addCommandExamples(command, resolvedExamples);
  command.action(async () => printResult(await run()));
}

function addObjectCommand<TInput extends Record<string, unknown>>(config: ObjectCommandConfig<TInput>): void {
  const command = config.parent.command(config.name).description(config.description);

  for (const positional of config.positionals ?? []) {
    const token = positional.required === false
      ? positional.variadic ? `[${positional.token}...]` : `[${positional.token}]`
      : positional.variadic ? `<${positional.token}...>` : `<${positional.token}>`;
    command.argument(token, positional.description);
  }

  command.option("--json <json>", "JSON payload alternative");

  for (const option of config.options ?? []) {
    if (option.parser) {
      command.option(option.flags, option.description, option.parser as (value: string, previous: unknown) => unknown);
    } else {
      command.option(option.flags, option.description);
    }
  }

  const examples = config.examples?.length ? config.examples : buildDefaultExamples(config);
  addCommandExamples(command, examples);

  command.action(async (...actionArgs: unknown[]) => {
    const commandInstance = actionArgs[actionArgs.length - 1] as Command;
    const optionsArg = actionArgs[actionArgs.length - 2] as Record<string, unknown> | undefined;
    const args = actionArgs.slice(0, -2);
    const options = optionsArg ?? commandInstance.opts<Record<string, unknown>>();
    const jsonInput = parseOptionalJson(asOptionalString(options.json));
    const positionalInput = buildPositionalObject(args, config.positionals ?? []);
    const optionInput = buildOptionsObject(options, config.options ?? []);

    const input = mergeInputs(
      jsonInput,
      positionalInput,
      optionInput,
      config.defaultInput && noMeaningfulInput(jsonInput, positionalInput, optionInput) ? config.defaultInput() : {}
    ) as TInput;

    printResult(await config.run(config.client, input));
  });
}

function buildDefaultExamples<TInput extends Record<string, unknown>>(config: ObjectCommandConfig<TInput>): string[] {
  const commandPath = buildCommandPath(config.parent, config.name);
  const standardExample = buildStandardExample(commandPath, config.positionals ?? [], config.options ?? []);
  const jsonExample = buildJsonExample(commandPath, config);
  return jsonExample ? [standardExample, jsonExample] : [standardExample];
}

function createGroupCommand(parent: Command, name: string, description: string, examples: string[]): Command {
  const command = parent.command(name).description(description);
  addCommandExamples(command, examples);
  return command;
}

function addCommandExamples(command: Command, examples: string[]): void {
  command.addHelpText("after", `\nExamples:\n${examples.map((example) => `  ${example}`).join("\n")}\n`);
}

function buildStandardExample(commandPath: string, positionals: PositionalSpec[], options: OptionSpec[]): string {
  const positionalValues = positionals.flatMap((spec) => samplePositionalTokens(spec));
  const optionValues = options.length > 0 ? sampleOptionTokens(options[0]) : [];
  return [commandPath, ...positionalValues, ...optionValues].join(" ");
}

function buildJsonExample<TInput extends Record<string, unknown>>(commandPath: string, config: ObjectCommandConfig<TInput>): string | undefined {
  const sample = config.defaultInput ? config.defaultInput() : buildSampleJsonInput(config.positionals ?? [], config.options ?? []);
  if (!sample || Object.keys(sample).length === 0) {
    return undefined;
  }
  return `${commandPath} --json '${JSON.stringify(sample)}'`;
}

function buildSampleJsonInput(positionals: PositionalSpec[], options: OptionSpec[]): Record<string, unknown> {
  const sample: Record<string, unknown> = {};

  for (const positional of positionals) {
    sample[positional.name] = sampleJsonValue(positional);
  }

  if (options.length > 0) {
    const firstOption = options[0];
    sample[firstOption.name] = sampleOptionJsonValue(firstOption);
  }

  return sample;
}

function buildCommandPath(parent: Command, name: string): string {
  const names: string[] = [name];
  let current: Command | null = parent;

  while (current) {
    const currentName = current.name();
    if (currentName) {
      names.unshift(currentName);
    }
    current = current.parent ?? null;
  }

  return names.join(" ");
}

function samplePositionalTokens(spec: PositionalSpec): string[] {
  const value = sampleJsonValue(spec);
  if (Array.isArray(value)) {
    return value.map((item) => formatShellValue(item));
  }
  return [formatShellValue(value)];
}

function sampleOptionTokens(spec: OptionSpec): string[] {
  const placeholderMatch = spec.flags.match(/--[^\s]+(?:,\s*)?(?:<([^>]+)>)?/);
  const flagName = placeholderMatch?.[0]?.split(/[ ,]/)[0] ?? spec.flags.split(/[ ,]/)[0];
  const sampleValue = sampleOptionJsonValue(spec);
  return sampleValue === undefined ? [flagName] : [flagName, formatShellValue(sampleValue)];
}

function sampleJsonValue(spec: PositionalSpec): unknown {
  switch (spec.name) {
    case "accountId":
      return "default";
    case "chatId":
      return "12345@c.us";
    case "messageId":
      return "msg-123";
    case "mode":
      return "qr";
    case "contactId":
      return "12345@c.us";
    case "groupId":
      return "120363000000000000@g.us";
    case "channelId":
      return "120363000000000000@newsletter";
    case "status":
      return "available via wato";
    case "displayName":
      return "Wato Ops";
    case "phoneNumber":
      return "628123456789";
    case "startTime":
    case "endTime":
      return "2026-03-25T10:00:00.000Z";
    case "callType":
      return "video";
    case "eventType":
      return "message.received";
    case "id":
      return "example-id";
    case "url":
      return "https://example.com/webhook";
    case "webhookId":
      return "orders-webhook";
    case "deliveryId":
      return "delivery-123";
    case "text":
      return "hello from wato";
    case "media":
      return { filePath: "/tmp/demo.png" };
    case "contactIds":
      return ["12345@c.us", "67890@c.us"];
    case "latitude":
      return -6.2;
    case "longitude":
      return 106.8;
    case "duration":
      return 86400;
    case "reaction":
      return "👍";
    case "labelId":
      return "label-1";
    case "chatIds":
      return ["12345@c.us", "67890@c.us"];
    case "broadcastId":
      return "broadcast-1";
    case "question":
      return "Which option do you prefer?";
    case "options":
      return ["option-a", "option-b"];
    case "selectedOptions":
      return ["option-a"];
    case "query":
      return "invoice";
    case "inviteCode":
      return "AbCdEfGhIj";
    case "inviteCodeExp":
      return 1742896800;
    case "fromId":
    case "toId":
    case "userId":
    case "newOwnerId":
      return "12345@c.us";
    case "title":
      return "Wato Group";
    case "participantIds":
    case "userIds":
      return ["12345@c.us", "67890@c.us"];
    case "number":
      return "628123456789";
    case "firstName":
      return "Farel";
    case "lastName":
      return "RA";
    case "note":
      return "priority customer";
    case "name":
      return "Weekly Sync";
    case "response":
      return 1;
    default:
      if (spec.variadic) {
        return [spec.token];
      }
      if (spec.transform === parseInteger || spec.transform === parseFloatValue) {
        return 1;
      }
      return spec.token;
  }
}

function sampleOptionJsonValue(spec: OptionSpec): unknown {
  switch (spec.name) {
    case "caption":
      return "demo";
    case "mentions":
    case "participants":
    case "requesterIds":
    case "countryCodes":
      return ["12345@c.us", "67890@c.us"];
    case "groupMentions":
      return [{ subject: "Ops", id: "120363000000000000@g.us" }];
    case "quotedMessageId":
      return "msg-123";
    case "asDocument":
    case "asSticker":
    case "asVoice":
    case "asGif":
    case "asHd":
    case "isViewOnce":
    case "allowMultipleAnswers":
    case "fromMe":
    case "audio":
    case "documents":
    case "photos":
    case "videos":
    case "backgroundSync":
    case "showNotification":
    case "enabled":
    case "autoSendInviteV4":
    case "memberAddMode":
    case "membershipApprovalMode":
    case "isRestrict":
    case "isAnnounce":
    case "messagesAdminsOnly":
    case "infoAdminsOnly":
    case "addMembersAdminsOnly":
    case "syncToAddressbook":
    case "isEventCanceled":
    case "skipSubscribedNewsletters":
    case "shouldDismissSelfAsAdmin":
      return true;
    case "workflowId":
      return "sample-workflow";
    case "accountId":
      return "default";
    case "payload":
      return { body: "hello from wato" };
    case "workflow":
      return sampleWorkflowDefinition();
    case "secret":
      return "super-secret";
    case "eventTypes":
    case "accountIds":
    case "labelIds":
    case "stickerCategories":
      return ["message.received", "message.created"];
    case "headers":
      return { "x-wato-source": "cli" };
    case "limit":
    case "page":
    case "intervalMs":
    case "messageTimer":
    case "sleep":
    case "view":
    case "reactionSetting":
      return 10;
    case "name":
      return "Office";
    case "address":
      return "Jakarta";
    case "description":
      return "managed by wato";
    case "url":
      return "https://example.com";
    case "chatId":
      return "12345@c.us";
    case "until":
      return "2026-03-25T10:00:00.000Z";
    case "groupName":
    case "subject":
    case "searchText":
    case "text":
    case "comment":
    case "location":
      return "wato-demo";
    case "payloadJson":
      return { body: "hello from wato" };
    case "callType":
      return "video";
    case "media":
    case "profilePicture":
      return { filePath: "/tmp/demo.png" };
    default:
      return spec.parser === parseBoolean ? true : "example";
  }
}

function formatShellValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => formatShellValue(item)).join(" ");
  }

  if (typeof value === "object" && value !== null) {
    if ("filePath" in value && typeof (value as { filePath?: unknown }).filePath === "string") {
      return String((value as { filePath: string }).filePath);
    }
    return `'${JSON.stringify(value)}'`;
  }

  if (typeof value === "string") {
    return /[\s"']/.test(value) ? JSON.stringify(value) : value;
  }

  return String(value);
}

function buildPositionalObject(values: unknown[], specs: PositionalSpec[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  specs.forEach((spec, index) => {
    const rawValue = spec.variadic ? values.slice(index) : values[index];
    if (rawValue === undefined || (Array.isArray(rawValue) && rawValue.length === 0)) {
      return;
    }
    result[spec.name] = spec.transform ? spec.transform(rawValue) : rawValue;
  });
  return result;
}

function buildOptionsObject(options: Record<string, unknown>, specs: OptionSpec[]): Record<string, unknown> {
  return Object.fromEntries(specs.map((spec) => [spec.name, options[spec.name]] as const).filter(([, value]) => value !== undefined));
}

function accountIdPositional(required = false): PositionalSpec {
  return { token: "accountId", name: "accountId", description: "account id", required };
}

function chatIdPositional(required = false): PositionalSpec {
  return { token: "chatId", name: "chatId", description: "chat id", required };
}

function messageIdPositional(required = false): PositionalSpec {
  return { token: "messageId", name: "messageId", description: "message id", required };
}

function contactIdPositional(required = false): PositionalSpec {
  return { token: "contactId", name: "contactId", description: "contact id", required };
}

function groupIdPositional(required = false): PositionalSpec {
  return { token: "groupId", name: "groupId", description: "group id", required };
}

function channelIdPositional(required = false): PositionalSpec {
  return { token: "channelId", name: "channelId", description: "channel id", required };
}

function joinTextPositional(name: string, description: string): PositionalSpec {
  return { token: name, name, description, variadic: true, required: false, transform: (value) => (value as string[]).join(" ") };
}

function stringListPositional(name: string, description: string): PositionalSpec {
  return { token: name, name, description, variadic: true, required: false, transform: (value) => value as string[] };
}

function integerPositional(name: string, description: string): PositionalSpec {
  return { token: name, name, description, required: false, transform: (value) => parseInteger(String(value)) };
}

function numberPositional(name: string, description: string): PositionalSpec {
  return { token: name, name, description, required: false, transform: (value) => parseFloatValue(String(value)) };
}

function mediaFilePositional(): PositionalSpec {
  return { token: "file", name: "media", description: "path to file", required: false, transform: (value) => ({ filePath: String(value) }) };
}

function printResult(value: unknown): void {
  if (typeof value === "string") {
    console.log(value);
    return;
  }
  console.log(JSON.stringify(value ?? { ok: true }, null, 2));
}

function parseOptionalJson(value?: string): Record<string, unknown> {
  if (!value) {
    return {};
  }
  const parsed = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("JSON payload must be an object");
  }
  return parsed as Record<string, unknown>;
}

function parseJsonValue(value: string): unknown {
  return JSON.parse(value);
}

function parseCsv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  throw new Error(`Invalid boolean value: ${value}`);
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer value: ${value}`);
  }
  return parsed;
}

function parseFloatValue(value: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }
  return parsed;
}

function parseNumberPair(value: string): [number, number] {
  const parts = parseCsv(value).map((item) => parseInteger(item));
  if (parts.length !== 2) {
    throw new Error(`Expected two comma-separated numbers: ${value}`);
  }
  return [parts[0], parts[1]];
}

function mergeInputs(...values: Array<Record<string, unknown>>): Record<string, unknown> {
  return Object.assign({}, ...values);
}

function noMeaningfulInput(...values: Array<Record<string, unknown>>): boolean {
  return values.every((value) => Object.keys(value).length === 0);
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function requireString(value: unknown, field: string): string {
  const resolved = asOptionalString(value);
  if (!resolved) {
    throw new Error(`Missing required field: ${field}`);
  }
  return resolved;
}

function sampleWorkflowDefinition(): Record<string, unknown> {
  return {
    id: "sample-workflow",
    name: "Sample Workflow",
    version: 1,
    enabled: true,
    accountScope: { mode: "all" },
    trigger: { type: "message.received", config: { pattern: "order (?<orderId>[A-Z0-9-]+)" } },
    conditions: [{ type: "message.textContains", config: { contains: "${trigger.data.groups.orderId}" } }],
    actions: [{ id: "reply", type: "message.sendText", config: { chatId: "${input.chatId}", text: "ack ${trigger.data.groups.orderId}" } }]
  };
}

function sampleWorkflowTestInput(): Record<string, unknown> {
  return {
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
      accountScope: { mode: "all" },
      trigger: { type: "message.received", config: { pattern: "order (?<orderId>[A-Z0-9-]+)" } },
      conditions: [],
      actions: [
        { id: "context", type: "data.set", config: { value: { orderId: "${trigger.data.groups.orderId}" } } },
        { id: "reply", type: "message.sendText", config: { chatId: "${input.chatId}", text: "received ${actionsById.context.output.orderId}" } }
      ]
    }
  };
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
