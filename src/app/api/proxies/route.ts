import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/app/lib/supabaseServer";
import { encryptSensitiveData } from "@/lib/encryption";

// POST /api/proxies — create a new proxy
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
    const { host, port, username, password, proxy_type } = body;

    if (!host || !port) {
      return NextResponse.json(
        { error: "host and port are required" },
        { status: 400 },
      );
    }

    const payload: Record<string, unknown> = {
      user_id: user.id,
      host,
      port: parseInt(port),
      username: username || null,
      proxy_type: proxy_type || "http",
    };

    if (password) {
      payload.password_encrypted = encryptSensitiveData(password);
    }

    const { data, error } = await supabase
      .from("proxies")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/proxies error:", error);
    return NextResponse.json(
      { error: "Failed to create proxy" },
      { status: 500 },
    );
  }
}

// PATCH /api/proxies — update an existing proxy
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
    const { id, host, port, username, password, proxy_type } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Proxy id is required" },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    if (host !== undefined) updates.host = host;
    if (port !== undefined) updates.port = parseInt(port);
    if (username !== undefined) updates.username = username || null;
    if (proxy_type !== undefined) updates.proxy_type = proxy_type;
    if (password) updates.password_encrypted = encryptSensitiveData(password);

    const { data, error } = await supabase
      .from("proxies")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error("PATCH /api/proxies error:", error);
    return NextResponse.json(
      { error: "Failed to update proxy" },
      { status: 500 },
    );
  }
}
