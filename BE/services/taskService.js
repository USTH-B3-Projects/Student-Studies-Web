const db = require('../models/database');
const crypto = require('crypto');
function validateTask(data, partial = false) {
  if (!partial && (typeof data.courseId !== 'string' || !data.courseId.trim())) return 'courseId is required';
  if ((!partial || data.taskName !== undefined) && (typeof data.taskName !== 'string' || !data.taskName.trim())) return 'Task name is required';
  if (data.description !== undefined && typeof data.description !== 'string') return 'Description must be a string';
  if ((!partial || data.deadline !== undefined) && (typeof data.deadline !== 'string' || !data.deadline.trim() || !Number.isFinite(Date.parse(data.deadline)))) return 'Deadline is invalid';
  if (data.importance !== undefined && !['very-low', 'low', 'medium', 'high', 'very-high'].includes(data.importance)) return 'Importance is invalid';
  if (data.estimatedDuration != null && (typeof data.estimatedDuration !== 'number' || !Number.isFinite(data.estimatedDuration) || data.estimatedDuration <= 0)) return 'estimatedDuration must be a finite number larger than 0';
  if (data.currentProgress !== undefined && ![0, 25, 50, 75, 100].includes(data.currentProgress)) return 'currentProgress must be: 0, 25, 50, 75, 100';
  return null;
}

function findOwnedTask(username, id) {
  return db.prepare(`
    SELECT t.* FROM tasks t
    JOIN courses c ON c.courseId = t.courseId
    WHERE t.id = ? AND c.username = ?
  `).get(id, username);
}

function normalizeTask(task) {
  if (!task) return null;
  const { id, taskName, ...rest } = task;
  return { taskId: id || task.taskId, taskName, name: taskName || task.name, ...rest };
}

// Preserve the API rules: rolling-day urgency and overdue workload warnings.
// Browser smart rules intentionally differ; unification requires behavior approval.
function calculateUrgencyScore(deadline) {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const daysUntil = (deadlineDate - now) / (1000 * 60 * 60 * 24);

  if (daysUntil < 0) return 100; // Overdue
  if (daysUntil <= 1) return 90; // Today/Tomorrow
  if (daysUntil <= 2) return 80; // 1 day
  if (daysUntil <= 3) return 60; // 2-3 days
  if (daysUntil <= 7) return 40; // 4-7 days
  return 20; // > 7 days
}

function calculateWorkloadScore(remainingWorkload) {
  if (remainingWorkload > 6) return 100;
  if (remainingWorkload > 4) return 80;
  if (remainingWorkload > 2) return 60;
  if (remainingWorkload > 1) return 40;
  return 20;
}

function enrichTask(task) {
  const importanceScore = { 'very-low': 20, low: 40, medium: 60, high: 80, 'very-high': 100 }[task.importance];
  const urgencyScore = calculateUrgencyScore(task.deadline);
  const effectiveDuration = task.estimatedDuration ?? 2;
  const remainingWorkload = effectiveDuration * (1 - task.currentProgress / 100);
  const workloadScore = calculateWorkloadScore(remainingWorkload);
  const priorityScore = 0.6 * urgencyScore + 0.25 * importanceScore + 0.15 * workloadScore;

  const now = new Date();
  const deadlineDate = new Date(task.deadline);
  let status = 'pending';
  if (task.currentProgress === 100) {
    status = 'completed';
  } else if (deadlineDate < now) {
    status = 'overdue';
  }

  let hasWorkloadWarning = false;
  if (status === 'completed' || task.estimatedDuration == null) {
    hasWorkloadWarning = false;
  } else if (status === 'overdue') {
    hasWorkloadWarning = true;
  } else if ((urgencyScore >= 80 && workloadScore >= 60) || (urgencyScore >= 60 && workloadScore >= 80)) {
    hasWorkloadWarning = true;
  }

  return {
    ...task,
    importanceScore,
    urgencyScore,
    remainingWorkload,
    workloadScore,
    priorityScore,
    status,
    hasWorkloadWarning
  };
}

function create(username, data) {
  const { courseId, taskName, description, deadline, importance, estimatedDuration, currentProgress = 0 } = data;

  const validationError = validateTask(data);
  if (validationError) throw Object.assign(new Error(validationError), { status: 400 });
  const course = db.prepare('SELECT * FROM courses WHERE courseId = ? AND username = ?').get(courseId, username);
  if (!course) {
    throw Object.assign(new Error('courseId does NOT exist'), { status: 404 });
  }

  const taskId = `task-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO tasks (id, courseId, taskName, description, deadline, importance, estimatedDuration, currentProgress, progressBeforeCompletion, completedAt, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    taskId,
    courseId,
    taskName.trim(),
    description ? description.trim() : '',
    deadline,
    importance || 'medium',
    estimatedDuration || null,
    currentProgress,
    currentProgress === 100 ? 0 : null,
    currentProgress === 100 ? createdAt : null,
    createdAt
  );

  const newTask = {
    taskId,
    courseId,
    name: taskName.trim(),
    description: description ? description.trim() : '',
    deadline,
    importance: importance || 'medium',
    estimatedDuration: estimatedDuration || null,
    currentProgress,
    progressBeforeCompletion: currentProgress === 100 ? 0 : null,
    completedAt: currentProgress === 100 ? createdAt : null,
    createdAt
  };

  return newTask;
}

function getAll(username, courseId) {
  const tasks = db.prepare(`
    SELECT
      t.id as taskId,
      t.courseId,
      t.taskName as name,
      t.description,
      t.deadline,
      t.importance,
      t.estimatedDuration,
      t.currentProgress,
      t.progressBeforeCompletion,
      t.completedAt,
      t.createdAt
    FROM tasks t
    JOIN courses c ON c.courseId = t.courseId
    WHERE c.username = ? AND (? IS NULL OR t.courseId = ?)
    ORDER BY t.createdAt DESC
  `).all(username, courseId || null, courseId || null);

  return tasks;
}

function getById(username, id) {
  const task = db.prepare(`
    SELECT
      t.id as taskId,
      t.courseId,
      t.taskName as name,
      t.description,
      t.deadline,
      t.importance,
      t.estimatedDuration,
      t.currentProgress,
      t.progressBeforeCompletion,
      t.completedAt,
      t.createdAt
    FROM tasks t
    JOIN courses c ON c.courseId = t.courseId
    WHERE t.id = ? AND c.username = ?
  `).get(id, username);

  if (!task) {
    throw Object.assign(new Error('Task not found'), { status: 404 });
  }

  return task;
}

function update(username, id, data) {
  const { taskName, description, deadline, importance, estimatedDuration, currentProgress } = data;

  const task = findOwnedTask(username, id);
  if (!task) {
    throw Object.assign(new Error('Task not found'), { status: 404 });
  }

  const validationError = validateTask(data, true);
  if (validationError) throw Object.assign(new Error(validationError), { status: 400 });
  const nextProgress = currentProgress !== undefined ? currentProgress : task.currentProgress;
  const completing = task.currentProgress < 100 && nextProgress === 100;
  const reopening = task.currentProgress === 100 && nextProgress < 100;
  const progressBeforeCompletion = completing ? task.currentProgress : reopening ? null : task.progressBeforeCompletion;
  const completedAt = completing ? new Date().toISOString() : reopening ? null : task.completedAt;

  db.prepare(`
    UPDATE tasks
    SET taskName = ?, description = ?, deadline = ?, importance = ?, estimatedDuration = ?, currentProgress = ?, progressBeforeCompletion = ?, completedAt = ?
    WHERE id = ?
  `).run(
    taskName !== undefined ? taskName.trim() : task.taskName,
    description !== undefined ? description.trim() : task.description,
    deadline !== undefined ? deadline : task.deadline,
    importance !== undefined ? importance : task.importance,
    estimatedDuration !== undefined ? estimatedDuration : task.estimatedDuration,
    nextProgress,
    progressBeforeCompletion,
    completedAt,
    id
  );

  return normalizeTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
}

function setCompletion(username, id, data) {
  const { completed } = data;

  if (typeof completed !== 'boolean') throw Object.assign(new Error('completed must be a boolean'), { status: 400 });

  const updateCompletion = db.transaction(() => {
    const task = findOwnedTask(username, id);
    if (!task) return null;

    if (completed && task.currentProgress < 100) {
      db.prepare(`
        UPDATE tasks
        SET progressBeforeCompletion = currentProgress,
            currentProgress = 100,
            completedAt = ?
        WHERE id = ?
      `).run(new Date().toISOString(), id);
    } else if (!completed && task.currentProgress === 100) {
      if (task.progressBeforeCompletion == null) {
        return { error: 'Previous progress is unavailable; edit the task progress to reopen it safely.' };
      }
      db.prepare(`
        UPDATE tasks
        SET currentProgress = progressBeforeCompletion,
            progressBeforeCompletion = NULL,
            completedAt = NULL
        WHERE id = ?
      `).run(id);
    }

    return enrichTask(normalizeTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)));
  });

  const task = updateCompletion();
  if (!task) throw Object.assign(new Error('Task not found'), { status: 404 });
  if (task.error) throw Object.assign(new Error(task.error), { status: 409 });
  return task;
}

function remove(username, id) {
  const task = findOwnedTask(username, id);
  if (!task) {
    throw Object.assign(new Error('Task not found'), { status: 404 });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

  return { success: true };
}

function smart(username, courseId) {
  const tasks = getAll(username, courseId);

  const enriched = tasks.map(enrichTask);
  const recommendations = enriched
    .filter(task => task.status !== 'completed')
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      if (new Date(a.deadline) !== new Date(b.deadline)) return new Date(a.deadline) - new Date(b.deadline);
      if (b.importanceScore !== a.importanceScore) return b.importanceScore - a.importanceScore;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

  return { recommendations };
}

module.exports = { create, getAll, getById, update, setCompletion, remove, smart };
