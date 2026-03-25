import { expect, test } from "bun:test";
import { actionSendInternalsTestHarness } from "./test-harness.ts";

test("workflow text action renders templates and stores outbound message", async () => {
  const harness = actionSendInternalsTestHarness();
  await harness.actions.get("message.sendText")?.execute(
    {
      workflow: harness.workflow,
      executionId: "exec-1",
      accountId: "default",
      eventType: "message.received",
      event: harness.event,
      trigger: { data: { groups: {} } },
      actionResults: [],
      input: harness.input
    },
    { text: "hi ${from}: ${body}" }
  );

  expect(harness.sentTexts).toEqual([{ accountId: "default", chatId: "chat-1", text: "hi user-1: hello" }]);
  expect(harness.outbound.length).toBe(1);
});

test("workflow media action delegates to whatsapp gateway", async () => {
  const harness = actionSendInternalsTestHarness();
  await harness.actions.get("message.sendMedia")?.execute(
    {
      workflow: harness.workflow,
      executionId: "exec-2",
      accountId: "default",
      eventType: "message.received",
      event: harness.event,
      trigger: { data: { groups: {} } },
      actionResults: [],
      input: harness.input
    },
    { media: { filePath: "/tmp/demo.png" }, caption: "photo ${body}" }
  );

  const sentRequest = harness.sentMedia[0] as { caption?: string; media: { filePath?: string } };
  expect(sentRequest.caption).toBe("photo hello");
  expect(sentRequest.media.filePath).toBe("/tmp/demo.png");
});

test("workflow forward action delegates to whatsapp gateway", async () => {
  const harness = actionSendInternalsTestHarness();
  await harness.actions.get("message.forward")?.execute(
    {
      workflow: harness.workflow,
      executionId: "exec-3",
      accountId: "default",
      eventType: "message.received",
      event: harness.event,
      trigger: { data: { groups: {} } },
      actionResults: [],
      input: harness.input
    },
    { chatId: "chat-2" }
  );

  expect(harness.forwarded).toEqual([{ accountId: "default", messageId: "msg-1", chatId: "chat-2" }]);
});

test("workflow text action can consume trigger data and prior action outputs", async () => {
  const harness = actionSendInternalsTestHarness();
  await harness.actions.get("message.sendText")?.execute(
    {
      workflow: harness.workflow,
      executionId: "exec-4",
      accountId: "default",
      eventType: "message.received",
      event: harness.event,
      trigger: { data: { groups: { orderId: "A-42" } } },
      actionResults: [{ id: "lookup", type: "message.lookup", ok: true, output: { summary: "ready" } }],
      input: harness.input
    },
    { text: "order ${trigger.data.groups.orderId} is ${actionsById.lookup.output.summary}" }
  );

  expect(harness.sentTexts).toEqual([{ accountId: "default", chatId: "chat-1", text: "order A-42 is ready" }]);
});
