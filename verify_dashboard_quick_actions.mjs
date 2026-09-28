import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dashboard = await readFile("Frontend/js/pages/dashboard.js", "utf8");
const styles = await readFile("Frontend/css/dashboard.css", "utf8");
const components = await readFile("Frontend/js/components/task-ui.js", "utf8");

assert.match(dashboard, /Quick Actions/);
assert.match(dashboard, /data-add-course/);
assert.match(dashboard, /data-add-task/);
assert.doesNotMatch(dashboard, /You're getting there|Keep going, you've got this/);
assert.match(dashboard, /addCourse\(render\)/);
assert.match(dashboard, /addTask\(render\)/);
assert.match(components, /function addCourse/);
assert.match(components, /async function addTask/);
assert.match(styles, /\.quick-actions > div \{[^}]*grid-template-columns: 1fr 1fr/);
assert.match(styles, /@media \(max-width: 480px\)[\s\S]*\.quick-actions > div \{ grid-template-columns: 1fr; \}/);
assert.match(styles, /\.quick-actions button \{[^}]*(?:var\(--primary\)|var\(--surface\)|var\(--border\))/);
assert.doesNotMatch(styles.match(/\.quick-actions[\s\S]*?(?=\.courses-overview)/)?.[0] ?? "", /#[0-9a-f]{3,8}\b/i);

console.log("Dashboard Quick Actions checks passed");
