// The number of milliseconds in a day, used to calculate the interval between days.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_EFFECTIVE_DURATION = 2;

export function calculateUrgencyScore(deadline) {
  const now = new Date();
  const deadlineDate = new Date(deadline);

  if (deadlineDate < now) {
    return 100;
  }

  // Compare by DAY (ignoring hours/minutes/seconds) to determine "how many days remain."
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDeadlineDay = new Date(
    deadlineDate.getFullYear(),
    deadlineDate.getMonth(),
    deadlineDate.getDate()
  );

  const daysRemaining = Math.round((startOfDeadlineDay - startOfToday) / ONE_DAY_MS);

  if (daysRemaining <= 0) {
    return 90;
  }
  if (daysRemaining === 1) {
    return 80;
  }
  if (daysRemaining <= 3) {
    return 60;
  }
  if (daysRemaining <= 7) {
    return 40;
  }
  return 20;
}

export function calculateImportanceScore(importance) {
  const scoreMap = {
    "very-low": 20,
    low: 40,
    medium: 60,
    high: 80,
    "very-high": 100,
  };

  // If the importance is invalid, it defaults to "medium".
  return scoreMap[importance] !== undefined ? scoreMap[importance] : 60;
}

export function calculateRemainingWorkload(estimatedDuration, currentProgress) {
  const effectiveDuration =
    estimatedDuration === null || estimatedDuration === undefined
      ? DEFAULT_EFFECTIVE_DURATION
      : estimatedDuration;

  return effectiveDuration * (1 - currentProgress / 100);
}

export function calculateWorkloadScore(remainingWorkload) {
  if (remainingWorkload <= 1) {
    return 20;
  }
  if (remainingWorkload <= 2) {
    return 40;
  }
  if (remainingWorkload <= 4) {
    return 60;
  }
  if (remainingWorkload <= 6) {
    return 80;
  }
  return 100;
}

export function calculatePriorityScore(task) {
  const urgencyScore = calculateUrgencyScore(task.deadline);
  const importanceScore = calculateImportanceScore(task.importance);

  const remainingWorkload = calculateRemainingWorkload(
    task.estimatedDuration,
    task.currentProgress
  );
  const workloadScore = calculateWorkloadScore(remainingWorkload);

  const priorityScore =
    0.5 * urgencyScore + 0.3 * importanceScore + 0.2 * workloadScore;

  return Math.round(priorityScore * 10) / 10;
}

export function enrich(task) {
  const urgencyScore = calculateUrgencyScore(task.deadline);
  const importanceScore = calculateImportanceScore(task.importance);
  const remainingWorkload = calculateRemainingWorkload(task.estimatedDuration, task.currentProgress);
  const workloadScore = calculateWorkloadScore(remainingWorkload);
  const completionStatus = Number(task.currentProgress) === 100 ? "completed" : "pending";
  const isOverdue = completionStatus !== "completed" && new Date(task.deadline) < new Date();
  const hasWorkloadWarning =
    completionStatus !== "completed" &&
    !isOverdue &&
    task.estimatedDuration != null &&
    ((urgencyScore >= 80 && workloadScore >= 60) ||
      (urgencyScore >= 60 && workloadScore >= 80));

  return {
    ...task,
    // Support both old and new field names
    name: task.taskName || task.name,
    taskName: task.taskName || task.name,
    effectiveDuration: task.estimatedDuration ?? DEFAULT_EFFECTIVE_DURATION,
    urgencyScore,
    importanceScore,
    remainingWorkload,
    workloadScore,
    priorityScore: calculatePriorityScore(task),
    completionStatus,
    isOverdue,
    displayStatus: completionStatus === "completed" ? "completed" : isOverdue ? "overdue" : "pending",
    hasWorkloadWarning,
  };
}

export function rankTasks(tasks) {
  const pendingTasks = tasks.map(enrich).filter((task) => task.currentProgress < 100);

  return pendingTasks.sort((taskA, taskB) => {
    const priorityA = calculatePriorityScore(taskA);
    const priorityB = calculatePriorityScore(taskB);

    // 1. Compare priorityScore (descending)
    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }

    // 2. Comparison of deadlines (in ascending order)
    const deadlineA = new Date(taskA.deadline).getTime();
    const deadlineB = new Date(taskB.deadline).getTime();
    if (deadlineA !== deadlineB) {
      return deadlineA - deadlineB;
    }

    // 3. Compare importanceScore (in descending order)
    const importanceA = calculateImportanceScore(taskA.importance);
    const importanceB = calculateImportanceScore(taskB.importance);
    if (importanceA !== importanceB) {
      return importanceB - importanceA;
    }

    // 4. Compare createdAt (ascending)
    const createdAtA = new Date(taskA.createdAt).getTime();
    const createdAtB = new Date(taskB.createdAt).getTime();
    return createdAtA - createdAtB;
  });
}

export function getUserNotifications(tasks) {
  return tasks.map(enrich).flatMap((task) => {
    const name = task.taskName || task.name;
    if (task.isOverdue) return [{ title: "🚨 Overdue Task", message: `"${name}" is past its deadline. Please complete it ASAP!` }];
    if (!task.hasWorkloadWarning) return [];
    const days = Math.round((new Date(task.deadline).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
    const due = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
    return [{ title: "⚠️ Workload Warning", message: `${name} still requires approximately ${task.remainingWorkload.toFixed(1)} hours of work and is due ${due}.` }];
  });
}

// Reorder only the supplied IDs; filtered-out and newly added tasks keep their slots.
export function applyManualOrder(tasks, orderedIds) {
  const byId = new Map(tasks.map((task) => [task.taskId, task]));
  const ordered = [...new Set(orderedIds)].map((id) => byId.get(id)).filter(Boolean);
  const selected = new Set(ordered.map((task) => task.taskId));
  let index = 0;
  return tasks.map((task) => selected.has(task.taskId) ? ordered[index++] : task);
}
