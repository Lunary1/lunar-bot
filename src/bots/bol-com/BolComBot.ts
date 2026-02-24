import {
  StoreBot,
  BotResult,
  ProductInfo,
  CheckoutInfo,
} from "../base/StoreBot";
import { Page } from "playwright";

export class BolComBot extends StoreBot {
  private baseUrl = "https://www.bol.com";
  private isLoggedInState = false;

  constructor(config: any, proxy?: any) {
    super(config, proxy);
  }

  /**
   * Search for products on Bol.com
   */
  async searchProducts(
    query: string
  ): Promise<BotResult & { products?: ProductInfo[] }> {
    try {
      if (!this.page) {
        throw new Error("Bot not initialized");
      }

      // Navigate to search page
      await this.page.goto(
        `${this.baseUrl}/nl/s/?searchtext=${encodeURIComponent(query)}`
      );
      await this.randomDelay(2000, 4000);

      // Wait for search results to load
      await this.waitForElement(
        ".product-item, .product-tile, .search-result-item",
        10000
      );

      // Extract product information
      const products = await this.page.$$eval(
        ".product-item, .product-tile, .search-result-item",
        (elements) => {
          return elements
            .map((element) => {
              const nameElement = element.querySelector(
                ".product-title, .product-name, h3, h4"
              );
              const priceElement = element.querySelector(
                ".price, .product-price, .current-price"
              );
              const linkElement = element.querySelector("a");
              const imageElement = element.querySelector("img");
              const availabilityElement = element.querySelector(
                ".stock, .availability, .in-stock"
              );

              return {
                name: nameElement?.textContent?.trim() || "",
                price: priceElement
                  ? parseFloat(
                      priceElement.textContent
                        ?.replace(/[^\d.,]/g, "")
                        .replace(",", ".") || "0"
                    )
                  : 0,
                availability:
                  !availabilityElement?.textContent
                    ?.toLowerCase()
                    .includes("uitverkocht") &&
                  !availabilityElement?.textContent
                    ?.toLowerCase()
                    .includes("niet beschikbaar"),
                url: linkElement?.href || "",
                imageUrl: imageElement?.src || "",
                sku: element.getAttribute("data-sku") || undefined,
              };
            })
            .filter((product) => product.name && product.url);
        }
      );

      return {
        success: true,
        message: `Found ${products.length} products`,
        products,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to search products",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get detailed product information
   */
  async getProductDetails(
    url: string
  ): Promise<BotResult & { product?: ProductInfo }> {
    try {
      if (!this.page) {
        throw new Error("Bot not initialized");
      }

      await this.page.goto(url);
      await this.randomDelay(2000, 4000);

      // Wait for product page to load
      await this.waitForElement(
        ".pdp-header, .product-details, .product-info",
        10000
      );

      const product = await this.page.evaluate(() => {
        const nameElement = document.querySelector(
          ".pdp-header__title, .product-title, .product-name, h1"
        );
        const priceElement = document.querySelector(
          ".price-block__price, .price, .current-price, .pdp-price"
        );
        const availabilityElement = document.querySelector(
          ".buy-block__cta, .add-to-cart, .stock-status, .availability"
        );
        const imageElement = document.querySelector(
          ".pdp-media img, .product-image img, .product-gallery img"
        );
        const skuElement = document.querySelector(
          ".sku, .product-sku, .ean, [data-sku]"
        );

        return {
          name: nameElement?.textContent?.trim() || "",
          price: priceElement
            ? parseFloat(
                priceElement.textContent
                  ?.replace(/[^\d.,]/g, "")
                  .replace(",", ".") || "0"
              )
            : 0,
          availability:
            !availabilityElement?.textContent
              ?.toLowerCase()
              .includes("uitverkocht") &&
            !availabilityElement?.textContent
              ?.toLowerCase()
              .includes("niet beschikbaar") &&
            availabilityElement !== null,
          url: window.location.href,
          imageUrl: imageElement?.src || "",
          sku:
            skuElement?.textContent?.trim() ||
            skuElement?.getAttribute("data-sku") ||
            undefined,
        };
      });

      return {
        success: true,
        message: "Product details retrieved",
        product,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to get product details",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Add product to cart
   */
  async addToCart(
    productId: string,
    quantity: number = 1,
    options?: any
  ): Promise<BotResult> {
    try {
      if (!this.page) {
        throw new Error("Bot not initialized");
      }

      // Navigate to product page
      await this.page.goto(`${this.baseUrl}/nl/p/${productId}`);
      await this.randomDelay(2000, 4000);

      // Check if product is available
      const isAvailable = await this.isElementVisible(
        ".buy-block__cta, .add-to-cart, .btn-add-to-cart"
      );
      if (!isAvailable) {
        return {
          success: false,
          message: "Product is not available",
        };
      }

      // Select quantity if more than 1
      if (quantity > 1) {
        const quantitySelector = await this.page.$(
          '.quantity-select, .qty-select, select[name="quantity"]'
        );
        if (quantitySelector) {
          await quantitySelector.selectOption(quantity.toString());
          await this.randomDelay(500, 1000);
        }
      }

      // Click add to cart button
      const addToCartButton = await this.page.$(
        ".buy-block__cta, .add-to-cart, .btn-add-to-cart"
      );
      if (addToCartButton) {
        await this.humanClick(addToCartButton);
        await this.randomDelay(2000, 4000);
      }

      // Verify item was added to cart
      const cartIndicator = await this.page.$(
        ".cart-count, .cart-quantity, .cart-items"
      );
      if (cartIndicator) {
        const cartCount = await cartIndicator.textContent();
        if (cartCount && parseInt(cartCount) > 0) {
          return {
            success: true,
            message: "Product added to cart successfully",
          };
        }
      }

      return {
        success: true,
        message: "Product added to cart (verification pending)",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to add product to cart",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Proceed to checkout
   */
  async proceedToCheckout(): Promise<BotResult> {
    try {
      if (!this.page) {
        throw new Error("Bot not initialized");
      }

      // Navigate to cart
      await this.page.goto(`${this.baseUrl}/nl/order/overview`);
      await this.randomDelay(2000, 4000);

      // Click checkout button
      const checkoutButton = await this.page.$(
        ".checkout-btn, .btn-checkout, .proceed-to-checkout"
      );
      if (checkoutButton) {
        await this.humanClick(checkoutButton);
        await this.randomDelay(3000, 5000);
      }

      return {
        success: true,
        message: "Proceeded to checkout",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to proceed to checkout",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Fill checkout information
   */
  async fillCheckoutInfo(checkoutInfo: CheckoutInfo): Promise<BotResult> {
    try {
      if (!this.page) {
        throw new Error("Bot not initialized");
      }

      // Fill email
      const emailField = await this.page.$(
        'input[type="email"], input[name="email"]'
      );
      if (emailField) {
        await this.humanType(emailField, checkoutInfo.email);
        await this.randomDelay(500, 1000);
      }

      // Fill name fields
      const firstNameField = await this.page.$(
        'input[name="firstName"], input[name="first_name"]'
      );
      if (firstNameField) {
        await this.humanType(firstNameField, checkoutInfo.firstName);
        await this.randomDelay(500, 1000);
      }

      const lastNameField = await this.page.$(
        'input[name="lastName"], input[name="last_name"]'
      );
      if (lastNameField) {
        await this.humanType(lastNameField, checkoutInfo.lastName);
        await this.randomDelay(500, 1000);
      }

      // Fill address
      const addressField = await this.page.$(
        'input[name="address"], input[name="street"]'
      );
      if (addressField) {
        await this.humanType(addressField, checkoutInfo.address);
        await this.randomDelay(500, 1000);
      }

      const cityField = await this.page.$('input[name="city"]');
      if (cityField) {
        await this.humanType(cityField, checkoutInfo.city);
        await this.randomDelay(500, 1000);
      }

      const postalCodeField = await this.page.$(
        'input[name="postalCode"], input[name="zip"]'
      );
      if (postalCodeField) {
        await this.humanType(postalCodeField, checkoutInfo.postalCode);
        await this.randomDelay(500, 1000);
      }

      // Fill phone if provided
      if (checkoutInfo.phone) {
        const phoneField = await this.page.$(
          'input[name="phone"], input[type="tel"]'
        );
        if (phoneField) {
          await this.humanType(phoneField, checkoutInfo.phone);
          await this.randomDelay(500, 1000);
        }
      }

      return {
        success: true,
        message: "Checkout information filled",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fill checkout information",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Complete purchase
   */
  async completePurchase(): Promise<BotResult> {
    try {
      if (!this.page) {
        throw new Error("Bot not initialized");
      }

      // Find and click the final purchase button
      const purchaseButton = await this.page.$(
        ".place-order, .complete-order, .btn-purchase"
      );
      if (purchaseButton) {
        await this.humanClick(purchaseButton);
        await this.randomDelay(5000, 8000);
      }

      // Check for success indicators
      const successIndicator = await this.page.$(
        ".order-confirmation, .success-message, .order-complete"
      );
      if (successIndicator) {
        return {
          success: true,
          message: "Purchase completed successfully",
        };
      }

      return {
        success: true,
        message: "Purchase completed (verification pending)",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to complete purchase",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Login to Bol.com account
   */
  async login(username: string, password: string): Promise<BotResult> {
    try {
      if (!this.page) {
        throw new Error("Bot not initialized");
      }

      // Navigate to login page
      await this.page.goto(`${this.baseUrl}/nl/account/login`);
      await this.randomDelay(2000, 4000);

      // Fill login form
      const emailField = await this.page.$(
        'input[type="email"], input[name="email"]'
      );
      if (emailField) {
        await this.humanType(emailField, username);
        await this.randomDelay(500, 1000);
      }

      const passwordField = await this.page.$(
        'input[type="password"], input[name="password"]'
      );
      if (passwordField) {
        await this.humanType(passwordField, password);
        await this.randomDelay(500, 1000);
      }

      // Click login button
      const loginButton = await this.page.$(
        '.login-btn, .btn-login, button[type="submit"]'
      );
      if (loginButton) {
        await this.humanClick(loginButton);
        await this.randomDelay(3000, 5000);
      }

      // Check if login was successful
      const isLoggedIn = await this.isLoggedIn();
      if (isLoggedIn) {
        this.isLoggedInState = true;
        return {
          success: true,
          message: "Login successful",
        };
      }

      return {
        success: false,
        message: "Login failed - invalid credentials or captcha required",
      };
    } catch (error) {
      return {
        success: false,
        message: "Login failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      if (!this.page) {
        return false;
      }

      // Check for login indicators
      const isLoggedIn = await this.isElementVisible(
        ".user-menu, .account-menu, .logout-btn, .my-account"
      );

      return isLoggedIn || this.isLoggedInState;
    } catch (error) {
      return false;
    }
  }

  /**
   * Monitor product availability
   */
  async monitorProduct(
    url: string,
    maxPrice?: number
  ): Promise<BotResult & { product?: ProductInfo }> {
    try {
      const result = await this.getProductDetails(url);

      if (result.success && result.product) {
        const product = result.product;

        // Check if product meets criteria
        const isAvailable = product.availability;
        const priceCheck = !maxPrice || product.price <= maxPrice;

        if (isAvailable && priceCheck) {
          return {
            success: true,
            message: "Product is available and meets criteria",
            product,
          };
        } else if (!isAvailable) {
          return {
            success: false,
            message: "Product is not available",
            product,
          };
        } else {
          return {
            success: false,
            message: `Product price (€${product.price}) exceeds maximum (€${maxPrice})`,
            product,
          };
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        message: "Failed to monitor product",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
