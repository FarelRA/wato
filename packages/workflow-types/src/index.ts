import type { AccountScope, DomainEvent, MessageEnvelope } from "@wato/core";

export interface TriggerBinding {
  id?: string;
  type: string;
  config: Record<string, unknown>;
}

export interface ConditionBinding {
  id?: string;
  type: string;
  config: Record<string, unknown>;
}

export interface ActionBinding {
  id?: string;
  type: string;
  config: Record<string, unknown>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: number;
  enabled: boolean;
  accountScope: AccountScope;
  trigger: TriggerBinding;
  conditions: ConditionBinding[];
  actions: ActionBinding[];
  policy?: {
    concurrency?: "allow" | "dedupe" | "serialize";
    retries?: number;
    timeoutMs?: number;
    errorMode?: "stop" | "continue";
  };
}

export interface WorkflowExecutionContext {
  workflow: WorkflowDefinition;
  executionId: string;
  accountId?: string;
  input: unknown;
  eventType: string;
  event: DomainEvent;
  trigger: {
    data?: unknown;
  };
  actionResults: Array<{
    id?: string;
    type: string;
    ok: boolean;
    output?: unknown;
    error?: string;
  }>;
}

export interface TriggerMatchResult {
  matched: boolean;
  data?: unknown;
}

export interface TriggerProvider {
  type: string;
  match(input: unknown, config: Record<string, unknown>): boolean | TriggerMatchResult | Promise<boolean | TriggerMatchResult>;
}

export interface ConditionProvider {
  type: string;
  evaluate(input: unknown, config: Record<string, unknown>): boolean | Promise<boolean>;
}

export interface ActionResult {
  ok: boolean;
  output?: unknown;
  error?: string;
}

export interface ActionProvider {
  type: string;
  execute(context: WorkflowExecutionContext, config: Record<string, unknown>): Promise<ActionResult>;
}

export interface WorkflowCatalog {
  registerTrigger(provider: TriggerProvider): void;
  registerCondition(provider: ConditionProvider): void;
  registerAction(provider: ActionProvider): void;
}

export interface WorkflowRepository {
  list(): WorkflowDefinition[];
  replaceAll(workflows: WorkflowDefinition[]): void;
}

export interface MessageReceivedInput extends MessageEnvelope {
  text: string;
}

export function resolveWorkflowConfig(config: Record<string, unknown>, execution: WorkflowExecutionContext): Record<string, unknown> {
  return resolveWorkflowValue(config, buildWorkflowTemplateScope(execution)) as Record<string, unknown>;
}

export function buildWorkflowTemplateScope(execution: WorkflowExecutionContext): Record<string, unknown> {
  const input = asRecord(execution.input);
  const actionsById = Object.fromEntries(
    execution.actionResults
      .filter((result) => typeof result.id === "string" && result.id.length > 0)
      .map((result) => [result.id as string, result])
  );

  return {
    workflow: execution.workflow,
    execution: {
      id: execution.executionId,
      accountId: execution.accountId,
      eventType: execution.eventType
    },
    event: execution.event,
    trigger: execution.trigger,
    actions: execution.actionResults,
    actionsById,
    input,
    body: input.body,
    from: input.from,
    chatId: input.chatId,
    messageId: input.messageId,
    accountId: execution.accountId ?? input.accountId,
    eventType: execution.eventType
  };
}

function resolveWorkflowValue(value: unknown, scope: Record<string, unknown>): unknown {
  if (typeof value === "string") {
    return interpolateString(value, scope);
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveWorkflowValue(item, scope));
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveWorkflowValue(item, scope)]));
  }

  return value;
}

function interpolateString(template: string, scope: Record<string, unknown>): unknown {
  const tokenPattern = /\$\{([^}]+)\}/g;
  const exactMatch = template.match(/^\$\{([^}]+)\}$/);
  if (exactMatch) {
    return resolveTemplatePath(exactMatch[1], scope);
  }

  return template.replace(tokenPattern, (_, expression: string) => stringifyTemplateValue(resolveTemplatePath(expression, scope)));
}

function resolveTemplatePath(expression: string, scope: Record<string, unknown>): unknown {
  return getPathValue(scope, expression.trim());
}

function getPathValue(source: unknown, path: string): unknown {
  const segments = path.split(".").filter(Boolean);
  let current = source;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) {
        return undefined;
      }
      current = current[index];
      continue;
    }

    if (typeof current !== "object" || current === null || !(segment in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function stringifyTemplateValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return JSON.stringify(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
