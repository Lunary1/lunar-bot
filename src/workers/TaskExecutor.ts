import { Queue, Worker, Job } from "bullmq";
import { supabase } from "@/app/lib/supabaseClient";
import { decryptSensitiveData } from "@/lib/encryption";
import { StoreBot } from "@/bots/base/StoreBot";
import { DreamlandBot } from "@/bots/dreamland/DreamlandBot";
import { PokemonCenterBot } from "@/bots/pokemon-center/PokemonCenterBot";
import { BolComBot } from "@/bots/bol-com/BolComBot";
import { ProductScraper } from "./ProductScraper";

interface TaskJobData {
  taskId: string;
  userId: string;
  productId: string;
  storeAccountId: string;
  proxyId?: string;
  priority: number;
}

interface ScrapingJobData {
  productId: string;
  url: string;
  storeId: string;
}

export class TaskExecutor {
  private queue: Queue;
  private worker: Worker;
  private scrapingQueue: Queue;
  private scrapingWorker: Worker;
  private productScraper: ProductScraper;

  constructor(redisConnection: any) {
    // Create task queue
    this.queue = new Queue("task-execution", {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });

    // Create scraping queue
    this.scrapingQueue = new Queue("product-scraping", {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      },
    });

    // Create worker
    this.worker = new Worker("task-execution", this.processTask.bind(this), {
      connection: redisConnection,
      concurrency: 5,
    });

    // Create scraping worker
    this.scrapingWorker = new Worker(
      "product-scraping",
      this.processScrapingJob.bind(this),
      {
        connection: redisConnection,
        concurrency: 3,
      }
    );

    // Initialize product scraper
    this.productScraper = new ProductScraper();

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.worker.on("completed", (job) => {
      console.log(`Task ${job.id} completed successfully`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`Task ${job?.id} failed:`, err);
    });

    this.worker.on("error", (err) => {
      console.error("Worker error:", err);
    });

    this.scrapingWorker.on("completed", (job) => {
      console.log(`Scraping job ${job.id} completed successfully`);
    });

    this.scrapingWorker.on("failed", (job, err) => {
      console.error(`Scraping job ${job?.id} failed:`, err);
    });

    this.scrapingWorker.on("error", (err) => {
      console.error("Scraping worker error:", err);
    });
  }

  async addTask(taskData: TaskJobData) {
    try {
      const job = await this.queue.add("execute-task", taskData, {
        priority: taskData.priority,
        delay: 0,
      });

      console.log(`Task ${taskData.taskId} queued with job ID: ${job.id}`);
      return job;
    } catch (error) {
      console.error("Error adding task to queue:", error);
      throw error;
    }
  }

  private async processTask(job: Job<TaskJobData>) {
    const { taskId, userId, productId, storeAccountId, proxyId } = job.data;

    try {
      console.log(`Processing task ${taskId}`);

      // Update task status to running
      await this.updateTaskStatus(taskId, "running");

      // Get task details
      const taskDetails = await this.getTaskDetails(taskId);
      if (!taskDetails) {
        throw new Error("Task not found");
      }

      // Get store account details
      const accountDetails = await this.getAccountDetails(storeAccountId);
      if (!accountDetails) {
        throw new Error("Store account not found");
      }

      // Get proxy details if specified
      let proxyDetails = null;
      if (proxyId) {
        proxyDetails = await this.getProxyDetails(proxyId);
      }

      // Execute the bot task
      const result = await this.executeBotTask(
        taskDetails,
        accountDetails,
        proxyDetails
      );

      if (result.success) {
        await this.updateTaskStatus(taskId, "completed", result.data);
        console.log(`Task ${taskId} completed successfully`);
      } else {
        await this.updateTaskStatus(taskId, "failed", null, result.error);
        console.log(`Task ${taskId} failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`Task ${taskId} execution failed:`, error);
      await this.updateTaskStatus(
        taskId,
        "failed",
        null,
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  }

  private async getTaskDetails(taskId: string) {
    const { data, error } = await supabase
      .from("purchase_tasks")
      .select(
        `
        *,
        product:products(*),
        store_account:user_store_accounts(*)
      `
      )
      .eq("id", taskId)
      .single();

    if (error) throw error;
    return data;
  }

  private async getAccountDetails(accountId: string) {
    const { data, error } = await supabase
      .from("user_store_accounts")
      .select(
        `
        *,
        store:stores(*)
      `
      )
      .eq("id", accountId)
      .single();

    if (error) throw error;
    return data;
  }

  private async getProxyDetails(proxyId: string) {
    const { data, error } = await supabase
      .from("proxies")
      .select("*")
      .eq("id", proxyId)
      .single();

    if (error) throw error;
    return data;
  }

  private async executeBotTask(
    taskDetails: any,
    accountDetails: any,
    proxyDetails: any
  ) {
    let bot: StoreBot | null = null;

    try {
      // Create appropriate bot based on store
      const storeName = accountDetails.store.name.toLowerCase();

      switch (storeName) {
        case "dreamland":
          bot = new DreamlandBot(
            {
              headless: true,
              timeout: 30000,
              retryAttempts: 3,
              delayBetweenActions: 2000,
            },
            proxyDetails
          );
          break;

        case "pokemon-center-eu":
        case "pokemon-center":
          bot = new PokemonCenterBot(
            {
              headless: true,
              timeout: 30000,
              retryAttempts: 3,
              delayBetweenActions: 2000,
            },
            proxyDetails
          );
          break;

        case "bol-com":
        case "bol.com":
          bot = new BolComBot(
            {
              headless: true,
              timeout: 30000,
              retryAttempts: 3,
              delayBetweenActions: 2000,
            },
            proxyDetails
          );
          break;

        default:
          throw new Error(`Unsupported store: ${storeName}`);
      }

      // Initialize bot
      const initResult = await bot.initialize();
      if (!initResult.success) {
        throw new Error(`Bot initialization failed: ${initResult.message}`);
      }

      // Login to store account
      // Decrypt stored password before use — passwords are stored encrypted at rest
      let plaintextPassword: string;
      try {
        plaintextPassword = decryptSensitiveData(accountDetails.password_encrypted);
      } catch (decryptErr) {
        throw new Error(
          `Failed to decrypt store account credentials for account ${accountDetails.id}. ` +
          `Ensure ENCRYPTION_KEY env var matches the key used when the account was saved. ` +
          `Original error: ${decryptErr instanceof Error ? decryptErr.message : String(decryptErr)}`
        );
      }

      const loginResult = await bot.login(
        accountDetails.username,
        plaintextPassword
      );

      if (!loginResult.success) {
        throw new Error(`Login failed: ${loginResult.message}`);
      }

      // Check if product is available
      const productResult = await bot.getProductDetails(
        taskDetails.product.url
      );
      if (!productResult.success || !productResult.product?.availability) {
        throw new Error("Product is not available");
      }

      // Add to cart
      const cartResult = await bot.addToCart(
        taskDetails.product.id,
        taskDetails.quantity || 1
      );

      if (!cartResult.success) {
        throw new Error(`Failed to add to cart: ${cartResult.message}`);
      }

      // Proceed to checkout
      const checkoutResult = await bot.proceedToCheckout();
      if (!checkoutResult.success) {
        throw new Error(`Checkout failed: ${checkoutResult.message}`);
      }

      return {
        success: true,
        data: {
          orderNumber: "ORDER_" + Date.now(), // You'll get this from the actual checkout
          totalPrice:
            taskDetails.product.current_price * (taskDetails.quantity || 1),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      if (bot) {
        await bot.cleanup();
      }
    }
  }

  private async updateTaskStatus(
    taskId: string,
    status: string,
    data?: any,
    errorMessage?: string
  ) {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "running") {
      updateData.started_at = new Date().toISOString();
    } else if (status === "completed" || status === "failed") {
      updateData.completed_at = new Date().toISOString();
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from("purchase_tasks")
      .update(updateData)
      .eq("id", taskId);

    if (error) {
      console.error("Error updating task status:", error);
    }

    // If task completed successfully, create purchase history record
    if (status === "completed" && data) {
      await this.createPurchaseHistory(taskId, data);
    }
  }

  private async createPurchaseHistory(taskId: string, data: any) {
    try {
      // Get task details
      const { data: taskDetails } = await supabase
        .from("purchase_tasks")
        .select(
          `
          user_id,
          product_id,
          product:products(name, current_price, store:stores(id))
        `
        )
        .eq("id", taskId)
        .single();

      if (taskDetails) {
        await supabase.from("purchase_history").insert({
          task_id: taskId,
          user_id: taskDetails.user_id,
          store_id: taskDetails.product.store.id,
          product_name: taskDetails.product.name,
          price_paid: data.totalPrice,
          order_number: data.orderNumber,
        });
      }
    } catch (error) {
      console.error("Error creating purchase history:", error);
    }
  }

  async queueScrapingJob(scrapingData: ScrapingJobData) {
    try {
      const job = await this.scrapingQueue.add("scrape-product", scrapingData, {
        priority: 1,
        delay: 0,
      });

      console.log(
        `Scraping job for product ${scrapingData.productId} queued with job ID: ${job.id}`
      );
      return job;
    } catch (error) {
      console.error("Error adding scraping job to queue:", error);
      throw error;
    }
  }

  private async processScrapingJob(job: Job<ScrapingJobData>) {
    try {
      console.log(
        `Processing scraping job ${job.id} for product ${job.data.productId}`
      );
      await this.productScraper.scrapeProduct(job);
    } catch (error) {
      console.error(`Error processing scraping job ${job.id}:`, error);
      throw error;
    }
  }

  async close() {
    await this.worker.close();
    await this.scrapingWorker.close();
    await this.queue.close();
    await this.scrapingQueue.close();
    await this.productScraper.close();
  }
}
