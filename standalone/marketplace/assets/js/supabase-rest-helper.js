
(function () {
  window.ALO_SUPABASE = window.ALO_SUPABASE || {};

  window.ALO_SUPABASE.getConfig = function () {
    const url =
      window.SUPABASE_URL ||
      window.supabaseUrl ||
      window.supabase_url ||
      (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "") ||
      localStorage.getItem("SUPABASE_URL") ||
      "https://khzlqesyhkmucewiwmkg.supabase.co";

    const key =
      window.SUPABASE_ANON_KEY ||
      window.SUPABASE_KEY ||
      window.supabaseAnonKey ||
      window.supabaseKey ||
      (typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "") ||
      (typeof SUPABASE_KEY !== "undefined" ? SUPABASE_KEY : "") ||
      localStorage.getItem("SUPABASE_ANON_KEY") ||
      localStorage.getItem("SUPABASE_KEY") ||
      "";

    return { url, key };
  };

  window.ALO_SUPABASE.rest = async function (path, options = {}) {
    const cfg = window.ALO_SUPABASE.getConfig();

    if (!cfg.url || !cfg.key) {
      throw new Error("SUPABASE_URL أو SUPABASE_ANON_KEY غير موجودين في assets/js/config.js");
    }

    const headers = Object.assign({
      "apikey": cfg.key,
      "Authorization": "Bearer " + cfg.key,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    }, options.headers || {});

    const res = await fetch(cfg.url.replace(/\/$/, "") + "/rest/v1/" + path, Object.assign({}, options, { headers }));

    if (!res.ok) throw new Error(await res.text());
    if (res.status === 204) return null;

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  };
})();
