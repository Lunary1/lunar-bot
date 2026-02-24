import { Redis } from "ioredis";
import { ProductMonitor } from "@/services/ProductMonitor";
import { TaskExecutor } from "./TaskExecutor";
import { MonitoringService } from "@/services/MonitoringService";
import { NotificationService } from "@/services/NotificationService";

export class WorkerManager {
  private redis: Redis;
  private productMonitor: ProductMonitor | null = null;
  private taskExecutor: TaskExecutor | null = null;
  private monitoringService: MonitoringService | null = null;
  private notificationService: NotificationService | null = null;
  private isRunning: boolean = false;
  private shutdownHandlers: (() => Promise<void>)[] = [];

  constructor(
    redisUrl: string = process.env.REDIS_URL || "redis://localhost:6379"
  ) {
    this.redis = new Redis(redisUrl);
    this.setupGracefulShutdown();
  }

  /**
   * Initialize and start all worker services
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Worker manager is already running");
      return;
    }

    try {
      console.log("🚀 Starting Worker Manager...");

      // Initialize services
      this.productMonitor = new ProductMonitor(this.redis);
      this.taskExecutor = new TaskExecutor(this.redis);
      this.monitoringService = new MonitoringService(this.redis);
      this.notificationService = new NotificationService();

      // Start services
      await this.productMonitor.startMonitoring();

      console.log("✅ Worker Manager started successfully");
      this.isRunning = true;

      // Register shutdown handlers
      this.shutdownHandlers.push(
        () => this.productMonitor?.stopMonitoring(),
        () => this.taskExecutor?.close(),
        () => this.redis.disconnect()
      );
    } catch (error) {
      console.error("❌ Failed to start Worker Manager:", error);
      throw error;
    }
  }

  /**
   * Stop all worker services
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log("⚠️ Worker manager is not running");
      return;
    }

    try {
      console.log("🛑 Stopping Worker Manager...");

      // Execute all shutdown handlers
      await Promise.allSettled(
        this.shutdownHandlers.map((handler) => handler())
      );

      this.isRunning = false;
      console.log("✅ Worker Manager stopped successfully");
    } catch (error) {
      console.error("❌ Error stopping Worker Manager:", error);
      throw error;
    }
  }

  /**
   * Get status of all services
   */
  getStatus(): {
    isRunning: boolean;
    services: {
      productMonitor: any;
      taskExecutor: any;
      monitoringService: any;
      notificationService: any;
    };
  } {
    return {
      isRunning: this.isRunning,
      services: {
        productMonitor: this.productMonitor?.getStatus() || null,
        taskExecutor: this.taskExecutor ? { isRunning: true } : null,
        monitoringService: this.monitoringService ? { isRunning: true } : null,
        notificationService: this.notificationService
          ? { isRunning: true }
          : null,
      },
    };
  }

  /**
   * Get Redis connection for external use
   */
  getRedis(): Redis {
    return this.redis;
  }

  /**
   * Get product monitor instance
   */
  getProductMonitor(): ProductMonitor | null {
    return this.productMonitor;
  }

  /**
   * Get task executor instance
   */
  getTaskExecutor(): TaskExecutor | null {
    return this.taskExecutor;
  }

  /**
   * Get monitoring service instance
   */
  getMonitoringService(): MonitoringService | null {
    return this.monitoringService;
  }

  /**
   * Get notification service instance
   */
  getNotificationService(): NotificationService | null {
    return this.notificationService;
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
        try {
          await this.stop();
          process.exit(0);
        } catch (error) {
          console.error("❌ Error during shutdown:", error);
          process.exit(1);
        }
      });
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", async (error) => {
      console.error("❌ Uncaught Exception:", error);
      try {
        await this.stop();
      } catch (shutdownError) {
        console.error("❌ Error during emergency shutdown:", shutdownError);
      }
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", async (reason, promise) => {
      console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
      try {
        await this.stop();
      } catch (shutdownError) {
        console.error("❌ Error during emergency shutdown:", shutdownError);
      }
      process.exit(1);
    });
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    services: Record<string, { healthy: boolean; error?: string }>;
  }> {
    const services: Record<string, { healthy: boolean; error?: string }> = {};

    // Check Redis connection
    try {
      await this.redis.ping();
      services.redis = { healthy: true };
    } catch (error) {
      services.redis = {
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Check Product Monitor
    try {
      if (this.productMonitor) {
        const status = this.productMonitor.getStatus();
        services.productMonitor = { healthy: status.isRunning };
      } else {
        services.productMonitor = { healthy: false, error: "Not initialized" };
      }
    } catch (error) {
      services.productMonitor = {
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Check Task Executor
    try {
      if (this.taskExecutor) {
        services.taskExecutor = { healthy: true };
      } else {
        services.taskExecutor = { healthy: false, error: "Not initialized" };
      }
    } catch (error) {
      services.taskExecutor = {
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Check Monitoring Service
    try {
      if (this.monitoringService) {
        services.monitoringService = { healthy: true };
      } else {
        services.monitoringService = {
          healthy: false,
          error: "Not initialized",
        };
      }
    } catch (error) {
      services.monitoringService = {
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Check Notification Service
    try {
      if (this.notificationService) {
        services.notificationService = { healthy: true };
      } else {
        services.notificationService = {
          healthy: false,
          error: "Not initialized",
        };
      }
    } catch (error) {
      services.notificationService = {
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    const healthy = Object.values(services).every((service) => service.healthy);

    return {
      healthy,
      services,
    };
  }

  /**
   * Get performance metrics
   */
  async getMetrics(): Promise<{
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    redisInfo: any;
    queueStats: any;
  }> {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    // Get Redis info
    let redisInfo = null;
    try {
      redisInfo = await this.redis.info();
    } catch (error) {
      console.error("Error getting Redis info:", error);
    }

    // Get queue statistics
    let queueStats = null;
    try {
      if (this.taskExecutor) {
        // This would be implemented in TaskExecutor to get queue stats
        queueStats = {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
        };
      }
    } catch (error) {
      console.error("Error getting queue stats:", error);
    }

    return {
      uptime,
      memoryUsage,
      redisInfo,
      queueStats,
    };
  }
}

// Global worker manager instance
let globalWorkerManager: WorkerManager | null = null;

/**
 * Get or create the global worker manager instance
 */
export function getWorkerManager(): WorkerManager {
  if (!globalWorkerManager) {
    globalWorkerManager = new WorkerManager();
  }
  return globalWorkerManager;
}

/**
 * Start the global worker manager
 */
export async function startWorkerManager(): Promise<void> {
  const manager = getWorkerManager();
  await manager.start();
}

/**
 * Stop the global worker manager
 */
export async function stopWorkerManager(): Promise<void> {
  if (globalWorkerManager) {
    await globalWorkerManager.stop();
    globalWorkerManager = null;
  }
}
