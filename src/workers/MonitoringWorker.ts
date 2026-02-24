import { Worker, Job } from "bullmq";
import { DreamlandBot } from "../bots/dreamland/DreamlandBot";
import { getSupabaseServer } from "../app/lib/supabaseServer";
import { QUEUE_NAMES } from "../lib/queues";

export interface MonitoringTaskData {
  watchlistItemId: string;
  productId: string;
  storeId: string;
  userId: string;
  maxPrice?: number;
  autoPurchase: boolean;
}

export interface MonitoringResult {
  success: boolean;
  message: string;
  product?: {
    name: string;
    price: number;
    availability: boolean;
    url: string;
    imageUrl?: string;
    sku?: string;
  };
  action?: "monitoring" | "purchased" | "alert" | "failed";
}

export class MonitoringWorker {
  private worker: Worker;
  private isRunning: boolean = false;

  constructor(redisConnection: any) {
    this.worker = new Worker(
      QUEUE_NAMES.MONITORING,
      this.processMonitoringTask.bind(this),
      {
        connection: redisConnection,
        concurrency: 3, // Process up to 3 monitoring tasks concurrently
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 25, // Keep last 25 failed jobs
      }
    );

    this.setupEventListeners();
  }

  /**
   * Process a monitoring task
   */
  private async processMonitoringTask(
    job: Job<MonitoringTaskData>
  ): Promise<MonitoringResult> {
    const {
      watchlistItemId,
      productId,
      storeId,
      userId,
      maxPrice,
      autoPurchase,
    } = job.data;

    try {
      console.log(`Processing monitoring task for product ${productId}`);

      // Get product details from database
      const productDetails = await this.getProductDetails(productId);
      if (!productDetails) {
        throw new Error("Product not found");
      }

      // Create bot instance based on store
      const bot = await this.createBotForStore(storeId);
      if (!bot) {
        throw new Error("Failed to create bot for store");
      }

      try {
        // Get current product information
        const currentProductInfo = await bot.getProductDetails(
          productDetails.url
        );

        if (!currentProductInfo.success || !currentProductInfo.product) {
          return {
            success: false,
            message: "Failed to get current product information",
            action: "failed",
          };
        }

        const product = currentProductInfo.product;
        const hasStockChanged =
          product.availability !== productDetails.is_available;
        const hasPriceChanged = product.price !== productDetails.current_price;
        const isWithinBudget = !maxPrice || product.price <= maxPrice;

        // Update product information in database
        await this.updateProductInfo(productId, {
          current_price: product.price,
          is_available: product.availability,
          last_checked: new Date().toISOString(),
        });

        // Check if we should take action
        if (product.availability && isWithinBudget) {
          if (autoPurchase) {
            // Attempt to purchase the product
            const purchaseResult = await this.attemptPurchase(
              bot,
              product,
              userId
            );

            if (purchaseResult.success) {
              // Mark watchlist item as purchased
              await this.markAsPurchased(watchlistItemId);

              return {
                success: true,
                message: "Product purchased successfully",
                product,
                action: "purchased",
              };
            } else {
              return {
                success: false,
                message: "Failed to purchase product",
                product,
                action: "failed",
              };
            }
          } else {
            // Just alert the user
            await this.sendAlert(userId, product, "Product is now available");

            return {
              success: true,
              message: "Product is available and within budget",
              product,
              action: "alert",
            };
          }
        } else if (hasStockChanged || hasPriceChanged) {
          // Send alert about changes
          await this.sendAlert(userId, product, "Product status changed");

          return {
            success: true,
            message: "Product status updated",
            product,
            action: "monitoring",
          };
        }

        return {
          success: true,
          message: "Product monitored successfully",
          product,
          action: "monitoring",
        };
      } finally {
        // Clean up bot resources
        await bot.cleanup();
      }
    } catch (error) {
      console.error("Monitoring task failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        action: "failed",
      };
    }
  }

  /**
   * Get product details from database
   */
  private async getProductDetails(productId: string): Promise<any> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error) {
      console.error("Error fetching product details:", error);
      return null;
    }

    return data;
  }

  /**
   * Create bot instance for store
   */
  private async createBotForStore(storeId: string): Promise<any> {
    const supabase = getSupabaseServer();
    // Get store details
    const { data: store } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    if (!store) {
      return null;
    }

    // For now, only support Dreamland
    if (store.name.toLowerCase() === "dreamland") {
      const bot = new DreamlandBot({
        headless: true,
        timeout: 30000,
        retryAttempts: 3,
        delayBetweenActions: 2000,
      });

      const initResult = await bot.initialize();
      if (!initResult.success) {
        return null;
      }

      return bot;
    }

    return null;
  }

  /**
   * Update product information in database
   */
  private async updateProductInfo(
    productId: string,
    updates: any
  ): Promise<void> {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", productId);

    if (error) {
      console.error("Error updating product info:", error);
    }
  }

  /**
   * Attempt to purchase product
   */
  private async attemptPurchase(
    bot: any,
    product: any,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // This would require user's store account and payment details
      // For now, we'll just return a placeholder
      console.log(
        `Would attempt to purchase ${product.name} for user ${userId}`
      );

      return {
        success: false,
        message: "Auto-purchase not fully implemented yet",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Purchase failed",
      };
    }
  }

  /**
   * Mark watchlist item as purchased
   */
  private async markAsPurchased(watchlistItemId: string): Promise<void> {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("user_watchlists")
      .update({
        status: "purchased",
        updated_at: new Date().toISOString(),
      })
      .eq("id", watchlistItemId);

    if (error) {
      console.error("Error marking as purchased:", error);
    }
  }

  /**
   * Send alert to user
   */
  private async sendAlert(
    userId: string,
    product: any,
    message: string
  ): Promise<void> {
    const supabase = getSupabaseServer();
    // This would integrate with notification system
    console.log(`Alert for user ${userId}: ${message} - ${product.name}`);

    // For now, we could store alerts in the database
    const { error } = await supabase.from("user_alerts").insert({
      user_id: userId,
      product_id: product.id,
      message,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error creating alert:", error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.worker.on("completed", (job) => {
      console.log(`Monitoring task ${job.id} completed successfully`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`Monitoring task ${job?.id} failed:`, err);
    });

    this.worker.on("error", (err) => {
      console.error("Monitoring worker error:", err);
    });
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log("Monitoring worker started");
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    await this.worker.close();
    this.isRunning = false;
    console.log("Monitoring worker stopped");
  }

  /**
   * Get worker status
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
    };
  }
}
