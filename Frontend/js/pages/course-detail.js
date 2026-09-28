import * as courseService from "../services/courseService.js";
import * as taskService from "../services/taskService.js";
import * as smartService from "../services/smartService.js";
import { $, esc, dueLabel, toast } from "../shared/ui.js";
import { modal } from "../components/modal.js";
import { courseForm, courseTaskTable, taskData, taskForm } from "../components/task-ui.js";
import { initShell } from "../shared/shell.js";

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
          ...raw.map((task) => smartService.enrich(task)).filter((task) => task.completionStatus === "completed"),
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
      document.querySelectorAll("[data-complete]").forEach((button) => button.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
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

export { initCourseDetail };
