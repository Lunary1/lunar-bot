import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

const supabaseUrl = "https://gmtxywvavnfgfxjaikdb.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtdHh5d3Zhdm5mZ2Z4amFpa2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NDkxNjcsImV4cCI6MjA3NjAyNTE2N30.JYzF25jp4Mj6JDJp3-rFVZCD12sG1EgsTRjfnMk4QKI";

export const supabase = createPagesBrowserClient({
  supabaseUrl,
  supabaseKey: supabaseAnonKey,
});
