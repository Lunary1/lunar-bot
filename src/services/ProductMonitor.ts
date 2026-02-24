import { supabase } from "@/app/lib/supabaseClient";
import { ProductScraper } from "@/workers/ProductScraper";
import { TaskExecutor } from "@/workers/TaskExecutor";
import { Redis } from "ioredis";

interface MonitoringConfig {
  checkInterval: number; // in minutes
  priceChangeThreshold: number; // percentage
  stockChangeEnabled: boolean;
  priceDropEnabled: boolean;
  autoPurchaseEnabled: boolean;
  batchSize: number;
  delayBetweenBatches: number; // in milliseconds
}

export class ProductMonitor {
  private scraper: ProductScraper;
  private taskExecutor: TaskExecutor;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private config: MonitoringConfig;
  private isRunning: boolean = false;
  private redis: Redis;

  constructor(
    redis: Redis,
    config: MonitoringConfig = {
      checkInterval: 30, // 30 minutes
      priceChangeThreshold: 5, // 5%
      stockChangeEnabled: true,
      priceDropEnabled: true,
      autoPurchaseEnabled: true,
      batchSize: 10,
      delayBetweenBatches: 5000,
    }
  ) {
    this.config = config;
    this.redis = redis;
    this.scraper = new ProductScraper();
    this.taskExecutor = new TaskExecutor(redis);
  }

  async startMonitoring() {
    if (this.isRunning) {
      console.log("⚠️ Monitoring service is already running");
      return;
    }

    console.log("🔍 Starting product monitoring service...");
    this.isRunning = true;

    // Start monitoring interval
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkAllProducts();
      } catch (error) {
        console.error("Error in monitoring interval:", error);
      }
    }, this.config.checkInterval * 60 * 1000);

    // Run initial check
    await this.checkAllProducts();

    console.log("✅ Product monitoring service started successfully");
  }

  async stopMonitoring() {
    if (!this.isRunning) {
      console.log("⚠️ Monitoring service is not running");
      return;
    }

    console.log("🛑 Stopping product monitoring service...");
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    await this.scraper.close();
    await this.taskExecutor.close();

    console.log("✅ Product monitoring service stopped successfully");
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      lastCheck: this.lastActivity,
    };
  }

  private lastActivity: Date | null = null;

  private async checkAllProducts() {
    try {
      console.log("🔍 Checking all monitored products...");
      this.lastActivity = new Date();

      // Get all products that need monitoring with watchlist information
      const { data: products, error } = await supabase
        .from("products")
        .select(
          `
          *,
          store:stores(id, name, domain),
          watchlists:user_watchlists(
            id,
            user_id, 
            alert_on_stock, 
            alert_on_price_drop,
            auto_purchase,
            max_price,
            quantity
          )
        `
        )
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching products for monitoring:", error);
        return;
      }

      if (!products || products.length === 0) {
        console.log("No products to monitor");
        return;
      }

      console.log(`📊 Monitoring ${products.length} products`);

      // Process products in batches to avoid overwhelming the system
      for (let i = 0; i < products.length; i += this.config.batchSize) {
        const batch = products.slice(i, i + this.config.batchSize);

        // Process batch concurrently
        await Promise.all(batch.map((product) => this.checkProduct(product)));

        // Add delay between batches
        if (i + this.config.batchSize < products.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.config.delayBetweenBatches)
          );
        }
      }

      console.log("✅ Completed product monitoring cycle");
    } catch (error) {
      console.error("Error in product monitoring:", error);
    }
  }

  private async checkProduct(product: any) {
    try {
      console.log(`🔍 Checking product: ${product.name}`);

      // Get current product data
      const currentData = await this.scraper.scrapeProductData(
        product.url,
        product.store_id
      );

      if (!currentData) {
        console.log(`❌ Failed to scrape data for ${product.name}`);
        return;
      }

      // Check for stock changes
      if (
        this.config.stockChangeEnabled &&
        product.is_available !== currentData.is_available
      ) {
        await this.handleStockChange(product, currentData);
      }

      // Check for price changes
      if (
        this.config.priceDropEnabled &&
        product.current_price !== currentData.current_price
      ) {
        await this.handlePriceChange(product, currentData);
      }

      // Check for auto-purchase opportunities
      if (
        this.config.autoPurchaseEnabled &&
        currentData.is_available &&
        product.watchlists &&
        product.watchlists.length > 0
      ) {
        await this.handleAutoPurchase(product, currentData);
      }

      // Update product with new data
      await this.updateProduct(product.id, currentData);
    } catch (error) {
      console.error(`Error checking product ${product.name}:`, error);
    }
  }

  private async handleStockChange(product: any, newData: any) {
    const wasAvailable = product.is_available;
    const isNowAvailable = newData.is_available;

    console.log(
      `📦 Stock change detected for ${product.name}: ${
        wasAvailable ? "In Stock" : "Out of Stock"
      } → ${isNowAvailable ? "In Stock" : "Out of Stock"}`
    );

    // Notify users who are watching this product
    if (product.watchlists && product.watchlists.length > 0) {
      for (const watchlist of product.watchlists) {
        if (watchlist.alert_on_stock) {
          await this.sendStockAlert(
            watchlist.user_id,
            product,
            wasAvailable,
            isNowAvailable
          );
        }
      }
    }

    // Log the stock change
    await supabase.from("product_alerts").insert({
      product_id: product.id,
      alert_type: "stock_change",
      old_value: wasAvailable,
      new_value: isNowAvailable,
      message: `Stock status changed from ${
        wasAvailable ? "In Stock" : "Out of Stock"
      } to ${isNowAvailable ? "In Stock" : "Out of Stock"}`,
      created_at: new Date().toISOString(),
    });
  }

  private async handlePriceChange(product: any, newData: any) {
    const oldPrice = product.current_price;
    const newPrice = newData.current_price;
    const priceChange = newPrice - oldPrice;
    const priceChangePercent = (priceChange / oldPrice) * 100;

    console.log(
      `💰 Price change detected for ${
        product.name
      }: €${oldPrice} → €${newPrice} (${
        priceChangePercent > 0 ? "+" : ""
      }${priceChangePercent.toFixed(2)}%)`
    );

    // Check if price change exceeds threshold
    if (Math.abs(priceChangePercent) >= this.config.priceChangeThreshold) {
      // Notify users who are watching this product
      if (product.watchlists && product.watchlists.length > 0) {
        for (const watchlist of product.watchlists) {
          if (watchlist.alert_on_price_drop && priceChangePercent < 0) {
            await this.sendPriceAlert(
              watchlist.user_id,
              product,
              oldPrice,
              newPrice,
              priceChangePercent
            );
          }
        }
      }

      // Log the price change
      await supabase.from("product_alerts").insert({
        product_id: product.id,
        alert_type: "price_change",
        old_value: oldPrice,
        new_value: newPrice,
        message: `Price changed from €${oldPrice} to €${newPrice} (${
          priceChangePercent > 0 ? "+" : ""
        }${priceChangePercent.toFixed(2)}%)`,
        created_at: new Date().toISOString(),
      });
    }

    // Always update price history
    await supabase.from("price_history").insert({
      product_id: product.id,
      price: newPrice,
      date: new Date().toISOString(),
    });
  }

  private async updateProduct(productId: string, newData: any) {
    await supabase
      .from("products")
      .update({
        name: newData.name,
        current_price: newData.current_price,
        is_available: newData.is_available,
        image_url: newData.image_url,
        description: newData.description,
        last_updated: new Date().toISOString(),
      })
      .eq("id", productId);
  }

  private async sendStockAlert(
    userId: string,
    product: any,
    wasAvailable: boolean,
    isNowAvailable: boolean
  ) {
    // This would integrate with your notification system
    // For now, we'll just log it
    console.log(
      `📧 Stock alert for user ${userId}: ${product.name} is now ${
        isNowAvailable ? "in stock" : "out of stock"
      }`
    );

    // In production, this would send:
    // - Email notifications
    // - Discord webhooks
    // - Telegram messages
    // - Push notifications
  }

  private async sendPriceAlert(
    userId: string,
    product: any,
    oldPrice: number,
    newPrice: number,
    changePercent: number
  ) {
    // This would integrate with your notification system
    console.log(
      `📧 Price alert for user ${userId}: ${
        product.name
      } price dropped ${Math.abs(changePercent).toFixed(2)}% to €${newPrice}`
    );
  }

  private async handleAutoPurchase(product: any, currentData: any) {
    try {
      console.log(
        `🛒 Checking auto-purchase opportunities for: ${product.name}`
      );

      // Check each watchlist item for auto-purchase eligibility
      for (const watchlist of product.watchlists) {
        if (!watchlist.auto_purchase) continue;

        // Check if price is within user's budget
        if (
          watchlist.max_price &&
          currentData.current_price > watchlist.max_price
        ) {
          console.log(
            `💰 Price ${currentData.current_price} exceeds max price ${watchlist.max_price} for user ${watchlist.user_id}`
          );
          continue;
        }

        // Check if user has valid store account
        const { data: storeAccount } = await supabase
          .from("user_store_accounts")
          .select("*")
          .eq("user_id", watchlist.user_id)
          .eq("store_id", product.store_id)
          .eq("is_active", true)
          .single();

        if (!storeAccount) {
          console.log(
            `❌ No valid store account found for user ${watchlist.user_id} on store ${product.store_id}`
          );
          continue;
        }

        // Create auto-purchase task
        await this.createAutoPurchaseTask(
          watchlist.user_id,
          product,
          storeAccount,
          watchlist.quantity || 1,
          watchlist.id
        );
      }
    } catch (error) {
      console.error(`Error handling auto-purchase for ${product.name}:`, error);
    }
  }

  private async createAutoPurchaseTask(
    userId: string,
    product: any,
    storeAccount: any,
    quantity: number,
    watchlistId: string
  ) {
    try {
      console.log(
        `🚀 Creating auto-purchase task for user ${userId}, product: ${product.name}`
      );

      // Create purchase task in database
      const { data: task, error } = await supabase
        .from("purchase_tasks")
        .insert({
          user_id: userId,
          product_id: product.id,
          store_account_id: storeAccount.id,
          quantity: quantity,
          status: "queued",
          priority: 10, // High priority for auto-purchase
          auto_purchase: true,
          watchlist_id: watchlistId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating auto-purchase task:", error);
        return;
      }

      // Queue the task for execution
      await this.taskExecutor.addTask({
        taskId: task.id,
        userId: userId,
        productId: product.id,
        storeAccountId: storeAccount.id,
        priority: 10,
      });

      // Update watchlist status
      await supabase
        .from("user_watchlists")
        .update({
          status: "purchasing",
          last_auto_purchase_attempt: new Date().toISOString(),
        })
        .eq("id", watchlistId);

      console.log(`✅ Auto-purchase task created and queued: ${task.id}`);

      // Send notification
      await this.sendAutoPurchaseNotification(userId, product, task.id);
    } catch (error) {
      console.error("Error creating auto-purchase task:", error);
    }
  }

  private async sendAutoPurchaseNotification(
    userId: string,
    product: any,
    taskId: string
  ) {
    console.log(
      `📧 Auto-purchase notification for user ${userId}: Attempting to purchase ${product.name} (Task: ${taskId})`
    );

    // In production, this would send:
    // - Email notifications
    // - Discord webhooks
    // - Telegram messages
    // - Push notifications
  }
}
