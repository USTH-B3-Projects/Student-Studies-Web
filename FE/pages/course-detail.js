import * as courseService from "../services/courseService.js";
import * as taskService from "../services/taskService.js";
import * as smartService from "../services/smartService.js";
import { $, esc, dueLabel, toast, reconcileTaskRows } from "../components/ui.js";
import { modal, showConfirmModal } from "../components/modal.js";
import { completeTask, completeTasks, courseForm, courseTaskTable, reopenTask, taskData, taskForm, wireTaskRows, wireTaskSort } from "../components/task-ui.js";
import { initShell, navigate } from "../components/shell.js";

function initCourseDetail() {
  const u = initShell();
  if (!u) return;
  const params = new URLSearchParams(location.search), courseId = params.get("courseId");
  if (!courseId) {
    navigate("course.html");
    return;
  }
  let filter = "all",
    sort = "priority",
    query = "";
  let manualOrder = [];
  const expandedTaskIds = new Set(params.get("taskId") ? [params.get("taskId")] : []), selectedTaskIds = new Set(), bulkActions = $("#bulkActions");
  const courseRowElement = (task, course) => {
    const template = document.createElement("template");
    template.innerHTML = courseTaskTable([task], expandedTaskIds, selectedTaskIds, course);
    return template.content.firstElementChild.firstElementChild;
  };
  const render = async (changedIds = null) => {
    try {
      const raw = await taskService.getTasksByCourseId(courseId),
        ranked = smartService.rankTasks(raw),
        all = smartService.applyManualOrder([
          ...ranked,
          ...raw.map((task) => smartService.enrich(task)).filter((task) => task.completionStatus === "completed"),
        ], manualOrder);
      const course = await courseService.getCourseById(courseId);
      if (!course || course.username !== u.username) {
        navigate("course.html");
        return;
      }
      const counts = {
        pending: all.filter((t) => t.displayStatus === "pending").length,
        completed: all.filter((t) => t.displayStatus === "completed").length,
        overdue: all.filter((t) => t.displayStatus === "overdue").length,
      };
      const progress = taskService.getProgress(all);
      $("#courseHero").innerHTML =
        `<section class="course-hero"><div class="course-title"><div class="course-dot" style="background:${course.color || "#e9f2ff"}22;color:${course.color || "var(--blue)"}">${esc(course.courseName.slice(0, 1).toUpperCase())}</div><div><h1>${esc(course.courseName)}</h1><p>${all.length} tasks &middot; ${counts.completed} completed &middot; ${counts.overdue} overdue</p></div></div><div class="course-progress-copy"><strong>${progress}% complete</strong><div class="progress" aria-label="${progress}% complete"><span style="width:${progress}%;background:${course.color || "var(--blue)"}"></span></div></div><div class="course-actions"><button id="editCourse" class="btn btn-outline">Edit course</button><details class="course-menu"><summary aria-label="Course actions">&bull;&bull;&bull;</summary><div><button data-menu-edit-course>Edit course</button><button id="deleteCourse" class="danger">Delete course</button></div></details></div></section>`;
      const updateRecommendation = () => {
        const recommended = smartService.applyManualOrder(all, manualOrder).find((task) => task.currentProgress < 100);
        $("#courseRecommended").innerHTML = recommended
          ? `<article class="recommended-next"><header><h2>Recommended next</h2><span>Based on smart prioritization</span></header><div class="recommended-body"><div class="recommended-icon" aria-hidden="true">${esc((recommended.taskName || recommended.name).slice(0, 1).toUpperCase())}</div><div class="recommended-copy"><strong>${esc(recommended.taskName || recommended.name)}</strong><span>${dueLabel(recommended.deadline)} &middot; ~${Number(recommended.remainingWorkload.toFixed(1))}h remaining</span></div><div class="recommended-progress"><div><strong>${recommended.currentProgress}%</strong><span> complete</span></div><div class="progress" aria-label="${recommended.currentProgress}% complete"><span style="width:${recommended.currentProgress}%"></span></div></div><div class="task-badges"><span class="status ${recommended.isOverdue ? "overdue" : "pending"}">${recommended.isOverdue ? "Overdue" : "Pending"}</span><span class="status ${recommended.importance}">${esc(recommended.importance.replace("-", " "))}</span></div><div class="recommended-score"><span>Priority</span><strong>${Math.round(recommended.priorityScore)}</strong></div></div></article>`
          : `<article class="recommended-next recommended-empty"><div><h2>You're all caught up</h2><p>No pending tasks in this course.</p></div></article>`;
      };
      updateRecommendation();
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
      list = smartService.applyManualOrder(list, manualOrder);
      const visibleIds = new Set(list.map((task) => task.taskId));
      selectedTaskIds.forEach((id) => { if (!visibleIds.has(id)) selectedTaskIds.delete(id); });
      bulkActions.hidden = selectedTaskIds.size === 0;
      bulkActions.innerHTML = selectedTaskIds.size ? `<strong><span aria-hidden="true">&#10003;</span> ${selectedTaskIds.size} selected</strong><div><button class="btn btn-outline" type="button" data-select-all>${selectedTaskIds.size === list.length ? "Deselect all" : "Select all"}</button><button class="btn btn-primary" type="button" data-bulk-complete>Complete</button><button class="btn btn-danger" type="button" data-bulk-delete>Delete</button><button class="bulk-clear" type="button" data-clear-selection aria-label="Clear selection">&times;</button></div>` : "";
      const table = $("#taskList .course-task-table");
      if (changedIds && table) {
        reconcileTaskRows(table, list, (task) => courseRowElement(task, course), changedIds);
        if (!list.length) $("#taskList").innerHTML = `<div class="empty"><h3>${filter === "all" ? "No tasks yet" : "No matching tasks"}</h3><p>${filter === "all" ? "Add your first task to start tracking this course." : "Try another filter."}</p></div>`;
      } else {
        $("#taskList").innerHTML = list.length
          ? courseTaskTable(list, expandedTaskIds, selectedTaskIds, course)
          : `<div class="empty"><h3>${filter === "all" ? "No tasks yet" : "No matching tasks"}</h3><p>${filter === "all" ? "Add your first task to start tracking this course." : "Try another filter."}</p></div>`;
      }
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
          (b.onclick = () => showConfirmModal({ title: "Delete task?", message: "Are you sure you want to delete this task?", confirmLabel: "Delete task", danger: true, onConfirm: async (close) => {
            try {
              await taskService.deleteTask(b.dataset.delete);
              selectedTaskIds.delete(b.dataset.delete);
              expandedTaskIds.delete(b.dataset.delete);
              close();
              await render();
            } catch (error) {
              toast(error.message);
            }
          } })),
      );
      document.querySelectorAll("[data-edit]").forEach(
        (b) =>
          (b.onclick = async () => {
            const t = raw.find((x) => x.taskId === b.dataset.edit);
            modal("Edit task", taskForm(t), async (d, close) => {
              try {
                await taskService.updateTask(t.taskId, taskData(d));
                close();
                await render();
              } catch (e) {
                toast(e.message);
              }
            });
          }),
      );
      document.querySelectorAll("[data-complete]").forEach((button) => button.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const task = all.find((item) => item.taskId === button.dataset.complete);
        if (task) completeTask(task);
      });
      document.querySelectorAll("[data-reopen]").forEach((button) => button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const task = all.find((item) => item.taskId === button.dataset.reopen);
        if (task) reopenTask(task);
      });
      wireTaskRows($("#taskList"), expandedTaskIds, true);
      const taskTable = $("#taskList .course-task-table");
      if (taskTable) wireTaskSort(taskTable, (ids) => {
        manualOrder = smartService.applyManualOrder(all, ids).map((task) => task.taskId);
        updateRecommendation();
      });
      bulkActions.querySelector("[data-select-all]")?.addEventListener("click", () => { const allSelected = list.every((task) => selectedTaskIds.has(task.taskId)); list.forEach((task) => allSelected ? selectedTaskIds.delete(task.taskId) : selectedTaskIds.add(task.taskId)); render(); });
      bulkActions.querySelector("[data-clear-selection]")?.addEventListener("click", () => { selectedTaskIds.clear(); render(); });
      bulkActions.querySelector("[data-bulk-complete]")?.addEventListener("click", () => completeTasks(
        [...selectedTaskIds].map((id) => all.find((task) => task.taskId === id)).filter(Boolean),
        async ({ successful, failed }) => {
          successful.forEach((task) => selectedTaskIds.delete(task.taskId));
          await render(new Set([...successful.map((task) => task.taskId), ...failed.map(({ taskId }) => taskId)]));
        },
      ));
      bulkActions.querySelector("[data-bulk-delete]")?.addEventListener("click", () => {
        const count = selectedTaskIds.size;
        showConfirmModal({ title: `Delete ${count} ${count === 1 ? "task" : "tasks"}?`, message: `This action will permanently delete the selected ${count === 1 ? "task" : "tasks"}. This cannot be undone.`, confirmLabel: "Delete", danger: true, onConfirm: async (close) => { try { await Promise.all([...selectedTaskIds].map((id) => taskService.deleteTask(id))); selectedTaskIds.clear(); close(); await render(); toast(`${count} ${count === 1 ? "task" : "tasks"} deleted`); } catch (error) { toast(error.message); } } });
      });
      $("#sortSelect").value = sort;
      $("#taskSearch").value = query;
      $("#taskSearch").oninput = (e) => {
        query = e.target.value.trim().toLowerCase();
        render();
      };
      $("#sortSelect").onchange = (e) => {
        sort = e.target.value;
        manualOrder = [];
        render();
      };
      $("#addTaskBtn").onclick = () =>
        modal("Add task", taskForm({}), async (d, close) => {
          try {
            await taskService.createTask({ courseId, ...taskData(d) });
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
      $("#deleteCourse").onclick = () => showConfirmModal({
        title: "Delete course?",
        message: "Are you sure you want to delete this course? All tasks belonging to this course will also be deleted.",
        confirmLabel: "Delete course",
        danger: true,
        onConfirm: async (close) => {
          try {
            await courseService.deleteCourse(courseId);
            close();
            navigate("course.html");
          } catch (e) {
            toast(e.message);
          }
        },
      });
    } catch (error) {
      toast(error.message);
    }
  };
  addEventListener(taskService.TASKS_CHANGED_EVENT, (event) => render(new Set(event.detail.changedIds)));
  render();
}

export { initCourseDetail };
