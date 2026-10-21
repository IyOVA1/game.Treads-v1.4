import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  console.warn(
    "[Treads] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — auth will fail."
  );
}

export const supabase = createClient(url || "https://example.supabase.co", anon || "missing");
