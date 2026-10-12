// Admin project review: owner info + project verification files

function reviewSafe(value, fallback = "-") {
  return escapeHtml(value === null || value === undefined || value === "" ? fallback : value);
}

async function loadAdminProjectReview() {
  const root = document.querySelector("[data-admin-project-review]");
  if (!root) return;

  const projectId = new URLSearchParams(location.search).get("id");
  if (!projectId) return;

  const project = await getProjectById(projectId);
  if (!project) return;

  renderAdminProjectVerificationStatus(project);
  await renderAdminProjectOwner(project);
  await renderAdminProjectVerificationFiles(project);
}

function renderAdminProjectVerificationStatus(project) {
  const el = document.querySelector("[data-project-verification-status]");
  if (!el) return;

  const status = project.verification_status || "not_verified";

  const labels = {
    not_verified: "غير موثق",
    pending: "قيد التحقق",
    verified: "مشروع موثق ✅",
    rejected: "توثيق مرفوض"
  };

  el.textContent = labels[status] || "غير موثق";
  el.className = `status-pill ${
    status === "verified" ? "status-approved" :
    status === "rejected" ? "status-rejected" :
    status === "pending" ? "status-pending" : ""
  }`;
}

async function renderAdminProjectOwner(project) {
  const box = document.querySelector("[data-admin-project-owner]");
  if (!box) return;

  const ownerAuthId = project.owner_auth_id;

  if (!ownerAuthId) {
    box.innerHTML = `<div class="empty-state">لا يوجد صاحب مشروع مرتبط</div>`;
    return;
  }

  const {data:user,error}=await window.supabaseClient.rpc('admin_project_owner_v76',{project_key:project.id});

  if (error) {
    console.error(error);
    box.innerHTML = `<div class="empty-state">تعذر تحميل بيانات صاحب المشروع</div>`;
    return;
  }

  box.innerHTML = `
    <div class="verification-details-grid admin-owner-grid">
      <div class="verification-detail-box">
        <h4>👤 بيانات الحساب</h4>
        <p><b>الاسم:</b> ${reviewSafe(user?.name)}</p>
        <p><b>الهاتف:</b> ${reviewSafe(user?.phone)}</p>
        <p><b>الواتساب:</b> ${reviewSafe(user?.whatsapp)}</p>
      </div>

      <div class="verification-detail-box">
        <h4>🧾 حالة الحساب</h4>
        <p><b>نوع الحساب:</b> ${reviewSafe(user?.account_type)}</p>
        <p><b>توثيق المستثمر/الحساب:</b> ${reviewSafe(user?.verification_status, "not_verified")}</p>
      </div>

      <div class="verification-detail-box project-match-box">
        <h4>💼 بيانات المشروع</h4>
        <p><b>اسم المشروع:</b> ${reviewSafe(project.title)}</p>
        <p><b>الموقع:</b> ${reviewSafe(project.location)}</p>
        <p><b>السعر:</b> ${reviewSafe(project.price)} ر.ع</p>
        <p><b>توثيق المشروع:</b> ${reviewSafe(project.verification_status, "not_verified")}</p>
      </div>
    </div>
  `;
}

async function renderAdminProjectVerificationFiles(project) {
  const box = document.querySelector("[data-admin-project-verification-files]");
  if (!box) return;

  const { data, error } = await window.supabaseClient
    .from("verification_files")
    .select("*")
    .eq("is_current",true)
    .eq("project_id", project.id)
    .eq("target_type", "project")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    box.innerHTML = `<div class="empty-state">تعذر تحميل وثائق التحقق</div>`;
    return;
  }

  const docs = data || [];

  if (!docs.length) {
    box.innerHTML = `
      <div class="empty-state">
        <b>لا توجد وثائق تحقق مرفوعة</b>
        <p>يمكن قبول المشروع بدون توثيق، أو إرجاعه لصاحب المشروع لرفع السجل التجاري/الأوراق.</p>
      </div>
    `;
    return;
  }

  box.innerHTML = `
    <div class="admin-project-doc-list">
      ${docs.map(doc => `
        <article class="admin-project-doc-card" data-doc-key="${escapeHtml(doc.id)}" data-review-revision="${Number(doc.review_revision||0)}">
          <div>
            <h3>${reviewSafe(doc.file_name, "ملف تحقق")}</h3>
            <p>${reviewSafe(doc.file_type, "document")}</p>
            <span class="status-pill ${
              doc.status === "verified" ? "status-approved" :
              doc.status === "rejected" ? "status-rejected" :
              "status-pending"
            }">${
              doc.status === "verified" ? "مقبول" :
              doc.status === "rejected" ? "مرفوض" :
              "قيد المراجعة"
            }</span>
          </div>

          <div class="admin-verification-actions">
            <a class="btn btn-outline" href="${escapeHtml(safeLinkUrl(doc.file_url))}" target="_blank">فتح الملف</a>
            <button class="btn btn-green" onclick="verifySingleProjectDoc('${doc.id}', '${project.id}',${Number(doc.review_revision||0)})">قبول الملف</button>
            <button class="btn btn-soft" onclick="rejectSingleProjectDoc('${doc.id}', '${project.id}',${Number(doc.review_revision||0)})">رفض الملف</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

window.loadAdminProjectReview = loadAdminProjectReview;
