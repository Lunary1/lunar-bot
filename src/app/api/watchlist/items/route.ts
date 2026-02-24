import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/app/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    // Get user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's watchlist items with related data
    const { data: watchlistItems, error } = await supabase
      .from("user_watchlists")
      .select(
        `
        id,
        max_price,
        auto_purchase,
        created_at,
        product:products(
          id,
          name,
          url,
          current_price,
          is_available,
          image_url,
          sku,
          last_checked
        ),
        store:stores(
          name,
          base_url
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch watchlist items" },
        { status: 500 }
      );
    }

    // Transform the data to include status
    const transformedItems = watchlistItems.map((item: any) => ({
      id: item.id,
      product: item.product,
      store: item.store,
      max_price: item.max_price,
      auto_purchase: item.auto_purchase,
      created_at: item.created_at,
      status: "monitoring", // This would be determined by checking task status
    }));

    return NextResponse.json({
      success: true,
      items: transformedItems,
    });
  } catch (error) {
    console.error("Watchlist items error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
