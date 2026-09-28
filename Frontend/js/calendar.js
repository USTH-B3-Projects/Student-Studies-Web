import * as taskService from "./services/taskService.js";
import * as courseService from "./services/courseService.js";
import * as calendarService from "./services/calendarService.js";

const START_HOUR = 0;
const END_HOUR = 24;
const SLOT_HEIGHT = 60;
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
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
const toast = (message) => {
  const element = document.createElement("div");
  element.className = "toast";
  element.textContent = message;
  document.body.append(element);
  setTimeout(() => element.remove(), 2400);
};

let tasks = [];
let courses = [];
let weekStart = mondayOf(new Date());
let selectedDate = new Date();
let view = "week";
let filter = "all";
let query = "";
let dragged = null;

function courseFor(task) {
  return courses.find((course) => course.courseId === task.courseId) || {};
}

function isCompleted(task) {
  return Number(task.currentProgress) === 100;
}

function durationHours(task) {
  const value = Number(task?.estimatedDuration);
  return value > 0 ? value : 1;
}

function renderTasks() {
  const now = new Date();
  const scheduledIds = new Set(calendarService.getSchedules().map((schedule) => schedule.taskId));
  const matching = tasks.filter((task) => {
    const scheduled = scheduledIds.has(task.taskId);
    const matchesFilter = filter === "all" || (filter === "scheduled" && scheduled) || (filter === "unscheduled" && !scheduled);
    const course = courseFor(task);
    return !isCompleted(task) && new Date(task.deadline) >= now && matchesFilter && `${task.taskName || task.name} ${course.courseName || ""}`.toLowerCase().includes(query);
  });
  const visible = matching.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  $("#calendarFilters").innerHTML = [["all", "All"], ["unscheduled", "Not scheduled"], ["scheduled", "Scheduled"]].map(([value, label]) => `<button class="${filter === value ? "active" : ""}" type="button" data-calendar-filter="${value}">${label}</button>`).join("");
  $("#calendarTaskList").innerHTML = visible.length ? visible.map((task) => {
    const course = courseFor(task);
    const color = course.color || "#1267ed";
    return `<article class="calendar-task-card" draggable="true" data-calendar-task="${esc(task.taskId)}" style="--accent:${esc(color)}"><span class="task-accent"></span><div><strong>${esc(task.taskName || task.name)}</strong><span class="course-pill">${esc(course.courseName || "Course")}</span><small><span>▣ ${esc(formatDate(task.deadline))}</span>${task.estimatedDuration != null ? `<span>◷ ${esc(Number(task.estimatedDuration))}h</span>` : ""}</small></div><span class="drag-grip" aria-hidden="true">⠿</span></article>`;
  }).join("") : '<div class="calendar-empty">No matching tasks.</div>';
  document.querySelectorAll("[data-calendar-filter]").forEach((button) => button.onclick = () => { filter = button.dataset.calendarFilter; renderTasks(); });
  document.querySelectorAll("[data-calendar-task]").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      dragged = { type: "task", id: card.dataset.calendarTask };
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("text/plain", JSON.stringify(dragged));
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => { card.classList.remove("dragging"); clearDropIndicator(); });
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
  renderTimeline(view === "day" ? [selectedDate] : Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)));
}

function renderTimeline(days) {
  const labelDate = view === "day" ? selectedDate : days[3];
  $("#calendarWeekLabel").textContent = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(labelDate);
  const today = dateKey(new Date());
  const schedules = calendarService.getSchedules();
  const calendar = $("#weeklyCalendar");
  calendar.className = `weekly-calendar ${view === "day" ? "day-calendar" : ""}`;
  calendar.innerHTML = `<div class="calendar-corner">GMT${-new Date().getTimezoneOffset() / 60 >= 0 ? "+" : ""}${-new Date().getTimezoneOffset() / 60}</div>${days.map((day) => `<div class="calendar-day-head ${dateKey(day) === today ? "today" : ""}"><strong>${new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day)}</strong><span>${day.getDate()}</span></div>`).join("")}<div class="calendar-times">${Array.from({ length: END_HOUR - START_HOUR - 1 }, (_, index) => `<span style="top:${(index + 1) * SLOT_HEIGHT}px">${pad(START_HOUR + index + 1)}:00</span>`).join("")}</div>${days.map((day) => `<div class="calendar-day-body ${dateKey(day) === today ? "today" : ""}" data-calendar-date="${dateKey(day)}">${schedules.map((schedule) => renderEvent(schedule, day)).join("")}</div>`).join("")}`;
  bindEventBlocks();
}

function renderMonth() {
  const month = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const gridStart = mondayOf(month);
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const schedules = calendarService.getSchedules();
  const today = dateKey(new Date());
  $("#calendarWeekLabel").textContent = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month);
  const calendar = $("#weeklyCalendar");
  calendar.className = "month-calendar";
  calendar.innerHTML = `${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => `<div class="month-weekday">${day}</div>`).join("")}${days.map((day) => {
    const key = dateKey(day);
    const daySchedules = schedules.filter((schedule) => calendarService.getScheduleSegment(schedule, day) && tasks.some((task) => task.taskId === schedule.taskId));
    return `<div class="month-day ${day.getMonth() !== month.getMonth() ? "outside" : ""} ${key === today ? "today" : ""}" data-month-date="${key}"><button class="month-date" type="button" aria-label="Open ${formatDate(day)} in day view">${day.getDate()}</button><div class="month-events">${daySchedules.slice(0, 3).map(renderMonthEvent).join("")}${daySchedules.length > 3 ? `<span class="month-more">+${daySchedules.length - 3} more</span>` : ""}</div></div>`;
  }).join("")}`;
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
  return `<button class="month-event" type="button" draggable="true" data-calendar-session="${esc(schedule.sessionId)}" style="--accent:${esc(courseFor(task).color || "#1267ed")}" title="${esc(formatTime(schedule.startTime))} ${esc(task.taskName || task.name)}"><span></span><strong>${esc(task.taskName || task.name)}</strong></button>`;
}

function bindEventBlocks() {
  document.querySelectorAll("[data-calendar-session]").forEach((eventBlock) => {
    eventBlock.onclick = (event) => { event.stopPropagation(); showDetails(eventBlock.dataset.calendarSession); };
    eventBlock.addEventListener("dragstart", (event) => {
      event.stopPropagation();
      dragged = { type: "session", id: eventBlock.dataset.calendarSession };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", JSON.stringify(dragged));
      eventBlock.classList.add("dragging");
    });
    eventBlock.addEventListener("dragend", () => { eventBlock.classList.remove("dragging"); clearDropIndicator(); });
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
  return `<button class="calendar-event" type="button" draggable="true" data-calendar-session="${esc(schedule.sessionId)}" style="--accent:${esc(course.color || "#1267ed")};top:${top}px;height:${height}px" title="Open schedule details"><strong>${esc(task.taskName || task.name)}</strong><span>${esc(formatTime(start))} – ${esc(formatTime(end))}</span></button>`;
}

function dropPosition(event, day) {
  const rect = day.getBoundingClientRect();
  const minutes = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60 - 30, Math.round(((event.clientY - rect.top) / SLOT_HEIGHT * 60) / 30) * 30));
  const start = new Date(`${day.dataset.calendarDate}T00:00:00`);
  start.setMinutes(START_HOUR * 60 + minutes);
  return { start, minutes };
}

function dragDurationMinutes() {
  if (dragged?.type === "task") return durationHours(tasks.find((task) => task.taskId === dragged.id)) * 60;
  const schedule = calendarService.getSchedules().find((item) => item.sessionId === dragged?.id);
  return schedule ? (new Date(schedule.endTime) - new Date(schedule.startTime)) / 60000 : 60;
}

function showDropIndicator(event, day) {
  const { minutes } = dropPosition(event, day);
  let indicator = day.querySelector(".calendar-drop-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.className = "calendar-drop-indicator";
    day.append(indicator);
  }
  indicator.style.top = `${minutes}px`;
  indicator.style.height = `${Math.max(30, Math.min(dragDurationMinutes(), (END_HOUR - START_HOUR) * 60 - minutes))}px`;
}

function clearDropIndicator() {
  document.querySelectorAll(".calendar-drop-indicator").forEach((element) => element.remove());
  document.querySelectorAll(".month-day.drop-target").forEach((element) => element.classList.remove("drop-target"));
  dragged = null;
}

function handleDrop(event, day) {
  event.preventDefault();
  if (!dragged) return;
  const { start } = dropPosition(event, day);
  const duration = dragDurationMinutes();
  const end = new Date(start.getTime() + duration * 60000);
  try {
    if (dragged.type === "task") {
      const task = tasks.find((item) => item.taskId === dragged.id);
      const schedule = calendarService.createSchedule({ taskId: dragged.id, startTime: start, endTime: end });
      renderCalendar();
      renderTasks();
      if (task?.estimatedDuration == null) editSchedule(schedule.sessionId);
      else toast("Task scheduled");
    } else {
      calendarService.updateSchedule(dragged.id, { startTime: start, endTime: end });
      renderCalendar();
      toast("Schedule moved");
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
  const schedule = calendarService.getSchedules().find((item) => item.sessionId === dragged.id);
  if (!schedule) return clearDropIndicator();
  const oldStart = new Date(schedule.startTime);
  const duration = new Date(schedule.endTime) - oldStart;
  const start = new Date(`${day.dataset.monthDate}T00:00:00`);
  start.setHours(oldStart.getHours(), oldStart.getMinutes(), oldStart.getSeconds(), oldStart.getMilliseconds());
  try {
    calendarService.updateSchedule(schedule.sessionId, { startTime: start, endTime: new Date(start.getTime() + duration) });
    renderCalendar();
    toast("Schedule moved");
  } catch (error) {
    toast(error.message);
  } finally {
    clearDropIndicator();
  }
}

function modal(content) {
  const root = $("#calendarModalRoot");
  root.innerHTML = `<div class="calendar-modal-backdrop"><section class="calendar-modal card" role="dialog" aria-modal="true">${content}</section></div>`;
  const close = () => { root.innerHTML = ""; document.removeEventListener("keydown", escape); };
  const escape = (event) => { if (event.key === "Escape") close(); };
  root.querySelectorAll("[data-calendar-close]").forEach((button) => button.onclick = close);
  root.firstElementChild.onclick = (event) => { if (event.target === event.currentTarget) close(); };
  document.addEventListener("keydown", escape);
  return close;
}

function showDetails(sessionId) {
  const schedule = calendarService.getSchedules().find((item) => item.sessionId === sessionId);
  const task = tasks.find((item) => item.taskId === schedule?.taskId);
  if (!schedule || !task) return;
  const course = courseFor(task);
  const hours = (new Date(schedule.endTime) - new Date(schedule.startTime)) / 3600000;
  const close = modal(`<header><div><span class="eyebrow">Scheduled task</span><h2>${esc(task.taskName || task.name)}</h2></div><button type="button" data-calendar-close aria-label="Close">×</button></header><dl><div><dt>Course</dt><dd>${esc(course.courseName || "Course")}</dd></div><div><dt>Deadline</dt><dd>${esc(formatDate(task.deadline))}</dd></div><div><dt>Scheduled start</dt><dd>${esc(formatDate(schedule.startTime))}, ${esc(formatTime(schedule.startTime))}</dd></div><div><dt>Scheduled end</dt><dd>${esc(formatDate(schedule.endTime))}, ${esc(formatTime(schedule.endTime))}</dd></div><div><dt>Duration</dt><dd>${esc(Number(hours.toFixed(2)))}h</dd></div></dl><footer><button class="btn btn-danger" type="button" data-remove-session>Remove</button><a class="btn btn-outline" href="course-detail.html?courseId=${encodeURIComponent(task.courseId)}&taskId=${encodeURIComponent(task.taskId)}">Open/Edit Task</a><button class="btn btn-primary" type="button" data-edit-session>Edit schedule</button></footer>`);
  $("[data-remove-session]").onclick = () => { calendarService.deleteSchedule(sessionId); close(); renderCalendar(); renderTasks(); toast("Schedule removed"); };
  $("[data-edit-session]").onclick = () => { close(); editSchedule(sessionId); };
}

function enhanceScheduleDateTime(input, label) {
  const root = $("#calendarModalRoot");
  const picker = document.createElement("div");
  const datePanel = document.createElement("div");
  const timePanel = document.createElement("div");
  picker.className = "deadline-picker has-value";
  picker.tabIndex = 0;
  picker.setAttribute("role", "button");
  picker.setAttribute("aria-label", `Select ${label.toLowerCase()} date and time`);
  picker.innerHTML = `<span class="deadline-picker-calendar" aria-hidden="true">&#128197;</span><span class="deadline-picker-display"></span><span class="deadline-picker-chevron" aria-hidden="true">&rsaquo;</span>`;
  datePanel.className = "deadline-date-picker";
  datePanel.hidden = true;
  datePanel.innerHTML = `<strong>Select date</strong><div class="deadline-calendar-header"><span data-picker-month></span><div class="deadline-calendar-nav"><button type="button" data-picker-prev aria-label="Previous month">&lsaquo;</button><button type="button" data-picker-next aria-label="Next month">&rsaquo;</button></div></div><div class="deadline-calendar-weekdays" aria-hidden="true">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}</div><div class="deadline-calendar-grid" role="grid"></div><button type="button" class="btn btn-primary" data-picker-continue>Continue</button>`;
  timePanel.className = "deadline-time-picker";
  timePanel.hidden = true;
  timePanel.innerHTML = `<strong>Select time</strong><div class="deadline-time-controls"><label>Hour<select data-picker-hour>${Array.from({ length: 12 }, (_, index) => `<option>${index + 1}</option>`).join("")}</select></label><label>Minute<select data-picker-minute>${Array.from({ length: 60 }, (_, index) => `<option>${pad(index)}</option>`).join("")}</select></label><label>Period<select data-picker-period><option>AM</option><option>PM</option></select></label></div><button type="button" class="btn btn-primary" data-picker-done>Done</button>`;
  input.before(picker);
  picker.append(input);
  root.append(datePanel, timePanel);
  input.classList.add("deadline-picker-input");
  input.tabIndex = -1;

  const display = picker.querySelector(".deadline-picker-display");
  const grid = datePanel.querySelector(".deadline-calendar-grid");
  const monthLabel = datePanel.querySelector("[data-picker-month]");
  const hour = timePanel.querySelector("[data-picker-hour]");
  const minute = timePanel.querySelector("[data-picker-minute]");
  const period = timePanel.querySelector("[data-picker-period]");
  let selectedDate = input.value.slice(0, 10);
  let visibleMonth = new Date(`${selectedDate}T00:00:00`);
  visibleMonth.setDate(1);

  const position = (panel) => {
    const rect = picker.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 16);
    panel.style.width = `${width}px`;
    panel.style.left = `${Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)}px`;
    panel.style.maxHeight = `${window.innerHeight - 16}px`;
    panel.style.top = `${Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - panel.offsetHeight - 8))}px`;
  };
  const updateDisplay = () => {
    const value = new Date(input.value);
    display.textContent = `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(value)} · ${new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(value)}`;
  };
  const renderDates = () => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    monthLabel.textContent = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(visibleMonth);
    grid.innerHTML = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(year, month, index - firstDay + 1);
      const value = dateKey(date);
      return `<button type="button" class="deadline-calendar-day${date.getMonth() === month ? "" : " is-outside"}${value === selectedDate ? " is-selected" : ""}" data-picker-date="${value}" role="gridcell" aria-selected="${value === selectedDate}">${date.getDate()}</button>`;
    }).join("");
  };
  const openDate = () => {
    root.querySelectorAll(".deadline-date-picker, .deadline-time-picker").forEach((panel) => (panel.hidden = true));
    selectedDate = input.value.slice(0, 10);
    const selected = new Date(`${selectedDate}T00:00:00`);
    visibleMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
    renderDates();
    datePanel.hidden = false;
    position(datePanel);
  };
  const openTime = () => {
    const selected = new Date(input.value);
    hour.value = String(selected.getHours() % 12 || 12);
    minute.value = pad(selected.getMinutes());
    period.value = selected.getHours() >= 12 ? "PM" : "AM";
    timePanel.hidden = false;
    position(timePanel);
    hour.focus();
  };
  picker.onclick = openDate;
  picker.onkeydown = (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); openDate(); } };
  datePanel.onclick = (event) => {
    if (event.target.closest("[data-picker-prev]")) visibleMonth.setMonth(visibleMonth.getMonth() - 1);
    else if (event.target.closest("[data-picker-next]")) visibleMonth.setMonth(visibleMonth.getMonth() + 1);
    else if (event.target.closest("[data-picker-date]")) selectedDate = event.target.closest("[data-picker-date]").dataset.pickerDate;
    else if (event.target.closest("[data-picker-continue]")) { datePanel.hidden = true; return openTime(); }
    else return;
    renderDates();
  };
  timePanel.querySelector("[data-picker-done]").onclick = () => {
    let hours = Number(hour.value) % 12;
    if (period.value === "PM") hours += 12;
    input.value = `${selectedDate}T${pad(hours)}:${minute.value}`;
    updateDisplay();
    timePanel.hidden = true;
    picker.focus();
  };
  updateDisplay();
}

function editSchedule(sessionId) {
  const schedule = calendarService.getSchedules().find((item) => item.sessionId === sessionId);
  const task = tasks.find((item) => item.taskId === schedule?.taskId);
  if (!schedule || !task) return;
  const close = modal(`<header><div><span class="eyebrow">Edit schedule</span><h2>${esc(task.taskName || task.name)}</h2></div><button type="button" data-calendar-close aria-label="Close">×</button></header><form id="calendarEditForm"><div class="schedule-field"><span>Start</span><input name="startTime" type="datetime-local" value="${localValue(schedule.startTime)}" required></div><div class="schedule-field"><span>End</span><input name="endTime" type="datetime-local" value="${localValue(schedule.endTime)}" required></div><p class="calendar-form-error" role="alert"></p><footer><button class="btn btn-outline" type="button" data-calendar-close>Cancel</button><button class="btn btn-primary" type="submit">Save schedule</button></footer></form>`);
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
      event.currentTarget.querySelector(".calendar-form-error").textContent = error.message;
    }
  };
}

async function init() {
  try {
    [tasks, courses] = await Promise.all([taskService.getTasksByUserId(), courseService.getCoursesByUserId()]);
    renderTasks();
    renderCalendar();
    $("#calendarTaskSearch").oninput = (event) => { query = event.target.value.trim().toLowerCase(); renderTasks(); };
    document.querySelectorAll("[data-calendar-view]").forEach((button) => button.onclick = () => {
      view = button.dataset.calendarView;
      if (view === "week") weekStart = mondayOf(selectedDate);
      renderCalendar();
    });
    $("#calendarToday").onclick = () => { selectedDate = new Date(); weekStart = mondayOf(selectedDate); renderCalendar(); };
    $("#calendarPrev").onclick = () => {
      if (view === "week") { weekStart = addDays(weekStart, -7); selectedDate = new Date(weekStart); }
      else if (view === "day") selectedDate = addDays(selectedDate, -1);
      else selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
      renderCalendar();
    };
    $("#calendarNext").onclick = () => {
      if (view === "week") { weekStart = addDays(weekStart, 7); selectedDate = new Date(weekStart); }
      else if (view === "day") selectedDate = addDays(selectedDate, 1);
      else selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
      renderCalendar();
    };
    $("#weeklyCalendar").addEventListener("dragover", (event) => {
      const monthDay = event.target.closest(".month-day");
      if (monthDay && dragged?.type === "session") {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        document.querySelectorAll(".month-day.drop-target").forEach((element) => { if (element !== monthDay) element.classList.remove("drop-target"); });
        monthDay.classList.add("drop-target");
        return;
      }
      const day = event.target.closest(".calendar-day-body");
      if (!day || !dragged) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = dragged.type === "task" ? "copy" : "move";
      document.querySelectorAll(".calendar-drop-indicator").forEach((element) => { if (element.parentElement !== day) element.remove(); });
      showDropIndicator(event, day);
    });
    $("#weeklyCalendar").addEventListener("drop", (event) => {
      const monthDay = event.target.closest(".month-day");
      if (monthDay) return handleMonthDrop(event, monthDay);
      const day = event.target.closest(".calendar-day-body");
      if (day) handleDrop(event, day);
    });
  } catch (error) {
    toast(error.message);
  }
}

init();
