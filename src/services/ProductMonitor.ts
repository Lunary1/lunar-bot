import { supabase } from "@/app/lib/supabaseClient";
import { ProductScraper } from "@/workers/ProductScraper";

interface MonitoringConfig {
  checkInterval: number; // in minutes
  priceChangeThreshold: number; // percentage
  stockChangeEnabled: boolean;
  priceDropEnabled: boolean;
}

export class ProductMonitor {
  private scraper: ProductScraper;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private config: MonitoringConfig;

  constructor(
    config: MonitoringConfig = {
      checkInterval: 30, // 30 minutes
      priceChangeThreshold: 5, // 5%
      stockChangeEnabled: true,
      priceDropEnabled: true,
    }
  ) {
    this.config = config;
    this.scraper = new ProductScraper();
  }

  async startMonitoring() {
    console.log("🔍 Starting product monitoring service...");

    // Start monitoring interval
    this.monitoringInterval = setInterval(async () => {
      await this.checkAllProducts();
    }, this.config.checkInterval * 60 * 1000);

    // Run initial check
    await this.checkAllProducts();
  }

  async stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    await this.scraper.close();
  }

  private async checkAllProducts() {
    try {
      console.log("🔍 Checking all monitored products...");

      // Get all products that need monitoring
      const { data: products, error } = await supabase
        .from("products")
        .select(
          `
          *,
          store:stores(id, name, domain),
          watchlists:user_watchlists(user_id, alert_on_stock, alert_on_price_drop)
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
      const batchSize = 10;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        await Promise.all(batch.map((product) => this.checkProduct(product)));

        // Add delay between batches
        if (i + batchSize < products.length) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
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
}
