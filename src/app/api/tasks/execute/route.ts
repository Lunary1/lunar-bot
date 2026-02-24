import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/app/lib/supabaseServer";
import { TaskExecutor } from "@/workers/TaskExecutor";
import IORedis from "ioredis";

const supabase = getSupabaseServer();

// Initialize Redis connection
const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

// Initialize task executor (singleton)
let taskExecutor: TaskExecutor | null = null;

const getTaskExecutor = () => {
  if (!taskExecutor) {
    taskExecutor = new TaskExecutor(redis);
  }
  return taskExecutor;
};

export async function POST(request: NextRequest) {
  try {
    const taskData = await request.json();

    // Validate required fields
    const requiredFields = [
      "storeId",
      "productId",
      "profileId",
      "storeAccountId",
    ];
    for (const field of requiredFields) {
      if (!taskData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 },
        );
      }
    }

    // Create task in database first
    const { data: task, error: taskError } = await supabase
      .from("purchase_tasks")
      .insert({
        user_id: taskData.userId,
        product_id: taskData.productId,
        store_account_id: taskData.storeAccountId,
        proxy_id: taskData.proxyId,
        priority: taskData.priority || 1,
        status: "queued",
        quantity: taskData.quantity || 1,
        max_price: taskData.maxPrice,
        auto_purchase: taskData.autoPurchase || false,
        delay: taskData.delay || 0,
        retries: taskData.retries || 3,
        mode: taskData.mode || "monitor",
      })
      .select()
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Failed to create task" },
        { status: 500 },
      );
    }

    // Try to add task to execution queue (optional - Redis might not be available)
    try {
      const executor = getTaskExecutor();
      await executor.addTask({
        taskId: task.id,
        userId: task.user_id,
        productId: task.product_id,
        storeAccountId: task.store_account_id,
        proxyId: task.proxy_id,
        priority: task.priority,
      });
    } catch (queueError) {
      console.warn(
        "Task queue not available, task created but not queued:",
        queueError,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Task created successfully",
      task: task,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 },
      );
    }

    // Get task status
    const { data: task, error } = await supabase
      .from("purchase_tasks")
      .select("id, status, started_at, completed_at, error_message")
      .eq("id", taskId)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      startedAt: task.started_at,
      completedAt: task.completed_at,
      errorMessage: task.error_message,
    });
  } catch (error) {
    console.error("Error getting task status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
