# Examples

This section is the copy-paste and scenario layer of the `wato` docs.

Use these pages when you want concrete JSON, CLI commands, HTTP requests, and deployment shapes instead of conceptual reference material.

## Example sets

### `workflow-patterns.md`

Reusable workflow definitions and trigger/action patterns.

Best for:

- bootstrapping a new workflow library
- validating interpolation and action chaining behavior
- adapting known-good workflow JSON quickly

### `webhook-recipes.md`

Webhook setup, signing, replay, and receiver examples.

Best for:

- integrating another service with signed outbound events
- testing replay flows
- building a minimal receiver

### `api-cli-recipes.md`

Copy-paste resource-first CLI and `/v1` HTTP API calls.

Best for:

- daily operations
- shell scripting
- debugging exact request shapes

### `use-cases.md`

Production-style scenarios that map business goals to workflows, CLI, API, and webhooks.

Best for:

- choosing the right control surface
- planning deployment patterns
- turning requirements into a `wato` design

## Suggested reading path

1. Start with `workflow-patterns.md`
2. Add integrations with `webhook-recipes.md`
3. Operationalize with `api-cli-recipes.md`
4. Map business goals with `use-cases.md`

## Related references

- `../cli.md` for the full command tree
- `../api.md` for the full `/v1` route reference
- `../webhooks.md` for webhook payload and delivery details
- `../workflows.md` for workflow schema and provider details
