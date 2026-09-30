# StudyFlow Data Contract

## 1. Purpose

This document defines the common data structures used by all StudyFlow modules.

All modules must use the same field names, data types, allowed values, and relationships defined in this document.

---

## 2. General Conventions

- ID type: String
- Date-time format: ISO 8601 String
- Duration unit: Hour
- Progress unit: Percentage
- Field naming convention: camelCase
- Missing optional value: null
- All IDs must be unique

---

## 3. Student

### Register Input

| Field | Type | Required | Default | Stored? | Description |
|---|---|---:|---|---|---|
| studentName | String | Yes | null | Yes | Student's display name |
| username | String | Yes | null | Yes | Unique login identifier |
| password | String | Yes | null | Yes | Password for prototype authentication |
| confirmPassword | String | Yes | null | No | Must match `password` |

### Login Input

| Field | Type | Required | Description |
|---|---|---:|---|
| username | String | Yes | Student username used for login |
| password | String | Yes | Account password |

### Reset Password Input

| Field | Type | Required | Stored? | Description |
|---|---|---:|---|---|
| username | String | Yes | No | Identifies the account |
| newPassword | String | Yes | Yes | Replaces the current password after successful validation |
| confirmPassword | String | Yes | No | Must match `newPassword` |

### Student Data

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| studentName | String | Yes | null | Student's display name |
| username | String | Yes | null | Unique identifier used for login |
| password | String | Yes | null | Password for prototype authentication |

### Account Validation

- `studentName` must not be empty and must be trimmed before being stored.
- `username` must not be empty and must be unique.
- `password` must meet the minimum length of 8 characters.
- `confirmPassword` must match `password` and must not be stored.
- `newPassword` must meet the minimum length of 8 characters.
- Reset-password `confirmPassword` must match `newPassword` and must not be stored.

<!--
Student example:

{
  "studentName": "John Doe",
  "username": "johndoe123",
  "password": "demo-password"
}
-->

---

## 4. Course

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| courseId | String | Yes | Generated | Unique course identifier |
| username | String | Yes | null | Username of the course owner |
| courseName | String | Yes | null | Course name |
| color | String or null | No | null | Optional course display color |

### Course Validation

- `courseName` must not be empty.
- `username` must refer to an existing student.
- `color` must be a valid CSS color if provided.

<!--
Course example:

{
  "courseId": "course-001",
  "username": "johndoe123",
  "courseName": "Deep Learning",
  "color": "#6C63FF"
}
-->

---

## 5. Task

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| taskId | String | Yes | Generated | Unique task identifier |
| courseId | String | Yes | null | ID of the Course containing the task |
| taskName | String | Yes | null | Task name |
| description | String | No | "" | Additional task information |
| deadline | ISO 8601 Date-Time String | Yes | null | Exact task deadline including date and time |
| importance | ImportanceLevel | Yes | "medium" | User-selected importance |
| estimatedDuration | Number or null | No | null | User-estimated duration in hours |
| currentProgress | Number | Yes | 0 | Current task progress |
| completed | Boolean | Yes | false | Whether the task is marked completed |
| createdAt | ISO 8601 Date-Time String | Yes | Current time | Task creation time |

### Task Validation

- `taskName` must not be empty.
- `courseId` must refer to an existing course.
- `deadline` must be a valid ISO 8601 date-time value.
- The exact deadline date and time are used to determine whether a task is overdue.
- `estimatedDuration` must be greater than 0 when provided.
- `estimatedDuration` must remain `null` if the user does not provide it.
- The default value of 2 hours is applied only when calculating remaining workload.
- `currentProgress` must be one of: 0, 25, 50, 75, 100.
- `completed` defaults to `Number(currentProgress) === 100` upon creation if not explicitly specified.
- A task is treated as completed when `completed === true` or `currentProgress === 100`.
- `taskStatus` is derived and is not stored.

<!--
Task example:

{
  "taskId": "task-001",
  "courseId": "course-001",
  "taskName": "Finish DL Lab",
  "description": "Complete the PyTorch exercise",
  "deadline": "2026-09-30T20:00:00.000Z",
  "importance": "high",
  "estimatedDuration": 6,
  "currentProgress": 50,
  "completed": false,
  "createdAt": "2026-09-28T09:00:00.000Z"
}
-->

---

## 6. CalendarSession

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| sessionId | String | Yes | Generated | Unique calendar session identifier |
| taskId | String | Yes | null | ID of the scheduled task |
| startTime | ISO 8601 Date-Time String | Yes | null | Scheduled study session start time |
| endTime | ISO 8601 Date-Time String | Yes | null | Scheduled study session end time |

### CalendarSession Validation

- An authenticated user session must exist (`getCurrentUser()` must not be `null`).
- `taskId` is required and must refer to an existing task.
- `startTime` and `endTime` are required and must be valid ISO 8601 date-time values.
- `endTime` must be strictly later than `startTime`.
- When updating a session, `sessionId` must match an existing `CalendarSession` and cannot be overwritten.
- Only incomplete tasks (`!completed` and `currentProgress < 100`) are eligible to be listed for scheduling.
- Both pending and overdue tasks can be scheduled.
- An overdue task remains schedulable so that the student can manually plan when to complete the unfinished work.
- A `CalendarSession` represents a manual study plan and does not modify the original task deadline.

<!--
CalendarSession example:

{
  "sessionId": "session-001",
  "taskId": "task-001",
  "startTime": "2026-10-01T14:00:00.000Z",
  "endTime": "2026-10-01T16:00:00.000Z"
}
-->

---

## 7. Allowed Values

### 7.1 Urgency

Urgency is determined using the task deadline date and time.

1. If the exact deadline date-time has passed, the task is overdue.
2. Otherwise, urgency is determined from the calendar-day difference between the current date and the deadline date.

| Time until deadline | Urgency Score |
|---|---:|
| > 7 days | 20 |
| 4 - 7 days | 40 |
| 2 - 3 days | 60 |
| 1 day | 80 |
| Today | 90 |
| Overdue | 100 |

### 7.2 ImportanceLevel

| Value | Importance Score |
|---|---:|
| very-low | 20 |
| low | 40 |
| medium | 60 |
| high | 80 |
| very-high | 100 |

### 7.3 TaskStatus

| Value | Meaning |
|---|---|
| completed | `completed === true` or progress is 100 |
| overdue | Task is incomplete and the exact deadline date-time has passed |
| pending | Task is incomplete and the deadline date-time has not passed |

### 7.4 CurrentProgress

| Level | Score |
|---|---:|
| not started | 0 |
| started | 25 |
| halfway | 50 |
| almost done | 75 |
| completed | 100 |

### 7.5 WorkloadScore

| Remaining Workload | Workload Score |
|---|---:|
| <= 1h | 20 |
| > 1h and <= 2h | 40 |
| > 2h and <= 4h | 60 |
| > 4h and <= 6h | 80 |
| > 6h | 100 |

---

## 8. Derived Task Values

The following values are calculated by relevant smart-feature services and are not stored.

| Field | Type | Stored? | Description |
|---|---|---:|---|
| urgencyScore | Number | No | Calculated from deadline |
| importanceScore | Number | No | Converted from importance level |
| remainingWorkload | Number | No | Remaining estimated work |
| workloadScore | Number | No | Calculated from remaining workload |
| priorityScore | Number | No | Final priority score |
| taskStatus | TaskStatus | No | Derived task status |
| hasWorkloadWarning | Boolean | No | Whether the task meets the workload-warning condition |

### 8.1 Remaining Workload

If `estimatedDuration` is provided:

```text
remainingWorkload =
    estimatedDuration * (1 - currentProgress / 100)
```

Otherwise:

```text
remainingWorkload =
    2 * (1 - currentProgress / 100)
```

The fallback value of 2 hours is used only for calculation and does not replace the stored `estimatedDuration` value.

### 8.2 Priority Score

```text
priorityScore =
    0.60 * urgencyScore
    + 0.25 * importanceScore
    + 0.15 * workloadScore
```

### 8.3 Task Status

```text
if completed == true OR currentProgress == 100
    status = completed

else if exact deadline date-time has passed
    status = overdue

else
    status = pending
```

### 8.4 Workload Warning

```text
if status == completed
    no warning

else if status == overdue
    show overdue

else if
    (urgencyScore >= 80 AND workloadScore >= 60)
    OR
    (urgencyScore >= 60 AND workloadScore >= 80)
    show workload warning

else
    no warning
```

An overdue state and a workload warning serve different purposes:

- `overdue` indicates that the task deadline has already passed.
- `workload warning` indicates that an incomplete task is becoming risky because of the combination of urgency and remaining workload.

### 8.5 Warning Display Order

Warning items are displayed in the following order:

1. Overdue incomplete tasks
2. Tasks with workload warning

---

## 9. WarningNotification

`WarningNotification` is derived for display purposes and is not stored.

| Field | Type | Description |
|---|---|---|
| taskId | String | ID of the task associated with the warning |
| deadline | ISO 8601 Date-Time String | Task deadline |
| remainingWorkload | Number | Remaining estimated hours |
| message | String | Warning shown to the student |

---

## 10. Relationships

- One Student can have zero or many Courses.
- One Course belongs to exactly one Student, identified by `username`.
- One Course can have zero or many Tasks.
- One Task belongs to exactly one Course, identified by `courseId`.
- One Task can have zero or many `CalendarSession` records, linked by `taskId`.

---

## 11. Deletion Rules

### 11.1 Delete Course

Before deleting a course, the system must display a confirmation.

If confirmed:

- the Course is deleted;
- all Tasks belonging to the Course are deleted;
- all `CalendarSession` records associated with those Tasks are also deleted.

### 11.2 Delete Task

Before deleting a task, the system must display a confirmation.

If confirmed:

- the Task is deleted;
- all `CalendarSession` records associated with that Task are also deleted.

---

## 12. Recommended Task View

The smart-priority service combines Task data with calculated priority values.

All non-completed tasks are included in recommendation ranking.

Completed tasks are excluded.

### Recommendation Sorting

Tasks are sorted by:

1. `priorityScore` DESC
2. `deadline` ASC
3. `importanceScore` DESC
4. `createdAt` ASC

<!--
Recommended Task example:

{
  "taskId": "task-001",
  "courseId": "course-001",
  "taskName": "Finish DL Lab",
  "deadline": "2026-09-30T20:00:00.000Z",
  "importance": "high",
  "estimatedDuration": 6,
  "currentProgress": 50,
  "completed": false,
  "remainingWorkload": 3,
  "urgencyScore": 90,
  "importanceScore": 80,
  "workloadScore": 60,
  "priorityScore": 83,
  "taskStatus": "pending",
  "hasWorkloadWarning": true
}
-->
