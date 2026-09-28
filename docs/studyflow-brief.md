# StudyFlow: A Web-Based Study Planner for Course and Task Management

## 1. Problem Idea

**Overview:** Help students organize courses, manage tasks and deadlines, track study progress, and determine which tasks should be completed first.

**More important factors differentiate StudyFlow from a traditional to-do list:** 
- Define deadline, importance level, estimated duration, and current progress to calculate task priority and recommend what should be done next.
- Detect tasks that are becoming risky due to high urgency and remaining workload, and notify the student through workload warning notifications.
- Use the student's available study time together with task priority and remaining workload to generate a recommended study schedule.

## 2. Core Features (3 Standard Features)

### 2.1 Course Management (Actor: Student)

- Create
- Edit
- View
- Delete
- Assign color (optional)
- View tasks belonging to each course

### 2.2 Task–Deadline Management (Actor: Student)

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

### Authentication – Supporting Functionality

- Registration requires student full name, unique username, password, and password confirmation.
- Login uses username and password. Password reset requires username, new password, and confirmation.
- After a successful reset, the old password is replaced by the new password.

## 3. Smart Features (Actor: System)

### 3.1 Smart Task Prioritization

Smart Task Prioritization differentiates StudyFlow from a traditional to-do list app.

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

#### Urgency Score

Urgency score is based on the time until the user-defined deadline.

| Time until deadline | Urgency Score |
| --- | ---: |
| > 7 days | 20 |
| 4–7 days | 40 |
| 2–3 days | 60 |
| 1 day | 80 |
| Today | 90 |
| Overdue | 100 |

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

**Explanation for the Optional Estimated Duration:** Estimated Duration is optional because users may either enter a custom value, choose from predefined duration options, or leave it unspecified. If no duration is provided, StudyFlow uses a neutral default duration of **2 hours**. This default allows all tasks to use the same Priority formula and remain comparable in both local and global task rankings. The default value is only a fallback estimate and does not represent the actual duration of the task.

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
| Priority | `0.5(80) + 0.3(80) + 0.2(60) = 76` |

**Dashboard display**

> **Finish DL Lab**  
> Priority: 76  
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

Workload Warning detects tasks that still have a large amount of work remaining while their deadlines are approaching.

Unlike Priority Ranking, which determines what should be done first, Workload Warning identifies tasks that are becoming risky because of the combination of workload and urgency.

When a task satisfies the Workload Warning condition, the system displays a warning notification to alert the student.

Notification contains: 
- Task name
- Deadline
- Remaining workload
- Warning message

Example:

⚠️ Workload Warning

Finish DL Lab still requires approximately 5 hours of work and is due tomorrow.

The notification is generated from the existing Workload Warning result and does not require a separate priority calculation.

**Input:** Reuse Smart Task Prioritization data: Deadline, Estimated Duration, Current Progress.

**System gets:** Urgency Score, Remaining Workload, Workload Score.

#### When Is a Workload Warning Shown?

1. If the task is **COMPLETED** → no warning.
2. Else if the task is **OVERDUE** → show **OVERDUE**.
4. Else if `(U >= 80 AND W >= 60) OR (U >= 60 AND W >= 80)` → show 

**Functions:** `calculateRemainingWorkload()`, `getWorkloadScore()`, `hasWorkloadWarning()`, `getWarningNotification()`

### 3.4 Smart Study Scheduling

Smart Study Scheduling converts the ranked task list into a suggested study plan based on the student's available study time.

#### Input

The system reuses task information from Smart Task Prioritization:

- Deadline
- Importance
- Estimated Duration
- Current Progress
- Priority Score

Additional user input: `Available Study Time`

#### Processing

1. Calculate or retrieve the remaining workload of each active task.
2. Rank tasks using the existing Smart Task Prioritization algorithm.
3. Allocate the student's available study time to higher-priority tasks first.
4. Continue allocating time to the next ranked task if available study time remains.

The scheduling feature does not change the Priority Score. It uses the existing task ranking to determine how the available study time should be distributed.

#### Output

The system generates a recommended study schedule showing:

* Recommended task
* Suggested study duration
* Task order
* Remaining workload after the suggested study session

Example:

Available Study Time: **4 hours**

1. Finish DL Lab — 2.5h
2. Review Web App Lecture — 1h
3. Prepare DSP Exercise — 0.5h

If the total remaining workload is greater than the student's available study time, the system prioritizes the highest-ranked tasks and leaves the remaining tasks for a later study period.

Functions:

`generateStudySchedule(tasks, availableStudyTime)`


## 4. Future Work for the Mobile App Development Course Version

- **Current Web:** Workload warning notification appears inside StudyFlow.
- **Future Mobile:** Push notifications/reminders can notify the student even when the application is not currently open.
- Stronger authentication (using email validation).