import * as authService from "../services/authService.js";
import * as taskService from "../services/taskService.js";
import { $, toast } from "./ui.js";
import { initNotifications, notificationReadState } from "./notifications.js";

const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasNativePageTransitions = () => /^https?:$/.test(location.protocol) && CSS.supports("selector(:active-view-transition)");

function setProfileMenuOpen(button, dropdown, open) {
  button.setAttribute("aria-expanded", String(open));
  dropdown.hidden = !open;
}

function initProfileMenu(user) {
  const oldAvatar = $("#userAvatar"), oldName = $("#userName"), oldLogout = $("#logoutBtn");
  if (!oldAvatar || !oldName || !oldLogout) return;
  oldAvatar.insertAdjacentHTML("beforebegin", `
    <div class="user-menu">
      <button id="userMenuButton" class="user-menu-button" type="button" aria-haspopup="menu" aria-controls="userMenuDropdown" aria-expanded="false">
        <span id="userAvatar" class="profile-avatar" aria-hidden="true"></span>
        <span id="userName" class="user-name"></span>
        <svg class="user-menu-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg>
      </button>
      <div id="userMenuDropdown" class="user-dropdown" role="menu" hidden>
        <div class="user-dropdown-header">
          <span id="dropdownUserAvatar" class="profile-avatar profile-avatar-large" aria-hidden="true"></span>
          <span><strong id="dropdownUserName"></strong><small id="dropdownUsername"></small></span>
        </div>
        <div class="user-dropdown-items">
          <a href="profile.html" role="menuitem"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/></svg>Profile</a>
          <a href="about.html" role="menuitem"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg>About</a>
        </div>
        <div class="user-dropdown-items user-dropdown-danger">
          <button id="logoutBtn" type="button" role="menuitem"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/></svg>Log out</button>
        </div>
      </div>
    </div>`);
  oldAvatar.remove();
  oldName.remove();
  oldLogout.remove();

  const name = user.studentName || user.username;
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  $("#userName").textContent = name;
  $("#userAvatar").textContent = initials;
  $("#dropdownUserName").textContent = name;
  $("#dropdownUserAvatar").textContent = initials;
  $("#dropdownUsername").textContent = `@${user.username}`;

  const wrapper = $(".user-menu"), button = $("#userMenuButton"), dropdown = $("#userMenuDropdown");
  button.addEventListener("click", () => setProfileMenuOpen(button, dropdown, dropdown.hidden));
  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) setProfileMenuOpen(button, dropdown, false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dropdown.hidden) {
      setProfileMenuOpen(button, dropdown, false);
      button.focus();
    }
  });
  $("#logoutBtn").addEventListener("click", async () => {
    try {
      await authService.logout();
      navigate("index.html", { replace: true });
    } catch (error) {
      toast(error.message);
    }
  });
}

function navigate(url, { replace = false } = {}) {
  const destination = new URL(url, location.href);
  const go = () => replace ? location.replace(destination.href) : location.assign(destination.href);
  if (prefersReducedMotion() || hasNativePageTransitions() || destination.href === location.href) return go();
  document.body.classList.add("page-leaving");
  setTimeout(go, 200);
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
  initProfileMenu(u);
  addEventListener("pageshow", () => {
    if (!authService.getCurrentUser()) navigate("index.html#authCard", { replace: true });
  });
  initNotifications(navigate).catch((error) => toast(error.message));
  addEventListener(taskService.TASKS_CHANGED_EVENT, () => initNotifications(navigate).catch((error) => toast(error.message)));
  return u;
}

function initPageTransitions() {
  if (prefersReducedMotion()) return;
  const isPageLink = (link) => link.origin === location.origin && /\/(dashboard|course|course-detail|tasks|calendar|profile|about)\.html$/.test(link.pathname);
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

export { initShell, initPageTransitions, navigate, notificationReadState, setProfileMenuOpen };
