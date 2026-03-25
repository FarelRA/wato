# Architecture

## Runtime model

`wato` is a microkernel daemon.

- apps own process startup and operator UX
- packages define contracts and infrastructure
- modules register capabilities and subscribe to events
- workflows stay declarative and execute through provider types

The daemon is the long-lived process. The CLI is a thin API client. Both operator surfaces use the same public API contract.

## Main design goals

- Bun-first runtime and tooling
- symmetric resource-first CLI and HTTP API
- typed capability boundaries instead of direct module imports
- explicit multi-account behavior across events and actions
- durable operational metadata in SQLite
- replayable webhook and workflow execution history

## High-level data flow

```text
CLI
  -> API client
  -> runtime API module
  -> kernel capabilities
  -> WhatsApp runtime / workflow runtime / webhook runtime / storage

WhatsApp session events
  -> normalized domain events
  -> event bus
  -> workflow runtime + workflow engine
  -> action modules
  -> webhook runtime
  -> SQLite metadata
```

## Kernel responsibilities

The kernel provides:

- module graph boot order and lifecycle
- capability registration and lookup
- typed event publishing and subscriptions
- account registry wiring
- workflow engine wiring
- system status and reload surface

## Persistence model

SQLite-backed storage persists operational metadata, not WhatsApp message history tables.

Persisted data includes:

- accounts
- API keys
- domain events
- workflows
- workflow execution records
- webhooks
- webhook delivery records

WhatsApp session/browser state lives under the configured account session directories.

## Public control surfaces

There are two public operator interfaces:

- the local HTTP API exposed by `modules/runtime-api`
- the CLI in `apps/cli`, which calls that API through `packages/api-client`

This keeps the CLI thin and forces CLI and API topology to evolve together.

## API shape

The public API is fully nested under `/v1`.

Design rules:

- resource-first paths
- account-scoped resources where relevant
- `:action` suffixes only for truly RPC-like operations
- Bearer API key auth via `Authorization: Bearer <key>`

Examples:

- `GET /v1/system`
- `POST /v1/system:reload`
- `GET /v1/accounts/{accountId}/chats/{chatId}`
- `POST /v1/accounts/{accountId}/chats/{chatId}/messages`
- `POST /v1/accounts/{accountId}/messages/{messageId}:reply`

## CLI shape

The CLI mirrors the same resource-first structure:

```text
wato <resource> <subcategory> <action> [args] [options]
```

Top-level groups:

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

## Workflow architecture

Workflow processing is split across three layers:

- `packages/workflow-types`: workflow contracts and interpolation helpers
- `packages/workflow-engine`: trigger matching, condition evaluation, action execution, validation, execution persistence
- `modules/runtime-workflow`: provider registration, workflow registry capability, config/storage-backed loading, event subscriptions

The message trigger currently comes from `modules/trigger-message`.

Workflow utility actions come from `modules/action-data`.

WhatsApp-facing workflow actions come from `modules/action-message`.

## Webhook architecture

Webhook delivery is handled by `modules/runtime-webhook` and includes:

- endpoint registration
- event filtering by type and account
- HMAC signing
- retry scheduling
- delivery persistence
- replay by delivery id
- synthetic event publishing for test flows

## WhatsApp architecture

`modules/runtime-whatsapp` wraps `whatsapp-web.js` and exposes the typed `WhatsAppGateway` capability.

Functional areas currently exposed:

- account login and session operations
- profile and presence operations
- chat and message operations
- group and invite operations
- channel and newsletter operations
- contact and address-book operations
- label and broadcast inspection
- scheduled event responses

## Auth and session model

- API authentication uses managed API keys
- bootstrap keys come from `config.api.keys`
- managed keys are stored in SQLite as hashed records
- WhatsApp session state lives under `data/accounts/<accountId>/session` by default
- each account may override session storage with `accounts[].sessionDir`

## Lifecycle and robustness

Already in place:

- graceful daemon shutdown on process signals
- in-process config reload on `SIGHUP` or `system reload`
- CLI request cancellation on signal interruption
- workflow failures captured as execution failures instead of crashing the loop
- webhook retries and replay support
- async WhatsApp event handlers wrapped so transient page/navigation failures are logged instead of killing the daemon

## Boundaries

- apps start processes and present operator UX
- packages define stable shared contracts and infrastructure
- modules implement capabilities and runtime integrations
- workflows remain declarative and never directly import runtime code

## Current limitations

- some API endpoints still return raw gateway payloads instead of fully normalized DTOs
- runtime JSON validation is lighter than the docs schema surface
- many advanced WhatsApp operations still need more live-session validation
- the local API is intended for trusted/local environments, not public exposure without additional controls
