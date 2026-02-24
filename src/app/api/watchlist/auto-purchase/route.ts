import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { watchlistId, autoPurchase, maxPrice, quantity } =
      await request.json();

    if (!watchlistId) {
      return NextResponse.json(
        { error: "Watchlist ID is required" },
        { status: 400 }
      );
    }

    // Update watchlist item with auto-purchase settings
    const { data, error } = await supabase
      .from("user_watchlists")
      .update({
        auto_purchase: autoPurchase || false,
        max_price: maxPrice || null,
        quantity: quantity || 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", watchlistId)
      .select()
      .single();

    if (error) {
      console.error("Error updating watchlist:", error);
      return NextResponse.json(
        { error: "Failed to update watchlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Watchlist auto-purchase settings updated",
      data,
    });
  } catch (error) {
    console.error("Auto-purchase update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user's watchlist items with auto-purchase enabled
    const { data: watchlistItems, error } = await supabase
      .from("user_watchlists")
      .select(
        `
        *,
        product:products(
          id,
          name,
          current_price,
          is_available,
          url,
          image_url,
          store:stores(id, name)
        )
      `
      )
      .eq("user_id", userId)
      .eq("auto_purchase", true)
      .eq("status", "monitoring");

    if (error) {
      console.error("Error fetching watchlist items:", error);
      return NextResponse.json(
        { error: "Failed to fetch watchlist items" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: watchlistItems,
    });
  } catch (error) {
    console.error("Get auto-purchase items error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
