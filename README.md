# StudentStudies
StudentStudies is a smart study planner that helps students manage courses, tasks, deadlines, progress, and task priorities.

## Main features
- Authentication
- Course management
- Task and deadline management
- Task progress tracking
- Smart task prioritization
- Global and local recommendations
- Workload warning

## Smart Prioritization
StudentStudies calculates task priority based on:
- Deadline urgency
- Importance level
- Current progress
- Estimated duration (optional)

If estimated duration is not provided, the system uses a default effective duration of 3h for priority calculation.

## Data Storage
StudentStudies stores students, courses, and tasks in the server SQLite database. Browser `localStorage` is used only for client state such as the current login, theme, notification read state, course view, and calendar sessions.

Main stored data:
- Users, courses, and tasks: SQLite
- Current logged-in user and UI preferences: `localStorage`
Calculated values: priority score, workload score, overdue status, and workload warning are derived by the system and are not stored directly.
Task completion is also derived from the single rule `currentProgress === 100`; no independent completion boolean is stored.

## Project Documents
- Brief: `docs/studyflow-brief.pdf`
- Use Case Diagram: `docs/use-case-diagram.png`
- Class Diagram: `docs/class-diagram.pdf`
- Workflow: `docs/workflow.pdf`
- Data Contract: `docs/data-contract.md`

## Team Responsibilities

- Architecture, structure and integration
- UI, course, task and smart features
- Data storage/API and testing

## Setup

Setup instructions will be added after the technology stack is finalized.

## Demo data

While logged in as the demo student, open the browser console on any StudentStudies page and run:

```js
import("../js/seedDemoData.js").then(({ seedDemoData }) => seedDemoData()).then(console.log)
```

This development-only seed is idempotent and adds any missing items from the 24-course, 72-task demo dataset to the current student.

## Code Structure
```text
studyflow/
│
├── index.html
├── dashboard.html
├── course.html
│
├── css/
│   ├── global.css
│   ├── auth.css
│   ├── dashboard.css
│   └── course.css
│
├── js/
│   ├── app.js
│   │
│   ├── services/
│   │   ├── storageService.js
│   │   ├── authService.js
│   │   ├── courseService.js
│   │   ├── taskService.js
│   │   └── smartService.js
│
├── docs/
│   ├── studyflow-brief.pdf
│   ├── data-contract.md
│   ├── use-case-diagram.png
│   ├── class-diagram.pdf
│   └── workflow.pdf
│
└── README.md
```
