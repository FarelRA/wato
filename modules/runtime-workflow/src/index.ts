import type { DomainEvent, StorageEngine, WatoModule, WorkflowRegistry } from "@wato/core";
import { capabilityNames } from "@wato/core";
import { validateWorkflowDefinition, type WorkflowEngine } from "@wato/workflow-engine";
import type { WorkflowDefinition } from "@wato/workflow-types";

export const runtimeWorkflowModule: WatoModule = {
  manifest: {
    name: "runtime-workflow",
    version: "0.1.0",
    kind: "core",
    dependsOn: ["runtime-whatsapp"],
    provides: [capabilityNames.workflowRegistry],
    accountScopeSupport: "cross-account"
  },
  register(context) {
    const engine = context.capabilities.resolve<WorkflowEngine>(capabilityNames.workflowEngine);
    const storage = context.capabilities.resolve<StorageEngine>(capabilityNames.storage);
    const configuredWorkflows = context.config.workflows as WorkflowDefinition[];
    const triggerTypes: string[] = [];
    const conditionTypes: string[] = [];
    const actionTypes: string[] = [];
    let workflows = storage.listWorkflows() as WorkflowDefinition[];
    if (workflows.length === 0) {
      workflows = configuredWorkflows;
      for (const workflow of workflows) {
        storage.saveWorkflow(workflow);
      }
    }

    const registerTriggerType = (type: string) => {
      if (!triggerTypes.includes(type)) {
        triggerTypes.push(type);
      }
    };

    const registerCondition = (type: string, evaluate: (input: unknown, config: Record<string, unknown>) => boolean | Promise<boolean>) => {
      conditionTypes.push(type);
      engine.registerCondition({ type, evaluate });
    };

    const registerActionType = (type: string) => {
      if (!actionTypes.includes(type)) {
        actionTypes.push(type);
      }
    };

    const workflowRegistry: WorkflowRegistry = {
      list: () => [...workflows],
      upsert: (workflow: WorkflowDefinition) => {
        const validation = validateWorkflowDefinition(workflow, {
          knownTriggers: triggerTypes,
          knownConditions: conditionTypes,
          knownActions: actionTypes
        });
        if (!validation.ok) {
          throw new Error(`Workflow validation failed: ${validation.issues.join(", ")}`);
        }

        const index = workflows.findIndex((item) => item.id === workflow.id);
        if (index >= 0) {
          workflows[index] = workflow;
        } else {
          workflows.push(workflow);
        }
        storage.saveWorkflow(workflow);
      },
      validate: (workflow: WorkflowDefinition) => validateWorkflowDefinition(workflow, {
        knownTriggers: triggerTypes,
        knownConditions: conditionTypes,
        knownActions: actionTypes
      }),
      listProviderTypes: () => ({ triggers: [...triggerTypes], conditions: [...conditionTypes], actions: [...actionTypes] }),
      registerTriggerType,
      registerActionType,
      test: async ({ workflow, workflowId, eventType, accountId, payload }) => {
        const resolved = (workflowId ? workflows.find((item) => item.id === workflowId) : workflow) as WorkflowDefinition | undefined;
        if (!resolved) {
          throw new Error("Workflow not found for test execution");
        }

        const validation = validateWorkflowDefinition(resolved, {
          knownTriggers: triggerTypes,
          knownConditions: conditionTypes,
          knownActions: actionTypes
        });
        if (!validation.ok) {
          throw new Error(`Workflow validation failed: ${validation.issues.join(", ")}`);
        }

        return engine.execute(
          resolved,
          {
            eventId: crypto.randomUUID(),
            type: eventType,
            timestamp: new Date().toISOString(),
            sourceModule: "runtime-workflow",
            accountId,
            payload
          },
          payload,
          accountId
        );
      }
    };

    context.capabilities.register(capabilityNames.workflowRegistry, workflowRegistry);

    registerCondition("message.textContains", (input, config) => {
        const message = input as { body?: string };
        const contains = typeof config.contains === "string" ? config.contains : "";
        return String(message.body ?? "").includes(contains);
    });

    registerCondition("message.from", (input, config) => {
        const message = input as { from?: string };
        return typeof config.from === "string" ? message.from === config.from : true;
    });

    registerCondition("message.hasMedia", (input, config) => {
        const message = input as { hasMedia?: boolean };
        const expected = typeof config.expected === "boolean" ? config.expected : true;
        return Boolean(message.hasMedia) === expected;
    });

    registerCondition("message.type", (input, config) => {
      const message = input as { type?: string };
      return typeof config.type === "string" ? message.type === config.type : true;
    });

    registerCondition("message.chatId", (input, config) => {
      const message = input as { chatId?: string };
      return typeof config.chatId === "string" ? message.chatId === config.chatId : true;
    });

    registerCondition("message.isForwarded", (input, config) => {
      const message = input as { isForwarded?: boolean };
      const expected = typeof config.expected === "boolean" ? config.expected : true;
      return Boolean(message.isForwarded) === expected;
    });

    registerCondition("message.isStatus", (input, config) => {
      const message = input as { isStatus?: boolean };
      const expected = typeof config.expected === "boolean" ? config.expected : true;
      return Boolean(message.isStatus) === expected;
    });

    registerCondition("message.mentionsAny", (input, config) => {
      const message = input as { mentionedIds?: string[] };
      const expected = Array.isArray(config.contactIds) ? (config.contactIds as string[]) : [];
      return expected.length === 0 ? true : expected.some((id) => message.mentionedIds?.includes(id));
    });

    registerCondition("message.bodyMatches", (input, config) => {
      const message = input as { body?: string };
      const pattern = typeof config.pattern === "string" ? config.pattern : undefined;
      if (!pattern) {
        return true;
      }
      return new RegExp(pattern, typeof config.flags === "string" ? config.flags : undefined).test(String(message.body ?? ""));
    });

  
    const unsubscribe = context.events.subscribe("*", async (event) => {
      for (const workflow of workflows.filter((item) => item.enabled)) {
        if (workflow.trigger.type !== event.type || !matchesAccountScope(workflow, event.accountId)) {
          continue;
        }

        const result = await engine.execute(workflow, event as DomainEvent, event.payload, event.accountId);
        context.logger.info("workflow evaluated", {
          workflowId: workflow.id,
          accountId: event.accountId,
          result
        });
      }
    });

    return {
      async start() {
        context.logger.info("workflow core ready", { workflows: workflows.map((workflow) => workflow.id) });
      },
      async stop() {
        unsubscribe();
      }
    };
  }
};

function matchesAccountScope(workflow: WorkflowDefinition, accountId?: string): boolean {
  if (workflow.accountScope.mode === "all") {
    return true;
  }

  if (!accountId) {
    return false;
  }

  if (workflow.accountScope.mode === "single") {
    return workflow.accountScope.accountId === accountId;
  }

  return workflow.accountScope.accountIds.includes(accountId);
}
