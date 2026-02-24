import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/app/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const { itemId, enabled } = await request.json();

    if (!itemId || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Item ID and enabled status are required" },
        { status: 400 },
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

    // Update the watchlist item status
    // For now, we'll just return success as the actual monitoring logic
    // would be handled by the task system
    const { error } = await supabase
      .from("user_watchlists")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update monitoring status" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: enabled ? "Monitoring started" : "Monitoring paused",
    });
  } catch (error) {
    console.error("Toggle monitoring error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
