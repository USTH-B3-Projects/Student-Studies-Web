import { pad, dateKey } from "../shared/calendar-time.js";

export function enhanceScheduleDateTime(input, label) {
  const root = input.closest("#calendarModalRoot");
  const picker = document.createElement("div");
  const datePanel = document.createElement("div");
  const timePanel = document.createElement("div");
  picker.className = "deadline-picker has-value";
  picker.tabIndex = 0;
  picker.setAttribute("role", "button");
  picker.setAttribute("aria-label", `Select ${label.toLowerCase()} date and time`);
  picker.innerHTML = `<span class="deadline-picker-calendar" aria-hidden="true">&#128197;</span><span class="deadline-picker-display"></span><span class="deadline-picker-chevron" aria-hidden="true">&rsaquo;</span>`;
  datePanel.className = "deadline-date-picker";
  datePanel.hidden = true;
  datePanel.innerHTML = `<strong>Select date</strong><div class="deadline-calendar-header"><span data-picker-month></span><div class="deadline-calendar-nav"><button type="button" data-picker-prev aria-label="Previous month">&lsaquo;</button><button type="button" data-picker-next aria-label="Next month">&rsaquo;</button></div></div><div class="deadline-calendar-weekdays" aria-hidden="true">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}</div><div class="deadline-calendar-grid" role="grid"></div><button type="button" class="btn btn-primary" data-picker-continue>Continue</button>`;
  timePanel.className = "deadline-time-picker";
  timePanel.hidden = true;
  timePanel.innerHTML = `<strong>Select time</strong><div class="deadline-time-controls"><label>Hour<select data-picker-hour>${Array.from({ length: 12 }, (_, index) => `<option>${index + 1}</option>`).join("")}</select></label><label>Minute<select data-picker-minute>${Array.from({ length: 60 }, (_, index) => `<option>${pad(index)}</option>`).join("")}</select></label><label>Period<select data-picker-period><option>AM</option><option>PM</option></select></label></div><button type="button" class="btn btn-primary" data-picker-done>Done</button>`;
  input.before(picker);
  picker.append(input);
  root.append(datePanel, timePanel);
  input.classList.add("deadline-picker-input");
  input.tabIndex = -1;

  const display = picker.querySelector(".deadline-picker-display");
  const grid = datePanel.querySelector(".deadline-calendar-grid");
  const monthLabel = datePanel.querySelector("[data-picker-month]");
  const hour = timePanel.querySelector("[data-picker-hour]");
  const minute = timePanel.querySelector("[data-picker-minute]");
  const period = timePanel.querySelector("[data-picker-period]");
  let selectedDate = input.value.slice(0, 10);
  let visibleMonth = new Date(`${selectedDate}T00:00:00`);
  visibleMonth.setDate(1);

  const position = (panel) => {
    const rect = picker.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 16);
    panel.style.width = `${width}px`;
    panel.style.left = `${Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)}px`;
    panel.style.maxHeight = `${window.innerHeight - 16}px`;
    panel.style.top = `${Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - panel.offsetHeight - 8))}px`;
  };
  const updateDisplay = () => {
    const value = new Date(input.value);
    display.textContent = `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(value)} · ${new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(value)}`;
  };
  const renderDates = () => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    monthLabel.textContent = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(visibleMonth);
    grid.innerHTML = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(year, month, index - firstDay + 1);
      const value = dateKey(date);
      return `<button type="button" class="deadline-calendar-day${date.getMonth() === month ? "" : " is-outside"}${value === selectedDate ? " is-selected" : ""}" data-picker-date="${value}" role="gridcell" aria-selected="${value === selectedDate}">${date.getDate()}</button>`;
    }).join("");
  };
  const openDate = () => {
    root.querySelectorAll(".deadline-date-picker, .deadline-time-picker").forEach((panel) => (panel.hidden = true));
    selectedDate = input.value.slice(0, 10);
    const selected = new Date(`${selectedDate}T00:00:00`);
    visibleMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
    renderDates();
    datePanel.hidden = false;
    position(datePanel);
  };
  const openTime = () => {
    const selected = new Date(input.value);
    hour.value = String(selected.getHours() % 12 || 12);
    minute.value = pad(selected.getMinutes());
    period.value = selected.getHours() >= 12 ? "PM" : "AM";
    timePanel.hidden = false;
    position(timePanel);
    hour.focus();
  };
  picker.onclick = openDate;
  picker.onkeydown = (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); openDate(); } };
  datePanel.onclick = (event) => {
    if (event.target.closest("[data-picker-prev]")) visibleMonth.setMonth(visibleMonth.getMonth() - 1);
    else if (event.target.closest("[data-picker-next]")) visibleMonth.setMonth(visibleMonth.getMonth() + 1);
    else if (event.target.closest("[data-picker-date]")) selectedDate = event.target.closest("[data-picker-date]").dataset.pickerDate;
    else if (event.target.closest("[data-picker-continue]")) { datePanel.hidden = true; return openTime(); }
    else return;
    renderDates();
  };
  timePanel.querySelector("[data-picker-done]").onclick = () => {
    let hours = Number(hour.value) % 12;
    if (period.value === "PM") hours += 12;
    input.value = `${selectedDate}T${pad(hours)}:${minute.value}`;
    updateDisplay();
    timePanel.hidden = true;
    picker.focus();
  };
  updateDisplay();
}

