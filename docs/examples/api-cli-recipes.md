# API And CLI Recipes

## Check daemon health

CLI:

```bash
bun run dev:cli -- system status
```

API:

```bash
curl http://127.0.0.1:3147/system/status
```

## Inspect accounts and QR state

CLI:

```bash
bun run dev:cli -- account list
bun run dev:cli -- account qr default
```

API:

```bash
curl http://127.0.0.1:3147/accounts
```

## Send a text message

CLI:

```bash
bun run dev:cli -- message send default 12345@c.us "hello"
```

API:

```bash
curl -X POST http://127.0.0.1:3147/messages/send \
  -H 'content-type: application/json' \
  -d '{
    "accountId": "default",
    "chatId": "12345@c.us",
    "text": "hello"
  }'
```

## Send media

CLI:

```bash
bun run dev:cli -- message send-media '{
  "accountId": "default",
  "chatId": "12345@c.us",
  "media": { "filePath": "/tmp/demo.png" },
  "caption": "demo image"
}'
```

## Inspect chats

CLI:

```bash
bun run dev:cli -- chat list default
bun run dev:cli -- chat info '{"accountId":"default","chatId":"12345@c.us"}'
```

## Manage a group invite

CLI:

```bash
bun run dev:cli -- group invite-info '{"accountId":"default","inviteCode":"XXXX"}'
```

## Search channels

CLI:

```bash
bun run dev:cli -- channel search '{
  "accountId": "default",
  "searchText": "news"
}'
```

## Validate and test a workflow

CLI:

```bash
bun run dev:cli -- workflow validate
bun run dev:cli -- workflow test
```

API:

```bash
curl http://127.0.0.1:3147/workflow-providers
curl -X POST http://127.0.0.1:3147/workflows/test \
  -H 'content-type: application/json' \
  -d '{
    "eventType": "message.received",
    "accountId": "default",
    "payload": {
      "accountId": "default",
      "chatId": "12345@c.us",
      "messageId": "msg-1",
      "from": "12345@c.us",
      "body": "order A-42",
      "timestamp": "2026-03-24T00:00:00.000Z"
    },
    "workflow": {
      "id": "wf-test",
      "name": "Test",
      "version": 1,
      "enabled": true,
      "accountScope": { "mode": "all" },
      "trigger": { "type": "message.received", "config": { "pattern": "(?<orderId>A-[0-9]+)" } },
      "conditions": [],
      "actions": [
        { "id": "ctx", "type": "data.set", "config": { "value": { "orderId": "${trigger.data.groups.orderId}" } } }
      ]
    }
  }'
```

## Upsert a workflow from CLI

```bash
bun run dev:cli -- workflow upsert '{
  "id": "hello-bot",
  "name": "Hello Bot",
  "version": 1,
  "enabled": true,
  "accountScope": { "mode": "all" },
  "trigger": { "type": "message.received", "config": { "contains": "hello" } },
  "conditions": [],
  "actions": [
    { "type": "message.sendText", "config": { "chatId": "${input.chatId}", "text": "hello back" } }
  ]
}'
```

## Review webhook deliveries

CLI:

```bash
bun run dev:cli -- webhook list
bun run dev:cli -- webhook deliveries
```

API:

```bash
curl http://127.0.0.1:3147/webhooks
curl http://127.0.0.1:3147/webhook-deliveries
```

## Use bearer auth

```bash
curl http://127.0.0.1:3147/system/status \
  -H 'authorization: Bearer replace-me'
```

## Work on a non-default port

```bash
WATO_API_PORT=3255 bun run dev:daemon
WATO_API_PORT=3255 bun run dev:cli -- system status
```
