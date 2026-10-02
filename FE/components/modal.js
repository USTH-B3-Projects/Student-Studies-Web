import { $, esc } from "../components/ui.js";

function modal(title, body, onSubmit) {
  const root = $("#modalRoot");
  const isTask = body.includes("task-modal-form");
  root.innerHTML = `<div class="modal-backdrop open"><div class="modal card ${isTask ? "task-modal" : ""}">${isTask ? `<header class="task-modal-header"><span class="task-modal-plus" aria-hidden="true">+</span><div class="task-modal-title"><h2>${title === "Add task" ? "Create a new task" : title}</h2><p>${title === "Add task" ? "Add the details below to plan your task and stay on track." : "Update the details for this task."}</p></div><div class="task-modal-art" aria-hidden="true"><img src="../assets/studyflow-note/task_1.png" alt=""><img src="../assets/studyflow-note/small_step_big_progress.png" alt=""></div><button type="button" class="task-modal-close" data-close aria-label="Close modal">&times;</button></header>` : `<h2>${title}</h2>`}${body}</div></div>`;
  const close = () => (root.innerHTML = "");
  root.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", close));
  const duration = root.querySelector("[data-duration-select]");
  const customDuration = root.querySelector("[data-custom-duration]");
  const enhanceSelect = (select) => {
    const picker = document.createElement("div");
    const trigger = document.createElement("button");
    const options = document.createElement("div");
    picker.className = "ui-select-picker";
    trigger.type = "button";
    trigger.className = "ui-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    options.className = "ui-select-options";
    options.setAttribute("role", "listbox");
    options.hidden = true;
    options.innerHTML = [...select.options].map((option) => `<button type="button" role="option" data-select-value="${option.value}" aria-selected="${option.selected}"><span>${option.textContent}</span></button>`).join("");
    select.before(picker);
    picker.append(select, trigger);
    root.append(options);
    select.classList.add("ui-native-select");
    const closeOptions = () => {
      options.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    };
    const sync = () => {
      trigger.innerHTML = `<span>${select.selectedOptions[0].textContent}</span><span aria-hidden="true">⌄</span>`;
      options.querySelectorAll("[data-select-value]").forEach((option) => option.setAttribute("aria-selected", option.dataset.selectValue === select.value));
    };
    trigger.addEventListener("click", () => {
      const opening = options.hidden;
      root.querySelectorAll(".ui-select-options:not([hidden])").forEach((menu) => (menu.hidden = true));
      root.querySelectorAll('.ui-select-trigger[aria-expanded="true"]').forEach((button) => button.setAttribute("aria-expanded", "false"));
      if (!opening) return;
      const rect = trigger.getBoundingClientRect();
      options.style.width = `${rect.width}px`;
      options.style.left = `${rect.left}px`;
      options.hidden = false;
      options.style.maxHeight = `${Math.max(160, Math.min(390, window.innerHeight - 32))}px`;
      const menuHeight = options.offsetHeight;
      const top = rect.bottom + 8 + menuHeight <= window.innerHeight ? rect.bottom + 8 : Math.max(8, rect.top - menuHeight - 8);
      options.style.top = `${top}px`;
      trigger.setAttribute("aria-expanded", "true");
      options.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    });
    options.addEventListener("click", (event) => {
      const option = event.target.closest("[data-select-value]");
      if (!option) return;
      select.value = option.dataset.selectValue;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      closeOptions();
      if (select.value !== "custom") trigger.focus();
    });
    select.addEventListener("change", sync);
    root.addEventListener("click", (event) => {
      if (!picker.contains(event.target) && !options.contains(event.target)) closeOptions();
    });
    sync();
    return { trigger, close: closeOptions, sync };
  };
  if (duration) enhanceSelect(duration);
  const pickerOnly = root.querySelector('input[type="datetime-local"][name="deadline"]');
  if (pickerOnly) {
    const picker = document.createElement("div");
    const display = document.createElement("span");
    const icon = document.createElement("span");
    const chevron = document.createElement("span");
    const datePicker = document.createElement("div");
    const timePicker = document.createElement("div");
    picker.className = "deadline-picker";
    display.className = "deadline-picker-display";
    icon.className = "deadline-picker-calendar";
    icon.textContent = "📅";
    chevron.className = "deadline-picker-chevron";
    chevron.textContent = "›";
    icon.setAttribute("aria-hidden", "true");
    chevron.setAttribute("aria-hidden", "true");
    datePicker.className = "deadline-date-picker";
    datePicker.hidden = true;
    datePicker.innerHTML = `<strong>Select date</strong><div class="deadline-calendar-header"><span data-deadline-month></span><div class="deadline-calendar-nav"><button type="button" data-deadline-prev aria-label="Previous month">&lsaquo;</button><button type="button" data-deadline-next aria-label="Next month">&rsaquo;</button></div></div><div class="deadline-calendar-weekdays" aria-hidden="true">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}</div><div class="deadline-calendar-grid" role="grid"></div><button type="button" class="btn btn-primary" data-deadline-continue disabled>Continue</button>`;
    timePicker.className = "deadline-time-picker";
    timePicker.hidden = true;
    timePicker.innerHTML = `<strong>Select time</strong><div class="deadline-time-controls"><label>Hour<select data-deadline-hour>${Array.from({ length: 12 }, (_, i) => `<option>${i + 1}</option>`).join("")}</select></label><label>Minute<select data-deadline-minute>${Array.from({ length: 60 }, (_, i) => `<option>${String(i).padStart(2, "0")}</option>`).join("")}</select></label><label>Period<select data-deadline-period><option>AM</option><option>PM</option></select></label></div><button type="button" class="btn btn-primary" data-deadline-done>Done</button>`;
    pickerOnly.before(picker);
    picker.append(pickerOnly, icon, display, chevron);
    root.append(datePicker, timePicker);
    pickerOnly.classList.add("deadline-picker-input");
    pickerOnly.tabIndex = -1;
    const updateDeadlineDisplay = () => {
      picker.classList.toggle("has-value", Boolean(pickerOnly.value));
      if (!pickerOnly.value) return (display.textContent = "Select a deadline");
      const deadline = new Date(pickerOnly.value);
      const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(deadline);
      const time = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(deadline);
      display.textContent = `${date} · ${time}`;
    };
    const hour = timePicker.querySelector("[data-deadline-hour]");
    const minute = timePicker.querySelector("[data-deadline-minute]");
    const period = timePicker.querySelector("[data-deadline-period]");
    const hourPicker = enhanceSelect(hour);
    const minutePicker = enhanceSelect(minute);
    const periodPicker = enhanceSelect(period);
    const monthLabel = datePicker.querySelector("[data-deadline-month]");
    const calendarGrid = datePicker.querySelector(".deadline-calendar-grid");
    const continueButton = datePicker.querySelector("[data-deadline-continue]");
    let selectedDate = pickerOnly.value.slice(0, 10);
    let visibleMonth = selectedDate ? new Date(`${selectedDate}T00:00`) : new Date();
    visibleMonth.setDate(1);
    const positionPanel = (panel) => {
      const rect = picker.getBoundingClientRect();
      const width = Math.min(340, window.innerWidth - 16);
      panel.style.width = `${width}px`;
      panel.style.left = `${Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)}px`;
      panel.style.maxHeight = `${window.innerHeight - 16}px`;
      const panelHeight = panel.offsetHeight;
      const top = rect.bottom + 8 + panelHeight <= window.innerHeight ? rect.bottom + 8 : Math.max(8, rect.top - panelHeight - 8);
      panel.style.top = `${top}px`;
    };
    const dateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const renderCalendar = () => {
      const year = visibleMonth.getFullYear();
      const month = visibleMonth.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      monthLabel.textContent = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(visibleMonth);
      calendarGrid.innerHTML = Array.from({ length: 42 }, (_, index) => {
        const date = new Date(year, month, index - firstDay + 1);
        const value = dateValue(date);
        return `<button type="button" class="deadline-calendar-day${date.getMonth() === month ? "" : " is-outside"}${value === selectedDate ? " is-selected" : ""}" data-deadline-date="${value}" role="gridcell" aria-selected="${value === selectedDate}">${date.getDate()}</button>`;
      }).join("");
      continueButton.disabled = !selectedDate;
    };
    const openDatePicker = () => {
      selectedDate = pickerOnly.value.slice(0, 10) || selectedDate;
      const selected = selectedDate ? new Date(`${selectedDate}T00:00`) : new Date();
      visibleMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
      timePicker.hidden = true;
      datePicker.hidden = false;
      renderCalendar();
      positionPanel(datePicker);
    };
    const openTimePicker = () => {
      const selected = pickerOnly.value ? new Date(pickerOnly.value) : new Date();
      const hours = selected.getHours();
      hour.value = String(hours % 12 || 12);
      minute.value = String(selected.getMinutes()).padStart(2, "0");
      period.value = hours >= 12 ? "PM" : "AM";
      hourPicker.sync();
      minutePicker.sync();
      periodPicker.sync();
      timePicker.hidden = false;
      positionPanel(timePicker);
      hourPicker.trigger.focus();
    };
    picker.tabIndex = 0;
    picker.setAttribute("role", "button");
    picker.setAttribute("aria-label", "Select deadline date and time");
    picker.addEventListener("click", (event) => {
      if (!event.target.closest(".deadline-date-picker, .deadline-time-picker")) openDatePicker();
    });
    picker.addEventListener("keydown", (event) => {
      if (event.target === picker && ["Enter", " "].includes(event.key)) {
        event.preventDefault();
        openDatePicker();
      }
    });
    datePicker.addEventListener("click", (event) => {
      event.stopPropagation();
      if (event.target.closest("[data-deadline-prev]")) visibleMonth.setMonth(visibleMonth.getMonth() - 1);
      else if (event.target.closest("[data-deadline-next]")) visibleMonth.setMonth(visibleMonth.getMonth() + 1);
      else if (event.target.closest("[data-deadline-date]")) selectedDate = event.target.closest("[data-deadline-date]").dataset.deadlineDate;
      else if (event.target.closest("[data-deadline-continue]")) {
        datePicker.hidden = true;
        return openTimePicker();
      } else return;
      renderCalendar();
    });
    timePicker.querySelector("[data-deadline-done]").addEventListener("click", () => {
      let hours = Number(hour.value) % 12;
      if (period.value === "PM") hours += 12;
      pickerOnly.value = `${selectedDate}T${String(hours).padStart(2, "0")}:${minute.value}`;
      pickerOnly.dispatchEvent(new Event("input", { bubbles: true }));
      pickerOnly.dispatchEvent(new Event("change", { bubbles: true }));
      timePicker.hidden = true;
      picker.focus();
    });
    pickerOnly.addEventListener("input", updateDeadlineDisplay);
    pickerOnly.addEventListener("change", updateDeadlineDisplay);
    updateDeadlineDisplay();
  }
  pickerOnly?.addEventListener("keydown", (event) => {
    const manualEdit = (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) || ["Backspace", "Delete"].includes(event.key);
    if (manualEdit) event.preventDefault();
  });
  pickerOnly?.addEventListener("beforeinput", (event) => {
    if (event.inputType) event.preventDefault();
  });
  pickerOnly?.addEventListener("paste", (event) => event.preventDefault());
  pickerOnly?.addEventListener("drop", (event) => event.preventDefault());
  duration?.addEventListener("change", () => {
    const custom = duration.value === "custom";
    customDuration.hidden = !custom;
    customDuration.required = custom;
    if (!custom) customDuration.value = duration.value;
    if (custom) customDuration.focus();
  });
  root.querySelectorAll("[data-range]").forEach((input) => {
    const output = root.querySelector(`[data-range-output="${input.name}"]`);
    const labels = input.dataset.labels?.split("|");
    const update = () => {
      output.textContent = labels?.[input.value] ?? `${input.value}%`;
      const progress = (input.value - input.min) / (input.max - input.min) * 100;
      const slider = input.closest(".progress-slider");
      slider?.style.setProperty("--progress", `${progress}%`);
      slider?.querySelectorAll("[data-range-value]").forEach((marker) => {
        const selected = marker.dataset.rangeValue === input.value;
        marker.classList.toggle("is-selected", selected);
        marker.setAttribute("aria-pressed", selected);
      });
    };
    input.closest(".progress-slider")?.querySelectorAll("[data-range-value]").forEach((marker) => marker.addEventListener("click", () => {
      input.value = marker.dataset.rangeValue;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }));
    input.addEventListener("input", update);
    update();
  });
  root.querySelector("form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const courseSearch = e.target.querySelector("[data-course-search]");
    if (courseSearch && !e.target.elements.courseId.value) {
      courseSearch.setCustomValidity("Select or create a course");
      return courseSearch.reportValidity();
    }
    onSubmit(new FormData(e.target), close);
  });
  root.querySelector(".modal-backdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) close();
  });
}

function showConfirmModal({ title, message, confirmLabel = "Confirm", danger = false, onConfirm }) {
  const root = $("#modalRoot");
  const previousFocus = document.activeElement;
  const background = [...document.body.children].filter((element) => element !== root && element.tagName !== "SCRIPT").map((element) => [element, element.inert]);
  root.innerHTML = `<div class="modal-backdrop open confirmation-backdrop"><section class="modal card confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="confirmationTitle"><h2 id="confirmationTitle">${esc(title)}</h2><p>${esc(message)}</p><div class="modal-actions"><button class="btn btn-outline" type="button" data-confirm-cancel>Cancel</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" type="button" data-confirm-action>${esc(confirmLabel)}</button></div></section></div>`;
  background.forEach(([element]) => { element.inert = true; });
  const close = () => {
    root.innerHTML = "";
    background.forEach(([element, inert]) => { element.inert = inert; });
    document.removeEventListener("keydown", escape);
    if (previousFocus?.isConnected) previousFocus.focus();
  };
  const escape = (event) => { if (event.key === "Escape") close(); };
  root.querySelector("[data-confirm-cancel]").onclick = close;
  const confirm = root.querySelector("[data-confirm-action]");
  confirm.onclick = async () => {
    confirm.disabled = true;
    try { await onConfirm(close); }
    finally { if (confirm.isConnected) confirm.disabled = false; }
  };
  document.addEventListener("keydown", escape);
  root.querySelector("[data-confirm-cancel]").focus();
}

export { modal, showConfirmModal };
