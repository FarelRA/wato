# CLI Reference

The CLI is a thin API client for the local daemon.

```bash
bun run dev:cli -- <resource> <subcategory> <action> [args] [options]
```

## Conventions

- required values prefer positional args
- optional values use flags
- every object command accepts `--json '{...}'`
- `--json` merges first, then positionals, then flags
- use `--help` on any level to inspect the live tree
- API auth is automatic in the CLI; it uses the first enabled configured API key

## Topology

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

## Common JSON shapes

### Media input

```json
{
  "filePath": "/tmp/demo.png",
  "base64": "...",
  "mimeType": "image/png",
  "filename": "demo.png",
  "url": "https://example.com/demo.png"
}
```

### Unified chat send JSON

Exactly one primary payload family is allowed unless the request is text-only.

```json
{
  "accountId": "default",
  "chatId": "12345@c.us",
  "text": "hello from wato",
  "image": { "filePath": "/tmp/demo.png" },
  "video": { "filePath": "/tmp/demo.mp4" },
  "audio": { "filePath": "/tmp/demo.mp3" },
  "voice": { "filePath": "/tmp/demo.ogg" },
  "document": { "filePath": "/tmp/report.pdf" },
  "sticker": { "filePath": "/tmp/sticker.webp" },
  "gif": { "filePath": "/tmp/demo.gif" },
  "contacts": ["12345@c.us"],
  "location": {
    "latitude": -6.2,
    "longitude": 106.8,
    "description": "Jakarta"
  },
  "poll": {
    "question": "Lunch?",
    "options": ["yes", "no"],
    "allowMultipleAnswers": false
  },
  "event": {
    "name": "Weekly sync",
    "startTime": "2026-03-25T10:00:00Z",
    "description": "planning",
    "endTime": "2026-03-25T11:00:00Z",
    "location": "Meeting room",
    "callType": "video",
    "isEventCanceled": false
  },
  "caption": "demo",
  "quotedMessageId": "3EB0...",
  "mentions": ["12345@c.us"],
  "groupMentions": [{ "id": "120363...@g.us", "subject": "Ops" }],
  "viewOnce": false,
  "hd": false,
  "stickerName": "Wato",
  "stickerAuthor": "Ops",
  "stickerCategories": ["ops"]
}
```

### Unified channel send JSON

Channel sends accept text, image, video, audio, document, or gif.

```json
{
  "accountId": "default",
  "channelId": "120363000000000000@newsletter",
  "text": "hello from wato",
  "image": { "filePath": "/tmp/demo.png" },
  "video": { "filePath": "/tmp/demo.mp4" },
  "audio": { "filePath": "/tmp/demo.mp3" },
  "document": { "filePath": "/tmp/report.pdf" },
  "gif": { "filePath": "/tmp/demo.gif" },
  "caption": "demo",
  "mentions": ["12345@c.us"]
}
```

## Command Reference

### `system`

- `wato system status`
  - args: none
  - options: none
  - example: `bun run dev:cli -- system status`
- `wato system reload`
  - args: none
  - options: none
  - example: `bun run dev:cli -- system reload`
- `wato system key list`
  - example: `bun run dev:cli -- system key list`
- `wato system key get [apiKeyId]`
  - JSON schema:
    ```json
    { "apiKeyId": "ops-key" }
    ```
  - examples:
    - `bun run dev:cli -- system key get ops-key`
    - `bun run dev:cli -- system key get --json '{"apiKeyId":"ops-key"}'`
- `wato system key create [name] [options]`
  - options: `--id`, `--key`, `--enabled`, `--permissions`, `--expires-at`
  - JSON schema:
    ```json
    {
      "id": "ops-key",
      "name": "Ops key",
      "key": "replace-me",
      "enabled": true,
      "permissions": ["read", "write"],
      "expiresAt": "2026-12-31T23:59:59Z"
    }
    ```
  - examples:
    - `bun run dev:cli -- system key create "Ops key" --permissions "read,write"`
    - `bun run dev:cli -- system key create --json '{"name":"Ops key","permissions":["*"]}'`
- `wato system key update [apiKeyId] [options]`
  - options: `--name`, `--enabled`, `--permissions`, `--expires-at`, `--clear-expires-at`
  - JSON schema:
    ```json
    {
      "apiKeyId": "ops-key",
      "name": "Ops key",
      "enabled": true,
      "permissions": ["read"],
      "expiresAt": null
    }
    ```
  - examples:
    - `bun run dev:cli -- system key update ops-key --enabled false`
    - `bun run dev:cli -- system key update --json '{"apiKeyId":"ops-key","permissions":["read"]}'`
- `wato system key rotate [apiKeyId] [options]`
  - options: `--key`
  - JSON schema:
    ```json
    { "apiKeyId": "ops-key", "key": "new-secret" }
    ```
  - examples:
    - `bun run dev:cli -- system key rotate ops-key`
    - `bun run dev:cli -- system key rotate ops-key --key "new-secret"`
- `wato system key delete [apiKeyId]`
  - JSON schema:
    ```json
    { "apiKeyId": "ops-key" }
    ```
  - examples:
    - `bun run dev:cli -- system key delete ops-key`
    - `bun run dev:cli -- system key delete --json '{"apiKeyId":"ops-key"}'`

### `account`

- `wato account list`
- `wato account get [accountId]`
  - JSON schema: `{ "accountId": "default" }`
- `wato account login qr [accountId]`
  - JSON schema: `{ "accountId": "default" }`
- `wato account login pairing-code [accountId] [phoneNumber] [options]`
  - options: `--show-notification`, `--interval-ms`
  - JSON schema:
    ```json
    {
      "accountId": "default",
      "phoneNumber": "628123456789",
      "showNotification": true,
      "intervalMs": 180000
    }
    ```
- `wato account profile status set [accountId] [status...]`
  - JSON schema: `{ "accountId": "default", "text": "online" }`
- `wato account profile status revoke [accountId] [messageId]`
  - JSON schema: `{ "accountId": "default", "messageId": "3EB0..." }`
- `wato account profile name set [accountId] [displayName...]`
  - JSON schema: `{ "accountId": "default", "displayName": "Wato Ops" }`
- `wato account profile photo set [accountId] [path]`
  - JSON schema: `{ "accountId": "default", "media": { "filePath": "/tmp/avatar.png" } }`
- `wato account profile photo clear [accountId]`
  - JSON schema: `{ "accountId": "default" }`
- `wato account presence set [accountId] [presence]`
  - JSON schema: `{ "accountId": "default", "presence": "available" }`
- `wato account state [accountId]`
- `wato account version [accountId]`
- `wato account settings auto-download [accountId] [options]`
  - options: `--audio`, `--documents`, `--photos`, `--videos`, `--background-sync`
  - JSON schema:
    ```json
    {
      "accountId": "default",
      "audio": true,
      "documents": false,
      "photos": true,
      "videos": false,
      "backgroundSync": true
    }
    ```
- `wato account call-link create [accountId] [startTime] [callType]`
  - JSON schema:
    ```json
    {
      "accountId": "default",
      "startTime": "2026-03-25T10:00:00Z",
      "callType": "video"
    }
    ```

### `chat`

- `wato chat list [accountId]`
- `wato chat get [accountId] [chatId]`
- `wato chat message list [accountId] [chatId] [options]`
  - options: `--limit`, `--from-me`
  - JSON schema: `{ "accountId": "default", "chatId": "12345@c.us", "limit": 20, "fromMe": false }`
- `wato chat message clear [accountId] [chatId]`
- `wato chat message search [accountId] [query...] [options]`
  - options: `--chat-id`, `--page`, `--limit`
  - JSON schema: `{ "accountId": "default", "query": "hello", "chatId": "12345@c.us", "page": 1, "limit": 20 }`
- `wato chat archive set|clear [accountId] [chatId]`
- `wato chat pin set|clear [accountId] [chatId]`
- `wato chat mute set [accountId] [chatId] [options]`
  - options: `--until`
  - JSON schema: `{ "accountId": "default", "chatId": "12345@c.us", "until": "2026-12-31T23:59:59Z" }`
- `wato chat mute clear [accountId] [chatId]`
- `wato chat read seen [accountId] [chatId]`
- `wato chat read mark-unread [accountId] [chatId]`
- `wato chat activity typing start|stop [accountId] [chatId]`
- `wato chat activity recording start|stop [accountId] [chatId]`
- `wato chat history sync [accountId] [chatId]`
- `wato chat delete [accountId] [chatId]`

### `message`

- `wato message list [accountId]`
  - JSON schema: `{ "accountId": "default" }`
- `wato message get [accountId] [messageId]`
  - JSON schema: `{ "accountId": "default", "messageId": "3EB0..." }`
- `wato message send [accountId] [chatId] [text...] [options]`
  - structural payload options: `--image`, `--video`, `--audio`, `--voice`, `--document`, `--sticker`, `--gif`, `--contact`, `--latitude`, `--longitude`, `--poll-question`, `--poll-option`, `--poll-allow-multiple-answers`, `--event-name`, `--event-start`, `--event-description`, `--event-end`, `--event-location`, `--event-call-type`, `--event-canceled`
  - shared options: `--caption`, `--quoted-message-id`, `--mention`, `--view-once`, `--hd`, `--sticker-name`, `--sticker-author`, `--sticker-category`
  - JSON schema: see unified chat send shape above
  - examples:
    - `bun run dev:cli -- message send default 12345@c.us "hello"`
    - `bun run dev:cli -- message send default 12345@c.us --image /tmp/demo.png --caption "demo"`
    - `bun run dev:cli -- message send --json '{"accountId":"default","chatId":"12345@c.us","poll":{"question":"Lunch?","options":["yes","no"]}}'`
- `wato message reply [accountId] [messageId] [text...]`
  - JSON schema: `{ "accountId": "default", "messageId": "3EB0...", "text": "roger" }`
- `wato message forward [accountId] [messageId] [chatId]`
  - JSON schema: `{ "accountId": "default", "messageId": "3EB0...", "chatId": "67890@c.us" }`
- `wato message edit [accountId] [messageId] [text...]`
  - JSON schema: `{ "accountId": "default", "messageId": "3EB0...", "text": "updated" }`
- `wato message delete [accountId] [messageId] [options]`
  - options: `--everyone`, `--clear-media`
  - JSON schema: `{ "accountId": "default", "messageId": "3EB0...", "everyone": true, "clearMedia": false }`
- `wato message react [accountId] [messageId] [reaction]`
  - JSON schema: `{ "accountId": "default", "messageId": "3EB0...", "reaction": "👍" }`
- `wato message reaction list [accountId] [messageId]`
- `wato message star set|clear [accountId] [messageId]`
- `wato message pin set [accountId] [messageId] [duration]`
  - JSON schema: `{ "accountId": "default", "messageId": "3EB0...", "duration": 86400 }`
- `wato message pin clear [accountId] [messageId]`
- `wato message poll vote [accountId] [messageId] [selectedOptions...]`
  - JSON schema: `{ "accountId": "default", "messageId": "3EB0...", "selectedOptions": ["yes"] }`
- `wato message poll votes [accountId] [messageId]`
- `wato message event respond [accountId] [messageId] [response]`
  - JSON schema: `{ "accountId": "default", "messageId": "3EB0...", "response": 1 }`

### `group`

- `wato group create [accountId] [title...] [options]`
  - options: `--participants`, `--message-timer`, `--parent-group-id`, `--auto-send-invite-v4`, `--comment`, `--member-add-mode`, `--membership-approval-mode`, `--restrict`, `--announce`
- `wato group get [accountId] [groupId]`
- `wato group update [accountId] [groupId] [options]`
  - options: `--subject`, `--description`, `--messages-admins-only`, `--info-admins-only`, `--add-members-admins-only`
- `wato group leave [accountId] [groupId]`
- `wato group invite join [accountId] [inviteCode]`
- `wato group invite info [accountId] [inviteCode]`
- `wato group invite private-accept [accountId] [inviteCode] [inviteCodeExp] [groupId] [fromId] [toId] [options]`
  - options: `--group-name`
- `wato group invite code get|revoke [accountId] [groupId]`
- `wato group participant add|remove|promote|demote [accountId] [groupId] [participantIds...] [options]`
  - options: `--comment`
- `wato group request list [accountId] [groupId]`
- `wato group request approve|reject [accountId] [groupId] [options]`
  - options: `--requester-id`, `--sleep`

### `channel`

- `wato channel list [accountId]`
- `wato channel search [accountId] [options]`
  - options: `--search-text`, `--country-code`, `--skip-subscribed-newsletters`, `--view`, `--limit`
- `wato channel create [accountId] [title...] [options]`
  - options: `--description`
- `wato channel get [accountId] [channelId]`
- `wato channel get-by-invite [accountId] [inviteCode]`
- `wato channel update [accountId] [channelId] [options]`
  - options: `--subject`, `--description`, `--reaction-setting`, `--profile-picture`
- `wato channel subscriber list [accountId] [channelId] [options]`
  - options: `--limit`
- `wato channel message list [accountId] [channelId] [options]`
  - options: `--limit`, `--from-me`
- `wato channel message send [accountId] [channelId] [text...] [options]`
  - supported payload options only: `--image`, `--video`, `--audio`, `--document`, `--gif`
  - shared options: `--caption`, `--mention`
  - JSON schema: see unified channel send shape above
- `wato channel subscription set|clear [accountId] [channelId]`
- `wato channel mute set|clear [accountId] [channelId]`
- `wato channel read seen [accountId] [channelId]`
- `wato channel admin invite [accountId] [channelId] [userId] [options]`
  - options: `--comment`
- `wato channel admin accept [accountId] [channelId]`
- `wato channel admin revoke-invite [accountId] [channelId] [userId] [options]`
  - options: `--comment`
- `wato channel admin demote [accountId] [channelId] [userId]`
- `wato channel ownership transfer [accountId] [channelId] [newOwnerId] [options]`
  - options: `--dismiss-self-as-admin`
- `wato channel delete [accountId] [channelId]`

### `contact`

- `wato contact list [accountId]`
- `wato contact blocked list [accountId]`
- `wato contact get [accountId] [contactId]`
- `wato contact block set|clear [accountId] [contactId]`
- `wato contact group common [accountId] [contactId]`
- `wato contact number format [accountId] [value]`
- `wato contact number country-code [accountId] [value]`
- `wato contact number resolve-id [accountId] [number]`
- `wato contact registration get [accountId] [contactId]`
- `wato contact device-count [accountId] [contactId]`
- `wato contact photo get [accountId] [contactId]`
- `wato contact address-book upsert [accountId] [phoneNumber] [firstName] [lastName] [options]`
  - options: `--sync-to-addressbook`
  - JSON schema:
    ```json
    {
      "accountId": "default",
      "phoneNumber": "628123456789",
      "firstName": "Farel",
      "lastName": "Aditiya",
      "syncToAddressbook": true
    }
    ```
- `wato contact address-book delete [accountId] [phoneNumber]`
- `wato contact identity resolve-lid-phone [accountId] [userIds...]`
  - JSON schema: `{ "accountId": "default", "userIds": ["12345@lid"] }`
- `wato contact note set [accountId] [userId] [note...]`
  - JSON schema: `{ "accountId": "default", "userId": "12345@c.us", "note": "VIP" }`
- `wato contact note get [accountId] [userId]`

### `label`

- `wato label list [accountId]`
- `wato label get [accountId] [labelId]`
- `wato label chat list [accountId] [labelId]`
- `wato label chat-label list [accountId] [chatId]`
- `wato label chat-label set [accountId] [chatIds...] [options]`
  - options: `--label-id`
  - JSON schema: `{ "accountId": "default", "chatIds": ["12345@c.us"], "labelIds": ["1", "2"] }`

### `broadcast`

- `wato broadcast list [accountId]`
- `wato broadcast get [accountId] [broadcastId]`

### `workflow`

- `wato workflow list`
- `wato workflow provider list`
- `wato workflow execution list`
- `wato workflow validate --json '{...}'`
- `wato workflow upsert --json '{...}'`
- `wato workflow test --json '{...}'`

Example workflow definition:

```json
{
  "id": "hello-bot",
  "name": "Hello bot",
  "version": 1,
  "enabled": true,
  "accountScope": { "mode": "all" },
  "trigger": { "type": "message.received" },
  "conditions": [],
  "actions": [
    {
      "type": "message.sendText",
      "config": {
        "chatId": "${input.chatId}",
        "text": "hello"
      }
    }
  ]
}
```

Example workflow test payload:

```json
{
  "eventType": "message.received",
  "accountId": "default",
  "payload": { "body": "hello" }
}
```

### `webhook`

- `wato webhook list`
- `wato webhook delivery list`
- `wato webhook upsert [webhookId] [url] [options]`
  - options: `--secret`, `--enabled`, `--event-type`, `--account-id`, `--header`
  - JSON schema:
    ```json
    {
      "id": "ops-hook",
      "url": "https://example.com/hooks/wato",
      "secret": "super-secret",
      "enabled": true,
      "eventTypes": ["message.received"],
      "accountIds": ["default"],
      "headers": { "x-env": "prod" }
    }
    ```
- `wato webhook delete [webhookId]`
- `wato webhook delivery replay [deliveryId]`
  - JSON schema: `{ "deliveryId": "delivery-123" }`
- `wato webhook event test [eventType] [options]`
  - options: `--account-id`, `--payload-json`
  - JSON schema:
    ```json
    {
      "eventType": "message.received",
      "accountId": "default",
      "payload": { "body": "hello" }
    }
    ```

## Quick examples by option family

```bash
# chat text
bun run dev:cli -- message send default 12345@c.us "hello"

# media
bun run dev:cli -- message send default 12345@c.us --image /tmp/demo.png --caption "demo"
bun run dev:cli -- message send default 12345@c.us --document /tmp/report.pdf

# location
bun run dev:cli -- message send default 12345@c.us --latitude -6.2 --longitude 106.8

# poll
bun run dev:cli -- message send default 12345@c.us --poll-question "Lunch?" --poll-option yes --poll-option no

# event
bun run dev:cli -- message send default 12345@c.us --event-name "Weekly sync" --event-start 2026-03-25T10:00:00Z

# channel media
bun run dev:cli -- channel message send default 120363000000000000@newsletter --image /tmp/banner.png --caption "release"

# webhook event test
bun run dev:cli -- webhook event test message.received --payload-json '{"body":"hello"}'
```
