import * as courseService from "../services/courseService.js";
import * as taskService from "../services/taskService.js";
import * as smartService from "../services/smartService.js";
import { $, esc, toast, reconcileTaskRows } from "../shared/ui.js";
import { modal, showConfirmModal } from "../components/modal.js";
import { addTask, completeTask, completeTasks, groupedTasks, reopenTask, taskData, taskForm, taskGroup, taskRow } from "../components/task-ui.js";
import { initShell } from "../shared/shell.js";

function initAllTasks() {
  const user = initShell();
  if (!user) return;
  const requestedStatus = new URLSearchParams(location.search).get("status");
  let status = ["pending", "overdue", "today", "completed"].includes(requestedStatus) ? requestedStatus : "all", courseId = "all", query = "", sort = "priority", selectedTaskId = null, courses = [];
  const selectedTaskIds = new Set(), bulkActions = $("#bulkActions"), courseAutocomplete = $("#courseAutocomplete"), courseInput = $("#courseFilter"), courseOptions = $("#courseOptions");
  const reconcileList = (tasks, changedIds) => {
    const root = $("#taskList"), groups = [["overdue", "Overdue"], ["today", "Today"], ["pending", "Pending"], ["completed", "Completed"]];
    root.querySelector(".empty")?.remove();
    groups.forEach(([key, label], groupIndex) => {
      const items = tasks.filter((task) => taskGroup(task) === key);
      let section = root.querySelector(`.group-${key}`);
      if (!items.length) return section?.remove();
      if (!section) {
        section = document.createElement("section");
        section.className = `task-group group-${key}`;
        section.innerHTML = `<header><h2>${label}</h2><span>0</span></header><div class="course-task-table"></div>`;
        const next = groups.slice(groupIndex + 1).map(([nextKey]) => root.querySelector(`.group-${nextKey}`)).find(Boolean);
        root.insertBefore(section, next || null);
      }
      section.querySelector("header span").textContent = items.length;
      reconcileTaskRows(section.querySelector(":scope > div"), items, (task) => taskRow(task, courses.find((course) => course.courseId === task.courseId), selectedTaskId, selectedTaskIds), changedIds);
    });
    if (!tasks.length) root.innerHTML = `<div class="empty course-empty-state"><h3>No matching tasks</h3><p>Try another filter or create a new task.</p></div>`;
  };
  const saveStatus = () => {
    const url = new URL(location.href);
    status === "all" ? url.searchParams.delete("status") : url.searchParams.set("status", status);
    history.replaceState(null, "", url);
  };
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
  const render = async (changedIds = null) => {
    try {
      courses = await courseService.getCoursesByUserId();
      const raw = await taskService.getTasksByUserId();
      const tasks = raw.map(smartService.enrich);
      $("#filters").innerHTML = [["all", "All"], ["pending", "Pending"], ["overdue", "Overdue"], ["today", "Today"], ["completed", "Completed"]].map(([value, label]) => `<button class="filter ${status === value ? "active" : ""}" type="button" data-filter="${value}">${label}</button>`).join("");
      courseInput.value = courseId === "all" ? "" : courses.find((course) => course.courseId === courseId)?.courseName || "";
      let visible = tasks.filter((task) => (status === "all" || taskGroup(task) === status) && (courseId === "all" || task.courseId === courseId) && (task.taskName || task.name).toLowerCase().includes(query));
      visible.sort((a, b) => sort === "deadline" ? new Date(a.deadline) - new Date(b.deadline) : sort === "importance" ? b.importanceScore - a.importanceScore : b.priorityScore - a.priorityScore);
      const visibleIds = new Set(visible.map((task) => task.taskId));
      selectedTaskIds.forEach((id) => { if (!visibleIds.has(id)) selectedTaskIds.delete(id); });
      bulkActions.hidden = selectedTaskIds.size === 0;
      bulkActions.innerHTML = selectedTaskIds.size ? `<strong><span aria-hidden="true">&#10003;</span> ${selectedTaskIds.size} selected</strong><div><button class="btn btn-outline" type="button" data-select-all>${selectedTaskIds.size === visible.length ? "Deselect all" : "Select all"}</button><button class="btn btn-primary" type="button" data-bulk-complete>Complete</button><button class="btn btn-danger" type="button" data-bulk-delete>Delete</button><button class="bulk-clear" type="button" data-clear-selection aria-label="Clear selection">&times;</button></div>` : "";
      if (changedIds) reconcileList(visible, changedIds);
      else $("#taskList").innerHTML = visible.length ? groupedTasks(visible, courses, selectedTaskId, selectedTaskIds) : `<div class="empty course-empty-state"><h3>No matching tasks</h3><p>Try another filter or create a new task.</p></div>`;
      document.querySelectorAll("#taskList button:not([type])").forEach((button) => (button.type = "button"));
      document.querySelectorAll("[data-filter]").forEach((button) => button.onclick = () => { status = button.dataset.filter; saveStatus(); render(); });
      document.querySelectorAll("[data-complete]").forEach((button) => button.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const task = tasks.find((item) => item.taskId === button.dataset.complete);
        if (task) completeTask(task);
      });
      document.querySelectorAll("[data-reopen]").forEach((button) => button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const task = tasks.find((item) => item.taskId === button.dataset.reopen);
        if (task) reopenTask(task);
      });
      document.querySelectorAll("[data-select]").forEach((button) => button.onclick = () => {
        const id = button.dataset.select;
        selectedTaskIds.has(id) ? selectedTaskIds.delete(id) : selectedTaskIds.add(id);
        render();
      });
      document.querySelectorAll("[data-edit]").forEach((button) => button.onclick = () => {
        const task = raw.find((item) => item.taskId === button.dataset.edit);
        modal("Edit task", taskForm(task), async (data, close) => { try { await taskService.update(task.taskId, taskData(data)); close(); render(); } catch (error) { toast(error.message); } });
      });
      document.querySelectorAll("[data-delete]").forEach((button) => button.onclick = () => showConfirmModal({ title: "Delete task?", message: "Are you sure you want to delete this task?", confirmLabel: "Delete task", danger: true, onConfirm: async (close) => { try { selectedTaskIds.delete(button.dataset.delete); await taskService.remove(button.dataset.delete); close(); render(); } catch (error) { toast(error.message); } } }));
      bulkActions.querySelector("[data-select-all]")?.addEventListener("click", () => { const allSelected = visible.every((task) => selectedTaskIds.has(task.taskId)); visible.forEach((task) => allSelected ? selectedTaskIds.delete(task.taskId) : selectedTaskIds.add(task.taskId)); render(); });
      bulkActions.querySelector("[data-clear-selection]")?.addEventListener("click", () => { selectedTaskIds.clear(); render(); });
      bulkActions.querySelector("[data-bulk-complete]")?.addEventListener("click", () => completeTasks(
        [...selectedTaskIds].map((id) => tasks.find((task) => task.taskId === id)).filter(Boolean),
        async ({ successful, failed }) => {
          successful.forEach((task) => selectedTaskIds.delete(task.taskId));
          await render(new Set([...successful.map((task) => task.taskId), ...failed.map(({ taskId }) => taskId)]));
        },
      ));
      bulkActions.querySelector("[data-bulk-delete]")?.addEventListener("click", () => {
        const count = selectedTaskIds.size;
        showConfirmModal({ title: `Delete ${count} ${count === 1 ? "task" : "tasks"}?`, message: `This action will permanently delete the selected ${count === 1 ? "task" : "tasks"}. This cannot be undone.`, confirmLabel: "Delete", danger: true, onConfirm: async (close) => { try { await Promise.all([...selectedTaskIds].map((id) => taskService.remove(id))); selectedTaskIds.clear(); close(); await render(); toast(`${count} ${count === 1 ? "task" : "tasks"} deleted`); } catch (error) { toast(error.message); } } });
      });
      document.querySelectorAll(".task-row").forEach((row) => {
        const preview = row.querySelector(".task-preview");
        preview.style.setProperty("--details-height", `${preview.scrollHeight}px`);
        row.onclick = (event) => {
          if (event.target.closest("button, a, details")) return;
          selectedTaskId = selectedTaskId === row.dataset.taskId ? null : row.dataset.taskId;
          render();
        };
        row.querySelector("[data-task-toggle]")?.addEventListener("click", (event) => {
          event.stopPropagation();
          selectedTaskId = selectedTaskId === row.dataset.taskId ? null : row.dataset.taskId;
          render();
        });
        row.onkeydown = (event) => {
          if ((event.key === "Enter" || event.key === " ") && event.target === row) {
            event.preventDefault();
            row.click();
          }
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
  $("#addTaskBtn").onclick = () => addTask(render);
  addEventListener(taskService.TASKS_CHANGED_EVENT, (event) => render(new Set(event.detail.changedIds)));
  render();
}

export { initAllTasks };
