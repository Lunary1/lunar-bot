import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/app/lib/supabaseServer";
import { encryptSensitiveData } from "@/lib/encryption";

// POST /api/accounts — create a new store account
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { store_id, username, password } = body;

    if (!store_id || !username || !password) {
      return NextResponse.json(
        { error: "store_id, username and password are required" },
        { status: 400 },
      );
    }

    const password_encrypted = encryptSensitiveData(password);

    const { data, error } = await supabase
      .from("user_store_accounts")
      .insert({ user_id: user.id, store_id, username, password_encrypted })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/accounts error:", error);
    return NextResponse.json(
      { error: "Failed to create store account" },
      { status: 500 },
    );
  }
}

// PATCH /api/accounts — update an existing store account
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, store_id, username, password } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Account id is required" },
        { status: 400 },
      );
    }

    // Build update payload — only include password_encrypted if a new password was supplied
    const updates: Record<string, unknown> = {};
    if (store_id !== undefined) updates.store_id = store_id;
    if (username !== undefined) updates.username = username;
    if (password) updates.password_encrypted = encryptSensitiveData(password);

    const { data, error } = await supabase
      .from("user_store_accounts")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id) // extra safety: user can only edit their own rows
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error("PATCH /api/accounts error:", error);
    return NextResponse.json(
      { error: "Failed to update store account" },
      { status: 500 },
    );
  }
}
