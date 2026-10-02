import { getCurrentUser } from "./authService.js";

const key = () => {
  const user = getCurrentUser();
  if (!user) throw new Error("Not logged in");
  return `studyflow_calendar_sessions_${user.username}`;
};

export function getSchedules() {
  try {
    const schedules = JSON.parse(localStorage.getItem(key()) || "[]");
    return Array.isArray(schedules) ? schedules : [];
  } catch {
    return [];
  }
}

function save(schedules) {
  localStorage.setItem(key(), JSON.stringify(schedules));
}

function validate(taskId, startTime, endTime) {
  const start = new Date(startTime).getTime(), end = new Date(endTime).getTime();
  if (typeof taskId !== 'string' || !taskId.trim() || !startTime || !endTime || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new Error("Schedule must have a task and a valid time range");
  }
}

export function createSchedule({ taskId, startTime, endTime }) {
  validate(taskId, startTime, endTime);
  const schedule = {
    sessionId: crypto.randomUUID(),
    taskId,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
  };
  save([...getSchedules(), schedule]);
  return schedule;
}

export function getScheduleByTaskId(taskId) {
  return getSchedules().filter((schedule) => schedule.taskId === taskId);
}

export function getScheduleSegment(schedule, day) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const start = new Date(Math.max(new Date(schedule.startTime), dayStart));
  const end = new Date(Math.min(new Date(schedule.endTime), dayEnd));
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) return null;
  return { start, end, topMinutes: (start - dayStart) / 60000, durationMinutes: (end - start) / 60000 };
}

export function updateSchedule(sessionId, changes) {
  const schedules = getSchedules();
  const index = schedules.findIndex((schedule) => schedule.sessionId === sessionId);
  if (index < 0) throw new Error("Calendar session not found");
  const updated = { ...schedules[index], ...changes, sessionId };
  validate(updated.taskId, updated.startTime, updated.endTime);
  updated.startTime = new Date(updated.startTime).toISOString();
  updated.endTime = new Date(updated.endTime).toISOString();
  schedules[index] = updated;
  save(schedules);
  return updated;
}

export function deleteSchedule(sessionId) {
  save(getSchedules().filter((schedule) => schedule.sessionId !== sessionId));
}
