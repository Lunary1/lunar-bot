const express = require("express");
const { Queue } = require("bullmq");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const taskQueue = new Queue("tasks", {
  connection: {
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null,
  },
});

// Add task
app.post("/tasks", async (req, res) => {
  const { product, site, size, proxy } = req.body;
  const job = await taskQueue.add("run-task", {
    product,
    site,
    size,
    proxy,
  });
  res.json({
    id: job.id,
    product,
    site,
    size,
    proxy,
    status: "queued",
  });
});

// Get all tasks
app.get("/tasks", async (req, res) => {
  const jobs = await taskQueue.getJobs([
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
  ]);
  const tasks = jobs.map((job) => ({
    id: job.id,
    product: job.data.product,
    site: job.data.site,
    size: job.data.size,
    proxy: job.data.proxy,
    status: job.finishedOn
      ? "checked out"
      : job.failedReason
      ? "failed"
      : job.processedOn
      ? "carted"
      : "queued",
  }));
  res.json(tasks);
});

// Delete task
app.delete("/tasks/:id", async (req, res) => {
  const job = await taskQueue.getJob(req.params.id);
  if (job) {
    await job.remove();
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Stop task
app.post("/tasks/:id/stop", async (req, res) => {
  const job = await taskQueue.getJob(req.params.id);
  if (job && job.isActive()) {
    await job.moveToFailed(new Error("Stopped by user"));
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Restart task
app.post("/tasks/:id/start", async (req, res) => {
  const job = await taskQueue.getJob(req.params.id);
  if (job) {
    await job.remove();
    const newJob = await taskQueue.add("run-task", job.data);
    res.json({ id: newJob.id });
  } else {
    res.sendStatus(404);
  }
});

module.exports = { app, taskQueue };
