const express = require('express');
const courseController = require('../controllers/courseController');
const { authenticate } = require('../middleware/authenticate');
const router = express.Router();

router.use(authenticate);
router.get('/', courseController.getAll);
router.post('/', courseController.create);
router.get('/:id', courseController.getById);
router.put('/:id', courseController.update);
router.delete('/:id', courseController.delete);

module.exports = router;
