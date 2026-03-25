import { accountRegistryCapability, type AccountRegistry } from "@wato/account-registry";
import type { SystemController, WatoModule } from "@wato/core";
import { capabilityNames } from "@wato/core";

export const runtimeHealthModule: WatoModule = {
  manifest: {
    name: "runtime-health",
    version: "0.1.0",
    kind: "utility",
    provides: [capabilityNames.healthChecks],
    accountScopeSupport: "cross-account"
  },
  register(context) {
    const accounts = context.capabilities.resolve<AccountRegistry>(accountRegistryCapability);
    const system = context.capabilities.resolve<SystemController>(capabilityNames.systemController);
    context.capabilities.register(capabilityNames.healthChecks, {
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
