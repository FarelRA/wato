# Webhook Recipes

## Recipe 1: Basic event forwarder

Use this when you want every inbound message to hit another service.

```bash
bun run dev:cli -- webhook upsert '{
  "id": "messages-basic",
  "url": "https://example.com/hooks/messages",
  "enabled": true,
  "eventTypes": ["message.received"]
}'
```

## Recipe 2: Signed production-style endpoint

```bash
bun run dev:cli -- webhook upsert '{
  "id": "ops-signed",
  "url": "https://example.com/hooks/wato",
  "secret": "replace-me",
  "enabled": true,
  "eventTypes": ["message.received", "message.ack"],
  "headers": {
    "x-service": "wato"
  }
}'
```

Use this when:

- your receiver verifies HMAC signatures
- you want custom headers for routing or environment tagging

## Recipe 3: Account-scoped notifications

```bash
bun run dev:cli -- webhook upsert '{
  "id": "ops-default-account",
  "url": "https://example.com/hooks/default-account",
  "enabled": true,
  "eventTypes": ["message.received"],
  "accountIds": ["default"]
}'
```

## Recipe 4: Test event publishing

```bash
bun run dev:cli -- webhook test-event '{
  "eventType": "message.received",
  "accountId": "default",
  "payload": {
    "body": "hello from webhook test"
  }
}'
```

Useful for:

- validating downstream receivers
- testing delivery behavior without a live WhatsApp message

## Recipe 5: Replay failed delivery

First inspect deliveries:

```bash
bun run dev:cli -- webhook deliveries
```

Then replay one:

```bash
bun run dev:cli -- webhook replay '{"deliveryId":"delivery-123"}'
```

## Recipe 6: Receiver implementation sketch

Minimal Node-style receiver:

```ts
import crypto from "node:crypto";
import http from "node:http";

const secret = process.env.WATO_WEBHOOK_SECRET ?? "replace-me";

http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const signature = req.headers["x-wato-signature"];
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");

    if (signature !== expected) {
      res.statusCode = 401;
      res.end("bad signature");
      return;
    }

    const event = JSON.parse(body.toString("utf8"));
    console.log("received event", event.type, event.accountId);
    res.statusCode = 200;
    res.end("ok");
  });
}).listen(8080);
```

## Recipe 7: Workflow + webhook together

This pattern is useful when you want internal action plus external notification.

1. Create a workflow that reacts to the message and replies or tags data.
2. Register a webhook on `message.received` or the relevant internal event stream.
3. Use workflow execution history for internal visibility and webhook deliveries for outbound visibility.

## Operating advice

- use narrow `eventTypes` in production
- scope by `accountIds` when different teams own different accounts
- keep secrets unique per endpoint
- replay only after the receiver is fixed, not while it is still failing
