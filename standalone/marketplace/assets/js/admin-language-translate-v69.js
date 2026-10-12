
(function(){
  const params = new URLSearchParams(location.search);
  const lang = params.get("lang") || "en";
  let keys = [];
  let translations = {};
  let localFile = {};

  function cfg(){
    return {
      url: window.SUPABASE_URL || (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : ""),
      key: window.SUPABASE_ANON_KEY || (typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "")
    };
  }
  async function api(path, options){
    const c = cfg();
    const res = await fetch(c.url.replace(/\/$/,"") + "/rest/v1/" + path, Object.assign({
      headers: { apikey:c.key, Authorization:"Bearer "+c.key, "Content-Type":"application/json", Prefer:"resolution=merge-duplicates" }
    }, options || {}));
    if(!res.ok) throw new Error(await res.text());
    return res.status === 204 ? null : res.json();
  }
  async function loadLocal(){
    try{ localFile = await (await fetch("assets/i18n/" + lang + ".json?v=69.0.0")).json(); }catch(e){ localFile = {}; }
  }
  async function load(){
    document.getElementById("langLabel").textContent = lang;
    await loadLocal();
    keys = await api("ui_translation_keys?select=*&order=translation_key.asc");
    const rows = await api("ui_translations?language_code=eq." + encodeURIComponent(lang) + "&select=*");
    translations = {};
    rows.forEach(r => translations[r.translation_key] = r.translated_text || "");
    render();
  }
  function render(){
    const q = (document.getElementById("searchInput").value || "").toLowerCase();
    const filtered = keys.filter(k => !q || k.translation_key.toLowerCase().includes(q) || (k.source_text||"").toLowerCase().includes(q));
    document.getElementById("translationRows").innerHTML = filtered.map(k => {
      const val = translations[k.translation_key] || localFile[k.translation_key] || "";
      return `<tr data-key="${k.translation_key}">
        <td><div class="key">${k.translation_key}</div></td>
        <td><div class="source">${k.source_text || ""}</div></td>
        <td><textarea>${val}</textarea></td>
      </tr>`;
    }).join("");
  }
  async function saveAll(){
    const rows = Array.from(document.querySelectorAll("#translationRows tr[data-key]"));
    for(const tr of rows){
      const key = tr.getAttribute("data-key");
      const value = tr.querySelector("textarea").value;
      const source = (keys.find(k => k.translation_key === key)||{}).source_text || "";
      await api("ui_translations", {
        method:"POST",
        body: JSON.stringify({
          translation_key:key,
          language_code:lang,
          translated_text:value,
          status:value ? "ready" : "draft",
          translated_by:"manual",
          updated_at:new Date().toISOString()
        })
      });
    }
    alert("تم الحفظ");
  }
  function autoFill(){
    document.querySelectorAll("#translationRows tr[data-key]").forEach(tr => {
      const key = tr.getAttribute("data-key");
      const area = tr.querySelector("textarea");
      if(!area.value && localFile[key]) area.value = localFile[key];
    });
  }
  document.addEventListener("DOMContentLoaded", function(){
    document.getElementById("searchInput").oninput = render;
    document.getElementById("saveAllBtn").onclick = saveAll;
    document.getElementById("autoFillBtn").onclick = autoFill;
    load();
  });
})();
