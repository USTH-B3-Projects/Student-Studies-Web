import * as courseService from "../services/courseService.js";
import * as taskService from "../services/taskService.js";
import { $, esc, fmtDate, fmtDateTime, localDateTimeValue, dueLabel, toast } from "../shared/ui.js";
import { modal, showConfirmModal } from "./modal.js";

const checkmark = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function taskForm(task = {}) {
  const taskNameField = task.taskName || task.name || "";
  const duration = task.estimatedDuration ?? "";
  const presets = ["", ".25", ".5", "1", "2", "3", "4", "5"];
  const custom = duration !== "" && !presets.includes(String(duration));
  const importance = ["very-low", "low", "medium", "high", "very-high"];
  const importanceIndex = Math.max(0, importance.indexOf(task.importance || "medium"));
  const markers = (values, labels) => `<span class="slider-markers">${values.map((value, index) => `<button type="button" class="slider-marker" style="left:${index * 25}%" data-range-value="${value}" aria-label="Set to ${labels[index]}"><span>${labels[index]}</span></button>`).join("")}</span>`;
  return `<form class="modal-form task-modal-form"><div class="task-modal-body"><section class="task-details"><div class="section-heading"><div><strong>Basic Information</strong><small>Give your task a clear name and add any useful notes.</small></div></div><div class="form-field"><label>Task name <b>*</b></label><input class="input" name="taskName" required value="${esc(taskNameField)}" placeholder="e.g. Finish Deep Learning lab"></div><div class="form-field"><div class="field-label"><label>Note</label><small>Optional</small></div><textarea class="textarea" name="description" rows="3" maxlength="500" placeholder="Add a note...">${esc(task.description || "")}</textarea></div></section><section class="planning"><div class="section-heading"><div><strong>Planning &amp; Prioritization</strong><small>Set a deadline, estimate the effort, and indicate how important this task is.</small></div></div><div class="planning-grid"><div class="form-field"><label>Deadline <b>*</b></label><input class="input" type="datetime-local" name="deadline" required value="${task.deadline ? localDateTimeValue(task.deadline) : ""}"></div><div class="form-field duration-field"><label>Estimated duration</label><select class="select" data-duration-select>${[[".25", "15 minutes"], [".5", "30 minutes"], ["1", "1 hour"], ["", "2 hours"], ["3", "3 hours"], ["4", "4 hours"], ["5", "5 hours"]].map(([v, label]) => `<option value="${v}" ${v === "" ? duration === "" || String(duration) === "2" ? "selected" : "" : String(duration) === v ? "selected" : ""}>${label}</option>`).join("")}<option value="custom" ${custom ? "selected" : ""}>Other</option></select><input class="input custom-duration" data-custom-duration name="estimatedDuration" ${custom ? "required" : "hidden"} type="number" min="0.25" step="0.25" value="${duration}" placeholder="Hours"><small>Optional &middot; If not specified, we use a default of 2 hours.</small></div></div><div class="form-field range-field importance-range"><div class="field-label"><label>Importance <b>*</b></label><output data-range-output="importanceIndex"></output></div><div class="progress-slider"><span class="progress-slider-track" aria-hidden="true"><span class="progress-slider-active"></span></span>${markers([0, 1, 2, 3, 4], ["Very Low", "Low", "Medium", "High", "Very High"])}<input type="range" min="0" max="4" step="1" name="importanceIndex" value="${importanceIndex}" data-range data-labels="Very Low|Low|Medium|High|Very High"></div><input type="hidden" name="importance" value="${importance[importanceIndex]}"></div><div class="form-field range-field progress-range"><div class="field-label"><label>Progress</label><output data-range-output="currentProgress"></output></div><div class="progress-slider"><span class="progress-slider-track" aria-hidden="true"><span class="progress-slider-active"></span></span>${markers([0, 25, 50, 75, 100], ["0%", "25%", "50%", "75%", "100%"])}<input type="range" min="0" max="100" step="25" name="currentProgress" value="${Number(task.currentProgress || 0)}" data-range></div></div></section></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">${task.taskId ? "" : `<span aria-hidden="true">+</span>`}${task.taskId ? "Save task" : "Create task"}</button></div></form>`;
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

function completeTask(task) {
  if (Number(task.currentProgress) === 100) return;
  const name = task.taskName || task.name;
  showConfirmModal({
    title: "Mark task as completed?",
    message: `This task is currently ${task.currentProgress}% complete. Marking it as completed will set its progress to 100%.`,
    confirmLabel: "Mark complete",
    onConfirm: async (close) => {
      try {
        await taskService.setTaskCompletion(task.taskId, true);
        close();
        toast(`${name} completed`, {
          actionLabel: "Undo",
          onAction: async () => {
            try {
              await taskService.setTaskCompletion(task.taskId, false);
              toast(`${name} reopened`);
            } catch (error) { toast(error.message); }
          },
        });
      } catch (error) { toast(error.message); }
    },
  });
}

async function reopenTask(task) {
  try {
    await taskService.setTaskCompletion(task.taskId, false);
    toast(`${task.taskName || task.name} reopened`);
  } catch (error) { toast(error.message); }
}

function completeTasks(tasks, onSettled = () => {}) {
  const incomplete = tasks.filter((task) => Number(task.currentProgress) < 100);
  if (!incomplete.length) return toast("Selected tasks are already completed");
  showConfirmModal({
    title: `Mark ${incomplete.length} ${incomplete.length === 1 ? "task" : "tasks"} as completed?`,
    message: "Their progress will be set to 100%. You can undo this action afterward.",
    confirmLabel: "Mark complete",
    onConfirm: async (close) => {
      const result = await taskService.setTaskCompletions(incomplete.map((task) => task.taskId), true);
      close();
      await onSettled(result);
      const { successful, failed } = result;
      const message = failed.length
        ? `${successful.length} completed; ${failed.length} failed: ${failed[0].error.message}`
        : `${successful.length} ${successful.length === 1 ? "task" : "tasks"} completed`;
      toast(message, successful.length ? {
        actionLabel: "Undo",
        onAction: async () => {
          const undo = await taskService.setTaskCompletions(successful.map((task) => task.taskId), false);
          toast(undo.failed.length ? `${undo.successful.length} reopened; ${undo.failed.length} failed` : "Tasks reopened");
        },
      } : undefined);
    },
  });
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
  return `<div class="task-details-panel"><p>${esc(t.description) || "No note provided."}</p><dl><div><dt>Deadline</dt><dd>${fmtDateTime(t.deadline)}</dd></div><div><dt>Importance</dt><dd class="importance-label ${t.importance}">${t.importance.replace("-", " ")}</dd></div><div><dt>Progress</dt><dd>${t.currentProgress}%</dd></div><div><dt>Effective duration</dt><dd>${t.effectiveDuration}h${t.estimatedDuration == null ? " (default)" : ""}</dd></div><div><dt>Remaining workload</dt><dd>${t.remainingWorkload.toFixed(1)}h</dd></div><div><dt>Workload score</dt><dd>${t.workloadScore}</dd></div>${t.completionStatus !== "completed" ? `<div class="detail-priority"><dt>Priority score</dt><dd>${Math.round(t.priorityScore)}</dd></div>` : ""}${includeStatus ? `<div class="detail-status"><dt>Status</dt><dd><span class="status ${status[0]}">${status[1]}</span></dd></div>` : ""}</dl></div>`;
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
  return courseTaskRow(task, selectedTaskId, selectedTaskIds, course);
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
    return items.length ? `<section class="task-group group-${key}"><header><h2>${label}</h2></header><div class="course-task-table">${items.map((task) => taskRow(task, courses.find((course) => course.courseId === task.courseId), selectedTaskId, selectedTaskIds)).join("")}</div></section>` : "";
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

function addCourse(onAdded = () => {}) {
  modal("Add course", courseForm(), async (data, close) => {
    try {
      await courseService.createCourse({ courseName: data.get("courseName"), color: data.get("color") });
      close();
      await onAdded();
      toast("Course added");
    } catch (error) { toast(error.message); }
  });
}

async function addTask(onAdded = () => {}) {
  try {
    const courses = await courseService.getCoursesByUserId();
    modal("Add task", taskFormWithCourse({}, courses), async (data, close) => {
      try {
        await taskService.create(taskData(data));
        close();
        await onAdded();
        toast("Task added");
      } catch (error) { toast(error.message); }
    });
    wireTaskCourseSelector(courses);
  } catch (error) { toast(error.message); }
}

function courseTaskRow(task, selectedTaskId = null, selectedTaskIds = null, course = null) {
    const name = task.taskName || task.name,
      status = task.completionStatus === "completed" ? ["completed", "Completed"] : task.isOverdue ? ["overdue", "Overdue"] : ["pending", "Pending"],
      importance = task.importance.replace("-", " "),
      remainingMinutes = Math.round(task.remainingWorkload * 60),
      remaining = remainingMinutes < 60 ? `${remainingMinutes} min` : `${Math.floor(remainingMinutes / 60)}h${remainingMinutes % 60 ? ` ${remainingMinutes % 60} min` : ""}`;
    const bulkSelected = selectedTaskIds?.has(task.taskId);
    const detailsOpen = selectedTaskId instanceof Set ? selectedTaskId.has(task.taskId) : selectedTaskId === task.taskId;
    const completionAction = status[0] === "completed"
      ? `<button type="button" data-reopen="${task.taskId}">Reopen task</button>`
      : `<button type="button" data-complete="${task.taskId}">Mark complete</button>`;
    return `<article class="task-row table-task-row ${status[0] === "completed" ? "completed" : ""} ${detailsOpen ? "details-open" : ""} ${bulkSelected ? "bulk-selected" : ""}" data-task-id="${task.taskId}" tabindex="0" aria-expanded="${detailsOpen}"><button class="check ${bulkSelected ? "checked" : ""}" type="button" data-select="${task.taskId}" aria-label="Select ${esc(name)}" aria-pressed="${Boolean(bulkSelected)}">${bulkSelected ? checkmark : ""}</button><div class="table-task-name"><strong>${esc(name)}</strong>${task.description ? `<small>${esc(task.description)}</small>` : ""}</div><div class="task-badges"><span class="status ${status[0]}">${status[1]}</span><span class="status ${task.importance}">${esc(importance)}</span></div><time datetime="${esc(task.deadline)}" class="task-deadline ${task.isOverdue ? "danger-text" : ""}">${dueLabel(task.deadline)}<small>${fmtDate(task.deadline)}</small></time><div class="table-progress"><strong>${task.currentProgress}%</strong><div class="progress" aria-label="${task.currentProgress}% complete"><span style="width:${task.currentProgress}%"></span></div></div><span class="task-remaining">~${remaining} <small>remaining</small></span><span class="task-score"><small>Priority</small>${Math.round(task.priorityScore)}</span><details class="task-menu"><summary aria-label="Task actions">&bull;&bull;&bull;</summary><div>${completionAction}<button data-edit="${task.taskId}">Edit task</button><button class="danger" data-delete="${task.taskId}">Delete task</button></div></details><aside class="task-preview"><div class="task-preview-inner"><section class="task-detail-info"><dl><div><dt>Deadline</dt><dd><time datetime="${esc(task.deadline)}">${fmtDateTime(task.deadline)}</time>${task.isOverdue ? ` <span class="status overdue">Overdue</span>` : ""}</dd></div><div><dt>Importance</dt><dd class="importance-label ${task.importance}">${esc(importance)}</dd></div><div><dt>Course</dt><dd>${esc(course?.courseName || "Current course")}</dd></div></dl></section><section class="task-detail-progress"><div class="detail-progress-heading"><span>Progress</span><strong>${task.currentProgress}%</strong></div><div class="progress" aria-label="${task.currentProgress}% complete"><span style="width:${task.currentProgress}%"></span></div><div class="detail-remaining"><span>Remaining workload</span><strong>~${remaining}</strong></div><div class="task-detail-actions"><button class="btn ${status[0] === "completed" ? "btn-outline" : "btn-primary"}" type="button" ${status[0] === "completed" ? `data-reopen="${task.taskId}"` : `data-complete="${task.taskId}"`}>${status[0] === "completed" ? "Reopen task" : "Mark complete"}</button><button class="btn btn-outline" data-edit="${task.taskId}">Edit task</button><button class="btn btn-danger" data-delete="${task.taskId}">Delete task</button></div></section></div></aside></article>`;
}

function courseTaskTable(tasks, selectedTaskId = null, selectedTaskIds = null, course = null) {
  return `<div class="course-task-table">${tasks.map((task) => courseTaskRow(task, selectedTaskId, selectedTaskIds, course)).join("")}</div>`;
}

export {
  taskForm,
  taskFormWithCourse,
  wireTaskCourseSelector,
  taskData,
  completeTask,
  completeTasks,
  reopenTask,
  taskDetails,
  warningList,
  taskGroup,
  taskRow,
  groupedTasks,
  wireExpandable,
  wireTaskSort,
  courseForm,
  addCourse,
  addTask,
  courseTaskTable,
};
