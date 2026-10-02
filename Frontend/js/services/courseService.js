import * as apiClient from "./storageService.js";

/**
 * Create a new course.
 * @param {Object} courseData - { courseName, color }
 * @returns {Promise<Object>} Created course
 */
export async function createCourse(courseData) {
  const course = await apiClient.post("/courses", {
    courseName: courseData.courseName,
    color: courseData.color || null,
  });
  return course;
}

/**
 * Get all courses for the current user.
 * @returns {Promise<Array>} Array of courses
 */
export async function getCoursesByUserId() {
  const courses = await apiClient.get("/courses");
  return Array.isArray(courses) ? courses : [];
}

/**
 * Get a course by ID.
 * @param {string} courseId
 * @returns {Promise<Object|null>} Course or null if not found
 */
export async function getCourseById(courseId) {
  try {
    const course = await apiClient.get(`/courses/${courseId}`);
    return course || null;
  } catch (error) {
    if (error.status !== 404) throw error;
    return null;
  }
}

/**
 * Update a course.
 * @param {string} courseId
 * @param {Object} data - { courseName?, color? }
 * @returns {Promise<Object>} Updated course
 */
export async function updateCourse(courseId, data) {
  const course = await apiClient.put(`/courses/${courseId}`, data);
  return course;
}

/**
 * Delete a course and all its tasks.
 * @param {string} courseId
 * @returns {Promise<void>}
 */
export async function deleteCourse(courseId) {
  await apiClient.del(`/courses/${courseId}`);
}
