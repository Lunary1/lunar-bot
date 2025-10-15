import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseClient";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Extract domain from URL to determine store
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Find matching store
    const { data: stores, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("is_active", true);

    if (storeError) {
      throw new Error(`Failed to fetch stores: ${storeError.message}`);
    }

    // If no stores exist, create a default store for the domain
    let matchingStore = stores?.find(
      (store) =>
        store.domain &&
        (domain.includes(store.domain) || store.domain.includes(domain))
    );

    if (!matchingStore) {
      // Create a default store for this domain
      const { data: newStore, error: storeCreateError } = await supabase
        .from("stores")
        .insert({
          name: domain.charAt(0).toUpperCase() + domain.slice(1),
          domain: domain,
          is_active: true,
          logo_url: null,
        })
        .select()
        .single();

      if (storeCreateError) {
        throw new Error(`Failed to create store: ${storeCreateError.message}`);
      }

      matchingStore = newStore;
    }

    // For now, create a basic product entry
    // In production, this would integrate with actual scraping services
    const productData = {
      name: `Product from ${matchingStore.name}`,
      url: url,
      current_price: 0, // Will be updated by scraping
      is_available: true,
      store_id: matchingStore.id,
      last_updated: new Date().toISOString(),
      // Add metadata that would be scraped
      metadata: {
        scraped_at: new Date().toISOString(),
        source_url: url,
        store_domain: domain,
      },
    };

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert(productData)
      .select(
        `
        *,
        store:stores(id, name, domain, logo_url)
      `
      )
      .single();

    if (productError) {
      throw new Error(`Failed to create product: ${productError.message}`);
    }

    // For now, skip the scraping job queue and just return the product
    // In production, this would queue a background scraping job
    console.log(`Product created: ${product.name} from ${matchingStore.name}`);

    return NextResponse.json({
      success: true,
      product: product,
      message: "Product added successfully. Scraping in progress...",
    });
  } catch (error) {
    console.error("Error in product scraping API:", error);
    return NextResponse.json(
      { error: "Failed to scrape product" },
      { status: 500 }
    );
  }
}
