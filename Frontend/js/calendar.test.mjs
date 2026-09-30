import assert from "node:assert/strict";

globalThis.window = { location: { hostname: "localhost" } };
const { currentTimePosition, deadlinePosition, durationHours, hasDeadlineConflict } = await import("./calendar.js");

for (const [currentProgress, expected] of [[0, 2], [25, 1.5], [50, 1], [75, 0.5], [100, 0]]) {
  assert.equal(durationHours({ estimatedDuration: 2, currentProgress }), expected);
}

assert.deepEqual(currentTimePosition("2026-09-30", new Date("2026-09-30T13:44:00")), { top: 824, label: "13:44" });
assert.equal(currentTimePosition("2026-09-29", new Date("2026-09-30T13:44:00")), null);

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

// The same final-position check applies regardless of whether the dragged item is new or rescheduled.
for (const dragType of ["task", "session"]) {
  assert.equal(hasDeadlineConflict("2026-09-30T01:00:00", "2026-09-30T00:30:00"), false, `${dragType} before deadline`);
  assert.equal(hasDeadlineConflict("2026-09-30T01:00:00", "2026-09-30T04:30:00"), true, `${dragType} after deadline`);
}

console.log("calendar deadline visualization and conflict checks passed");
