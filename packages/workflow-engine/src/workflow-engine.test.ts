import { expect, test } from "bun:test";
import { validateWorkflowDefinition, WorkflowEngine } from "./index.ts";
import { createDomainEvent } from "@wato/sdk";
import type { WorkflowDefinition } from "@wato/workflow-sdk";

test("workflow engine executes registered trigger and action", async () => {
  const engine = new WorkflowEngine();
  const calls: string[] = [];

  engine.registerTrigger({
    type: "message.received",
    match: () => true
  });

  engine.registerAction({
    type: "message.sendText",
    execute: async () => {
      calls.push("sent");
      return { ok: true };
    }
  });

  const workflow: WorkflowDefinition = {
    id: "wf-1",
    name: "Reply",
    version: 1,
    enabled: true,
    accountScope: { mode: "single", accountId: "default" },
    trigger: { type: "message.received", config: {} },
    conditions: [],
    actions: [{ type: "message.sendText", config: { text: "ok" } }]
  };

  const result = await engine.execute(
    workflow,
    createDomainEvent({
      type: "message.received",
      sourceModule: "test",
      accountId: "default",
      payload: { body: "hello" }
    }),
    { body: "hello" },
    "default"
  );

  expect(result.ok).toBe(true);
  expect(calls).toEqual(["sent"]);
});

test("workflow engine passes trigger data and prior action outputs through execution context", async () => {
  const engine = new WorkflowEngine();
  const seen: Array<{ triggerName?: string; priorReplyId?: string }> = [];

  engine.registerTrigger({
    type: "message.received",
    match: () => ({ matched: true, data: { name: "Ada" } })
  });

  engine.registerAction({
    type: "message.reply",
    execute: async (context) => {
      seen.push({ triggerName: (context.trigger.data as { name?: string }).name });
      return { ok: true, output: { replyId: "reply-1" } };
    }
  });

  engine.registerAction({
    type: "message.followup",
    execute: async (context) => {
      seen.push({
        triggerName: (context.trigger.data as { name?: string }).name,
        priorReplyId: (context.actionResults[0]?.output as { replyId?: string } | undefined)?.replyId
      });
      return { ok: true };
    }
  });

  const workflow: WorkflowDefinition = {
    id: "wf-2",
    name: "Reply With Context",
    version: 1,
    enabled: true,
    accountScope: { mode: "single", accountId: "default" },
    trigger: { type: "message.received", config: {} },
    conditions: [],
    actions: [
      { type: "message.reply", config: {} },
      { type: "message.followup", config: {} }
    ]
  };

  const result = await engine.execute(
    workflow,
    createDomainEvent({
      type: "message.received",
      sourceModule: "test",
      accountId: "default",
      payload: { body: "hello" }
    }),
    { body: "hello" },
    "default"
  );

  expect(result.ok).toBe(true);
  expect(seen).toEqual([
    { triggerName: "Ada" },
    { triggerName: "Ada", priorReplyId: "reply-1" }
  ]);
});

test("workflow engine resolves condition config from trigger data", async () => {
  const engine = new WorkflowEngine();
  const seenConfigs: Array<Record<string, unknown>> = [];

  engine.registerTrigger({
    type: "message.received",
    match: () => ({ matched: true, data: { groups: { keyword: "hello" } } })
  });

  engine.registerCondition({
    type: "message.textContains",
    evaluate: async (_input, config) => {
      seenConfigs.push(config);
      return config.contains === "hello";
    }
  });

  engine.registerAction({
    type: "message.sendText",
    execute: async () => ({ ok: true })
  });

  const workflow: WorkflowDefinition = {
    id: "wf-3",
    name: "Condition Interpolation",
    version: 1,
    enabled: true,
    accountScope: { mode: "single", accountId: "default" },
    trigger: { type: "message.received", config: {} },
    conditions: [{ type: "message.textContains", config: { contains: "${trigger.data.groups.keyword}" } }],
    actions: [{ type: "message.sendText", config: {} }]
  };

  const result = await engine.execute(
    workflow,
    createDomainEvent({
      type: "message.received",
      sourceModule: "test",
      accountId: "default",
      payload: { body: "hello world" }
    }),
    { body: "hello world" },
    "default"
  );

  expect(result.ok).toBe(true);
  expect(seenConfigs).toEqual([{ contains: "hello" }]);
});

test("workflow engine exposes prior action outputs by action id", async () => {
  const engine = new WorkflowEngine();
  const seen: Array<string | undefined> = [];

  engine.registerTrigger({
    type: "message.received",
    match: () => true
  });

  engine.registerAction({
    type: "data.set",
    execute: async () => ({ ok: true, output: { orderId: "A-42" } })
  });

  engine.registerAction({
    type: "message.sendText",
    execute: async (context) => {
      const byId = context.actionResults.find((item) => item.id === "context")?.output as { orderId?: string } | undefined;
      seen.push(byId?.orderId);
      return { ok: true };
    }
  });

  const workflow: WorkflowDefinition = {
    id: "wf-4",
    name: "Named Results",
    version: 1,
    enabled: true,
    accountScope: { mode: "single", accountId: "default" },
    trigger: { type: "message.received", config: {} },
    conditions: [],
    actions: [
      { id: "context", type: "data.set", config: {} },
      { id: "reply", type: "message.sendText", config: {} }
    ]
  };

  const result = await engine.execute(
    workflow,
    createDomainEvent({
      type: "message.received",
      sourceModule: "test",
      accountId: "default",
      payload: { body: "hello" }
    }),
    { body: "hello" },
    "default"
  );

  expect(result.ok).toBe(true);
  expect(seen).toEqual(["A-42"]);
});

test("workflow engine converts action exceptions into failed executions", async () => {
  const engine = new WorkflowEngine();

  engine.registerTrigger({
    type: "message.received",
    match: () => true
  });

  engine.registerAction({
    type: "message.sendText",
    execute: async () => {
      throw new Error("boom");
    }
  });

  const workflow: WorkflowDefinition = {
    id: "wf-5",
    name: "Action Failure",
    version: 1,
    enabled: true,
    accountScope: { mode: "single", accountId: "default" },
    trigger: { type: "message.received", config: {} },
    conditions: [],
    actions: [{ type: "message.sendText", config: {} }]
  };

  const result = await engine.execute(
    workflow,
    createDomainEvent({
      type: "message.received",
      sourceModule: "test",
      accountId: "default",
      payload: { body: "hello" }
    }),
    { body: "hello" },
    "default"
  );

  expect(result.ok).toBe(false);
  expect(result.execution.status).toBe("failed");
  expect(result.execution.error).toBe("boom");
});

test("workflow validation rejects duplicate action ids and unknown provider types", () => {
  const result = validateWorkflowDefinition(
    {
      id: "wf-6",
      name: "Invalid Workflow",
      version: 1,
      enabled: true,
      accountScope: { mode: "all" },
      trigger: { type: "missing.trigger", config: {} },
      conditions: [{ type: "missing.condition", config: {} }],
      actions: [
        { id: "dup", type: "message.sendText", config: {} },
        { id: "dup", type: "missing.action", config: {} }
      ]
    },
    {
      knownTriggers: ["message.received"],
      knownConditions: ["message.textContains"],
      knownActions: ["message.sendText"]
    }
  );

  expect(result.ok).toBe(false);
  expect(result.issues).toContain("unknown trigger type: missing.trigger");
  expect(result.issues).toContain("unknown condition type: missing.condition");
  expect(result.issues).toContain("unknown action type: missing.action");
  expect(result.issues).toContain("duplicate action id: dup");
});
