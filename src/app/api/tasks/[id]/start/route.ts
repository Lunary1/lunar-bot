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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const taskId = params.id;

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 },
      );
    }

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from("purchase_tasks")
      .select(
        `
        *,
        product:products(*),
        store_account:user_store_accounts(*)
      `,
      )
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if task is already running
    if (task.status === "running") {
      return NextResponse.json(
        { error: "Task is already running" },
        { status: 400 },
      );
    }

    // Update task status to queued
    await supabase
      .from("purchase_tasks")
      .update({ status: "queued" })
      .eq("id", taskId);

    // Try to add task to execution queue
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

      return NextResponse.json({
        success: true,
        message: "Task started successfully",
        taskId: task.id,
      });
    } catch (queueError) {
      console.warn("Task queue not available:", queueError);
      return NextResponse.json({
        success: false,
        message: "Task created but queue not available",
        taskId: task.id,
      });
    }
  } catch (error) {
    console.error("Error starting task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
