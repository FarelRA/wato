# Getting Started

## Requirements

- Bun 1.2+
- a machine that can run `whatsapp-web.js`
- Chromium or a compatible browser available to the daemon

## Install

```bash
bun install
```

## Start the daemon

```bash
bun run dev:daemon
```

By default the daemon:

- reads config from `wato.config.json` in the current directory
- falls back to built-in defaults if the file does not exist
- starts the local API on `127.0.0.1:3147`
- initializes enabled WhatsApp accounts automatically

## Start without browser automation

```bash
WATO_AUTO_INITIALIZE=false bun run dev:daemon
```

This is useful when you want to inspect the platform, validate workflows, or use the CLI without opening browser sessions immediately.

## Use the CLI

```bash
bun run dev:cli -- system status
bun run dev:cli -- account list
bun run dev:cli -- workflow providers
```

## Build production bundles

```bash
bun run build
```

Outputs:

- `dist/wato-daemon.js`
- `dist/wato.js`

## Verify the repo

```bash
bun test
bun run typecheck
```

## Minimal first config

```json
{
  "accounts": [
    {
      "id": "default",
      "label": "Primary Account",
      "enabled": true
    }
  ],
  "api": {
    "enabled": true,
    "host": "127.0.0.1",
    "port": 3147
  },
  "workflows": []
}
```

## First workflow smoke test

```bash
bun run dev:cli -- workflow test
```

The built-in sample test exercises:

- trigger regex extraction
- workflow interpolation
- utility data actions
- a WhatsApp send-text action path

## First operational checks

- inspect system: `bun run dev:cli -- system status`
- inspect accounts: `bun run dev:cli -- account list`
- fetch QR for an account: `bun run dev:cli -- account qr default`
- list workflows: `bun run dev:cli -- workflow list`
- list webhook endpoints: `bun run dev:cli -- webhook list`

## Where to go next

- config details: `configuration.md`
- workflow authoring: `workflows.md`
- daemon API: `api.md`
- CLI reference: `cli.md`
