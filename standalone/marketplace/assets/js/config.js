// Supabase configuration
const SUPABASE_URL = "https://khzlqesyhkmucewiwmkg.supabase.co";
const SUPABASE_KEY = "sb_publishable_H-_oWH1MCm7IGHCwN4GgrA_liCtk90Z";
window.SUPABASE_URL = window.SUPABASE_URL || SUPABASE_URL;
window.SUPABASE_KEY = window.SUPABASE_KEY || SUPABASE_KEY;

window.supabaseClient = window.supabaseClient || null;

function initSupabase() {
  if (!window.supabase) {
    console.error("Supabase library not loaded.");
    return false;
  }

  if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return true;
}
