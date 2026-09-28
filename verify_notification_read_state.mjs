import assert from "node:assert/strict";

globalThis.window = { location: { hostname: "localhost" } };
const { notificationReadState } = await import("./Frontend/js/shared/shell.js");
const notification = (taskId, type = "Workload Warning") => ({ taskId, type });

let state = notificationReadState([], []);
assert.equal(state.items.filter((item) => !item.read).length, 0);

state = notificationReadState([notification("1")], []);
assert.equal(state.items.filter((item) => !item.read).length, 1);

state = notificationReadState([notification("1"), notification("2")], []);
assert.equal(state.items.filter((item) => !item.read).length, 2);
state.items.forEach((item) => state.readIds.add(item.id));

state = notificationReadState([notification("1"), notification("2")], [...state.readIds]);
assert.equal(state.items.filter((item) => !item.read).length, 0);

state = notificationReadState([notification("1"), notification("2"), notification("3")], [...state.readIds]);
assert.deepEqual(state.items.filter((item) => !item.read).map((item) => item.taskId), ["3"]);

console.log("Notification read-state checks passed");
