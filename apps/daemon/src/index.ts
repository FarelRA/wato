import { utilityActionModule } from "@wato/action-utility";
import { createWatoConfig } from "@wato/config";
import { Kernel } from "@wato/kernel";
import { createLogger } from "@wato/logging";
import { sendMessageActionModule } from "@wato/action-send-message";
import { apiServerModule } from "@wato/api-server";
import { healthMonitorModule } from "@wato/health-monitor";
import { storageArchiveModule } from "@wato/storage-archive";
import { messageTriggerModule } from "@wato/trigger-message";
import { webhookRuntimeModule } from "@wato/webhook-runtime";
import { whatsappCoreModule } from "@wato/whatsapp-core";
import { workflowCoreModule } from "@wato/workflow-core";

let activeKernel: Kernel | undefined;
let activeLogger = createLogger({ service: "daemon", level: "info" });

async function main(): Promise<void> {
  const config = await createWatoConfig();
  const logger = createLogger({ service: "daemon", level: config.logLevel });
  activeLogger = logger;
  const kernel = new Kernel({
    appName: "wato-daemon",
    logger,
    config,
    modules: [
      whatsappCoreModule,
      storageArchiveModule,
      workflowCoreModule,
      messageTriggerModule,
      utilityActionModule,
      sendMessageActionModule,
      webhookRuntimeModule,
      apiServerModule,
      healthMonitorModule
    ]
  });
  activeKernel = kernel;

  await kernel.start();
  logger.info("daemon ready", {
    accounts: config.accounts.map((account) => account.id),
    modules: kernel.listModuleNames()
  });

  const stop = async () => {
    logger.info("shutting down daemon");
    await kernel.stop();
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

void main().catch(async (error) => {
  activeLogger.error("daemon crashed", { error: error instanceof Error ? error.message : String(error) });
  await activeKernel?.stop();
  process.exit(1);
});
