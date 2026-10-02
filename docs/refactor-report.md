# StudyFlow refactor report

## Outcome and limits

Implemented the structural refactor and the separately approved task-row drag-and-drop repair. Production HTML/CSS/JS decreased from **55 files / 10,910 lines** to **51 files / 10,489 lines** (421 fewer lines). Counts exclude tests, dependencies and documentation.

The repository has been inspected and automated checks pass. **Full UI verification is not complete:** the browser tool returned ?No browser is available.? Visual layout, native pointer/touch interactions and live Google sign-in are not claimed as verified. Conflicting frontend/backend smart rules remain deliberately separate by user instruction. No remote deployment was performed.

## 1. Old structure

```text
Frontend/
  html/             Page HTML and standalone theme fragment
  js/
    pages/          Page controllers
    components/     Modals, task UI and picker
    services/       API, auth, tasks, courses, calendar and overlapping smart modules
    shared/         Shell, notifications, UI and calendar utilities
    app.js, config.js, firebase.js
  css/, source/
server/
  src/
    controllers/    Mixed HTTP, validation, SQL and smart rules
    routes/         Mostly controller forwarding
    services/       Task validation only
    config/         Database and migrations
    middleware/     Sessions
    app.js, server.js, firebase.js, firebaseAdmin.js
  test/, package.json, package-lock.json, data.db
docs/, .github/, .vscode/, package.json, README.md, .gitignore
```

The [pre-change audit](refactor-audit.md) contains the full original file tree, every file classification, imports/dependencies, dead-code candidates and affected features.

## 2. New structure

```text
FE/
  pages/            HTML + page JS
  components/       Reusable rendering and interaction
  services/         API, auth, task/course operations, browser smart rules, calendar persistence
  utils/            Calendar time calculations
  css/, assets/
  app.js, app.test.mjs, config.js, firebase.js
BE/
  routes/           HTTP parsing/status/responses
  services/         Plain auth/course/task business functions, validation and SQL
  models/           Database schema, initialization and migrations
  middleware/       Cookie/session authentication
  tests/            API, migration and server smart-rule checks
  app.js, server.js, firebaseAdmin.js
  package.json, package-lock.json, data.db, .gitignore
docs/, .github/, .vscode/, package.json, README.md, .gitignore
```

Express was retained as explicitly approved. No Flask rewrite, factories, repositories, managers or base classes were added. Repository documentation and tool metadata remain at the root where appropriate.

## 3. Files deleted outright

| Original file | Proof / affected feature |
|---|---|
| `Frontend/js/services/studyScheduleService.js` | No caller of generateStudySchedule. Active manual calendar uses calendarService, not this automatic scheduler. |
| `Frontend/js/services/priorityService.js` | Re-export only; sole importer was the unreachable automatic scheduler. Active pages already used smartService. |
| `server/src/firebase.js` | No backend importer; browser-only CDN Firebase/Analytics code under CommonJS. Active Google login uses FE/firebase.js and BE/firebaseAdmin.js. |
| `docs/.DS_Store` | OS metadata; no application reference. |

No uncertain file was deleted. All six source images and the existing database were moved intact. The standalone theme HTML fragment remains, despite having no app reference, because deployment shipped it.

## 4. Files merged / responsibilities extracted

- `server/src/controllers/authController.js` ? `BE/services/authService.js` (business operations) + `BE/routes/authRoutes.js` (HTTP and session response handling).
- `server/src/controllers/courseController.js` ? `BE/services/courseService.js` + `BE/routes/courseRoutes.js`.
- `server/src/controllers/taskController.js` ? `BE/services/taskService.js` + task/smart route modules.
- `server/src/services/taskValidation.js` ? `BE/services/taskService.js`, shared by creation/update.
- The original four route modules were replaced at `BE/routes/`; their mounts, verbs and response shapes remain.
- Public student projection moved from session middleware to authService; HTTP services no longer depend on middleware.
- Duplicate task-row expansion/click/keyboard code from tasks/course-detail ? `FE/components/task-ui.js::wireTaskRows`.
- Duplicate profile initials formatting ? existing `FE/components/ui.js`.

## 5. File migration map

| Original path/pattern | New location |
|---|---|
| `Frontend/html/*.html` | `FE/pages/*.html` (all eight entry pages) |
| `Frontend/html/ui/light_dark.html` | `FE/pages/ui/light_dark.html` |
| `Frontend/js/pages/*.js` | `FE/pages/*.js` (all seven page modules) |
| `Frontend/js/components/*.js` | `FE/components/*.js` |
| `Frontend/js/shared/ui.js`, `shell.js`, `notifications.js`, `shell.test.mjs` | `FE/components/` with original filenames |
| `Frontend/js/shared/calendar-time.js` | `FE/utils/calendar-time.js` |
| `Frontend/js/services/storageService.js`, `storageService.test.mjs` | `FE/services/apiClient.js`, `apiClient.test.mjs` |
| Other retained `Frontend/js/services/*` | `FE/services/` with original filenames |
| `Frontend/js/app.js`, `app.test.mjs`, `config.js`, `firebase.js` | `FE/` with original filenames |
| `Frontend/css/*` | `FE/css/*` including theme subdirectory |
| `Frontend/source/*` | `FE/assets/*` including backgrounds |
| `server/src/app.js`, `server.js`, `firebaseAdmin.js` | `BE/` with original filenames |
| `server/src/middleware/authenticate.js` | `BE/middleware/authenticate.js` |
| `server/src/config/database.js` | `BE/models/database.js` |
| `server/test/*` | `BE/tests/*` |
| `server/package.json`, `package-lock.json`, `.gitignore`, `data.db` | `BE/` with original filenames |

Imports, local HTML assets, CSS image paths, test paths, npm commands and deployment packaging were updated. The database default is still backend-relative; STUDYFLOW_DB_PATH remains supported. SHA-256 before/after matched. Root ignore exceptions preserve the already-versioned backend database and lockfile after relocation.

## 6. Duplication and dead code removed

- Removed unused smart fetch wrappers, recommendation alias, unused warning/risk list functions, obsolete progress/overdue wrappers and active short aliases after migrating every caller to descriptive task API names.
- Removed dead taskDetails/warningList/wireExpandable UI branches and the no-op updateDisplayOrder API placeholder.
- Removed duplicate ID wrapper functions in favor of direct prefixed crypto.randomUUID calls.
- Removed the unreachable second course-name validation guard.
- Consolidated repeated backend task ownership lookups and reused the task list query for `/smart`.
- Removed the repeated remaining-workload calculation inside backend workload scoring.
- Removed 16 CSS rule blocks requiring absent static classes: hero-plant (including left/right), peek-cat, feature-cat, why-cat (including left/right), cta-cat and cta-note, including responsive variants. Mixed selectors and uncertain classes remain.
- Removed the root Firebase npm dependency: actual browser SDK imports use gstatic URLs. Backend firebase-admin and its lockfile remain.

No broad CSS purge was performed. Dynamic class families, media rules, theme variants and cascade overrides remain unless non-use was established.

## 7. Architecture and approved drag repair

Services now operate on data; routes handle HTTP; page/components render. apiClient is named for its actual responsibility instead of implying local storage. smartService no longer imports task API operations, so its browser calculations can be tested independently.

Task-row dragging is now connected on All Tasks and Course Detail. Manual ordering exists only in each page instance, respects currently displayed rows, survives re-render/filtering and resets when a different sort is chosen. Course Recommended next updates synchronously on drop using the first incomplete task in the manual order. Pointer cancellation restores the prior order; row activation is suppressed immediately after dragging. No database/API/storage contract was added. Calendar scheduling behavior remains separate.

## 8. Tests and validation

| Check | Result |
|---|---|
| Before edits: `npm test` | 8 passed, 0 failed |
| After changes: `npm test` | 11 passed, 0 failed |
| Backend package command: `npm test --prefix BE` | 4 passed, 0 failed |
| API differential run against pre-change source | 59 responses and Set-Cookie values match, covering registration/login/profile/reset/logout, validation, aliases, course/task CRUD, completion/reopening, errors and smart results |
| Frontend differential smart matrix | 2,940 cases match across deadlines, importance, estimates and progress; full ranking and notification arrays match |
| Backend differential smart matrix | Same 2,940 task inputs match original API enrichment/ranking |
| Syntax/import graph | 45 JS/MJS files checked; no broken local imports or circular paths |
| Actual module loading | All FE page/component/service/utility modules imported successfully under Node with a minimal window stub |
| HTML preservation | All nine HTML files equal baseline except app/assets path updates |
| Deployment layout simulation | Source/deployed HTML links and local asset references resolve; deployed JS import paths resolve |
| Existing data | BE/data.db SHA-256 unchanged; test databases isolated |
| Browser tool | No browser available; visual/end-to-end checks remain outstanding |

New runnable regression checks are `FE/services/smartService.test.mjs`, `FE/components/task-sort.test.mjs`, and `BE/tests/smart.test.js`. The drag check executes the real pointer handlers with small DOM doubles and checks synchronous callback/cancellation. It is not a real browser test. One-time baseline comparison and build simulation artifacts are under ignored `.scratch/`; the permanent tests do not depend on them.

### Feature verification limits

- Authentication/registration/login/profile: local API integration and frontend service checks; live Google sign-in not exercised.
- Password reset: API behavior matched baseline; broken existing form deliberately preserved.
- Course/task CRUD, progress/completion/reopening/ownership: API integration and differential checks passed.
- Sorting/ranking/priority/warnings: characterization matrix passed; actual rendered controls not visually exercised.
- Manual ordering/drop callback: handler regression passed; native browser pointer/touch behavior needs a smoke test.
- Dashboard updates/course display/recommendation markup: caller/event paths inspected; HTML preservation checked; full browser rendering pending.
- Calendar: existing time/range/persistence tests passed; actual calendar drag gestures pending.

## 9. Remaining suspicious code

1. `FE/services/smartService.js` versus `BE/services/taskService.js`: urgency, rounding/coercion, overdue warnings and tie-breaking differ. Explicitly retained.
2. API rank comparator uses Date object identity; equal deadline values skip later tie-breaks. Preserved rather than silently repaired.
3. `FE/services/smartService.js::getUserNotifications` emits title/message while notifications UI expects taskId/type. Notification detail/read-state behavior needs a separate contract repair.
4. `FE/pages/index.html` reset form omits confirmPassword expected by auth page/API.
5. Missing illustrations referenced in modal.js/courses.js: assets/studyflow-note/task_1.png, assets/studyflow-note/small_step_big_progress.png, assets/studyflow-mascot-pack/cat-thinking.png. These predate the refactor.
6. Calendar sessions are not deleted when tasks/courses are deleted; calendar service also does not enforce all ownership rules claimed in historical docs.
7. modal.js and schedule-picker.js have similar but behaviorally different date/time widgets. Kept to avoid changes to focus/events/selection.
8. Uncertain CSS selectors and repeated cascade rules are listed in the audit. Theme fragment remains NEEDS REVIEW.
9. Historical docs contain obsolete field/formula/module descriptions; the README and audit explain current runtime behavior without rewriting the historical contracts.
10. Existing prototype authentication security semantics and global task-change events (published on completion, not every mutation) remain unchanged.

## 10. Changes not performed / approval status

- **Express retained:** explicitly approved; Flask migration not performed.
- **Smart-rule unification deferred:** user explicitly chose to preserve both behaviors. This means the requested single universal smart-rule implementation is not complete.
- **Task-row drag-and-drop repair:** explicitly approved and implemented.
- **Other behavior/contract repairs:** password-reset UI, notification payloads, API ranking tie-breaks, calendar deletion/validation and authentication redesign were not authorized and were not changed.
- **External host configuration:** not changed. A deployment using the old `server` root must point to `BE` before redeployment. GitHub Pages source packaging was updated locally; nothing was published.

## Responsibility reference

| Responsibility | Authoritative location |
|---|---|
| Bootstrap/session restoration | FE/app.js |
| HTTP client/error translation | FE/services/apiClient.js |
| Browser account/session operations | FE/services/authService.js |
| Course/task API operations | FE/services/courseService.js, taskService.js |
| Browser smart calculations/manual ordering | FE/services/smartService.js |
| Calendar persistence | FE/services/calendarService.js |
| Reusable task UI/drag events | FE/components/task-ui.js |
| Navigation/theme/notifications | FE/components/shell.js, notifications.js |
| Page rendering coordination | FE/pages/*.js |
| HTTP route contracts | BE/routes/*.js |
| Auth/course/task business operations | BE/services/*.js |
| Preserved server smart calculations | BE/services/taskService.js |
| Cookie authentication | BE/middleware/authenticate.js |
| SQLite schema/migrations | BE/models/database.js |
