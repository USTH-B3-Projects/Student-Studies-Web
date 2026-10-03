<table width="100%">
  <tr>
    <td align="center" bgcolor="#0D1117">
      <br>
      <img src="./Frontend/source/logo.png" alt="StudentStudies" width="200">
      <h1><font color="#FFFFFF"></font></h1>
      <p><strong><font color="#A5B4FC">SMART STUDY PLANNER</font></strong></p>
      <hr>
      <p><font color="#D1D5DB">A web-based study planner that helps students organize courses, manage tasks and deadlines, schedule study sessions, track progress, and know what to work on next.</font></p>
      <p>
        <img src="https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?style=flat-square&logo=javascript&logoColor=111827" alt="JavaScript ES Modules">
        <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 18+">
        <img src="https://img.shields.io/badge/Express-5.2.1-7C3AED?style=flat-square&logo=express&logoColor=white" alt="Express 5.2.1">
        <img src="https://img.shields.io/badge/SQLite-better--sqlite3-2563EB?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite with better-sqlite3">
        <img src="https://img.shields.io/badge/Firebase_Auth-12.19.0-FFCA28?style=flat-square&logo=firebase&logoColor=111827" alt="Firebase Auth 12.19.0">
        <img src="https://img.shields.io/badge/tests-9%20passed-22C55E?style=flat-square" alt="tests 9 passed">
      </p>
      <br>
    </td>
  </tr>
</table>

# StudentStudies

StudentStudies is a study planner for organizing courses, tasks, deadlines, and study progress. It combines a static browser frontend with a REST API backed by SQLite.

## Features

- Register and log in with a username and password, or sign in with Google.
- Create, edit, and remove courses and tasks.
- Set task importance, deadlines, estimated duration, and progress.
- Browse tasks by course, status, deadline, or priority; search, filter, sort, and perform bulk actions.
- View tasks in a calendar with day, week, and month views.
- See dashboard summaries, upcoming deadlines, workload warnings, and recommended next tasks.
- Use light and dark themes.

Task priority and remaining workload are calculated from deadline, importance, progress, and estimated duration. When no duration is provided, the priority service uses a two-hour default.

## Tech stack

- **Frontend:** HTML, CSS, JavaScript ES modules; no frontend build step.
- **Backend:** Node.js, Express 5, and the `better-sqlite3` SQLite driver.
- **Authentication:** Backend username/password accounts and Firebase Authentication for Google sign-in.
- **Hosting:** GitHub Pages for the static frontend; Render for the API.

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

## Project structure

StudentStudies has a browser-based frontend in `FE/` and a Node.js API in `BE/`, uses a layered, multi-page frontend and a small REST backend. Page modules coordinate the UI, reusable components render shared interactions, service modules handle data access and calculations, Express controllers implement API behavior, and SQLite provides server-side persistence.

```text
.
├── .github/
│   └── workflows/
│       └── deploy.yml
├── BE/
│   ├── middleware/
│   │   └── authenticate.js
│   ├── models/
│   │   └── database.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── courseRoutes.js
│   │   ├── smartRoutes.js
│   │   └── taskRoutes.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── courseService.js
│   │   └── taskService.js
│   ├── tests/
│   │   ├── auth.test.js
│   │   ├── database.test.js
│   │   └── smart.test.js
│   ├── .gitignore
│   ├── app.js
│   ├── firebaseAdmin.js
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── docs/
│   ├── CONTEXT.md
│   ├── data-contract.md
│   ├── module-interface.md
│   ├── refactor-audit.md
│   ├── refactor-report.md
│   ├── studyflow-brief.md
│   ├── ClassDiagram.drawio.png
│   ├── UseCaseDiagram.png
│   └── WorkFlow.drawio.png
├── FE/
│   ├── assets/
│   │   ├── background/
│   │   │   ├── dashboard_dark.png
│   │   │   ├── dashboard_light.png
│   │   │   └── login.png
│   │   ├── google.png
│   │   ├── hide.png
│   │   └── logo.png
│   ├── components/
│   │   ├── modal.js
│   │   ├── notifications.js
│   │   ├── schedule-picker.js
│   │   ├── shell.js
│   │   ├── task-ui.js
│   │   └── ui.js
│   ├── css/
│   │   ├── ui/
│   │   │   └── light_dark.css
│   │   ├── auth.css
│   │   ├── calendar.css
│   │   ├── course.css
│   │   ├── dashboard.css
│   │   ├── global.css
│   │   └── info-pages.css
│   ├── pages/
│   │   ├── ui/
│   │   │   └── light_dark.html
│   │   ├── about.html
│   │   ├── auth.js
│   │   ├── calendar.html
│   │   ├── calendar.js
│   │   ├── course-detail.html
│   │   ├── course-detail.js
│   │   ├── course.html
│   │   ├── courses.js
│   │   ├── dashboard.html
│   │   ├── dashboard.js
│   │   ├── index.html
│   │   ├── profile.html
│   │   ├── profile.js
│   │   ├── tasks.html
│   │   └── tasks.js
│   ├── services/
│   │   ├── apiClient.js
│   │   ├── authService.js
│   │   ├── calendarService.js
│   │   ├── courseService.js
│   │   ├── smartService.js
│   │   └── taskService.js
│   ├── utils/
│   │   └── calendar-time.js
│   ├── app.js
│   ├── config.js
│   └── firebase.js
├── .gitignore
├── package.json
└── README.md
```

### Request and data flow

```text
HTML page → page controller → frontend service → REST API → Express controller → SQLite
                              ↘ smart calculations and browser-local calendar/preferences
```

## Use the web application

1. Open the deployed GitHub Pages site, or run the local setup below.
2. Register an account or choose **Log in with Google**. The API must be available for account and course/task data.
3. Add courses, then create tasks with deadlines and importance. Estimated duration is optional.
4. Update task progress as you work. Use Courses, Tasks, and Calendar to review and organize your work.
5. Check the Dashboard for workload warnings, upcoming deadlines, and recommended tasks.

## Environment setup

### Requirements

- Node.js 18 or newer and npm.
- A modern browser. Serve the frontend over HTTP; browser ES modules and Firebase sign-in do not work reliably from `file://` URLs.
- A static development server, such as the VS Code Live Server extension configured for port `5501`

### Installation

```bash
git clone https://github.com/USTH-B3-Projects/Student-Studies-Web.git
cd Student-Studies-Web
npm install
```

No environment variable is required for the default local setup. The API listens on port `5000`; optionally set `PORT` or `STUDYFLOW_DB_PATH` before starting it.

### Start the API locally

Run
```powershell
cd BE
npm run dev
```

The API listens on `http://localhost:5000` by default. Confirm it is running at `http://localhost:5000/api/v1/health`. The server creates `server/data.db` automatically when started and open:

```text
http://localhost:5501/html/index.html
```

To store the SQLite database elsewhere, set `STUDYFLOW_DB_PATH` before starting the server. For example, in PowerShell:

```powershell
$env:STUDYFLOW_DB_PATH = "D:\data\studentstudies.db"
npm run dev
```

### Serve the frontend locally

From the repository root, start a static server with VS Code Live Server or another static file server, using `Frontend/html` as its document root. With VS Code Live Server, open `Frontend/html/index.html` and select **Open with Live Server**. The app configuration uses `http://localhost:5000/api/v1` on `localhost` and `127.0.0.1`.

Google sign-in uses the Firebase project configured in `Frontend/js/firebase.js`. If you use a different Firebase project, configure its web app and authorized domains there and enable Google as a sign-in provider. The backend CORS allowlist currently includes the project's GitHub Pages origin and localhost ports 5500 and 5501.

## Deployment

- **Frontend:** Push to the `main` branch to trigger `.github/workflows/deploy.yml`. GitHub Actions copies the static assets from `Frontend/` into a Pages artifact, adjusts relative paths, and publishes the site to GitHub Pages. The workflow can also be run manually from the Actions tab. Enable GitHub Pages with **GitHub Actions** as the build and deployment source.
- **API:** The frontend uses `https://study-flow-4wcc.onrender.com/api/v1` outside localhost. The Express API is deployed on Render; configure its start command as `npm start` with `server/` as the service root (or `node src/server.js` from that directory). Set `PORT` through Render. For persistent production data, configure `STUDYFLOW_DB_PATH` to a path on a persistent disk mounted by the Render service.

## Project documents

- [Project brief](docs/studyflow-brief.md)
- [Data contract](docs/data-contract.md)
- [Module interface](docs/module-interface.md)
- [Context](docs/CONTEXT.md)
- [Workflow diagram](docs/WorkFlow.drawio.png)
- [Use case diagram](docs/UseCaseDiagram.png)
- [Class diagram](docs/ClassDiagram.drawio.png)

## Future Work

- Hash passwords and add server-validated sessions or token-based authentication.
- Persist profiles, calendar sessions, and custom task ordering through the API.
- Share one priority implementation between the frontend and backend.
- Add API integration tests and deployment health checks.
