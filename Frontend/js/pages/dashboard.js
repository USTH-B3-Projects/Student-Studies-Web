import * as courseService from "../services/courseService.js";
import * as taskService from "../services/taskService.js";
import * as smartService from "../services/smartService.js";
import { $, esc, fmtDate, fmtDateTime, localDateTimeValue, dueLabel, toast, reconcileTaskRows } from "../shared/ui.js";
import { initShell } from "../shared/shell.js";
import { addCourse, addTask, completeTask, taskGroup } from "../components/task-ui.js";

function initDashboard() {
  const u = initShell();
  if (!u) return;
  const priorityLevel = (score) => score >= 80 ? "critical" : score >= 60 ? "high" : score >= 40 ? "medium" : score >= 20 ? "low" : "minimal";
  const attentionEmpty = `<div class="mini-empty"><img src="../source/studyflow-mascot-pack/cat-good-job.png" alt=""><strong>You're all caught up.</strong><span>No tasks currently need attention.</span></div>`;
  const upcomingEmpty = `<div class="mini-empty compact"><strong>You're all caught up.</strong><span>No pending tasks.</span></div>`;
  const attentionRow = (task, courses) => {
    const course = courses.find((item) => item.courseId === task.courseId), name = task.taskName || task.name,
      href = `course-detail.html?courseId=${encodeURIComponent(task.courseId)}&taskId=${encodeURIComponent(task.taskId)}`;
    return `<div class="attention-task" data-task-id="${task.taskId}"><a class="attention-task-link" href="${href}"><span class="attention-copy"><strong>${esc(name)}</strong><small>${esc(course?.courseName || "Course")}</small></span><span class="attention-meta"><span class="attention-deadline"><i aria-hidden="true">&#128197;</i>${dueLabel(task.deadline)}</span><span class="attention-progress"><i style="--task-progress:${task.currentProgress}" aria-hidden="true"></i>${task.currentProgress}%</span><span><i aria-hidden="true">&#9716;</i>~${Number(task.remainingWorkload.toFixed(1))}h</span></span></a>${task.isOverdue ? `<span class="attention-status overdue"><span aria-hidden="true">&#128308;</span>Overdue</span>` : ""}<button class="btn btn-outline attention-complete" type="button" data-dashboard-complete="${task.taskId}">Mark complete</button></div>`;
  };
  const upcomingRow = (task, courses) => {
    const course = courses.find((item) => item.courseId === task.courseId), name = task.taskName || task.name;
    return `<div class="upcoming-row" data-task-id="${task.taskId}"><time datetime="${esc(task.deadline)}">${fmtDate(task.deadline)}</time><a class="task-link" href="course-detail.html?courseId=${encodeURIComponent(task.courseId)}"><span>${esc(name)}</span><span class="row-arrow" aria-hidden="true">›</span></a><span>${esc(course?.courseName || "Course")}</span><strong class="upcoming-priority ${priorityLevel(task.priorityScore)}">${Math.round(task.priorityScore)}</strong><div class="task-progress"><div class="progress" aria-label="${task.currentProgress}% complete"><span style="width:${task.currentProgress}%"></span></div><span>${task.currentProgress}%</span></div></div>`;
  };
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
  const render = async (changedIds = null) => {
    try {
      const courses = await courseService.getCoursesByUserId(), 
        tasks = await taskService.getTasksByUserId() ?? [],
        enriched = tasks.map(smartService.enrich),
        ranked = smartService.rankTasks(tasks),
        pendingTasks = ranked.filter((task) => taskGroup(task) === "pending"),
        overdueTasks = enriched.filter((task) => taskGroup(task) === "overdue").sort((a, b) => new Date(a.deadline) - new Date(b.deadline)),
        todayTasksForPulse = enriched.filter((task) => taskGroup(task) === "today"),
        completedTasks = enriched.filter((task) => taskGroup(task) === "completed"),
        attention = enriched.filter((t) => t.isOverdue || t.hasWorkloadWarning).sort((a, b) => b.priorityScore - a.priorityScore),
        now = new Date(),
        upcoming = enriched.filter((t) => t.completionStatus !== "completed" && Number(t.currentProgress) < 100 && new Date(t.deadline) >= now).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);
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
      const attentionList = $("#attentionArea .warning-task-list");
      if (changedIds && attentionList) {
        attentionList.querySelector(".mini-empty")?.remove();
        reconcileTaskRows(attentionList, attention, (task) => attentionRow(task, courses), changedIds);
        if (!attention.length) attentionList.innerHTML = attentionEmpty;
      } else {
        $("#attentionArea").innerHTML = `<article class="card overview-card attention-card"><div class="attention-head"><div class="attention-title"><span class="attention-warning-icon" aria-hidden="true">!</span><div><h2>Warning</h2><p>These tasks are at risk due to upcoming deadlines or high workload.</p></div></div></div><div class="attention-list warning-task-list">${attention.length ? attention.map((task) => attentionRow(task, courses)).join("") : attentionEmpty}</div></article>`;
      }
      $("#progressArea").innerHTML = `<article class="card overview-card progress-card"><div class="summary-head"><h2>Today's Summary</h2><time datetime="${localDateTimeValue(today).slice(0, 10)}">${todayLabel}</time></div><div class="today-summary"><div class="progress-ring" style="--progress:${todayProgress}" role="img" aria-label="${todayPercentage}% of today's tasks completed"><span><strong>${todayPercentage}%</strong><small>tasks today</small><small class="progress-count">${todayCompleted} / ${todayTasks.length} completed</small></span></div><div class="summary-statuses"><div class="summary-status attention"><i aria-hidden="true"></i><strong>${todayAttention}</strong><span>Need attention</span></div><div class="summary-status active"><i aria-hidden="true"></i><strong>${todayInProgress}</strong><span>In progress</span></div><div class="summary-status done"><i aria-hidden="true"></i><strong>${todayCompleted}</strong><span>Completed</span></div></div></div><section class="quick-actions" aria-labelledby="quickActionsTitle"><strong id="quickActionsTitle">Quick Actions</strong><div><button type="button" data-add-course><span aria-hidden="true">+</span>Add Course</button><button type="button" data-add-task><span aria-hidden="true">+</span>Add Task</button></div></section></article>`;
      $("[data-add-course]").onclick = () => addCourse(render);
      $("[data-add-task]").onclick = () => addTask(render);
      const upcomingList = $("#upcomingTasks"), upcomingHead = upcomingList.querySelector(".upcoming-head");
      if (changedIds && upcomingHead && upcoming.length) {
        reconcileTaskRows(upcomingList, upcoming, (task) => upcomingRow(task, courses), changedIds);
      } else if (changedIds && !upcoming.length) {
        upcomingList.innerHTML = upcomingEmpty;
      } else {
        upcomingList.innerHTML = upcoming.length ? `<div class="upcoming-head"><span>Deadline</span><span>Task</span><span>Course</span><span>Priority</span><span>Progress</span><span></span></div>${upcoming.map((task) => upcomingRow(task, courses)).join("")}` : upcomingEmpty;
      }
      document.querySelectorAll("[data-dashboard-complete]").forEach((button) => button.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const task = enriched.find((item) => item.taskId === button.dataset.dashboardComplete);
        if (task) completeTask(task);
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
  addEventListener(taskService.TASKS_CHANGED_EVENT, (event) => render(new Set(event.detail.changedIds)));
  addEventListener("pageshow", () => render());
}

export { initDashboard };
