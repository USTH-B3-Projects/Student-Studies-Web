import assert from "node:assert/strict";

class TestCustomEvent extends Event {
  constructor(type, options = {}) { super(type); this.detail = options.detail; }
}

const events = new EventTarget();
globalThis.CustomEvent = TestCustomEvent;
globalThis.window = {
  location: { hostname: "localhost" },
  dispatchEvent: events.dispatchEvent.bind(events),
};
globalThis.localStorage = {
  getItem: (key) => key === "studyflow_current_user" ? JSON.stringify({ username: "alice" }) : null,
};

let request;
let fail = false;
let failedTaskId = null;
globalThis.fetch = async (url, options) => {
  request = { url, options };
  const shouldFail = fail || (failedTaskId && url.includes(`/${failedTaskId}/`));
  return {
    ok: !shouldFail,
    headers: { get: () => "application/json" },
    json: async () => shouldFail
      ? ({ error: "Completion failed" })
      : ({ taskId: url.split("/").at(-2), currentProgress: JSON.parse(options.body).completed ? 100 : 50 }),
    statusText: "",
  };
};

const taskService = await import("./taskService.js");
const smartService = await import("./smartService.js");
let taskChanges = 0;
events.addEventListener(taskService.TASKS_CHANGED_EVENT, () => taskChanges++);

await taskService.setTaskCompletion("task-a", true);
assert.equal(request.url, "http://localhost:5000/api/v1/tasks/task-a/completion");
assert.equal(request.options.method, "PATCH");
assert.deepEqual(JSON.parse(request.options.body), { username: "alice", completed: true });
assert.equal(taskChanges, 1);

fail = true;
await assert.rejects(() => taskService.setTaskCompletion("task-a", true), /Completion failed/);
assert.equal(taskChanges, 1, "failed requests must not publish a successful task change");
fail = false;

failedTaskId = "task-b";
const bulk = await taskService.setTaskCompletions(["task-a", "task-b"], true);
assert.deepEqual(bulk.successful.map((task) => task.taskId), ["task-a"]);
assert.deepEqual(bulk.failed.map(({ taskId }) => taskId), ["task-b"]);
assert.equal(taskChanges, 2, "bulk completion publishes only successful server results");
failedTaskId = null;

const tasks = [
  { taskId: "task-a", taskName: "A", deadline: "2099-01-01T00:00:00.000Z", importance: "very-high", estimatedDuration: 8, currentProgress: 0, createdAt: "2026-01-01T00:00:00.000Z" },
  { taskId: "task-b", taskName: "B", deadline: "2099-02-01T00:00:00.000Z", importance: "low", estimatedDuration: 1, currentProgress: 0, createdAt: "2026-01-02T00:00:00.000Z" },
];
assert.equal(smartService.recommended(tasks, 1)[0].taskId, "task-a");
tasks[0].currentProgress = 100;
assert.equal(smartService.enrich(tasks[0]).completionStatus, "completed");
assert.equal(smartService.recommended(tasks, 1)[0].taskId, "task-b");
assert.equal(smartService.getWorkloadWarning(tasks).some((task) => task.taskId === "task-a"), false);
assert.equal(taskService.getProgress(tasks), 50);

console.log("completion flow checks passed");
