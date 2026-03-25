# Use Cases

This page shows realistic ways to use `wato` as an automation platform.

## Use case 1: Customer support intake bot

Goal:

- capture inbound messages
- extract ticket or order numbers
- reply with acknowledgment
- notify another system through webhooks

Suggested `wato` design:

- trigger: `message.received`
- extraction: regex `pattern` with named groups
- data shaping: `data.set`
- validation: `data.assert`
- response: `message.sendText`
- external notification: webhook on `message.received`

Why it fits:

- the workflow engine handles message-level routing
- webhooks let the ticketing backend react without embedding that logic into the WhatsApp adapter

## Use case 2: Chatops command bot

Goal:

- listen for slash commands like `/order`, `/channel`, `/status`
- parse arguments
- call downstream actions

Suggested `wato` design:

- trigger config with `commandPrefix` and `commandName`
- use `trigger.data.command.args`
- use named action outputs via `actionsById`
- finish with a WhatsApp reply in the same chat

Good fit for:

- internal operations teams
- support triage
- broadcast or channel discovery flows

## Use case 3: Abuse and fraud triage

Goal:

- detect risky messages
- record a note
- block the sender

Suggested `wato` design:

- trigger regex matching risky keywords
- `contact.addNote`
- `contact.block`
- optional webhook to security monitoring

Good fit for:

- spam handling
- first-line automated moderation

## Use case 4: Multi-account team separation

Goal:

- run different business units from one daemon
- keep workflows and webhooks scoped per account

Suggested `wato` design:

- configure multiple accounts
- use workflow `accountScope.single` or `accountScope.set`
- set webhook `accountIds`
- use account metadata for your own inventory tracking

Why it fits:

- `wato` is multi-account from the start
- account identity flows through events, workflows, webhook deliveries, and API operations

## Use case 5: Scheduled event assistant

Goal:

- let users request event reminders or meeting setup through chat

Suggested `wato` design:

- parse inbound commands with `message.received`
- extract start time and title through regex or command args
- create a scheduled event with `event.createScheduled`
- reply with confirmation

## Use case 6: Contact enrichment and address book sync

Goal:

- save useful contacts automatically
- attach internal notes

Suggested `wato` design:

- detect messages from high-value contacts or specific chats
- call `contact.saveAddressBook`
- call `contact.addNote`
- optionally forward details to CRM via webhook

## Use case 7: Channel and newsletter operations

Goal:

- search for channels
- subscribe or publish updates
- manage channel admin workflows

Suggested `wato` design:

- use CLI/API directly for one-off administration
- use workflows for message-driven commands that invoke `channel.search`, `channel.subscribe`, or `channel.sendMessage`

## Use case 8: Local automation gateway for other systems

Goal:

- make `wato` the local trusted WhatsApp edge service for another application

Suggested `wato` design:

- application talks to the `wato` API for sends and metadata operations
- application consumes signed webhooks for inbound event processing
- workflows remain in `wato` for small chat-local logic
- larger business logic stays in the upstream app

This is often the cleanest production model.

## Use case 9: Operator console and recovery loop

Goal:

- inspect what happened
- replay deliveries
- dry-run workflow changes safely

Suggested `wato` design:

- inspect workflow executions via CLI/API
- inspect webhook deliveries via CLI/API
- use `workflow test` before workflow upsert
- replay failing webhook deliveries after fixing downstream receivers

## Picking the right shape

Use a workflow when:

- the logic is message-local
- the automation is mostly routing, validation, and action chaining
- you want declarative behavior inside the daemon

Use a webhook when:

- another service owns the business decision
- you need external persistence or approval steps
- you want the receiving system to decide what happens next

Use direct CLI/API commands when:

- the task is operational and one-off
- it is not event-driven
- you are managing accounts, chats, groups, channels, or diagnostics
