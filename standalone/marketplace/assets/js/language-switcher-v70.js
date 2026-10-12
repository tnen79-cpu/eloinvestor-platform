
(function () {
  const languages = [{ code: "ar", label: "العربية" }, { code: "en", label: "English" }];
  function getLang(){const p=new URLSearchParams(location.search);return p.get("lang")||localStorage.getItem("alo_lang")||"ar"}
  function setLang(lang){localStorage.setItem("alo_lang",lang);const url=new URL(location.href);url.searchParams.set("lang",lang);location.href=url.toString()}
  function removeOld(){document.querySelectorAll(".alo-lang-btn-wrap,.alo-header-lang,.language-switcher,.lang-switcher").forEach(el=>el.remove())}
  function findHeader(){return document.querySelector("header .container, .site-header .container, .navbar .container, header, .site-header, .navbar")}
  function render(){
    removeOld(); const header=findHeader(); if(!header||document.querySelector(".alo-v70-lang")) return;
    const current=getLang(); const currentLabel=(languages.find(l=>l.code===current)||languages[0]).label;
    const wrap=document.createElement("div"); wrap.className="alo-v70-lang";
    wrap.innerHTML=`<button type="button" class="alo-v70-lang__button"><span class="alo-v70-lang__icon">🌐</span><span>${currentLabel}</span><span class="alo-v70-lang__chev">⌄</span></button><div class="alo-v70-lang__menu">${languages.map(l=>`<button type="button" class="alo-v70-lang__item ${l.code===current?"active":""}" data-lang="${l.code}"><span>${l.label}</span><span class="alo-v70-lang__check">✓</span></button>`).join("")}</div>`;
    const actions=header.querySelector(".auth-actions,.header-actions,.nav-actions,.navbar-actions");
    (actions||header).prepend(wrap);
    wrap.querySelector(".alo-v70-lang__button").onclick=e=>{e.stopPropagation();wrap.classList.toggle("open")};
    wrap.querySelectorAll("[data-lang]").forEach(btn=>btn.onclick=()=>setLang(btn.getAttribute("data-lang")));
    document.addEventListener("click",()=>wrap.classList.remove("open"));
  }
  document.addEventListener("DOMContentLoaded",render); window.addEventListener("load",render);
})();
