const { Worker } = require("bullmq");
const Redis = require("ioredis");
const { app } = require("./index"); // for Socket.IO reference

const connection = new Redis("redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "tasks",
  async (job) => {
    const task = job.data;
    const io = app.get("io");

    console.log(`[Worker] Processing task ${job.id} (${task.product})`);

    // Send first status
    if (io) {
      io.emit("task:update", { id: job.id, status: "carted" });
      console.log(`[Socket] Emitted: ${job.id} → carted`);
    }

    await new Promise((res) => setTimeout(res, 3000)); // simulate time passing

    const success = Math.random() < 0.85;
    const status = success ? "checked out" : "failed";

    if (io) {
      io.emit("task:update", { id: job.id, status });
      console.log(`[Socket] Emitted: ${job.id} → ${status}`);
    }

    if (!success) throw new Error("Checkout failed");

    return { message: "Checked out successfully" };
  },
  { connection }
);

// Optional: log events
worker.on("completed", (job) => {
  console.log(`[✓] Task ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[✗] Task ${job.id} failed: ${err.message}`);
});

worker.on("ready", () => {
  console.log("🚀 Worker is connected to Redis and ready.");
});

worker.on("error", (err) => {
  console.error("❌ Worker error:", err);
});

console.log("Worker running...");
