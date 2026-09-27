import * as authService from "./services/authService.js";
import * as courseService from "./services/courseService.js";
import * as taskService from "./services/taskService.js";
import * as smartService from "./services/smartService.js";

const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const fmtDate = (d) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(d),
  );
const fmtDateTime = (d) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));
const localDateTimeValue = (d) => {
  const date = new Date(d);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const dueLabel = (d) => {
  const deadline = new Date(d),
    now = new Date(),
    ms = deadline - now,
    days =
      (Date.UTC(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()) -
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      86400000;
  if (ms < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
};
const toast = (msg) => {
  const e = document.createElement("div");
  e.className = "toast";
  e.textContent = msg;
  document.body.append(e);
  setTimeout(() => e.remove(), 2600);
};
function modal(title, body, onSubmit) {
  const root = $("#modalRoot");
  const isTask = body.includes("task-modal-form");
  root.innerHTML = `<div class="modal-backdrop open"><div class="modal card ${isTask ? "task-modal" : ""}">${isTask ? `<header class="task-modal-header"><span class="task-modal-plus" aria-hidden="true">+</span><div class="task-modal-title"><h2>${title === "Add task" ? "Create a new task" : title}</h2><p>${title === "Add task" ? "Add the details below to plan your task and stay on track." : "Update the details for this task."}</p></div><div class="task-modal-art" aria-hidden="true"><img src="../source/studyflow-note/task_1.png" alt=""><img src="../source/studyflow-note/small_step_big_progress.png" alt=""></div><button type="button" class="task-modal-close" data-close aria-label="Close modal">&times;</button></header>` : `<h2>${title}</h2>`}${body}</div></div>`;
  const close = () => (root.innerHTML = "");
  root.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", close));
  const duration = root.querySelector("[data-duration-select]");
  const customDuration = root.querySelector("[data-custom-duration]");
  const enhanceSelect = (select) => {
    const picker = document.createElement("div");
    const trigger = document.createElement("button");
    const options = document.createElement("div");
    picker.className = "ui-select-picker";
    trigger.type = "button";
    trigger.className = "ui-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    options.className = "ui-select-options";
    options.setAttribute("role", "listbox");
    options.hidden = true;
    options.innerHTML = [...select.options].map((option) => `<button type="button" role="option" data-select-value="${option.value}" aria-selected="${option.selected}"><span>${option.textContent}</span></button>`).join("");
    select.before(picker);
    picker.append(select, trigger);
    root.append(options);
    select.classList.add("ui-native-select");
    const closeOptions = () => {
      options.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    };
    const sync = () => {
      trigger.innerHTML = `<span>${select.selectedOptions[0].textContent}</span><span aria-hidden="true">⌄</span>`;
      options.querySelectorAll("[data-select-value]").forEach((option) => option.setAttribute("aria-selected", option.dataset.selectValue === select.value));
    };
    trigger.addEventListener("click", () => {
      const opening = options.hidden;
      root.querySelectorAll(".ui-select-options:not([hidden])").forEach((menu) => (menu.hidden = true));
      root.querySelectorAll('.ui-select-trigger[aria-expanded="true"]').forEach((button) => button.setAttribute("aria-expanded", "false"));
      if (!opening) return;
      const rect = trigger.getBoundingClientRect();
      options.style.width = `${rect.width}px`;
      options.style.left = `${rect.left}px`;
      options.hidden = false;
      options.style.maxHeight = `${Math.max(160, Math.min(390, window.innerHeight - 32))}px`;
      const menuHeight = options.offsetHeight;
      const top = rect.bottom + 8 + menuHeight <= window.innerHeight ? rect.bottom + 8 : Math.max(8, rect.top - menuHeight - 8);
      options.style.top = `${top}px`;
      trigger.setAttribute("aria-expanded", "true");
      options.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    });
    options.addEventListener("click", (event) => {
      const option = event.target.closest("[data-select-value]");
      if (!option) return;
      select.value = option.dataset.selectValue;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      closeOptions();
      if (select.value !== "custom") trigger.focus();
    });
    select.addEventListener("change", sync);
    root.addEventListener("click", (event) => {
      if (!picker.contains(event.target) && !options.contains(event.target)) closeOptions();
    });
    sync();
    return { trigger, close: closeOptions, sync };
  };
  if (duration) enhanceSelect(duration);
  const pickerOnly = root.querySelector('input[type="datetime-local"][name="deadline"]');
  if (pickerOnly) {
    const picker = document.createElement("div");
    const display = document.createElement("span");
    const icon = document.createElement("span");
    const chevron = document.createElement("span");
    const datePicker = document.createElement("div");
    const timePicker = document.createElement("div");
    picker.className = "deadline-picker";
    display.className = "deadline-picker-display";
    icon.className = "deadline-picker-calendar";
    icon.textContent = "📅";
    chevron.className = "deadline-picker-chevron";
    chevron.textContent = "›";
    icon.setAttribute("aria-hidden", "true");
    chevron.setAttribute("aria-hidden", "true");
    datePicker.className = "deadline-date-picker";
    datePicker.hidden = true;
    datePicker.innerHTML = `<strong>Select date</strong><div class="deadline-calendar-header"><span data-deadline-month></span><div class="deadline-calendar-nav"><button type="button" data-deadline-prev aria-label="Previous month">&lsaquo;</button><button type="button" data-deadline-next aria-label="Next month">&rsaquo;</button></div></div><div class="deadline-calendar-weekdays" aria-hidden="true">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}</div><div class="deadline-calendar-grid" role="grid"></div><button type="button" class="btn btn-primary" data-deadline-continue disabled>Continue</button>`;
    timePicker.className = "deadline-time-picker";
    timePicker.hidden = true;
    timePicker.innerHTML = `<strong>Select time</strong><div class="deadline-time-controls"><label>Hour<select data-deadline-hour>${Array.from({ length: 12 }, (_, i) => `<option>${i + 1}</option>`).join("")}</select></label><label>Minute<select data-deadline-minute>${Array.from({ length: 60 }, (_, i) => `<option>${String(i).padStart(2, "0")}</option>`).join("")}</select></label><label>Period<select data-deadline-period><option>AM</option><option>PM</option></select></label></div><button type="button" class="btn btn-primary" data-deadline-done>Done</button>`;
    pickerOnly.before(picker);
    picker.append(pickerOnly, icon, display, chevron);
    root.append(datePicker, timePicker);
    pickerOnly.classList.add("deadline-picker-input");
    pickerOnly.tabIndex = -1;
    const updateDeadlineDisplay = () => {
      picker.classList.toggle("has-value", Boolean(pickerOnly.value));
      if (!pickerOnly.value) return (display.textContent = "Select a deadline");
      const deadline = new Date(pickerOnly.value);
      const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(deadline);
      const time = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(deadline);
      display.textContent = `${date} · ${time}`;
    };
    const hour = timePicker.querySelector("[data-deadline-hour]");
    const minute = timePicker.querySelector("[data-deadline-minute]");
    const period = timePicker.querySelector("[data-deadline-period]");
    const hourPicker = enhanceSelect(hour);
    const minutePicker = enhanceSelect(minute);
    const periodPicker = enhanceSelect(period);
    const monthLabel = datePicker.querySelector("[data-deadline-month]");
    const calendarGrid = datePicker.querySelector(".deadline-calendar-grid");
    const continueButton = datePicker.querySelector("[data-deadline-continue]");
    let selectedDate = pickerOnly.value.slice(0, 10);
    let visibleMonth = selectedDate ? new Date(`${selectedDate}T00:00`) : new Date();
    visibleMonth.setDate(1);
    const positionPanel = (panel) => {
      const rect = picker.getBoundingClientRect();
      const width = Math.min(340, window.innerWidth - 16);
      panel.style.width = `${width}px`;
      panel.style.left = `${Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)}px`;
      panel.style.maxHeight = `${window.innerHeight - 16}px`;
      const panelHeight = panel.offsetHeight;
      const top = rect.bottom + 8 + panelHeight <= window.innerHeight ? rect.bottom + 8 : Math.max(8, rect.top - panelHeight - 8);
      panel.style.top = `${top}px`;
    };
    const dateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const renderCalendar = () => {
      const year = visibleMonth.getFullYear();
      const month = visibleMonth.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      monthLabel.textContent = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(visibleMonth);
      calendarGrid.innerHTML = Array.from({ length: 42 }, (_, index) => {
        const date = new Date(year, month, index - firstDay + 1);
        const value = dateValue(date);
        return `<button type="button" class="deadline-calendar-day${date.getMonth() === month ? "" : " is-outside"}${value === selectedDate ? " is-selected" : ""}" data-deadline-date="${value}" role="gridcell" aria-selected="${value === selectedDate}">${date.getDate()}</button>`;
      }).join("");
      continueButton.disabled = !selectedDate;
    };
    const openDatePicker = () => {
      selectedDate = pickerOnly.value.slice(0, 10) || selectedDate;
      const selected = selectedDate ? new Date(`${selectedDate}T00:00`) : new Date();
      visibleMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
      timePicker.hidden = true;
      datePicker.hidden = false;
      renderCalendar();
      positionPanel(datePicker);
    };
    const openTimePicker = () => {
      const selected = pickerOnly.value ? new Date(pickerOnly.value) : new Date();
      const hours = selected.getHours();
      hour.value = String(hours % 12 || 12);
      minute.value = String(selected.getMinutes()).padStart(2, "0");
      period.value = hours >= 12 ? "PM" : "AM";
      hourPicker.sync();
      minutePicker.sync();
      periodPicker.sync();
      timePicker.hidden = false;
      positionPanel(timePicker);
      hourPicker.trigger.focus();
    };
    picker.tabIndex = 0;
    picker.setAttribute("role", "button");
    picker.setAttribute("aria-label", "Select deadline date and time");
    picker.addEventListener("click", (event) => {
      if (!event.target.closest(".deadline-date-picker, .deadline-time-picker")) openDatePicker();
    });
    picker.addEventListener("keydown", (event) => {
      if (event.target === picker && ["Enter", " "].includes(event.key)) {
        event.preventDefault();
        openDatePicker();
      }
    });
    datePicker.addEventListener("click", (event) => {
      event.stopPropagation();
      if (event.target.closest("[data-deadline-prev]")) visibleMonth.setMonth(visibleMonth.getMonth() - 1);
      else if (event.target.closest("[data-deadline-next]")) visibleMonth.setMonth(visibleMonth.getMonth() + 1);
      else if (event.target.closest("[data-deadline-date]")) selectedDate = event.target.closest("[data-deadline-date]").dataset.deadlineDate;
      else if (event.target.closest("[data-deadline-continue]")) {
        datePicker.hidden = true;
        return openTimePicker();
      } else return;
      renderCalendar();
    });
    timePicker.querySelector("[data-deadline-done]").addEventListener("click", () => {
      let hours = Number(hour.value) % 12;
      if (period.value === "PM") hours += 12;
      pickerOnly.value = `${selectedDate}T${String(hours).padStart(2, "0")}:${minute.value}`;
      pickerOnly.dispatchEvent(new Event("input", { bubbles: true }));
      pickerOnly.dispatchEvent(new Event("change", { bubbles: true }));
      timePicker.hidden = true;
      picker.focus();
    });
    pickerOnly.addEventListener("input", updateDeadlineDisplay);
    pickerOnly.addEventListener("change", updateDeadlineDisplay);
    updateDeadlineDisplay();
  }
  pickerOnly?.addEventListener("keydown", (event) => {
    const manualEdit = (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) || ["Backspace", "Delete"].includes(event.key);
    if (manualEdit) event.preventDefault();
  });
  pickerOnly?.addEventListener("beforeinput", (event) => {
    if (event.inputType) event.preventDefault();
  });
  pickerOnly?.addEventListener("paste", (event) => event.preventDefault());
  pickerOnly?.addEventListener("drop", (event) => event.preventDefault());
  duration?.addEventListener("change", () => {
    const custom = duration.value === "custom";
    customDuration.hidden = !custom;
    customDuration.required = custom;
    if (!custom) customDuration.value = duration.value;
    if (custom) customDuration.focus();
  });
  root.querySelectorAll("[data-range]").forEach((input) => {
    const output = root.querySelector(`[data-range-output="${input.name}"]`);
    const labels = input.dataset.labels?.split("|");
    const update = () => {
      output.textContent = labels?.[input.value] ?? `${input.value}%`;
      const progress = (input.value - input.min) / (input.max - input.min) * 100;
      const slider = input.closest(".progress-slider");
      slider?.style.setProperty("--progress", `${progress}%`);
      slider?.querySelectorAll("[data-range-value]").forEach((marker) => {
        const selected = marker.dataset.rangeValue === input.value;
        marker.classList.toggle("is-selected", selected);
        marker.setAttribute("aria-pressed", selected);
      });
    };
    input.closest(".progress-slider")?.querySelectorAll("[data-range-value]").forEach((marker) => marker.addEventListener("click", () => {
      input.value = marker.dataset.rangeValue;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }));
    input.addEventListener("input", update);
    update();
  });
  root.querySelector("form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const courseSearch = e.target.querySelector("[data-course-search]");
    if (courseSearch && !e.target.elements.courseId.value) {
      courseSearch.setCustomValidity("Select or create a course");
      return courseSearch.reportValidity();
    }
    onSubmit(new FormData(e.target), close);
  });
  root.querySelector(".modal-backdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) close();
  });
}
function taskForm(task = {}) {
  const taskNameField = task.taskName || task.name || "";
  const duration = task.estimatedDuration ?? "";
  const presets = ["", ".25", ".5", "1", "2", "3", "4", "5"];
  const custom = duration !== "" && !presets.includes(String(duration));
  const importance = ["very-low", "low", "medium", "high", "very-high"];
  const importanceIndex = Math.max(0, importance.indexOf(task.importance || "medium"));
  const markers = (values, labels) => `<span class="slider-markers">${values.map((value, index) => `<button type="button" class="slider-marker" style="left:${index * 25}%" data-range-value="${value}" aria-label="Set to ${labels[index]}"><span>${labels[index]}</span></button>`).join("")}</span>`;
  return `<form class="modal-form task-modal-form"><div class="task-modal-body"><section class="task-details"><div class="section-heading"><div><strong>Basic Information</strong><small>Give your task a clear name and add any useful notes.</small></div></div><div class="form-field"><label>Task name <b>*</b></label><input class="input" name="taskName" required value="${esc(taskNameField)}" placeholder="e.g. Finish Deep Learning lab"></div><div class="form-field"><div class="field-label"><label>Note</label><small>Optional</small></div><textarea class="textarea" name="description" rows="3" maxlength="500" placeholder="Add a note...">${esc(task.description || "")}</textarea></div></section><section class="planning"><div class="section-heading"><div><strong>Planning &amp; Prioritization</strong><small>Set a deadline, estimate the effort, and indicate how important this task is.</small></div></div><div class="planning-grid"><div class="form-field"><label>Deadline <b>*</b></label><input class="input" type="datetime-local" name="deadline" required value="${task.deadline ? localDateTimeValue(task.deadline) : ""}"></div><div class="form-field duration-field"><label>Estimated duration</label><select class="select" data-duration-select>${[[".25", "15 minutes"], [".5", "30 minutes"], ["1", "1 hour"], ["", "2 hours"], ["3", "3 hours"], ["4", "4 hours"], ["5", "5 hours"]].map(([v, label]) => `<option value="${v}" ${v === "" ? duration === "" || String(duration) === "2" ? "selected" : "" : String(duration) === v ? "selected" : ""}>${label}</option>`).join("")}<option value="custom" ${custom ? "selected" : ""}>Custom</option></select><input class="input custom-duration" data-custom-duration name="estimatedDuration" ${custom ? "required" : "hidden"} type="number" min="0.25" step="0.25" value="${duration}" placeholder="Hours"><small>Optional &middot; If not specified, we use a default of 2 hours.</small></div></div><div class="form-field range-field importance-range"><div class="field-label"><label>Importance <b>*</b></label><output data-range-output="importanceIndex"></output></div><div class="progress-slider"><span class="progress-slider-track" aria-hidden="true"><span class="progress-slider-active"></span></span>${markers([0, 1, 2, 3, 4], ["Very Low", "Low", "Medium", "High", "Very High"])}<input type="range" min="0" max="4" step="1" name="importanceIndex" value="${importanceIndex}" data-range data-labels="Very Low|Low|Medium|High|Very High"></div><input type="hidden" name="importance" value="${importance[importanceIndex]}"></div><div class="form-field range-field progress-range"><div class="field-label"><label>Progress</label><output data-range-output="currentProgress"></output></div><div class="progress-slider"><span class="progress-slider-track" aria-hidden="true"><span class="progress-slider-active"></span></span>${markers([0, 25, 50, 75, 100], ["0%", "25%", "50%", "75%", "100%"])}<input type="range" min="0" max="100" step="25" name="currentProgress" value="${Number(task.currentProgress || 0)}" data-range></div></div></section></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary"><span aria-hidden="true">+</span>${task.taskId ? "Save task" : "Create task"}</button></div></form>`;
}
function taskFormWithCourse(task, courses) {
  const selected = courses.find((course) => course.courseId === task.courseId);
  const field = `<div class="form-field"><label for="taskCourseSearch">Course <b>*</b></label><div id="taskCourseAutocomplete" class="course-autocomplete task-course-autocomplete"><input id="taskCourseSearch" class="select" type="search" value="${esc(selected?.courseName || "")}" placeholder="Select a course" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="taskCourseOptions" autocomplete="off" required data-course-search><input type="hidden" name="courseId" value="${esc(selected?.courseId || "")}"><div id="taskCourseOptions" class="course-options" role="listbox"></div></div></div>`;
  return taskForm(task).replace('<section class="task-details">', `${field}<section class="task-details">`);
}
function wireTaskCourseSelector(initialCourses) {
  const autocomplete = $("#taskCourseAutocomplete"), input = $("#taskCourseSearch"), options = $("#taskCourseOptions");
  if (!autocomplete) return;
  const courseId = input.form.elements.courseId;
  let courses = initialCourses;
  const normalized = (value) => value.trim().toLowerCase();
  const close = () => {
    autocomplete.classList.remove("open");
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  };
  const select = (course) => {
    courseId.value = course.courseId;
    input.value = course.courseName;
    input.setCustomValidity("");
    close();
  };
  const show = (showAll = false) => {
    const search = showAll ? "" : normalized(input.value);
    const matches = courses.filter((course) => normalized(course.courseName).includes(search));
    options.innerHTML = matches.length ? matches.map((course) => {
      const start = normalized(course.courseName).indexOf(search), end = start + search.length;
      const name = search ? `${esc(course.courseName.slice(0, start))}<mark>${esc(course.courseName.slice(start, end))}</mark>${esc(course.courseName.slice(end))}` : esc(course.courseName);
      return `<button id="task-course-option-${course.courseId}" class="course-option" type="button" role="option" aria-selected="false" data-course-id="${course.courseId}">${name}</button>`;
    }).join("") : input.value.trim() ? `<button id="task-course-create" class="course-option course-option-create" type="button" role="option" aria-selected="false" data-create-course>Create &quot;${esc(input.value.trim())}&quot;</button>` : '<p class="course-options-empty">No courses yet</p>';
    autocomplete.classList.add("open");
    input.setAttribute("aria-expanded", "true");
  };
  const create = async () => {
    const name = input.value.trim();
    if (!name) return;
    try {
      courses = await courseService.getCoursesByUserId();
      const existing = courses.find((course) => normalized(course.courseName) === normalized(name));
      if (existing) return select(existing);
      const course = await courseService.createCourse({ courseName: name });
      courses.push(course);
      select(course);
      toast("Course added");
    } catch (error) { toast(error.message); }
  };
  const choose = (option) => option.dataset.courseId ? select(courses.find((course) => course.courseId === option.dataset.courseId)) : create();
  input.onfocus = () => show(Boolean(courseId.value));
  input.onclick = () => show(Boolean(courseId.value));
  input.oninput = () => {
    courseId.value = "";
    input.setCustomValidity("");
    const exact = courses.find((course) => normalized(course.courseName) === normalized(input.value));
    exact ? select(exact) : show();
  };
  input.onblur = () => setTimeout(() => {
    close();
    const selected = courses.find((course) => course.courseId === courseId.value);
    if (selected) input.value = selected.courseName;
  });
  options.onmousedown = (event) => { if (event.target.closest(".course-option")) event.preventDefault(); };
  options.onclick = (event) => { const option = event.target.closest(".course-option"); if (option) choose(option); };
  input.onkeydown = (event) => {
    const items = [...options.querySelectorAll(".course-option")], active = options.querySelector(".active");
    if (event.key === "Escape") return close();
    if (event.key === "Enter" && active) { event.preventDefault(); return choose(active); }
    if (!["ArrowDown", "ArrowUp"].includes(event.key) || !items.length) return;
    event.preventDefault();
    if (!autocomplete.classList.contains("open")) show();
    const index = items.indexOf(active), next = items[index < 0 ? (event.key === "ArrowDown" ? 0 : items.length - 1) : (index + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length];
    active?.classList.remove("active");
    active?.setAttribute("aria-selected", "false");
    next.classList.add("active");
    next.setAttribute("aria-selected", "true");
    next.scrollIntoView({ block: "nearest" });
    input.setAttribute("aria-activedescendant", next.id);
  };
}
function taskData(formData) {
  const data = Object.fromEntries(formData);
  if (data.importanceIndex !== undefined) {
    data.importance = ["very-low", "low", "medium", "high", "very-high"][data.importanceIndex];
    delete data.importanceIndex;
  }
  data.currentProgress = Number(data.currentProgress);
  data.estimatedDuration = data.estimatedDuration ? Number(data.estimatedDuration) : null;
  return data;
}
function taskDetails(t, includeStatus = false) {
  const taskNameField = t.taskName || t.name;
  const status = t.isOverdue
    ? ["overdue", "Overdue"]
    : t.completionStatus === "completed"
      ? ["completed", "Completed"]
      : t.hasWorkloadWarning
        ? ["warning", "Workload warning"]
        : ["pending", "In progress"];
  return `<div class="task-details-panel"><p>${esc(t.description) || "No note provided."}</p><dl><div><dt>Deadline</dt><dd>${fmtDateTime(t.deadline)}</dd></div><div><dt>Importance</dt><dd>${t.importance.replace("-", " ")}</dd></div><div><dt>Progress</dt><dd>${t.currentProgress}%</dd></div><div><dt>Effective duration</dt><dd>${t.effectiveDuration}h${t.estimatedDuration == null ? " (default)" : ""}</dd></div><div><dt>Remaining workload</dt><dd>${t.remainingWorkload.toFixed(1)}h</dd></div><div><dt>Workload score</dt><dd>${t.workloadScore}</dd></div>${t.completionStatus !== "completed" ? `<div class="detail-priority"><dt>Priority score</dt><dd>${Math.round(t.priorityScore)}</dd></div>` : ""}${includeStatus ? `<div class="detail-status"><dt>Status</dt><dd><span class="status ${status[0]}">${status[1]}</span></dd></div>` : ""}</dl></div>`;
}
function warningList(tasks) {
  return tasks.length ? `<div class="card warning-banner warning-list"><div class="warning-heading"><div class="warning-icon" aria-hidden="true">!</div><div><h3>Workload Warning</h3><p>${tasks.length} ${tasks.length === 1 ? "task needs" : "tasks need"} attention</p></div></div><div class="warning-items">${tasks.map((t) => { const taskNameField = t.taskName || t.name; return `<article class="warning-task" tabindex="0" role="button" aria-expanded="false"><div><strong>${esc(taskNameField)}</strong><small>${dueLabel(t.deadline)} &middot; ${t.remainingWorkload.toFixed(1)}h remaining</small></div><span class="status ${t.isOverdue ? "overdue" : "warning"}">${t.isOverdue ? "Overdue" : "High workload"}</span><span class="warning-arrow" aria-hidden="true">&rsaquo;</span>${taskDetails(t)}</article>`; }).join("")}</div></div>` : "";
}
function taskGroup(task) {
  if (task.completionStatus === "completed") return "completed";
  if (task.isOverdue) return "overdue";
  const label = dueLabel(task.deadline);
  return label === "Due today" ? "today" : "pending";
}
function taskRow(task, course, selectedTaskId, selectedTaskIds = null) {
  const name = task.taskName || task.name;
  const importance = task.importance.replace("-", " ");
  const bulkSelected = selectedTaskIds?.has(task.taskId);
  return `<article class="card task-row ${task.completionStatus === "completed" ? "completed" : ""} ${selectedTaskId === task.taskId ? "details-open" : ""} ${bulkSelected ? "bulk-selected" : ""}" data-task-id="${task.taskId}" tabindex="0" aria-expanded="${selectedTaskId === task.taskId}"><button class="check ${selectedTaskIds ? (bulkSelected ? "checked" : "") : (task.completionStatus === "completed" ? "checked" : "")}" ${selectedTaskIds ? `data-select="${task.taskId}" aria-label="Select ${esc(name)}" aria-pressed="${Boolean(bulkSelected)}"` : `data-complete="${task.taskId}" aria-label="Toggle task completion"`}>${selectedTaskIds ? (bulkSelected ? "&#10003;" : "") : (task.completionStatus === "completed" ? "&#10003;" : "")}</button><div class="task-summary"><div class="task-name">${esc(name)}</div><div class="task-sub">${course ? `<span class="task-course">${esc(course.courseName)}</span><i aria-hidden="true">&middot;</i>` : ""}<span>${task.completionStatus === "completed" ? "Completed" : dueLabel(task.deadline)}</span><span class="status ${task.importance}">${esc(importance)}</span><span class="task-progress">${task.currentProgress}%</span></div></div>${task.completionStatus !== "completed" ? `<div class="task-priority"><small>Priority</small><strong class="priority ${task.priorityScore >= 75 ? "high" : ""}">${Math.round(task.priorityScore)}</strong></div>` : ""}<details class="task-menu"><summary aria-label="Task actions">&bull;&bull;&bull;</summary><div><button data-edit="${task.taskId}">Edit task</button><button class="danger" data-delete="${task.taskId}">Delete task</button></div></details><aside class="task-preview"><div class="task-preview-inner"><small>Task details</small><strong>${esc(name)}</strong>${taskDetails(task, true)}</div></aside></article>`;
}
function groupedTasks(tasks, courses = [], selectedTaskId = null, selectedTaskIds = null) {
  const groups = [
    ["overdue", "Overdue"],
    ["today", "Today"],
    ["pending", "Pending"],
    ["completed", "Completed"],
  ];
  return groups.map(([key, label]) => {
    const items = tasks.filter((task) => taskGroup(task) === key);
    return items.length ? `<section class="task-group group-${key}"><header><h2>${label}</h2><span>${items.length}</span></header><div>${items.map((task) => taskRow(task, courses.find((course) => course.courseId === task.courseId), selectedTaskId, selectedTaskIds)).join("")}</div></section>` : "";
  }).join("");
}
function wireExpandable(selector) {
  document.querySelectorAll(selector).forEach((item) => {
    const toggle = (event) => {
      if (event?.target.closest("button, a")) return;
      if (item.dataset.justDragged) return;
      const open = !item.classList.contains("details-open");
      item.classList.toggle("details-open", open);
      item.setAttribute("aria-expanded", String(open));
    };
    item.onclick = toggle;
    item.onkeydown = (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target === item) {
        event.preventDefault(); toggle(event);
      }
    };
  });
}
function wireTaskSort(list, tasks, syncOrderUI = () => {}) {
  let drag = null;
  const animate = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const movePlaceholder = (before) => {
    const cards = [...list.querySelectorAll("[data-task-id]:not(.dragging)")];
    const beforeRects = new Map(cards.map((card) => [card, card.getBoundingClientRect()]));
    before ? list.insertBefore(drag.placeholder, before) : list.append(drag.placeholder);
    cards.forEach((card) => {
      const previous = beforeRects.get(card);
      const current = card.getBoundingClientRect();
      const delta = previous.top - current.top;
      if (delta && animate) card.animate([{ transform: `translateY(${delta}px)` }, { transform: "none" }], { duration: 160, easing: "ease-out" });
    });
  };
  list.querySelectorAll("[data-task-id]").forEach((item) => {
    item.onpointerdown = (event) => {
      if (event.button !== 0 || event.target.closest("a, button")) return;
      const rect = item.getBoundingClientRect();
      drag = { item, startX: event.clientX, startY: event.clientY, offsetY: event.clientY - rect.top, rect, active: false };
      item.setPointerCapture(event.pointerId);
    };
    item.onpointermove = (event) => {
      if (!drag || drag.item !== item) return;
      if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
      if (!drag.active) {
        drag.active = true;
        drag.originalIds = [...list.querySelectorAll("[data-task-id]")].map((card) => card.dataset.taskId);
        drag.placeholder = document.createElement("div");
        drag.placeholder.className = "drop-indicator";
        drag.placeholder.style.height = `${drag.rect.height}px`;
        drag.placeholder.innerHTML = "<span>Drop here</span>";
        item.before(drag.placeholder);
        Object.assign(item.style, { position: "fixed", zIndex: 30, left: `${drag.rect.left}px`, top: `${drag.rect.top}px`, width: `${drag.rect.width}px` });
        item.classList.add("dragging");
      }
      event.preventDefault();
      item.style.top = `${event.clientY - drag.offsetY}px`;
      const target = [...list.querySelectorAll("[data-task-id]:not(.dragging)")].find((card) => {
        const rect = card.getBoundingClientRect();
        return event.clientY < rect.top + rect.height / 2;
      });
      movePlaceholder(target);
    };
    item.onpointerup = item.onpointercancel = () => {
      if (!drag || drag.item !== item) return;
      if (drag.active) {
        drag.placeholder.before(item);
        drag.placeholder.remove();
        item.classList.remove("dragging");
        item.removeAttribute("style");
        if (animate) item.animate([{ transform: "scale(.985)" }, { transform: "none" }], { duration: 140, easing: "ease-out" });
        const ids = [...list.querySelectorAll("[data-task-id]")].map((card) => card.dataset.taskId);
        if (ids.some((id, index) => id !== drag.originalIds[index])) {
          taskService.updateDisplayOrder(ids);
          tasks.sort((a, b) => ids.indexOf(a.taskId) - ids.indexOf(b.taskId));
        }
        syncOrderUI();
        item.dataset.justDragged = "true";
        setTimeout(() => delete item.dataset.justDragged, 0);
      }
      drag = null;
    };
  });
}
function courseForm(course = {}) {
  return `<form class="modal-form"><div class="form-field"><label>Course name</label><input class="input" name="courseName" required value="${esc(course.courseName || "")}" placeholder="e.g. Deep Learning"></div><div class="form-field"><label>Color</label><input class="input" name="color" type="color" value="${course.color || "#1769ff"}"></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">Save course</button></div></form>`;
}
function wireAuth() {
  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    const input = document.getElementById(button.dataset.togglePassword);
    const show = () => { input.type = "text"; button.setAttribute("aria-pressed", "true"); };
    const hide = () => { input.type = "password"; button.setAttribute("aria-pressed", "false"); };
    button.addEventListener("pointerdown", (event) => { button.setPointerCapture(event.pointerId); show(); });
    button.addEventListener("pointerup", hide);
    button.addEventListener("pointercancel", hide);
    button.addEventListener("keydown", (event) => { if (event.key === " " || event.key === "Enter") show(); });
    button.addEventListener("keyup", hide);
    button.addEventListener("blur", hide);
  });
  document.querySelectorAll("#loginForm, #registerForm, #forgotForm").forEach((form) =>
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      if (form.id === "registerForm" && d.password !== d.confirmPassword) {
        form.querySelector(".form-error").textContent = "Passwords do not match";
        return;
      }
      if (form.id === "forgotForm" && d.newPassword !== d.confirmPassword) {
        form.querySelector(".form-error").textContent = "Passwords do not match";
        return;
      }
      let result = form.id === "loginForm"
        ? await authService.login(d.username, d.password)
        : form.id === "registerForm"
          ? await authService.register(d.studentName, d.username, d.password, d.confirmPassword)
          : await authService.resetPassword(d.username, d.newPassword, d.confirmPassword);
      if (result.success && form.id === "forgotForm") {
        form.reset();
        document.querySelector('.tab[data-auth-target="login"]').click();
        toast("Password updated");
        return;
      }
      if (result.success && form.id === "registerForm") {
        result = await authService.login(d.username, d.password);
      }
      if (!result.success) {
        form.querySelector(".form-error").textContent = result.error;
        return;
      }
      location.href = "dashboard.html";
    }),
  );
}
function wireAuthTabs() {
  const card = $("#authCard");
  if (!card) return;
  const show = (name, scroll) => {
    card.querySelectorAll(".auth-form").forEach(
      (form) => (form.hidden = form.id !== `${name}Form`),
    );
    card.querySelectorAll(".tab").forEach((tab) => {
      const active = tab.dataset.authTarget === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active);
    });
    if (scroll) card.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  document.querySelectorAll("[data-auth-target]").forEach((control) =>
    control.addEventListener("click", (e) => {
      e.preventDefault();
      show(control.dataset.authTarget, control.hasAttribute("data-auth-scroll"));
    }),
  );
}

async function initNotifications() {
  const badge = $("#notiBadge"), list = $("#notiList"), bell = $("#notiBellBtn"), dropdown = $("#notiDropdown");
  if (!badge || !list || !bell || !dropdown) return;
  const notifications = smartService.getUserNotifications(await taskService.getTasksByUserId());
  let selectedNotification = null;
  const openNotification = async (item) => {
    try {
      selectedNotification = item;
      const raw = await taskService.getTaskById(item.taskId);
      if (!raw || selectedNotification?.taskId !== item.taskId) return;
      const [course] = await Promise.all([courseService.getCourseById(raw.courseId)]);
      if (selectedNotification?.taskId !== item.taskId) return;
      const task = smartService.enrich(raw), root = $("#modalRoot");
      const close = () => {
        selectedNotification = null;
        root.innerHTML = "";
        document.removeEventListener("keydown", onKeydown);
      };
      const onKeydown = (event) => { if (event.key === "Escape") close(); };
      root.innerHTML = `<div class="modal-backdrop notification-backdrop open"><section class="modal card notification-modal" role="dialog" aria-modal="true" aria-labelledby="notificationTitle"><button class="notification-close" type="button" aria-label="Close notification" data-notification-close>&times;</button><header><span class="notification-icon" aria-hidden="true">${item.type === "Overdue Task" ? "🚨" : "⚠️"}</span><div><span class="notification-type">${esc(item.type)}</span><h2 id="notificationTitle">${esc(task.taskName || task.name)}</h2></div></header><dl class="notification-details"><div><dt>Course</dt><dd>${esc(course?.courseName || "Course")}</dd></div><div><dt>Deadline</dt><dd>${fmtDateTime(task.deadline)}</dd></div><div><dt>Progress</dt><dd>${task.currentProgress}%</dd></div>${task.estimatedDuration != null ? `<div><dt>Remaining workload</dt><dd>${task.remainingWorkload.toFixed(1)}h</dd></div>` : ""}<div><dt>Importance</dt><dd>${esc(task.importance.replace("-", " "))}</dd></div><div><dt>Status</dt><dd><span class="notification-status ${task.isOverdue ? "overdue" : "warning"}">${esc(item.type)}</span></dd></div></dl><footer><button class="btn btn-outline" type="button" data-notification-close>Close</button><button class="btn btn-primary" type="button" data-view-notification-task>View Task</button></footer></section></div>`;
      root.querySelectorAll("[data-notification-close]").forEach((button) => button.onclick = close);
      root.querySelector(".notification-backdrop").onclick = (event) => { if (event.target === event.currentTarget) close(); };
      root.querySelector("[data-view-notification-task]").onclick = () => {
        const url = `course-detail.html?courseId=${encodeURIComponent(task.courseId)}&taskId=${encodeURIComponent(task.taskId)}`;
        close();
        location.href = url;
      };
      document.addEventListener("keydown", onKeydown);
      root.querySelector("[data-notification-close]").focus();
    } catch (error) { toast(error.message); }
  };
  badge.textContent = notifications.length;
  badge.hidden = !notifications.length;
  list.innerHTML = notifications.length
    ? notifications.map((item, index) => `<li><button class="noti-item" type="button" data-notification-index="${index}"><span class="noti-title">${esc(item.title)}</span><span class="noti-type">${esc(item.type)}</span><span class="noti-desc">${esc(item.message)}</span></button></li>`).join("")
    : '<li class="noti-empty">Great job! You have no workload warnings.</li>';
  if (bell.dataset.bound) return;
  bell.dataset.bound = "true";
  bell.onclick = (event) => {
    event.stopPropagation();
    dropdown.hidden = !dropdown.hidden;
  };
  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target) && event.target !== bell) dropdown.hidden = true;
  });
  list.onclick = (event) => {
    const notification = event.target.closest("[data-notification-index]");
    if (!notification) return;
    dropdown.hidden = true;
    openNotification(notifications[Number(notification.dataset.notificationIndex)]);
  };
}
function courseTaskTable(tasks, selectedTaskId = null, selectedTaskIds = null) {
  return `<div class="course-task-table">${tasks.map((task) => {
    const name = task.taskName || task.name,
      status = task.completionStatus === "completed" ? ["completed", "Completed"] : task.isOverdue ? ["overdue", "Overdue"] : ["pending", "Pending"],
      importance = task.importance.replace("-", " ");
    const bulkSelected = selectedTaskIds?.has(task.taskId);
    return `<article class="task-row table-task-row ${status[0] === "completed" ? "completed" : ""} ${selectedTaskId === task.taskId ? "details-open" : ""} ${bulkSelected ? "bulk-selected" : ""}" data-task-id="${task.taskId}" tabindex="0" aria-expanded="${selectedTaskId === task.taskId}"><button class="check ${bulkSelected ? "checked" : ""}" data-select="${task.taskId}" aria-label="Select ${esc(name)}" aria-pressed="${Boolean(bulkSelected)}">${bulkSelected ? "&#10003;" : ""}</button><div class="table-task-name"><strong>${esc(name)}</strong>${task.description ? `<small>${esc(task.description)}</small>` : ""}</div><div class="task-badges"><span class="status ${status[0]}">${status[1]}</span><span class="status ${task.importance}">${esc(importance)}</span>${task.hasWorkloadWarning ? '<span class="workload-warning">! Workload warning</span>' : ""}</div><time datetime="${esc(task.deadline)}" class="task-deadline ${task.isOverdue ? "danger-text" : ""}">${dueLabel(task.deadline)}<small>${fmtDate(task.deadline)}</small></time><div class="table-progress"><strong>${task.currentProgress}%</strong><div class="progress" aria-label="${task.currentProgress}% complete"><span style="width:${task.currentProgress}%"></span></div></div><span class="task-remaining">~${Number(task.remainingWorkload.toFixed(1))}h <small>remaining</small></span>${status[0] !== "completed" ? `<span class="task-score"><small>Priority</small>${Math.round(task.priorityScore)}</span>` : ""}<details class="task-menu"><summary aria-label="Task actions">&bull;&bull;&bull;</summary><div>${status[0] !== "completed" ? `<button data-complete="${task.taskId}">Mark completed</button>` : ""}<button data-edit="${task.taskId}">Edit task</button><button class="danger" data-delete="${task.taskId}">Delete task</button></div></details><aside class="task-preview"><div class="task-preview-inner"><strong>${esc(name)}</strong>${taskDetails(task, true)}<div class="task-detail-actions">${status[0] !== "completed" ? `<button class="btn btn-primary" data-complete="${task.taskId}">Mark completed</button>` : ""}<button class="btn btn-outline" data-edit="${task.taskId}">Edit task</button><button class="btn btn-danger" data-delete="${task.taskId}">Delete task</button></div></div></aside></article>`;
  }).join("")}</div>`;
}

function initShell() {
  const u = authService.getCurrentUser();
  if (!u) {
    location.href = "index.html#authCard";
    return null;
  }
  const name = u.studentName || u.username;
  const themeToggle = $("#themeToggle");
  const syncThemeToggle = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    if (!themeToggle) return;
    themeToggle.checked = dark;
    themeToggle.title = dark ? "Switch to light mode" : "Switch to dark mode";
    themeToggle.setAttribute("aria-label", themeToggle.title);
    themeToggle.closest("label")?.setAttribute("title", themeToggle.title);
  };
  syncThemeToggle();
  if (themeToggle) themeToggle.onchange = () => {
    const theme = themeToggle.checked ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("studyflow_theme", theme);
    syncThemeToggle();
  };
  $("#userName") && ($("#userName").textContent = name);
  $("#userAvatar") &&
    ($("#userAvatar").textContent = name
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase());
  $("#logoutBtn")?.addEventListener("click", () => {
    authService.logout();
    location.href = "index.html";
  });
  initNotifications().catch((error) => toast(error.message));
  return u;
}

function initPageTransitions() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const isPageLink = (link) => link.origin === location.origin && /\/(dashboard|course|course-detail|tasks)\.html$/.test(link.pathname);
  const hasNativePageTransitions = /^https?:$/.test(location.protocol) && CSS.supports("selector(:active-view-transition)");
  if (!hasNativePageTransitions) document.documentElement.classList.add("fallback-page-transition");
  document.addEventListener("pointerenter", (event) => {
    const link = event.target.closest?.("a[href]");
    if (link && isPageLink(link)) fetch(link.href, { priority: "low" }).catch(() => {});
  }, true);
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link || !isPageLink(link) || link.target || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const destination = new URL(link.href);
    if (destination.href === location.href) return;
    const courseId = destination.searchParams.get("courseId");
    const courseCard = courseId && link.closest(".course-card");
    if (courseCard && CSS.supports("view-transition-name: none")) {
      courseCard.style.viewTransitionName = `course-${courseId}`;
    }
    if (hasNativePageTransitions) return;
    event.preventDefault();
    document.body.classList.add("page-leaving");
    setTimeout(() => location.href = destination.href, 140);
  });
  addEventListener("pageshow", () => document.body.classList.remove("page-leaving"));
}

function initDashboard() {
  const u = initShell();
  if (!u) return;
  let openPulse = null;
  const updatePulse = (next) => {
    openPulse = next;
    document.querySelectorAll("[data-pulse]").forEach((card) => {
      const active = card.dataset.pulse === openPulse;
      card.classList.toggle("open", active);
      card.setAttribute("aria-expanded", String(active));
      card.querySelector(".pulse-popover")?.setAttribute("aria-hidden", String(!active));
    });
    $(".pulse-bar").classList.toggle("popover-open", Boolean(openPulse));
  };
  const render = async () => {
    try {
      const courses = await courseService.getCoursesByUserId(), 
        tasks = await taskService.getTasksByUserId() ?? [],
        enriched = tasks.map(smartService.enrich),
        ranked = smartService.rankTasks(tasks),
        pendingTasks = ranked.filter((task) => taskGroup(task) === "pending"),
        overdueTasks = enriched.filter((task) => taskGroup(task) === "overdue").sort((a, b) => new Date(a.deadline) - new Date(b.deadline)),
        todayTasksForPulse = enriched.filter((task) => taskGroup(task) === "today"),
        completedTasks = enriched.filter((task) => taskGroup(task) === "completed"),
        attention = enriched.filter((t) => t.isOverdue || t.hasWorkloadWarning).sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 3),
        upcoming = enriched.filter((t) => t.completionStatus !== "completed").sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);
      const today = new Date(),
        todayTasks = enriched.filter((task) => {
          const deadline = new Date(task.deadline);
          return deadline.getFullYear() === today.getFullYear() && deadline.getMonth() === today.getMonth() && deadline.getDate() === today.getDate();
        }),
        todayCompleted = todayTasks.filter((task) => task.completionStatus === "completed").length,
        todayInProgress = todayTasks.filter((task) => task.completionStatus !== "completed" && Number(task.currentProgress) > 0).length,
        todayAttention = todayTasks.filter((task) => task.isOverdue || task.hasWorkloadWarning).length,
        todayPercentage = todayTasks.length ? Math.round(todayCompleted / todayTasks.length * 1000) / 10 : 0,
        todayProgress = todayTasks.length ? Math.round(todayCompleted / todayTasks.length * 100) : 0,
        todayLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(today);
      const pulse = [
        ["pending", "Pending tasks", pendingTasks.length, pendingTasks, (t) => `Priority ${Math.round(t.priorityScore)}`, "No pending tasks"],
        ["overdue", "Overdue tasks", overdueTasks.length, overdueTasks, (t) => fmtDateTime(t.deadline), "No overdue tasks"],
        ["today", "Due today", todayTasksForPulse.length, todayTasksForPulse, (t) => fmtDateTime(t.deadline), "Nothing due today"],
        ["completed", "Completed", completedTasks.length, completedTasks, (t) => courses.find((course) => course.courseId === t.courseId)?.courseName || "Completed", "No completed tasks"],
      ];
      $("#stats").innerHTML = pulse.map(([key, label, count, items, detail, empty]) => {
        const visible = items.slice(0, 5);
        return `<article class="stat" data-pulse="${key}" role="button" tabindex="0" aria-controls="pulse-${key}" aria-expanded="false"><strong>${count}</strong><span>${label}</span><div id="pulse-${key}" class="pulse-popover" role="dialog" aria-label="${label}" aria-hidden="true"><header><strong>${label} <span>&middot; ${count}</span></strong></header>${visible.length ? `<div class="pulse-task-list">${visible.map((t) => `<a href="course-detail.html?courseId=${encodeURIComponent(t.courseId)}&taskId=${encodeURIComponent(t.taskId)}"><span>${esc(t.taskName || t.name)}</span><small>${esc(detail(t))}</small></a>`).join("")}</div>` : `<p class="pulse-empty">${empty}</p>`}${items.length > visible.length ? `<a class="pulse-view-all" href="tasks.html?status=${key}">View all &rarr;</a>` : ""}</div></article>`;
      }).join("");
      updatePulse(openPulse);
      $("#attentionArea").innerHTML = `<article class="card overview-card attention-card"><div class="attention-head"><div class="attention-title"><span class="attention-warning-icon" aria-hidden="true">!</span><div><h2>Warning</h2><p>These tasks are at risk due to upcoming deadlines or high workload.</p></div></div></div><div class="attention-list">${attention.length ? attention.map((t) => { const course = courses.find((item) => item.courseId === t.courseId); const taskNameField = t.taskName || t.name; return `<div class="attention-task"><button class="task-check" type="button" data-dashboard-complete="${t.taskId}" aria-label="Mark ${esc(taskNameField)} complete"></button><a class="attention-task-link" href="course-detail.html?courseId=${encodeURIComponent(t.courseId)}&taskId=${encodeURIComponent(t.taskId)}"><span class="attention-copy"><strong>${esc(taskNameField)}</strong><small>${esc(course?.courseName || "Course")}</small></span><span class="attention-meta"><span class="attention-deadline"><i aria-hidden="true">&#128197;</i>${dueLabel(t.deadline)}</span><span class="attention-progress"><i style="--task-progress:${t.currentProgress}" aria-hidden="true"></i>${t.currentProgress}%</span><span><i aria-hidden="true">&#9716;</i>~${Number(t.remainingWorkload.toFixed(1))}h</span></span></a>${t.isOverdue ? `<span class="attention-status overdue"><span aria-hidden="true">&#128308;</span>Overdue</span>` : ""}<span class="row-arrow" aria-hidden="true">&rsaquo;</span></div>`; }).join("") : `<div class="mini-empty"><img src="../source/studyflow-mascot-pack/cat-good-job.png" alt=""><strong>You're all caught up.</strong><span>No tasks currently need attention.</span></div>`}</div></article>`;
      $("#progressArea").innerHTML = `<article class="card overview-card progress-card"><div class="summary-head"><h2>Today's Summary</h2><time datetime="${localDateTimeValue(today).slice(0, 10)}">${todayLabel}</time></div><div class="today-summary"><div class="progress-ring" style="--progress:${todayProgress}" role="img" aria-label="${todayPercentage}% of today's tasks completed"><span><strong>${todayPercentage}%</strong><small>tasks today</small><small class="progress-count">${todayCompleted} / ${todayTasks.length} completed</small></span></div><div class="summary-statuses"><div class="summary-status attention"><i aria-hidden="true"></i><strong>${todayAttention}</strong><span>Need attention</span></div><div class="summary-status active"><i aria-hidden="true"></i><strong>${todayInProgress}</strong><span>In progress</span></div><div class="summary-status done"><i aria-hidden="true"></i><strong>${todayCompleted}</strong><span>Completed</span></div></div></div><div class="progress-message"><strong>You're getting there!</strong><small>Keep going, you've got this.</small></div></article>`;
      $("#upcomingTasks").innerHTML = upcoming.length ? `<div class="upcoming-head"><span>Deadline</span><span>Task</span><span>Course</span><span>Priority</span><span>Progress</span><span></span></div>${upcoming.map((task) => { const course = courses.find((item) => item.courseId === task.courseId), taskName = task.taskName || task.name; return `<div class="upcoming-row"><time datetime="${esc(task.deadline)}">${fmtDate(task.deadline)}</time><a class="task-link" href="course-detail.html?courseId=${encodeURIComponent(task.courseId)}"><span>${esc(taskName)}</span><span class="row-arrow" aria-hidden="true">›</span></a><span>${esc(course?.courseName || "Course")}</span><strong>${Math.round(task.priorityScore)}</strong><div class="task-progress"><div class="progress" aria-label="${task.currentProgress}% complete"><span style="width:${task.currentProgress}%"></span></div><span>${task.currentProgress}%</span></div></div>`; }).join("")}` : `<div class="mini-empty compact"><strong>You're all caught up.</strong><span>No pending tasks.</span></div>`;
      document.querySelectorAll("[data-dashboard-complete]").forEach((button) => button.onclick = async () => {
        try {
          await taskService.toggleCompleted(button.dataset.dashboardComplete);
          await render();
        } catch (error) {
          toast(error.message);
        }
      });
    } catch (error) {
      toast(error.message);
    }
  };
  const togglePulse = (event) => {
    const card = event.target.closest("[data-pulse]");
    if (!card || event.target.closest(".pulse-popover")) return;
    updatePulse(openPulse === card.dataset.pulse ? null : card.dataset.pulse);
  };
  $("#stats").addEventListener("click", togglePulse);
  $("#stats").addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-pulse]")) {
      event.preventDefault();
      togglePulse(event);
    }
  });
  document.addEventListener("click", (event) => {
    if (openPulse && !event.target.closest("[data-pulse]")) updatePulse(null);
  });
  render();
  addEventListener("pageshow", render);
}

function initCourseManagement(u) {
  const main = document.querySelector(".course-main");
  let query = "", statusFilter = "all", sort = "name", view = localStorage.getItem("studyflow_course_view") === "list" ? "list" : "grid";
  main.innerHTML = `<section class="course-management-head" aria-labelledby="coursesTitle"><div><img class="course-rays" src="../source/studyflow-decoration-pack/accent-rays-yellow.png" alt="" aria-hidden="true"><h1 id="coursesTitle">My Courses</h1><p>Manage your courses and keep your study organized.</p></div><button id="addCourseBtn" class="btn btn-primary"><span aria-hidden="true">+</span> Add course</button></section><section class="course-toolbar" aria-label="Course controls"><label class="course-search"><span aria-hidden="true">⌕</span><span class="sr-only">Search courses</span><input id="courseSearch" class="input" type="search" placeholder="Search courses..."></label><label><span class="sr-only">Filter by status</span><select id="courseStatus" class="select"><option value="all">All Status</option><option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="completed">Completed</option></select></label><label><span class="sr-only">Sort courses</span><select id="courseSort" class="select"><option value="name">Sort by: Name</option><option value="progress-desc">Progress: High to low</option><option value="progress-asc">Progress: Low to high</option></select></label><div class="view-toggle" role="group" aria-label="Course view"><button type="button" data-view="grid" aria-label="Grid view">▦ <span>Grid</span></button><button type="button" data-view="list" aria-label="List view">☷ <span>List</span></button></div></section><p id="courseResultCount" class="course-result-count" aria-live="polite"></p><section id="managedCourseGrid" class="course-grid management-grid"></section>`;
  const statusOf = (progress, total, completed) => total === 0 || progress === 0 && completed === 0 ? ["not-started", "Not Started"] : completed === total ? ["completed", "Completed"] : ["in-progress", "In Progress"];
  const render = async () => {
    try {
      const courses = await courseService.getCoursesByUserId(), 
        tasks = await taskService.getTasksByUserId() ?? [];
      const visible = courses.map((course) => {
        const courseTasks = tasks.filter((task) => task.courseId === course.courseId), 
          completed = courseTasks.filter((task) => Boolean(Number(task.completed))).length,
          progress = taskService.getProgress(courseTasks);
        return { course, courseTasks, completed, progress, status: statusOf(progress, courseTasks.length, completed) };
      }).filter(({ course, status }) => course.courseName.toLowerCase().includes(query) && (statusFilter === "all" || status[0] === statusFilter)).sort((a, b) => sort === "name" ? a.course.courseName.localeCompare(b.course.courseName) : sort === "progress-desc" ? b.progress - a.progress : a.progress - b.progress);
      const grid = $("#managedCourseGrid");
      grid.className = `course-grid management-grid ${view}-view`;
      $("#courseResultCount").textContent = courses.length ? `Showing ${visible.length} of ${courses.length} ${courses.length === 1 ? "course" : "courses"}` : "";
      grid.innerHTML = visible.length ? visible.map(({ course, courseTasks, completed, progress, status }) => `<article class="card course-card management-card status-${status[0]}" style="--course-color:${course.color || "var(--blue)"}"><div class="course-status"><span class="status-dot"></span>${status[1]}<details class="course-menu"><summary aria-label="Course actions">&bull;&bull;&bull;</summary><div><button data-edit-course="${course.courseId}">Edit course</button><button class="danger" data-delete-course="${course.courseId}">Delete course</button></div></details></div><div class="course-card-main"><span class="course-initial" aria-hidden="true">${esc(course.courseName.slice(0, 1).toUpperCase())}</span><div class="course-card-content"><a class="course-card-title" href="course-detail.html?courseId=${encodeURIComponent(course.courseId)}" aria-label="View ${esc(course.courseName)}"><h3>${esc(course.courseName)}</h3><small>${courseTasks.length} ${courseTasks.length === 1 ? "task" : "tasks"}</small></a><div class="course-progress-inline"><div class="progress" aria-label="${progress}% complete"><span style="width:${progress}%;background:${course.color || "var(--blue)"}"></span></div><strong>${progress}%</strong></div><div class="course-counts"><span>${completed} completed</span><span>${courseTasks.length - completed} remaining</span></div></div><a class="course-card-arrow" href="course-detail.html?courseId=${encodeURIComponent(course.courseId)}" aria-label="View ${esc(course.courseName)}">›</a></div><div class="management-actions"><a class="btn btn-outline view-course" href="course-detail.html?courseId=${encodeURIComponent(course.courseId)}">Open course →</a></div></article>`).join("") : courses.length ? `<div class="empty course-empty-state"><img src="../source/studyflow-mascot-pack/cat-thinking.png" alt="StudyFlow cat thinking"><h3>No matching courses</h3><p>Try another search or status.</p></div>` : `<div class="empty course-empty-state"><img src="../source/studyflow-mascot-pack/cat-reading.png" alt="StudyFlow cat reading"><h3>No courses yet</h3><p>Add your first course and start organizing your study.</p><button class="btn btn-primary" data-add-course>+ Add course</button></div>`;
      document.querySelectorAll("[data-edit-course]").forEach((button) => button.onclick = async () => {
        const course = courses.find((item) => item.courseId === button.dataset.editCourse);
        modal("Edit course", courseForm(course), async (data, close) => {
          try {
            await courseService.updateCourse(course.courseId, { courseName: data.get("courseName"), color: data.get("color") });
            close(); 
            await render(); 
            toast("Course updated");
          } catch (error) { 
            toast(error.message); 
          }
        });
      });
      document.querySelectorAll("[data-delete-course]").forEach((button) => button.onclick = async () => {
        if (confirm("Delete course and all its tasks?")) {
          try {
            await courseService.deleteCourse(button.dataset.deleteCourse);
            await render(); 
            toast("Course deleted");
          } catch (error) {
            toast(error.message);
          }
        }
      });
      $("[data-add-course]")?.addEventListener("click", addCourse);
    } catch (error) {
      toast(error.message);
    }
  };
  const addCourse = async () => modal("Add course", courseForm(), async (data, close) => {
    try {
      await courseService.createCourse({ courseName: data.get("courseName"), color: data.get("color") });
      close(); 
      await render(); 
      toast("Course added");
    } catch (error) { 
      toast(error.message); 
    }
  });
  $("#addCourseBtn").onclick = addCourse;
  $("#courseSearch").oninput = (event) => { query = event.target.value.trim().toLowerCase(); render(); };
  $("#courseStatus").onchange = (event) => { statusFilter = event.target.value; render(); };
  $("#courseSort").onchange = (event) => { sort = event.target.value; render(); };
  document.querySelectorAll("[data-view]").forEach((button) => button.onclick = () => { view = button.dataset.view; localStorage.setItem("studyflow_course_view", view); document.querySelectorAll("[data-view]").forEach((item) => { const active = item.dataset.view === view; item.classList.toggle("active", active); item.setAttribute("aria-pressed", active); }); render(); });
  document.querySelector(`[data-view="${view}"]`).click();
}

function initCourses() {
  const u = initShell();
  if (u) initCourseManagement(u);
}

function initCourseDetail() {
  const u = initShell();
  if (!u) return;
  const params = new URLSearchParams(location.search), courseId = params.get("courseId");
  if (!courseId) {
    location.href = "course.html";
    return;
  }
  let filter = "all",
    sort = "priority",
    query = "",
    selectedTaskId = params.get("taskId");
  const selectedTaskIds = new Set(), bulkActions = $("#bulkActions");
  const render = async () => {
    try {
      const raw = await taskService.list(courseId),
        ranked = smartService.rankTasks(raw),
        all = [
          ...ranked,
          ...raw.filter((task) => Boolean(Number(task.completed))).map((task) => smartService.enrich(task)),
        ];
      const course = await courseService.getCourseById(courseId);
      if (!course || course.username !== u.username) {
        location.href = "course.html";
        return;
      }
      const counts = {
        pending: all.filter((t) => t.displayStatus === "pending").length,
        completed: all.filter((t) => t.displayStatus === "completed").length,
        overdue: all.filter((t) => t.displayStatus === "overdue").length,
      };
      const progress = taskService.getProgress(all),
        [recommended] = smartService.recommended(raw, 1);
      $("#courseHero").innerHTML =
        `<section class="course-hero"><div class="course-title"><div class="course-dot" style="background:${course.color || "#e9f2ff"}22;color:${course.color || "var(--blue)"}">${esc(course.courseName.slice(0, 1).toUpperCase())}</div><div><h1>${esc(course.courseName)}</h1><p>${all.length} tasks &middot; ${counts.completed} completed &middot; ${counts.overdue} overdue</p></div></div><div class="course-progress-copy"><strong>${progress}% complete</strong><div class="progress" aria-label="${progress}% complete"><span style="width:${progress}%;background:${course.color || "var(--blue)"}"></span></div></div><div class="course-actions"><button id="editCourse" class="btn btn-outline">Edit course</button><details class="course-menu"><summary aria-label="Course actions">&bull;&bull;&bull;</summary><div><button data-menu-edit-course>Edit course</button><button id="deleteCourse" class="danger">Delete course</button></div></details></div></section>`;
      $("#courseRecommended").innerHTML = recommended
        ? `<article class="recommended-next"><header><h2>Recommended next</h2><span>Based on smart prioritization</span></header><div class="recommended-body"><div class="recommended-icon" aria-hidden="true">${esc((recommended.taskName || recommended.name).slice(0, 1).toUpperCase())}</div><div class="recommended-copy"><strong>${esc(recommended.taskName || recommended.name)}</strong><span>${dueLabel(recommended.deadline)} &middot; ~${Number(recommended.remainingWorkload.toFixed(1))}h remaining</span></div><div class="recommended-progress"><div><strong>${recommended.currentProgress}%</strong><span> complete</span></div><div class="progress" aria-label="${recommended.currentProgress}% complete"><span style="width:${recommended.currentProgress}%"></span></div></div><div class="task-badges"><span class="status ${recommended.isOverdue ? "overdue" : "pending"}">${recommended.isOverdue ? "Overdue" : "Pending"}</span><span class="status ${recommended.importance}">${esc(recommended.importance.replace("-", " "))}</span></div><div class="recommended-score"><span>Priority</span><strong>${Math.round(recommended.priorityScore)}</strong></div><button class="btn btn-primary" data-open-task="${recommended.taskId}">Open task &rarr;</button></div></article>`
        : `<article class="recommended-next recommended-empty"><div><h2>You're all caught up</h2><p>No pending tasks in this course.</p></div></article>`;
      $("#taskCount").textContent = `(${all.length})`;
      $("#filters").innerHTML = [
        ["all", "All"],
        ["pending", "In progress"],
        ["completed", "Completed"],
        ["overdue", "Overdue"],
      ]
        .map(
          ([v, l]) =>
            `<button class="filter ${filter === v ? "active" : ""}" data-filter="${v}">${l} (${v === "all" ? all.length : counts[v]})</button>`,
        )
        .join("");
      let list = all.filter(
        (t) => (filter === "all" || t.displayStatus === filter) && (t.taskName || t.name).toLowerCase().includes(query),
      );
      if (sort !== "priority") list.sort((a, b) =>
        sort === "deadline"
          ? new Date(a.deadline) - new Date(b.deadline)
          : sort === "importance"
            ? b.importanceScore - a.importanceScore
            : sort === "createdAt"
              ? new Date(b.createdAt) - new Date(a.createdAt)
              : 0,
      );
      const visibleIds = new Set(list.map((task) => task.taskId));
      selectedTaskIds.forEach((id) => { if (!visibleIds.has(id)) selectedTaskIds.delete(id); });
      bulkActions.hidden = selectedTaskIds.size === 0;
      bulkActions.innerHTML = selectedTaskIds.size ? `<strong><span aria-hidden="true">&#10003;</span> ${selectedTaskIds.size} selected</strong><div><button class="btn btn-outline" type="button" data-select-all>${selectedTaskIds.size === list.length ? "Deselect all" : "Select all"}</button><button class="btn btn-primary" type="button" data-bulk-complete>Complete</button><button class="btn btn-danger" type="button" data-bulk-delete>Delete</button><button class="bulk-clear" type="button" data-clear-selection aria-label="Clear selection">&times;</button></div>` : "";
      $("#taskList").innerHTML = list.length
        ? courseTaskTable(list, selectedTaskId, selectedTaskIds)
        : `<div class="empty"><h3>${filter === "all" ? "No tasks yet" : "No matching tasks"}</h3><p>${filter === "all" ? "Add your first task to start tracking this course." : "Try another filter."}</p></div>`;
      document.querySelectorAll("[data-filter]").forEach(
        (b) =>
          (b.onclick = () => {
            filter = b.dataset.filter;
            render();
          }),
      );
      document.querySelectorAll("[data-select]").forEach(
        (b) =>
          (b.onclick = () => {
            const id = b.dataset.select;
            selectedTaskIds.has(id) ? selectedTaskIds.delete(id) : selectedTaskIds.add(id);
            render();
          }),
      );
      document.querySelectorAll("[data-delete]").forEach(
        (b) =>
          (b.onclick = async () => {
            if (confirm("Delete this task?")) {
              try {
                await taskService.remove(b.dataset.delete);
                selectedTaskIds.delete(b.dataset.delete);
                if (selectedTaskId === b.dataset.delete) selectedTaskId = null;
                await render();
              } catch (error) {
                toast(error.message);
              }
            }
          }),
      );
      document.querySelectorAll("[data-edit]").forEach(
        (b) =>
          (b.onclick = async () => {
            const t = raw.find((x) => x.taskId === b.dataset.edit);
            modal("Edit task", taskForm(t), async (d, close) => {
              try {
                await taskService.update(t.taskId, taskData(d));
                close();
                await render();
              } catch (e) {
                toast(e.message);
              }
            });
          }),
      );
      document.querySelectorAll("[data-complete]").forEach((button) => button.onclick = async () => {
        try {
          await taskService.markCompleted(button.dataset.complete);
          await render();
          toast("Task completed");
        } catch (error) { toast(error.message); }
      });
      $("[data-open-task]")?.addEventListener("click", (event) => {
        selectedTaskId = event.currentTarget.dataset.openTask;
        render().then(() => document.querySelector(`[data-task-id="${CSS.escape(selectedTaskId)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
      });
      document.querySelectorAll(".task-row").forEach((row) => {
        const details = row.querySelector(".task-preview");
        details.style.setProperty("--details-height", `${details.scrollHeight}px`);
        row.onclick = (event) => {
          if (event.target.closest("button, a, details")) return;
          const open = selectedTaskId !== row.dataset.taskId;
          selectedTaskId = open ? row.dataset.taskId : null;
          if (open) details.style.setProperty("--details-height", `${details.scrollHeight}px`);
          document.querySelectorAll(".task-row.details-open").forEach((item) => {
            item.classList.remove("details-open");
            item.setAttribute("aria-expanded", "false");
          });
          row.classList.toggle("details-open", open);
          row.setAttribute("aria-expanded", String(open));
        };
        row.onkeydown = (event) => {
          if ((event.key === "Enter" || event.key === " ") && event.target === row) {
            event.preventDefault();
            row.click();
          }
        };
      });
      bulkActions.querySelector("[data-select-all]")?.addEventListener("click", () => { const allSelected = list.every((task) => selectedTaskIds.has(task.taskId)); list.forEach((task) => allSelected ? selectedTaskIds.delete(task.taskId) : selectedTaskIds.add(task.taskId)); render(); });
      bulkActions.querySelector("[data-clear-selection]")?.addEventListener("click", () => { selectedTaskIds.clear(); render(); });
      bulkActions.querySelector("[data-bulk-complete]")?.addEventListener("click", async () => { try { await Promise.all([...selectedTaskIds].map(taskService.markCompleted)); selectedTaskIds.clear(); await render(); toast("Tasks completed"); } catch (error) { toast(error.message); } });
      bulkActions.querySelector("[data-bulk-delete]")?.addEventListener("click", () => {
        const count = selectedTaskIds.size;
        modal(`Delete ${count} ${count === 1 ? "task" : "tasks"}?`, `<form class="modal-form bulk-delete-form"><p>This action will permanently delete the selected ${count === 1 ? "task" : "tasks"}. This cannot be undone.</p><div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-danger">Delete</button></div></form>`, async (_, close) => { try { await Promise.all([...selectedTaskIds].map((id) => taskService.remove(id))); selectedTaskIds.clear(); close(); await render(); toast(`${count} ${count === 1 ? "task" : "tasks"} deleted`); } catch (error) { toast(error.message); } });
      });
      $("#sortSelect").value = sort;
      $("#taskSearch").value = query;
      $("#taskSearch").oninput = (e) => {
        query = e.target.value.trim().toLowerCase();
        render();
      };
      $("#sortSelect").onchange = (e) => {
        sort = e.target.value;
        render();
      };
      $("#addTaskBtn").onclick = () =>
        modal("Add task", taskForm({}), async (d, close) => {
          try {
            await taskService.create({ courseId, ...taskData(d) });
            close();
            await render();
          } catch (e) {
            toast(e.message);
          }
        });
      $("#editCourse").onclick = async () =>
        modal("Edit course", courseForm(course), async (d, close) => {
          try {
            await courseService.updateCourse(courseId, {
              courseName: d.get("courseName"),
              color: d.get("color"),
            });
            close();
            await render();
          } catch (e) {
            toast(e.message);
          }
        });
      $("[data-menu-edit-course]").onclick = $("#editCourse").onclick;
      $("#deleteCourse").onclick = async () => {
        if (confirm("Delete course and all its tasks?")) {
          try {
            await courseService.deleteCourse(courseId);
            location.href = "course.html";
          } catch (e) {
            toast(e.message);
          }
        }
      };
    } catch (error) {
      toast(error.message);
    }
  };
  render();
}

function initAllTasks() {
  const user = initShell();
  if (!user) return;
  const requestedStatus = new URLSearchParams(location.search).get("status");
  let status = ["pending", "overdue", "today", "completed"].includes(requestedStatus) ? requestedStatus : "all", courseId = "all", query = "", sort = "priority", selectedTaskId = null, courses = [];
  const selectedTaskIds = new Set(), bulkActions = $("#bulkActions"), courseAutocomplete = $("#courseAutocomplete"), courseInput = $("#courseFilter"), courseOptions = $("#courseOptions");
  const closeCourseOptions = () => {
    courseAutocomplete.classList.remove("open");
    courseInput.setAttribute("aria-expanded", "false");
    courseInput.removeAttribute("aria-activedescendant");
  };
  const showCourseOptions = () => {
    const search = courseInput.value.trim().toLowerCase();
    const matches = courses.filter((course) => course.courseName.toLowerCase().includes(search));
    courseOptions.innerHTML = matches.length ? matches.map((course) => {
      const start = course.courseName.toLowerCase().indexOf(search), end = start + search.length;
      const name = search ? `${esc(course.courseName.slice(0, start))}<mark>${esc(course.courseName.slice(start, end))}</mark>${esc(course.courseName.slice(end))}` : esc(course.courseName);
      return `<button id="course-option-${course.courseId}" class="course-option" type="button" role="option" aria-selected="false" data-course-id="${course.courseId}">${name}</button>`;
    }).join("") : '<p class="course-options-empty">No courses found</p>';
    courseAutocomplete.classList.add("open");
    courseInput.setAttribute("aria-expanded", "true");
  };
  const selectCourse = (id) => {
    const course = courses.find((item) => item.courseId === id);
    if (!course) return;
    courseId = course.courseId;
    courseInput.value = course.courseName;
    closeCourseOptions();
    render();
  };
  const render = async () => {
    try {
      courses = await courseService.getCoursesByUserId();
      const raw = await taskService.getTasksByUserId();
      const tasks = raw.map(smartService.enrich);
      $("#filters").innerHTML = [["all", "All"], ["pending", "Pending"], ["overdue", "Overdue"], ["today", "Today"], ["completed", "Completed"]].map(([value, label]) => `<button class="filter ${status === value ? "active" : ""}" data-filter="${value}">${label}</button>`).join("");
      courseInput.value = courseId === "all" ? "" : courses.find((course) => course.courseId === courseId)?.courseName || "";
      let visible = tasks.filter((task) => (status === "all" || taskGroup(task) === status) && (courseId === "all" || task.courseId === courseId) && (task.taskName || task.name).toLowerCase().includes(query));
      visible.sort((a, b) => sort === "deadline" ? new Date(a.deadline) - new Date(b.deadline) : sort === "importance" ? b.importanceScore - a.importanceScore : b.priorityScore - a.priorityScore);
      const visibleIds = new Set(visible.map((task) => task.taskId));
      selectedTaskIds.forEach((id) => { if (!visibleIds.has(id)) selectedTaskIds.delete(id); });
      bulkActions.hidden = selectedTaskIds.size === 0;
      bulkActions.innerHTML = selectedTaskIds.size ? `<strong><span aria-hidden="true">&#10003;</span> ${selectedTaskIds.size} selected</strong><div><button class="btn btn-outline" type="button" data-select-all>${selectedTaskIds.size === visible.length ? "Deselect all" : "Select all"}</button><button class="btn btn-primary" type="button" data-bulk-complete>Complete</button><button class="btn btn-danger" type="button" data-bulk-delete>Delete</button><button class="bulk-clear" type="button" data-clear-selection aria-label="Clear selection">&times;</button></div>` : "";
      $("#taskList").innerHTML = visible.length ? groupedTasks(visible, courses, selectedTaskId) : `<div class="empty course-empty-state"><h3>No matching tasks</h3><p>Try another filter or create a new task.</p></div>`;
      document.querySelectorAll("[data-filter]").forEach((button) => button.onclick = () => { status = button.dataset.filter; render(); });
      document.querySelectorAll("[data-complete]").forEach((button) => button.onclick = async () => { try { await taskService.toggleCompleted(button.dataset.complete); await render(); } catch (error) { toast(error.message); } });
      document.querySelectorAll("[data-edit]").forEach((button) => button.onclick = () => {
        const task = raw.find((item) => item.taskId === button.dataset.edit);
        modal("Edit task", taskForm(task), async (data, close) => { try { await taskService.update(task.taskId, taskData(data)); close(); render(); } catch (error) { toast(error.message); } });
      });
      document.querySelectorAll("[data-delete]").forEach((button) => button.onclick = async () => { if (confirm("Delete this task?")) { try { selectedTaskIds.delete(button.dataset.delete); await taskService.remove(button.dataset.delete); render(); } catch (error) { toast(error.message); } } });
      bulkActions.querySelector("[data-select-all]")?.addEventListener("click", () => { const allSelected = visible.every((task) => selectedTaskIds.has(task.taskId)); visible.forEach((task) => allSelected ? selectedTaskIds.delete(task.taskId) : selectedTaskIds.add(task.taskId)); render(); });
      bulkActions.querySelector("[data-clear-selection]")?.addEventListener("click", () => { selectedTaskIds.clear(); render(); });
      bulkActions.querySelector("[data-bulk-complete]")?.addEventListener("click", async () => { try { await Promise.all([...selectedTaskIds].map(taskService.markCompleted)); selectedTaskIds.clear(); await render(); toast("Tasks completed"); } catch (error) { toast(error.message); } });
      bulkActions.querySelector("[data-bulk-delete]")?.addEventListener("click", () => {
        const count = selectedTaskIds.size;
        modal(`Delete ${count} ${count === 1 ? "task" : "tasks"}?`, `<form class="modal-form bulk-delete-form"><p>This action will permanently delete the selected ${count === 1 ? "task" : "tasks"}. This cannot be undone.</p><div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-danger">Delete</button></div></form>`, async (_, close) => { try { await Promise.all([...selectedTaskIds].map((id) => taskService.remove(id))); selectedTaskIds.clear(); close(); await render(); toast(`${count} ${count === 1 ? "task" : "tasks"} deleted`); } catch (error) { toast(error.message); } });
      });
      document.querySelectorAll(".task-row").forEach((row) => {
        const preview = row.querySelector(".task-preview");
        preview.style.setProperty("--details-height", `${preview.scrollHeight}px`);
        row.onclick = (event) => {
          if (event.target.closest("button, a, details")) return;
          selectedTaskId = selectedTaskId === row.dataset.taskId ? null : row.dataset.taskId;
          render();
        };
      });
      $("#taskSearch").value = query;
      $("#sortSelect").value = sort;
    } catch (error) { toast(error.message); }
  };
  $("#taskSearch").oninput = (event) => { query = event.target.value.trim().toLowerCase(); render(); };
  courseInput.oninput = (event) => {
    const value = event.target.value.trim();
    const course = courses.find((item) => item.courseName.toLowerCase() === value.toLowerCase());
    showCourseOptions();
    if (!value) { courseId = "all"; render(); }
    else if (course) { courseId = course.courseId; closeCourseOptions(); render(); }
  };
  courseInput.onfocus = () => showCourseOptions();
  courseInput.onblur = () => setTimeout(() => {
    closeCourseOptions();
    courseInput.value = courseId === "all" ? "" : courses.find((course) => course.courseId === courseId)?.courseName || "";
  });
  courseOptions.onmousedown = (event) => {
    const option = event.target.closest("[data-course-id]");
    if (option) event.preventDefault();
  };
  courseOptions.onclick = (event) => {
    const option = event.target.closest("[data-course-id]");
    if (option) selectCourse(option.dataset.courseId);
  };
  courseInput.onkeydown = (event) => {
    const options = [...courseOptions.querySelectorAll(".course-option")];
    const active = courseOptions.querySelector(".active");
    if (event.key === "Escape") return closeCourseOptions();
    if (event.key === "Enter" && active) { event.preventDefault(); return selectCourse(active.dataset.courseId); }
    if (!["ArrowDown", "ArrowUp"].includes(event.key) || !options.length) return;
    event.preventDefault();
    if (!courseAutocomplete.classList.contains("open")) showCourseOptions();
    const index = options.indexOf(active);
    const next = options[index < 0 ? (event.key === "ArrowDown" ? 0 : options.length - 1) : (index + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length];
    active?.classList.remove("active");
    active?.setAttribute("aria-selected", "false");
    next.classList.add("active");
    next.setAttribute("aria-selected", "true");
    next.scrollIntoView({ block: "nearest" });
    courseInput.setAttribute("aria-activedescendant", next.id);
  };
  document.addEventListener("mousedown", (event) => { if (!courseAutocomplete.contains(event.target)) closeCourseOptions(); });
  $("#sortSelect").onchange = (event) => { sort = event.target.value; render(); };
  $("#addTaskBtn").onclick = async () => {
    const courses = await courseService.getCoursesByUserId();
    modal("Add task", taskFormWithCourse({}, courses), async (data, close) => { try { await taskService.create(taskData(data)); close(); render(); toast("Task added"); } catch (error) { toast(error.message); } });
    wireTaskCourseSelector(courses);
  };
  render();
}

wireAuthTabs();
wireAuth();
initPageTransitions();
const page = document.body.dataset.page;
if (page === "dashboard") initDashboard();
if (page === "course") initCourses();
if (page === "course-detail") initCourseDetail();
if (page === "tasks") initAllTasks();
