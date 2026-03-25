# Configuration

`wato` loads configuration in this order:

1. built-in defaults
2. `wato.config.json` or `WATO_CONFIG`
3. supported environment variables

Arrays are replaced, not merged.

## Config file path

- default: `./wato.config.json`
- override: `WATO_CONFIG=/path/to/file.json`

## Full shape

```json
{
  "dataDir": "./data",
  "logLevel": "info",
  "accounts": [
    {
      "id": "default",
      "label": "Default Account",
      "enabled": true,
      "sessionDir": "./data/accounts/default/session",
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
    "browserPath": "/usr/bin/chromium",
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

## Top-level fields

### `dataDir`

- default: `./data`
- used for runtime state, SQLite metadata, account sessions, and media archives

### `logLevel`

- values: `debug`, `info`, `warn`, `error`
- default: `info`

### `accounts`

Each account supports:

- `id`: stable internal id
- `label`: human-readable name
- `enabled`: whether the daemon should manage it
- `sessionDir`: optional custom auth/session path
- `metadata`: optional string map

### `api`

- `enabled`: enable or disable the daemon API
- `host`: bind address
- `port`: bind port
- `keys`: required bootstrap API keys; configure at least one

Each API key entry supports:

- `id`: stable key id
- `name`: display name
- `key`: plaintext secret used in the `Authorization: Bearer <key>` header
- `enabled`: whether the key may authenticate
- `permissions`: coarse privileges such as `read`, `write`, `keys:read`, `keys:write`, `system:reload`, `*`, or `<scope>:*`
- `expiresAt`: optional ISO expiration timestamp

### `workflows`

An array of workflow definitions. See `workflows.md`.

### `whatsapp`

- `autoInitialize`: immediately initialize enabled accounts on boot
- `archiveMedia`: persist media files and references when available
- `browserPath`: optional browser executable path
- `headless`: run browser automation in headless mode

### `webhooks`

- `enabled`: enable outbound webhook delivery
- `maxAttempts`: maximum delivery attempts
- `baseDelayMs`: retry backoff base delay
- `endpoints`: initial static endpoint definitions

## Environment variables

### General

- `WATO_CONFIG`
- `WATO_DATA_DIR`
- `WATO_LOG_LEVEL`

### Accounts

- `WATO_ACCOUNTS`

Format:

```text
default:Default Account,ops:Ops Account
```

This sets account ids and labels, all enabled.

### API

- `WATO_API_HOST`
- `WATO_API_PORT`
- `WATO_API_KEY`

### WhatsApp runtime

- `WATO_BROWSER_PATH`
- `WATO_HEADLESS`
- `WATO_AUTO_INITIALIZE`

### Webhooks

- `WATO_WEBHOOKS_ENABLED`
- `WATO_WEBHOOK_MAX_ATTEMPTS`
- `WATO_WEBHOOK_BASE_DELAY_MS`

## Built-in default workflow

If no workflows are configured yet, the config layer provides a default `auto-ack` workflow that replies through the WhatsApp `message.sendText` action path.

## Notes

- the config schema validates shape with `zod`
- `dataDir` is created automatically on startup
- when arrays are provided in file or env-derived config, they replace defaults
- `WATO_API_KEY` creates a single bootstrap API key entry for local/dev use
