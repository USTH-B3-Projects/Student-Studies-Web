const express = require('express');
const tasks = require('../services/taskService');
const { authenticate } = require('../middleware/authenticate');
const router = express.Router();

router.use(authenticate);
router.get('/', (req, res) => res.json(tasks.getAll(req.student.username, req.query.courseId)));
router.post('/', (req, res) => res.status(201).json(tasks.create(req.student.username, req.body)));
router.get('/:id', (req, res) => res.json(tasks.getById(req.student.username, req.params.id)));
router.patch('/:id/completion', (req, res) => res.json(tasks.setCompletion(req.student.username, req.params.id, req.body)));
router.put('/:id', (req, res) => res.json(tasks.update(req.student.username, req.params.id, req.body)));
router.delete('/:id', (req, res) => res.json(tasks.remove(req.student.username, req.params.id)));

module.exports = router;
