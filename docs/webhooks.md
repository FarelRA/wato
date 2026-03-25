# Webhooks

## Overview

`wato` can forward internal events to external HTTP endpoints.

The webhook runtime supports:

- persisted endpoint definitions
- event type filters
- account filters
- HMAC signatures
- retries with backoff
- delivery history
- replay by delivery id

## Webhook definition

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
- `eventTypes`: list of event types or `*`
- `accountIds`: optional account filter
- `headers`: extra static headers

## Delivery behavior

When a matching event is published:

1. the webhook runtime filters by event type and account
2. a delivery record is created
3. the payload is sent to the endpoint
4. success or failure is persisted
5. if delivery fails and retries remain, the next retry time is scheduled

## Signing

If `secret` is provided, webhook payloads are signed with HMAC.

Use the shared secret on the receiver side to verify the signature before trusting the payload.

## Replay

Replay is supported by delivery id. The runtime looks up the original delivery and persisted event, then re-sends it.

## CLI

- `wato webhook list`
- `wato webhook deliveries`
- `wato webhook upsert '<json>'`
- `wato webhook remove '<json>'`
- `wato webhook replay '<json>'`
- `wato webhook test-event '<json>'`

Examples:

```bash
bun run dev:cli -- webhook upsert '{
  "id": "ops-hook",
  "url": "https://example.com/hooks/wato",
  "secret": "super-secret",
  "enabled": true,
  "eventTypes": ["message.received"]
}'
```

```bash
bun run dev:cli -- webhook replay '{"deliveryId":"delivery-1"}'
```

```bash
bun run dev:cli -- webhook test-event '{
  "eventType": "message.received",
  "accountId": "default",
  "payload": { "body": "hello" }
}'
```

## API

- `GET /webhooks`
- `POST /webhooks`
- `DELETE /webhooks`
- `GET /webhook-deliveries`
- `POST /webhooks/replay`
- `POST /webhooks/test`

## Delivery records

Persisted delivery records include:

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

- if the daemon does not start because the configured port is busy, change `WATO_API_PORT`
- replay depends on the original event and delivery being present in storage
- webhook filtering is runtime-level, so broad event types can generate a lot of traffic
