import { calculateRemainingWorkload } from "../services/smartService.js";

export const START_HOUR = 0;
export const END_HOUR = 24;
export const SLOT_HEIGHT = 60;
const pad = (value) => String(value).padStart(2, "0");
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const localValue = (value) => {
  const date = new Date(value);
  return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const formatTime = (value) => new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
const formatDate = (value) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
const mondayOf = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
};
const addDays = (value, days) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

export function durationHours(task) {
  return calculateRemainingWorkload(task?.estimatedDuration, task?.currentProgress);
}

export function currentTimePosition(day, now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
  if (day !== dateKey(now) || minutes < 0 || minutes >= (END_HOUR - START_HOUR) * 60) return null;
  return { top: minutes * SLOT_HEIGHT / 60, label: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
}

export function deadlinePosition(deadlineValue, dayValue) {
  const deadline = new Date(deadlineValue);
  const day = new Date(`${dayValue}T00:00:00`);
  if (!deadlineValue || Number.isNaN(deadline.getTime()) || Number.isNaN(day.getTime())) return null;
  const difference = dateKey(day).localeCompare(dateKey(deadline));
  if (difference < 0) return null;
  return difference > 0 ? { top: 0, marker: false } : { top: (deadline - new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate())) / 60000, marker: true };
}

export function hasDeadlineConflict(deadlineValue, endValue) {
  const deadline = new Date(deadlineValue);
  const end = new Date(endValue);
  return Boolean(deadlineValue) && !Number.isNaN(deadline.getTime()) && !Number.isNaN(end.getTime()) && end > deadline;
}

export { pad, dateKey, localValue, formatTime, formatDate, mondayOf, addDays };
