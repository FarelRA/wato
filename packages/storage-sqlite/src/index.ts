import { mkdirSync } from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";
import type {
  AccountRecord,
  DomainEvent,
  MessageEnvelope,
  OutboundMessageRecord,
  StorageEngine,
  WebhookDefinition,
  WebhookDeliveryRecord,
  WorkflowExecutionRecord
} from "@wato/sdk";

export class SqliteStorageEngine implements StorageEngine {
  private readonly db: Database;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, "wato.sqlite");
    this.db = new Database(dbPath, { create: true, strict: true });
    this.migrate();
  }

  upsertAccounts(accounts: AccountRecord[]): void {
    const query = this.db.query(
      `insert into accounts (id, label, enabled, state, qr_code, last_error, last_seen_at)
       values ($id, $label, $enabled, $state, $qrCode, $lastError, $lastSeenAt)
       on conflict(id) do update set
         label = excluded.label,
         enabled = excluded.enabled,
         state = excluded.state,
         qr_code = excluded.qr_code,
         last_error = excluded.last_error,
         last_seen_at = excluded.last_seen_at`
    );

    const transaction = this.db.transaction((rows: AccountRecord[]) => {
      for (const row of rows) {
        query.run({
          id: row.id,
          label: row.label,
          enabled: row.enabled ? 1 : 0,
          state: row.state,
          qrCode: row.qrCode ?? null,
          lastError: row.lastError ?? null,
          lastSeenAt: row.lastSeenAt ?? null
        });
      }
    });

    transaction(accounts);
  }

  saveEvent(event: DomainEvent): void {
    this.db
      .query(
        `insert or replace into domain_events (id, type, timestamp, source_module, account_id, correlation_id, payload_json)
         values ($id, $type, $timestamp, $sourceModule, $accountId, $correlationId, $payloadJson)`
      )
      .run({
        id: event.eventId,
        type: event.type,
        timestamp: event.timestamp,
        sourceModule: event.sourceModule,
        accountId: event.accountId ?? null,
        correlationId: event.correlationId ?? null,
        payloadJson: JSON.stringify(event.payload)
      });
  }

  getEvent(eventId: string): DomainEvent | undefined {
    const row = this.db
      .query(`select id, type, timestamp, source_module, account_id, correlation_id, payload_json from domain_events where id = ? limit 1`)
      .get(eventId) as Record<string, unknown> | null;
    if (!row) {
      return undefined;
    }

    return {
      eventId: String(row.id),
      type: String(row.type),
      timestamp: String(row.timestamp),
      sourceModule: String(row.source_module),
      accountId: row.account_id ? String(row.account_id) : undefined,
      correlationId: row.correlation_id ? String(row.correlation_id) : undefined,
      payload: JSON.parse(String(row.payload_json))
    };
  }

  saveInboundMessage(message: MessageEnvelope): void {
    this.db
      .query(
        `insert or replace into messages (
          message_id, account_id, chat_id, sender, body, timestamp, from_me, has_media, media_mime_type, media_filename, raw_json
         ) values (
          $messageId, $accountId, $chatId, $sender, $body, $timestamp, $fromMe, $hasMedia, $mediaMimeType, $mediaFilename, $rawJson
         )`
      )
      .run({
        messageId: message.messageId,
        accountId: message.accountId,
        chatId: message.chatId,
        sender: message.from,
        body: message.body,
        timestamp: message.timestamp,
        fromMe: message.fromMe ? 1 : 0,
        hasMedia: message.hasMedia ? 1 : 0,
        mediaMimeType: message.mediaMimeType ?? null,
        mediaFilename: message.mediaFilename ?? null,
        rawJson: JSON.stringify(message.raw ?? null)
      });
  }

  saveOutboundMessage(message: OutboundMessageRecord): void {
    this.db
      .query(
        `insert or replace into outbound_messages (id, account_id, chat_id, text, status, created_at, error)
         values ($id, $accountId, $chatId, $text, $status, $createdAt, $error)`
      )
      .run({
        id: message.id,
        accountId: message.accountId,
        chatId: message.chatId,
        text: message.text,
        status: message.status,
        createdAt: message.createdAt,
        error: message.error ?? null
      });
  }

  listMessages(accountId?: string, limit = 100): MessageEnvelope[] {
    const query = accountId
      ? this.db.query(
          `select message_id, account_id, chat_id, sender, body, timestamp, from_me, has_media, media_mime_type, media_filename, raw_json
           from messages where account_id = ? order by timestamp desc limit ?`
        )
      : this.db.query(
          `select message_id, account_id, chat_id, sender, body, timestamp, from_me, has_media, media_mime_type, media_filename, raw_json
           from messages order by timestamp desc limit ?`
        );
    const rows = accountId ? query.all(accountId, limit) : query.all(limit);
    return (rows as Array<Record<string, unknown>>).map((row) => ({
      messageId: String(row.message_id),
      accountId: String(row.account_id),
      chatId: String(row.chat_id),
      from: String(row.sender),
      body: String(row.body ?? ""),
      timestamp: String(row.timestamp),
      fromMe: Boolean(row.from_me),
      hasMedia: Boolean(row.has_media),
      mediaMimeType: row.media_mime_type ? String(row.media_mime_type) : undefined,
      mediaFilename: row.media_filename ? String(row.media_filename) : undefined,
      raw: row.raw_json ? (JSON.parse(String(row.raw_json)) as Record<string, unknown>) : undefined
    }));
  }

  saveWorkflow(workflow: unknown): void {
    const record = workflow as { id: string; version: number };
    this.db
      .query(`insert or replace into workflows (id, version, definition_json, updated_at) values ($id, $version, $definitionJson, $updatedAt)`)
      .run({
        id: record.id,
        version: record.version,
        definitionJson: JSON.stringify(workflow),
        updatedAt: new Date().toISOString()
      });
  }

  listWorkflows(): unknown[] {
    const rows = this.db.query(`select definition_json from workflows order by id asc`).all() as Array<{ definition_json: string }>;
    return rows.map((row) => JSON.parse(row.definition_json));
  }

  saveWorkflowExecution(record: WorkflowExecutionRecord): void {
    this.db
      .query(
        `insert or replace into workflow_executions (
          id, workflow_id, workflow_version, account_id, event_type, status, steps_json, started_at, finished_at, error
         ) values (
          $id, $workflowId, $workflowVersion, $accountId, $eventType, $status, $stepsJson, $startedAt, $finishedAt, $error
         )`
      )
      .run({
        id: record.id,
        workflowId: record.workflowId,
        workflowVersion: record.workflowVersion,
        accountId: record.accountId ?? null,
        eventType: record.eventType,
        status: record.status,
        stepsJson: JSON.stringify(record.steps),
        startedAt: record.startedAt,
        finishedAt: record.finishedAt ?? null,
        error: record.error ?? null
      });
  }

  listWorkflowExecutions(limit = 100): WorkflowExecutionRecord[] {
    const rows = this.db
      .query(
        `select id, workflow_id, workflow_version, account_id, event_type, status, steps_json, started_at, finished_at, error
         from workflow_executions order by started_at desc limit ?`
      )
      .all(limit) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      workflowId: String(row.workflow_id),
      workflowVersion: Number(row.workflow_version),
      accountId: row.account_id ? String(row.account_id) : undefined,
      eventType: String(row.event_type),
      status: row.status as WorkflowExecutionRecord["status"],
      steps: JSON.parse(String(row.steps_json)) as string[],
      startedAt: String(row.started_at),
      finishedAt: row.finished_at ? String(row.finished_at) : undefined,
      error: row.error ? String(row.error) : undefined
    }));
  }

  saveWebhook(definition: WebhookDefinition): void {
    this.db
      .query(
        `insert or replace into webhooks (id, url, secret, enabled, event_types_json, account_ids_json, headers_json, updated_at)
         values ($id, $url, $secret, $enabled, $eventTypesJson, $accountIdsJson, $headersJson, $updatedAt)`
      )
      .run({
        id: definition.id,
        url: definition.url,
        secret: definition.secret ?? null,
        enabled: definition.enabled ? 1 : 0,
        eventTypesJson: JSON.stringify(definition.eventTypes),
        accountIdsJson: JSON.stringify(definition.accountIds ?? null),
        headersJson: JSON.stringify(definition.headers ?? null),
        updatedAt: new Date().toISOString()
      });
  }

  deleteWebhook(webhookId: string): void {
    this.db.query(`delete from webhooks where id = ?`).run(webhookId);
  }

  listWebhooks(): WebhookDefinition[] {
    const rows = this.db
      .query(`select id, url, secret, enabled, event_types_json, account_ids_json, headers_json from webhooks order by id asc`)
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      url: String(row.url),
      secret: row.secret ? String(row.secret) : undefined,
      enabled: Boolean(row.enabled),
      eventTypes: JSON.parse(String(row.event_types_json)) as string[],
      accountIds: row.account_ids_json ? ((JSON.parse(String(row.account_ids_json)) as string[] | null) ?? undefined) : undefined,
      headers: row.headers_json ? ((JSON.parse(String(row.headers_json)) as Record<string, string> | null) ?? undefined) : undefined
    }));
  }

  saveWebhookDelivery(record: WebhookDeliveryRecord): void {
    this.db
      .query(
        `insert or replace into webhook_deliveries (
          id, webhook_id, event_id, event_type, account_id, attempt, status, response_status, error, next_retry_at, created_at, delivered_at
         ) values (
          $id, $webhookId, $eventId, $eventType, $accountId, $attempt, $status, $responseStatus, $error, $nextRetryAt, $createdAt, $deliveredAt
         )`
      )
      .run({
        id: record.id,
        webhookId: record.webhookId,
        eventId: record.eventId,
        eventType: record.eventType,
        accountId: record.accountId ?? null,
        attempt: record.attempt,
        status: record.status,
        responseStatus: record.responseStatus ?? null,
        error: record.error ?? null,
        nextRetryAt: record.nextRetryAt ?? null,
        createdAt: record.createdAt,
        deliveredAt: record.deliveredAt ?? null
      });
  }

  listWebhookDeliveries(limit = 100): WebhookDeliveryRecord[] {
    const rows = this.db
      .query(
        `select id, webhook_id, event_id, event_type, account_id, attempt, status, response_status, error, next_retry_at, created_at, delivered_at
         from webhook_deliveries order by created_at desc limit ?`
      )
      .all(limit) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      webhookId: String(row.webhook_id),
      eventId: String(row.event_id),
      eventType: String(row.event_type),
      accountId: row.account_id ? String(row.account_id) : undefined,
      attempt: Number(row.attempt),
      status: row.status as WebhookDeliveryRecord["status"],
      responseStatus: row.response_status ? Number(row.response_status) : undefined,
      error: row.error ? String(row.error) : undefined,
      nextRetryAt: row.next_retry_at ? String(row.next_retry_at) : undefined,
      createdAt: String(row.created_at),
      deliveredAt: row.delivered_at ? String(row.delivered_at) : undefined
    }));
  }

  getWebhookDelivery(deliveryId: string): WebhookDeliveryRecord | undefined {
    const row = this.db
      .query(
        `select id, webhook_id, event_id, event_type, account_id, attempt, status, response_status, error, next_retry_at, created_at, delivered_at
         from webhook_deliveries where id = ? limit 1`
      )
      .get(deliveryId) as Record<string, unknown> | null;
    if (!row) {
      return undefined;
    }

    return {
      id: String(row.id),
      webhookId: String(row.webhook_id),
      eventId: String(row.event_id),
      eventType: String(row.event_type),
      accountId: row.account_id ? String(row.account_id) : undefined,
      attempt: Number(row.attempt),
      status: row.status as WebhookDeliveryRecord["status"],
      responseStatus: row.response_status ? Number(row.response_status) : undefined,
      error: row.error ? String(row.error) : undefined,
      nextRetryAt: row.next_retry_at ? String(row.next_retry_at) : undefined,
      createdAt: String(row.created_at),
      deliveredAt: row.delivered_at ? String(row.delivered_at) : undefined
    };
  }

  private migrate(): void {
    this.db.exec(`
      create table if not exists accounts (
        id text primary key,
        label text not null,
        enabled integer not null,
        state text not null,
        qr_code text,
        last_error text,
        last_seen_at text
      );

      create table if not exists domain_events (
        id text primary key,
        type text not null,
        timestamp text not null,
        source_module text not null,
        account_id text,
        correlation_id text,
        payload_json text not null
      );

      create table if not exists messages (
        message_id text primary key,
        account_id text not null,
        chat_id text not null,
        sender text not null,
        body text not null,
        timestamp text not null,
        from_me integer not null,
        has_media integer not null,
        media_mime_type text,
        media_filename text,
        raw_json text
      );

      create table if not exists outbound_messages (
        id text primary key,
        account_id text not null,
        chat_id text not null,
        text text not null,
        status text not null,
        created_at text not null,
        error text
      );

      create table if not exists workflows (
        id text primary key,
        version integer not null,
        definition_json text not null,
        updated_at text not null
      );

      create table if not exists workflow_executions (
        id text primary key,
        workflow_id text not null,
        workflow_version integer not null,
        account_id text,
        event_type text not null,
        status text not null,
        steps_json text not null,
        started_at text not null,
        finished_at text,
        error text
      );

      create table if not exists webhooks (
        id text primary key,
        url text not null,
        secret text,
        enabled integer not null,
        event_types_json text not null,
        account_ids_json text,
        headers_json text,
        updated_at text not null
      );

      create table if not exists webhook_deliveries (
        id text primary key,
        webhook_id text not null,
        event_id text not null,
        event_type text not null,
        account_id text,
        attempt integer not null,
        status text not null,
        response_status integer,
        error text,
        next_retry_at text,
        created_at text not null,
        delivered_at text
      );
    `);
  }
}
