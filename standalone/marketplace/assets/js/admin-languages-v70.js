
(function () {
  async function api(path, options) { return window.ALO_SUPABASE.rest(path, options || {}); }

  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[m];
    });
  }

  async function loadLanguages() {
    const tbody = document.getElementById("languagesTable");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6">جاري تحميل اللغات...</td></tr>';

    try {
      const rows = await api("platform_languages?select=*&order=sort_order.asc");
      tbody.innerHTML = (rows || []).map(function (lang) {
        return `
          <tr>
            <td><b>${esc(lang.code)}</b></td>
            <td>${esc(lang.native_name || lang.name)}</td>
            <td>${esc(lang.name)}</td>
            <td>${esc(lang.direction || "ltr")}</td>
            <td>${lang.is_active ? '<span class="badge active">مفعلة</span>' : '<span class="badge inactive">معطلة</span>'}</td>
            <td><a class="btn secondary" href="admin-language-translate.html?lang=${encodeURIComponent(lang.code)}">ترجمة</a></td>
          </tr>`;
      }).join("") || '<tr><td colspan="6">لا توجد لغات</td></tr>';
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="6" style="color:#b42318;white-space:pre-wrap">${esc(error.message)}</td></tr>`;
    }
  }

  async function addLanguage() {
    const code = document.getElementById("langCode").value.trim().toLowerCase();
    const name = document.getElementById("langName").value.trim();
    const nativeName = document.getElementById("langNative").value.trim();
    const direction = document.getElementById("langDirection").value;

    if (!code || !name) return alert("أدخل كود اللغة والاسم");

    try {
      await api("platform_languages", {
        method: "POST",
        body: JSON.stringify({ code, name, native_name: nativeName || name, direction, is_active: true, is_default: false, sort_order: 100 })
      });
      alert("تمت إضافة اللغة");
      loadLanguages();
    } catch (error) { alert(error.message); }
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadLanguages();
    const btn = document.getElementById("addLangBtn");
    if (btn) btn.addEventListener("click", addLanguage);
  });
})();
