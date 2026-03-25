import { actionDataModule } from "@wato/action-data";
import { createWatoConfig } from "@wato/config";
import { Kernel } from "@wato/kernel";
import { createLogger } from "@wato/logging";
import { actionMessageModule } from "@wato/action-message";
import { runtimeApiModule } from "@wato/runtime-api";
import { runtimeHealthModule } from "@wato/runtime-health";
import { triggerMessageModule } from "@wato/trigger-message";
import { runtimeWebhookModule } from "@wato/runtime-webhook";
import { runtimeWhatsAppModule } from "@wato/runtime-whatsapp";
import { runtimeWorkflowModule } from "@wato/runtime-workflow";

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
      runtimeWhatsAppModule,
      runtimeWorkflowModule,
      triggerMessageModule,
      actionDataModule,
      actionMessageModule,
      runtimeWebhookModule,
      runtimeApiModule,
      runtimeHealthModule
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
