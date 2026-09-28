import * as authService from "../services/authService.js";
import * as courseService from "../services/courseService.js";
import * as taskService from "../services/taskService.js";
import * as smartService from "../services/smartService.js";
import { $, esc, fmtDateTime, toast } from "./ui.js";
import { taskDetails } from "../components/task-ui.js";

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

function initShell() {
  const u = authService.getCurrentUser();
  if (!u) {
    location.replace("index.html#authCard");
    return null;
  }
  if (document.body.dataset.page === "dashboard") {
    if (!history.state?.studyflowAuthRoot) {
      history.replaceState({ studyflowAuthRoot: true }, "", location.href);
      history.pushState({ studyflowAuthRoot: true, guard: true }, "", location.href);
    }
    addEventListener("popstate", (event) => {
      if (event.state?.studyflowAuthRoot && !event.state.guard) {
        history.pushState({ studyflowAuthRoot: true, guard: true }, "", location.href);
      }
    });
  }
  if (!$("#notiBellBtn")) $(".user-actions .ui-switch")?.insertAdjacentHTML("afterend", '<div class="notification-wrapper"><button id="notiBellBtn" class="icon-btn" type="button" aria-label="Notifications">&#128276;<span id="notiBadge" class="noti-badge" hidden>0</span></button><div id="notiDropdown" class="noti-dropdown" hidden><div class="noti-header">Notifications</div><ul id="notiList" class="noti-list"></ul></div></div>');
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
    location.replace("index.html");
  });
  addEventListener("pageshow", () => {
    if (!authService.getCurrentUser()) location.replace("index.html#authCard");
  });
  initNotifications().catch((error) => toast(error.message));
  return u;
}

function initPageTransitions() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const isPageLink = (link) => link.origin === location.origin && /\/(dashboard|course|course-detail|tasks|calendar)\.html$/.test(link.pathname);
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

export { initShell, initPageTransitions };
