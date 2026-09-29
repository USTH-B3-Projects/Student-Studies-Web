import * as authService from "../services/authService.js";
import { $, toast } from "../shared/ui.js";
import { navigate } from "../shared/shell.js";

function wireAuth() {
  const googleButton = $("#googleLoginBtn");
  googleButton?.addEventListener("click", async () => {
    const error = googleButton.closest("form").querySelector(".form-error");
    error.textContent = "";
    googleButton.disabled = true;
    try {
      const [{ signInWithPopup }, { auth, googleProvider }] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"),
        import("../firebase.js"),
      ]);
      const { user } = await signInWithPopup(auth, googleProvider);
      authService.loginWithGoogle(user);
      navigate("dashboard.html", { replace: true });
    } catch (firebaseError) {
      error.textContent = firebaseError.code === "auth/popup-closed-by-user"
        ? "Google sign-in was cancelled."
        : "Unable to sign in with Google. Please try again.";
      googleButton.disabled = false;
    }
  });
  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    const input = document.getElementById(button.dataset.togglePassword);
    const show = () => { input.type = "text"; button.setAttribute("aria-pressed", "true"); };
    const hide = () => { input.type = "password"; button.setAttribute("aria-pressed", "false"); };
    button.addEventListener("pointerdown", (event) => { button.setPointerCapture(event.pointerId); show(); });
    button.addEventListener("pointerup", hide);
    button.addEventListener("pointercancel", hide);
    button.addEventListener("keydown", (event) => { if (event.key === " " || event.key === "Enter") show(); });
    button.addEventListener("keyup", hide);
    button.addEventListener("blur", hide);
  });
  document.querySelectorAll("#loginForm, #registerForm, #forgotForm").forEach((form) =>
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      if (form.id === "registerForm" && d.password !== d.confirmPassword) {
        form.querySelector(".form-error").textContent = "Passwords do not match";
        return;
      }
      if (form.id === "forgotForm" && d.newPassword !== d.confirmPassword) {
        form.querySelector(".form-error").textContent = "Passwords do not match";
        return;
      }
      let result = form.id === "loginForm"
        ? await authService.login(d.username, d.password)
        : form.id === "registerForm"
          ? await authService.register(d.studentName, d.username, d.password, d.confirmPassword)
          : await authService.resetPassword(d.username, d.newPassword, d.confirmPassword);
      if (result.success && form.id === "forgotForm") {
        form.reset();
        document.querySelector('.tab[data-auth-target="login"]').click();
        toast("Password updated");
        return;
      }
      if (result.success && form.id === "registerForm") {
        result = await authService.login(d.username, d.password);
      }
      if (!result.success) {
        form.querySelector(".form-error").textContent = result.error;
        return;
      }
      navigate("dashboard.html", { replace: true });
    }),
  );
}
function wireAuthTabs() {
  const card = $("#authCard");
  if (!card) return;
  const show = (name, scroll) => {
    card.querySelectorAll(".auth-form").forEach(
      (form) => (form.hidden = form.id !== `${name}Form`),
    );
    card.querySelectorAll(".tab").forEach((tab) => {
      const active = tab.dataset.authTarget === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active);
    });
    if (scroll) card.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  document.querySelectorAll("[data-auth-target]").forEach((control) =>
    control.addEventListener("click", (e) => {
      e.preventDefault();
      show(control.dataset.authTarget, control.hasAttribute("data-auth-scroll"));
    }),
  );
}

export function initAuth() {
  if (authService.getCurrentUser()) {
    navigate("dashboard.html", { replace: true });
    return;
  }
  wireAuthTabs();
  wireAuth();
}
