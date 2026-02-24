import { Queue } from "bullmq";
import { getSupabaseServer } from "../app/lib/supabaseServer";
import { QUEUE_NAMES } from "../lib/queues";

export class MonitoringService {
  private monitoringQueue: Queue;

  constructor(redisConnection: any) {
    this.monitoringQueue = new Queue(QUEUE_NAMES.MONITORING, {
      connection: redisConnection,
    });
  }

  /**
   * Schedule monitoring for a watchlist item
   */
  async scheduleMonitoring(
    watchlistItemId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = getSupabaseServer();
      // Get watchlist item details
      const { data: watchlistItem, error } = await supabase
        .from("user_watchlists")
        .select(
          `
          id,
          user_id,
          product_id,
          max_price,
          auto_purchase,
          product:products(
            id,
            store_id
          )
        `
        )
        .eq("id", watchlistItemId)
        .single();

      if (error || !watchlistItem) {
        return {
          success: false,
          message: "Watchlist item not found",
        };
      }

      // Schedule monitoring task
      const job = await this.monitoringQueue.add(
        "monitor-product",
        {
          watchlistItemId: watchlistItem.id,
          productId: watchlistItem.product.id,
          storeId: watchlistItem.product.store_id,
          userId: watchlistItem.user_id,
          maxPrice: watchlistItem.max_price,
          autoPurchase: watchlistItem.auto_purchase,
        },
        {
          repeat: { every: 5 * 60 * 1000 }, // Check every 5 minutes
          jobId: `monitor-${watchlistItemId}`, // Unique job ID
          removeOnComplete: 10,
          removeOnFail: 5,
        }
      );

      return {
        success: true,
        message: "Monitoring scheduled successfully",
      };
    } catch (error) {
      console.error("Error scheduling monitoring:", error);
      return {
        success: false,
        message: "Failed to schedule monitoring",
      };
    }
  }

  /**
   * Stop monitoring for a watchlist item
   */
  async stopMonitoring(
    watchlistItemId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Remove the monitoring job
      const jobId = `monitor-${watchlistItemId}`;
      const job = await this.monitoringQueue.getJob(jobId);

      if (job) {
        await job.remove();
      }

      return {
        success: true,
        message: "Monitoring stopped successfully",
      };
    } catch (error) {
      console.error("Error stopping monitoring:", error);
      return {
        success: false,
        message: "Failed to stop monitoring",
      };
    }
  }

  /**
   * Schedule monitoring for all active watchlist items
   */
  async scheduleAllMonitoring(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const supabase = getSupabaseServer();
      // Get all active watchlist items
      const { data: watchlistItems, error } = await supabase
        .from("user_watchlists")
        .select(
          `
          id,
          user_id,
          product_id,
          max_price,
          auto_purchase,
          product:products(
            id,
            store_id
          )
        `
        )
        .eq("status", "monitoring");

      if (error) {
        return {
          success: false,
          message: "Failed to fetch watchlist items",
        };
      }

      // Schedule monitoring for each item
      for (const item of watchlistItems) {
        await this.scheduleMonitoring(item.id);
      }

      return {
        success: true,
        message: `Scheduled monitoring for ${watchlistItems.length} items`,
      };
    } catch (error) {
      console.error("Error scheduling all monitoring:", error);
      return {
        success: false,
        message: "Failed to schedule monitoring",
      };
    }
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStats(): Promise<any> {
    try {
      const waiting = await this.monitoringQueue.getWaiting();
      const active = await this.monitoringQueue.getActive();
      const completed = await this.monitoringQueue.getCompleted();
      const failed = await this.monitoringQueue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total:
          waiting.length + active.length + completed.length + failed.length,
      };
    } catch (error) {
      console.error("Error getting monitoring stats:", error);
      return null;
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanupOldJobs(): Promise<void> {
    try {
      // Remove completed jobs older than 24 hours
      const completed = await this.monitoringQueue.getCompleted();
      const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;

      for (const job of completed) {
        if (job.timestamp < cutoffTime) {
          await job.remove();
        }
      }

      // Remove failed jobs older than 7 days
      const failed = await this.monitoringQueue.getFailed();
      const failedCutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000;

      for (const job of failed) {
        if (job.timestamp < failedCutoffTime) {
          await job.remove();
        }
      }
    } catch (error) {
      console.error("Error cleaning up old jobs:", error);
    }
  }
}
