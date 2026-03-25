# API And CLI Recipes

## Check daemon health

CLI:

```bash
bun run dev:cli -- system status
```

API:

```bash
curl http://127.0.0.1:3147/v1/system   -H 'Authorization: Bearer change-me'
```

## Inspect accounts and login state

CLI:

```bash
bun run dev:cli -- account list
bun run dev:cli -- account login qr default
```

API:

```bash
curl http://127.0.0.1:3147/v1/accounts   -H 'Authorization: Bearer change-me'
```

## Send a text message

CLI:

```bash
bun run dev:cli -- message send default 12345@c.us "hello"
```

API:

```bash
curl -X POST http://127.0.0.1:3147/v1/accounts/default/chats/12345%40c.us/messages   -H 'Authorization: Bearer change-me'   -H 'content-type: application/json'   -d '{
    "text": "hello"
  }'
```

## Send media through unified message send

CLI:

```bash
bun run dev:cli -- message send default 12345@c.us --image /tmp/demo.png --caption "demo image"
```

API:

```bash
curl -X POST http://127.0.0.1:3147/v1/accounts/default/chats/12345%40c.us/messages   -H 'Authorization: Bearer change-me'   -H 'content-type: application/json'   -d '{
    "image": { "filePath": "/tmp/demo.png" },
    "caption": "demo image"
  }'
```

## Inspect chats

CLI:

```bash
bun run dev:cli -- chat list default
bun run dev:cli -- chat get default 12345@c.us
bun run dev:cli -- chat message list default 12345@c.us
```

## Manage a group invite

CLI:

```bash
bun run dev:cli -- group invite info default XXXX
bun run dev:cli -- group invite join default XXXX
```

## Search channels

CLI:

```bash
bun run dev:cli -- channel search default --search-text news
```

API:

```bash
curl 'http://127.0.0.1:3147/v1/accounts/default/channels:search?searchText=news'   -H 'Authorization: Bearer change-me'
```

## Validate and test a workflow

CLI:

```bash
bun run dev:cli -- workflow provider list
bun run dev:cli -- workflow validate
bun run dev:cli -- workflow test
```

API:

```bash
curl http://127.0.0.1:3147/v1/workflows/providers   -H 'Authorization: Bearer change-me'
curl -X POST http://127.0.0.1:3147/v1/workflows:test   -H 'Authorization: Bearer change-me'   -H 'content-type: application/json'   -d '{
    "eventType": "message.received",
    "accountId": "default",
    "payload": {
      "accountId": "default",
      "chatId": "12345@c.us",
      "messageId": "msg-1",
      "from": "12345@c.us",
      "body": "order A-42",
      "timestamp": "2026-03-24T00:00:00.000Z"
    }
  }'
```

## Review webhook deliveries

CLI:

```bash
bun run dev:cli -- webhook list
bun run dev:cli -- webhook delivery list
```

API:

```bash
curl http://127.0.0.1:3147/v1/webhooks   -H 'Authorization: Bearer change-me'
curl http://127.0.0.1:3147/v1/webhooks/deliveries   -H 'Authorization: Bearer change-me'
```

## Manage API keys

CLI:

```bash
bun run dev:cli -- system key list
bun run dev:cli -- system key create "Ops key" --permissions "read,write"
bun run dev:cli -- system key rotate bootstrap
bun run dev:cli -- system key update bootstrap --enabled false
```

## Work on a non-default port

```bash
WATO_API_PORT=3255 bun run dev:daemon
WATO_API_PORT=3255 bun run dev:cli -- system status
```
