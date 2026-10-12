
// Fallback: project-details page needs getProjectById even if projects.js fails to load
if (typeof window.getProjectById !== 'function' && typeof getProjectById === 'undefined') {
  window.getProjectById = async function getProjectById(id) {
    const { data, error } = await window.supabaseClient.from('marketplace_projects').select('*').eq('id', id).maybeSingle();
    if (error) { console.error(error); return null; }
    return data;
  };
}
// Project details + gallery + WhatsApp gate + counters + verification badge

function fmtProjectDate(value) {
  if (!value) return '-';
  try { return new Date(value).toLocaleDateString('ar', { year:'numeric', month:'short', day:'numeric' }); }
  catch (_) { return '-'; }
}

async function renderSimilarProjects(root, project) {
  const box = root.querySelector('[data-similar-projects]');
  if (!box || !project?.id) return;
  try {
    const { data, error } = await window.supabaseClient
      .from('marketplace_projects')
      .select('id,title,price,location,category,image_url,verification_status,status')
      .neq('id', project.id)
      .or(`category.eq.${project.category || ''},location.eq.${project.location || ''}`)
      .in('status', ['approved','active','published'])
      .limit(3);
    if (error) throw error;
    const rows = data || [];
    if (!rows.length) { box.innerHTML = '<p style="color:var(--muted)">لا توجد مشاريع مشابهة حالياً.</p>'; return; }
    box.innerHTML = rows.map(p => `
      <a class="similar-project-card" href="project-details.html?id=${encodeURIComponent(p.id)}">
        <img src="${p.image_url || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=500&q=80'}" alt="${escapeHtml(p.title || '')}" loading="lazy">
        <b>${escapeHtml(p.title || 'مشروع')}</b>
        <span>${escapeHtml(p.location || '')} · ${p.price || 0} ر.ع</span>
        ${p.verification_status === 'verified' ? '<small>✅ موثق</small>' : ''}
      </a>
    `).join('');
  } catch (e) {
    console.warn('similar projects failed', e);
    box.innerHTML = '<p style="color:var(--muted)">تعذر تحميل المشاريع المشابهة.</p>';
  }
}

async function setupSaveProject(project) {
  const btn = document.querySelector('[data-save-project]');
  if (!btn || !project?.id) return;
  const user = await getSessionUser();
  if (!user) {
    btn.onclick = () => location.href = 'login.html?next=' + encodeURIComponent(location.pathname + location.search);
    return;
  }
  btn.onclick = async () => {
    try {
      btn.disabled = true;
      await window.AloInvestor.saveProject(project);
      btn.textContent = 'تم حفظ المشروع ✅';
    } catch (e) {
      console.warn(e);
      alert('تعذر حفظ المشروع. تأكد من تشغيل جداول المستثمرين.');
      btn.disabled = false;
    }
  };
}

function renderTrustState(root, project) {
  const el = root.querySelector('[data-trust-project]');
  if (!el) return;
  if (project.verification_status === 'verified') el.textContent = 'تمت مراجعة أوراق المشروع من الإدارة.';
  else if (project.verification_status === 'pending') el.textContent = 'طلب التوثيق قيد المراجعة.';
  else el.textContent = 'المشروع غير موثق بعد، اطلب الأوراق قبل أي اتفاق.';
}

async function incrementProjectCounter(id, field) {
  if (!id || !field || !window.supabaseClient) return;
  const allowed = ['views_count', 'contacts_count', 'saves_count', 'interests_count'];
  if (!allowed.includes(field)) return;
  try {
    const { error } = await window.supabaseClient.rpc('increment_project_counter', {
      p_project_id: id,
      p_field: field
    });
    if (error) throw error;
  } catch (error) {
    console.error('counter rpc failed:', error);
  }
}

async function setupWhatsappGate(project) {
  const msg = document.querySelector("[data-contact-message]");
  const whatsappBtn = document.querySelector("[data-whatsapp-btn]");
  const loginBtn = document.querySelector("[data-login-contact-btn]");

  if (!msg || !whatsappBtn || !loginBtn) return;

  const user = await getSessionUser();

  if (!user) {
    msg.textContent = "رقم الواتساب مخفي. سجل دخولك لعرض بيانات التواصل.";
    loginBtn.style.display = "inline-flex";
    whatsappBtn.style.display = "none";
    return;
  }

  const contact=await window.supabaseClient.rpc('project_contact_v75',{project_key:project.id});
  if(contact.error){msg.textContent='تعذر تحميل بيانات التواصل. أعد المحاولة.';loginBtn.style.display='none';whatsappBtn.style.display='none';return;}
  const whatsapp = normalizeWhatsapp(contact.data?.whatsapp);

  if (!whatsapp) {
    msg.textContent = "صاحب المشروع لم يضف رقم واتساب بعد.";
    loginBtn.style.display = "none";
    whatsappBtn.style.display = "none";
    return;
  }

  msg.textContent = "يمكنك التواصل مع صاحب المشروع عبر واتساب.";
  loginBtn.style.display = "none";
  whatsappBtn.style.display = "inline-flex";

  whatsappBtn.onclick = async () => {
    await incrementProjectCounter(project.id, "contacts_count");
    const text = encodeURIComponent(`مرحبًا، شاهدت مشروع "${project.title}" في منصة إلو مستثمر وأرغب بمعرفة المزيد.`);
    window.open(`https://wa.me/${whatsapp}?text=${text}`, "_blank");
  };
}


async function setupInternalChatGate(project) {
  const chatBtn = document.querySelector("[data-chat-contact-btn]");
  const loginBtn = document.querySelector("[data-login-contact-btn]");
  if (!chatBtn) return;

  const user = await getSessionUser();
  if (!user) {
    chatBtn.style.display = "none";
    return;
  }

  const ownerId = project.owner_auth_id || project.user_id || project.created_by || project.auth_id || "";
  if (!project.id || !ownerId || ownerId === user.id) {
    chatBtn.style.display = "none";
    return;
  }

  chatBtn.href = `chat.html?project=${encodeURIComponent(project.id)}&owner=${encodeURIComponent(ownerId)}`;
  chatBtn.style.display = "inline-flex";
  chatBtn.addEventListener("click", async () => {
    await incrementProjectCounter(project.id, "contacts_count");
    try {
      if (window.supabaseClient) {
        await window.supabaseClient.from("investor_contacted_projects").upsert({
          investor_auth_id: user.id,
          project_id: project.id,
          project_snapshot: {
            id: project.id,
            title: project.title,
            category: project.category,
            location: project.location,
            price: project.price,
            image_url: project.image_url
          }
        }, { onConflict: "investor_auth_id,project_id" });
      }
    } catch (e) {
      console.warn("contacted project tracking failed", e);
    }
  });
}

async function setupProjectInterest(project) {
  const btn = document.querySelector('[data-interest-project]');
  if (!btn || !project?.id || btn.dataset.interestReady === '1') return;
  btn.dataset.interestReady = '1';

  const user = await window.getSessionUser?.();
  if (!user) {
    btn.onclick = () => {
      location.href = 'login.html?next=' + encodeURIComponent(location.pathname + location.search);
    };
    return;
  }

  try {
    const { data } = await window.supabaseClient
      .from('project_interests')
      .select('id,status')
      .eq('project_id', project.id)
      .eq('investor_auth_id', user.id)
      .maybeSingle();
    if (data) {
      btn.textContent = 'تم تسجيل اهتمامك ✅';
      btn.classList.add('is-active');
    }
  } catch (e) {
    console.warn('interest status check failed', e);
  }

  btn.onclick = async () => {
    const old = btn.textContent;
    try {
      btn.disabled = true;
      btn.textContent = 'جاري تسجيل الاهتمام...';
      const { error } = await window.supabaseClient
        .from('project_interests')
        .upsert({ project_id: project.id, investor_auth_id: user.id, status: 'interested' }, { onConflict: 'project_id,investor_auth_id' });
      if (error) throw error;

      try {
        if (project.owner_auth_id || project.user_id || project.created_by) {
          await window.supabaseClient.from('notifications').insert({
            user_auth_id: project.owner_auth_id || project.user_id || project.created_by,
            title: 'مستثمر مهتم بمشروعك',
            message: `يوجد مستثمر مهتم بمشروع: ${project.title || 'مشروعك'}`,
            body: `يوجد مستثمر مهتم بمشروع: ${project.title || 'مشروعك'}`,
            type: 'project_interest',
            link_url: `project-details.html?id=${project.id}`
          });
        }
      } catch (notifyErr) { console.warn('interest notification failed', notifyErr); }

      btn.textContent = 'تم تسجيل اهتمامك ✅';
      btn.classList.add('is-active');
      alert('تم تسجيل اهتمامك، وسيظهر لصاحب المشروع ✅');
    } catch (e) {
      console.error(e);
      btn.disabled = false;
      btn.textContent = old || 'مهتم بالفرصة 🔥';
      alert('تعذر تسجيل الاهتمام. تأكد من تشغيل SQL v50.');
    }
  };
}

async function loadProjectImages(project) {
  const fallback = "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=85";

  const { data, error } = await window.supabaseClient
    .from("project_images")
    .select("*")
    .eq("project_id", project.id)
    .order("sort_order", { ascending: true });

  if (error) console.error(error);

  const galleryUrls = [];

  if (project.image_url) galleryUrls.push(project.image_url);

  (data || []).forEach(img => {
    if (img.image_url && !galleryUrls.includes(img.image_url)) {
      galleryUrls.push(img.image_url);
    }
  });

  if (!galleryUrls.length) galleryUrls.push(fallback);

  return galleryUrls;
}

function renderProjectGallery(root, imageUrls) {
  const mainImg = root.querySelector("[data-main-img]");
  const thumbsContainer = root.querySelector(".thumbs");

  if (!mainImg) return;

  let currentIndex = 0;

  function setMain(index) {
    currentIndex = index;
    mainImg.src = imageUrls[index];

    if (thumbsContainer) {
      thumbsContainer.querySelectorAll(".thumb").forEach((thumb, i) => {
        thumb.classList.toggle("active-thumb", i === index);
      });
    }
  }

  setMain(0);

  if (!thumbsContainer) return;

  thumbsContainer.innerHTML = imageUrls.map((url, index) => `
    <button type="button" class="thumb ${index === 0 ? "active-thumb" : ""}" data-gallery-thumb="${index}">
      <img src="${escapeHtml(safeLinkUrl(url))}" loading="lazy" alt="صورة المشروع ${index + 1}">
    </button>
  `).join("");

  thumbsContainer.querySelectorAll("[data-gallery-thumb]").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.galleryThumb);
      setMain(index);
    });
  });

  let startX = 0;

  mainImg.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  mainImg.addEventListener("touchend", e => {
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;

    if (Math.abs(diff) < 40) return;

    if (diff < 0) setMain((currentIndex + 1) % imageUrls.length);
    else setMain((currentIndex - 1 + imageUrls.length) % imageUrls.length);
  }, { passive: true });
}

function renderProjectVerificationBadge(root, project) {
  const summary = root.querySelector(".summary-card");
  const title = root.querySelector("[data-title]");

  root.querySelectorAll("[data-project-verification-badge]").forEach(el => el.remove());

  const status = project.verification_status || "not_verified";

  if (status === "verified") {
    const badge = document.createElement("div");
    badge.className = "project-verified-full-badge";
    badge.setAttribute("data-project-verification-badge", "true");
    badge.innerHTML = "✅ مشروع تم التحقق منه";

    if (title) title.insertAdjacentElement("afterend", badge);
    else if (summary) summary.prepend(badge);
  } else if (status === "pending") {
    const badge = document.createElement("div");
    badge.className = "project-pending-verify-badge";
    badge.setAttribute("data-project-verification-badge", "true");
    badge.innerHTML = "⏳ قيد التحقق";

    if (title) title.insertAdjacentElement("afterend", badge);
    else if (summary) summary.prepend(badge);
  }
}

async function loadProjectDetails() {
  if (!window.supabaseClient) return;

  const root = document.querySelector("[data-project-details]");
  if (!root) return;

  const id = getProjectIdFromUrl();
  if (!id) return;

  const p = await getProjectById(id);
  if (!p) return;

  setText(root, "[data-title]", p.title);
  setText(root, "[data-type]", p.type);
  setText(root, "[data-location]", p.location);
  setText(root, "[data-price]", `${p.price || 0} ر.ع`);
  setText(root, "[data-profit]", `${p.monthly_profit || 0} ر.ع`);
  const roiVal = (typeof window.aloProjectRoi === 'function') ? window.aloProjectRoi(p) : (p.roi || p.expected_roi || 0);
  setText(root, "[data-detail-roi]", roiVal !== null ? `${roiVal}%` : 'غير متاح');
  const compareBtn=root.querySelector('[data-detail-compare]');
  if(compareBtn){compareBtn.hidden=false;compareBtn.dataset.compareProject=String(p.id);window.AloCompare?.refresh();}
  setText(root, "[data-category]", p.category);
  setText(root, "[data-description]", p.description);
  setText(root, "[data-status]", statusLabel(p.status));
  setText(root, "[data-admin-note]", p.admin_note || "لا توجد ملاحظات");
  setText(root, "[data-views-count]", String(Number(p.views_count || 0) + 1));
  setText(root, "[data-contacts-count]", String(Number(p.contacts_count || 0)));
  setText(root, "[data-created-at]", fmtProjectDate(p.created_at));

  renderProjectVerificationBadge(root, p);
  renderTrustState(root, p);
  window.AloInvestor?.calculator(p);

  const images = await loadProjectImages(p);
  renderProjectGallery(root, images);

  const edit = root.querySelector("[data-edit-link]");
  if (edit) edit.href = `admin-project-edit.html?id=${p.id}`;

  await incrementProjectCounter(id, "views_count");
  await setupWhatsappGate(p);
  await setupInternalChatGate(p);
  await setupSaveProject(p);
  await window.AloReview.bindInterest(p);
  await renderSimilarProjects(root, p);
}
