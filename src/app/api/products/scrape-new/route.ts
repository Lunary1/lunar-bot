import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/app/lib/supabaseServer";
import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapedProduct {
  name: string;
  price: number | null;
  imageUrl: string | null;
  sku: string | null;
  isAvailable: boolean;
}

async function scrapeProductDetails(url: string): Promise<ScrapedProduct> {
  try {
    // Fetch the HTML page with proper user-agent
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,nl;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 30000,
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);

    // Initialize result
    const result: ScrapedProduct = {
      name: "",
      price: null,
      imageUrl: null,
      sku: null,
      isAvailable: false,
    };

    // Try to extract product name from various common selectors
    const nameSelectors = [
      'h1[data-testid="product-title"]',
      "h1.product-title",
      "h1.product-name",
      ".product-title h1",
      ".product-name",
      'h1[class*="title"]',
      'h1[class*="name"]',
      "h1",
      '[data-testid*="title"]',
      '[data-testid*="name"]',
    ];

    for (const selector of nameSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        result.name = element.text().trim();
        break;
      }
    }

    // Try to extract price from various selectors
    const priceSelectors = [
      // Common price patterns
      '[data-testid*="price"]',
      ".price",
      ".current-price",
      ".product-price",
      ".sale-price",
      '[class*="price"]',
      "[data-price]",
      ".price-current",
      ".regular-price",
      ".final-price",

      // Belgian store specific patterns
      ".price-value", // Mediamarkt
      ".product-price-value", // Fnac
      ".price-amount", // Dreamland
      ".sales-price", // Coolblue
      ".promo-price", // Bol.com

      // Generic patterns
      'span[class*="price"]',
      'div[class*="price"]',
      ".amount",
      ".cost",
    ];

    for (const selector of priceSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        const priceText = element
          .text()
          .replace(/[^\d.,]/g, "")
          .replace(",", ".");
        const price = parseFloat(priceText);
        if (!isNaN(price) && price > 0) {
          result.price = price;
          break;
        }
      }
    }

    // Try to extract main product image
    const imageSelectors = [
      // Common product image patterns
      ".product-image img",
      ".product-gallery img",
      ".product-detail-image img",
      '[data-testid*="image"] img',
      '[data-testid*="product"] img',
      ".main-image img",
      ".hero-image img",
      ".primary-image img",

      // Belgian store specific patterns
      ".pdp-image img", // Mediamarkt
      ".product-visual img", // Fnac
      ".product-photo img", // Dreamland
      ".article-image img", // Coolblue
      ".js-product-images img", // Bol.com

      // Generic fallbacks
      'img[class*="product"]',
      'img[alt*="product" i]',
      'img[src*="product"]',
      "picture img",
      ".gallery img:first-child",
      ".images img:first-child",
    ];

    for (const selector of imageSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const src =
          element.attr("src") ||
          element.attr("data-src") ||
          element.attr("data-lazy") ||
          element.attr("data-original");

        if (
          src &&
          !src.includes("placeholder") &&
          !src.includes("loading") &&
          !src.includes("no-image") &&
          !src.includes("default") &&
          src.length > 10 &&
          (src.includes("jpg") ||
            src.includes("jpeg") ||
            src.includes("png") ||
            src.includes("webp"))
        ) {
          // Convert relative URLs to absolute
          try {
            result.imageUrl = src.startsWith("http")
              ? src
              : new URL(src, url).href;
            break;
          } catch (urlError) {
            console.warn("Invalid image URL:", src);
            continue;
          }
        }
      }
    }

    // Try to extract SKU from various sources
    const skuSelectors = [
      "[data-sku]",
      ".sku",
      ".product-sku",
      '[class*="sku"]',
      '[data-testid*="sku"]',
    ];

    for (const selector of skuSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const sku = element.text().trim() || element.attr("data-sku");
        if (sku) {
          result.sku = sku;
          break;
        }
      }
    }

    // Check availability from various indicators
    const availabilitySelectors = [
      ".in-stock",
      ".available",
      '[data-testid*="stock"]',
      ".stock-status",
      ".add-to-cart",
      'button[data-testid*="add"]',
    ];

    for (const selector of availabilitySelectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().toLowerCase();
        if (
          text.includes("in stock") ||
          text.includes("beschikbaar") ||
          text.includes("add to cart") ||
          text.includes("toevoegen aan winkelwagen") ||
          (!text.includes("out of stock") &&
            !text.includes("uitverkocht") &&
            !text.includes("niet beschikbaar"))
        ) {
          result.isAvailable = true;
          break;
        }
      }
    }

    // Try JSON-LD structured data as fallback
    try {
      const jsonLdScripts = $('script[type="application/ld+json"]');

      for (let i = 0; i < jsonLdScripts.length; i++) {
        const scriptContent = $(jsonLdScripts[i]).html();
        if (!scriptContent) continue;

        const jsonData = JSON.parse(scriptContent);
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];

        for (const data of dataArray) {
          if (data["@type"] === "Product" || data["@type"] === "ProductGroup") {
            // Extract name if not found
            if (!result.name && data.name) {
              result.name = data.name;
            }

            // Extract price if not found
            if (!result.price && data.offers) {
              const offers = Array.isArray(data.offers)
                ? data.offers
                : [data.offers];
              for (const offer of offers) {
                if (offer.price) {
                  result.price = parseFloat(offer.price);
                  break;
                }
              }
            }

            // Extract availability if not determined
            if (!result.isAvailable && data.offers) {
              const offers = Array.isArray(data.offers)
                ? data.offers
                : [data.offers];
              for (const offer of offers) {
                if (
                  offer.availability === "https://schema.org/InStock" ||
                  offer.availability === "InStock"
                ) {
                  result.isAvailable = true;
                  break;
                }
              }
            }

            // Extract image if not found
            if (!result.imageUrl && data.image) {
              const image = Array.isArray(data.image)
                ? data.image[0]
                : data.image;
              if (typeof image === "string") {
                result.imageUrl = image.startsWith("http")
                  ? image
                  : new URL(image, url).href;
              } else if (image.url) {
                result.imageUrl = image.url.startsWith("http")
                  ? image.url
                  : new URL(image.url, url).href;
              }
            }

            // Extract SKU if not found
            if (!result.sku && (data.sku || data.mpn || data.gtin)) {
              result.sku = data.sku || data.mpn || data.gtin;
            }
          }
        }
      }
    } catch (jsonError) {
      console.warn("Failed to parse JSON-LD:", jsonError);
    }

    return result;
  } catch (error) {
    console.error("Error scraping product:", error);
    throw new Error("Failed to scrape product details");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, storeId } = await request.json();

    if (!url || !storeId) {
      return NextResponse.json(
        { error: "URL and store ID are required" },
        { status: 400 },
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    // Create Supabase client
    const supabase = getSupabaseServer();

    // Verify store exists
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Scrape product details
    const scrapedProduct = await scrapeProductDetails(url);

    // Return scraped data for review
    return NextResponse.json({
      success: true,
      product: {
        ...scrapedProduct,
        url,
        store_id: storeId,
        store_name: store.name,
      },
    });
  } catch (error) {
    console.error("Error in product scraping API:", error);
    return NextResponse.json(
      { error: "Failed to scrape product details" },
      { status: 500 },
    );
  }
}
