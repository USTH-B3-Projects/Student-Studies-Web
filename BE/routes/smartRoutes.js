const express = require("express");
const tasks = require("../services/taskService");
const router = express.Router();

router.get("/", (req, res) =>
  res.json(tasks.smart(req.student.username, req.query.courseId)),
);

module.exports = router;
