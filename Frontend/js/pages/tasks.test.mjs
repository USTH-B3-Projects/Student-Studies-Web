import assert from "node:assert/strict";

globalThis.window = { location: { hostname: "localhost" } };
const { paginateTasks } = await import("./tasks.js");
const tasks = Array.from({ length: 21 }, (_, taskId) => ({ taskId }));

assert.deepEqual(paginateTasks(tasks, 2), { page: 2, pageCount: 3, tasks: tasks.slice(10, 20) });
assert.equal(paginateTasks(tasks.slice(0, 20), 3).page, 2);
assert.deepEqual(paginateTasks([], 1), { page: 1, pageCount: 1, tasks: [] });

console.log("task pagination checks passed");
