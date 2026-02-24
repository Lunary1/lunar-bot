import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET - List all products with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const storeId = searchParams.get("store_id");
    const search = searchParams.get("search");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let query = supabase
      .from("products")
      .select(
        `
        *,
        store:stores(
          id,
          name,
          base_url
        )
      `
      )
      .order("created_at", { ascending: false });

    // Apply filters
    if (storeId) {
      query = query.eq("store_id", storeId);
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: products,
      error,
      count,
    } = await query.range(from, to).single();

    if (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error in products API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, store_id, current_price, sku, image_url, is_available } =
      body;

    if (!name || !url || !store_id) {
      return NextResponse.json(
        { error: "Name, URL, and store ID are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Check if product already exists with this URL
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id")
      .eq("url", url)
      .single();

    if (existingProduct) {
      return NextResponse.json(
        { error: "Product with this URL already exists" },
        { status: 409 }
      );
    }

    // Create new product
    const { data: newProduct, error } = await supabase
      .from("products")
      .insert({
        name,
        url,
        store_id,
        current_price: current_price || null,
        sku: sku || null,
        image_url: image_url || null,
        is_available: is_available || false,
        last_checked: new Date().toISOString(),
      })
      .select(
        `
        *,
        store:stores(
          id,
          name,
          base_url
        )
      `
      )
      .single();

    if (error) {
      console.error("Error creating product:", error);
      return NextResponse.json(
        { error: "Failed to create product" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        product: newProduct,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in products API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
