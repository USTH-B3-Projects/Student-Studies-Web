import * as apiClient from "./storageService.js";

let currentUser = null;

export async function restoreSession() {
  try {
    const result = await apiClient.get("/auth/me");
    currentUser = result.user;
  } catch (error) {
    if (error.status !== 401) throw error;
    currentUser = null;
  }
  return currentUser;
}

export async function register(studentName, username, password, confirmPassword, email = "") {
  try {
    await apiClient.post("/auth/register", { studentName, username, password, confirmPassword, email });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function login(username, password) {
  if (currentUser) return { success: false, error: "Log out before signing in with another account." };
  try {
    await apiClient.post("/auth/login", { username, password });
    if (!await restoreSession()) throw new Error("Unable to establish the authenticated session.");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function loginWithGoogle(user) {
  const idToken = await user.getIdToken();
  await apiClient.post("/auth/google", { idToken });
  const applicationUser = await restoreSession();
  if (!applicationUser) throw new Error("Unable to establish the authenticated session.");
  return applicationUser;
}

export async function resetPassword(username, newPassword, confirmPassword) {
  try {
    await apiClient.post("/auth/reset", { username, newPassword, confirmPassword });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function getCurrentUser() {
  return currentUser;
}

export async function updateCurrentUser({ studentName, email }) {
  const name = studentName?.trim();
  if (!currentUser || !name) return false;
  const result = await apiClient.patch("/auth/me", { studentName: name, email: email?.trim() || "" });
  currentUser = result.user;
  return true;
}

export async function logout() {
  try {
    await apiClient.post("/auth/logout", {});
  } finally {
    currentUser = null;
    try {
      const [{ signOut }, { auth }] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"),
        import("../firebase.js"),
      ]);
      if (auth.currentUser) await signOut(auth);
    } catch {}
  }
}
