import { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright";

export interface BotConfig {
  headless: boolean;
  timeout: number;
  retryAttempts: number;
  delayBetweenActions: number;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
}

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface ProductInfo {
  name: string;
  price: number;
  availability: boolean;
  url: string;
  imageUrl?: string;
  sku?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
}

export interface CheckoutInfo {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  paymentMethod: "credit_card" | "paypal" | "ideal";
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
}

export interface BotResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  screenshot?: string;
}

export abstract class StoreBot {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected config: BotConfig;
  protected proxy?: ProxyConfig;
  protected isRunning: boolean = false;
  protected lastActivity: Date | null = null;

  constructor(config: BotConfig, proxy?: ProxyConfig) {
    this.config = config;
    this.proxy = proxy;
  }

  /**
   * Initialize the browser and create a new context
   */
  async initialize(): Promise<BotResult> {
    try {
      const browserOptions: any = {
        headless: this.config.headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
        ],
      };

      // Add proxy configuration if provided
      if (this.proxy) {
        browserOptions.proxy = {
          server: `http://${this.proxy.host}:${this.proxy.port}`,
          username: this.proxy.username,
          password: this.proxy.password,
        };
      }

      this.browser = await chromium.launch(browserOptions);

      const contextOptions: any = {
        viewport: this.config.viewport || { width: 1920, height: 1080 },
        userAgent: this.config.userAgent || this.getRandomUserAgent(),
        locale: "en-US",
        timezoneId: "Europe/Brussels",
        permissions: ["geolocation"],
        geolocation: { latitude: 50.8503, longitude: 4.3517 }, // Brussels
      };

      this.context = await this.browser.newContext(contextOptions);
      this.page = await this.context.newPage();

      // Set up page event listeners
      this.setupPageListeners();

      return {
        success: true,
        message: "Bot initialized successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to initialize bot",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.isRunning = false;
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  /**
   * Abstract method to search for products
   */
  abstract searchProducts(
    query: string
  ): Promise<BotResult & { products?: ProductInfo[] }>;

  /**
   * Abstract method to get product details
   */
  abstract getProductDetails(
    url: string
  ): Promise<BotResult & { product?: ProductInfo }>;

  /**
   * Abstract method to add product to cart
   */
  abstract addToCart(
    productId: string,
    quantity: number,
    options?: any
  ): Promise<BotResult>;

  /**
   * Abstract method to proceed to checkout
   */
  abstract proceedToCheckout(): Promise<BotResult>;

  /**
   * Abstract method to fill checkout information
   */
  abstract fillCheckoutInfo(checkoutInfo: CheckoutInfo): Promise<BotResult>;

  /**
   * Abstract method to complete purchase
   */
  abstract completePurchase(): Promise<BotResult>;

  /**
   * Abstract method to login to store account
   */
  abstract login(username: string, password: string): Promise<BotResult>;

  /**
   * Abstract method to check if logged in
   */
  abstract isLoggedIn(): Promise<boolean>;

  /**
   * Get bot status
   */
  getStatus(): {
    isRunning: boolean;
    lastActivity: Date | null;
    config: BotConfig;
    proxy?: ProxyConfig;
  } {
    return {
      isRunning: this.isRunning,
      lastActivity: this.lastActivity,
      config: this.config,
      proxy: this.proxy,
    };
  }

  /**
   * Take a screenshot for debugging
   */
  async takeScreenshot(): Promise<string> {
    if (!this.page) {
      throw new Error("No active page");
    }
    return await this.page.screenshot({ encoding: "base64" });
  }

  /**
   * Wait for a random amount of time to avoid detection
   */
  protected async randomDelay(
    min: number = 1000,
    max: number = 3000
  ): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Simulate human-like typing
   */
  protected async humanType(element: any, text: string): Promise<void> {
    for (const char of text) {
      await element.type(char);
      await this.randomDelay(50, 150);
    }
  }

  /**
   * Simulate human-like mouse movement
   */
  protected async humanClick(element: any): Promise<void> {
    await element.hover();
    await this.randomDelay(100, 300);
    await element.click();
  }

  /**
   * Get a random user agent
   */
  protected getRandomUserAgent(): string {
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Setup page event listeners for monitoring
   */
  private setupPageListeners(): void {
    if (!this.page) return;

    this.page.on("load", () => {
      this.lastActivity = new Date();
    });

    this.page.on("response", (response) => {
      this.lastActivity = new Date();
    });

    this.page.on("request", () => {
      this.lastActivity = new Date();
    });
  }

  /**
   * Handle errors with retry logic
   */
  protected async handleWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        this.lastActivity = new Date();
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");
        console.warn(
          `${operationName} attempt ${attempt} failed:`,
          lastError.message
        );

        if (attempt < this.config.retryAttempts) {
          await this.randomDelay(1000, 3000);
        }
      }
    }

    throw (
      lastError ||
      new Error(
        `${operationName} failed after ${this.config.retryAttempts} attempts`
      )
    );
  }

  /**
   * Check if element exists and is visible
   */
  protected async isElementVisible(selector: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      const element = await this.page.$(selector);
      if (!element) return false;

      return await element.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Wait for element to be visible with timeout
   */
  protected async waitForElement(
    selector: string,
    timeout: number = 10000
  ): Promise<boolean> {
    if (!this.page) return false;

    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }
}

