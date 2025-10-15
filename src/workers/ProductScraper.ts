import { Job } from "bullmq";
import { chromium, Browser, Page } from "playwright";
import { supabase } from "../app/lib/supabaseClient";

interface ScrapingJobData {
  productId: string;
  url: string;
  storeId: string;
}

export class ProductScraper {
  private browser: Browser | null = null;

  async scrapeProduct(job: Job<ScrapingJobData>) {
    const { productId, url, storeId } = job.data;

    try {
      console.log(`🔍 Starting product scraping for: ${url}`);

      // Initialize browser if not already done
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      }

      const page = await this.browser.newPage();

      // Set user agent to avoid detection
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );

      // Navigate to product page
      await page.goto(url, { waitUntil: "networkidle" });

      // Wait a bit for dynamic content to load
      await page.waitForTimeout(2000);

      // Extract product information based on store
      const productInfo = await this.extractProductInfo(page, storeId);

      // Update product in database
      await this.updateProduct(productId, productInfo);

      console.log(`✅ Successfully scraped product: ${productInfo.name}`);

      await page.close();
    } catch (error) {
      console.error(`❌ Error scraping product ${url}:`, error);

      // Update product with error status
      await supabase
        .from("products")
        .update({
          is_available: false,
          last_updated: new Date().toISOString(),
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", productId);

      throw error;
    }
  }

  private async extractProductInfo(page: Page, storeId: string) {
    // Generic selectors that work across most e-commerce sites
    const selectors = {
      name: [
        'h1[data-testid="product-title"]',
        "h1.product-title",
        'h1[class*="title"]',
        "h1",
        '[data-testid="product-name"]',
        ".product-name",
      ],
      price: [
        '[data-testid="price"]',
        ".price",
        '[class*="price"]',
        ".product-price",
        '[data-testid="product-price"]',
      ],
      image: [
        'img[data-testid="product-image"]',
        ".product-image img",
        '[class*="product-image"] img',
        'img[alt*="product"]',
      ],
      availability: [
        '[data-testid="availability"]',
        ".availability",
        '[class*="stock"]',
        ".stock-status",
      ],
      description: [
        '[data-testid="product-description"]',
        ".product-description",
        '[class*="description"]',
      ],
    };

    // Try to extract product name
    let name = "";
    for (const selector of selectors.name) {
      try {
        const element = await page.$(selector);
        if (element) {
          name = (await element.textContent()) || "";
          if (name.trim()) break;
        }
      } catch (e) {
        continue;
      }
    }

    // Try to extract price
    let price = 0;
    for (const selector of selectors.price) {
      try {
        const element = await page.$(selector);
        if (element) {
          const priceText = (await element.textContent()) || "";
          const priceMatch = priceText.match(/[\d,]+\.?\d*/);
          if (priceMatch) {
            price = parseFloat(priceMatch[0].replace(",", ""));
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Try to extract image
    let imageUrl = "";
    for (const selector of selectors.image) {
      try {
        const element = await page.$(selector);
        if (element) {
          imageUrl = (await element.getAttribute("src")) || "";
          if (imageUrl) break;
        }
      } catch (e) {
        continue;
      }
    }

    // Check availability
    let isAvailable = true;
    for (const selector of selectors.availability) {
      try {
        const element = await page.$(selector);
        if (element) {
          const availabilityText = (await element.textContent()) || "";
          if (
            availabilityText.toLowerCase().includes("out of stock") ||
            availabilityText.toLowerCase().includes("unavailable") ||
            availabilityText.toLowerCase().includes("sold out")
          ) {
            isAvailable = false;
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Try to extract description
    let description = "";
    for (const selector of selectors.description) {
      try {
        const element = await page.$(selector);
        if (element) {
          description = (await element.textContent()) || "";
          if (description.trim()) break;
        }
      } catch (e) {
        continue;
      }
    }

    return {
      name: name.trim() || "Unknown Product",
      current_price: price,
      is_available: isAvailable,
      image_url: imageUrl,
      description: description.trim(),
      last_updated: new Date().toISOString(),
    };
  }

  private async updateProduct(productId: string, productInfo: any) {
    const { error } = await supabase
      .from("products")
      .update({
        name: productInfo.name,
        current_price: productInfo.current_price,
        is_available: productInfo.is_available,
        image_url: productInfo.image_url,
        description: productInfo.description,
        last_updated: productInfo.last_updated,
        error_message: null,
      })
      .eq("id", productId);

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }

    // Create price history entry
    if (productInfo.current_price > 0) {
      await supabase.from("price_history").insert({
        product_id: productId,
        price: productInfo.current_price,
        date: new Date().toISOString(),
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
