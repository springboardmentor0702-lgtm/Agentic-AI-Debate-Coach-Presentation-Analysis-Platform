import { createClient } from "@supabase/supabase-js";

// It's an easy copy-paste mistake to grab a Supabase URL that already
// has "/rest/v1" or a trailing slash on it from the dashboard - the
// SDK then builds broken double paths. Normalize it here so that
// mistake can't silently break auth.
function normalizeSupabaseUrl(url) {
  return (url || "")
    .trim()
    .replace(/\/(rest|auth)\/v1\/?$/, "")
    .replace(/\/$/, "");
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
