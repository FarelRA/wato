# Use Cases

This page shows realistic ways to apply the current `wato` architecture, CLI, API, workflows, and webhooks.

## Use case 1: Customer support intake bot

Goal:

- process inbound WhatsApp messages in real time
- extract order or ticket ids
- acknowledge the sender
- notify another system

Recommended shape:

- trigger: `message.received`
- extraction: regex `pattern` with named groups
- data shaping: `data.set`
- validation: `data.assert`
- response action: `message.sendText`
- outbound integration: webhook on `message.received`

CLI/API usually involved:

- `wato workflow upsert --json '{...}'`
- `wato webhook upsert support-hook https://example.com/hooks/support`
- `GET /v1/workflows`
- `PUT /v1/webhooks/support-hook`

Why it fits:

- workflows handle message-local routing inside the daemon
- signed webhooks push structured events outward without coupling your ticket system to the WhatsApp runtime

## Use case 2: Chatops command bot

Goal:

- handle slash commands such as `/order`, `/status`, or `/channel`
- parse arguments from the inbound message
- execute follow-up actions and reply in place

Recommended shape:

- trigger config with `commandPrefix` and `commandName`
- use `trigger.data.command.args`
- use named action outputs via `actionsById`
- finish with `message.sendText`

Useful public surfaces:

- `wato workflow provider list`
- `wato workflow test --json '{...}'`
- `POST /v1/workflows:test`

## Use case 3: Abuse and fraud triage

Goal:

- detect risky messages
- store a contact note
- optionally block the sender
- notify security tooling

Recommended shape:

- trigger regex for risky phrases
- `contact.addNote`
- `contact.block`
- optional webhook for escalation

Useful direct operations:

- `wato contact note set default 628123456789@c.us "flagged by workflow"`
- `wato contact block set default 628123456789@c.us`
- `PUT /v1/accounts/default/contacts/628123456789@c.us/note`
- `PUT /v1/accounts/default/contacts/628123456789@c.us/block`

## Use case 4: Multi-account team separation

Goal:

- run multiple business units from one daemon
- keep workflows and webhooks scoped by account
- manage sessions independently

Recommended shape:

- define multiple entries in `accounts`
- use workflow `accountScope.single` or `accountScope.set`
- use webhook `accountIds`
- use account metadata for inventory tagging

Why it fits:

- account identity flows through events, workflows, webhook deliveries, API operations, and CLI commands

## Use case 5: Scheduled event assistant

Goal:

- let users request meetings or reminders through chat
- create and respond to WhatsApp scheduled events

Recommended shape:

- parse commands with `message.received`
- use unified send or event response commands
- optionally wrap confirmation in a workflow

Useful direct operations:

- `wato message send default 12345@c.us --event-name "Team Sync" --event-start 2026-04-01T09:00:00Z`
- `wato message event respond default <messageId> 1`
- `POST /v1/accounts/default/chats/12345@c.us/messages`
- `POST /v1/accounts/default/messages/<messageId>/event-response`

## Use case 6: Contact enrichment and address-book sync

Goal:

- save useful contacts automatically
- attach internal notes
- keep local address book data up to date

Recommended shape:

- detect high-value contacts from inbound traffic
- upsert address book records
- add notes for operators
- optionally send CRM updates through webhooks

Useful direct operations:

- `wato contact address-book upsert default 628123456789 Alice Example`
- `wato contact note set default 628123456789@c.us "VIP prospect"`
- `PUT /v1/accounts/default/address-book/628123456789`
- `PUT /v1/accounts/default/contacts/628123456789@c.us/note`

## Use case 7: Channel and newsletter operations

Goal:

- search for channels
- subscribe or unsubscribe
- publish outbound updates
- manage channel admin workflows

Recommended shape:

- use direct CLI/API for operational work
- optionally trigger those operations from workflows driven by inbound commands

Useful direct operations:

- `wato channel search default --search-text news`
- `wato channel subscription set default 120363000000000000@newsletter`
- `wato channel message send default 120363000000000000@newsletter --image /tmp/banner.png --caption "update"`
- `GET /v1/accounts/default/channels:search?searchText=news`

## Use case 8: Local WhatsApp edge service for another app

Goal:

- keep WhatsApp automation inside one trusted local daemon
- let another system request sends and consume inbound events

Recommended shape:

- upstream application calls `/v1`
- upstream application authenticates with Bearer API keys
- upstream application consumes signed webhooks
- `wato` keeps small chat-local logic in workflows

Why it fits:

- CLI and API are symmetric
- API keys can be scoped and rotated
- webhooks provide replayable delivery history

## Use case 9: Operator console and recovery loop

Goal:

- inspect live state
- replay failed deliveries
- dry-run workflow changes
- reload config without killing the daemon

Recommended shape:

- inspect executions and deliveries through CLI/API
- use workflow dry-run before upsert
- replay webhook deliveries after fixing receivers
- reload the daemon with `system reload`

Useful direct operations:

- `wato workflow execution list`
- `wato webhook delivery list`
- `wato webhook delivery replay <deliveryId>`
- `wato system reload`

## Picking the right shape

Use a workflow when:

- the logic is message-local
- the automation is mostly routing, validation, and action chaining
- you want declarative behavior inside the daemon

Use a webhook when:

- another service owns the decision
- you need external persistence or approval steps
- you want replayable outbound notifications

Use direct CLI/API commands when:

- the task is operational and one-off
- it is not event-driven
- you are managing sessions, chats, groups, channels, contacts, labels, or diagnostics
