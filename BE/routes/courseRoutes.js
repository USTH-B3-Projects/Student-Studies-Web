const express = require("express");
const courses = require("../services/courseService");
const { authenticate } = require("../middleware/authenticate");
const router = express.Router();

router.use(authenticate);
router.get("/", (req, res) => res.json(courses.getAll(req.student.username)));
router.post("/", (req, res) =>
  res.status(201).json(courses.create(req.student.username, req.body)),
);
router.get("/:id", (req, res) =>
  res.json(courses.getById(req.student.username, req.params.id)),
);
router.put("/:id", (req, res) =>
  res.json(courses.update(req.student.username, req.params.id, req.body)),
);
router.delete("/:id", (req, res) =>
  res.json(courses.remove(req.student.username, req.params.id)),
);

module.exports = router;
