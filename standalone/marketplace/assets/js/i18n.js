
(function () {
  const DEFAULT_LANG = "ar";
  const SUPPORTED_FALLBACK = ["ar", "en"];
  let currentDictionary = {};

  function getLangFromUrl() {
    return new URLSearchParams(window.location.search).get("lang");
  }

  function getLang() {
    const urlLang = getLangFromUrl();
    if (urlLang) {
      localStorage.setItem("alo_lang", urlLang);
      return urlLang;
    }
    return localStorage.getItem("alo_lang") || DEFAULT_LANG;
  }

  function updateUrlLang(lang) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    window.history.replaceState({}, "", url.toString());
  }

  function updateLinks(lang) {
    document.querySelectorAll("a[href]").forEach(function (a) {
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("http")) return;
      try {
        const url = new URL(href, window.location.href);
        url.searchParams.set("lang", lang);
        a.setAttribute("href", url.pathname.split("/").pop() + url.search + url.hash);
      } catch (_) {}
    });
  }

  async function loadJsonDictionary(lang) {
    try {
      const res = await fetch("assets/i18n/" + lang + ".json?v=69.0.0", { cache: "no-store" });
      if (!res.ok) throw new Error("Missing local lang file");
      return await res.json();
    } catch (e) {
      if (!SUPPORTED_FALLBACK.includes(lang)) return {};
      return {};
    }
  }

  async function loadDbDictionary(lang) {
    if (lang === DEFAULT_LANG) return {};
    const supabaseUrl = window.SUPABASE_URL || (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "");
    const anonKey = window.SUPABASE_ANON_KEY || (typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "");
    if (!supabaseUrl || !anonKey) return {};

    try {
      const url = supabaseUrl.replace(/\/$/, "") + "/rest/v1/ui_translations?language_code=eq." + encodeURIComponent(lang) + "&status=eq.ready&select=translation_key,translated_text";
      const res = await fetch(url, {
        headers: {
          apikey: anonKey,
          Authorization: "Bearer " + anonKey
        }
      });
      if (!res.ok) return {};
      const rows = await res.json();
      const out = {};
      rows.forEach(function (r) {
        out[r.translation_key] = r.translated_text || "";
      });
      return out;
    } catch (e) {
      console.warn("DB translations failed", e);
      return {};
    }
  }

  function t(key, fallback) {
    return currentDictionary[key] || fallback || key;
  }

  function applyDictionary(lang, dict) {
    currentDictionary = dict || {};
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.body && document.body.setAttribute("data-lang", lang);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const key = el.getAttribute("data-i18n");
      const value = t(key, el.textContent);
      if (value) el.textContent = value;
    });

    ["placeholder", "title", "aria-label"].forEach(function(attr) {
      document.querySelectorAll("[data-i18n-" + attr + "]").forEach(function(el) {
        const key = el.getAttribute("data-i18n-" + attr);
        const value = t(key, el.getAttribute(attr));
        if (value) el.setAttribute(attr, value);
      });
    });

    document.dispatchEvent(new CustomEvent("alo:language-applied", { detail: { lang: lang, dictionary: currentDictionary } }));
  }

  async function setLanguage(lang) {
    lang = lang || DEFAULT_LANG;
    localStorage.setItem("alo_lang", lang);
    updateUrlLang(lang);
    updateLinks(lang);

    const ar = await loadJsonDictionary(DEFAULT_LANG);
    const local = await loadJsonDictionary(lang);
    const db = await loadDbDictionary(lang);

    const dict = Object.assign({}, ar, local, db);
    applyDictionary(lang, dict);
  }

  window.AloI18n = {
    getLang: getLang,
    setLanguage: setLanguage,
    t: t,
    reload: function () { return setLanguage(getLang()); }
  };

  document.addEventListener("DOMContentLoaded", function () {
    setLanguage(getLang());
  });
})();
