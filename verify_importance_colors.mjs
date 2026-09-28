import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const globalCss = await readFile("Frontend/css/global.css", "utf8");
const courseCss = await readFile("Frontend/css/course.css", "utf8");
const dashboardCss = await readFile("Frontend/css/dashboard.css", "utf8");
const taskUi = await readFile("Frontend/js/components/task-ui.js", "utf8");
const shell = await readFile("Frontend/js/shared/shell.js", "utf8");

for (const level of ["very-low", "low", "medium", "high", "very-high"])
  assert.match(`${globalCss}\n${courseCss}\n${dashboardCss}`, new RegExp(`\\.${level}\\b`));

assert.match(globalCss, /\.importance-label\.low \{ color: var\(--green\); background: var\(--green-soft\); \}/);
assert.match(globalCss, /\.importance-label\.medium \{ color: var\(--amber\); background: var\(--amber-soft\); \}/);
assert.match(globalCss, /\.importance-label\.high \{ color: var\(--blue\); background: var\(--blue-soft\); \}/);
assert.doesNotMatch(courseCss, /:is\(\.high, \.very-high\)|:is\(\.low, \.very-low\)/);
assert.doesNotMatch(dashboardCss, /:is\(\.high, \.very-high\)/);
assert.match(taskUi, /class="importance-label \$\{t\.importance\}"/);
assert.match(shell, /classList\.add\("importance-label", task\.importance\)/);

const luminance = (hex) => {
  const rgb = hex.match(/[\da-f]{2}/gi).map((part) => parseInt(part, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
for (const [foreground, background] of [["526174", "f1f5f9"], ["9f1239", "fff1f2"], ["b6c2d2", "263244"], ["ff8aaa", "4a1f31"]])
  assert.ok(contrast(foreground, background) >= 4.5, `${foreground} on ${background} needs 4.5:1 contrast`);

console.log("Importance color checks passed");
