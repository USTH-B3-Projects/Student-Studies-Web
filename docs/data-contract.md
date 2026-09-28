# StudentStudies Data Contract

## 1. Purpose

This document defines the common data structures used by all
StudentStudies modules.

All modules must use the same field names, data types, allowed
values, and relationships defined in this document.

## 2. General Conventions

- ID type: String
- Date format: ISO 8601 String
- Duration unit: Hour
- Progress unit: Percentage
- Field naming convention: camelCase
- Missing optional value: null
- All IDs must be unique

## 3. Student

<b>Register Input</b>

| Field | Type | Required | Default | Stored? | Description |
|---|---|---:|---|---|---|
| studentName | String | Yes | null | Yes | Student's display name |
| username | String | Yes | null | Yes | Unique login identifier |
| password | String | Yes | null | Yes | Password for prototype authentication |
| confirmPassword | String | Yes | null | No | Must match `password` |

<b>Login Input</b>
| Field | Type | Required | Description |
|---|---|---:|---|
| username | String | Yes | Student username used for login |
| password | String | Yes | Account password |

<b>Reset Password Input</b>
| Field | Type | Required | Stored? | Description |
|---|---|---:|---|---|
| username | String | Yes | No | Identifies the account |
| newPassword | String | Yes | Yes | Replaces the current password after successful validation |
| confirmPassword | String | Yes | No | Must match `newPassword` |

<b>Stored Student Data</b>
| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| studentName | String | Yes | null | Student's display name |
| username | String | Yes | null | Unique identifier used for login |
| password | String | Yes | null | Password for prototype authentication |

### Account Validation

- `studentName` must not be empty, must be trimmed before being stored.
- `password` must meet the minimum length of 8 characters.
- `confirmPassword` must match `password` and must not be stored.
- `newPassword` must meet the minimum length of 8 characters.

<!--
Stored Student example:

{
  "studentName": "John Doe",
  "usernam": "johndoe123",
  "password": "demo-password",
}
-->

## 4. Course

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| courseId | String | Yes | Generated | Unique course identifier |
| username | String | Yes | null | username of the course owner |
| courseName | String | Yes | null | Course name |
| color | String or null | No | null | Optional course display color |

### Course Validation

- `courseName` must not be empty.
- `username` must refer to an existing student.
- `color` must be a valid CSS color if provided.

<!--{
  "courseId": "course-001",
  "username": "johndoe123",
  "courseName": "Deep Learning",
  "color": "#6C63FF"
}
-->

## 5. Task

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| taskId | String | Yes | Generated | Unique task identifier |
| courseId | String | Yes | null | ID of the Course containing the task |
| taskName | String | Yes | null | Task name |
| description | String | No | "" | Additional task information |
| deadline | ISO Date String | Yes | null | Task deadline |
| importance | ImportanceLevel | Yes | "medium" | User-selected importance |
| estimatedDuration | Number or null | No | null | User-estimated duration in hours |
| currentProgress | Number | Yes | 0 | Current task progress |
| createdAt | ISO Date String | Yes | Current time | Task creation time |

### Task Validation

- `taskName` must not be empty.
- `courseId` must refer to an existing course.
- `deadline` must be a valid date.
- `estimatedDuration` must be greater than 0 when provided.
- `estimatedDuration` must remain null if the user does not provide it.
- The default value of 2 hours is applied only when calculating remaining workload.
- `currentProgress` must be one of: 0, 25, 50, 75, 100.
- `taskStatus` is derived from `currentProgress` and `deadline` and is not stored.
- `displayStatus` is derived from `currentProgress` and `deadline` and is not stored.

<!--
{
  "taskId": "task-001",
  "courseId": "course-001",
  "taskName": "Finish DL Lab",
  "description": "Complete the PyTorch exercise",
  "deadline": "2026-09-15T23:59:00.000Z",
  "importance": "high",
  "estimatedDuration": 6,
  "currentProgress": 50,
  "createdAt": "2026-09-12T09:00:00.000Z"
}
-->

<!--{
  "taskId": "task-002",
  "courseId": "course-001",
  "taskName": "Review Lecture 4",
  "description": "",
  "deadline": "2026-09-18T23:59:00.000Z",
  "importance": "medium",
  "estimatedDuration": null,
  "currentProgress": 0,
  "createdAt": "2026-09-12T09:10:00.000Z"
}
-->

## 6. Allowed Values

### Urgency
| Time until deadline | Urgency Score |
|---|---:|
| > 7 days | 20 |
| 4 - 7 days | 40 |
| 2 - 3 days | 60 |
| 1 day | 80 |
| Today | 90 |
| Overdue | 100 |

### ImportanceLevel

| Value | Importance Score |
|---|---:|
| very-low | 20 |
| low | 40 |
| medium | 60 |
| high | 80 |
| very-high | 100 |

### TaskStatus

| Value | Meaning |
|---|---|
| completed | Progress is 100 |
| overdue | Progress is below 100 & deadline has passed |
| pending | Progress is below 100 & deadline has not passed |

### CurrentProgress

| Level | Score |
|---|---:|
| not started | 0 |
| started | 25 |
| halfway | 50 |
| almost done | 75 |
| completed | 100 |

### WorkloadScore
| Remaining Workload | Workload Score |
|---|---:|
| ≤ 1h | 20 |
| > 1 and ≤ 2h | 40 |
| > 2 and ≤ 4h | 60 |
| > 4 and ≤ 6h | 80 |
| > 6h | 100 |

## 7. Derived Task Values

The following values are calculated by relevant smart feature services and are not stored.

| Field | Type | Stored? | Description |
|---|---|---:|---|
| urgencyScore | Number | No | Calculated from deadline |
| importanceScore | Number | No | Converted from importance level |
| remainingWorkload | Number | No | Remaining estimated work |
| workloadScore | Number | No | Calculated from remaining workload |
| priorityScore | Number | No | Final priority score |
| taskStatus | TaskStatus | No | derived task status |
| hasWorkloadWarning | Boolean | No | Whether the task is at risk |

**remainingWorkload:**
<br>
If estimatedDuration is provided:
    remainingWorkload =
        estimatedDuration × (1 - currentProgress / 100)

Otherwise:
    remainingWorkload =
        2 × (1 - currentProgress / 100)

**priorityScore:**
<br>
priorityScore = 0.5 × urgencyScore + 0.3 × importanceScore + 0.2 × workloadScore

**taskStatus:**
<br>
if currentProgress == 100
    status = completed

else if deadline has passed
    status = overdue

else
    status = pending

**workloadWarning:**
<br>
If status == completed
    no warning

Else if status == overdue
    show overdue

Else if
    (urgencyScore >= 80 AND workloadScore >= 60)
    OR
    (urgencyScore >= 60 AND workloadScore >= 80)
    show workload warning

Else
    no warning

## 8. WarningNotification (no stored data)

| Field | Type | Description |
|---|---|---|
| taskName | String | Name of risky task |
| deadline | ISO Date String | Task deadline |
| remainingWorkload | Number | Remaining estimated hours |
| message | String | Warning shown to student |

## 9. StudyScheduleItem (no stored data)

| Field | Type | Stored? | Description |
|---|---|---:|---|
| task | Task | No | Task included in schedule |
| suggestedDuration | Number | No | Recommended study duration |
| order | Number | No | Position in suggested plan |
| remainingWorkloadAfter | Number | No | Remaining workload after suggested session |

## 10. Relationships

- One Student can have zero or many Courses.
- One Course belongs to exactly one Student, identified by username.
- One Course can have zero or many Tasks.
- One Task belongs to exactly one Course, identified by courseId.

## 11. Deletion Rules

### Delete Course

Before deleting a course, the system must display a confirmation.

If confirmed, the course and all tasks belonging to that course
are deleted.

### Delete Task

Before deleting a task, the system must display a confirmation.

## 12. Local Storage

| Key | Value Type | Description |
|---|---|---|
| studyflow_users | Array<Student> | Registered students |
| studyflow_courses | Array<Course> | All courses |
| studyflow_tasks | Array<Task> | All tasks |
| studyflow_current_user | String or null | username of logged-in student |

<!--
Initial data:
{ 
  "studyflow_users": [],
  "studyflow_courses": [],
  "studyflow_tasks": [],
  "studyflow_current_user": null
}
-->


## 13. Recommended Task View

`smartService.js` combines stored Task data with calculated values.

### Recommendation Sorting

`PriorityService` combines stored Task data with calculated priority values.

All non-completed tasks are included in recommendation ranking.
Completed tasks are excluded.

Tasks are sorted by:

1. priorityScore DESC
2. deadline ASC
3. importanceScore DESC
4. createdAt ASC



<!--Example:

{
  "taskId": "task-001",
  "courseId": "course-001",
  "taskName": "Finish DL Lab",
  "deadline": "2026-09-15T23:59:00.000Z",
  "importance": "high",
  "estimatedDuration": 6,
  "currentProgress": 50,

  "estimatedDuration": 6,
  "remainingWorkload": 3,
  "urgencyScore": 80,
  "importanceScore": 80,
  "workloadScore": 60,
  "priorityScore": 76,
  "status": "pending",
  "hasWorkloadWarning": true
}
-->
