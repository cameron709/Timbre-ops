"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type BrowserClient = ReturnType<typeof createClient<Database>>;

let browserClient: BrowserClient | undefined;

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function createBrowserClient() {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://sdipclikyujdrjthpnct.supabase.co";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "missing-publishable-key";

  browserClient = createClient<Database>(supabaseUrl, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return browserClient;
}
