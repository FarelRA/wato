# HTTP API

## Overview

The daemon exposes a local Bun HTTP API through `modules/runtime-api`.

- host: `127.0.0.1`
- port: `3147`
- base path: `/v1`

## Authentication

Every request must include:

```text
Authorization: Bearer <key>
```

Bootstrap keys come from `config.api.keys`. Managed keys can be listed, created, updated, rotated, and deleted through this API and through the CLI.

## Global behavior

- request bodies are JSON when present
- most mutations return `{ "ok": true }` or a resource-specific object
- unknown routes return `404`
- auth failures return `401` or `403`
- route failures usually return `{ "error": "..." }`

## Shared schemas

### `ApiKeyRecord`

```json
{
  "id": "ops-key",
  "name": "Ops key",
  "enabled": true,
  "permissions": ["read", "write"],
  "source": "managed",
  "createdAt": "2026-03-25T00:00:00.000Z",
  "updatedAt": "2026-03-25T00:00:00.000Z",
  "expiresAt": "2026-12-31T23:59:59Z",
  "lastUsedAt": "2026-03-25T00:00:00.000Z"
}
```

### `MediaInput`

```json
{
  "filePath": "/tmp/demo.png",
  "base64": "...",
  "mimeType": "image/png",
  "filename": "demo.png",
  "url": "https://example.com/demo.png"
}
```

### `UnifiedMessageSendRequest`

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

### `UnifiedChannelSendRequest`

Channels support text, image, video, audio, document, and gif payloads.

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

## Route Reference

### System

#### `GET /v1/system`

- response schema:
  ```json
  {
    "name": "wato",
    "status": "ready",
    "uptimeMs": 1234,
    "moduleCount": 12,
    "accountCount": 1
  }
  ```
- example:
  ```bash
  curl http://127.0.0.1:3147/v1/system \
    -H 'Authorization: Bearer change-me'
  ```

#### `POST /v1/system:reload`

- body: none
- response: `{ "ok": true }`
- example:
  ```bash
  curl -X POST http://127.0.0.1:3147/v1/system:reload \
    -H 'Authorization: Bearer change-me'
  ```

### API keys

#### `GET /v1/system/keys`

- response schema:
  ```json
  { "apiKeys": [ApiKeyRecord] }
  ```

#### `POST /v1/system/keys`

- request schema:
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
- response schema:
  ```json
  {
    "apiKey": ApiKeyRecord,
    "key": "replace-me"
  }
  ```
- example:
  ```bash
  curl -X POST http://127.0.0.1:3147/v1/system/keys \
    -H 'Authorization: Bearer change-me' \
    -H 'content-type: application/json' \
    -d '{"name":"Ops key","permissions":["read","write"]}'
  ```

#### `GET /v1/system/keys/{apiKeyId}`

- response schema:
  ```json
  { "apiKey": ApiKeyRecord }
  ```

#### `PATCH /v1/system/keys/{apiKeyId}`

- request schema:
  ```json
  {
    "name": "Ops key",
    "enabled": true,
    "permissions": ["read"],
    "expiresAt": null
  }
  ```
- response schema:
  ```json
  { "apiKey": ApiKeyRecord }
  ```

#### `DELETE /v1/system/keys/{apiKeyId}`

- response: `{ "ok": true }`

#### `POST /v1/system/keys/{apiKeyId}:rotate`

- request schema:
  ```json
  { "key": "new-secret" }
  ```
- response schema:
  ```json
  {
    "apiKey": ApiKeyRecord,
    "key": "new-secret"
  }
  ```

### Accounts

#### `GET /v1/accounts`

- response schema:
  ```json
  { "accounts": [{ "id": "default", "state": "ready" }] }
  ```

#### `GET /v1/accounts/{accountId}`

- response schema:
  ```json
  { "account": { "id": "default", "state": "ready" } }
  ```

#### `POST /v1/accounts/{accountId}/login/qr`

- body: none
- response schema:
  ```json
  {
    "account": { "id": "default", "state": "qr_required" },
    "qrCode": "..."
  }
  ```

#### `POST /v1/accounts/{accountId}/login/pairing-code`

- request schema:
  ```json
  {
    "phoneNumber": "628123456789",
    "showNotification": true,
    "intervalMs": 180000
  }
  ```
- response schema:
  ```json
  { "pairingCode": "ABCD-EFGH" }
  ```

#### `POST /v1/accounts/{accountId}/profile/status`

- request schema: `{ "text": "online" }`
- response: `{ "ok": true }`

#### `DELETE /v1/accounts/{accountId}/profile/status/{messageId}`

- response: `{ "ok": true }`

#### `POST /v1/accounts/{accountId}/profile/name`

- request schema: `{ "displayName": "Wato Ops" }`
- response schema: `{ "ok": true }`

#### `POST /v1/accounts/{accountId}/profile/photo`

- request schema:
  ```json
  { "media": MediaInput }
  ```
- response schema: `{ "ok": true }`

#### `DELETE /v1/accounts/{accountId}/profile/photo`

- response schema: `{ "ok": true }`

#### `POST /v1/accounts/{accountId}/presence`

- request schema:
  ```json
  { "presence": "available" }
  ```
- response: `{ "ok": true }`

#### `GET /v1/accounts/{accountId}/state`

- response schema: `{ "state": "ready" }`

#### `GET /v1/accounts/{accountId}/version`

- response schema: `{ "version": "2.3000.1018309460" }`

#### `PATCH /v1/accounts/{accountId}/settings/auto-download`

- request schema:
  ```json
  {
    "audio": true,
    "documents": false,
    "photos": true,
    "videos": false,
    "backgroundSync": true
  }
  ```
- response: `{ "ok": true }`

#### `POST /v1/accounts/{accountId}/call-links`

- request schema:
  ```json
  {
    "startTime": "2026-03-25T10:00:00Z",
    "callType": "video"
  }
  ```
- response schema:
  ```json
  { "url": "https://call.whatsapp.com/..." }
  ```

### Messages

#### `GET /v1/messages?accountId=...`

- query: `accountId` optional
- response schema:
  ```json
  {
    "messages": [
      {
        "accountId": "default",
        "chatId": "12345@c.us",
        "messageId": "3EB0...",
        "from": "12345@c.us",
        "body": "hello",
        "timestamp": "2026-03-25T10:00:00.000Z"
      }
    ]
  }
  ```

#### `GET /v1/accounts/{accountId}/messages:search`

- query schema:
  ```json
  {
    "query": "hello",
    "chatId": "12345@c.us",
    "page": 1,
    "limit": 20
  }
  ```
- response schema: `{ "messages": [MessageEnvelope] }`

#### `GET /v1/accounts/{accountId}/messages/{messageId}`

- response schema: `{ "message": MessageEnvelope }`

#### `PATCH /v1/accounts/{accountId}/messages/{messageId}`

- request schema: `{ "text": "updated" }`
- response schema: `{ "messageId": "3EB0..." }` or `null`

#### `DELETE /v1/accounts/{accountId}/messages/{messageId}`

- query: `everyone`, `clearMedia`
- response: `{ "ok": true }`

#### `POST /v1/accounts/{accountId}/messages/{messageId}:reply`

- request schema:
  ```json
  {
    "text": "roger",
    "chatId": "12345@c.us",
    "mentions": ["12345@c.us"]
  }
  ```
- response schema: `{ "messageId": "3EB0..." }`

#### `POST /v1/accounts/{accountId}/messages/{messageId}:forward`

- request schema: `{ "chatId": "67890@c.us" }`
- response: `{ "ok": true }`

#### `GET /v1/accounts/{accountId}/messages/{messageId}/reaction`

- response schema: implementation-defined WhatsApp reaction payload

#### `PUT /v1/accounts/{accountId}/messages/{messageId}/reaction`

- request schema: `{ "reaction": "👍" }`
- response: `{ "ok": true }`

#### `PUT|DELETE /v1/accounts/{accountId}/messages/{messageId}/star`

- response: `{ "ok": true }`

#### `PUT /v1/accounts/{accountId}/messages/{messageId}/pin`

- request schema: `{ "duration": 86400 }`
- response schema: `{ "ok": true }`

#### `DELETE /v1/accounts/{accountId}/messages/{messageId}/pin`

- response schema: `{ "ok": true }`

#### `GET /v1/accounts/{accountId}/messages/{messageId}/poll-votes`

- response schema: implementation-defined WhatsApp poll vote payload

#### `POST /v1/accounts/{accountId}/messages/{messageId}/poll-votes`

- request schema:
  ```json
  { "selectedOptions": ["yes"] }
  ```
- response: `{ "ok": true }`

#### `POST /v1/accounts/{accountId}/messages/{messageId}/event-response`

- request schema:
  ```json
  { "response": 1 }
  ```
- response schema: `{ "ok": true }`

### Chats

#### `GET /v1/accounts/{accountId}/chats`

- response schema: `{ "chats": [ChatSummary] }`

#### `GET /v1/accounts/{accountId}/chats/{chatId}`

- response schema: `ChatSummary`

#### `GET /v1/accounts/{accountId}/chats/{chatId}/messages`

- query schema: `limit`, `fromMe`
- response schema: `{ "messages": [MessageEnvelope] }`

#### `POST /v1/accounts/{accountId}/chats/{chatId}/messages`

- request schema: `UnifiedMessageSendRequest`
- response schema: `{ "messageId": "3EB0..." }`
- example:
  ```bash
  curl -X POST http://127.0.0.1:3147/v1/accounts/default/chats/12345%40c.us/messages \
    -H 'Authorization: Bearer change-me' \
    -H 'content-type: application/json' \
    -d '{"text":"hello from wato"}'
  ```

#### `DELETE /v1/accounts/{accountId}/chats/{chatId}/messages`

- response schema: `{ "ok": true }`

#### `PUT|DELETE /v1/accounts/{accountId}/chats/{chatId}/archive`
#### `PUT|DELETE /v1/accounts/{accountId}/chats/{chatId}/pin`

- response schema: `{ "ok": true }`

#### `PUT /v1/accounts/{accountId}/chats/{chatId}/mute`

- request schema: `{ "until": "2026-12-31T23:59:59Z" }`
- response schema:
  ```json
  { "isMuted": true, "muteExpiration": 1767225599000 }
  ```

#### `DELETE /v1/accounts/{accountId}/chats/{chatId}/mute`

- response schema:
  ```json
  { "isMuted": false, "muteExpiration": 0 }
  ```

#### `POST /v1/accounts/{accountId}/chats/{chatId}/read:seen`
#### `POST /v1/accounts/{accountId}/chats/{chatId}/read:mark-unread`
#### `POST /v1/accounts/{accountId}/chats/{chatId}/activity/typing:start`
#### `POST /v1/accounts/{accountId}/chats/{chatId}/activity/typing:stop`
#### `POST /v1/accounts/{accountId}/chats/{chatId}/activity/recording:start`
#### `POST /v1/accounts/{accountId}/chats/{chatId}/activity/recording:stop`
#### `POST /v1/accounts/{accountId}/chats/{chatId}/history:sync`
#### `DELETE /v1/accounts/{accountId}/chats/{chatId}`

- response schema: `{ "ok": true }` or `{ "ok": false }` depending on the gateway operation

### Groups

#### `POST /v1/accounts/{accountId}/groups`

- request schema:
  ```json
  {
    "title": "Ops group",
    "participants": ["12345@c.us"],
    "messageTimer": 0,
    "parentGroupId": "120363...@g.us",
    "autoSendInviteV4": false,
    "comment": "welcome",
    "memberAddMode": false,
    "membershipApprovalMode": false,
    "isRestrict": false,
    "isAnnounce": false
  }
  ```
- response schema: implementation-defined WhatsApp group creation payload

#### `GET /v1/accounts/{accountId}/groups/{groupId}`
- response schema: `GroupSummary`

#### `PATCH /v1/accounts/{accountId}/groups/{groupId}`
- request schema:
  ```json
  {
    "subject": "Ops",
    "description": "Operations",
    "messagesAdminsOnly": false,
    "infoAdminsOnly": false,
    "addMembersAdminsOnly": false
  }
  ```
- response schema: `{ "field": true }`

#### `POST /v1/accounts/{accountId}/groups/{groupId}:leave`
- response: `{ "ok": true }`

#### `GET /v1/accounts/{accountId}/group-invites/{inviteCode}`
- response schema: invite info payload

#### `POST /v1/accounts/{accountId}/group-invites/{inviteCode}:join`
- response schema: `{ "groupId": "120363...@g.us" }`

#### `POST /v1/accounts/{accountId}/group-invites/{inviteCode}:private-accept`
- request schema:
  ```json
  {
    "inviteCodeExp": 1234567890,
    "groupId": "120363...@g.us",
    "groupName": "Ops",
    "fromId": "12345@c.us",
    "toId": "67890@c.us"
  }
  ```
- response schema: `{ "status": 200 }`

#### `GET /v1/accounts/{accountId}/groups/{groupId}/invite-code`
- response schema: `{ "inviteCode": "AbCdEf" }`

#### `DELETE /v1/accounts/{accountId}/groups/{groupId}/invite-code`
- response: `{ "ok": true }`

#### `GET /v1/accounts/{accountId}/groups/{groupId}/membership-requests`
- response schema: `{ "requests": [] }`

#### `POST /v1/accounts/{accountId}/groups/{groupId}/membership-requests:approve`
#### `POST /v1/accounts/{accountId}/groups/{groupId}/membership-requests:reject`

- request schema:
  ```json
  {
    "requesterIds": ["12345@c.us"],
    "sleep": 250
  }
  ```
- response schema: `{ "results": [] }`

#### `POST /v1/accounts/{accountId}/groups/{groupId}/participants:add|remove|promote|demote`

- request schema:
  ```json
  {
    "participantIds": ["12345@c.us", "67890@c.us"],
    "comment": "ops update"
  }
  ```
- response schema: implementation-defined group participant result payload

### Channels

#### `GET /v1/accounts/{accountId}/channels`
- response schema: `{ "channels": [ChannelSummary] }`

#### `POST /v1/accounts/{accountId}/channels`
- request schema: `{ "title": "Announcements", "description": "Release notes" }`

#### `GET /v1/accounts/{accountId}/channels:search`
- query: `searchText`, `countryCodes`, `skipSubscribedNewsletters`, `view`, `limit`
- response schema: `{ "channels": [ChannelSummary] }`

#### `GET /v1/accounts/{accountId}/channels:by-invite?inviteCode=...`
- response schema: `ChannelSummary`

#### `GET /v1/accounts/{accountId}/channels/{channelId}`
- response schema: `{ "channel": ChannelSummary }`

#### `PATCH /v1/accounts/{accountId}/channels/{channelId}`
- request schema:
  ```json
  {
    "subject": "Announcements",
    "description": "Release notes",
    "reactionSetting": 1,
    "profilePicture": MediaInput
  }
  ```

#### `DELETE /v1/accounts/{accountId}/channels/{channelId}`
- response schema: `{ "ok": true }`

#### `GET /v1/accounts/{accountId}/channels/{channelId}/subscribers`
- query: `limit`
- response schema: `{ "subscribers": [] }`

#### `GET /v1/accounts/{accountId}/channels/{channelId}/messages`
- query: `limit`, `fromMe`
- response schema: `{ "messages": [MessageEnvelope] }`

#### `POST /v1/accounts/{accountId}/channels/{channelId}/messages`
- request schema: `UnifiedChannelSendRequest`
- response schema: `{ "messageId": "3EB0..." }`

#### `PUT|DELETE /v1/accounts/{accountId}/channels/{channelId}/subscription`
#### `PUT|DELETE /v1/accounts/{accountId}/channels/{channelId}/mute`
#### `POST /v1/accounts/{accountId}/channels/{channelId}/read:seen`

- response schema: `{ "ok": true }`

#### `POST /v1/accounts/{accountId}/channels/{channelId}/admins:invite`
- request schema: `{ "userId": "12345@c.us", "comment": "please join" }`

#### `POST /v1/accounts/{accountId}/channels/{channelId}/admins:accept`
- request schema: `{}`

#### `POST /v1/accounts/{accountId}/channels/{channelId}/admins:revoke-invite`
- request schema: `{ "userId": "12345@c.us", "comment": "revoked" }`

#### `POST /v1/accounts/{accountId}/channels/{channelId}/admins:demote`
- request schema: `{ "userId": "12345@c.us" }`

#### `POST /v1/accounts/{accountId}/channels/{channelId}/ownership:transfer`
- request schema: `{ "newOwnerId": "12345@c.us", "shouldDismissSelfAsAdmin": false }`

### Contacts, labels, broadcasts

#### `GET /v1/accounts/{accountId}/contacts`
#### `GET /v1/accounts/{accountId}/contacts/blocked`
- response schema: `{ "contacts": [ContactSummary] }`

#### `GET /v1/accounts/{accountId}/contacts/{contactId}`
- response schema: `ContactSummary`

#### `PUT|DELETE /v1/accounts/{accountId}/contacts/{contactId}/block`
- response schema: `{ "ok": true }`

#### `GET /v1/accounts/{accountId}/contacts/{contactId}/groups/common`
- response schema: `{ "groups": ["120363...@g.us"] }`

#### `GET /v1/accounts/{accountId}/numbers:format?value=...`
- response schema: `{ "formattedNumber": "+628123456789" }`

#### `GET /v1/accounts/{accountId}/numbers:country-code?value=...`
- response schema: `{ "countryCode": "62" }`

#### `GET /v1/accounts/{accountId}/numbers:resolve-id?number=...`
- response schema: `{ "numberId": "628123456789@c.us" }`

#### `GET /v1/accounts/{accountId}/contacts/{contactId}/registration`
- response schema: `{ "registered": true }`

#### `GET /v1/accounts/{accountId}/contacts/{contactId}/device-count`
- response schema: `{ "count": 1 }`

#### `GET /v1/accounts/{accountId}/contacts/{contactId}/photo`
- response schema: `{ "url": "https://..." }`

#### `PUT /v1/accounts/{accountId}/address-book/{phoneNumber}`
- request schema:
  ```json
  {
    "firstName": "Farel",
    "lastName": "Aditiya",
    "syncToAddressbook": true
  }
  ```
- response schema: `{ "ok": true }`

#### `DELETE /v1/accounts/{accountId}/address-book/{phoneNumber}`
- response schema: `{ "ok": true }`

#### `POST /v1/accounts/{accountId}/identities:resolve-lid-phone`
- request schema: `{ "userIds": ["12345@lid"] }`
- response schema:
  ```json
  { "records": [{ "lid": "12345@lid", "pn": "628123456789" }] }
  ```

#### `PUT /v1/accounts/{accountId}/contacts/{contactId}/note`
- request schema: `{ "note": "VIP" }`

#### `GET /v1/accounts/{accountId}/contacts/{contactId}/note`
- response schema: implementation-defined note payload

#### `GET /v1/accounts/{accountId}/labels`
- response schema: `{ "labels": [LabelSummary] }`

#### `GET /v1/accounts/{accountId}/labels/{labelId}`
- response schema: `LabelSummary`

#### `GET /v1/accounts/{accountId}/labels/{labelId}/chats`
- response schema: `{ "chats": [ChatSummary] }`

#### `GET /v1/accounts/{accountId}/chats/{chatId}/labels`
- response schema: `{ "labels": [LabelSummary] }`

#### `PUT /v1/accounts/{accountId}/chat-labels`
- request schema: `{ "chatIds": ["12345@c.us"], "labelIds": ["1", "2"] }`
- response schema: `{ "ok": true }`

#### `GET /v1/accounts/{accountId}/broadcasts`
- response schema: `{ "broadcasts": [BroadcastSummary] }`

#### `GET /v1/accounts/{accountId}/broadcasts/{broadcastId}`
- response schema: `BroadcastSummary`

### Workflows

#### `GET /v1/workflows`
- response schema: `{ "workflows": [WorkflowDefinition] }`

#### `GET /v1/workflows/providers`
- response schema:
  ```json
  {
    "triggers": ["message.received"],
    "conditions": ["..."],
    "actions": ["message.sendText", "data.set"]
  }
  ```

#### `GET /v1/workflows/executions`
- response schema: `{ "executions": [WorkflowExecutionRecord] }`

#### `POST /v1/workflows:validate`
- request schema: `WorkflowDefinition`
- response schema: `{ "ok": true, "issues": [] }`

#### `PUT /v1/workflows`
- request schema: `WorkflowDefinition`
- response schema: `{ "ok": true }`

#### `POST /v1/workflows:test`
- request schema:
  ```json
  {
    "workflowId": "hello-bot",
    "workflow": WorkflowDefinition,
    "eventType": "message.received",
    "accountId": "default",
    "payload": { "body": "hello" }
  }
  ```
- response schema: workflow test result payload

### Webhooks

#### `GET /v1/webhooks`
- response schema: `{ "webhooks": [WebhookDefinition] }`

#### `GET /v1/webhooks/deliveries`
- response schema: `{ "deliveries": [WebhookDeliveryRecord] }`

#### `PUT /v1/webhooks/{webhookId}`
- request schema:
  ```json
  {
    "url": "https://example.com/hooks/wato",
    "secret": "super-secret",
    "enabled": true,
    "eventTypes": ["message.received"],
    "accountIds": ["default"],
    "headers": { "x-env": "prod" }
  }
  ```
- response schema: `{ "ok": true }`

#### `DELETE /v1/webhooks/{webhookId}`
- response schema: `{ "ok": true }`

#### `POST /v1/webhooks/deliveries/{deliveryId}:replay`
- response schema: `{ "ok": true }`

#### `POST /v1/webhooks/events/{eventType}:test`
- request schema:
  ```json
  {
    "accountId": "default",
    "payload": { "body": "hello" }
  }
  ```
- response schema: `{ "ok": true }`

## Example calls

```bash
# list accounts
curl http://127.0.0.1:3147/v1/accounts \
  -H 'Authorization: Bearer change-me'

# create webhook
curl -X PUT http://127.0.0.1:3147/v1/webhooks/ops-hook \
  -H 'Authorization: Bearer change-me' \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com/hooks/wato","eventTypes":["message.received"]}'

# send image message
curl -X POST http://127.0.0.1:3147/v1/accounts/default/chats/12345%40c.us/messages \
  -H 'Authorization: Bearer change-me' \
  -H 'content-type: application/json' \
  -d '{"image":{"filePath":"/tmp/demo.png"},"caption":"demo"}'

# publish synthetic webhook event
curl -X POST http://127.0.0.1:3147/v1/webhooks/events/message.received:test \
  -H 'Authorization: Bearer change-me' \
  -H 'content-type: application/json' \
  -d '{"accountId":"default","payload":{"body":"hello"}}'
```
