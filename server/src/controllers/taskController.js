const db = require('../config/database');
const crypto = require('crypto');

function generateId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function isValidDate(value) {
  return !isNaN(Date.parse(value));
}

function isValidImportance(value) {
  return ['very-low', 'low', 'medium', 'high', 'very-high'].includes(value);
}

function isValidProgress(value) {
  return [0, 25, 50, 75, 100].includes(value);
}

function normalizeTask(task) {
  if (!task) return null;
  const { id, taskName, ...rest } = task;
  return { taskId: id || task.taskId, taskName, name: taskName || task.name, ...rest };
}

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

function calculateWorkloadScore(estimatedDuration, currentProgress) {
  const effectiveDuration = estimatedDuration ?? 2;
  const remainingWorkload = effectiveDuration * (1 - currentProgress / 100);

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
  const workloadScore = calculateWorkloadScore(task.estimatedDuration, task.currentProgress);
  const priorityScore = 0.5 * urgencyScore + 0.3 * importanceScore + 0.2 * workloadScore;

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

exports.create = (req, res) => {
  const { courseId, taskName, description, deadline, importance, estimatedDuration, currentProgress = 0 } = req.body;

  if (!courseId || !taskName || !deadline) {
    return res.status(400).json({ error: 'courseId, taskName, and deadline are required' });
  }
  if (taskName.trim().length === 0) {
    return res.status(400).json({ error: 'Task name is NOT empty' });
  }
  if (!isValidDate(deadline)) {
    return res.status(400).json({ error: 'Deadline is invalid' });
  }
  if (importance !== undefined && !isValidImportance(importance)) {
    return res.status(400).json({ error: 'Importance is invalid' });
  }
  if (estimatedDuration != null && estimatedDuration <= 0) {
    return res.status(400).json({ error: 'estimatedDuration must be larger than 0' });
  }
  if (currentProgress !== undefined && !isValidProgress(currentProgress)) {
    return res.status(400).json({ error: 'currentProgress must be: 0, 25, 50, 75, 100' });
  }
  try {
    const course = db.prepare('SELECT * FROM courses WHERE courseId = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ error: 'courseId does NOT exist' });
    }

    const taskId = generateId('task');
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

    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAll = (req, res) => {
  const { username, courseId } = req.query;

  try {
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

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getById = (req, res) => {
  const { id } = req.params;
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'username is required' });
  }

  try {
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
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.update = (req, res) => {
  const { id } = req.params;
  const { taskName, description, deadline, importance, estimatedDuration, currentProgress } = req.body;

  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (taskName !== undefined && taskName.trim().length === 0) {
      return res.status(400).json({ error: 'Task name is NOT empty' });
    }
    if (deadline !== undefined && !isValidDate(deadline)) {
      return res.status(400).json({ error: 'Deadline is invalid' });
    }
    if (importance !== undefined && !isValidImportance(importance)) {
      return res.status(400).json({ error: 'Importance is invalid' });
    }
    if (estimatedDuration != null && estimatedDuration <= 0) {
      return res.status(400).json({ error: 'estimatedDuration must be larger than 0' });
    }
    if (currentProgress !== undefined && !isValidProgress(currentProgress)) {
      return res.status(400).json({ error: 'currentProgress must be: 0, 25, 50, 75, 100' });
    }
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

    res.json(normalizeTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.setCompletion = (req, res) => {
  const { id } = req.params;
  const { username, completed } = req.body;

  if (!username) return res.status(400).json({ error: 'username is required' });
  if (typeof completed !== 'boolean') return res.status(400).json({ error: 'completed must be a boolean' });

  try {
    const updateCompletion = db.transaction(() => {
      const task = db.prepare(`
        SELECT t.*
        FROM tasks t
        JOIN courses c ON c.courseId = t.courseId
        WHERE t.id = ? AND c.username = ?
      `).get(id, username);
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
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.error) return res.status(409).json(task);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.delete = (req, res) => {
  const { id } = req.params;

  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.smart = (req, res) => {
  const { username, courseId } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'username is required' });
  }

  try {
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
      ORDER BY createdAt DESC
    `).all(username, courseId || null, courseId || null);

    const enriched = tasks.map(enrichTask);
    const recommendations = enriched
      .filter(task => task.status !== 'completed')
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        if (new Date(a.deadline) !== new Date(b.deadline)) return new Date(a.deadline) - new Date(b.deadline);
        if (b.importanceScore !== a.importanceScore) return b.importanceScore - a.importanceScore;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
