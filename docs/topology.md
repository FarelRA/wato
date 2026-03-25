# Topology

## Workspace map

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

## Apps

### `apps/daemon`

Boots the kernel and loads the runtime module graph.

Default runtime load order:

- `runtime-whatsapp`
- `runtime-workflow`
- `trigger-message`
- `action-data`
- `action-message`
- `runtime-webhook`
- `runtime-api`
- `runtime-health`

### `apps/cli`

Thin operator client that reads config, builds the API client, and calls the daemon API.

## Packages

### `packages/core`

Shared runtime contracts:

- kernel and module types
- event and capability types
- storage interfaces
- workflow registry interfaces
- WhatsApp gateway interfaces
- API key and send-request shared shapes

### `packages/kernel`

Kernel lifecycle orchestration, capability registry, startup/shutdown, status, and reload wiring.

### `packages/config`

Config loading, env merges, defaults, and zod-backed validation.

### `packages/event-bus`

Event publish/subscribe plumbing.

### `packages/account-registry`

Account records, in-memory state tracking, QR/error updates, and registry capability wiring.

### `packages/module-graph`

Module dependency validation and boot-order support.

### `packages/storage-sqlite`

SQLite implementation for operational metadata.

### `packages/api-types`

Public API request/response DTO families and shared surface shapes.

### `packages/api-client`

Bearer-authenticated local API client used by the CLI.

### `packages/workflow-types`

Workflow types, provider contracts, interpolation helpers, and workflow-side shared shapes.

### `packages/workflow-engine`

Workflow validation, trigger matching, condition evaluation, action execution, and execution persistence.

## Modules

### `modules/runtime-whatsapp`

Owns WhatsApp Web integration, account session initialization, event normalization, and the typed gateway.

### `modules/runtime-workflow`

Loads workflows from config/storage, registers workflow providers, exposes the workflow registry capability, and evaluates workflows for inbound events.

### `modules/trigger-message`

Provides the `message.received` workflow trigger and extracts structured command/regex/message metadata.

### `modules/action-data`

Provides utility workflow actions:

- `data.set`
- `data.coalesce`
- `data.assert`

### `modules/action-message`

Provides workflow actions that call the WhatsApp gateway.

### `modules/runtime-webhook`

Stores webhook definitions, signs/delivers outbound webhooks, retries failed deliveries, and supports replay/test flows.

### `modules/runtime-api`

Exposes the local `/v1` HTTP control plane and maps public routes to kernel capabilities.

### `modules/runtime-health`

Provides runtime health/readiness capability support.

## Capability topology

Important runtime capabilities:

- `account-registry`
- `workflow-engine`
- `workflow-registry`
- `storage-engine`
- `message-sender`
- `system-controller`
- `whatsapp-gateway`
- `webhook-registry`
- `api-router`
- `health-checks`

## Public topology

### CLI groups

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

### HTTP API base

- `/v1`

### Auth

- `Authorization: Bearer <key>`

## Data topology

### Session state

- default account session path: `data/accounts/<accountId>/session`
- optional override: `accounts[].sessionDir`

### Build outputs

- `dist/wato-daemon.js`
- `dist/wato.js`

### Runtime stores

- SQLite metadata under the configured `dataDir`
- media archives under the same root when media archival is enabled

### SQLite metadata families

- account records
- API key records
- domain events
- workflow definitions
- workflow execution records
- webhook definitions
- webhook delivery records
