import * as courseService from "../services/courseService.js";
import * as taskService from "../services/taskService.js";
import { $, esc, toast } from "../shared/ui.js";
import { modal } from "../components/modal.js";
import { addCourse, courseForm } from "../components/task-ui.js";
import { initShell } from "../shared/shell.js";

const COURSES_PER_PAGE = 6;
const paginateCourses = (courses, requestedPage) => {
  const pageCount = Math.max(1, Math.ceil(courses.length / COURSES_PER_PAGE));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  return { page, pageCount, courses: courses.slice((page - 1) * COURSES_PER_PAGE, page * COURSES_PER_PAGE) };
};

function initCourseManagement(u) {
  const main = document.querySelector(".course-main");
  let query = "", statusFilter = "all", sort = "name", page = 1, openMenuCourseId = null, view = localStorage.getItem("studyflow_course_view") === "list" ? "list" : "grid";
  main.innerHTML = `<section class="course-management-head" aria-labelledby="coursesTitle"><div><img class="course-rays" src="../source/studyflow-decoration-pack/accent-rays-yellow.png" alt="" aria-hidden="true"><h1 id="coursesTitle">My Courses</h1><p>Manage your courses and keep your study organized.</p></div><button id="addCourseBtn" class="btn btn-primary"><span aria-hidden="true">+</span> Add course</button></section><section class="course-toolbar" aria-label="Course controls"><label class="course-search"><span aria-hidden="true">⌕</span><span class="sr-only">Search courses</span><input id="courseSearch" class="input" type="search" placeholder="Search courses..."></label><label><span class="sr-only">Filter by status</span><select id="courseStatus" class="select"><option value="all">All Status</option><option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="completed">Completed</option></select></label><label><span class="sr-only">Sort courses</span><select id="courseSort" class="select"><option value="name">Sort by: Name</option><option value="progress-desc">Progress: High to low</option><option value="progress-asc">Progress: Low to high</option></select></label><div class="view-toggle" role="group" aria-label="Course view"><button type="button" data-view="grid" aria-label="Grid view">▦ <span>Grid</span></button><button type="button" data-view="list" aria-label="List view">☷ <span>List</span></button></div></section><p id="courseResultCount" class="course-result-count" aria-live="polite"></p><section id="managedCourseGrid" class="course-grid management-grid"></section>`;
  main.insertAdjacentHTML("beforeend", '<nav id="coursePagination" class="course-pagination" aria-label="Course pages" hidden></nav>');
  const grid = $("#managedCourseGrid"), closeCourseMenu = () => {
    grid.querySelectorAll(".course-menu[open]").forEach((menu) => menu.removeAttribute("open"));
    openMenuCourseId = null;
  };
  grid.addEventListener("click", (event) => {
    if (!grid.classList.contains("list-view")) return;
    const summary = event.target.closest(".course-menu summary");
    if (summary) {
      event.preventDefault();
      const menu = summary.parentElement, courseId = menu.dataset.courseMenu, opening = openMenuCourseId !== courseId;
      closeCourseMenu();
      if (opening) { menu.open = true; openMenuCourseId = courseId; }
    } else if (event.target.closest(".course-menu button") || !event.target.closest(".course-menu")) closeCourseMenu();
  });
  document.addEventListener("click", (event) => { if (grid.classList.contains("list-view") && !grid.contains(event.target)) closeCourseMenu(); });
  const statusOf = (progress, total, completed) => total === 0 || progress === 0 && completed === 0 ? ["not-started", "Not Started"] : completed === total ? ["completed", "Completed"] : ["in-progress", "In Progress"];
  const render = async () => {
    try {
      const courses = await courseService.getCoursesByUserId(), 
        tasks = await taskService.getTasksByUserId() ?? [];
      let visible = courses.map((course) => {
        const courseTasks = tasks.filter((task) => task.courseId === course.courseId), 
          completed = courseTasks.filter((task) => Boolean(Number(task.completed))).length,
          progress = taskService.getProgress(courseTasks);
        return { course, courseTasks, completed, progress, status: statusOf(progress, courseTasks.length, completed) };
      }).filter(({ course, status }) => course.courseName.toLowerCase().includes(query) && (statusFilter === "all" || status[0] === statusFilter)).sort((a, b) => sort === "name" ? a.course.courseName.localeCompare(b.course.courseName) : sort === "progress-desc" ? b.progress - a.progress : a.progress - b.progress);
      const totalVisible = visible.length, pagination = paginateCourses(visible, page);
      page = pagination.page;
      visible = pagination.courses;
      openMenuCourseId = null;
      grid.className = `course-grid management-grid ${view}-view`;
      $("#courseResultCount").textContent = totalVisible ? `Showing ${(page - 1) * COURSES_PER_PAGE + 1}–${Math.min(page * COURSES_PER_PAGE, totalVisible)} of ${totalVisible} ${totalVisible === 1 ? "course" : "courses"}` : courses.length ? `Showing 0 of ${courses.length} courses` : "";
      grid.innerHTML = visible.length ? visible.map(({ course, courseTasks, completed, progress, status }) => `<article class="card course-card management-card status-${status[0]}" style="--course-color:${course.color || "var(--blue)"}"><div class="course-status"><span class="status-dot"></span>${status[1]}<details class="course-menu" data-course-menu="${course.courseId}"><summary aria-label="Course actions">&bull;&bull;&bull;</summary><div><button data-edit-course="${course.courseId}">Edit course</button><button class="danger" data-delete-course="${course.courseId}">Delete course</button></div></details></div><div class="course-card-main"><span class="course-initial" aria-hidden="true">${esc(course.courseName.slice(0, 1).toUpperCase())}</span><div class="course-card-content"><a class="course-card-title" href="course-detail.html?courseId=${encodeURIComponent(course.courseId)}" aria-label="View ${esc(course.courseName)}"><h3>${esc(course.courseName)}</h3><small>${courseTasks.length} ${courseTasks.length === 1 ? "task" : "tasks"}</small></a><div class="course-progress-inline"><div class="progress" aria-label="${progress}% complete"><span style="width:${progress}%;background:${course.color || "var(--blue)"}"></span></div><strong>${progress}%</strong></div><div class="course-counts"><span>${completed} completed</span><span>${courseTasks.length - completed} remaining</span></div></div><a class="course-card-arrow" href="course-detail.html?courseId=${encodeURIComponent(course.courseId)}" aria-label="View ${esc(course.courseName)}">›</a></div><div class="management-actions"><a class="btn btn-outline view-course" href="course-detail.html?courseId=${encodeURIComponent(course.courseId)}">Open course →</a></div></article>`).join("") : courses.length ? `<div class="empty course-empty-state"><img src="../source/studyflow-mascot-pack/cat-thinking.png" alt="StudyFlow cat thinking"><h3>No matching courses</h3><p>Try another search or status.</p></div>` : `<div class="empty course-empty-state"><img src="../source/studyflow-mascot-pack/cat-reading.png" alt="StudyFlow cat reading"><h3>No courses yet</h3><p>Add your first course and start organizing your study.</p><button class="btn btn-primary" data-add-course>+ Add course</button></div>`;
      const paginationNav = $("#coursePagination");
      paginationNav.hidden = totalVisible <= COURSES_PER_PAGE;
      paginationNav.innerHTML = paginationNav.hidden ? "" : `<button type="button" data-page="${page - 1}" aria-label="Previous page" ${page === 1 ? "disabled" : ""}>&lsaquo;</button>${Array.from({ length: pagination.pageCount }, (_, index) => `<button type="button" data-page="${index + 1}" ${page === index + 1 ? 'class="active" aria-current="page"' : ""}>${index + 1}</button>`).join("")}<button type="button" data-page="${page + 1}" aria-label="Next page" ${page === pagination.pageCount ? "disabled" : ""}>&rsaquo;</button>`;
      paginationNav.querySelectorAll("[data-page]").forEach((button) => button.onclick = () => { page = Number(button.dataset.page); render(); });
      document.querySelectorAll("[data-edit-course]").forEach((button) => button.onclick = async () => {
        const course = courses.find((item) => item.courseId === button.dataset.editCourse);
        modal("Edit course", courseForm(course), async (data, close) => {
          try {
            await courseService.updateCourse(course.courseId, { courseName: data.get("courseName"), color: data.get("color") });
            close(); 
            await render(); 
            toast("Course updated");
          } catch (error) { 
            toast(error.message); 
          }
        });
      });
      document.querySelectorAll("[data-delete-course]").forEach((button) => button.onclick = async () => {
        if (confirm("Delete course and all its tasks?")) {
          try {
            await courseService.deleteCourse(button.dataset.deleteCourse);
            await render(); 
            toast("Course deleted");
          } catch (error) {
            toast(error.message);
          }
        }
      });
      $("[data-add-course]")?.addEventListener("click", openAddCourse);
    } catch (error) {
      toast(error.message);
    }
  };
  const openAddCourse = () => addCourse(render);
  $("#addCourseBtn").onclick = openAddCourse;
  $("#courseSearch").oninput = (event) => { query = event.target.value.trim().toLowerCase(); page = 1; render(); };
  $("#courseStatus").onchange = (event) => { statusFilter = event.target.value; page = 1; render(); };
  $("#courseSort").onchange = (event) => { sort = event.target.value; page = 1; render(); };
  document.querySelectorAll("[data-view]").forEach((button) => button.onclick = () => { view = button.dataset.view; localStorage.setItem("studyflow_course_view", view); document.querySelectorAll("[data-view]").forEach((item) => { const active = item.dataset.view === view; item.classList.toggle("active", active); item.setAttribute("aria-pressed", active); }); render(); });
  document.querySelector(`[data-view="${view}"]`).click();
}

function initCourses() {
  const u = initShell();
  if (u) initCourseManagement(u);
}

export { initCourses, paginateCourses };
