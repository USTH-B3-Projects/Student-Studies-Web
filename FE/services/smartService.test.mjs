import assert from "node:assert/strict";
import * as smart from "./smartService.js";

const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [new RealDate(2026, 9, 2, 12).getTime()])); }
};
try {
  const task = { taskId: "a", name: "Homework", deadline: new Date(2026, 9, 3, 10).toISOString(), importance: "high", estimatedDuration: 6, currentProgress: 50, createdAt: "2026-01-01" };
  assert.equal(smart.calculateUrgencyScore(task.deadline), 80);
  assert.equal(smart.calculatePriorityScore(task), 76);
  assert.equal(smart.calculateRemainingWorkload(null, 50), 1);
  assert.equal(smart.enrich(task).hasWorkloadWarning, true);
  assert.equal(smart.enrich({ ...task, deadline: new Date(2026, 9, 2, 10).toISOString() }).hasWorkloadWarning, false);
  assert.equal(smart.enrich({ ...task, estimatedDuration: null }).hasWorkloadWarning, false);
  assert.equal(smart.enrich({ ...task, currentProgress: 100 }).displayStatus, "completed");
  const earlier = { ...task, taskId: "b", createdAt: "2025-01-01" };
  assert.deepEqual(smart.rankTasks([task, earlier, { ...task, taskId: "done", currentProgress: 100 }]).map((t) => t.taskId), ["b", "a"]);

  const tasks = ["a", "hidden", "b", "new"].map((taskId) => ({ taskId }));
  assert.deepEqual(smart.applyManualOrder(tasks, ["b", "deleted", "a", "b"]).map((t) => t.taskId), ["b", "hidden", "a", "new"]);
  assert.deepEqual(tasks.map((t) => t.taskId), ["a", "hidden", "b", "new"], "manual ordering must not mutate fetched tasks");
  assert.deepEqual(smart.applyManualOrder(tasks, []), tasks);
} finally {
  globalThis.Date = RealDate;
}
