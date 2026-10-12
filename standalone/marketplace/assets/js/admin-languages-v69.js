
(function(){
  function cfg(){
    return {
      url: window.SUPABASE_URL || (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : ""),
      key: window.SUPABASE_ANON_KEY || (typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "")
    };
  }
  async function api(path, options){
    const c = cfg();
    const res = await fetch(c.url.replace(/\/$/,"") + "/rest/v1/" + path, Object.assign({
      headers: { apikey:c.key, Authorization:"Bearer "+c.key, "Content-Type":"application/json", Prefer:"return=representation" }
    }, options || {}));
    if(!res.ok) throw new Error(await res.text());
    return res.status === 204 ? null : res.json();
  }
  async function load(){
    const tbody = document.getElementById("languagesTable");
    try{
      const rows = await api("platform_languages?select=*&order=sort_order.asc");
      tbody.innerHTML = rows.map(l => `
        <tr>
          <td><b>${l.code}</b></td>
          <td>${l.native_name || l.name}</td>
          <td>${l.direction}</td>
          <td><span class="badge">${l.is_active ? "مفعلة" : "معطلة"}</span></td>
          <td><a class="btn secondary" href="admin-language-translate.html?lang=${l.code}">ترجمة</a></td>
        </tr>`).join("");
    }catch(e){tbody.innerHTML = `<tr><td colspan="5">${e.message}</td></tr>`}
  }
  async function addLang(){
    const payload = {
      code: document.getElementById("langCode").value.trim(),
      name: document.getElementById("langName").value.trim(),
      native_name: document.getElementById("langNative").value.trim(),
      direction: document.getElementById("langDirection").value,
      is_active: true
    };
    if(!payload.code || !payload.name) return alert("أدخل الكود والاسم");
    await api("platform_languages", {method:"POST", body:JSON.stringify(payload)});
    load();
  }
  document.addEventListener("DOMContentLoaded", function(){
    document.getElementById("addLangBtn").onclick = addLang;
    load();
  });
})();
