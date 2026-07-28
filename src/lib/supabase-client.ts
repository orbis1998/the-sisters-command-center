import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured) {
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Set them in Vercel (Environment Variables) and redeploy.",
  );
}

export const supabase = createClient(
  url ?? "https://invalid.supabase.co",
  key ?? "invalid-anon-key",
);
