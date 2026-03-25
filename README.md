# wato

`wato` is a Bun-first, microkernel WhatsApp automation platform with a local daemon, a resource-first CLI, a Bearer-protected HTTP API, persistent workflow/webhook state, and multi-account session management built on `whatsapp-web.js`.

## What it is

- one daemon manages multiple WhatsApp accounts
- one public control surface is exposed in two forms: CLI and HTTP API
- workflows react to inbound events and invoke typed actions
- webhooks fan events out to other systems with retry and replay support
- SQLite stores operational metadata such as accounts, API keys, workflows, executions, webhooks, deliveries, and domain events

## What it can do

- account login, profile, presence, settings, state, version, and call-link operations
- chat, message, group, channel, contact, label, and broadcast operations
- unified message sending for text, media, contacts, location, poll, and scheduled event payloads
- workflow validation, upsert, dry-run testing, and execution inspection
- API key bootstrap plus managed create, rotate, update, and delete flows
- graceful daemon shutdown, signal handling, and config reload

## Quickstart

Install dependencies:

```bash
bun install
```

Start the daemon:

```bash
bun run dev:daemon
```

Check health:

```bash
bun run dev:cli -- system status
```

Open a login QR for the default account:

```bash
bun run dev:cli -- account login qr default
```

Send a message:

```bash
bun run dev:cli -- message send default 12345@c.us "hello from wato"
```

For local development without immediately initializing browser sessions:

```bash
WATO_AUTO_INITIALIZE=false bun run dev:daemon
```

## Default config shape

```json
{
  "dataDir": "./data",
  "logLevel": "info",
  "accounts": [
    {
      "id": "default",
      "label": "Default Account",
      "enabled": true,
      "metadata": {
        "team": "ops"
      }
    }
  ],
  "api": {
    "enabled": true,
    "host": "127.0.0.1",
    "port": 3147,
    "keys": [
      {
        "id": "default",
        "name": "Default API key",
        "key": "change-me",
        "enabled": true,
        "permissions": ["*"],
        "expiresAt": null
      }
    ]
  },
  "workflows": [],
  "whatsapp": {
    "autoInitialize": true,
    "archiveMedia": true,
    "headless": true
  },
  "webhooks": {
    "enabled": true,
    "maxAttempts": 3,
    "baseDelayMs": 1000,
    "endpoints": []
  }
}
```

## Public topology

CLI groups:

- `system`
- `account`
- `chat`
- `message`
- `group`
- `channel`
- `contact`
- `label`
- `broadcast`
- `workflow`
- `webhook`

HTTP API base path:

- `/v1`

Authentication:

- `Authorization: Bearer <key>`

## Workspace

```text
apps/
  cli/
  daemon/
packages/
  account-registry/
  api-client/
  api-types/
  config/
  core/
  event-bus/
  kernel/
  logging/
  module-graph/
  storage-sqlite/
  workflow-engine/
  workflow-types/
modules/
  action-data/
  action-message/
  runtime-api/
  runtime-health/
  runtime-webhook/
  runtime-whatsapp/
  runtime-workflow/
  trigger-message/
docs/
```

## Documentation

- overview: `docs/index.md`
- getting started: `docs/getting-started.md`
- configuration: `docs/configuration.md`
- architecture: `docs/architecture.md`
- topology: `docs/topology.md`
- CLI reference: `docs/cli.md`
- API reference: `docs/api.md`
- workflows: `docs/workflows.md`
- webhooks: `docs/webhooks.md`
- examples hub: `docs/examples/index.md`
- operations: `docs/operations.md`

## Common commands

```bash
# daemon
bun run dev:daemon

# CLI
bun run dev:cli -- system status
bun run dev:cli -- workflow provider list
bun run dev:cli -- webhook delivery list

# checks
bun run typecheck
bun run build
bun test
```
