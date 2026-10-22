import { createClient } from "@supabase/supabase-js";

// Anon key is public by design (safe in frontend). Hardcoded so GitHub Pages
// builds work even if .env is missing during `npm run build`.
const url = "https://eezncrhfwaptdvzidruy.supabase.co";
const anon =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlem5jcmhmd2FwdGR2emlkcnV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1ODYyNjMsImV4cCI6MjEwODE2MjI2M30.UNjbinE4JRbTgd_LT_4gW9AUdK2a7EAyQ71CccOZy4E";

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});