# CLI Reference

The CLI is a thin JSON-oriented wrapper around the local daemon API.

Usage pattern:

```bash
bun run dev:cli -- <group> <command> [args]
```

Or after building:

```bash
bun dist/wato.js -- <group> <command> [args]
```

## Core commands

### System

- `wato system status`

### Accounts

- `wato account list`
- `wato account qr <accountId>`
- `wato account set-status <accountId> <status>`
- `wato account display-name '<json>'`
- `wato account revoke-status '<json>'`
- `wato account profile-picture '<json>'`
- `wato account delete-profile-picture '<json>'`
- `wato account pairing-code '<json>'`
- `wato account presence-available '<json>'`
- `wato account presence-unavailable '<json>'`
- `wato account state '<json>'`
- `wato account version '<json>'`
- `wato account auto-download '<json>'`
- `wato account call-link '<json>'`

## Workflows

- `wato workflow list`
- `wato workflow providers`
- `wato workflow executions`
- `wato workflow validate`
- `wato workflow upsert '<json>'`
- `wato workflow test '<json>'`

Notes:

- `workflow validate` uses a built-in sample if no JSON is provided
- `workflow test` also has a built-in sample dry-run payload if no JSON is provided

## Webhooks

- `wato webhook list`
- `wato webhook deliveries`
- `wato webhook upsert '<json>'`
- `wato webhook remove '<json>'`
- `wato webhook replay '<json>'`
- `wato webhook test-event '<json>'`

## Messages

- `wato message list [accountId]`
- `wato message send <accountId> <chatId> <text>`
- `wato message send-media '<json>'`
- `wato message send-contacts '<json>'`
- `wato message send-location '<json>'`
- `wato message reply '<json>'`
- `wato message forward '<json>'`
- `wato message edit '<json>'`
- `wato message delete '<json>'`
- `wato message star '<json>'`
- `wato message unstar '<json>'`
- `wato message pin '<json>'`
- `wato message unpin '<json>'`
- `wato message info '<json>'`
- `wato message reactions '<json>'`
- `wato message poll-votes '<json>'`
- `wato message react '<json>'`

## Labels and broadcasts

### Labels

- `wato label list <accountId>`
- `wato label info '<json>'`
- `wato label chats '<json>'`
- `wato label chat-labels '<json>'`
- `wato label update-chats '<json>'`

### Broadcasts

- `wato broadcast list <accountId>`
- `wato broadcast info '<json>'`

## Polls

- `wato poll create '<json>'`
- `wato poll vote '<json>'`

## Chats

- `wato chat list <accountId>`
- `wato chat info '<json>'`
- `wato chat messages '<json>'`
- `wato chat search-messages '<json>'`
- `wato chat archive '<json>'`
- `wato chat unarchive '<json>'`
- `wato chat pin '<json>'`
- `wato chat unpin '<json>'`
- `wato chat mark-unread '<json>'`
- `wato chat seen '<json>'`
- `wato chat typing '<json>'`
- `wato chat recording '<json>'`
- `wato chat clear-state '<json>'`
- `wato chat clear-messages '<json>'`
- `wato chat delete '<json>'`
- `wato chat sync-history '<json>'`
- `wato chat mute '<json>'`
- `wato chat unmute '<json>'`

## Groups

- `wato group join-invite '<json>'`
- `wato group invite-info '<json>'`
- `wato group accept-v4-invite '<json>'`
- `wato group create '<json>'`
- `wato group get-invite '<json>'`
- `wato group revoke-invite '<json>'`
- `wato group info '<json>'`
- `wato group leave '<json>'`
- `wato group membership-requests '<json>'`
- `wato group approve-requests '<json>'`
- `wato group reject-requests '<json>'`
- `wato group update '<json>'`
- `wato group add '<json>'`
- `wato group kick '<json>'`
- `wato group promote '<json>'`
- `wato group demote '<json>'`

## Contacts

- `wato contact block '<json>'`
- `wato contact unblock '<json>'`
- `wato contact list <accountId>`
- `wato contact blocked <accountId>`
- `wato contact info '<json>'`
- `wato contact common-groups '<json>'`
- `wato contact formatted-number '<json>'`
- `wato contact country-code '<json>'`
- `wato contact is-registered '<json>'`
- `wato contact number-id '<json>'`
- `wato contact device-count '<json>'`
- `wato contact profile-picture '<json>'`
- `wato contact save-address-book '<json>'`
- `wato contact delete-address-book '<json>'`
- `wato contact lid-phone '<json>'`
- `wato contact add-note '<json>'`
- `wato contact get-note '<json>'`

## Scheduled events

- `wato event create-scheduled '<json>'`
- `wato event respond-scheduled '<json>'`

## Channels

- `wato channel list <accountId>`
- `wato channel search '<json>'`
- `wato channel create '<json>'`
- `wato channel by-invite '<json>'`
- `wato channel update '<json>'`
- `wato channel subscribers '<json>'`
- `wato channel messages '<json>'`
- `wato channel subscribe '<json>'`
- `wato channel unsubscribe '<json>'`
- `wato channel mute '<json>'`
- `wato channel unmute '<json>'`
- `wato channel seen '<json>'`
- `wato channel send '<json>'`
- `wato channel invite-admin '<json>'`
- `wato channel accept-admin '<json>'`
- `wato channel revoke-admin '<json>'`
- `wato channel demote-admin '<json>'`
- `wato channel transfer-ownership '<json>'`
- `wato channel delete '<json>'`

## CLI examples

### Send a message

```bash
bun run dev:cli -- message send default 12345@c.us "hello"
```

### Add a webhook

```bash
bun run dev:cli -- webhook upsert '{
  "id": "ops-hook",
  "url": "https://example.com/hooks/wato",
  "enabled": true,
  "eventTypes": ["message.received"]
}'
```

### Upsert a workflow

```bash
bun run dev:cli -- workflow upsert '{
  "id": "hello-bot",
  "name": "Hello Bot",
  "version": 1,
  "enabled": true,
  "accountScope": { "mode": "all" },
  "trigger": { "type": "message.received", "config": { "contains": "hello" } },
  "conditions": [],
  "actions": [
    { "type": "message.sendText", "config": { "text": "hello back", "chatId": "${input.chatId}" } }
  ]
}'
```
