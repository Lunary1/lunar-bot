import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const { itemId, autoPurchase } = await request.json();

    if (!itemId || typeof autoPurchase !== "boolean") {
      return NextResponse.json(
        { error: "Item ID and auto-purchase status are required" },
        { status: 400 }
      );
    }

    // Get user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update the auto-purchase setting
    const { error } = await supabase
      .from("user_watchlists")
      .update({
        auto_purchase: autoPurchase,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update auto-purchase setting" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: autoPurchase
        ? "Auto-purchase enabled"
        : "Auto-purchase disabled",
    });
  } catch (error) {
    console.error("Auto-purchase toggle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
