import * as taskService from "../services/taskService.js";
import * as courseService from "../services/courseService.js";
import * as calendarService from "../services/calendarService.js";
import { enrich } from "../services/smartService.js";

import { $, esc, toast } from "../components/ui.js";
import { initShell } from "../components/shell.js";
import { enhanceScheduleDateTime } from "../components/schedule-picker.js";
import {
  START_HOUR,
  END_HOUR,
  SLOT_HEIGHT,
  pad,
  dateKey,
  localValue,
  formatTime,
  formatDate,
  mondayOf,
  addDays,
  durationHours,
  currentTimePosition,
  deadlinePosition,
  hasDeadlineConflict,
} from "../utils/calendar-time.js";

let tasks = [];
let courses = [];
let weekStart = mondayOf(new Date());
let selectedDate = new Date();
let view = "week";
let filter = "unscheduled";
let query = "";
let dragged = null;

function courseFor(task) {
  return courses.find((course) => course.courseId === task.courseId) || {};
}

function isCompleted(task) {
  return Number(task.currentProgress) === 100;
}

function isInactiveFutureSchedule(schedule, task) {
  return isCompleted(task) && new Date(schedule.endTime) > new Date();
}

function renderTasks() {
  const scheduledIds = new Set(
    calendarService.getSchedules().map((schedule) => schedule.taskId),
  );
  const matching = tasks.filter((task) => {
    const scheduled = scheduledIds.has(task.taskId);
    const matchesFilter =
      filter === "all" ||
      (filter === "scheduled" && scheduled) ||
      (filter === "unscheduled" && !scheduled);
    const course = courseFor(task);
    return (
      !isCompleted(task) &&
      matchesFilter &&
      `${task.taskName || task.name} ${course.courseName || ""}`
        .toLowerCase()
        .includes(query)
    );
  });
  const visible = matching.sort(
    (a, b) => new Date(a.deadline) - new Date(b.deadline),
  );
  $("#calendarFilters").innerHTML = [
    ["all", "All"],
    ["unscheduled", "Not scheduled"],
    ["scheduled", "Scheduled"],
  ]
    .map(
      ([value, label]) =>
        `<button class="${filter === value ? "active" : ""}" type="button" data-calendar-filter="${value}">${label}</button>`,
    )
    .join("");
  $("#calendarTaskList").innerHTML = visible.length
    ? visible
        .map((task) => {
          const course = courseFor(task);
          const color = course.color || "#1267ed";
          return `<article class="calendar-task-card" draggable="true" data-calendar-task="${esc(task.taskId)}" style="--accent:${esc(color)}"><span class="task-accent"></span><div><strong>${esc(task.taskName || task.name)}</strong><span class="course-pill">${esc(course.courseName || "Course")}</span><small><span>▣ ${esc(formatDate(task.deadline))}</span>${task.estimatedDuration != null ? `<span>◷ ${esc(Number(task.estimatedDuration))}h</span>` : ""}</small></div><span class="drag-grip" aria-hidden="true">⠿</span></article>`;
        })
        .join("")
    : '<div class="calendar-empty">No matching tasks.</div>';
  document.querySelectorAll("[data-calendar-filter]").forEach(
    (button) =>
      (button.onclick = () => {
        filter = button.dataset.calendarFilter;
        renderTasks();
      }),
  );
  document.querySelectorAll("[data-calendar-task]").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      dragged = { type: "task", id: card.dataset.calendarTask };
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("text/plain", JSON.stringify(dragged));
      card.classList.add("dragging");
      showDeadlineVisualization();
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      clearDropIndicator();
    });
  });
}

function renderCalendar() {
  const unit = view === "day" ? "day" : view === "month" ? "month" : "week";
  $("#calendarPrev").setAttribute("aria-label", `Previous ${unit}`);
  $("#calendarNext").setAttribute("aria-label", `Next ${unit}`);
  document.querySelectorAll("[data-calendar-view]").forEach((button) => {
    const active = button.dataset.calendarView === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
  if (view === "month") return renderMonth();
  renderTimeline(
    view === "day"
      ? [selectedDate]
      : Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
  );
}

function renderTimeline(days) {
  const labelDate = view === "day" ? selectedDate : days[3];
  $("#calendarWeekLabel").textContent = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(labelDate);
  const today = dateKey(new Date());
  const schedules = calendarService.getSchedules();
  const calendar = $("#weeklyCalendar");
  calendar.className = `weekly-calendar ${view === "day" ? "day-calendar" : ""}`;
  calendar.innerHTML = `<div class="calendar-corner">GMT${-new Date().getTimezoneOffset() / 60 >= 0 ? "+" : ""}${-new Date().getTimezoneOffset() / 60}</div>${days.map((day) => `<div class="calendar-day-head ${dateKey(day) === today ? "today" : ""}"><strong>${new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day)}</strong><span>${day.getDate()}</span></div>`).join("")}<div class="calendar-times">${Array.from({ length: END_HOUR - START_HOUR - 1 }, (_, index) => `<span style="top:${(index + 1) * SLOT_HEIGHT}px">${pad(START_HOUR + index + 1)}:00</span>`).join("")}</div>${days.map((day) => `<div class="calendar-day-body ${dateKey(day) === today ? "today" : ""}" data-calendar-date="${dateKey(day)}">${schedules.map((schedule) => renderEvent(schedule, day)).join("")}</div>`).join("")}`;
  bindEventBlocks();
  updateCurrentTimeIndicator();
}

function updateCurrentTimeIndicator(now = new Date()) {
  document
    .querySelectorAll(".calendar-current-time")
    .forEach((element) => element.remove());
  const day = document.querySelector(`[data-calendar-date="${dateKey(now)}"]`);
  const position = currentTimePosition(day?.dataset.calendarDate, now);
  if (!day || !position) return;
  const indicator = document.createElement("div");
  indicator.className = "calendar-current-time";
  indicator.style.top = `${position.top}px`;
  indicator.innerHTML = `<span>${position.label}</span>`;
  day.append(indicator);
}

function startCurrentTimeUpdates() {
  updateCurrentTimeIndicator();
  setTimeout(startCurrentTimeUpdates, 60020 - (Date.now() % 60000));
}

function renderMonth() {
  const month = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1,
  );
  const gridStart = mondayOf(month);
  const days = Array.from({ length: 42 }, (_, index) =>
    addDays(gridStart, index),
  );
  const schedules = calendarService.getSchedules();
  const today = dateKey(new Date());
  $("#calendarWeekLabel").textContent = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(month);
  const calendar = $("#weeklyCalendar");
  calendar.className = "month-calendar";
  calendar.innerHTML = `${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => `<div class="month-weekday">${day}</div>`).join("")}${days
    .map((day) => {
      const key = dateKey(day);
      const daySchedules = schedules.filter(
        (schedule) =>
          calendarService.getScheduleSegment(schedule, day) &&
          tasks.some((task) => task.taskId === schedule.taskId),
      );
      return `<div class="month-day ${day.getMonth() !== month.getMonth() ? "outside" : ""} ${key === today ? "today" : ""}" data-month-date="${key}"><button class="month-date" type="button" aria-label="Open ${formatDate(day)} in day view">${day.getDate()}</button><div class="month-events">${daySchedules.slice(0, 3).map(renderMonthEvent).join("")}${daySchedules.length > 3 ? `<span class="month-more">+${daySchedules.length - 3} more</span>` : ""}</div></div>`;
    })
    .join("")}`;
  bindEventBlocks();
  document.querySelectorAll("[data-month-date]").forEach((cell) => {
    const openDay = (event) => {
      if (event.target.closest("[data-calendar-session]")) return;
      selectedDate = new Date(`${cell.dataset.monthDate}T00:00:00`);
      weekStart = mondayOf(selectedDate);
      view = "day";
      renderCalendar();
    };
    cell.onclick = openDay;
  });
}

function renderMonthEvent(schedule) {
  const task = tasks.find((item) => item.taskId === schedule.taskId);
  if (!task) return "";
  const inactive = isInactiveFutureSchedule(schedule, task);
  return `<button class="month-event${inactive ? " completed-task-session" : ""}" type="button" draggable="${!inactive}" data-calendar-session="${esc(schedule.sessionId)}" ${inactive ? "data-completed-task-session" : ""} style="--accent:${esc(courseFor(task).color || "#1267ed")}" title="${inactive ? "Completed task · " : ""}${esc(formatTime(schedule.startTime))} ${esc(task.taskName || task.name)}"><span></span><strong>${esc(task.taskName || task.name)}</strong></button>`;
}

function bindEventBlocks() {
  document.querySelectorAll("[data-calendar-session]").forEach((eventBlock) => {
    eventBlock.onclick = (event) => {
      event.stopPropagation();
      showDetails(eventBlock.dataset.calendarSession);
    };
    eventBlock.addEventListener("dragstart", (event) => {
      if (eventBlock.hasAttribute("data-completed-task-session"))
        return event.preventDefault();
      event.stopPropagation();
      dragged = { type: "session", id: eventBlock.dataset.calendarSession };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", JSON.stringify(dragged));
      eventBlock.classList.add("dragging");
      showDeadlineVisualization();
    });
    eventBlock.addEventListener("dragend", () => {
      eventBlock.classList.remove("dragging");
      clearDropIndicator();
    });
  });
}

function renderEvent(schedule, day) {
  const task = tasks.find((item) => item.taskId === schedule.taskId);
  if (!task) return "";
  const course = courseFor(task);
  const start = new Date(schedule.startTime);
  const end = new Date(schedule.endTime);
  const segment = calendarService.getScheduleSegment(schedule, day);
  if (!segment) return "";
  const top = segment.topMinutes;
  const height = Math.max(28, segment.durationMinutes);
  const inactive = isInactiveFutureSchedule(schedule, task);
  return `<button class="calendar-event${inactive ? " completed-task-session" : ""}" type="button" draggable="${!inactive}" data-calendar-session="${esc(schedule.sessionId)}" ${inactive ? "data-completed-task-session" : ""} style="--accent:${esc(course.color || "#1267ed")};top:${top}px;height:${height}px" title="${inactive ? "Completed task schedule" : "Open schedule details"}"><strong>${esc(task.taskName || task.name)}</strong><span>${inactive ? "Completed task · " : ""}${esc(formatTime(start))} – ${esc(formatTime(end))}</span></button>`;
}

function dropPosition(event, day) {
  const rect = day.getBoundingClientRect();
  const minutes = Math.max(
    0,
    Math.min(
      (END_HOUR - START_HOUR) * 60 - 30,
      Math.round((((event.clientY - rect.top) / SLOT_HEIGHT) * 60) / 30) * 30,
    ),
  );
  const start = new Date(`${day.dataset.calendarDate}T00:00:00`);
  start.setMinutes(START_HOUR * 60 + minutes);
  return { start, minutes };
}

function dragDurationMinutes() {
  if (dragged?.type === "task")
    return durationHours(tasks.find((task) => task.taskId === dragged.id)) * 60;
  const schedule = calendarService
    .getSchedules()
    .find((item) => item.sessionId === dragged?.id);
  return schedule
    ? (new Date(schedule.endTime) - new Date(schedule.startTime)) / 60000
    : 60;
}

function draggedTask() {
  if (dragged?.type === "task")
    return tasks.find((task) => task.taskId === dragged.id);
  const schedule = calendarService
    .getSchedules()
    .find((item) => item.sessionId === dragged?.id);
  return tasks.find((task) => task.taskId === schedule?.taskId);
}

function showDeadlineVisualization() {
  document
    .querySelectorAll(".calendar-deadline-warning")
    .forEach((element) => element.remove());
  const task = draggedTask();
  document.querySelectorAll(".calendar-day-body").forEach((day) => {
    const position = deadlinePosition(task?.deadline, day.dataset.calendarDate);
    if (!position) return;
    const warning = document.createElement("div");
    warning.className = `calendar-deadline-warning${position.marker ? " has-marker" : ""}`;
    warning.style.top = `${position.top}px`;
    if (position.marker)
      warning.innerHTML = `<span>Deadline ${esc(formatTime(task.deadline))}</span>`;
    day.append(warning);
  });
}

function showDropIndicator(event, day) {
  const { start, minutes } = dropPosition(event, day);
  const end = new Date(start.getTime() + dragDurationMinutes() * 60000);
  let indicator = day.querySelector(".calendar-drop-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.className = "calendar-drop-indicator";
    day.append(indicator);
  }
  indicator.classList.toggle(
    "deadline-conflict",
    hasDeadlineConflict(draggedTask()?.deadline, end),
  );
  indicator.style.top = `${minutes}px`;
  indicator.style.height = `${Math.max(30, Math.min(dragDurationMinutes(), (END_HOUR - START_HOUR) * 60 - minutes))}px`;
}

function clearDropIndicator() {
  document
    .querySelectorAll(".calendar-drop-indicator")
    .forEach((element) => element.remove());
  document
    .querySelectorAll(".calendar-deadline-warning")
    .forEach((element) => element.remove());
  document
    .querySelectorAll(".month-day.drop-target")
    .forEach((element) => element.classList.remove("drop-target"));
  dragged = null;
}

function saveTaskSchedule(task, start, end) {
  const schedule = calendarService.createSchedule({
    taskId: task.taskId,
    startTime: start,
    endTime: end,
  });
  renderCalendar();
  renderTasks();
  if (task.estimatedDuration == null) editSchedule(schedule.sessionId);
  else toast("Task scheduled");
}

function confirmDeadlineConflict(task, start, end, save) {
  const root = $("#calendarModalRoot");
  const previousFocus = document.activeElement;
  const background = [$(".site-header"), $(".calendar-page")].filter(Boolean);
  root.innerHTML = `<div class="calendar-modal-backdrop deadline-confirm-backdrop"><section class="calendar-deadline-confirm card" role="dialog" aria-modal="true" aria-labelledby="deadlineConflictTitle"><h3 id="deadlineConflictTitle">Deadline conflict</h3><p>This task extends past its deadline.</p><dl><div><dt>Deadline</dt><dd>${esc(formatDate(task.deadline))}, ${esc(formatTime(task.deadline))}</dd></div><div><dt>Scheduled until</dt><dd>${esc(formatDate(end))}, ${esc(formatTime(end))}</dd></div></dl><footer><button class="btn btn-outline" type="button" data-deadline-cancel>Cancel</button><button class="btn btn-primary" type="button" data-deadline-confirm>Schedule anyway</button></footer></section></div>`;
  const dialog = root.querySelector(".calendar-deadline-confirm");
  background.forEach((element) => {
    element.inert = true;
  });
  const close = () => {
    root.innerHTML = "";
    background.forEach((element) => {
      element.inert = false;
    });
    document.removeEventListener("keydown", escape);
    if (previousFocus?.isConnected) previousFocus.focus();
  };
  const escape = (event) => {
    if (event.key === "Escape") close();
  };
  dialog.querySelector("[data-deadline-cancel]").onclick = close;
  dialog.querySelector("[data-deadline-confirm]").onclick = () => {
    close();
    try {
      save();
    } catch (error) {
      toast(error.message);
    }
  };
  document.addEventListener("keydown", escape);
  dialog.querySelector("[data-deadline-cancel]").focus();
}

function validateDeadline(task, start, end, save) {
  if (hasDeadlineConflict(task?.deadline, end))
    confirmDeadlineConflict(task, start, end, save);
  else save();
}

function handleDrop(event, day) {
  event.preventDefault();
  if (!dragged) return;
  const { start } = dropPosition(event, day);
  const duration = dragDurationMinutes();
  const end = new Date(start.getTime() + duration * 60000);
  try {
    const task = draggedTask();
    if (dragged.type === "task") {
      validateDeadline(task, start, end, () =>
        saveTaskSchedule(task, start, end),
      );
    } else {
      const sessionId = dragged.id;
      validateDeadline(task, start, end, () => {
        calendarService.updateSchedule(sessionId, {
          startTime: start,
          endTime: end,
        });
        renderCalendar();
        toast("Schedule moved");
      });
    }
  } catch (error) {
    toast(error.message);
  } finally {
    clearDropIndicator();
  }
}

function handleMonthDrop(event, day) {
  event.preventDefault();
  if (dragged?.type !== "session") return;
  const schedule = calendarService
    .getSchedules()
    .find((item) => item.sessionId === dragged.id);
  if (!schedule) return clearDropIndicator();
  const oldStart = new Date(schedule.startTime);
  const duration = new Date(schedule.endTime) - oldStart;
  const start = new Date(`${day.dataset.monthDate}T00:00:00`);
  start.setHours(
    oldStart.getHours(),
    oldStart.getMinutes(),
    oldStart.getSeconds(),
    oldStart.getMilliseconds(),
  );
  const end = new Date(start.getTime() + duration);
  try {
    const task = tasks.find((item) => item.taskId === schedule.taskId);
    validateDeadline(task, start, end, () => {
      calendarService.updateSchedule(schedule.sessionId, {
        startTime: start,
        endTime: end,
      });
      renderCalendar();
      toast("Schedule moved");
    });
  } catch (error) {
    toast(error.message);
  } finally {
    clearDropIndicator();
  }
}

function modal(content) {
  const root = $("#calendarModalRoot");
  root.innerHTML = `<div class="calendar-modal-backdrop"><section class="calendar-modal card" role="dialog" aria-modal="true">${content}</section></div>`;
  const close = () => {
    root.innerHTML = "";
    document.removeEventListener("keydown", escape);
  };
  const escape = (event) => {
    if (event.key === "Escape") close();
  };
  root
    .querySelectorAll("[data-calendar-close]")
    .forEach((button) => (button.onclick = close));
  root.firstElementChild.onclick = (event) => {
    if (event.target === event.currentTarget) close();
  };
  document.addEventListener("keydown", escape);
  return close;
}

function showDetails(sessionId) {
  const schedule = calendarService
    .getSchedules()
    .find((item) => item.sessionId === sessionId);
  const task = tasks.find((item) => item.taskId === schedule?.taskId);
  if (!schedule || !task) return;
  const course = courseFor(task);
  const hours =
    (new Date(schedule.endTime) - new Date(schedule.startTime)) / 3600000;
  const inactive = isInactiveFutureSchedule(schedule, task);
  const close = modal(
    `<header><div><span class="eyebrow">Scheduled task</span><h2>${esc(task.taskName || task.name)}</h2></div><button type="button" data-calendar-close aria-label="Close">×</button></header>${inactive ? '<p class="calendar-completed-note">This future session is inactive because the task is completed. It has not been deleted.</p>' : ""}<dl><div><dt>Course</dt><dd>${esc(course.courseName || "Course")}</dd></div><div><dt>Deadline</dt><dd>${esc(formatDate(task.deadline))}</dd></div><div><dt>Scheduled start</dt><dd>${esc(formatDate(schedule.startTime))}, ${esc(formatTime(schedule.startTime))}</dd></div><div><dt>Scheduled end</dt><dd>${esc(formatDate(schedule.endTime))}, ${esc(formatTime(schedule.endTime))}</dd></div><div><dt>Duration</dt><dd>${esc(Number(hours.toFixed(2)))}h</dd></div></dl><footer><button class="btn btn-danger" type="button" data-remove-session>Remove</button><a class="btn btn-outline" href="course-detail.html?courseId=${encodeURIComponent(task.courseId)}&taskId=${encodeURIComponent(task.taskId)}">Open/Edit Task</a>${inactive ? "" : '<button class="btn btn-primary" type="button" data-edit-session>Edit schedule</button>'}</footer>`,
  );
  $("[data-remove-session]").onclick = () => {
    calendarService.deleteSchedule(sessionId);
    close();
    renderCalendar();
    renderTasks();
    toast("Schedule removed");
  };
  const edit = $("[data-edit-session]");
  if (edit)
    edit.onclick = () => {
      close();
      editSchedule(sessionId);
    };
}

function editSchedule(sessionId) {
  const schedule = calendarService
    .getSchedules()
    .find((item) => item.sessionId === sessionId);
  const task = tasks.find((item) => item.taskId === schedule?.taskId);
  if (!schedule || !task) return;
  const close = modal(
    `<header><div><span class="eyebrow">Edit schedule</span><h2>${esc(task.taskName || task.name)}</h2></div><button type="button" data-calendar-close aria-label="Close">×</button></header><form id="calendarEditForm"><div class="schedule-field"><span>Start</span><input name="startTime" type="datetime-local" value="${localValue(schedule.startTime)}" required></div><div class="schedule-field"><span>End</span><input name="endTime" type="datetime-local" value="${localValue(schedule.endTime)}" required></div><p class="calendar-form-error" role="alert"></p><footer><button class="btn btn-outline" type="button" data-calendar-close>Cancel</button><button class="btn btn-primary" type="submit">Save schedule</button></footer></form>`,
  );
  enhanceScheduleDateTime($("#calendarEditForm [name=startTime]"), "Start");
  enhanceScheduleDateTime($("#calendarEditForm [name=endTime]"), "End");
  $("#calendarEditForm").onsubmit = (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      calendarService.updateSchedule(sessionId, values);
      close();
      renderCalendar();
      toast("Schedule updated");
    } catch (error) {
      event.currentTarget.querySelector(".calendar-form-error").textContent =
        error.message;
    }
  };
}

export async function initCalendar() {
  if (!initShell()) return;
  try {
    const [loadedTasks, loadedCourses] = await Promise.all([
      taskService.getTasksByUserId(),
      courseService.getCoursesByUserId(),
    ]);
    tasks = loadedTasks.map(enrich).filter((task) => !task.isOverdue);
    courses = loadedCourses;
    renderTasks();
    renderCalendar();
    startCurrentTimeUpdates();
    $("#calendarTaskSearch").oninput = (event) => {
      query = event.target.value.trim().toLowerCase();
      renderTasks();
    };
    document.querySelectorAll("[data-calendar-view]").forEach(
      (button) =>
        (button.onclick = () => {
          view = button.dataset.calendarView;
          if (view === "week") weekStart = mondayOf(selectedDate);
          renderCalendar();
        }),
    );
    $("#calendarToday").onclick = () => {
      selectedDate = new Date();
      weekStart = mondayOf(selectedDate);
      renderCalendar();
    };
    $("#calendarPrev").onclick = () => {
      if (view === "week") {
        weekStart = addDays(weekStart, -7);
        selectedDate = new Date(weekStart);
      } else if (view === "day") selectedDate = addDays(selectedDate, -1);
      else
        selectedDate = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth() - 1,
          1,
        );
      renderCalendar();
    };
    $("#calendarNext").onclick = () => {
      if (view === "week") {
        weekStart = addDays(weekStart, 7);
        selectedDate = new Date(weekStart);
      } else if (view === "day") selectedDate = addDays(selectedDate, 1);
      else
        selectedDate = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth() + 1,
          1,
        );
      renderCalendar();
    };
    $("#weeklyCalendar").addEventListener("dragover", (event) => {
      const monthDay = event.target.closest(".month-day");
      if (monthDay && dragged?.type === "session") {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        document
          .querySelectorAll(".month-day.drop-target")
          .forEach((element) => {
            if (element !== monthDay) element.classList.remove("drop-target");
          });
        monthDay.classList.add("drop-target");
        return;
      }
      const day = event.target.closest(".calendar-day-body");
      if (!day || !dragged) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = dragged.type === "task" ? "copy" : "move";
      document
        .querySelectorAll(".calendar-drop-indicator")
        .forEach((element) => {
          if (element.parentElement !== day) element.remove();
        });
      showDropIndicator(event, day);
    });
    $("#weeklyCalendar").addEventListener("drop", (event) => {
      const monthDay = event.target.closest(".month-day");
      if (monthDay) return handleMonthDrop(event, monthDay);
      const day = event.target.closest(".calendar-day-body");
      if (day) handleDrop(event, day);
    });
    addEventListener(taskService.TASKS_CHANGED_EVENT, async () => {
      try {
        tasks = (await taskService.getTasksByUserId())
          .map(enrich)
          .filter((task) => !task.isOverdue);
        renderTasks();
        renderCalendar();
      } catch (error) {
        toast(error.message);
      }
    });
  } catch (error) {
    toast(error.message);
  }
}
