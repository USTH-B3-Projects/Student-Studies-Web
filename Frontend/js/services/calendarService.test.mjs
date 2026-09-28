import assert from "node:assert/strict";

const data = new Map([["studyflow_current_user", JSON.stringify({ username: "calendar-test" })]]);
globalThis.window = { location: { hostname: "localhost" } };
globalThis.localStorage = {
  getItem: (key) => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
  removeItem: (key) => data.delete(key),
};

const service = await import("./calendarService.js");
const first = service.createSchedule({ taskId: "task-1", startTime: "2026-09-28T08:00:00Z", endTime: "2026-09-28T09:00:00Z" });
service.createSchedule({ taskId: "task-1", startTime: "2026-09-29T08:00:00Z", endTime: "2026-09-29T09:00:00Z" });
assert.equal(service.getScheduleByTaskId("task-1").length, 2);
service.updateSchedule(first.sessionId, { endTime: "2026-09-28T10:00:00Z" });
assert.equal(service.getSchedules()[0].endTime, "2026-09-28T10:00:00.000Z");
service.deleteSchedule(first.sessionId);
assert.equal(service.getSchedules().length, 1);
assert.throws(() => service.createSchedule({ taskId: "task-1", startTime: "2026-09-28T10:00:00Z", endTime: "2026-09-28T09:00:00Z" }));
const overnight = { startTime: "2026-09-28T23:00:00", endTime: "2026-09-29T02:00:00" };
assert.deepEqual(service.getScheduleSegment(overnight, "2026-09-28"), { start: new Date("2026-09-28T23:00:00"), end: new Date("2026-09-29T00:00:00"), topMinutes: 1380, durationMinutes: 60 });
assert.deepEqual(service.getScheduleSegment(overnight, "2026-09-29"), { start: new Date("2026-09-29T00:00:00"), end: new Date("2026-09-29T02:00:00"), topMinutes: 0, durationMinutes: 120 });
assert.equal(service.getScheduleSegment(overnight, "2026-09-30"), null);
console.log("calendarService checks passed");
