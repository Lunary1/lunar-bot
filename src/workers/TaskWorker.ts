import { Worker, Job } from "bullmq";
import { BotManager, BotInstance } from "../bots/BotManager";
import { supabase } from "../app/lib/supabaseClient";
import { decryptSensitiveData } from "../lib/encryption";
import { StoreBot } from "../bots/base/StoreBot";
import { QUEUE_NAMES } from "../lib/queues";

export interface TaskData {
  taskId: string;
  userId: string;
  productId: string;
  storeAccountId: string;
  proxyId?: string;
  priority: number;
  maxPrice?: number;
  autoPurchase: boolean;
}

export interface TaskResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  screenshot?: string;
}

export class TaskWorker {
  private worker: Worker;
  private botManager: BotManager;
  private isRunning: boolean = false;

  constructor(redisConnection: any) {
    this.botManager = new BotManager();

    this.worker = new Worker(QUEUE_NAMES.TASK_EXECUTION, this.processTask.bind(this), {
      connection: redisConnection,
      concurrency: 5, // Process up to 5 tasks concurrently
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50, // Keep last 50 failed jobs
    });

    this.setupEventListeners();
  }

  /**
   * Process a task
   */
  private async processTask(job: Job<TaskData>): Promise<TaskResult> {
    const {
      taskId,
      userId,
      productId,
      storeAccountId,
      proxyId,
      maxPrice,
      autoPurchase,
    } = job.data;

    try {
      // Update task status to running
      await this.updateTaskStatus(taskId, "running");

      // Get task details from database
      const taskDetails = await this.getTaskDetails(taskId);
      if (!taskDetails) {
        throw new Error("Task not found");
      }

      // Get store account details
      const storeAccount = await this.getStoreAccount(storeAccountId);
      if (!storeAccount) {
        throw new Error("Store account not found");
      }

      // Get proxy details if specified
      const proxy = proxyId ? await this.getProxy(proxyId) : null;

      // Get or create bot for this store
      const botInstance = await this.getOrCreateBot(
        storeAccount.store_id,
        proxy,
      );
      if (!botInstance) {
        throw new Error("Failed to create bot instance");
      }

      // Assign task to bot
      await this.botManager.assignTask(taskId, botInstance.id);

      // Execute the task
      const result = await this.executeTask(
        botInstance,
        taskDetails,
        storeAccount,
        maxPrice,
        autoPurchase,
      );

      // Update task status
      await this.updateTaskStatus(
        taskId,
        result.success ? "completed" : "failed",
        result.message,
      );

      // Complete task in bot manager
      await this.botManager.completeTask(taskId, result.success);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Update task status to failed
      await this.updateTaskStatus(taskId, "failed", errorMessage);

      return {
        success: false,
        message: "Task execution failed",
        error: errorMessage,
      };
    }
  }

  /**
   * Execute the actual task
   */
  private async executeTask(
    botInstance: BotInstance,
    taskDetails: any,
    storeAccount: any,
    maxPrice?: number,
    autoPurchase: boolean = false,
  ): Promise<TaskResult> {
    try {
      const bot = botInstance.bot;

      // Login to store account
      // Decrypt stored password before use — passwords are stored encrypted at rest
      let plaintextPassword: string;
      try {
        plaintextPassword = decryptSensitiveData(
          storeAccount.password_encrypted,
        );
      } catch (decryptErr) {
        return {
          success: false,
          message:
            "Failed to decrypt store account credentials. Ensure ENCRYPTION_KEY matches the key used when the account was saved.",
          error:
            decryptErr instanceof Error
              ? decryptErr.message
              : String(decryptErr),
        };
      }

      const loginResult = await bot.login(
        storeAccount.username,
        plaintextPassword,
      );
      if (!loginResult.success) {
        return {
          success: false,
          message: "Failed to login to store account",
          error: loginResult.error,
        };
      }

      // Get product details
      const productResult = await bot.getProductDetails(
        taskDetails.product.url,
      );
      if (!productResult.success || !productResult.product) {
        return {
          success: false,
          message: "Failed to get product details",
          error: productResult.error,
        };
      }

      const product = productResult.product;

      // Check if product meets criteria
      if (!product.availability) {
        return {
          success: false,
          message: "Product is not available",
        };
      }

      if (maxPrice && product.price > maxPrice) {
        return {
          success: false,
          message: `Product price (€${product.price}) exceeds maximum (€${maxPrice})`,
        };
      }

      // If auto-purchase is enabled, proceed with purchase
      if (autoPurchase) {
        // Add to cart
        const addToCartResult = await bot.addToCart(taskDetails.product.id, 1);
        if (!addToCartResult.success) {
          return {
            success: false,
            message: "Failed to add product to cart",
            error: addToCartResult.error,
          };
        }

        // Proceed to checkout
        const checkoutResult = await bot.proceedToCheckout();
        if (!checkoutResult.success) {
          return {
            success: false,
            message: "Failed to proceed to checkout",
            error: checkoutResult.error,
          };
        }

        // Fill checkout information (this would need to be provided by user)
        // For now, we'll just return success for monitoring
        return {
          success: true,
          message: "Product is available and meets criteria",
          data: {
            product,
            action: "monitoring_only", // Indicate this was just monitoring
          },
        };
      }

      // Just monitoring - product is available and meets criteria
      return {
        success: true,
        message: "Product is available and meets criteria",
        data: {
          product,
          action: "monitoring_only",
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Task execution failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get or create bot for store
   */
  private async getOrCreateBot(
    storeId: string,
    proxy?: any,
  ): Promise<BotInstance | null> {
    try {
      // Check if we already have an available bot for this store
      const existingBots = this.botManager.getBotsByType(storeId);
      const availableBot = existingBots.find((bot) => bot.status === "idle");

      if (availableBot) {
        return availableBot;
      }

      // Create new bot instance
      const botConfig = {
        headless: true,
        timeout: 30000,
        retryAttempts: 3,
        delayBetweenActions: 2000,
      };

      const result = await this.botManager.createBot(
        storeId as any,
        botConfig,
        proxy,
      );
      if (!result.success || !result.botId) {
        return null;
      }

      return this.botManager.getBot(result.botId) || null;
    } catch (error) {
      console.error("Error creating bot:", error);
      return null;
    }
  }

  /**
   * Get task details from database
   */
  private async getTaskDetails(taskId: string): Promise<any> {
    const { data, error } = await supabase
      .from("purchase_tasks")
      .select(
        `
        *,
        product:products(*),
        store_account:user_store_accounts(*)
      `,
      )
      .eq("id", taskId)
      .single();

    if (error) {
      console.error("Error fetching task details:", error);
      return null;
    }

    return data;
  }

  /**
   * Get store account details
   */
  private async getStoreAccount(storeAccountId: string): Promise<any> {
    const { data, error } = await supabase
      .from("user_store_accounts")
      .select("*")
      .eq("id", storeAccountId)
      .single();

    if (error) {
      console.error("Error fetching store account:", error);
      return null;
    }

    return data;
  }

  /**
   * Get proxy details
   */
  private async getProxy(proxyId: string): Promise<any> {
    const { data, error } = await supabase
      .from("proxies")
      .select("*")
      .eq("id", proxyId)
      .single();

    if (error) {
      console.error("Error fetching proxy:", error);
      return null;
    }

    return data;
  }

  /**
   * Update task status in database
   */
  private async updateTaskStatus(
    taskId: string,
    status: string,
    message?: string,
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === "running") {
        updateData.started_at = new Date().toISOString();
      } else if (status === "completed" || status === "failed") {
        updateData.completed_at = new Date().toISOString();
      }

      if (message) {
        updateData.error_message = message;
      }

      const { error } = await supabase
        .from("purchase_tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) {
        console.error("Error updating task status:", error);
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.worker.on("completed", (job) => {
      console.log(`Task ${job.id} completed successfully`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`Task ${job?.id} failed:`, err);
    });

    this.worker.on("error", (err) => {
      console.error("Worker error:", err);
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
    console.log("Task worker started");
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
    console.log("Task worker stopped");
  }

  /**
   * Get worker status
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      botManager: this.botManager.getSystemMetrics(),
    };
  }
}
