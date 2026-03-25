# Webhooks

## Overview

`wato` forwards internal events to external HTTP endpoints.

The webhook runtime supports:

- persisted endpoint definitions
- event type filters
- account filters
- HMAC signatures
- retries with backoff
- delivery history
- replay by delivery id

## Webhook definition schema

```json
{
  "id": "ops-hook",
  "url": "https://example.com/hooks/wato",
  "secret": "super-secret",
  "enabled": true,
  "eventTypes": ["message.received", "message.ack"],
  "accountIds": ["default"],
  "headers": {
    "x-env": "prod"
  }
}
```

Fields:

- `id`: stable webhook id
- `url`: destination URL
- `secret`: optional signing secret
- `enabled`: on/off switch
- `eventTypes`: event type allow-list or `*`
- `accountIds`: optional account filter
- `headers`: extra static headers

## Delivery behavior

When a matching event is published:

1. webhook filters are checked
2. a delivery record is created
3. the payload is sent
4. success or failure is persisted
5. retries are scheduled when enabled and needed

## Signing

If `secret` is provided, payloads are signed with HMAC. Verify the signature before trusting the payload.

## CLI

- `wato webhook list`
- `wato webhook delivery list`
- `wato webhook upsert [webhookId] [url] [options]`
- `wato webhook delete [webhookId]`
- `wato webhook delivery replay [deliveryId]`
- `wato webhook event test [eventType] [options]`

### CLI JSON schemas

#### Upsert

```json
{
  "id": "ops-hook",
  "url": "https://example.com/hooks/wato",
  "secret": "super-secret",
  "enabled": true,
  "eventTypes": ["message.received"],
  "accountIds": ["default"],
  "headers": {
    "x-env": "prod"
  }
}
```

#### Delivery replay

```json
{
  "deliveryId": "delivery-123"
}
```

#### Event test

```json
{
  "eventType": "message.received",
  "accountId": "default",
  "payload": {
    "body": "hello"
  }
}
```

### CLI examples

```bash
bun run dev:cli -- webhook list
bun run dev:cli -- webhook delivery list
bun run dev:cli -- webhook upsert ops-hook https://example.com/hooks/wato --secret super-secret --event-type message.received
bun run dev:cli -- webhook upsert --json '{"id":"ops-hook","url":"https://example.com/hooks/wato","eventTypes":["message.received"]}'
bun run dev:cli -- webhook delete ops-hook
bun run dev:cli -- webhook delivery replay delivery-123
bun run dev:cli -- webhook event test message.received --account-id default --payload-json '{"body":"hello"}'
```

## API

- `GET /v1/webhooks`
- `PUT /v1/webhooks/{webhookId}`
- `DELETE /v1/webhooks/{webhookId}`
- `GET /v1/webhooks/deliveries`
- `POST /v1/webhooks/deliveries/{deliveryId}:replay`
- `POST /v1/webhooks/events/{eventType}:test`

### API examples

```bash
curl http://127.0.0.1:3147/v1/webhooks \
  -H 'Authorization: Bearer change-me'

curl -X PUT http://127.0.0.1:3147/v1/webhooks/ops-hook \
  -H 'Authorization: Bearer change-me' \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com/hooks/wato","eventTypes":["message.received"]}'

curl -X POST http://127.0.0.1:3147/v1/webhooks/deliveries/delivery-123:replay \
  -H 'Authorization: Bearer change-me'

curl -X POST http://127.0.0.1:3147/v1/webhooks/events/message.received:test \
  -H 'Authorization: Bearer change-me' \
  -H 'content-type: application/json' \
  -d '{"accountId":"default","payload":{"body":"hello"}}'
```

## Delivery record fields

- `id`
- `webhookId`
- `eventId`
- `eventType`
- `accountId`
- `attempt`
- `status`
- `responseStatus`
- `error`
- `nextRetryAt`
- `createdAt`
- `deliveredAt`

## Operational notes

- if the configured API port is busy, change `WATO_API_PORT`
- replay depends on the original event and delivery still being present in storage
- broad `eventTypes` can generate a lot of traffic
