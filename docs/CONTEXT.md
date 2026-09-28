# StudentStudies

A web-based study planner that helps students organize courses, manage tasks with deadlines, track progress, and get smart recommendations on what to work on next.

## Language

**Student**:
A person who uses StudentStudies to plan their studies. The logged-in entity.
_Avoid_: User, account

**Course**:
A subject the student is studying, used to group related tasks.
_Avoid_: Class, subject, module

**Task**:
A unit of work within a course, with a deadline, importance, estimated duration, and progress.
_Avoid_: Assignment, item, to-do

**Priority Score**:
A 0–100 value computed from urgency, importance, and workload scores. Determines task ranking.
_Avoid_: Priority level, priority rating

**Workload Warning**:
A system-generated alert when a task's remaining workload is high relative to its deadline proximity.
_Avoid_: Risk alert, danger zone

**Recommendation**:
The highest-priority pending task suggested to the student. Can be global (across all courses) or local (within one course).
_Avoid_: Suggestion, next step
