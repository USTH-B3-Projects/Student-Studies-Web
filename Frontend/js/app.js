import { initAuth } from "./pages/auth.js";
import { initDashboard } from "./pages/dashboard.js";
import { initCourses } from "./pages/courses.js";
import { initCourseDetail } from "./pages/course-detail.js";
import { initAllTasks } from "./pages/tasks.js";
import { initProfile } from "./pages/profile.js";
import { initPageTransitions, initShell } from "./shared/shell.js";

initPageTransitions();

const pages = {
  landing: initAuth,
  dashboard: initDashboard,
  course: initCourses,
  "course-detail": initCourseDetail,
  tasks: initAllTasks,
  calendar: initShell,
  profile: initProfile,
  about: initShell,
};

pages[document.body.dataset.page]?.();
