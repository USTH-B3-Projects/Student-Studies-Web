import * as apiClient from "./storageService.js";

const CURRENT_USER_KEY = "studyflow_current_user";

/**
 * Register a new student account.
 * @param {string} studentName - Student's display name
 * @param {string} username - Unique login identifier
 * @param {string} password - Account password
 * @param {string} confirmPassword - Password confirmation
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function register(studentName, username, password, confirmPassword) {
  try {
    await apiClient.post("/auth/register", {
      studentName,
      username,
      password,
      confirmPassword,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Login with username and password.
 * Stores the current user in localStorage (session only).
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function login(username, password) {
  const currentUser = getCurrentUser();
  if (currentUser) {
    return { success: false, error: "Log out before signing in with another account." };
  }
  try {
    const result = await apiClient.post("/auth/login", { username, password });
    // Store minimal user info in localStorage for session management
    localStorage.setItem(
      CURRENT_USER_KEY,
      JSON.stringify({ username, studentName: result.user.name })
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function loginWithGoogle(user) {
  localStorage.setItem(
    CURRENT_USER_KEY,
    JSON.stringify({
      username: user.email || user.uid,
      studentName: user.displayName || user.email || "Student",
    })
  );
}

/**
 * Reset password for an account.
 * @param {string} username
 * @param {string} newPassword
 * @param {string} confirmPassword
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function resetPassword(username, newPassword, confirmPassword) {
  try {
    await apiClient.post("/auth/reset", { username, newPassword, confirmPassword });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get the currently logged-in student.
 * @returns {Object|null} Student object or null if not logged in
 */
export function getCurrentUser() {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Logout the current student.
 */
export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
}
