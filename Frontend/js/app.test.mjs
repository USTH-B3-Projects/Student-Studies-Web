import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Delay session restoration to reproduce the calendar startup race.
let release;
const session = new Promise((resolve) => { release = resolve; });
const calls = [];
globalThis.document = { body: { dataset: { page: "calendar" } } };
globalThis.startupCheck = {
  initPageTransitions() {},
  restoreSession: () => session,
  initCalendar: () => calls.push("calendar"),
  toast: (message) => calls.push(message),
};
const source = (await readFile(new URL("./app.js", import.meta.url), "utf8"))
  .replace(/^import .*;\r?\n/gm, "");
const stubs = "const { initPageTransitions, restoreSession, initCalendar, toast } = globalThis.startupCheck; const initAuth = () => {}, initDashboard = () => {}, initCourses = () => {}, initCourseDetail = () => {}, initAllTasks = () => {}, initProfile = () => {}, initShell = () => {};\n";
const startup = import(`data:text/javascript,${encodeURIComponent(stubs + source)}`);
await new Promise((resolve) => setImmediate(resolve));
assert.deepEqual(calls, []);
release();
await startup;
assert.deepEqual(calls, ["calendar"]);
const html = await readFile(new URL("../html/calendar.html", import.meta.url), "utf8");
assert.equal((html.match(/<script type="module"/g) || []).length, 1);
calls.length = 0;
globalThis.startupCheck.restoreSession = async () => { throw new Error("API unavailable"); };
await import(`data:text/javascript,${encodeURIComponent(stubs + source + "\n// unavailable session")}`);
assert.deepEqual(calls, ["API unavailable"]);
