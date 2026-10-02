import assert from "node:assert/strict";

globalThis.window = { location: { hostname: "localhost" } };
globalThis.matchMedia = () => ({ matches: true });
const { wireTaskSort } = await import("./task-ui.js");
const { applyManualOrder } = await import("../services/smartService.js");

// Minimal DOM doubles exercise the pointer handlers, not a second sorting implementation.
let children = [];
const list = {
  querySelectorAll(selector) { return children.filter((item) => item.dataset.taskId && (!selector.includes(":not") || !item.classes.has("dragging"))); },
  querySelector(selector) { return children.find((item) => selector === `[data-task-id="${item.dataset.taskId}"]`) || null; },
  insertBefore(item, before) { item.remove(); children.splice(before ? children.indexOf(before) : children.length, 0, item); },
  append(item) { this.insertBefore(item, null); },
};
function element(id) {
  const classes = new Set();
  const item = {
    dataset: id ? { taskId: id } : {}, classes, style: {},
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
    getBoundingClientRect: () => ({ top: children.indexOf(item) * 100, left: 0, width: 100, height: 100 }),
    setPointerCapture() {}, removeAttribute() {},
    before(other) { list.insertBefore(other, item); },
    remove() { const index = children.indexOf(item); if (index >= 0) children.splice(index, 1); },
  };
  return item;
}
globalThis.document = { createElement: () => element() };
const taskData = ["a", "b", "c"].map((taskId) => ({ taskId, currentProgress: 0 }));
let recommendation = "a", updates = 0;
children = taskData.map(({ taskId }) => element(taskId));
wireTaskSort(list, (ids) => {
  recommendation = applyManualOrder(taskData, ids)[0].taskId;
  updates++;
});
const event = (y) => ({ button: 0, clientX: 10, clientY: y, pointerId: 1, target: { closest: () => null }, preventDefault() {} });
const row = children[2];
row.onpointerdown(event(250));
row.onpointermove(event(0));
row.onpointerup({ type: "pointerup" });
assert.deepEqual(children.map((item) => item.dataset.taskId), ["c", "a", "b"]);
assert.equal(recommendation, "c", "recommendation callback runs synchronously at drop");
assert.equal(updates, 1);
row.onpointerdown(event(50));
row.onpointermove(event(400));
row.onpointercancel({ type: "pointercancel" });
assert.deepEqual(children.map((item) => item.dataset.taskId), ["c", "a", "b"]);
assert.equal(updates, 1, "cancel restores order without publishing a new recommendation");
