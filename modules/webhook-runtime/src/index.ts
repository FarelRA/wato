import { createHmac } from "node:crypto";
import type { DomainEvent, StorageEngine, WebhookDefinition, WebhookDeliveryRecord, WebhookRegistry, WatoModule } from "@wato/sdk";
import { capabilityNames } from "@wato/sdk";

export const webhookRuntimeModule: WatoModule = {
  manifest: {
    name: "webhook-runtime",
    version: "0.1.0",
    kind: "integration",
    dependsOn: ["storage-archive"],
    provides: [capabilityNames.webhookRegistry],
    accountScopeSupport: "cross-account"
  },
  register(context) {
    const storage = context.capabilities.resolve<StorageEngine>(capabilityNames.storage);
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let webhooks = storage.listWebhooks();
    if (webhooks.length === 0) {
      webhooks = context.config.webhooks.endpoints;
      for (const webhook of webhooks) {
        storage.saveWebhook(webhook);
      }
    }

    const registry: WebhookRegistry = {
      list: () => [...webhooks],
      upsert: (definition) => {
        const index = webhooks.findIndex((item) => item.id === definition.id);
        if (index >= 0) {
          webhooks[index] = definition;
        } else {
          webhooks.push(definition);
        }

        storage.saveWebhook(definition);
      },
      remove: (webhookId) => {
        webhooks = webhooks.filter((item) => item.id !== webhookId);
        storage.deleteWebhook(webhookId);
      },
      replayDelivery: async (deliveryId) => {
        const delivery = storage.getWebhookDelivery(deliveryId);
        if (!delivery) {
          throw new Error(`Unknown webhook delivery: ${deliveryId}`);
        }

        const webhook = webhooks.find((item) => item.id === delivery.webhookId);
        if (!webhook) {
          throw new Error(`Unknown webhook for delivery: ${delivery.webhookId}`);
        }

        const event = storage.getEvent(delivery.eventId);
        if (!event) {
          throw new Error(`Unknown event for delivery: ${delivery.eventId}`);
        }

        queueDelivery({ webhook, event, attempt: 1, context, storage, timers });
      }
    };

    context.capabilities.register(capabilityNames.webhookRegistry, registry);

    const unsubscribe = context.events.subscribe("*", async (event) => {
      if (!context.config.webhooks.enabled) {
        return;
      }

      for (const webhook of webhooks) {
        if (!matchesWebhook(webhook, event)) {
          continue;
        }

        queueDelivery({ webhook, event, attempt: 1, context, storage, timers });
      }
    });

    return {
      async start() {
        context.logger.info("webhook runtime ready", { webhooks: webhooks.length });
      },
      async stop() {
        unsubscribe();
        for (const timer of timers) {
          clearTimeout(timer);
        }
        timers.clear();
      }
    };
  }
};

function queueDelivery(input: {
  webhook: WebhookDefinition;
  event: DomainEvent;
  attempt: number;
  context: Parameters<WatoModule["register"]>[0];
  storage: StorageEngine;
  timers: Set<ReturnType<typeof setTimeout>>;
}): void {
  const { webhook, event, attempt, context, storage, timers } = input;
  const run = async () => {
    const record: WebhookDeliveryRecord = {
      id: crypto.randomUUID(),
      webhookId: webhook.id,
      eventId: event.eventId,
      eventType: event.type,
      accountId: event.accountId,
      attempt,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    try {
      const payload = JSON.stringify({ event });
      const signature = webhook.secret ? signPayload(payload, webhook.secret) : undefined;
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-wato-event-id": event.eventId,
          "x-wato-event-type": event.type,
          ...(signature ? { "x-wato-signature": signature } : {}),
          ...(webhook.headers ?? {})
        },
        body: payload
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with ${response.status}`);
      }

      record.status = "delivered";
      record.responseStatus = response.status;
      record.deliveredAt = new Date().toISOString();
      storage.saveWebhookDelivery(record);
    } catch (error) {
      record.status = "failed";
      record.error = error instanceof Error ? error.message : String(error);
      record.nextRetryAt = nextRetryAt(context.config.webhooks.baseDelayMs, attempt, context.config.webhooks.maxAttempts);
      storage.saveWebhookDelivery(record);

      if (attempt < context.config.webhooks.maxAttempts) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          queueDelivery({ webhook, event, attempt: attempt + 1, context, storage, timers });
        }, context.config.webhooks.baseDelayMs * attempt);
        timers.add(timer);
      }
    }
  };

  void run();
}

function matchesWebhook(webhook: WebhookDefinition, event: DomainEvent): boolean {
  if (!webhook.enabled) {
    return false;
  }

  if (!webhook.eventTypes.includes("*") && !webhook.eventTypes.includes(event.type)) {
    return false;
  }

  if (webhook.accountIds?.length && (!event.accountId || !webhook.accountIds.includes(event.accountId))) {
    return false;
  }

  return true;
}

function signPayload(payload: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

function nextRetryAt(baseDelayMs: number, attempt: number, maxAttempts: number): string | undefined {
  if (attempt >= maxAttempts) {
    return undefined;
  }

  return new Date(Date.now() + baseDelayMs * attempt).toISOString();
}

export const webhookRuntimeInternals = {
  signPayload,
  matchesWebhook
};
