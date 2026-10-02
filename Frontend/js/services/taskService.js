import * as apiClient from "./storageService.js";

export const TASKS_CHANGED_EVENT = "studyflow:tasks-changed";

function publishTaskChanges(tasks) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT, {
    detail: { tasks, changedIds: tasks.map((task) => task.taskId) },
  }));
}

/**
 * Create a new task.
 * @param {Object} taskData - { courseId, taskName, description, deadline, importance, estimatedDuration, currentProgress }
 * @returns {Promise<Object>} Created task
 */
export async function createTask(taskData) {
  const task = await apiClient.post("/tasks", {
    courseId: taskData.courseId,
    taskName: taskData.taskName || taskData.name, // Handle both old and new field names
    description: taskData.description || "",
    deadline: taskData.deadline,
    importance: taskData.importance || "medium",
    estimatedDuration: taskData.estimatedDuration ?? null,
    currentProgress: taskData.currentProgress || 0,
  });
  return task;
}

/**
 * Get all tasks for the current user (across all courses).
 * @returns {Promise<Array>} Array of tasks
 */
export async function getTasksByUserId() {
  const tasks = await apiClient.get("/tasks");
  return Array.isArray(tasks) ? tasks : [];
}

/**
 * Get all tasks for a specific course.
 * @param {string} courseId
 * @returns {Promise<Array>} Array of tasks
 */
export async function getTasksByCourseId(courseId) {
  const tasks = await apiClient.get(`/tasks?courseId=${encodeURIComponent(courseId)}`);
  return Array.isArray(tasks) ? tasks : [];
}

/**
 * Calculate overall progress percentage.
 * @param {Array} tasks
 * @returns {number} Progress percentage 0-100
 */
export function getProgress(tasks) {
  return tasks.length
    ? Math.round(
        tasks.reduce((sum, task) => sum + Number(task.currentProgress || 0), 0) /
          tasks.length
      )
    : 0;
}

/**
 * Get a task by ID.
 * @param {string} taskId
 * @returns {Promise<Object|null>} Task or null if not found
 */
export async function getTaskById(taskId) {
  try {
    const task = await apiClient.get(`/tasks/${taskId}`);
    return task || null;
  } catch (error) {
    if (error.status !== 404) throw error;
    return null;
  }
}

/**
 * Update a task.
 * @param {string} taskId
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated task
 */
export async function updateTask(taskId, data) {
  // Map old field names to new ones
  const mappedData = { ...data };
  if (mappedData.name && !mappedData.taskName) {
    mappedData.taskName = mappedData.name;
    delete mappedData.name;
  }
  delete mappedData.userId;
  delete mappedData.username;

  const task = await apiClient.put(`/tasks/${taskId}`, mappedData);
  return task;
}

/**
 * Delete a task.
 * @param {string} taskId
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId) {
  await apiClient.del(`/tasks/${taskId}`);
}

/**
 * Update task progress.
 * @param {string} taskId
 * @param {number} currentProgress - 0, 25, 50, 75, or 100
 * @returns {Promise<Object>} Updated task
 */
export async function updateTaskProgress(taskId, currentProgress) {
  const task = await updateTask(taskId, { currentProgress });
  return task;
}

async function changeTaskCompletion(taskId, completed) {
  return apiClient.patch(`/tasks/${taskId}/completion`, { completed });
}

export async function setTaskCompletion(taskId, completed) {
  const task = await changeTaskCompletion(taskId, completed);
  publishTaskChanges([task]);
  return task;
}

export async function setTaskCompletions(taskIds, completed) {
  const results = await Promise.allSettled(taskIds.map((taskId) => changeTaskCompletion(taskId, completed)));
  const successful = [], failed = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") successful.push(result.value);
    else failed.push({ taskId: taskIds[index], error: result.reason });
  });
  if (successful.length) publishTaskChanges(successful);
  return { successful, failed };
}

/**
 * Update the display order of tasks.
 * @param {Array<string>} taskIds - Task IDs in desired order
 * @returns {Promise<void>}
 */
export async function updateDisplayOrder(taskIds) {
  // This endpoint may not be used in the current API; kept for compatibility
  // The UI maintains local order via DOM manipulation
}

/**
 * Get overdue tasks for the current user.
 * @returns {Promise<Array>} Array of overdue tasks
 */
export async function getOverdueTasks() {
  const tasks = await getTasksByUserId();
  const now = new Date();
  return tasks.filter((task) => {
    const isNotCompleted = Number(task.currentProgress) !== 100;
    const isPastDeadline = new Date(task.deadline) < now;
    return isNotCompleted && isPastDeadline;
  });
}

// Aliases used by app.js
export const create = createTask;
export const list = getTasksByCourseId;
export const update = updateTask;
export const remove = deleteTask;
export const setProgress = updateTaskProgress;
