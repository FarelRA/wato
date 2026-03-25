import { accountManagerCapability, type AccountManager } from "@wato/account-manager";
import type { SystemController, WatoModule } from "@wato/sdk";
import { capabilityNames } from "@wato/sdk";

export const healthMonitorModule: WatoModule = {
  manifest: {
    name: "health-monitor",
    version: "0.1.0",
    kind: "utility",
    provides: ["health-checks"],
    accountScopeSupport: "cross-account"
  },
  register(context) {
    const accounts = context.capabilities.resolve<AccountManager>(accountManagerCapability);
    const system = context.capabilities.resolve<SystemController>(capabilityNames.systemController);
    context.capabilities.register("health-checks", {
      ping: () => ({
        ok: true,
        service: context.appName,
        status: system.getStatus(),
        accounts: accounts.list().map((account) => ({ id: account.id, state: account.state }))
      })
    });

    return {
      async start() {
        context.logger.info("health monitor started");
      }
    };
  }
};
