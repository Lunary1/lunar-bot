import { NextRequest, NextResponse } from "next/server";
import { ProductScraper } from "@/workers/ProductScraper";
import { getSupabaseServer } from "@/app/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { productId, url, storeId } = await request.json();

    if (!productId || !url || !storeId) {
      return NextResponse.json(
        { error: "Product ID, URL, and Store ID are required" },
        { status: 400 },
      );
    }

    // Initialize scraper
    const scraper = new ProductScraper();

    try {
      // Scrape product data
      const productData = await scraper.scrapeProductData(url, storeId);

      if (!productData) {
        return NextResponse.json(
          { error: "Failed to scrape product data" },
          { status: 500 },
        );
      }

      // Update product in database
      const { error: updateError } = await supabase
        .from("products")
        .update({
          name: productData.name,
          current_price: productData.current_price,
          is_available: productData.is_available,
          image_url: productData.image_url,
          description: productData.description,
          sku: productData.sku,
          last_updated: productData.last_updated,
          error_message: null,
        })
        .eq("id", productId);

      if (updateError) {
        console.error("Error updating product:", updateError);
        return NextResponse.json(
          { error: "Failed to update product in database" },
          { status: 500 },
        );
      }

      // Create price history entry
      if (productData.current_price > 0) {
        await supabase.from("price_history").insert({
          product_id: productId,
          price: productData.current_price,
          date: new Date().toISOString(),
        });
      }

      await scraper.close();

      return NextResponse.json({
        success: true,
        message: "Product scraped successfully",
        data: productData,
      });
    } catch (scrapeError) {
      await scraper.close();
      throw scrapeError;
    }
  } catch (error) {
    console.error("Product scraping error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 },
      );
    }

    // Get product details
    const { data: product, error } = await supabase
      .from("products")
      .select(
        `
        *,
        store:stores(id, name, domain),
        price_history:price_history(
          price,
          date
        )
      `,
      )
      .eq("id", productId)
      .single();

    if (error) {
      console.error("Error fetching product:", error);
      return NextResponse.json(
        { error: "Failed to fetch product" },
        { status: 500 },
      );
    }

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
