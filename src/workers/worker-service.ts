import { TaskExecutor } from "./TaskExecutor";
import IORedis from "ioredis";

class WorkerService {
  private taskExecutor: TaskExecutor | null = null;
  private redis: IORedis | null = null;
  private isRunning = false;

  async start() {
    if (this.isRunning) {
      console.log("Worker service is already running");
      return;
    }

    try {
      // Initialize Redis connection
      this.redis = new IORedis(
        process.env.REDIS_URL || "redis://localhost:6379",
        {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        }
      );

      // Test Redis connection
      await this.redis.ping();
      console.log("✅ Redis connection established");

      // Initialize task executor
      this.taskExecutor = new TaskExecutor(this.redis);
      console.log("✅ Task executor initialized");

      this.isRunning = true;
      console.log("🚀 Worker service started successfully");

      // Handle graceful shutdown
      process.on("SIGINT", this.shutdown.bind(this));
      process.on("SIGTERM", this.shutdown.bind(this));
    } catch (error) {
      console.error("❌ Failed to start worker service:", error);
      throw error;
    }
  }

  async shutdown() {
    if (!this.isRunning) {
      return;
    }

    console.log("🛑 Shutting down worker service...");

    try {
      if (this.taskExecutor) {
        await this.taskExecutor.close();
        console.log("✅ Task executor closed");
      }

      if (this.redis) {
        await this.redis.quit();
        console.log("✅ Redis connection closed");
      }

      this.isRunning = false;
      console.log("✅ Worker service shutdown complete");
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      hasRedis: !!this.redis,
      hasTaskExecutor: !!this.taskExecutor,
    };
  }
}

// Create singleton instance
const workerService = new WorkerService();

// Start the service if this file is run directly
if (require.main === module) {
  workerService.start().catch((error) => {
    console.error("Failed to start worker service:", error);
    process.exit(1);
  });
}

export default workerService;
