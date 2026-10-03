import { initAuth } from "./pages/auth.js";
import { initDashboard } from "./pages/dashboard.js";
import { initCourses } from "./pages/courses.js";
import { initCourseDetail } from "./pages/course-detail.js";
import { initAllTasks } from "./pages/tasks.js";
import { initCalendar } from "./pages/calendar.js";
import { toast } from "./components/ui.js";
import { initProfile } from "./pages/profile.js";
import { initPageTransitions, initShell } from "./components/shell.js";
import { restoreSession } from "./services/authService.js";

initPageTransitions();

const pages = {
  landing: initAuth,
  dashboard: initDashboard,
  course: initCourses,
  "course-detail": initCourseDetail,
  tasks: initAllTasks,
  calendar: initCalendar,
  profile: initProfile,
  about: initShell,
};

try {
  await restoreSession();
  await pages[document.body.dataset.page]?.();
} catch (error) {
  if (document.body.dataset.page === "landing") initAuth();
  toast(error.message, {
    actionLabel: "Retry",
    onAction: () => location.reload(),
    duration: 60000,
  });
}
