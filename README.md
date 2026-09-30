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

## Project structure

```text
.
├── Frontend/
│   ├── html/                 # Landing, dashboard, courses, tasks, and calendar pages
│   ├── css/                  # Shared, page-specific, and theme styles
│   ├── js/
│   │   ├── components/       # Task UI and modal components
│   │   ├── pages/            # Page controllers
│   │   ├── services/         # API clients and study-planning logic
│   │   ├── shared/           # Shared UI and navigation shell
│   │   ├── app.js
│   │   ├── config.js         # API base URL selection
│   │   └── firebase.js       # Firebase browser authentication setup
│   └── source/               # Logos, icons, and backgrounds
├── server/
│   ├── src/
│   │   ├── config/           # SQLite initialization and migrations
│   │   ├── controllers/      # API request handlers
│   │   ├── routes/           # Auth, course, task, and smart routes
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
├── docs/                     # Project and data documentation
├── .github/workflows/        # GitHub Pages deployment workflow
└── README.md
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

### Start the API locally

```powershell
cd server
npm install
npm run dev
```

The API listens on `http://localhost:5000` by default. Confirm it is running at `http://localhost:5000/api/v1/health`. The server creates `server/data.db` automatically when started.

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

## Development checks

Run the backend tests from `server/`:

```powershell
npm test
```

The server package also provides `npm run dev` for development with automatic restarts and `npm start` for a normal start.

## Project documents

- [Project brief](docs/studyflow-brief.md)
- [Data contract](docs/data-contract.md)
- [Module interface](docs/module-interface.md)
- [Context](docs/CONTEXT.md)
- [Workflow diagram](docs/WorkFlow.drawio.png)
- [Use case diagram](docs/UseCaseDiagram.png)
- [Class diagram](docs/ClassDiagram.drawio.png)
