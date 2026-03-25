# Workflows

## Overview

Workflows are declarative automations that react to events, evaluate conditions, and run actions.

Each workflow has:

- a trigger
- zero or more conditions
- one or more actions
- account scope
- optional policy metadata

## Workflow shape

```json
{
  "id": "order-router",
  "name": "Order Router",
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
  "conditions": [
    {
      "type": "message.textContains",
      "config": {
        "contains": "${trigger.data.groups.orderId}"
      }
    }
  ],
  "actions": [
    {
      "id": "context",
      "type": "data.set",
      "config": {
        "value": {
          "orderId": "${trigger.data.groups.orderId}",
          "sender": "${from}"
        }
      }
    },
    {
      "type": "message.sendText",
      "config": {
        "chatId": "${input.chatId}",
        "text": "processing ${actionsById.context.output.orderId}"
      }
    }
  ],
  "policy": {
    "errorMode": "stop"
  }
}
```

## Scope

`accountScope` values:

- `{ "mode": "all" }`
- `{ "mode": "single", "accountId": "default" }`
- `{ "mode": "set", "accountIds": ["a", "b"] }`

## Trigger providers

### `message.received`

The main message-driven trigger.

Supported trigger config fields:

- `contains`: require message body substring
- `from`: require exact sender id
- `chatId`: require exact chat id
- `hasMedia`: require message media presence
- `type`: require exact message type
- `pattern`: regex applied to message body
- `flags`: regex flags
- `commandPrefix`: require a command-style message with a prefix like `/`, `!`, or `.`
- `commandName`: require a parsed command name

## Trigger data

`message.received` exposes structured `trigger.data` including:

- `message.*`
- `body`
- `lines`
- `words`
- `command`
- `sender`
- `chat`
- `media`
- `location`
- `contacts`
- `mentions.ids`
- `mentions.groups`
- `quoted`
- `match`
- `captures`
- `groups`

Example:

```json
{
  "body": "/order A-42 now",
  "words": ["/order", "A-42", "now"],
  "command": {
    "prefix": "/",
    "name": "order",
    "args": ["A-42", "now"],
    "raw": "/order A-42 now"
  },
  "groups": {
    "orderId": "A-42"
  }
}
```

## Condition providers

Built-in conditions currently registered by `runtime-workflow`:

- `message.textContains`
- `message.from`
- `message.hasMedia`
- `message.type`
- `message.chatId`
- `message.isForwarded`
- `message.isStatus`
- `message.mentionsAny`
- `message.bodyMatches`

Conditions receive interpolated config before evaluation.

## Action providers

### Utility actions

- `data.set`
- `data.coalesce`
- `data.assert`

### Messaging actions

- `message.sendText`
- `message.sendMedia`
- `message.reply`
- `message.forward`
- `message.edit`
- `message.delete`
- `message.star`
- `message.unstar`
- `message.pin`
- `message.unpin`
- `message.react`
- `message.sendLocation`
- `message.sendContacts`

### Poll actions

- `poll.create`
- `poll.vote`

### Chat actions

- `chat.archive`
- `chat.unarchive`
- `chat.markUnread`
- `chat.sendSeen`
- `chat.pin`
- `chat.unpin`
- `chat.sendTyping`
- `chat.sendRecording`
- `chat.mute`
- `chat.unmute`

### Group actions

- `group.update`
- `group.addParticipants`
- `group.kickParticipants`
- `group.promoteParticipants`
- `group.demoteParticipants`
- `group.leave`

### Contact actions

- `contact.block`
- `contact.unblock`
- `contact.addNote`
- `contact.saveAddressBook`
- `contact.deleteAddressBook`

### Label and broadcast actions

- `label.updateChats`
- `broadcast.list`
- `broadcast.get`

### Channel actions

- `channel.sendMessage`
- `channel.subscribe`
- `channel.search`
- `channel.unsubscribe`

### Account and event actions

- `account.setStatus`
- `account.setDisplayName`
- `account.revokeStatus`
- `event.createScheduled`
- `event.respondScheduled`

## Interpolation

Action and condition configs support `${...}` interpolation.

Available top-level paths include:

- `workflow`
- `execution`
- `event`
- `trigger`
- `actions`
- `actionsById`
- `input`
- `body`
- `from`
- `chatId`
- `messageId`
- `accountId`
- `eventType`

Examples:

- `${input.chatId}`
- `${trigger.data.groups.orderId}`
- `${trigger.data.command.args.0}`
- `${actions.0.output}`
- `${actionsById.context.output.orderId}`
- `${event.accountId}`

Interpolation rules:

- if the whole string is one token, the original value type is preserved when possible
- if tokens are embedded in a larger string, values are stringified
- arrays and objects are resolved recursively

## Utility action semantics

### `data.set`

Returns `config.value`, `config.data`, or the config object itself as action output.

### `data.coalesce`

Returns the first meaningful value from `config.values`.

Meaningful means:

- not `undefined`
- not `null`
- not an empty string
- not an empty array

If no value is found, returns `config.fallback` or fails with an optional custom error.

### `data.assert`

Fails the workflow step when one of these checks does not pass:

- `exists`
- `value`
- `equals.left` vs `equals.right`
- `matches.value` against `matches.pattern`

## Named action outputs

Actions can define an optional `id`.

Use that id later through:

- `${actionsById.<id>.output}`
- `${actionsById.<id>.ok}`
- `${actionsById.<id>.error}`

This is preferred over raw index-based access when workflows get longer.

## Validation

Workflow validation checks:

- required workflow fields
- account scope shape
- at least one action
- unknown trigger, condition, and action types when provider lists are available
- duplicate action ids

## Error handling

- trigger exceptions become failed executions
- condition exceptions become failed executions
- action exceptions become failed action results and failed executions unless `errorMode` is `continue`
- trigger mismatch and condition mismatch become skipped executions

## CLI and API operations

### CLI

- `wato workflow list`
- `wato workflow execution list`
- `wato workflow provider list`
- `wato workflow validate`
- `wato workflow upsert --json '{...}'`
- `wato workflow test --json '{...}'`

### API

- `GET /v1/workflows`
- `GET /v1/workflows/providers`
- `GET /v1/workflows/executions`
- `PUT /v1/workflows`
- `POST /v1/workflows:validate`
- `POST /v1/workflows:test`

## Dry-run example

```bash
bun run dev:cli -- workflow test
```

Or provide your own payload:

```bash
bun run dev:cli -- workflow test --json '{
  "eventType": "message.received",
  "accountId": "default",
  "payload": {
    "accountId": "default",
    "chatId": "12345@c.us",
    "messageId": "msg-1",
    "from": "12345@c.us",
    "body": "/order A-42",
    "timestamp": "2026-03-24T00:00:00.000Z"
  },
  "workflow": {
    "id": "wf-test",
    "name": "Test",
    "version": 1,
    "enabled": true,
    "accountScope": { "mode": "all" },
    "trigger": {
      "type": "message.received",
      "config": { "commandPrefix": "/", "commandName": "order", "pattern": "(?<orderId>A-[0-9]+)" }
    },
    "conditions": [],
    "actions": [
      { "id": "ctx", "type": "data.set", "config": { "value": { "orderId": "${trigger.data.groups.orderId}" } } },
      { "type": "message.sendText", "config": { "chatId": "${input.chatId}", "text": "received ${actionsById.ctx.output.orderId}" } }
    ]
  }
}'
```
