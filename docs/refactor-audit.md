# StudyFlow source audit ? before refactoring

Audit date: 2026-10-02. No source files were changed during this audit. All tracked application modules, HTML entry points, dependency edges, tests, configuration and documentation were inspected; CSS was scanned for selectors, references and repeated rules. Binary images were inventoried by references; the user database was not opened. Third-party node_modules and Git internals are excluded from source classification.

## Findings and decisions

- Backend is Express/CommonJS, not Flask. User approved preserving Express in BE.
- Both implementations currently use 0.5 urgency + 0.3 importance + 0.2 workload. Documents describe 0.6/0.25/0.15. Preserve runtime formulas.
- Browser urgency uses local calendar days; API urgency uses elapsed 24-hour periods. Browser excludes overdue tasks from workload warnings; API includes overdue tasks with an estimate. Browser rounds scores; API does not. Browser defaults unknown importance to 60; API does not. User explicitly requested preserving both behaviors and deferring conflicting rules.
- API ranking compares two distinct Date objects by identity, so equal deadline values return zero before the final tie-breaks. Fixing this changes results and is deferred.
- Task-row drag sorting is implemented in wireTaskSort but never called. updateDisplayOrder is a no-op. User approved restoring drag sorting and immediate course recommendation updates. Calendar drag/drop is separate and active.
- Notifications expect taskId/type but getUserNotifications emits only title/message. Opening notification details and read identities are therefore suspect. Fixing the payload is a contract change; deferred.
- Password-reset HTML omits confirmPassword, while page validation/API require it. Existing reset UI is broken; repair would change behavior and is deferred.
- Existing API payload aliases are not obsolete: task GET/create expose name; update/completion expose taskName and name. Course create exposes userId; reads expose username. Keep these exact shapes.
- Database migrations and legacy Firebase account linking support persisted users: DO NOT remove.
- Calendar persistence validates ranges but not task ownership/existence, and task/course deletion does not remove stored sessions. Documents claim otherwise. Do not silently change persistence behavior.
- Missing assets: source/studyflow-note/task_1.png, source/studyflow-note/small_step_big_progress.png, source/studyflow-mascot-pack/cat-thinking.png. Preserve references pending replacement approval.
- Root npm Firebase dependency has no bare-package runtime imports; browser loads its SDK directly from gstatic. Candidate for removal; backend firebase-admin is active.
- No local module cycles found, including literal dynamic imports.
- No services directly manipulate DOM nodes. taskService publishes a browser event; this is an event boundary, not DOM rendering.

## Entry points

- npm start/dev -> server/package.json -> src/server.js -> src/app.js.
- Eight HTML pages: index, dashboard, course, course-detail, tasks, calendar, profile, about; each loads js/app.js. app restores the session before dispatching by body[data-page].
- html/ui/light_dark.html is an unreferenced standalone fragment, shipped by deployment; keep pending review of direct access.
- API mounts: /api/v1/health, /auth (register/login/reset/google/me/logout), /courses, /tasks (including completion), /smart. /smart remains a public authenticated API even though current browser pages do not call it.
- npm test -> node --test (five frontend test files and two backend test files; eight reported passing tests).
- .github/workflows/deploy.yml packages static HTML at the deployment root and rewrites relative assets. It must be migrated with the source paths while preserving deployed page URLs.

## Current tree (all tracked files)

```text
.github/workflows/deploy.yml
.gitignore
.vscode/settings.json
Frontend/css/auth.css
Frontend/css/calendar.css
Frontend/css/course.css
Frontend/css/dashboard.css
Frontend/css/global.css
Frontend/css/info-pages.css
Frontend/css/ui/light_dark.css
Frontend/html/about.html
Frontend/html/calendar.html
Frontend/html/course-detail.html
Frontend/html/course.html
Frontend/html/dashboard.html
Frontend/html/index.html
Frontend/html/profile.html
Frontend/html/tasks.html
Frontend/html/ui/light_dark.html
Frontend/js/app.js
Frontend/js/app.test.mjs
Frontend/js/components/modal.js
Frontend/js/components/schedule-picker.js
Frontend/js/components/task-ui.js
Frontend/js/config.js
Frontend/js/firebase.js
Frontend/js/pages/auth.js
Frontend/js/pages/calendar.js
Frontend/js/pages/course-detail.js
Frontend/js/pages/courses.js
Frontend/js/pages/dashboard.js
Frontend/js/pages/profile.js
Frontend/js/pages/tasks.js
Frontend/js/services/authService.js
Frontend/js/services/authService.test.mjs
Frontend/js/services/calendarService.js
Frontend/js/services/calendarService.test.mjs
Frontend/js/services/courseService.js
Frontend/js/services/priorityService.js
Frontend/js/services/smartService.js
Frontend/js/services/storageService.js
Frontend/js/services/storageService.test.mjs
Frontend/js/services/studyScheduleService.js
Frontend/js/services/taskService.js
Frontend/js/shared/calendar-time.js
Frontend/js/shared/notifications.js
Frontend/js/shared/shell.js
Frontend/js/shared/shell.test.mjs
Frontend/js/shared/ui.js
Frontend/source/background/dashboard_dark.png
Frontend/source/background/dashboard_light.png
Frontend/source/background/login.png
Frontend/source/google.png
Frontend/source/hide.png
Frontend/source/logo.png
README.md
docs/.DS_Store
docs/CONTEXT.md
docs/ClassDiagram.drawio.png
docs/UseCaseDiagram.png
docs/WorkFlow.drawio.png
docs/data-contract.md
docs/module-interface.md
docs/studyflow-brief.md
package.json
server/.gitignore
server/data.db
server/package-lock.json
server/package.json
server/src/app.js
server/src/config/database.js
server/src/controllers/authController.js
server/src/controllers/courseController.js
server/src/controllers/taskController.js
server/src/firebase.js
server/src/firebaseAdmin.js
server/src/middleware/authenticate.js
server/src/routes/authRoutes.js
server/src/routes/courseRoutes.js
server/src/routes/smartRoutes.js
server/src/routes/taskRoutes.js
server/src/server.js
server/src/services/taskValidation.js
server/test/auth.test.js
server/test/database.test.js
```

Local generated/ignored items: root and server node_modules, root package-lock.json, root .DS_Store. Keep installed dependencies and local state; do not classify third-party code as application dead code.

## File classifications and migration plan

KEEP = retain responsibility; MOVE = relocate with references; MERGE = remove wrapper/module after merging; REFACTOR = internal simplification; DELETE = repository reference search proves no application consumer; DO NOT TOUCH = persisted data, historical artifacts, or uncertain external use. These are proposed classifications, not deletion records.

| Current file | Classification | Destination / usage evidence |
|---|---|---|
| `.github/workflows/deploy.yml` | REFACTOR | Update source packaging paths; keep deployed HTML URLs. |
| `.gitignore` | KEEP | Repository configuration; not application dead code. |
| `.vscode/settings.json` | KEEP | Repository configuration; not application dead code. |
| `Frontend/css/auth.css` | MOVE | FE/css/auth.css; styles linked by HTML, shared cascade retained; dead-selector candidates need review. |
| `Frontend/css/calendar.css` | MOVE | FE/css/calendar.css; styles linked by HTML, shared cascade retained; dead-selector candidates need review. |
| `Frontend/css/course.css` | MOVE | FE/css/course.css; styles linked by HTML, shared cascade retained; dead-selector candidates need review. |
| `Frontend/css/dashboard.css` | MOVE | FE/css/dashboard.css; styles linked by HTML, shared cascade retained; dead-selector candidates need review. |
| `Frontend/css/global.css` | MOVE | FE/css/global.css; styles linked by HTML, shared cascade retained; dead-selector candidates need review. |
| `Frontend/css/info-pages.css` | MOVE | FE/css/info-pages.css; styles linked by HTML, shared cascade retained; dead-selector candidates need review. |
| `Frontend/css/ui/light_dark.css` | MOVE | FE/css/ui/light_dark.css; styles linked by HTML, shared cascade retained; dead-selector candidates need review. |
| `Frontend/html/about.html` | MOVE | FE/pages/about.html; active page entry. |
| `Frontend/html/calendar.html` | MOVE | FE/pages/calendar.html; active page entry. |
| `Frontend/html/course-detail.html` | MOVE | FE/pages/course-detail.html; active page entry. |
| `Frontend/html/course.html` | MOVE | FE/pages/course.html; active page entry. |
| `Frontend/html/dashboard.html` | MOVE | FE/pages/dashboard.html; active page entry. |
| `Frontend/html/index.html` | MOVE | FE/pages/index.html; active page entry. |
| `Frontend/html/profile.html` | MOVE | FE/pages/profile.html; active page entry. |
| `Frontend/html/tasks.html` | MOVE | FE/pages/tasks.html; active page entry. |
| `Frontend/html/ui/light_dark.html` | DO NOT TOUCH | Unreferenced fragment but copied by deployment; NEEDS REVIEW; preserve as FE/pages/ui/light_dark.html. |
| `Frontend/js/app.js` | MOVE | FE/app.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/app.test.mjs` | MOVE | FE/app.test.mjs; reachable via app/page/service imports or test runner. |
| `Frontend/js/components/modal.js` | MOVE | FE/components/modal.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/components/schedule-picker.js` | MOVE | FE/components/schedule-picker.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/components/task-ui.js` | REFACTOR | FE/components/task-ui.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/config.js` | MOVE | FE/config.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/firebase.js` | MOVE | FE/firebase.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/pages/auth.js` | MOVE | FE/pages/auth.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/pages/calendar.js` | MOVE | FE/pages/calendar.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/pages/course-detail.js` | REFACTOR | FE/pages/course-detail.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/pages/courses.js` | REFACTOR | FE/pages/courses.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/pages/dashboard.js` | REFACTOR | FE/pages/dashboard.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/pages/profile.js` | MOVE | FE/pages/profile.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/pages/tasks.js` | REFACTOR | FE/pages/tasks.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/services/authService.js` | MOVE | FE/services/authService.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/services/authService.test.mjs` | MOVE | FE/services/authService.test.mjs; reachable via app/page/service imports or test runner. |
| `Frontend/js/services/calendarService.js` | MOVE | FE/services/calendarService.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/services/calendarService.test.mjs` | MOVE | FE/services/calendarService.test.mjs; reachable via app/page/service imports or test runner. |
| `Frontend/js/services/courseService.js` | MOVE | FE/services/courseService.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/services/priorityService.js` | DELETE | Re-export only; sole importer is unreachable studyScheduleService; active pages import smartService. |
| `Frontend/js/services/smartService.js` | REFACTOR | FE/services/smartService.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/services/storageService.js` | MOVE | FE/services/apiClient.js; shared HTTP client, not local persistence. |
| `Frontend/js/services/storageService.test.mjs` | MOVE | FE/services/apiClient.test.mjs; shared HTTP client, not local persistence. |
| `Frontend/js/services/studyScheduleService.js` | DELETE | generateStudySchedule has no caller; manual calendar uses calendarService. |
| `Frontend/js/services/taskService.js` | REFACTOR | FE/services/taskService.js; reachable via app/page/service imports or test runner. |
| `Frontend/js/shared/calendar-time.js` | MOVE | FE/utils/calendar-time.js; calendar calculations consumed by calendar/picker/tests. |
| `Frontend/js/shared/notifications.js` | MOVE | FE/components/notifications.js; shell/UI/notifications and tests. |
| `Frontend/js/shared/shell.js` | MOVE | FE/components/shell.js; shell/UI/notifications and tests. |
| `Frontend/js/shared/shell.test.mjs` | MOVE | FE/components/shell.test.mjs; shell/UI/notifications and tests. |
| `Frontend/js/shared/ui.js` | MOVE | FE/components/ui.js; shell/UI/notifications and tests. |
| `Frontend/source/background/dashboard_dark.png` | MOVE | FE/assets/background/dashboard_dark.png; referenced by HTML or CSS. |
| `Frontend/source/background/dashboard_light.png` | MOVE | FE/assets/background/dashboard_light.png; referenced by HTML or CSS. |
| `Frontend/source/background/login.png` | MOVE | FE/assets/background/login.png; referenced by HTML or CSS. |
| `Frontend/source/google.png` | MOVE | FE/assets/google.png; referenced by HTML or CSS. |
| `Frontend/source/hide.png` | MOVE | FE/assets/hide.png; referenced by HTML or CSS. |
| `Frontend/source/logo.png` | MOVE | FE/assets/logo.png; referenced by HTML or CSS. |
| `README.md` | REFACTOR | Explain actual layout, startup, ownership and preserved discrepancies. |
| `docs/.DS_Store` | DELETE | OS metadata; no application consumer. |
| `docs/CONTEXT.md` | DO NOT TOUCH | Historical requirements/diagrams; document runtime differences separately. |
| `docs/ClassDiagram.drawio.png` | DO NOT TOUCH | Historical requirements/diagrams; document runtime differences separately. |
| `docs/UseCaseDiagram.png` | DO NOT TOUCH | Historical requirements/diagrams; document runtime differences separately. |
| `docs/WorkFlow.drawio.png` | DO NOT TOUCH | Historical requirements/diagrams; document runtime differences separately. |
| `docs/data-contract.md` | DO NOT TOUCH | Historical requirements/diagrams; document runtime differences separately. |
| `docs/module-interface.md` | DO NOT TOUCH | Historical requirements/diagrams; document runtime differences separately. |
| `docs/studyflow-brief.md` | DO NOT TOUCH | Historical requirements/diagrams; document runtime differences separately. |
| `package.json` | REFACTOR | Keep root npm entry commands targeting BE; root ESM scope serves FE/tests. |
| `server/.gitignore` | MOVE | BE/.gitignore; npm metadata/ignore configuration. |
| `server/data.db` | DO NOT TOUCH | Move bytes intact to BE/data.db with backend; preserve hash and environment override. |
| `server/package-lock.json` | MOVE | BE/package-lock.json; npm metadata/ignore configuration. |
| `server/package.json` | MOVE | BE/package.json; npm metadata/ignore configuration. |
| `server/src/app.js` | MOVE | BE/app.js; application/middleware runtime dependency. |
| `server/src/config/database.js` | MOVE | BE/models/database.js; all persistence and migration initialization. |
| `server/src/controllers/authController.js` | REFACTOR | Split HTTP handling into BE/routes and business/database operations into BE/services; preserve response shapes/errors/order. |
| `server/src/controllers/courseController.js` | REFACTOR | Split HTTP handling into BE/routes and business/database operations into BE/services; preserve response shapes/errors/order. |
| `server/src/controllers/taskController.js` | REFACTOR | Split HTTP handling into BE/routes and business/database operations into BE/services; preserve response shapes/errors/order. |
| `server/src/firebase.js` | DELETE | Unimported browser Firebase/Analytics setup in CommonJS backend; actual Google auth uses FE firebase and backend firebaseAdmin. |
| `server/src/firebaseAdmin.js` | MOVE | BE/firebaseAdmin.js; application/middleware runtime dependency. |
| `server/src/middleware/authenticate.js` | MOVE | BE/middleware/authenticate.js; application/middleware runtime dependency. |
| `server/src/routes/authRoutes.js` | MERGE | BE/routes/authRoutes.js; merge controller HTTP handling into route module. |
| `server/src/routes/courseRoutes.js` | MERGE | BE/routes/courseRoutes.js; merge controller HTTP handling into route module. |
| `server/src/routes/smartRoutes.js` | MERGE | BE/routes/smartRoutes.js; merge controller HTTP handling into route module. |
| `server/src/routes/taskRoutes.js` | MERGE | BE/routes/taskRoutes.js; merge controller HTTP handling into route module. |
| `server/src/server.js` | MOVE | BE/server.js; application/middleware runtime dependency. |
| `server/src/services/taskValidation.js` | MERGE | BE/services/taskService.js; task creation/update validation. |
| `server/test/auth.test.js` | MOVE | BE/tests/auth.test.js; retain integration/migration tests. |
| `server/test/database.test.js` | MOVE | BE/tests/database.test.js; retain integration/migration tests. |

## Imports and dependencies

Direct npm dependencies: backend better-sqlite3, cors, dotenv, express, firebase-admin; development nodemon. Root firebase is unused by repository module imports. Transitive dependency versions are recorded in server/package-lock.json (keep lockfile). Node built-ins: crypto, path, assert/strict, fs, fs/promises, os, test. Browser APIs: DOM/events, fetch, URL/URLSearchParams, FormData, localStorage, Intl, crypto.randomUUID, drag/drop, pointer capture, Web Animations, matchMedia, history and view-transition feature checks. External assets: Google Fonts (Nunito/Plus Jakarta Sans), Firebase 12.19.0 gstatic modules; README badge images. No Python/Flask runtime.

Literal module dependency inventory follows (test imports included):

- `Frontend/js/app.js` ? `./pages/auth.js`, `./pages/dashboard.js`, `./pages/courses.js`, `./pages/course-detail.js`, `./pages/tasks.js`, `./pages/calendar.js`, `./shared/ui.js`, `./pages/profile.js`, `./shared/shell.js`, `./services/authService.js`
- `Frontend/js/app.test.mjs` ? `node:assert/strict`, `node:fs/promises`
- `Frontend/js/components/modal.js` ? `../shared/ui.js`
- `Frontend/js/components/schedule-picker.js` ? `../shared/calendar-time.js`
- `Frontend/js/components/task-ui.js` ? `../services/courseService.js`, `../services/taskService.js`, `../shared/ui.js`, `./modal.js`
- `Frontend/js/config.js` ? (none)
- `Frontend/js/firebase.js` ? `https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js`, `https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js`
- `Frontend/js/pages/auth.js` ? `../services/authService.js`, `../shared/ui.js`, `../shared/shell.js`, `https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js`, `../firebase.js`
- `Frontend/js/pages/calendar.js` ? `../services/taskService.js`, `../services/courseService.js`, `../services/calendarService.js`, `../services/smartService.js`, `../shared/ui.js`, `../shared/shell.js`, `../components/schedule-picker.js`, `../shared/calendar-time.js`
- `Frontend/js/pages/course-detail.js` ? `../services/courseService.js`, `../services/taskService.js`, `../services/smartService.js`, `../shared/ui.js`, `../components/modal.js`, `../components/task-ui.js`, `../shared/shell.js`
- `Frontend/js/pages/courses.js` ? `../services/courseService.js`, `../services/taskService.js`, `../shared/ui.js`, `../components/modal.js`, `../components/task-ui.js`, `../shared/shell.js`
- `Frontend/js/pages/dashboard.js` ? `../services/courseService.js`, `../services/taskService.js`, `../services/smartService.js`, `../shared/ui.js`, `../shared/shell.js`, `../components/task-ui.js`
- `Frontend/js/pages/profile.js` ? `../services/authService.js`, `../shared/shell.js`
- `Frontend/js/pages/tasks.js` ? `../services/courseService.js`, `../services/taskService.js`, `../services/smartService.js`, `../shared/ui.js`, `../components/modal.js`, `../components/task-ui.js`, `../shared/shell.js`
- `Frontend/js/services/authService.js` ? `./storageService.js`, `https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js`, `../firebase.js`
- `Frontend/js/services/authService.test.mjs` ? `node:assert/strict`, `./authService.js`
- `Frontend/js/services/calendarService.js` ? `./authService.js`
- `Frontend/js/services/calendarService.test.mjs` ? `node:assert/strict`, `./authService.js`, `./calendarService.js`, `../shared/calendar-time.js`
- `Frontend/js/services/courseService.js` ? `./storageService.js`
- `Frontend/js/services/priorityService.js` ? `./smartService.js`
- `Frontend/js/services/smartService.js` ? `./taskService.js`
- `Frontend/js/services/storageService.js` ? `../config.js`
- `Frontend/js/services/storageService.test.mjs` ? `node:assert/strict`, `./storageService.js`, `./courseService.js`, `./taskService.js`, `./authService.js`
- `Frontend/js/services/studyScheduleService.js` ? `./priorityService.js`
- `Frontend/js/services/taskService.js` ? `./storageService.js`
- `Frontend/js/shared/calendar-time.js` ? `../services/smartService.js`
- `Frontend/js/shared/notifications.js` ? `../services/authService.js`, `../services/courseService.js`, `../services/taskService.js`, `../services/smartService.js`, `./ui.js`
- `Frontend/js/shared/shell.js` ? `../services/authService.js`, `../services/taskService.js`, `./ui.js`, `./notifications.js`
- `Frontend/js/shared/shell.test.mjs` ? `node:assert/strict`, `./shell.js`
- `Frontend/js/shared/ui.js` ? (none)
- `server/src/app.js` ? `express`, `cors`, `./routes/authRoutes`, `./routes/courseRoutes`, `./routes/taskRoutes`, `./routes/smartRoutes`, `./middleware/authenticate`
- `server/src/config/database.js` ? `better-sqlite3`, `node:path`
- `server/src/controllers/authController.js` ? `crypto`, `../config/database`, `../firebaseAdmin`, `../middleware/authenticate`
- `server/src/controllers/courseController.js` ? `../config/database`, `crypto`
- `server/src/controllers/taskController.js` ? `../config/database`, `crypto`, `../services/taskValidation`
- `server/src/firebase.js` ? `https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js`, `https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js`, `https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js`
- `server/src/firebaseAdmin.js` ? `firebase-admin/app`, `firebase-admin/auth`
- `server/src/middleware/authenticate.js` ? `crypto`, `../config/database`
- `server/src/routes/authRoutes.js` ? `express`, `../controllers/authController`, `../middleware/authenticate`
- `server/src/routes/courseRoutes.js` ? `express`, `../controllers/courseController`, `../middleware/authenticate`
- `server/src/routes/smartRoutes.js` ? `express`, `../controllers/taskController`
- `server/src/routes/taskRoutes.js` ? `express`, `../controllers/taskController`, `../middleware/authenticate`
- `server/src/server.js` ? `dotenv`, `./app`, `./config/database.js`
- `server/src/services/taskValidation.js` ? (none)
- `server/test/auth.test.js` ? `node:assert/strict`, `node:fs`, `node:os`, `node:path`, `node:test`, `../src/app`, `../src/config/database`
- `server/test/database.test.js` ? `node:assert/strict`, `node:fs`, `node:os`, `node:path`, `node:test`, `better-sqlite3`, `../src/config/database`

## Dead functions, overlap and unclear boundaries

- Unreachable from app: smartService.getGlobalRecommendations/getLocalRecommendations/recommended_global/getWorkloadWarning/getRiskOverview; taskService.getOverdueTasks/updateTaskProgress/setProgress; task-ui.warningList/taskDetails/wireExpandable. Remove only after checking final callers. wireTaskSort is deliberately retained for the approved restoration.
- Unused bindings: taskDetails.taskNameField; courses.initCourseManagement parameter u; tasks bulk-completion callback failed binding; server.js server variable. Name aliases used by pages are active and should migrate callers before alias deletion.
- Duplicate generateId wrappers in three controllers can be replaced with direct prefixed crypto.randomUUID calls.
- Course create has an unreachable second empty-name check after an identical earlier guard. Safe removal.
- Task SQL projections/ownership queries recur in listing, detail, updates, completion and smart requests. Consolidate into task service without changing selection/order/response fields.
- Smart calculations duplicated across FE smartService and taskController: same nominal weights/workload; different urgency/warnings/coercion/ranking. Extract backend rules into backend service, preserve discrepancy by explicit user instruction.
- Dashboard risk ordering differs from unused getRiskOverview. Do not replace one with the other: it changes order.
- Task rows duplicate expansion/click/keyboard handlers across tasks and course-detail. Consolidate as a reusable UI function, retaining course-only measurement behavior.
- Profile initials duplicated in profile and shell. Reuse one small existing UI module export.
- modal.js handles generic modal plus task-specific date/time/select/range widgets; calendar has its own modal and different picker behavior. NEEDS REVIEW: merging these wholesale could change focus, events and selection behavior.
- task-ui.js combines course form, task form, task rendering, completion actions, and dead legacy rendering. Delete dead branches and keep cohesive UI functions; do not split each function into a file.
- calendar.js combines page coordination and calendar rendering; large but cohesive. Retain rather than add layers.
- Backend controllers mix request/response, validation, SQL, authorization, completion history and scoring. Separate HTTP routes from business services using plain functions; database initialization remains one model module.
- Repeated client/server validation is intentional at separate trust boundaries; preserve server validation regardless of client checks.

## CSS audit

Repeated selectors are not proof of redundancy: media queries, theme variants and later cascade overrides are behavior. Dynamic class families (group-${key}, status-${status}, priority names) make naive reference removal unsafe. Preserve uncertain selectors. The following literal class names have no token reference in HTML/JS/tests; they are NEEDS REVIEW candidates, not approved bulk deletions.

- `Frontend/css/auth.css`: 1229 lines; 40 repeated selector strings; candidates: `.cta-cat`, `.cta-note`, `.feature-cat`, `.feature-row`, `.hero-art`, `.hero-note`, `.hero-plant`, `.peek-cat`, `.right`, `.why-cat`.
- `Frontend/css/calendar.css`: 576 lines; 4 repeated selector strings; candidates: none.
- `Frontend/css/course.css`: 1701 lines; 87 repeated selector strings; candidates: `.btn-ghost`, `.bulk-delete-form`, `.course-overview`, `.course-rays`, `.course-stat`, `.course-stats`, `.course-summary`, `.course-summary-row`, `.group-completed`, `.group-overdue`, `.small-btn`, `.status-completed`, `.status-not-started`, `.success-text`, `.task-actions`, `.task-course`, `.task-name`, `.task-priority`, `.task-sub`, `.task-table-head`.
- `Frontend/css/dashboard.css`: 2276 lines; 112 repeated selector strings; candidates: `.attention-alert`, `.breakdown-title`, `.completed-stat`, `.course-book`, `.course-empty`, `.course-progress-label`, `.course-top`, `.courses-overview`, `.dash-head`, `.due-stat`, `.empty-mascot`, `.empty-state`, `.greeting-wave`, `.hero-art`, `.hero-kicker`, `.hero-mascot`, `.hero-note`, `.hero-sparkles`, `.overdue-stat`, `.overview-head`, `.priority-badge`, `.progress-counts`, `.progress-large`, `.progress-value`, `.rank`, `.recommend`, `.recommend-list`, `.recommendation-actions`, `.recommendation-card`, `.recommendation-copy`, `.recommendation-course`, `.recommendation-header`, `.recommendation-meta`, `.recommendation-progress`, `.recommendation-side`, `.recommendation-status`, `.stat-icon`, `.task-breakdown`, `.task-check`, `.warning-color`.
- `Frontend/css/global.css`: 632 lines; 16 repeated selector strings; candidates: `.btn-ghost`, `.course-stat`, `.course-summary-row`, `.drawer`, `.feature-chip`, `.muted`, `.task-name`.
- `Frontend/css/info-pages.css`: 38 lines; 4 repeated selector strings; candidates: none.
- `Frontend/css/ui/light_dark.css`: 78 lines; 0 repeated selector strings; candidates: none.

## Proposed target

```text
StudyFlow/ (existing checkout root; do not rename its parent directory)
  FE/
    app.js, config.js, firebase.js, app.test.mjs
    pages/        HTML and page JS together; same HTML filenames
    components/   UI, shell, notifications, task UI, modal, picker
    services/     apiClient, auth, courses, tasks, smart rules, calendar persistence
    utils/        calendar time helpers only
    css/          preserve cascade and theme stylesheet
    assets/       existing image assets
  BE/
    app.js, server.js, firebaseAdmin.js
    routes/       HTTP handlers
    services/     plain business/data operations and server smart rules
    models/       database initialization/migrations
    middleware/   cookie/session authentication
    tests/        API and migration regression checks
    package.json, package-lock.json, data.db, .gitignore
  README.md, .gitignore, package.json
  docs/           audit, report and historical project documents
  .github/        deployment workflow
  .vscode/        existing local-server configuration
```

Keep repository metadata/docs and package manifests: moving them into FE/BE merely to force a four-entry root would break tooling or discard useful documentation. No factory/repository/base class layer is proposed.

## Safe deletion / merge order

1. Record baseline: npm test passed 8/8; retain baseline source snapshot for differential checks.
2. Move source/assets/tests and update imports, HTML/CSS paths, npm scripts, README and deploy workflow together. Preserve database bytes; no application startup against user data.
3. Merge HTTP controllers into route modules and extract backend business functions. Preserve validation order and status/body contracts.
4. Remove unreferenced Firebase copy, unused automatic schedule module and its priority re-export; remove dead helpers only after complete caller search. Keep light_dark fragment and uncertain CSS.
5. Restore drag sorting only as separately approved; preserve session-local order and refresh recommendation synchronously.
6. Run baseline tests, new characterization/regression checks, syntax/import/asset scans and browser checks if available. Compare all unaffected source transformations and API response shapes. Report limits honestly.

## Validation at audit time

`npm test`: 8 passed, 0 failed (Node v24.20.0). These tests cover startup sequencing, HTTP errors, mock Google token exchange/profile, calendar persistence/time helpers, profile menu/read state, API session/ownership/CRUD/completion, and legacy student migration. They do NOT establish browser UI equivalence, live Google sign-in, password reset UI, smart boundary/tie-break behavior or row drag sorting. Browser verification and additional regression checks are required after changes.
