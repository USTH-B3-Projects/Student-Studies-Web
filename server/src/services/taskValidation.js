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

module.exports = { validateTask };
