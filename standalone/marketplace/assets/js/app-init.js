// App initialization


async function guardAddProjectAccess() {
  const addProjectUrl = 'add-project.html';
  const currentPage = (location.pathname.split('/').pop() || 'index.html');
  const loginUrl = 'login.html?next=' + encodeURIComponent(addProjectUrl);

  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (!href || !href.includes('add-project.html') || link.dataset.addProjectGuard === '1') return;
    link.dataset.addProjectGuard = '1';
    link.addEventListener('click', async (event) => {
      try {
        const user = await getSessionUser();
        if (!user) {
          event.preventDefault();
          location.href = loginUrl;
        }
      } catch (error) {
        console.error('add project link guard:', error);
        event.preventDefault();
        location.href = loginUrl;
      }
    });
  });

  if (currentPage !== addProjectUrl && !document.querySelector('[data-add-project-form]')) return true;

  const form = document.querySelector('[data-add-project-form]');
  if (form) {
    form.style.opacity = '0.45';
    form.style.pointerEvents = 'none';
  }

  try {
    const user = await getSessionUser();
    if (!user) {
      location.replace(loginUrl);
      return false;
    }
    if (form) {
      form.style.opacity = '';
      form.style.pointerEvents = '';
    }
    return true;
  } catch (error) {
    console.error('add project page guard:', error);
    location.replace(loginUrl);
    return false;
  }
}


window.initApp = async function initApp() {
  if (!initSupabase()) {
    alert("مكتبة Supabase ما تحمّلت.");
    return;
  }

  if (typeof guardAddProjectAccess === "function") {
    const canContinue = await guardAddProjectAccess();
    if (!canContinue) return;
  }

  if (typeof initProjectImageUploadUI === "function") {
    initProjectImageUploadUI();
  }

  if (typeof initAccountTabs === "function") {
    initAccountTabs();
  }

  window.AloFlows?.init();
  window.AloReview?.init();
  window.AloEditor?.init();
  if(typeof loadVerificationPage==='function')loadVerificationPage().catch(err=>{const el=document.querySelector('[data-user-verification-status]');if(el){el.removeAttribute('data-i18n');el.textContent='تعذر تحميل حالة التوثيق. أعد تحميل الصفحة.';}console.warn(err);});
  window.loadLivePlans?.();
  window.loadPaymentHistory?.();
  window.AloInvestor?.init();
  window.AloOwnerGuide?.init();
  window.AloCompare?.load();

  if (typeof window.loadMarketplaceProjects === 'function') window.loadMarketplaceProjects();
  else if (typeof loadProjects === 'function') loadProjects();
  if (typeof loadProjectDetails === 'function') loadProjectDetails();
  if (typeof loadUserDashboard === 'function') loadUserDashboard();
  if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
  if (typeof loadAdminProjects === 'function') loadAdminProjects();
  if (typeof window.loadPlatformAds === 'function') window.loadPlatformAds();

  if (typeof loadAdminEditForm === "function") {
    loadAdminEditForm();
  }

  if (typeof loadOwnerEditForm === "function") {
    loadOwnerEditForm();
  }

  if (typeof loadAdminVerification === "function") {
    loadAdminVerification();
  }

  if (typeof loadAdminProjectReview === "function") {
    loadAdminProjectReview();
  }

  const addForm = document.querySelector("[data-add-project-form]");
  if (addForm) {
    addForm.addEventListener("submit", async e => {
      e.preventDefault();
      await submitProject(addForm);
    });
  }

  // Login/register forms are handled once inside auth.js
};


if (typeof window.prepareResetPasswordSession === 'function') {
  window.prepareResetPasswordSession().catch(console.error);
}
