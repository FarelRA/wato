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
  event-bus/
  kernel/
  logging/
  module-graph/
  core/
  storage-sqlite/
  workflow-engine/
  workflow-types/
modules/
  action-message/
  action-data/
  runtime-api/
  runtime-health/
  runtime-webhook/
  runtime-whatsapp/
  runtime-workflow/
  trigger-message/
```

## Apps

### `apps/daemon`

Boots the kernel and loads the runtime module graph:

- `runtime-whatsapp`
- `runtime-workflow`
- `trigger-message`
- `action-data`
- `action-message`
- `runtime-webhook`
- `runtime-api`
- `runtime-health`

### `apps/cli`

Thin operator client that reads config, creates an API client, and calls daemon endpoints.

## Packages

### `packages/core`

Core shared contracts:

- module and kernel types
- event types
- storage capability
- workflow registry capability
- WhatsApp gateway capability

### `packages/kernel`

Kernel orchestration, lifecycle management, and capability registry.

### `packages/config`

Config loading, env merges, defaults, and schema validation.

### `packages/event-bus`

Event subscription and publish plumbing.

### `packages/account-registry`

Account state and capability wiring.

### `packages/module-graph`

Module boot and dependency ordering support.

### `packages/storage-sqlite`

SQLite persistence implementation.

### `packages/api-types`

Response and request DTOs used by the API client.

### `packages/api-client`

Local API client used by the CLI.

### `packages/workflow-types`

Workflow types, provider contracts, and workflow config interpolation helpers.

### `packages/workflow-engine`

Workflow execution and validation engine.

## Modules

### `modules/runtime-whatsapp`

Owns WhatsApp Web integration and exposes the typed gateway.

### `modules/runtime-workflow`

Loads workflows, registers base conditions, exposes workflow registry capability, and evaluates workflows for inbound events.

### `modules/trigger-message`

Provides the `message.received` workflow trigger and extracts structured trigger data from message payloads.

### `modules/action-data`

Provides pure workflow utility actions such as:

- `data.set`
- `data.coalesce`
- `data.assert`

### `modules/action-message`

Provides workflow actions that call the WhatsApp gateway.

### `modules/runtime-webhook`

Persists webhook endpoints, delivers outbound webhooks, retries failures, and supports replay.

### `modules/runtime-api`

Exposes the Bun HTTP control plane.

### `modules/runtime-health`

Health and readiness support.

## Capability topology

Important capabilities in the runtime:

- `account-registry`
- `workflow-engine`
- `storage-engine`
- `message-sender`
- `system-controller`
- `whatsapp-gateway`
- `webhook-registry`
- `workflow-registry`

## Data topology

### Session state

- account auth/session data lives under `data/accounts/<accountId>/session` by default

### Build outputs

- `dist/wato-daemon.js`
- `dist/wato.js`

### Runtime stores

- SQLite metadata under the configured data directory
- media archives under the same data root when media archival is enabled
