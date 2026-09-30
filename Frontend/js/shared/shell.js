import * as authService from "../services/authService.js";
import * as courseService from "../services/courseService.js";
import * as taskService from "../services/taskService.js";
import * as smartService from "../services/smartService.js";
import { $, esc, fmtDateTime, toast } from "./ui.js";
import { taskDetails } from "../components/task-ui.js";

const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasNativePageTransitions = () => /^https?:$/.test(location.protocol) && CSS.supports("selector(:active-view-transition)");
let activeNotifications = [], activeReadIds = new Set(), activeReadKey = "";

function navigate(url, { replace = false } = {}) {
  const destination = new URL(url, location.href);
  const go = () => replace ? location.replace(destination.href) : location.assign(destination.href);
  if (prefersReducedMotion() || hasNativePageTransitions() || destination.href === location.href) return go();
  document.body.classList.add("page-leaving");
  setTimeout(go, 200);
}

function notificationReadState(notifications, storedIds = []) {
  const items = notifications.map((item) => ({ ...item, id: `${item.taskId}:${item.type}` }));
  const currentIds = new Set(items.map(({ id }) => id));
  const readIds = new Set(storedIds.filter((id) => currentIds.has(id)));
  items.forEach((item) => (item.read = readIds.has(item.id)));
  return { items, readIds };
}

async function initNotifications() {
  const badge = $("#notiBadge"), list = $("#notiList"), bell = $("#notiBellBtn"), dropdown = $("#notiDropdown");
  if (!badge || !list || !bell || !dropdown) return;
  const generated = smartService.getUserNotifications(await taskService.getTasksByUserId()),
    readKey = `studyflow_read_notifications_${authService.getCurrentUser().username}`;
  let storedIds;
  try { storedIds = JSON.parse(localStorage.getItem(readKey) || "[]"); }
  catch { storedIds = []; }
  if (!Array.isArray(storedIds)) storedIds = [];
  const { items: notifications, readIds } = notificationReadState(generated, storedIds);
  activeNotifications = notifications;
  activeReadIds = readIds;
  activeReadKey = readKey;
  localStorage.setItem(readKey, JSON.stringify([...readIds]));
  const syncBadge = () => {
    const unread = activeNotifications.filter((item) => !item.read).length;
    badge.textContent = unread ? String(unread) : "";
    badge.hidden = unread === 0;
  };
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
      [...root.querySelectorAll(".notification-details > div")].find((row) => row.querySelector("dt")?.textContent === "Importance")?.querySelector("dd")?.classList.add("importance-label", task.importance);
      root.querySelectorAll("[data-notification-close]").forEach((button) => button.onclick = close);
      root.querySelector(".notification-backdrop").onclick = (event) => { if (event.target === event.currentTarget) close(); };
      root.querySelector("[data-view-notification-task]").onclick = () => {
        const url = `course-detail.html?courseId=${encodeURIComponent(task.courseId)}&taskId=${encodeURIComponent(task.taskId)}`;
        close();
        navigate(url);
      };
      document.addEventListener("keydown", onKeydown);
      root.querySelector("[data-notification-close]").focus();
    } catch (error) { toast(error.message); }
  };
  syncBadge();
  list.innerHTML = notifications.length
    ? notifications.map((item, index) => `<li><button class="noti-item" type="button" data-notification-index="${index}"><span class="noti-title">${esc(item.title)}</span><span class="noti-type">${esc(item.type)}</span><span class="noti-desc">${esc(item.message)}</span></button></li>`).join("")
    : '<li class="noti-empty">Great job! You have no workload warnings.</li>';
  if (bell.dataset.bound) return;
  bell.dataset.bound = "true";
  dropdown.hidden = false;
  const setDropdownOpen = (open) => {
    dropdown.classList.toggle("open", open);
    dropdown.setAttribute("aria-hidden", String(!open));
    bell.setAttribute("aria-expanded", String(open));
  };
  setDropdownOpen(false);
  bell.onclick = (event) => {
    event.stopPropagation();
    const opening = !dropdown.classList.contains("open");
    setDropdownOpen(opening);
    if (opening) {
      activeNotifications.forEach((item) => { item.read = true; activeReadIds.add(item.id); });
      localStorage.setItem(activeReadKey, JSON.stringify([...activeReadIds]));
      syncBadge();
    }
  };
  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target) && event.target !== bell) setDropdownOpen(false);
  });
  list.onclick = (event) => {
    const notification = event.target.closest("[data-notification-index]");
    if (!notification) return;
    setDropdownOpen(false);
    openNotification(activeNotifications[Number(notification.dataset.notificationIndex)]);
  };
}

function initShell() {
  const u = authService.getCurrentUser();
  if (!u) {
    navigate("index.html#authCard", { replace: true });
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
    navigate("index.html", { replace: true });
  });
  addEventListener("pageshow", () => {
    if (!authService.getCurrentUser()) navigate("index.html#authCard", { replace: true });
  });
  initNotifications().catch((error) => toast(error.message));
  addEventListener(taskService.TASKS_CHANGED_EVENT, () => initNotifications().catch((error) => toast(error.message)));
  return u;
}

function initPageTransitions() {
  if (prefersReducedMotion()) return;
  const isPageLink = (link) => link.origin === location.origin && /\/(dashboard|course|course-detail|tasks|calendar)\.html$/.test(link.pathname);
  if (!hasNativePageTransitions()) document.documentElement.classList.add("fallback-page-transition");
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
    if (hasNativePageTransitions()) return;
    event.preventDefault();
    navigate(destination.href);
  });
  addEventListener("pageshow", () => document.body.classList.remove("page-leaving"));
}

export { initShell, initPageTransitions, navigate, notificationReadState };
