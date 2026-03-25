import { expect, test } from "bun:test";
import { utilityActionTestHarness } from "./test-harness.ts";

test("data.set emits structured output from workflow context", async () => {
  const harness = utilityActionTestHarness();
  const result = await harness.actions.get("data.set")?.execute(harness.execution, {
    value: {
      orderId: "${trigger.data.groups.orderId}",
      from: "${from}"
    }
  });

  expect(result).toEqual({ ok: true, output: { orderId: "A-42", from: "user-1" } });
});

test("data.coalesce returns the first meaningful value", async () => {
  const harness = utilityActionTestHarness();
  const result = await harness.actions.get("data.coalesce")?.execute(harness.execution, {
    values: ["", "${trigger.data.groups.orderId}", "fallback"]
  });

  expect(result).toEqual({ ok: true, output: "A-42" });
});

test("data.assert fails when required workflow data is missing", async () => {
  const harness = utilityActionTestHarness();
  const result = await harness.actions.get("data.assert")?.execute(harness.execution, {
    exists: "${actionsById.lookup.output.customerId}",
    message: "customer lookup required"
  });

  expect(result).toEqual({ ok: false, error: "customer lookup required" });
});
