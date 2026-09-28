import * as courseService from "../services/courseService.js";
import * as taskService from "../services/taskService.js";
import * as smartService from "../services/smartService.js";
import { $, esc, toast } from "../shared/ui.js";
import { modal } from "../components/modal.js";
import { groupedTasks, taskData, taskForm, taskFormWithCourse, taskGroup, wireTaskCourseSelector } from "../components/task-ui.js";
import { initShell } from "../shared/shell.js";

function initAllTasks() {
  const user = initShell();
  if (!user) return;
  const requestedStatus = new URLSearchParams(location.search).get("status");
  let status = ["pending", "overdue", "today", "completed"].includes(requestedStatus) ? requestedStatus : "all", courseId = "all", query = "", sort = "priority", selectedTaskId = null, courses = [];
  const selectedTaskIds = new Set(), bulkActions = $("#bulkActions"), courseAutocomplete = $("#courseAutocomplete"), courseInput = $("#courseFilter"), courseOptions = $("#courseOptions");
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
  const render = async () => {
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
      $("#taskList").innerHTML = visible.length ? groupedTasks(visible, courses, selectedTaskId) : `<div class="empty course-empty-state"><h3>No matching tasks</h3><p>Try another filter or create a new task.</p></div>`;
      document.querySelectorAll("#taskList button:not([type])").forEach((button) => (button.type = "button"));
      document.querySelectorAll("[data-filter]").forEach((button) => button.onclick = () => { status = button.dataset.filter; saveStatus(); render(); });
      document.querySelectorAll("[data-complete]").forEach((button) => button.onclick = async (event) => {
        event.preventDefault();
        const taskId = button.dataset.complete, top = button.closest("[data-task-id]").getBoundingClientRect().top, scrollY = window.scrollY;
        try {
          await taskService.toggleCompleted(taskId);
          await render();
          const task = document.querySelector(`[data-task-id="${CSS.escape(taskId)}"]`);
          requestAnimationFrame(() => task ? window.scrollBy(0, task.getBoundingClientRect().top - top) : window.scrollTo(0, scrollY));
        } catch (error) { toast(error.message); }
      });
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

export { initAllTasks };
