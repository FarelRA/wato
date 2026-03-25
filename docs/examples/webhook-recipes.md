# Webhook Recipes

## Recipe 1: Basic event forwarder

```bash
bun run dev:cli -- webhook upsert messages-basic https://example.com/hooks/messages --event-type message.received
```

JSON equivalent:

```bash
bun run dev:cli -- webhook upsert --json '{
  "id": "messages-basic",
  "url": "https://example.com/hooks/messages",
  "enabled": true,
  "eventTypes": ["message.received"]
}'
```

## Recipe 2: Signed production endpoint

```bash
bun run dev:cli -- webhook upsert ops-signed https://example.com/hooks/wato \
  --secret replace-me \
  --event-type message.received \
  --event-type message.ack \
  --header x-service=wato
```

## Recipe 3: Account-scoped notifications

```bash
bun run dev:cli -- webhook upsert ops-default-account https://example.com/hooks/default-account \
  --event-type message.received \
  --account-id default
```

## Recipe 4: Publish a synthetic event

```bash
bun run dev:cli -- webhook event test message.received \
  --account-id default \
  --payload-json '{"body":"hello from webhook test"}'
```

API equivalent:

```bash
curl -X POST http://127.0.0.1:3147/v1/webhooks/events/message.received:test \
  -H 'Authorization: Bearer change-me' \
  -H 'content-type: application/json' \
  -d '{"accountId":"default","payload":{"body":"hello from webhook test"}}'
```

## Recipe 5: Replay a failed delivery

```bash
bun run dev:cli -- webhook delivery list
bun run dev:cli -- webhook delivery replay delivery-123
```

## Recipe 6: Receiver sketch

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

## Recipe 7: Workflow plus webhook

1. Create a workflow for the internal action path.
2. Register a webhook on the same event stream.
3. Use workflow execution history for internal visibility.
4. Use webhook delivery history for outbound visibility.

## Operating advice

- use narrow `eventTypes` in production
- scope by `accountIds` when teams own different accounts
- keep secrets unique per endpoint
- replay only after the receiver is fixed
