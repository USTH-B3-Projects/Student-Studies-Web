import * as apiClient from "./storageService.js";
import { getCurrentUser } from "./authService.js";

/**
 * Create a new task.
 * @param {Object} taskData - { courseId, taskName, description, deadline, importance, estimatedDuration, currentProgress }
 * @returns {Promise<Object>} Created task
 */
export async function createTask(taskData) {
  const user = getCurrentUser();
  if (!user) throw new Error("Not logged in");

  const task = await apiClient.post("/tasks", {
    username: user.username,
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
  const user = getCurrentUser();
  if (!user) throw new Error("Not logged in");

  const tasks = await apiClient.get(
    `/tasks?username=${encodeURIComponent(user.username)}`
  );
  return Array.isArray(tasks) ? tasks : [];
}

/**
 * Get all tasks for a specific course.
 * @param {string} courseId
 * @returns {Promise<Array>} Array of tasks
 */
export async function getTasksByCourseId(courseId) {
  const user = getCurrentUser();
  if (!user) throw new Error("Not logged in");

  const tasks = await apiClient.get(
    `/tasks?courseId=${encodeURIComponent(courseId)}&username=${encodeURIComponent(user.username)}`
  );
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
  const user = getCurrentUser();
  if (!user) throw new Error("Not logged in");

  try {
    const task = await apiClient.get(
      `/tasks/${taskId}?username=${encodeURIComponent(user.username)}`
    );
    return task || null;
  } catch {
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
  if (mappedData.userId && !mappedData.username) {
    mappedData.username = mappedData.userId;
    delete mappedData.userId;
  }

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

/**
 * Mark a task as completed.
 * @param {string} taskId
 * @returns {Promise<Object>} Updated task
 */
export async function markTaskCompleted(taskId) {
  return updateTaskProgress(taskId, 100);
}

/**
 * Toggle task completion through the progress contract.
 * @param {string} taskId
 * @returns {Promise<Object>} Updated task
 */
export async function toggleTaskCompleted(taskId) {
  const task = await getTaskById(taskId);
  if (!task) throw new Error("Task not found");

  return updateTaskProgress(taskId, Number(task.currentProgress) === 100 ? 0 : 100);
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
export const markCompleted = markTaskCompleted;
export const toggleCompleted = toggleTaskCompleted;
