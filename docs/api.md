# HTTP API

## Overview

The daemon exposes a local HTTP API through the Bun server in `modules/api-server`.

Default bind:

- host: `127.0.0.1`
- port: `3147`

## Authentication

If `api.authToken` is configured, every request must include:

```text
Authorization: Bearer <token>
```

## Conventions

- `GET` routes are mostly list and read operations
- `POST` routes are used for mutations and complex reads with JSON bodies
- `DELETE` routes are used for deletions that still accept JSON request bodies
- responses are JSON

## System and accounts

### `GET /system/status`

Returns daemon status, uptime, module count, and account count.

### `GET /accounts`

Returns all account records and lifecycle state.

## Messages

### `GET /messages?accountId=...`

List stored inbound messages, optionally filtered by account.

### `POST /messages/send`

Send a text message.

### `POST /messages/send-media`

Send media with advanced options.

### `POST /messages/send-contacts`

Send contact cards.

### `POST /messages/send-location`

Send a location.

### `POST /messages/reply`

Reply to a message.

### `POST /messages/forward`

Forward a message.

### `POST /messages/edit`

Edit a sent message where supported.

### `POST /messages/delete`

Delete a message.

### `POST /messages/star`

Star a message.

### `POST /messages/unstar`

Unstar a message.

### `POST /messages/pin`

Pin a message.

### `POST /messages/unpin`

Unpin a message.

### `POST /messages/info`

Get message delivery/info details.

### `POST /messages/reactions`

Get message reactions.

### `POST /messages/polls/votes`

Get poll votes for a poll message.

### `POST /messages/react`

React to a message.

### `POST /messages/polls`

Create a poll.

### `POST /messages/polls/vote`

Vote in a poll.

## Workflows

### `GET /workflows`

List persisted workflows.

### `GET /workflow-providers`

List available trigger, condition, and action provider types.

### `POST /workflows/validate`

Validate a workflow definition.

### `POST /workflows`

Create or update a workflow.

### `POST /workflows/test`

Dry-run a workflow against a supplied event payload.

### `GET /workflow-executions`

List stored workflow execution records.

## Webhooks

### `GET /webhooks`

List webhook endpoints.

### `POST /webhooks`

Create or update a webhook definition.

### `DELETE /webhooks`

Remove a webhook by id.

### `GET /webhook-deliveries`

List webhook deliveries.

### `POST /webhooks/replay`

Replay a delivery by id.

### `POST /webhooks/test`

Publish a synthetic event into the system for testing.

## Labels and broadcasts

### Labels

- `GET /labels`
- `POST /labels/info`
- `POST /labels/chats`
- `POST /labels/chat-labels`
- `POST /labels/update-chats`

### Broadcasts

- `GET /broadcasts`
- `POST /broadcasts/info`

## Chats

- `GET /chats`
- `POST /chats/info`
- `POST /chats/messages`
- `POST /chats/search-messages`
- `POST /chats/archive`
- `POST /chats/unarchive`
- `POST /chats/pin`
- `POST /chats/unpin`
- `POST /chats/mark-unread`
- `POST /chats/seen`
- `POST /chats/typing`
- `POST /chats/recording`
- `POST /chats/clear-state`
- `POST /chats/clear-messages`
- `POST /chats/delete`
- `POST /chats/sync-history`
- `POST /chats/mute`
- `POST /chats/unmute`

## Groups

- `POST /groups/join-by-invite`
- `POST /groups/invite-info`
- `POST /groups/accept-v4-invite`
- `POST /groups/create`
- `POST /groups/invite-code`
- `POST /groups/invite-revoke`
- `POST /groups/info`
- `POST /groups/leave`
- `POST /groups/membership-requests`
- `POST /groups/membership-requests/approve`
- `POST /groups/membership-requests/reject`
- `POST /groups/update`
- `POST /groups/participants/add`
- `POST /groups/participants/kick`
- `POST /groups/participants/promote`
- `POST /groups/participants/demote`

## Contacts

- `POST /contacts/block`
- `POST /contacts/unblock`
- `POST /contacts/info`
- `GET /contacts`
- `GET /contacts/blocked`
- `POST /contacts/common-groups`
- `POST /contacts/formatted-number`
- `POST /contacts/country-code`
- `POST /contacts/is-registered`
- `POST /contacts/number-id`
- `POST /contacts/device-count`
- `POST /contacts/profile-picture`
- `POST /contacts/address-book`
- `DELETE /contacts/address-book`
- `POST /contacts/lid-phone`
- `POST /contacts/customer-note`
- `POST /contacts/customer-note/get`

## Account operations

- `POST /accounts/status`
- `POST /accounts/status/revoke`
- `POST /accounts/display-name`
- `POST /accounts/profile-picture`
- `DELETE /accounts/profile-picture`
- `POST /accounts/pairing-code`
- `POST /accounts/presence/available`
- `POST /accounts/presence/unavailable`
- `POST /accounts/state`
- `POST /accounts/version`
- `POST /accounts/auto-download`
- `POST /accounts/call-link`

## Scheduled events

- `POST /events/scheduled`
- `POST /events/scheduled/respond`

## Channels

- `POST /channels`
- `GET /channels`
- `POST /channels/search`
- `POST /channels/by-invite`
- `POST /channels/update`
- `POST /channels/subscribers`
- `POST /channels/messages`
- `POST /channels/subscribe`
- `POST /channels/unsubscribe`
- `POST /channels/mute`
- `POST /channels/unmute`
- `POST /channels/seen`
- `POST /channels/send`
- `POST /channels/admin/invite`
- `POST /channels/admin/accept`
- `POST /channels/admin/revoke`
- `POST /channels/admin/demote`
- `POST /channels/transfer-ownership`
- `POST /channels/delete`

## Example requests

### Send a message

```bash
curl -X POST http://127.0.0.1:3147/messages/send \
  -H 'content-type: application/json' \
  -d '{
    "accountId": "default",
    "chatId": "12345@c.us",
    "text": "hello from wato"
  }'
```

### Validate a workflow

```bash
curl -X POST http://127.0.0.1:3147/workflows/validate \
  -H 'content-type: application/json' \
  -d '{
    "id": "wf-test",
    "name": "Test",
    "version": 1,
    "enabled": true,
    "accountScope": { "mode": "all" },
    "trigger": { "type": "message.received", "config": {} },
    "conditions": [],
    "actions": [{ "type": "message.sendText", "config": { "text": "ok" } }]
  }'
```

### List providers

```bash
curl http://127.0.0.1:3147/workflow-providers
```

## Error responses

- `401` when auth token is configured and missing or wrong
- `404` for unknown routes
- `500` for server-side errors, with an `error` string in the body
