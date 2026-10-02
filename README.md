# StudyFlow

A student study planner built with vanilla HTML/CSS/JavaScript, Express, SQLite and Firebase Authentication for Google sign-in.

## Run locally

Use Node.js 22 or newer. Install backend dependencies and start the API:

```sh
npm ci --prefix BE
npm start
```

Serve the frontend on an allowed development origin. For example, with Python installed:

```sh
python -m http.server 5501 --bind 127.0.0.1 --directory FE
```

Open **http://127.0.0.1:5501/pages/index.html**. VS Code Live Server on port 5500 or 5501 also works. `npm run dev` starts the backend with nodemon.

The API defaults to port 5000. `PORT` overrides it; `STUDYFLOW_DB_PATH` overrides the database location, otherwise `BE/data.db` is used independently of the working directory. Production Google sign-in needs Firebase Admin credentials. `NODE_ENV=production` enables Secure/SameSite=None session cookies. Backend `.env` loading retains the existing process-working-directory behavior.

`FE/config.js` selects the local API for localhost/127.0.0.1 and the existing hosted API elsewhere. No frontend build or npm install is required: Firebase browser modules load directly from gstatic.

## Structure and responsibilities

```text
FE/
  app.js                  Restore session, dispatch page initialization
  config.js, firebase.js  API location and browser Firebase setup
  pages/                  HTML entry points and page interaction/rendering
  components/             Task UI, modals, picker, shell, notifications, UI helpers
  services/               HTTP client, auth, courses, tasks, smart rules, calendar storage
  utils/calendar-time.js  Reusable calendar date/time calculations
  css/                    Existing styles and theme cascade
  assets/                 Images
BE/
  server.js, app.js       Start Express; middleware, API mounts, JSON errors
  routes/                 Parse HTTP input, call services, respond
  services/               Auth/course/task operations, validation and SQL
  models/database.js      SQLite schema, connection and legacy migrations
  middleware/             Authenticated cookie sessions
  tests/                  API, migration and backend smart-rule checks
  package.json            Backend dependencies and scripts
  package-lock.json       Reproducible backend dependency versions
  data.db                 Existing application database
```

Root `package.json` provides start/dev/test commands and the frontend ES-module scope. `docs/` retains historical requirements, diagrams and refactor reports; `.github/` holds deployment configuration. Tests for frontend modules live beside those modules.

Frontend services do not render DOM. `services/apiClient.js` owns fetch/error handling. `services/taskService.js` owns task API operations and completion events. Page modules coordinate rendering; shared row rendering/expansion/drag handling lives in `components/task-ui.js`.

Backend services are plain functions operating on values, without request/response objects. Routes retain HTTP status/response handling. Database migrations and legacy Firebase linking are intentionally preserved for existing data.

## Behavior and data

- Accounts, courses, tasks and cookie sessions persist in SQLite.
- Calendar sessions remain per-user browser-local data. Theme, notification read state and course view preferences retain their original storage keys.
- Task fields, API response aliases, validation, progress values, completion/reopening history and authentication contracts remain unchanged.
- Task-row order is session-local. Dragging changes visible row order; on a course page, Recommended next updates immediately to the first incomplete task in the manual order. Filtering retains the page's ordering; choosing a new sort resets it. No order API or persistent storage was added.
- Calendar drag/drop continues to schedule and move study sessions independently of task-row ordering.

The current runtime priority formula is:

```text
priority = 0.6 * urgency + 0.25 * importance + 0.15 * workload
```

The browser smart rules live in `FE/services/smartService.js`. Existing API rules live in `BE/services/taskService.js`. They deliberately remain separate: browser urgency uses local calendar days and excludes overdue workload warnings, while API urgency uses elapsed 24-hour periods and includes overdue warnings when an estimate exists. API tie-breaking and browser rounding also differ. Unifying these behaviors was explicitly deferred during the refactor. Historical documents describe different weights and fields; they are not a reason to silently change running behavior.

## API

All endpoints are under `/api/v1`:

| Methods | Path | Responsibility |
|---|---|---|
| GET | `/health` | Availability |
| POST | `/auth/register`, `/auth/login`, `/auth/reset`, `/auth/google`, `/auth/logout` | Authentication |
| GET, PATCH | `/auth/me` | Current student/profile |
| GET, POST | `/courses`, `/tasks` | List/create |
| GET, PUT, DELETE | `/courses/:id`, `/tasks/:id` | Read/update/delete |
| PATCH | `/tasks/:id/completion` | Complete/reopen |
| GET | `/smart` | Existing server recommendations |

## Validation

```sh
npm test
npm test --prefix BE
```

Tests use temporary or in-memory databases, never the existing `BE/data.db`. They cover startup ordering, API error handling, session/profile flows, ownership, CRUD, completion history, migrations, calendar calculations/persistence, preserved smart rules and drag-handler/manual-order behavior.

See [the pre-change audit](docs/refactor-audit.md) and [the refactor report](docs/refactor-report.md) for the full file inventory, migration map, differential checks and remaining limits.

## Deployment

`.github/workflows/deploy.yml` packages FE pages at the site root, preserving deployed URLs such as `/index.html` and `/course-detail.html`, and rewrites relative assets accordingly. Backend hosting configured with the old `server` root directory must be changed to `BE`; start with `npm start` there. Remote host settings were not changed by this local refactor.

## Remaining issues preserved for separate approval

- Password-reset HTML lacks the confirmation field required by its page handler/API.
- Notifications omit task identifiers/types expected by the notification UI.
- Three referenced illustrations are missing from the repository.
- Calendar sessions are not removed from localStorage when their task/course is deleted.
- API smart tie-breaks compare Date objects by identity; this existing behavior is retained.
- Prototype password storage/reset verification and other authentication semantics are unchanged.
- Uncertain CSS, the standalone theme fragment, and behaviorally different modal/date pickers need review before removal or consolidation.
- Real browser interactions, layout equivalence and live Google sign-in still need manual verification; no browser was available to the refactor session.

Historical references: [data contract](docs/data-contract.md), [module interfaces](docs/module-interface.md), [product brief](docs/studyflow-brief.md), [domain context](docs/CONTEXT.md).
