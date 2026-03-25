import type { WatoModule } from "@wato/sdk";
import { capabilityNames } from "@wato/sdk";
import type { WorkflowEngine } from "@wato/workflow-engine";
import { resolveWorkflowConfig } from "@wato/workflow-sdk";

export const utilityActionModule: WatoModule = {
  manifest: {
    name: "action-utility",
    version: "0.1.0",
    kind: "workflow-action",
    dependsOn: ["workflow-core"],
    accountScopeSupport: "cross-account"
  },
  register(context) {
    const engine = context.capabilities.resolve<WorkflowEngine>(capabilityNames.workflowEngine);
    const workflowRegistry = context.capabilities.resolve<{ registerActionType?: (type: string) => void }>("workflow-registry");
    const registerAction = (type: string, execute: Parameters<typeof engine.registerAction>[0]["execute"]) => {
      workflowRegistry.registerActionType?.(type);
      engine.registerAction({
        type,
        execute: (execution, config) => execute(execution, resolveWorkflowConfig(config, execution))
      });
    };

    registerAction("data.set", async (_execution, config) => {
      if (Object.prototype.hasOwnProperty.call(config, "value")) {
        return { ok: true, output: config.value };
      }

      if (Object.prototype.hasOwnProperty.call(config, "data")) {
        return { ok: true, output: config.data };
      }

      return { ok: true, output: config };
    });

    registerAction("data.coalesce", async (_execution, config) => {
      const values = Array.isArray(config.values) ? config.values : [];
      const selected = values.find(isMeaningfulValue);
      if (selected !== undefined) {
        return { ok: true, output: selected };
      }

      if (Object.prototype.hasOwnProperty.call(config, "fallback")) {
        return { ok: true, output: config.fallback };
      }

      return { ok: false, error: asString(config.error) ?? "data.coalesce did not find a non-empty value" };
    });

    registerAction("data.assert", async (_execution, config) => {
      const message = asString(config.message) ?? "data.assert failed";

      if (Object.prototype.hasOwnProperty.call(config, "exists") && !isMeaningfulValue(config.exists)) {
        return { ok: false, error: message };
      }

      if (Object.prototype.hasOwnProperty.call(config, "value") && !Boolean(config.value)) {
        return { ok: false, error: message };
      }

      if (typeof config.equals === "object" && config.equals !== null) {
        const equals = config.equals as { left?: unknown; right?: unknown };
        if (!Object.is(equals.left, equals.right)) {
          return { ok: false, error: message };
        }
      }

      if (typeof config.matches === "object" && config.matches !== null) {
        const matches = config.matches as { value?: unknown; pattern?: unknown; flags?: unknown };
        if (typeof matches.pattern !== "string" || !new RegExp(matches.pattern, typeof matches.flags === "string" ? matches.flags : undefined).test(String(matches.value ?? ""))) {
          return { ok: false, error: message };
        }
      }

      return { ok: true, output: config.passThrough };
    });

    return {};
  }
};

function isMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
