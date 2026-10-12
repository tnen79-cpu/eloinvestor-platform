
(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang") || "en";
  const TRANSLATE_URL = "https://khzlqesyhkmucewiwmkg.supabase.co/functions/v1/translate-project";

  let keys = [];
  let translations = {};
  let localFile = {};

  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[m];
    });
  }

  function getConfig() {
    if (window.ALO_SUPABASE && typeof window.ALO_SUPABASE.getConfig === "function") {
      return window.ALO_SUPABASE.getConfig();
    }

    return {
      url: window.SUPABASE_URL || (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "") || "https://khzlqesyhkmucewiwmkg.supabase.co",
      key: window.SUPABASE_ANON_KEY || window.SUPABASE_KEY || (typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "") || (typeof SUPABASE_KEY !== "undefined" ? SUPABASE_KEY : "")
    };
  }

  async function rest(path, options = {}) {
    const cfg = getConfig();
    if (!cfg.url || !cfg.key) throw new Error("SUPABASE_URL أو SUPABASE_ANON_KEY غير موجودين داخل config.js");

    const res = await fetch(cfg.url.replace(/\/$/, "") + "/rest/v1/" + path, {
      method: options.method || "GET",
      headers: Object.assign({
        apikey: cfg.key,
        Authorization: "Bearer " + cfg.key,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      }, options.headers || {}),
      body: options.body
    });

    if (!res.ok) throw new Error(await res.text());
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  function setError(error) {
    const body = $("translationRows");
    if (body) {
      body.innerHTML = '<tr><td colspan="3" style="color:#b42318;white-space:pre-wrap;font-weight:800">' + esc(error && error.message ? error.message : error) + "</td></tr>";
    }
  }

  async function loadLocal() {
    try {
      const res = await fetch("assets/i18n/" + lang + ".json?v=72.0.0", { cache: "no-store" });
      localFile = res.ok ? await res.json() : {};
    } catch (_) {
      localFile = {};
    }
  }

  async function load() {
    try {
      if ($("langLabel")) $("langLabel").textContent = lang;
      if ($("translationRows")) $("translationRows").innerHTML = '<tr><td colspan="3">جاري تحميل مفاتيح الترجمة...</td></tr>';

      await loadLocal();

      keys = await rest("ui_translation_keys?select=*&order=translation_key.asc");
      const rows = await rest("ui_translations?language_code=eq." + encodeURIComponent(lang) + "&select=*");

      translations = {};
      (rows || []).forEach(function (r) {
        translations[r.translation_key] = r.translated_text || "";
      });

      render();
    } catch (error) {
      console.error("Translation editor load failed:", error);
      setError(error);
    }
  }

  function render() {
    const body = $("translationRows");
    if (!body) return;

    const q = (($("searchInput") && $("searchInput").value) || "").toLowerCase();
    const filtered = (keys || []).filter(function (k) {
      return !q || String(k.translation_key || "").toLowerCase().includes(q) || String(k.source_text || "").toLowerCase().includes(q);
    });

    if (!filtered.length) {
      body.innerHTML = '<tr><td colspan="3">لا توجد مفاتيح ترجمة. تأكد أنك شغّلت ملف seed.</td></tr>';
      return;
    }

    body.innerHTML = filtered.map(function (k) {
      const value = translations[k.translation_key] || localFile[k.translation_key] || "";
      return '<tr data-key="' + esc(k.translation_key) + '" data-source="' + esc(k.source_text || "") + '">' +
        '<td><div class="key">' + esc(k.translation_key) + '</div><div class="group">' + esc(k.group_name || "general") + '</div></td>' +
        '<td><div class="source">' + esc(k.source_text || "") + '</div></td>' +
        '<td><textarea>' + esc(value) + '</textarea></td>' +
        '</tr>';
    }).join("");
  }

  async function saveOne(key, value) {
    const cfg = getConfig();
    if (!cfg.url || !cfg.key) throw new Error("SUPABASE_URL أو SUPABASE_ANON_KEY غير موجودين داخل config.js");

    const res = await fetch(cfg.url.replace(/\/$/, "") + "/rest/v1/ui_translations?on_conflict=translation_key,language_code", {
      method: "POST",
      headers: {
        apikey: cfg.key,
        Authorization: "Bearer " + cfg.key,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify({
        translation_key: key,
        language_code: lang,
        translated_text: value,
        status: value ? "ready" : "draft",
        translated_by: "manual",
        updated_at: new Date().toISOString()
      })
    });

    if (!res.ok) throw new Error(await res.text());
  }

  async function saveAll() {
    const btn = $("saveAllBtn");
    const rows = Array.from(document.querySelectorAll("#translationRows tr[data-key]"));
    if (!rows.length) return alert("لا توجد ترجمات للحفظ");

    let saved = 0, failed = 0;

    try {
      if (btn) { btn.disabled = true; btn.textContent = "جاري الحفظ..."; }

      for (const tr of rows) {
        const key = tr.getAttribute("data-key");
        const area = tr.querySelector("textarea");
        try {
          await saveOne(key, area ? area.value : "");
          saved++;
        } catch (e) {
          console.error("Save failed:", key, e);
          failed++;
        }
      }

      alert("تم حفظ " + saved + " ترجمة | فشل " + failed);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "حفظ الكل"; }
    }
  }

  function autoFillFromFile() {
    document.querySelectorAll("#translationRows tr[data-key]").forEach(function (tr) {
      const key = tr.getAttribute("data-key");
      const area = tr.querySelector("textarea");
      if (area && !area.value && localFile[key]) area.value = localFile[key];
    });
  }

  async function translateText(text) {
    const res = await fetch(TRANSLATE_URL, {
      method: "POST",
      body: JSON.stringify({ text: text, source: "ar", target: lang })
    });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok || data.error) throw new Error(data.error || data.message || "Translation failed");
    return data.translated || text;
  }

  function setStatus(message) {
    const el = $("autoTranslateStatus");
    if (el) el.textContent = message;
  }

  async function autoTranslateEmpty() {
    if (lang === "ar") return alert("العربية هي اللغة الأساسية");

    const rows = Array.from(document.querySelectorAll("#translationRows tr[data-key]"));
    const emptyRows = rows.filter(function (tr) {
      const area = tr.querySelector("textarea");
      const source = tr.getAttribute("data-source") || "";
      return area && !area.value.trim() && source.trim();
    });

    if (!emptyRows.length) return alert("لا توجد فراغات للترجمة");

    let done = 0, failed = 0;
    for (const tr of emptyRows) {
      const area = tr.querySelector("textarea");
      const source = tr.getAttribute("data-source") || "";
      try { area.value = await translateText(source); done++; }
      catch (e) { console.warn("Translate failed:", source, e); failed++; }
      setStatus("تمت ترجمة: " + done + " | فشل: " + failed);
      await new Promise(resolve => setTimeout(resolve, 160));
    }
    alert("انتهت الترجمة التلقائية. اضغط حفظ الكل.");
  }

  async function autoTranslateAllVisible() {
    if (lang === "ar") return alert("العربية هي اللغة الأساسية");

    const rows = Array.from(document.querySelectorAll("#translationRows tr[data-key]"));
    let done = 0, failed = 0;

    for (const tr of rows) {
      const area = tr.querySelector("textarea");
      const source = tr.getAttribute("data-source") || "";
      if (!area || !source.trim()) continue;
      try { area.value = await translateText(source); done++; }
      catch (e) { console.warn("Translate failed:", source, e); failed++; }
      setStatus("إعادة ترجمة: " + done + " | فشل: " + failed);
      await new Promise(resolve => setTimeout(resolve, 160));
    }

    alert("انتهت إعادة الترجمة. اضغط حفظ الكل.");
  }

  document.addEventListener("DOMContentLoaded", function () {
    if ($("searchInput")) $("searchInput").addEventListener("input", render);
    if ($("saveAllBtn")) $("saveAllBtn").addEventListener("click", saveAll);
    if ($("autoFillBtn")) $("autoFillBtn").addEventListener("click", autoFillFromFile);
    if ($("autoTranslateEmptyBtn")) $("autoTranslateEmptyBtn").addEventListener("click", autoTranslateEmpty);
    if ($("autoTranslateAllBtn")) $("autoTranslateAllBtn").addEventListener("click", autoTranslateAllVisible);
    load();
  });
})();
