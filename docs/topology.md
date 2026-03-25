# Topology

## Workspace map

```text
apps/
  cli/
  daemon/
packages/
  account-manager/
  api-contracts/
  config/
  event-bus/
  ipc/
  kernel/
  logging/
  module-loader/
  sdk/
  storage-sqlite/
  workflow-engine/
  workflow-sdk/
modules/
  action-send-message/
  action-utility/
  api-server/
  health-monitor/
  storage-archive/
  trigger-message/
  webhook-runtime/
  whatsapp-core/
  workflow-core/
```

## Apps

### `apps/daemon`

Boots the kernel and loads the runtime module graph:

- `whatsapp-core`
- `storage-archive`
- `workflow-core`
- `trigger-message`
- `action-utility`
- `action-send-message`
- `webhook-runtime`
- `api-server`
- `health-monitor`

### `apps/cli`

Thin operator client that reads config, creates a local control client, and calls daemon endpoints.

## Packages

### `packages/sdk`

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

### `packages/account-manager`

Account state and capability wiring.

### `packages/module-loader`

Module boot and dependency ordering support.

### `packages/storage-sqlite`

SQLite persistence implementation.

### `packages/api-contracts`

Response and request DTOs used by the local control client.

### `packages/ipc`

Local API client used by the CLI.

### `packages/workflow-sdk`

Workflow types, provider contracts, and workflow config interpolation helpers.

### `packages/workflow-engine`

Workflow execution and validation engine.

## Modules

### `modules/whatsapp-core`

Owns WhatsApp Web integration and exposes the typed gateway.

### `modules/storage-archive`

Archives inbound message data into persistence.

### `modules/workflow-core`

Loads workflows, registers base conditions, exposes workflow registry capability, and evaluates workflows for inbound events.

### `modules/trigger-message`

Provides the `message.received` workflow trigger and extracts structured trigger data from message payloads.

### `modules/action-utility`

Provides pure workflow utility actions such as:

- `data.set`
- `data.coalesce`
- `data.assert`

### `modules/action-send-message`

Provides workflow actions that call the WhatsApp gateway.

### `modules/webhook-runtime`

Persists webhook endpoints, delivers outbound webhooks, retries failures, and supports replay.

### `modules/api-server`

Exposes the Bun HTTP control plane.

### `modules/health-monitor`

Health and readiness support.

## Capability topology

Important capabilities in the runtime:

- `account-manager`
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
- archived inbound media under the same data root when media archival is enabled
