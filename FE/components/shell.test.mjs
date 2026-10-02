import assert from "node:assert/strict";

globalThis.window = { location: { hostname: "localhost" } };
const { setProfileMenuOpen, notificationReadState } = await import("./shell.js");

const attributes = new Map();
const button = { setAttribute: (name, value) => attributes.set(name, value) };
const dropdown = { hidden: true };

setProfileMenuOpen(button, dropdown, true);
assert.equal(attributes.get("aria-expanded"), "true");
assert.equal(dropdown.hidden, false);

setProfileMenuOpen(button, dropdown, false);
assert.equal(attributes.get("aria-expanded"), "false");
assert.equal(dropdown.hidden, true);

const { items, readIds } = notificationReadState([
  { taskId: "task-1", type: "Overdue Task" },
  { taskId: "task-2", type: "Workload Warning" },
], ["task-1:Overdue Task", "deleted:Overdue Task"]);
assert.deepEqual(items.map((item) => item.read), [true, false]);
assert.deepEqual([...readIds], ["task-1:Overdue Task"]);

console.log("profile menu state checks passed");
