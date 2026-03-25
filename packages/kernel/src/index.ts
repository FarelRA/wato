import { AccountManager, accountManagerCapability } from "@wato/account-manager";
import { InMemoryEventBus } from "@wato/event-bus";
import { validateModuleGraph } from "@wato/module-loader";
import type {
  AccountRecord,
  CapabilityRegistry,
  DomainEvent,
  KernelOptions,
  ModuleContext,
  ModuleRegistration,
  StorageEngine,
  WatoModule
} from "@wato/sdk";
import { capabilityNames } from "@wato/sdk";
import { SqliteStorageEngine } from "@wato/storage-sqlite";
import { WorkflowEngine } from "@wato/workflow-engine";

class InMemoryCapabilities implements CapabilityRegistry {
  private readonly values = new Map<string, unknown>();

  register<T>(name: string, value: T): void {
    this.values.set(name, value);
  }

  resolve<T>(name: string): T {
    if (!this.values.has(name)) {
      throw new Error(`Missing capability: ${name}`);
    }

    return this.values.get(name) as T;
  }

  has(name: string): boolean {
    return this.values.has(name);
  }

  list(): string[] {
    return [...this.values.keys()].sort();
  }
}

export class Kernel {
  private readonly capabilities = new InMemoryCapabilities();
  private readonly eventBus = new InMemoryEventBus();
  private readonly accountManager: AccountManager;
  private readonly storage: StorageEngine;
  private readonly workflowEngine: WorkflowEngine;
  private readonly registrations: Array<{ module: WatoModule; registration: ModuleRegistration }> = [];
  private readonly startedAt = Date.now();
  private status: "starting" | "ready" | "degraded" | "stopped" = "starting";

  constructor(private readonly options: KernelOptions) {
    validateModuleGraph(options.modules);
    this.accountManager = new AccountManager(options.config.accounts);
    this.storage = new SqliteStorageEngine(options.config.dataDir);
    this.workflowEngine = new WorkflowEngine(this.storage);
    this.capabilities.register(accountManagerCapability, this.accountManager);
    this.capabilities.register(capabilityNames.workflowEngine, this.workflowEngine);
    this.capabilities.register(capabilityNames.storage, this.storage);
    this.capabilities.register(capabilityNames.systemController, {
      getStatus: () => ({
        name: options.appName,
        status: this.status,
        uptimeMs: Date.now() - this.startedAt,
        moduleCount: this.options.modules.length,
        accountCount: this.accountManager.list().length
      })
    });
    this.eventBus.subscribe("*", async (event) => {
      this.storage.saveEvent(event as DomainEvent);
    });
    this.syncAccounts();
  }

  listModuleNames(): string[] {
    return this.options.modules.map((module) => module.manifest.name);
  }

  async start(): Promise<void> {
    const context: ModuleContext = {
      appName: this.options.appName,
      logger: this.options.logger,
      config: this.options.config,
      capabilities: this.capabilities,
      events: this.eventBus
    };

    for (const module of this.options.modules) {
      const registration = await module.register(context);
      this.registrations.push({ module, registration });
    }

    for (const { module, registration } of this.registrations) {
      await registration.start?.();
      this.options.logger.info("module started", { module: module.manifest.name });
    }

    this.status = "ready";
    this.syncAccounts();
  }

  async stop(): Promise<void> {
    this.status = "stopped";
    for (const { module, registration } of [...this.registrations].reverse()) {
      await registration.stop?.();
      this.options.logger.info("module stopped", { module: module.manifest.name });
    }
    this.syncAccounts();
  }

  private syncAccounts(): void {
    this.storage.upsertAccounts(this.accountManager.list() as AccountRecord[]);
  }
}
