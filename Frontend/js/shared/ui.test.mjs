import assert from "node:assert/strict";
import { reconcileTaskRows } from "./ui.js";

class Row {
  constructor(id) { this.dataset = { taskId: id }; }
  remove() { this.parent.children.splice(this.parent.children.indexOf(this), 1); }
  replaceWith(row) { const index = this.parent.children.indexOf(this); row.parent = this.parent; this.parent.children[index] = row; }
}

class Container {
  constructor(rows) { this.children = rows; rows.forEach((row) => (row.parent = this)); }
  querySelectorAll() { return this.children.filter((row) => row.dataset?.taskId); }
  insertBefore(row, before) {
    const current = this.children.indexOf(row);
    if (current >= 0) this.children.splice(current, 1);
    const index = before ? this.children.indexOf(before) : this.children.length;
    row.parent = this;
    this.children.splice(index, 0, row);
  }
}

const a = new Row("a"), b = new Row("b"), c = new Row("c"), container = new Container([a, b, c]);
reconcileTaskRows(container, [{ taskId: "c" }, { taskId: "b" }, { taskId: "a" }], (task) => new Row(task.taskId), new Set(["b"]));

assert.deepEqual(container.children.map((row) => row.dataset.taskId), ["c", "b", "a"]);
assert.strictEqual(container.children[0], c, "unaffected rows are moved, not recreated");
assert.notStrictEqual(container.children[1], b, "only an affected row is recreated");
assert.strictEqual(container.children[2], a, "unaffected surrounding rows retain identity");

console.log("targeted task row reconciliation checks passed");
