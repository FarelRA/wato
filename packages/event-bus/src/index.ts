import type { DomainEvent, EventPublisher } from "@wato/core";

type EventHandler = (event: DomainEvent<unknown>) => Promise<void> | void;

export class InMemoryEventBus implements EventPublisher {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    const handlers = new Set<EventHandler>([
      ...(this.handlers.get(event.type) ?? []),
      ...(this.handlers.get("*") ?? [])
    ]);

    for (const handler of handlers) {
      await handler(event as DomainEvent<unknown>);
    }
  }

  subscribe<TPayload>(eventType: string, handler: (event: DomainEvent<TPayload>) => Promise<void> | void): () => void {
    const handlers = this.handlers.get(eventType) ?? new Set<EventHandler>();
    handlers.add(handler as EventHandler);
    this.handlers.set(eventType, handlers);

    return () => {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }
}
