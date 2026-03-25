# Architecture

## Runtime model

`wato` is a microkernel application.

The daemon owns the process and boot order. Feature units register themselves as modules. Modules do not reach into each other directly; they communicate through typed capabilities and the event bus.

## Main ideas

- Bun-first tooling and runtime entrypoints
- typed capability registry as the kernel contract surface
- event-driven execution for cross-module work
- explicit multi-account scope carried by events and workflows
- persistent local control plane for operators and automations

## High-level flow

```text
CLI / API client
  -> daemon API module
  -> kernel capabilities
  -> WhatsApp gateway / workflow registry / webhook registry / storage

WhatsApp runtime
  -> normalized domain events
  -> event bus
  -> workflow core
  -> workflow engine
  -> action modules
  -> storage + webhook runtime
```

## Kernel responsibilities

The kernel provides:

- module registration and lifecycle orchestration
- capability registration and lookup
- event publishing and subscriptions
- account manager wiring
- workflow engine wiring
- system status capability

## Persistence model

SQLite-backed storage currently persists:

- accounts
- events
- inbound messages
- outbound messages
- workflows
- workflow execution records
- webhooks
- webhook deliveries

## Control surfaces

There are two operator interfaces:

- the local HTTP API exposed by `modules/api-server`
- the CLI in `apps/cli`, which talks to the same API through `packages/ipc`

This keeps the CLI thin and ensures API and CLI capabilities evolve together.

## Workflow architecture

Workflow processing is split across three layers:

- `packages/workflow-sdk`: workflow contracts and template resolution helpers
- `packages/workflow-engine`: trigger matching, condition evaluation, action execution, execution recording, validation
- `modules/workflow-core`: provider registration, workflow registry capability, config/storage-backed workflow loading, event subscription

## Webhook architecture

Webhook processing is handled by `modules/webhook-runtime` and includes:

- endpoint registration
- event filtering by type and account
- HMAC signature generation
- retry scheduling
- delivery persistence
- replay by delivery id

## WhatsApp architecture

`modules/whatsapp-core` wraps `whatsapp-web.js` and exposes a typed `WhatsAppGateway` capability.

Current functional areas include:

- messaging and media
- chats
- groups and invites
- contacts and address book
- labels and broadcasts
- account presence and profile controls
- channels
- scheduled events

## Robustness choices already in place

- workflow trigger, condition, and action failures are captured as execution failures instead of crashing the evaluation loop
- workflow config can be validated against known provider types before upsert or dry-run
- action outputs can be named and reused later in the workflow via `actionsById`
- webhook deliveries are persisted and replayable
- the daemon can run with API auth token protection

## Boundaries

- apps own process startup and operator experience
- packages define shared runtime contracts and lower-level infrastructure
- modules implement features and register capabilities with the kernel
- workflows stay declarative and use provider types instead of direct code hooks

## Current limitations

- workflow concurrency, retries, and timeout policy are modeled but not yet fully enforced by the engine
- webhook pause/dead-letter tooling is not yet present
- many advanced WhatsApp operations still need more live-session validation
- the local API is designed primarily for trusted/local environments
