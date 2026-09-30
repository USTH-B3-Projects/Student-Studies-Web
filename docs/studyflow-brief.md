# StudentStudies: A Web-Based Study Planner for Course and Task Management

## 1. Problem Idea

**Overview:** Help students organize courses, manage tasks and deadlines, track study progress, and determine which tasks should be completed first.

**More important factors differentiate StudentStudies from a traditional to-do list:** 
- Define deadline, importance level, estimated duration, and current progress to calculate task priority and recommend what should be done next.
- Detect tasks that are becoming risky due to high urgency and remaining workload, and notify the student through workload warning notifications.
- Provide an interactive drag-and-drop calendar that uses each task's estimated duration for a customized study timetable.

## 2. Core Features (4 Standard Features)

### Authentication – Supporting Functionality

- Registration requires student full name, unique username, password, and password confirmation.
- Login uses username and password. Password reset requires username, new password, and confirmation.
- After a successful reset, the old password is replaced by the new password.
- Logout.

### 2.1 Course Management (Actor: Student)

- Create
- Edit
- View
- Delete
- Assign color (optional)
- View tasks belonging to each course

### 2.2 Set deadlines with both date and time (Actor: Student)

- Create, Edit, Delete
- Set deadlines
- Update task progress
- Set Estimate Duration (predefined options/custome value)
- Specify importance
- Mark completed
- View overdue tasks
- Sort and filter

### 2.3 Task Progress and Completion Tracking (Actor: Student/System)

- Track current progress of each task
- Display completed and remaining tasks
- Show task progress visually
- Automatically derive and display task status from current progress and deadline. The status is not stored.

### 2.4 Drag and Drop Study Schedule (Actor: Student/ System)

- Switch between Day, Week, and Month calendar views and navigate across dates (Previous, Next, Today)
- Filter active, overdue tasks in the sidebar by status (`All`, `Not scheduled`, `Scheduled`) and search by task or course name
- Schedule study sessions by dragging tasks onto 30-minute timeline slots, automatically deriving `endTime` from `startTime` + `estimatedDuration`
- Prompt the schedule editor automatically (with a 1-hour initial block) when scheduling a task that has no user-defined `remainingWorkload`
- Reschedule sessions by dragging event blocks to new time slots or across dates in Month view
- Inspect session details, manually update `startTime` and `endTime` via a custom date-time picker, or delete sessions

**Functions:** `getSchedules()`, `createSchedule()`, `getScheduleByTaskId()`, `updateSchedule()`, `deleteSchedule()`

## 3. Smart Features (Actor: System)

### 3.1 Smart Task Prioritization

Smart Task Prioritization differentiates StudentStudies from a traditional to-do list app.

| Stage | Data |
| --- | --- |
| User provides | Deadline; importance level; current progress; estimated duration |
| System derives | Urgency score; importance score; remaining workload; workload score; overdue status |
| Estimated duration | Custom input, predefined option, or default 2h if not provided |
| System calculates | Priority score (0–100), then automatically ranks pending tasks (Student can change the recommended list depend on their choice) |
| Outputs | Priority Score; Automatic Task Ranking; Recommended Next Task; Workload Warning |

Overdue Status is not used as an additional factor in the Priority formula. However, overdue tasks receive an Urgency Score of 100 based on their deadline.

All tasks use the same Priority formula, including tasks without a user-defined Estimated Duration. This allows Priority Scores to be compared consistently across the recommendation list.

$$
\text{Priority} = 0.6(\text{Urgency}) + 0.25(\text{Importance}) + 0.15(\text{Workload})
$$

### Urgency Score
Urgency Score is determined by the task’s deadline, which includes both date and time.

For incomplete tasks, the system first compares the full deadline with the current date and time to determine whether the task is overdue. For non-overdue tasks, urgency is based on the calendar-day difference between the deadline and the current date, using the same local timezone.

| Deadline | Urgency Score |
| --- | ---: |
| More than 7 calendar days away | 20 |
| 4–7 calendar days away | 40 |
| 2–3 calendar days away | 60 |
| Tomorrow | 80 |
| Today, with the deadline not yet passed | 90 |
| Overdue: the deadline date and time have passed | 100 |

Overdue detection takes precedence over the “Today” category. For example, an incomplete task due today at 10:00 is overdue if the current time is 11:00 and therefore receives an Urgency Score of 100.

Completed tasks are excluded from task recommendations and warning lists.

#### Importance Score

| Importance level | Importance Score |
| --- | ---: |
| Very low | 20 |
| Low | 40 |
| Medium | 60 |
| High | 80 |
| Very high | 100 |

#### Workload Score

Workload score is calculated from Remaining Workload.

| Remaining Workload | Workload Score |
| --- | ---: |
| ≤ 1h | 20 |
| > 1h–≤ 2h | 40 |
| > 2h–≤ 4h | 60 |
| > 4h–≤ 6h | 80 |
| > 6h | 100 |

With formula:

$$
\text{Remaining Workload} = \text{Estimated Duration} \times \left(1 - \frac{\text{Current Progress}}{100}\right)
$$

| Current Progress | Current Progress Mark |
| --- | ---: |
| Not started | 0 |
| Started | 25 |
| Halfway | 50 |
| Almost done | 75 |
| Completed | 100 |

**Explanation for the Optional Estimated Duration:** Estimated Duration is optional because users may either enter a custom value, choose from predefined duration options, or leave it unspecified. If no duration is provided, StudentStudies uses a neutral default duration of **2 hours**. This default allows all tasks to use the same Priority formula and remain comparable in both local and global task rankings. The default value is only a fallback estimate and does not represent the actual duration of the task.

**Future work in the mobile version:** Study timer and actual study duration to provide more accurate workload estimation and reduce reliance on manually estimated duration.

### 3.2 Smart Recommendation (Local and Global Ranking)

After calculating priority scores, the system excludes completed tasks and ranks the remaining tasks. The global or local recommendation returns the highest-ranked task.

#### Example

**Task:** Finish DL Lab

| Input or result | Value |
| --- | --- |
| Deadline | Tomorrow |
| Urgency | 80 |
| Importance | High |
| Importance Score | 80 |
| Estimated Duration | 6h |
| Progress | 50% |
| Remaining Workload | 3h |
| Workload Score | 60 |
| Priority | `0.6(80) + 0.25(80) + 0.15(60) = 77` |

**Dashboard display**

> **Finish DL Lab**  
> Priority: 77  
> Due tomorrow  
> ~3h remaining

#### Tie-Breaking Rule

For example, Tasks A and B both have a Priority Score of 72. The system needs to determine which task should be done first.

Suggested rule:

1. Priority Score DESC
2. Deadline ASC
3. Importance DESC
4. Created Time ASC

### 3.3 Workload Warning & Notification

StudyFlow displays warnings for incomplete tasks that are overdue or have a high remaining workload relative to their approaching deadlines.

Unlike Priority Ranking, which determines which task should be completed first, warnings highlight tasks that may require the student’s attention.

The warning list contains two types of warnings:

- **Overdue Warning:** The task’s deadline date and time have passed, but the task is not completed.
- **Workload Warning:** The task is not overdue, but its urgency and remaining workload meet the warning thresholds.

**Input:** Reuse Smart Task Prioritization data: Deadline, Estimated Duration, and Current Progress.

**System derives:** Overdue Status, Urgency Score, Remaining Workload, and Workload Score.

If Estimated Duration is not provided, the system uses the same 2-hour fallback estimate defined in Smart Task Prioritization.

#### When Is a Warning Shown?

Let **U** represent the Urgency Score and **W** represent the Workload Score.

1. If the task is **completed**, show no warning.
2. Otherwise, if the task is **overdue**, show an **Overdue Warning**, regardless of its Workload Score.
3. Otherwise, if `(U >= 80 AND W >= 60) OR (U >= 60 AND W >= 80)`, show a **Workload Warning**.
4. Otherwise, show no warning.

#### Warning Notifications

When a task meets a warning condition, the system displays an in-app warning notification.

Each notification contains:

- Task name
- Deadline, including date and time
- Remaining workload
- Warning message

**Example — Workload Warning:**

> ⚠️ Finish DL Lab still requires approximately 5 hours of work and is due tomorrow at 17:00.

**Example — Overdue Warning:**

> ⚠️ Finish DL Lab was due today at 10:00 and is not yet completed.

Notifications reuse the warning results and do not require a separate priority calculation.

#### Warning List Sorting

The warning list includes both overdue tasks and non-overdue tasks that satisfy the Workload Warning condition.

Tasks are sorted in the following order:

1. **Overdue Status first:** Overdue tasks appear before non-overdue tasks with workload warnings.
2. **Urgency Score DESC:** Within each group, tasks with higher Urgency Scores appear first.
3. **Workload Score DESC:** If Urgency Scores are equal, tasks with higher Workload Scores appear first.

Completed tasks are excluded from the warning list.

