import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseClient";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Update task status to cancelled
    const { error } = await supabase
      .from("purchase_tasks")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to stop task" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Task stopped successfully",
      taskId: taskId,
    });
  } catch (error) {
    console.error("Error stopping task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}





