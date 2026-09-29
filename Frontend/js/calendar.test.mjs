import assert from "node:assert/strict";

globalThis.window = { location: { hostname: "localhost" } };
const { deadlinePosition, hasDeadlineConflict } = await import("./calendar.js");

assert.equal(deadlinePosition(null, "2026-09-30"), null);
assert.equal(deadlinePosition("invalid", "2026-09-30"), null);
assert.equal(deadlinePosition("2026-09-30T16:00:00", "2026-09-29"), null);
assert.deepEqual(deadlinePosition("2026-09-30T16:00:00", "2026-09-30"), { top: 960, marker: true });
assert.deepEqual(deadlinePosition("2026-09-30T16:00:00", "2026-10-01"), { top: 0, marker: false });

assert.equal(hasDeadlineConflict(null, "2026-09-30T17:30:00"), false);
assert.equal(hasDeadlineConflict("invalid", "2026-09-30T17:30:00"), false);
assert.equal(hasDeadlineConflict("2026-09-30T16:00:00", "2026-09-30T15:30:00"), false);
assert.equal(hasDeadlineConflict("2026-09-30T16:00:00", "2026-09-30T16:00:00"), false);
assert.equal(hasDeadlineConflict("2026-09-30T16:00:00", "2026-09-30T17:30:00"), true);
assert.equal(hasDeadlineConflict("2026-09-30T16:00:00", "2026-10-01T10:00:00"), true);

console.log("calendar deadline visualization and conflict checks passed");
