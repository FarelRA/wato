import type {
  ActionProvider,
  ConditionProvider,
  TriggerProvider,
  TriggerMatchResult,
  WorkflowCatalog,
  WorkflowDefinition,
  WorkflowExecutionContext
} from "@wato/workflow-sdk";
import { resolveWorkflowConfig } from "@wato/workflow-sdk";
import type { DomainEvent, StorageEngine, WorkflowExecutionRecord } from "@wato/sdk";

export class WorkflowEngine implements WorkflowCatalog {
  private readonly triggers = new Map<string, TriggerProvider>();
  private readonly conditions = new Map<string, ConditionProvider>();
  private readonly actions = new Map<string, ActionProvider>();

  constructor(private readonly storage?: StorageEngine) {}

  registerTrigger(provider: TriggerProvider): void {
    this.triggers.set(provider.type, provider);
  }

  registerCondition(provider: ConditionProvider): void {
    this.conditions.set(provider.type, provider);
  }

  registerAction(provider: ActionProvider): void {
    this.actions.set(provider.type, provider);
  }

  async execute(workflow: WorkflowDefinition, event: DomainEvent, input: unknown, accountId?: string): Promise<{ ok: boolean; steps: string[]; execution: WorkflowExecutionRecord }> {
    const trigger = this.triggers.get(workflow.trigger.type);
    if (!trigger) {
      throw new Error(`Missing trigger provider: ${workflow.trigger.type}`);
    }

    const execution: WorkflowExecutionRecord = {
      id: crypto.randomUUID(),
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      accountId,
      eventType: event.type,
      status: "skipped",
      steps: [],
      startedAt: new Date().toISOString()
    };

    let triggerResult: TriggerMatchResult;
    try {
      triggerResult = normalizeTriggerMatch(await trigger.match(input, workflow.trigger.config));
    } catch (error) {
      execution.status = "failed";
      execution.error = `trigger_error:${toErrorMessage(error)}`;
      execution.steps = [`trigger_error:${workflow.trigger.type}`];
      execution.finishedAt = new Date().toISOString();
      this.storage?.saveWorkflowExecution(execution);
      return { ok: false, steps: execution.steps, execution };
    }

    if (!triggerResult.matched) {
      execution.steps = ["trigger_not_matched"];
      execution.finishedAt = new Date().toISOString();
      this.storage?.saveWorkflowExecution(execution);
      return { ok: false, steps: execution.steps, execution };
    }

    const context: WorkflowExecutionContext = {
      workflow,
      executionId: execution.id,
      accountId,
      input,
      eventType: event.type,
      event,
      trigger: {
        data: triggerResult.data
      },
      actionResults: []
    };

    for (const conditionBinding of workflow.conditions) {
      const condition = this.conditions.get(conditionBinding.type);
      if (!condition) {
        throw new Error(`Missing condition provider: ${conditionBinding.type}`);
      }

      let matched: boolean;
      try {
        matched = await condition.evaluate(input, resolveWorkflowConfig(conditionBinding.config, context));
      } catch (error) {
        execution.status = "failed";
        execution.error = `condition_error:${conditionBinding.type}:${toErrorMessage(error)}`;
        execution.steps = [`condition_error:${conditionBinding.type}`];
        execution.finishedAt = new Date().toISOString();
        this.storage?.saveWorkflowExecution(execution);
        return { ok: false, steps: execution.steps, execution };
      }

      if (!matched) {
        execution.steps = [`condition_failed:${conditionBinding.type}`];
        execution.finishedAt = new Date().toISOString();
        this.storage?.saveWorkflowExecution(execution);
        return { ok: false, steps: execution.steps, execution };
      }
    }

    const steps: string[] = [];
    for (const actionBinding of workflow.actions) {
      const action = this.actions.get(actionBinding.type);
      if (!action) {
        throw new Error(`Missing action provider: ${actionBinding.type}`);
      }

      let result;
      try {
        result = await action.execute(context, actionBinding.config);
      } catch (error) {
        result = { ok: false, error: toErrorMessage(error) };
      }

      context.actionResults.push({
        id: actionBinding.id,
        type: actionBinding.type,
        ok: result.ok,
        output: result.output,
        error: result.error
      });
      steps.push(result.ok ? `action_ok:${actionBinding.type}` : `action_failed:${actionBinding.type}`);

      if (!result.ok && workflow.policy?.errorMode !== "continue") {
        execution.status = "failed";
        execution.error = result.error;
        execution.steps = steps;
        execution.finishedAt = new Date().toISOString();
        this.storage?.saveWorkflowExecution(execution);
        return { ok: false, steps, execution };
      }
    }

    execution.status = "completed";
    execution.steps = steps;
    execution.finishedAt = new Date().toISOString();
    this.storage?.saveWorkflowExecution(execution);
    return { ok: true, steps, execution };
  }
}

function normalizeTriggerMatch(result: boolean | TriggerMatchResult): TriggerMatchResult {
  if (typeof result === "boolean") {
    return { matched: result };
  }

  return result;
}

export function validateWorkflowDefinition(
  workflow: WorkflowDefinition,
  options?: { knownTriggers?: string[]; knownConditions?: string[]; knownActions?: string[] }
): { ok: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!workflow.id) issues.push("workflow.id is required");
  if (!workflow.name) issues.push("workflow.name is required");
  if (!workflow.trigger?.type) issues.push("workflow.trigger.type is required");
  if (!workflow.accountScope || !["all", "single", "set"].includes(workflow.accountScope.mode)) {
    issues.push("workflow.accountScope.mode must be one of all, single, set");
  }
  if (workflow.accountScope?.mode === "single" && !workflow.accountScope.accountId) {
    issues.push("workflow.accountScope.accountId is required for single scope");
  }
  if (workflow.accountScope?.mode === "set" && (!Array.isArray(workflow.accountScope.accountIds) || workflow.accountScope.accountIds.length === 0)) {
    issues.push("workflow.accountScope.accountIds must contain at least one account for set scope");
  }
  if (!Array.isArray(workflow.conditions)) issues.push("workflow.conditions must be an array");
  if (!Array.isArray(workflow.actions) || workflow.actions.length === 0) {
    issues.push("workflow.actions must contain at least one action");
  }

  if (options?.knownTriggers && workflow.trigger?.type && !options.knownTriggers.includes(workflow.trigger.type)) {
    issues.push(`unknown trigger type: ${workflow.trigger.type}`);
  }

  for (const condition of workflow.conditions ?? []) {
    if (!condition.type) {
      issues.push("workflow.conditions[].type is required");
      continue;
    }
    if (options?.knownConditions && !options.knownConditions.includes(condition.type)) {
      issues.push(`unknown condition type: ${condition.type}`);
    }
  }

  const actionIds = new Set<string>();
  for (const action of workflow.actions ?? []) {
    if (!action.type) {
      issues.push("workflow.actions[].type is required");
      continue;
    }
    if (options?.knownActions && !options.knownActions.includes(action.type)) {
      issues.push(`unknown action type: ${action.type}`);
    }
    if (action.id) {
      if (actionIds.has(action.id)) {
        issues.push(`duplicate action id: ${action.id}`);
      }
      actionIds.add(action.id);
    }
  }

  return { ok: issues.length === 0, issues };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
