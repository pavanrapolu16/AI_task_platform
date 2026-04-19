const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const auth = require("../middleware/auth");
const { enqueueTask } = require("../services/taskQueue");

const router = express.Router();
const OPERATIONS = new Set(["uppercase", "lowercase", "reverse", "word_count"]);

router.use(auth);

router.post("/", async (req, res) => {
  try {
    const { title, inputText, operationType } = req.body;
    if (!title || !inputText || !operationType) {
      return res.status(400).json({ message: "title, inputText, operationType are required" });
    }
    if (!OPERATIONS.has(operationType)) {
      return res.status(400).json({ message: "Unsupported operationType" });
    }

    const task = await Task.create({
      title,
      inputText,
      operationType,
      createdBy: req.user.userId,
      status: "pending",
      logs: [{ message: "Task created and queued for processing" }]
    });

    await enqueueTask({
      taskId: task._id.toString(),
      userId: req.user.userId,
      queuedAt: new Date().toISOString()
    });

    return res.status(201).json(task);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create task", error: error.message });
  }
});

router.post("/:id/run", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await Task.findOne({ _id: id, createdBy: req.user.userId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status === "pending" || task.status === "running") {
      return res.status(409).json({ message: "Task already queued or running" });
    }

    task.status = "pending";
    task.result = null;
    task.errorMessage = null;
    task.logs.push({ message: "Task queued by user" });
    await task.save();

    await enqueueTask({
      taskId: task._id.toString(),
      userId: req.user.userId,
      queuedAt: new Date().toISOString()
    });

    return res.json({ message: "Task queued", task });
  } catch (error) {
    return res.status(500).json({ message: "Failed to queue task", error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100);
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find({ createdBy: req.user.userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Task.countDocuments({ createdBy: req.user.userId })
    ]);

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      tasks
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch tasks", error: error.message });
  }
});

router.get("/:id/logs", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await Task.findOne({ _id: id, createdBy: req.user.userId }).select("logs status");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.json({ status: task.status, logs: task.logs });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch task logs", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await Task.findOne({ _id: id, createdBy: req.user.userId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.json(task);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch task", error: error.message });
  }
});

module.exports = router;
