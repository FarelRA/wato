# wato

`wato` is a Bun-first, microkernel WhatsApp automation platform built around a local daemon, a JSON-friendly CLI, a typed HTTP API, persistent webhooks, and a workflow engine that can turn inbound WhatsApp events into structured automation.

## Why it exists

Most WhatsApp automation projects stop at message send/receive. `wato` is designed as an operator-friendly control plane:

- run multiple WhatsApp accounts in one daemon
- expose a local HTTP API and CLI for automation and scripting
- persist events, messages, workflows, executions, webhooks, and deliveries in SQLite
- model integrations as kernel modules instead of a single monolith
- build workflows that can inspect trigger data, transform it, and call WhatsApp actions
- replay and observe webhook deliveries instead of treating them as fire-and-forget

## What it can do today

- manage multi-account WhatsApp Web sessions through `whatsapp-web.js`
- send text, media, contacts, locations, replies, reactions, polls, forwards, edits, deletes, pins, stars, and more
- automate chats, groups, channels, contacts, account state, labels, broadcasts, notes, and scheduled events
- run workflows with trigger matching, condition evaluation, action chaining, interpolation, named action outputs, and dry-run testing
- push signed outbound webhooks with retries and delivery history
- operate everything through both `wato` CLI commands and the local daemon API

## Project feel

```text
WhatsApp account events
  -> kernel event bus
  -> workflow engine
  -> utility/data actions + WhatsApp actions
  -> webhook runtime
  -> SQLite execution history
  -> CLI/API inspection and control
```

## Quickstart

```bash
bun install
bun run dev:daemon
bun run dev:cli -- system status
```

For local development without launching browser automation immediately:

```bash
WATO_AUTO_INITIALIZE=false bun run dev:daemon
```

Useful entrypoints:

- daemon: `bun run dev:daemon`
- CLI: `bun run dev:cli -- <command>`
- tests: `bun test`
- typecheck: `bun run typecheck`
- build: `bun run build`

## Documentation

- overview: `docs/index.md`
- getting started: `docs/getting-started.md`
- configuration: `docs/configuration.md`
- architecture: `docs/architecture.md`
- topology and module map: `docs/topology.md`
- workflow engine: `docs/workflows.md`
- webhooks: `docs/webhooks.md`
- HTTP API: `docs/api.md`
- CLI reference: `docs/cli.md`
- examples and use cases: `docs/examples/index.md`
- operations and development notes: `docs/operations.md`

## Workspace

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
docs/
```

## Status

`wato` already has a working vertical slice with real integrations, not placeholder stubs. The biggest remaining work is hardening against more live-session edge cases, growing the workflow provider set, and deepening operational tooling.
