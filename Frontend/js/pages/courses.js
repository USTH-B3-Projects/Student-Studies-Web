import * as courseService from "../services/courseService.js";
import * as taskService from "../services/taskService.js";
import { $, esc, toast } from "../shared/ui.js";
import { modal } from "../components/modal.js";
import { courseForm } from "../components/task-ui.js";
import { initShell } from "../shared/shell.js";

function initCourseManagement(u) {
  const main = document.querySelector(".course-main");
  let query = "", statusFilter = "all", sort = "name", view = localStorage.getItem("studyflow_course_view") === "list" ? "list" : "grid";
  main.innerHTML = `<section class="course-management-head" aria-labelledby="coursesTitle"><div><img class="course-rays" src="../source/studyflow-decoration-pack/accent-rays-yellow.png" alt="" aria-hidden="true"><h1 id="coursesTitle">My Courses</h1><p>Manage your courses and keep your study organized.</p></div><button id="addCourseBtn" class="btn btn-primary"><span aria-hidden="true">+</span> Add course</button></section><section class="course-toolbar" aria-label="Course controls"><label class="course-search"><span aria-hidden="true">⌕</span><span class="sr-only">Search courses</span><input id="courseSearch" class="input" type="search" placeholder="Search courses..."></label><label><span class="sr-only">Filter by status</span><select id="courseStatus" class="select"><option value="all">All Status</option><option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="completed">Completed</option></select></label><label><span class="sr-only">Sort courses</span><select id="courseSort" class="select"><option value="name">Sort by: Name</option><option value="progress-desc">Progress: High to low</option><option value="progress-asc">Progress: Low to high</option></select></label><div class="view-toggle" role="group" aria-label="Course view"><button type="button" data-view="grid" aria-label="Grid view">▦ <span>Grid</span></button><button type="button" data-view="list" aria-label="List view">☷ <span>List</span></button></div></section><p id="courseResultCount" class="course-result-count" aria-live="polite"></p><section id="managedCourseGrid" class="course-grid management-grid"></section>`;
  const statusOf = (progress, total, completed) => total === 0 || progress === 0 && completed === 0 ? ["not-started", "Not Started"] : completed === total ? ["completed", "Completed"] : ["in-progress", "In Progress"];
  const render = async () => {
    try {
      const courses = await courseService.getCoursesByUserId(), 
        tasks = await taskService.getTasksByUserId() ?? [];
      const visible = courses.map((course) => {
        const courseTasks = tasks.filter((task) => task.courseId === course.courseId), 
          completed = courseTasks.filter((task) => Boolean(Number(task.completed))).length,
          progress = taskService.getProgress(courseTasks);
        return { course, courseTasks, completed, progress, status: statusOf(progress, courseTasks.length, completed) };
      }).filter(({ course, status }) => course.courseName.toLowerCase().includes(query) && (statusFilter === "all" || status[0] === statusFilter)).sort((a, b) => sort === "name" ? a.course.courseName.localeCompare(b.course.courseName) : sort === "progress-desc" ? b.progress - a.progress : a.progress - b.progress);
      const grid = $("#managedCourseGrid");
      grid.className = `course-grid management-grid ${view}-view`;
      $("#courseResultCount").textContent = courses.length ? `Showing ${visible.length} of ${courses.length} ${courses.length === 1 ? "course" : "courses"}` : "";
      grid.innerHTML = visible.length ? visible.map(({ course, courseTasks, completed, progress, status }) => `<article class="card course-card management-card status-${status[0]}" style="--course-color:${course.color || "var(--blue)"}"><div class="course-status"><span class="status-dot"></span>${status[1]}<details class="course-menu"><summary aria-label="Course actions">&bull;&bull;&bull;</summary><div><button data-edit-course="${course.courseId}">Edit course</button><button class="danger" data-delete-course="${course.courseId}">Delete course</button></div></details></div><div class="course-card-main"><span class="course-initial" aria-hidden="true">${esc(course.courseName.slice(0, 1).toUpperCase())}</span><div class="course-card-content"><a class="course-card-title" href="course-detail.html?courseId=${encodeURIComponent(course.courseId)}" aria-label="View ${esc(course.courseName)}"><h3>${esc(course.courseName)}</h3><small>${courseTasks.length} ${courseTasks.length === 1 ? "task" : "tasks"}</small></a><div class="course-progress-inline"><div class="progress" aria-label="${progress}% complete"><span style="width:${progress}%;background:${course.color || "var(--blue)"}"></span></div><strong>${progress}%</strong></div><div class="course-counts"><span>${completed} completed</span><span>${courseTasks.length - completed} remaining</span></div></div><a class="course-card-arrow" href="course-detail.html?courseId=${encodeURIComponent(course.courseId)}" aria-label="View ${esc(course.courseName)}">›</a></div><div class="management-actions"><a class="btn btn-outline view-course" href="course-detail.html?courseId=${encodeURIComponent(course.courseId)}">Open course →</a></div></article>`).join("") : courses.length ? `<div class="empty course-empty-state"><img src="../source/studyflow-mascot-pack/cat-thinking.png" alt="StudyFlow cat thinking"><h3>No matching courses</h3><p>Try another search or status.</p></div>` : `<div class="empty course-empty-state"><img src="../source/studyflow-mascot-pack/cat-reading.png" alt="StudyFlow cat reading"><h3>No courses yet</h3><p>Add your first course and start organizing your study.</p><button class="btn btn-primary" data-add-course>+ Add course</button></div>`;
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
      $("[data-add-course]")?.addEventListener("click", addCourse);
    } catch (error) {
      toast(error.message);
    }
  };
  const addCourse = async () => modal("Add course", courseForm(), async (data, close) => {
    try {
      await courseService.createCourse({ courseName: data.get("courseName"), color: data.get("color") });
      close(); 
      await render(); 
      toast("Course added");
    } catch (error) { 
      toast(error.message); 
    }
  });
  $("#addCourseBtn").onclick = addCourse;
  $("#courseSearch").oninput = (event) => { query = event.target.value.trim().toLowerCase(); render(); };
  $("#courseStatus").onchange = (event) => { statusFilter = event.target.value; render(); };
  $("#courseSort").onchange = (event) => { sort = event.target.value; render(); };
  document.querySelectorAll("[data-view]").forEach((button) => button.onclick = () => { view = button.dataset.view; localStorage.setItem("studyflow_course_view", view); document.querySelectorAll("[data-view]").forEach((item) => { const active = item.dataset.view === view; item.classList.toggle("active", active); item.setAttribute("aria-pressed", active); }); render(); });
  document.querySelector(`[data-view="${view}"]`).click();
}

function initCourses() {
  const u = initShell();
  if (u) initCourseManagement(u);
}

export { initCourses };
