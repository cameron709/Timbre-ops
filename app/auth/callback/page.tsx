"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    supabase.auth.getSession().finally(() => router.replace("/"));
  }, [router, supabase]);

  return <main className="center-screen">Signing you in...</main>;
}
