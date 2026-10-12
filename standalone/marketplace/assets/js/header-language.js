
(function(){
  function makeButton(){
    if(document.querySelector(".alo-lang-btn-wrap")) return;
    const header = document.querySelector("header .container, .site-header .container, .navbar .container, header, .site-header, .navbar");
    if(!header) return;

    const lang = window.AloI18n ? window.AloI18n.getLang() : (localStorage.getItem("alo_lang") || "ar");
    const wrap = document.createElement("div");
    wrap.className = "alo-lang-btn-wrap";
    wrap.innerHTML = `
      <button type="button" class="alo-lang-btn"><span>🌐</span><span class="alo-lang-current">${lang === "ar" ? "العربية" : "English"}</span><span>⌄</span></button>
      <div class="alo-lang-menu">
        <button type="button" class="alo-lang-option ${lang === "ar" ? "active" : ""}" data-lang="ar"><span>العربية</span><span>✓</span></button>
        <button type="button" class="alo-lang-option ${lang === "en" ? "active" : ""}" data-lang="en"><span>English</span><span>EN</span></button>
      </div>`;
    const actions = header.querySelector(".auth-actions,.header-actions,.nav-actions,.navbar-actions");
    (actions || header).appendChild(wrap);

    wrap.querySelector(".alo-lang-btn").onclick = function(e){e.stopPropagation();wrap.classList.toggle("open")};
    wrap.querySelectorAll("[data-lang]").forEach(function(btn){
      btn.onclick = function(){
        const selected = btn.getAttribute("data-lang");
        if(window.AloI18n) window.AloI18n.setLanguage(selected);
        else localStorage.setItem("alo_lang", selected);
        location.reload();
      };
    });
    document.addEventListener("click",function(){wrap.classList.remove("open")});
  }
  document.addEventListener("DOMContentLoaded", makeButton);
})();
