# Workflow Patterns

This page collects practical workflow examples you can reuse directly.

## Pattern 1: Simple auto-reply

```json
{
  "id": "hello-auto-reply",
  "name": "Hello Auto Reply",
  "version": 1,
  "enabled": true,
  "accountScope": { "mode": "all" },
  "trigger": {
    "type": "message.received",
    "config": { "contains": "hello" }
  },
  "conditions": [],
  "actions": [
    {
      "type": "message.sendText",
      "config": {
        "chatId": "${input.chatId}",
        "text": "hello back"
      }
    }
  ]
}
```

Best for:

- smoke testing accounts
- proving the event and workflow path works

## Pattern 2: Command router with regex capture

```json
{
  "id": "order-command-router",
  "name": "Order Command Router",
  "version": 1,
  "enabled": true,
  "accountScope": { "mode": "all" },
  "trigger": {
    "type": "message.received",
    "config": {
      "commandPrefix": "/",
      "commandName": "order",
      "pattern": "(?<orderId>A-[0-9]+)"
    }
  },
  "conditions": [],
  "actions": [
    {
      "id": "context",
      "type": "data.set",
      "config": {
        "value": {
          "orderId": "${trigger.data.groups.orderId}",
          "sender": "${from}",
          "args": "${trigger.data.command.args}"
        }
      }
    },
    {
      "type": "message.sendText",
      "config": {
        "chatId": "${input.chatId}",
        "text": "received order ${actionsById.context.output.orderId} from ${actionsById.context.output.sender}"
      }
    }
  ]
}
```

Best for:

- chatops-style commands
- structured parsing from freeform messages

## Pattern 3: Guard before replying

```json
{
  "id": "guarded-reply",
  "name": "Guarded Reply",
  "version": 1,
  "enabled": true,
  "accountScope": { "mode": "all" },
  "trigger": {
    "type": "message.received",
    "config": {
      "pattern": "(?<ticketId>T-[0-9]+)"
    }
  },
  "conditions": [
    {
      "type": "message.textContains",
      "config": {
        "contains": "${trigger.data.groups.ticketId}"
      }
    }
  ],
  "actions": [
    {
      "type": "data.assert",
      "config": {
        "exists": "${trigger.data.groups.ticketId}",
        "message": "ticket id is required"
      }
    },
    {
      "type": "message.sendText",
      "config": {
        "chatId": "${input.chatId}",
        "text": "ticket ${trigger.data.groups.ticketId} received"
      }
    }
  ]
}
```

Best for:

- workflows that should fail loudly on missing context
- early defensive checks

## Pattern 4: Coalesce fallback values

```json
{
  "id": "fallback-display-name",
  "name": "Fallback Display Name",
  "version": 1,
  "enabled": true,
  "accountScope": { "mode": "all" },
  "trigger": {
    "type": "message.received",
    "config": {}
  },
  "conditions": [],
  "actions": [
    {
      "id": "name",
      "type": "data.coalesce",
      "config": {
        "values": [
          "${trigger.data.groups.name}",
          "${input.from}",
          "unknown-sender"
        ]
      }
    },
    {
      "type": "message.sendText",
      "config": {
        "chatId": "${input.chatId}",
        "text": "hello ${actionsById.name.output}"
      }
    }
  ]
}
```

Best for:

- workflows with optional extracted fields
- human-friendly fallback behavior

## Pattern 5: Branch by mention and archive

```json
{
  "id": "mentioned-route",
  "name": "Mentioned Route",
  "version": 1,
  "enabled": true,
  "accountScope": { "mode": "all" },
  "trigger": {
    "type": "message.received",
    "config": {}
  },
  "conditions": [
    {
      "type": "message.mentionsAny",
      "config": {
        "contactIds": ["support-agent@c.us"]
      }
    }
  ],
  "actions": [
    {
      "type": "message.sendText",
      "config": {
        "chatId": "${input.chatId}",
        "text": "support has been mentioned in this chat"
      }
    },
    {
      "type": "chat.archive",
      "config": {
        "chatId": "${input.chatId}"
      }
    }
  ]
}
```

## Pattern 6: Channel search and follow-up

```json
{
  "id": "channel-discovery",
  "name": "Channel Discovery",
  "version": 1,
  "enabled": true,
  "accountScope": { "mode": "all" },
  "trigger": {
    "type": "message.received",
    "config": {
      "commandPrefix": "/",
      "commandName": "channel"
    }
  },
  "conditions": [],
  "actions": [
    {
      "id": "search",
      "type": "channel.search",
      "config": {
        "searchText": "${trigger.data.command.args.0}",
        "accountId": "${accountId}"
      }
    },
    {
      "type": "message.sendText",
      "config": {
        "chatId": "${input.chatId}",
        "text": "channel lookup executed for ${trigger.data.command.args.0}"
      }
    }
  ]
}
```

## Pattern 7: Escalation note and block

```json
{
  "id": "abuse-escalation",
  "name": "Abuse Escalation",
  "version": 1,
  "enabled": true,
  "accountScope": { "mode": "all" },
  "trigger": {
    "type": "message.received",
    "config": {
      "pattern": "(?i)(spam|abuse|fraud)"
    }
  },
  "conditions": [],
  "actions": [
    {
      "type": "contact.addNote",
      "config": {
        "userId": "${input.from}",
        "note": "flagged by workflow from message ${input.messageId}"
      }
    },
    {
      "type": "contact.block",
      "config": {
        "contactId": "${input.from}"
      }
    }
  ]
}
```

## Pattern 8: Dry-run before upsert

Always validate and test first.

```bash
bun run dev:cli -- workflow validate
bun run dev:cli -- workflow test
```

Then upsert your full workflow:

```bash
bun run dev:cli -- workflow upsert '<json>'
```

## Design tips

- use action `id` values for anything you want to reference later
- prefer `actionsById` over `actions.0`, `actions.1`, and so on
- use `data.assert` early when missing values should stop the run
- use `data.coalesce` when you want softer fallback behavior
- keep trigger extraction focused so conditions and actions stay simple
