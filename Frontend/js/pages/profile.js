import * as authService from "../services/authService.js";
import { initShell } from "../shared/shell.js";

const initials = (name) => name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

export function initProfile() {
  let user = initShell();
  if (!user) return;
  const form = document.querySelector("#profileForm");
  const render = () => {
    const name = user.studentName || user.username;
    document.querySelector("#profileAvatar").textContent = initials(name);
    document.querySelector("#profileName").textContent = name;
    document.querySelector("#profileUsername").textContent = `@${user.username}`;
    document.querySelector("#profileNameCopy").textContent = name;
    document.querySelector("#profileUsernameCopy").textContent = user.username;
    document.querySelector("#profileEmail").textContent = user.email || "Not provided";
    form.elements.studentName.value = name;
    form.elements.username.value = user.username;
    form.elements.email.value = user.email || "";
  };
  render();

  document.querySelector("#editProfileBtn").onclick = () => {
    form.hidden = false;
    document.querySelector("#editProfileBtn").hidden = true;
    form.elements.studentName.focus();
  };
  document.querySelector("#cancelProfileEdit").onclick = () => {
    form.hidden = true;
    document.querySelector("#editProfileBtn").hidden = false;
    render();
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    if (!authService.updateCurrentUser({ studentName: form.elements.studentName.value, email: form.elements.email.value })) return;
    user = authService.getCurrentUser();
    location.reload();
  };
}
