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
const toast = (msg) => {
  const e = document.createElement("div");
  e.className = "toast";
  e.textContent = msg;
  document.body.append(e);
  setTimeout(() => e.remove(), 2600);
};

export { $, esc, fmtDate, fmtDateTime, localDateTimeValue, dueLabel, toast };
