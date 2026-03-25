import type { MessageEnvelope, StorageEngine, WatoModule } from "@wato/sdk";
import { capabilityNames } from "@wato/sdk";

export const storageArchiveModule: WatoModule = {
  manifest: {
    name: "storage-archive",
    version: "0.1.0",
    kind: "utility",
    dependsOn: ["whatsapp-core"],
    provides: ["archived-messages"],
    accountScopeSupport: "cross-account"
  },
  register(context) {
    const storage = context.capabilities.resolve<StorageEngine>(capabilityNames.storage);
    context.capabilities.register("archived-messages", {
      list: (accountId?: string, limit?: number) => storage.listMessages(accountId, limit)
    });

    const unsubscribe = context.events.subscribe<MessageEnvelope>("message.received", async (event) => {
      storage.saveInboundMessage(event.payload);
      context.logger.info("archived inbound message", {
        accountId: event.accountId,
        messageId: event.payload.messageId
      });
    });

    return {
      async stop() {
        unsubscribe();
      }
    };
  }
};
