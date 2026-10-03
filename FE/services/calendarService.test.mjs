import assert from "node:assert/strict";

globalThis.window = { location: { hostname: "localhost" } };
globalThis.fetch = async () => ({
  ok: true,
  headers: { get: () => "application/json" },
  json: async () => ({ user: { username: "calendar-student" } }),
});
const stored = new Map();
globalThis.localStorage = {
  getItem: (key) => stored.get(key),
  setItem: (key, value) => stored.set(key, value),
};
await (await import("./authService.js")).restoreSession();
const calendar = await import("./calendarService.js");
const {
  dateKey,
  mondayOf,
  addDays,
  currentTimePosition,
  deadlinePosition,
  hasDeadlineConflict,
  durationHours,
} = await import("../utils/calendar-time.js");
const day = new Date(2026, 9, 2, 10, 30);
assert.equal(dateKey(mondayOf(day)), "2026-09-28");
assert.equal(dateKey(addDays(day, 1)), "2026-10-03");
assert.deepEqual(currentTimePosition("2026-10-02", day), {
  top: 630,
  label: "10:30",
});
assert.equal(currentTimePosition("2026-10-03", day), null);
assert.deepEqual(deadlinePosition(day, "2026-10-02"), {
  top: 630,
  marker: true,
});
assert.equal(deadlinePosition("bad-date", "2026-10-02"), null);
assert.equal(hasDeadlineConflict(day, new Date(day.getTime() + 60000)), true);
assert.equal(hasDeadlineConflict(day, day), false);
assert.equal(
  durationHours({ estimatedDuration: null, currentProgress: 50 }),
  1,
);
const start = day.toISOString(),
  end = new Date(day.getTime() + 3600000).toISOString();
const schedule = calendar.createSchedule({
  taskId: "task-1",
  startTime: start,
  endTime: end,
});
assert.equal(calendar.getScheduleByTaskId("task-1").length, 1);
assert.equal(calendar.getScheduleSegment(schedule, day).durationMinutes, 60);
assert.equal(calendar.getScheduleSegment(schedule, addDays(day, 1)), null);
for (const range of [
  ["bad", end],
  [start, "bad"],
  [end, start],
  [start, start],
]) {
  assert.throws(
    () =>
      calendar.updateSchedule(schedule.sessionId, {
        startTime: range[0],
        endTime: range[1],
      }),
    /valid time range/,
  );
}
assert.equal(calendar.getSchedules()[0].startTime, start);
calendar.deleteSchedule(schedule.sessionId);
assert.deepEqual(calendar.getSchedules(), []);
