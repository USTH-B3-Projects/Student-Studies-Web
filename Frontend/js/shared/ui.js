const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const fmtDate = (d) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(d),
  );
const fmtDateTime = (d) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));
const localDateTimeValue = (d) => {
  const date = new Date(d);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const dueLabel = (d) => {
  const deadline = new Date(d),
    now = new Date(),
    ms = deadline - now,
    days =
      (Date.UTC(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()) -
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      86400000;
  if (ms < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
};
const toast = (msg, { actionLabel, onAction, duration = actionLabel ? 6000 : 2600 } = {}) => {
  const e = document.createElement("div");
  e.className = "toast";
  const text = document.createElement("span");
  text.textContent = msg;
  e.append(text);
  if (actionLabel && onAction) {
    const action = document.createElement("button");
    action.type = "button";
    action.textContent = actionLabel;
    action.onclick = async () => {
      clearTimeout(timer);
      action.disabled = true;
      try { await onAction(); e.remove(); }
      catch { action.disabled = false; }
    };
    e.append(action);
  }
  document.body.append(e);
  const timer = setTimeout(() => e.remove(), duration);
  return e;
};

const elementFromHTML = (html) => {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
};

const reconcileTaskRows = (container, tasks, renderRow, changedIds = new Set()) => {
  const wanted = new Set(tasks.map((task) => task.taskId));
  [...container.querySelectorAll(":scope > [data-task-id]")].forEach((row) => {
    if (!wanted.has(row.dataset.taskId)) row.remove();
  });
  tasks.forEach((task, index) => {
    const rows = [...container.querySelectorAll(":scope > [data-task-id]")];
    let row = rows.find((item) => item.dataset.taskId === task.taskId);
    if (!row || changedIds.has(task.taskId)) {
      const rendered = renderRow(task);
      const replacement = typeof rendered === "string" ? elementFromHTML(rendered) : rendered;
      row?.replaceWith(replacement);
      row = replacement;
    }
    const current = [...container.querySelectorAll(":scope > [data-task-id]")][index];
    if (current !== row) container.insertBefore(row, current || null);
  });
};

export { $, esc, fmtDate, fmtDateTime, localDateTimeValue, dueLabel, toast, reconcileTaskRows };
