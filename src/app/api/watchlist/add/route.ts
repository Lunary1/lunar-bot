import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseServer";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { product, maxPrice, autoPurchase } = await request.json();

    if (!product || !product.name || !product.url) {
      return NextResponse.json(
        { error: "Product information is required" },
        { status: 400 }
      );
    }

    // Get user from session
    const cookieStore = cookies();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, check if the store exists, if not create it
    let storeId;
    const { data: existingStore } = await supabase
      .from("stores")
      .select("id")
      .eq("name", product.store)
      .single();

    if (existingStore) {
      storeId = existingStore.id;
    } else {
      // Create new store
      const { data: newStore, error: storeError } = await supabase
        .from("stores")
        .insert({
          name: product.store,
          base_url:
            product.storeUrl || `https://www.${product.store.toLowerCase()}.be`,
          is_active: true,
          rate_limit_per_minute: 10,
          requires_proxy: false,
        })
        .select("id")
        .single();

      if (storeError) {
        return NextResponse.json(
          { error: "Failed to create store" },
          { status: 500 }
        );
      }
      storeId = newStore.id;
    }

    // Check if product already exists
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id")
      .eq("url", product.url)
      .single();

    let productId;
    if (existingProduct) {
      productId = existingProduct.id;
    } else {
      // Create new product
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          store_id: storeId,
          name: product.name,
          sku: product.sku,
          url: product.url,
          current_price: product.price,
          is_available: product.availability,
          image_url: product.imageUrl,
          last_checked: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (productError) {
        return NextResponse.json(
          { error: "Failed to create product" },
          { status: 500 }
        );
      }
      productId = newProduct.id;
    }

    // Add to user's watchlist
    const { data: watchlistItem, error: watchlistError } = await supabase
      .from("user_watchlists")
      .insert({
        user_id: user.id,
        product_id: productId,
        max_price: maxPrice,
        auto_purchase: autoPurchase || false,
      })
      .select("id")
      .single();

    if (watchlistError) {
      return NextResponse.json(
        { error: "Failed to add to watchlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product added to watchlist",
      watchlistId: watchlistItem.id,
    });
  } catch (error) {
    console.error("Watchlist add error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
