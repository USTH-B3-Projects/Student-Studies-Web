import assert from "node:assert/strict";

globalThis.window = { location: { hostname: "localhost" } };
const { courseTaskTable, groupedTasks } = await import("./task-ui.js");

const course = { courseId: "course-1", courseName: "Deep Learning" };
const task = {
  taskId: "task-1",
  courseId: course.courseId,
  taskName: "Finish CNN lab",
  description: "Compare validation loss.",
  deadline: "2099-09-29T23:00:00",
  importance: "very-high",
  currentProgress: 25,
  completionStatus: "pending",
  isOverdue: false,
  remainingWorkload: 4.5,
  priorityScore: 97,
};
const selected = new Set();
const courseMarkup = courseTaskTable([task], null, selected, course);
const tasksMarkup = groupedTasks([task], [course], null, selected);
const sharedRow = courseMarkup.match(/<article[\s\S]*<\/article>/)?.[0];

assert.ok(sharedRow && tasksMarkup.includes(sharedRow), "Tasks and Course use the same task-row markup");
assert.match(tasksMarkup, /class="course-task-table"/);
assert.match(tasksMarkup, /class="task-row table-task-row/);
assert.match(tasksMarkup, /data-select="task-1"/);
assert.match(tasksMarkup, /data-task-toggle/);

const completedMarkup = courseTaskTable([{ ...task, currentProgress: 100, completionStatus: "completed", remainingWorkload: 0 }], null, selected, course);
assert.match(completedMarkup, /data-reopen="task-1"/);
assert.doesNotMatch(completedMarkup, /data-complete="task-1"/);

console.log("shared Tasks/Course task UI checks passed");
