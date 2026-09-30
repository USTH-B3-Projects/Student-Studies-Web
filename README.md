<table width="100%">
  <tr>
    <td align="center" bgcolor="#0D1117">
      <br>
      <img src="./Frontend/source/logo.png" alt="StudyFlow" width="200">
      <h1><font color="#FFFFFF">StudyFlow</font></h1>
      <p><strong><font color="#A5B4FC">SMART STUDY PLANNER</font></strong></p>
      <hr>
      <p><font color="#D1D5DB">A web-based study planner that helps students organize courses, manage tasks and deadlines, schedule study sessions, track progress, and know what to work on next.</font></p>
      <p>
        <img src="https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?style=flat-square&logo=javascript&logoColor=111827" alt="JavaScript ES Modules">
        <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 18+">
        <img src="https://img.shields.io/badge/Express-5.2.1-7C3AED?style=flat-square&logo=express&logoColor=white" alt="Express 5.2.1">
        <img src="https://img.shields.io/badge/SQLite-better--sqlite3-2563EB?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite with better-sqlite3">
        <img src="https://img.shields.io/badge/Firebase_Auth-12.19.0-FFCA28?style=flat-square&logo=firebase&logoColor=111827" alt="Firebase Auth 12.19.0">
        <img src="https://img.shields.io/badge/tests-2%20passed-22C55E?style=flat-square" alt="tests 2 passed">
      </p>
      <br>
    </td>
  </tr>
</table>

## Overview

StudyFlow brings a student's courses, deadlines, workload, and progress into one workspace. It is designed for students who need more guidance than a traditional to-do list provides: tasks are ranked from their urgency, importance, estimated workload, and current progress so that the most useful next action is visible.

The project combines a browser-based interface with a REST API and SQLite database. Accounts, courses, and tasks are stored by the backend, while per-user calendar sessions and interface preferences are stored in the browser.

## Key Features

### Authentication and account experience

- Register, log in, log out, and reset a password with username/password authentication.
- Sign in with Google through Firebase Authentication and sync the account to the backend.
- Protect application pages with a client-side session check.
- View a profile and update the locally displayed name and email.

### Dashboard

- Review counts for pending, overdue, due-today, and completed tasks.
- See tasks that need attention because they are overdue or carry a workload warning.
- View a daily completion summary and the next five upcoming tasks.
- Create courses and tasks through dashboard quick actions.
- Open task-specific notification details from the navigation bar.

### Course management

- Create, view, edit, and delete color-coded courses.
- Search, filter by course progress status, sort, paginate, and switch between grid and list views.
- Open a course dashboard with its overall progress, task list, and highest-ranked local recommendation.
- Delete a course together with its tasks after confirmation.

### Task management and progress tracking

- Create, inspect, edit, and delete tasks with a description, deadline, importance, estimated duration, and progress.
- Derive pending, overdue, and completed states from the deadline and progress.
- Search and filter tasks by status or course, then sort by priority, deadline, importance, or creation time where supported.
- Mark tasks complete, reopen them at their previous progress, and complete or delete multiple selected tasks.
- View calculated remaining workload, priority, and progress indicators.
- Reorder visible task rows with drag and drop. This ordering is currently limited to the active page session.

### Smart prioritization and recommendations

- Rank incomplete tasks using urgency, importance, and remaining workload.
- Recommend the highest-ranked task globally or within a selected course.
- Break equal scores by earlier deadline, higher importance, and earlier creation time.
- Generate workload warnings for urgent tasks with substantial remaining work.
- Generate separate notifications for overdue tasks.

The browser service calculates priority as:

```text
priority = 0.60 × urgency + 0.25 × importance + 0.15 × workload
```

If no duration is supplied, ranking uses a two-hour effective duration without changing the stored task. Workload warnings require an explicit duration.

### Study calendar

- Switch among day, week, and month views and navigate to previous, next, or current dates.
- Search active tasks and filter them by scheduled or unscheduled state.
- Drag tasks onto the calendar to create study sessions based on their remaining workload.
- Drag existing sessions to reschedule them, including moving them between dates in month view.
- Inspect, edit, or remove scheduled sessions.
- Visualize task deadlines and confirm when a session would extend beyond a deadline.

### Interface and persistence

- Use responsive light and dark themes with the selected theme retained locally.
- Retain the signed-in user, notification read state, course view preference, and per-user calendar sessions in `localStorage`.
- Persist students, courses, and tasks in SQLite through the REST API.

## Application Workflow

```text
Register or sign in
        ↓
Create and organize courses
        ↓
Add tasks with deadlines, importance, duration, and progress
        ↓
Review priority rankings, recommendations, and warnings
        ↓
Drag tasks into day, week, or month study plans
        ↓
Update progress or mark tasks complete
        ↓
Monitor dashboard summaries and upcoming work
```

## Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript ES modules | Multi-page user interface, interactions, and client-side calculations |
| Authentication | Custom REST authentication and Firebase Authentication 12.19.0 | Username/password flows and Google sign-in |
| Backend | Node.js and Express 5.2.1 | REST API, validation, and application logic |
| Database | SQLite with `better-sqlite3` 12.4.1 | Persistent storage for students, courses, and tasks |
| API support | CORS 2.8.6 and dotenv 18.0.1 | Browser access control and environment configuration |
| Testing | Node.js built-in test runner and `node:assert` | Focused frontend service and UI checks |
| Development | Nodemon 3.1.14 | Backend auto-reload during development |
| Deployment | GitHub Actions and GitHub Pages | Static frontend deployment from the `main` branch |

## Project Architecture

StudyFlow uses a layered, multi-page frontend and a small REST backend. Page modules coordinate the UI, reusable components render shared interactions, service modules handle data access and calculations, Express controllers implement API behavior, and SQLite provides server-side persistence.

```text
Web-Application-Development/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Pages deployment
├── docs/
│   ├── CONTEXT.md                  # Domain terminology
│   ├── data-contract.md            # Shared data model
│   ├── module-interface.md         # Service interface documentation
│   ├── studyflow-brief.md          # Product and feature brief
│   ├── ClassDiagram.drawio.png
│   ├── UseCaseDiagram.png
│   └── WorkFlow.drawio.png
├── Frontend/
│   ├── css/                        # Global and page-specific styles
│   ├── html/                       # Landing, dashboard, course, task, calendar, profile, and about pages
│   ├── js/
│   │   ├── components/             # Shared modal and task UI
│   │   ├── pages/                  # Page controllers
│   │   ├── services/               # API, domain, ranking, and calendar services
│   │   ├── shared/                 # Shared shell and UI helpers
│   │   ├── app.js                  # Page initializer
│   │   ├── calendar.js             # Calendar interactions
│   │   ├── config.js               # API base URL selection
│   │   └── firebase.js             # Firebase client setup
│   └── source/                     # Images and visual assets
├── server/
│   ├── src/
│   │   ├── config/database.js      # SQLite schema and migrations
│   │   ├── controllers/            # Authentication, course, and task handlers
│   │   ├── routes/                 # Express route definitions
│   │   ├── app.js                  # Express middleware and route mounting
│   │   └── server.js               # HTTP server entry point
│   └── package.json
├── package.json                    # Root Firebase dependency metadata
└── README.md
```

### Request and data flow

```text
HTML page → page controller → frontend service → REST API → Express controller → SQLite
                              ↘ smart calculations and browser-local calendar/preferences
```

## Data Persistence

| Data | Storage |
| --- | --- |
| Student accounts | SQLite `students` table |
| Courses | SQLite `courses` table |
| Tasks and completion history | SQLite `tasks` table |
| Current browser session | `localStorage` |
| Calendar study sessions | Per-user `localStorage` key |
| Theme, course view, and notification read state | `localStorage` |
| Priority, status, remaining workload, and warnings | Calculated at runtime |

The database is created automatically at `server/data.db` when the backend starts from the `server` package. Set `STUDYFLOW_DB_PATH` to use another location.

## REST API

All backend routes are mounted below `/api/v1`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check API availability |
| `POST` | `/auth/register` | Register a student |
| `POST` | `/auth/login` | Validate username/password credentials |
| `POST` | `/auth/google` | Create or update a Google-authenticated student |
| `POST` | `/auth/reset` | Reset a password |
| `GET`, `POST` | `/courses` | List or create courses |
| `GET`, `PUT`, `DELETE` | `/courses/:id` | Read, update, or delete a course |
| `GET`, `POST` | `/tasks` | List or create tasks |
| `GET`, `PUT`, `DELETE` | `/tasks/:id` | Read, update, or delete a task |
| `PATCH` | `/tasks/:id/completion` | Complete or reopen a task |
| `GET` | `/smart` | Return server-calculated task recommendations |

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- A static development server, such as the VS Code Live Server extension configured for port `5501`

### Installation

```bash
git clone https://github.com/USTH-B3-Projects/Student-Studies-Web.git
cd Student-Studies-Web
npm install --prefix server
```

No environment variable is required for the default local setup. The API listens on port `5000`; optionally set `PORT` or `STUDYFLOW_DB_PATH` before starting it.

### Run locally

Start the backend:

```bash
npm start --prefix server
```

For backend auto-reload:

```bash
npm run dev --prefix server
```

Then serve `Frontend/` on `http://localhost:5500` or `http://localhost:5501` and open:

```text
http://localhost:5501/html/index.html
```

The frontend automatically uses `http://localhost:5000/api/v1` on `localhost` and `127.0.0.1`.

## Testing

Run the existing frontend checks from the repository root:

```bash
node --test Frontend/js/*.test.mjs Frontend/js/components/*.test.mjs Frontend/js/pages/*.test.mjs Frontend/js/services/*.test.mjs Frontend/js/shared/*.test.mjs
```

The current checks cover Google-session synchronization, local profile updates, and profile-menu state.

## Deployment

The workflow in `.github/workflows/deploy.yml` packages the static files from `Frontend/` and deploys them to GitHub Pages after pushes to `main` or a manual workflow run. Outside local development, the frontend is configured to use the hosted API at `https://study-flow-4wcc.onrender.com/api/v1`.

## Project Documentation

- [Product brief](docs/studyflow-brief.md)
- [Data contract](docs/data-contract.md)
- [Module interfaces](docs/module-interface.md)
- [Domain context](docs/CONTEXT.md)
- [Use-case diagram](docs/UseCaseDiagram.png)
- [Workflow diagram](docs/WorkFlow.drawio.png)
- [Class diagram](docs/ClassDiagram.drawio.png)

## Current Limitations

StudyFlow is an academic prototype, not a production authentication system.

- Passwords are stored as plain text, and the API does not issue or validate authentication tokens.
- Profile edits, calendar sessions, task row ordering, and several interface preferences are not synchronized across browsers.
- The frontend ranking service and the server `/smart` endpoint currently use different scoring weights; the visible UI uses the frontend formula documented above.
- Automated coverage currently targets frontend modules; the server package declares a test command but contains no server test suite.
- Some interface copy still uses the earlier `StudentStudies` name.

## Future Work

- Hash passwords and add server-validated sessions or token-based authentication.
- Persist profiles, calendar sessions, and custom task ordering through the API.
- Share one priority implementation between the frontend and backend.
- Add API integration tests and deployment health checks.
