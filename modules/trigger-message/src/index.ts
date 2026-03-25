import type { MessageEnvelope, WatoModule } from "@wato/sdk";
import type { WorkflowEngine } from "@wato/workflow-engine";

export const messageTriggerModule: WatoModule = {
  manifest: {
    name: "trigger-message",
    version: "0.1.0",
    kind: "workflow-trigger",
    dependsOn: ["workflow-core"],
    accountScopeSupport: "cross-account"
  },
  register(context) {
    const engine = context.capabilities.resolve<WorkflowEngine>("workflow-engine");
    context.capabilities.resolve<{ registerTriggerType?: (type: string) => void }>("workflow-registry").registerTriggerType?.("message.received");
    engine.registerTrigger({
      type: "message.received",
      match: (input, config) => {
        const payload = input as MessageEnvelope;
        const body = String(payload.body ?? "");
        if (typeof config.contains === "string" && !String(payload.body ?? "").includes(config.contains)) {
          return false;
        }

        if (typeof config.from === "string" && payload.from !== config.from) {
          return false;
        }

        if (typeof config.chatId === "string" && payload.chatId !== config.chatId) {
          return false;
        }

        if (typeof config.hasMedia === "boolean" && Boolean(payload.hasMedia) !== config.hasMedia) {
          return false;
        }

        if (typeof config.type === "string" && payload.type !== config.type) {
          return false;
        }

        const commandPrefix = typeof config.commandPrefix === "string" ? config.commandPrefix : undefined;
        const command = parseCommand(body, commandPrefix);
        if (typeof config.commandName === "string" && command?.name !== config.commandName) {
          return false;
        }

        if (typeof config.commandPrefix === "string" && !command) {
          return false;
        }

        const pattern = typeof config.pattern === "string" ? config.pattern : undefined;
        let match: RegExpExecArray | null = null;
        if (!pattern) {
          return {
            matched: true,
            data: buildTriggerData(payload, command, undefined)
          };
        }

        match = new RegExp(pattern, typeof config.flags === "string" ? config.flags : undefined).exec(body);
        if (!match) {
          return false;
        }

        return {
          matched: true,
          data: buildTriggerData(payload, command, match)
        };
      }
    });

    return {};
  }
};

function buildTriggerData(payload: MessageEnvelope, command: ReturnType<typeof parseCommand>, match: RegExpExecArray | undefined) {
  const body = String(payload.body ?? "");
  const lines = body.length > 0 ? body.split(/\r?\n/) : [];
  const words = body.trim().length > 0 ? body.trim().split(/\s+/) : [];

  return {
    message: {
      accountId: payload.accountId,
      chatId: payload.chatId,
      messageId: payload.messageId,
      from: payload.from,
      body,
      type: payload.type,
      timestamp: payload.timestamp,
      fromMe: payload.fromMe,
      hasMedia: payload.hasMedia,
      ack: payload.ack,
      isForwarded: payload.isForwarded,
      isStatus: payload.isStatus
    },
    body,
    lines,
    words,
    command,
    sender: {
      id: payload.from,
      accountId: payload.accountId
    },
    chat: {
      id: payload.chatId
    },
    media: payload.hasMedia
      ? {
          mimeType: payload.mediaMimeType,
          filename: payload.mediaFilename,
          path: payload.mediaPath,
          size: payload.mediaSize,
          duration: payload.duration
        }
      : undefined,
    location: payload.location,
    contacts: payload.vCards,
    mentions: {
      ids: payload.mentionedIds ?? [],
      groups: payload.groupMentions ?? []
    },
    quoted: payload.quotedMessageId
      ? {
          messageId: payload.quotedMessageId
        }
      : undefined,
    match: match?.[0],
    captures: match ? match.slice(1) : [],
    groups: match?.groups ?? {}
  };
}

function parseCommand(body: string, prefix?: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    return undefined;
  }

  const activePrefix = prefix ?? (["/", "!", "."].find((candidate) => trimmed.startsWith(candidate)));
  if (!activePrefix || !trimmed.startsWith(activePrefix)) {
    return undefined;
  }

  const [head, ...args] = trimmed.slice(activePrefix.length).trim().split(/\s+/).filter(Boolean);
  if (!head) {
    return undefined;
  }

  return {
    prefix: activePrefix,
    name: head,
    args,
    raw: trimmed
  };
}
