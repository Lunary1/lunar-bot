import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * User-scoped client for App Router route handlers and Server Components.
 * Reads the session from request cookies — respects RLS, returns the
 * authenticated user from auth.getUser().
 *
 * Usage in a route handler:
 *   const supabase = await createRouteClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */
export async function createRouteClient() {
  const cookieStore = await cookies();

  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll is called from Server Components where mutation is not
            // allowed — safe to ignore, middleware handles the refresh.
          }
        },
      },
    },
  );
}

/**
 * Service-role singleton for server-to-server calls (bypasses RLS).
 * Never expose this client to the browser or return its data unfiltered.
 */
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing Supabase server env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY",
      );
    }
    _supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabaseAdmin;
}

/**
 * Legacy named export kept for backwards compatibility.
 * Existing imports of `supabase` from this file still work but
 * use the service-role client — migrate call sites to createRouteClient()
 * wherever user auth context is needed.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseServer() as any)[prop];
  },
});
