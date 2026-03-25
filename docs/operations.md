# Operations

## Development commands

```bash
bun install
bun test
bun run typecheck
bun run build
bun run dev:daemon
bun run dev:cli -- system status
```

## Ports

Default API port is `3147`.

If that port is already in use, start the daemon with another port:

```bash
WATO_API_PORT=3255 bun run dev:daemon
```

The CLI reads the same config/env, so it will follow the new port if started with matching configuration.

## Runtime directories

The daemon ensures the configured `dataDir` exists.

Expected runtime contents include:

- SQLite data
- account auth/session directories
- media archives when enabled

## Build outputs

- `dist/wato-daemon.js`
- `dist/wato.js`

## Recommended local workflow

1. start daemon with `WATO_AUTO_INITIALIZE=false` if you are not ready to launch browser automation
2. validate and dry-run workflows first
3. inspect account state and QR output
4. enable live sessions only when the daemon config is stable

## Troubleshooting

### Daemon fails to start

Check:

- API port conflicts
- invalid config JSON
- invalid workflow definitions
- missing browser path or runtime requirements for `whatsapp-web.js`

### Workflow upsert fails

Likely causes:

- unknown trigger, condition, or action type
- missing required workflow fields
- duplicate action ids
- invalid account scope shape

Use:

```bash
bun run dev:cli -- workflow providers
bun run dev:cli -- workflow validate
```

### Webhook delivery fails

Check:

- endpoint URL reachability
- auth/signature expectations on the receiver
- delivery history via `wato webhook deliveries`
- replay with `wato webhook replay '<json>'`

### QR not available

Check:

- account is enabled
- daemon is running with WhatsApp initialization enabled
- browser automation dependencies are available

## Verification checklist

Before shipping a change, a good baseline is:

```bash
bun test
bun run typecheck
bun run build
```

For workflow changes, also run:

```bash
bun run dev:cli -- workflow providers
bun run dev:cli -- workflow test
```

## Suggested production cautions

- treat the daemon API as a trusted/local control plane unless you front it with proper network controls
- use `api.authToken` if anything beyond local development touches the API
- keep webhook secrets unique per endpoint
- validate workflows in dry-run mode before enabling them against live sessions
