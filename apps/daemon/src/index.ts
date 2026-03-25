import { actionDataModule } from "@wato/action-data";
import { actionMessageModule } from "@wato/action-message";
import { createWatoConfig } from "@wato/config";
import { Kernel } from "@wato/kernel";
import type { KernelConfig, Logger } from "@wato/core";
import { createLogger } from "@wato/logging";
import { runtimeApiModule } from "@wato/runtime-api";
import { runtimeHealthModule } from "@wato/runtime-health";
import { runtimeWebhookModule } from "@wato/runtime-webhook";
import { runtimeWhatsAppModule } from "@wato/runtime-whatsapp";
import { runtimeWorkflowModule } from "@wato/runtime-workflow";
import { triggerMessageModule } from "@wato/trigger-message";

const shutdownSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGQUIT"];
const reloadSignals: NodeJS.Signals[] = ["SIGHUP"];
const shutdownTimeoutMs = 15_000;

class DaemonProcess {
  private kernel: Kernel | undefined;
  private logger: Logger = createLogger({ service: "daemon", level: "info" });
  private stoppingPromise: Promise<void> | undefined;
  private reloadPromise: Promise<void> | undefined;
  private state: "idle" | "starting" | "running" | "reloading" | "stopping" | "stopped" = "idle";

  async start(): Promise<void> {
    if (this.state === "starting" || this.state === "running") {
      return;
    }

    this.state = "starting";
    const config = await createWatoConfig();
    const { kernel, logger } = this.createKernel(config);
    this.kernel = kernel;
    this.logger = logger;

    await kernel.start();
    this.state = "running";
    logger.info("daemon ready", {
      accounts: config.accounts.map((account) => account.id),
      modules: kernel.listModuleNames()
    });
  }

  async reload(reason: string): Promise<void> {
    if (this.state === "stopping" || this.state === "stopped") {
      this.logger.warn("ignoring reload while stopping", { reason });
      return;
    }

    if (this.reloadPromise) {
      this.logger.info("reload already in progress", { reason });
      return this.reloadPromise;
    }

    this.reloadPromise = (async () => {
      const previousKernel = this.kernel;
      const previousLogger = this.logger;
      this.state = "reloading";
      previousLogger.info("reloading daemon config", { reason });

      try {
        const config = await createWatoConfig();
        const { kernel, logger } = this.createKernel(config);

        if (previousKernel) {
          await previousKernel.stop();
        }

        this.kernel = kernel;
        this.logger = logger;
        await kernel.start();
        this.state = "running";
        logger.info("daemon reloaded", {
          reason,
          accounts: config.accounts.map((account) => account.id),
          modules: kernel.listModuleNames()
        });
      } catch (error) {
        this.kernel = undefined;
        this.logger = previousLogger;
        this.state = "stopped";
        previousLogger.error("daemon reload failed", { reason, error: toErrorMessage(error) });
        throw error;
      } finally {
        this.reloadPromise = undefined;
      }
    })();

    return this.reloadPromise;
  }

  async stop(reason: string): Promise<void> {
    if (this.state === "stopped") {
      return;
    }

    if (this.stoppingPromise) {
      return this.stoppingPromise;
    }

    this.stoppingPromise = (async () => {
      this.state = "stopping";
      this.logger.info("shutting down daemon", { reason });

      try {
        await this.reloadPromise;
      } catch {
        // reload failures are already logged; shutdown continues.
      }

      try {
        await this.kernel?.stop();
      } finally {
        this.kernel = undefined;
        this.state = "stopped";
      }
    })();

    return this.stoppingPromise;
  }

  private createKernel(config: KernelConfig): { kernel: Kernel; logger: Logger } {
    const logger = createLogger({ service: "daemon", level: config.logLevel });
    const kernel = new Kernel({
      appName: "wato-daemon",
      logger,
      config,
      requestReload: (reason) => this.reload(reason),
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

    return { kernel, logger };
  }
}

async function main(): Promise<void> {
  const daemon = new DaemonProcess();
  installProcessHandlers(daemon);
  await daemon.start();
}

function installProcessHandlers(daemon: DaemonProcess): void {
  for (const signal of shutdownSignals) {
    process.once(signal, () => {
      const timeout = scheduleForcedExit(signal);
      void daemon.stop(signal).then(
        () => {
          clearTimeout(timeout);
          process.exitCode = 0;
        },
        (error) => {
          clearTimeout(timeout);
          console.error(error);
          process.exitCode = 1;
        }
      );
    });
  }

  for (const signal of reloadSignals) {
    process.on(signal, () => {
      void daemon.reload(signal).catch(async (error) => {
        console.error(error);
        const timeout = scheduleForcedExit(`${signal}:reload-failed`);
        process.exitCode = 1;
        await daemon.stop(`${signal}:reload-failed`);
        clearTimeout(timeout);
      });
    });
  }

  process.on("uncaughtException", (error) => {
    const timeout = scheduleForcedExit("uncaughtException");
    void daemon.stop("uncaughtException").finally(() => {
      clearTimeout(timeout);
      console.error(error);
      process.exitCode = 1;
    });
  });

  process.on("unhandledRejection", (error) => {
    const timeout = scheduleForcedExit("unhandledRejection");
    void daemon.stop("unhandledRejection").finally(() => {
      clearTimeout(timeout);
      console.error(error);
      process.exitCode = 1;
    });
  });
}

function scheduleForcedExit(reason: string): NodeJS.Timeout {
  return setTimeout(() => {
    console.error(`Forced daemon exit after timeout: ${reason}`);
    process.exit(process.exitCode ?? 1);
  }, shutdownTimeoutMs).unref();
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
