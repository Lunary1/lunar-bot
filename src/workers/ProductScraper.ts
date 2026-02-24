import { Job } from "bullmq";
import { chromium, Browser, Page } from "playwright";
import { supabase } from "../app/lib/supabaseClient";

interface ScrapingJobData {
  productId: string;
  url: string;
  storeId: string;
}

interface StoreSelectors {
  name: string[];
  price: string[];
  image: string[];
  availability: string[];
  description: string[];
  sku: string[];
}

export class ProductScraper {
  private browser: Browser | null = null;
  private storeSelectors: Map<string, StoreSelectors> = new Map();

  constructor() {
    this.initializeStoreSelectors();
  }

  private initializeStoreSelectors() {
    // Dreamland selectors
    this.storeSelectors.set("dreamland", {
      name: [
        ".product-title",
        ".product-name",
        "h1",
        '[data-testid="product-title"]',
        ".product-details h1",
      ],
      price: [
        ".price",
        ".current-price",
        ".product-price",
        '[data-testid="price"]',
        ".price-current",
      ],
      image: [
        ".product-image img",
        ".product-gallery img",
        ".main-image img",
        '[data-testid="product-image"]',
      ],
      availability: [
        ".add-to-cart",
        ".stock-status",
        ".availability",
        ".in-stock",
        ".out-of-stock",
      ],
      description: [
        ".product-description",
        ".product-details",
        ".description",
        ".product-info",
      ],
      sku: [".sku", ".product-sku", "[data-sku]", ".product-code"],
    });

    // Pokémon Center EU selectors
    this.storeSelectors.set("pokemon-center-eu", {
      name: [".pdp-product-name", ".product-title", "h1", ".product-name"],
      price: [".price", ".current-price", ".product-price", ".price-value"],
      image: [".product-image img", ".pdp-image img", ".main-image img"],
      availability: [
        ".add-to-cart",
        ".stock-status",
        ".availability",
        ".in-stock",
      ],
      description: [".product-description", ".pdp-description", ".description"],
      sku: [".sku", ".product-sku", ".product-code"],
    });

    // Bol.com selectors
    this.storeSelectors.set("bol-com", {
      name: [".pdp-header__title", ".product-title", "h1", ".pdp-title"],
      price: [".price-block__price", ".price", ".current-price", ".pdp-price"],
      image: [".pdp-media img", ".product-image img", ".main-image img"],
      availability: [
        ".buy-block__cta",
        ".add-to-cart",
        ".stock-status",
        ".availability",
      ],
      description: [".pdp-description", ".product-description", ".description"],
      sku: [".sku", ".product-sku", ".ean"],
    });
  }

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
      await page.setExtraHTTPHeaders({
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      });

      // Navigate to product page
      await page.goto(url, { waitUntil: "networkidle" });

      // Wait a bit for dynamic content to load
      await page.waitForTimeout(2000);

      // Extract product information based on store
      const productInfo = await this.extractProductInfo(page, storeId, url);

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

  private async extractProductInfo(page: Page, storeId: string, url: string) {
    // Get store-specific selectors or fallback to generic ones
    const storeSelectors =
      this.storeSelectors.get(storeId.toLowerCase()) ||
      this.getGenericSelectors();

    // Try to extract product name
    let name = await this.extractTextBySelectors(page, storeSelectors.name);

    // Try to extract price
    let price = await this.extractPriceBySelectors(page, storeSelectors.price);

    // Try to extract image
    let imageUrl = await this.extractImageBySelectors(
      page,
      storeSelectors.image
    );

    // Check availability
    let isAvailable = await this.checkAvailabilityBySelectors(
      page,
      storeSelectors.availability
    );

    // Try to extract description
    let description = await this.extractTextBySelectors(
      page,
      storeSelectors.description
    );

    // Try to extract SKU
    let sku = await this.extractTextBySelectors(page, storeSelectors.sku);

    return {
      name: name.trim() || "Unknown Product",
      current_price: price,
      is_available: isAvailable,
      image_url: imageUrl,
      description: description.trim(),
      sku: sku.trim() || null,
      last_updated: new Date().toISOString(),
    };
  }

  private getGenericSelectors(): StoreSelectors {
    return {
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
      sku: [".sku", ".product-sku", "[data-sku]", ".product-code"],
    };
  }

  private async extractTextBySelectors(
    page: Page,
    selectors: string[]
  ): Promise<string> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = (await element.textContent()) || "";
          if (text.trim()) return text.trim();
        }
      } catch (e) {
        continue;
      }
    }
    return "";
  }

  private async extractPriceBySelectors(
    page: Page,
    selectors: string[]
  ): Promise<number> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const priceText = (await element.textContent()) || "";
          const priceMatch = priceText.match(/[\d,]+\.?\d*/);
          if (priceMatch) {
            return parseFloat(priceMatch[0].replace(",", ""));
          }
        }
      } catch (e) {
        continue;
      }
    }
    return 0;
  }

  private async extractImageBySelectors(
    page: Page,
    selectors: string[]
  ): Promise<string> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const imageUrl = (await element.getAttribute("src")) || "";
          if (imageUrl) return imageUrl;
        }
      } catch (e) {
        continue;
      }
    }
    return "";
  }

  private async checkAvailabilityBySelectors(
    page: Page,
    selectors: string[]
  ): Promise<boolean> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const availabilityText = (await element.textContent()) || "";
          const isVisible = await element.isVisible();

          // Check for out of stock indicators
          if (
            availabilityText.toLowerCase().includes("out of stock") ||
            availabilityText.toLowerCase().includes("unavailable") ||
            availabilityText.toLowerCase().includes("sold out") ||
            availabilityText.toLowerCase().includes("uitverkocht") ||
            availabilityText.toLowerCase().includes("niet beschikbaar")
          ) {
            return false;
          }

          // If element is visible and doesn't contain out of stock text, assume available
          if (isVisible) {
            return true;
          }
        }
      } catch (e) {
        continue;
      }
    }
    return true; // Default to available if we can't determine
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

  async scrapeProductData(url: string, storeId: string) {
    try {
      console.log(`🔍 Scraping product data for: ${url}`);

      // Initialize browser if not already done
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      }

      const page = await this.browser.newPage();

      // Set user agent to avoid detection
      await page.setExtraHTTPHeaders({
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      });

      // Navigate to product page
      await page.goto(url, { waitUntil: "networkidle" });

      // Wait a bit for dynamic content to load
      await page.waitForTimeout(2000);

      // Extract product information based on store
      const productInfo = await this.extractProductInfo(page, storeId, url);

      await page.close();

      console.log(`✅ Successfully scraped product data: ${productInfo.name}`);
      return productInfo;
    } catch (error) {
      console.error(`❌ Error scraping product data for ${url}:`, error);
      return null;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
