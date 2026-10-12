// Admin verification management: investors/general only

function adminVerificationTypeLabel(type) {
  if (type === "project") return "توثيق مشروع";
  if (type === "investor") return "توثيق مستثمر";
  return type || "-";
}

function adminVerificationStatusLabel(status) {
  const labels = {
    pending: "قيد المراجعة",
    verified: "مقبول",
    rejected: "مرفوض"
  };
  return labels[status] || status || "-";
}

function safeValue(value, fallback = "-") {
  return escapeHtml(value === null || value === undefined || value === "" ? fallback : value);
}

async function getUserByAuthId(authId) {
  if (!authId) return null;

  const { data, error } = await window.supabaseClient
    .from("users")
    .select("*")
    .eq("auth_id", authId)
    .maybeSingle();

  if (error) {
    console.error("User fetch error", error);
    return null;
  }

  return data;
}

async function enrichVerificationRows(rows) {
  const enriched = [];

  for (const item of rows) {
    const ownerAuthId = item.owner_auth_id || item.user_id || null;
    const user = await getUserByAuthId(ownerAuthId);

    enriched.push({
      ...item,
      _user: user
    });
  }

  return enriched;
}

async function loadAdminVerification() {
  const wrap = document.querySelector("[data-admin-verification-list]");
  if (!wrap) return;

  wrap.innerHTML = `<div class="empty-state">جاري تحميل طلبات توثيق المستثمرين...</div>`;

  const { data, error } = await window.supabaseClient
    .from("verification_files")
    .select("*")
    .eq("is_current",true)
    .eq("target_type", "investor")
    .order("created_at", { ascending: false });

  if (error) {
    wrap.innerHTML = `<div class="empty-state">تعذر تحميل طلبات التحقق</div>`;
    console.error(error);
    return;
  }

  const rawRows = data || [];
  const rows = await enrichVerificationRows(rawRows);

  const pending = rows.filter(r => r.status === "pending").length;
  const rejected = rows.filter(r => r.status === "rejected").length;

  const set = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  };

  set("[data-verification-pending]", pending);
  set("[data-verification-rejected]", rejected);

  const { data: verifiedProjects } = await window.supabaseClient
    .from("projects")
    .select("id")
    .eq("verification_status", "verified");

  const { data: verifiedInvestors } = await window.supabaseClient
    .from("users")
    .select("id")
    .eq("verification_status", "verified");

  set("[data-projects-verified]", verifiedProjects?.length || 0);
  set("[data-investors-verified]", verifiedInvestors?.length || 0);

  if (!rows.length) {
    wrap.innerHTML = `<div class="empty-state">لا توجد طلبات توثيق مستثمرين حاليًا</div>`;
    return;
  }

  wrap.innerHTML = rows.map(item => {
    const user = item._user || {};
    const ownerName = safeValue(user.name, "مستخدم غير معروف");

    return `
      <article class="admin-verification-card detailed-verification-card" data-doc-key="${escapeHtml(item.id)}" data-review-revision="${Number(item.review_revision||0)}">
        <div class="verification-card-head">
          <div class="admin-verification-main">
            <div class="admin-verification-icon">🛡</div>
            <div>
              <h3>${safeValue(item.file_name, "ملف تحقق")}</h3>
              <p>توثيق مستثمر</p>
              <span class="status-pill ${item.status === "verified" ? "status-approved" : item.status === "rejected" ? "status-rejected" : "status-pending"}">
                ${adminVerificationStatusLabel(item.status)}
              </span>
            </div>
          </div>

          <div class="admin-verification-actions">
            <a class="btn btn-outline" href="${escapeHtml(safeLinkUrl(item.file_url))}" target="_blank">فتح الملف</a>
            ${
              item.status !== "verified"
                ? `<button class="btn btn-green" onclick="approveInvestorVerification('${item.id}','${item.owner_auth_id || item.user_id || ""}',${Number(item.review_revision||0)})">قبول</button>`
                : ""
            }
            ${
              item.status !== "rejected"
                ? `<button class="btn btn-soft" onclick="rejectInvestorVerification('${item.id}','${item.owner_auth_id || item.user_id || ""}',${Number(item.review_revision||0)})">رفض</button>`
                : ""
            }
          </div>
        </div>

        <div class="verification-details-grid">
          <div class="verification-detail-box">
            <h4>👤 بيانات المستثمر</h4>
            <p><b>الاسم:</b> ${ownerName}</p>
            <p><b>الإيميل:</b> ${safeValue(user.email)}</p>
            <p><b>الهاتف:</b> ${safeValue(user.phone)}</p>
            <p><b>الواتساب:</b> ${safeValue(user.whatsapp)}</p>
            <p><b>نوع الحساب:</b> ${safeValue(user.account_type)}</p>
            <p><b>توثيق الحساب:</b> ${safeValue(user.verification_status, "not_verified")}</p>
          </div>

          <div class="verification-detail-box investor-match-box">
            <h4>💰 تحقق المستثمر</h4>
            <p><b>المستند:</b> ${safeValue(item.file_name)}</p>
            <p><b>نوع الملف:</b> ${safeValue(item.file_type)}</p>
            <p><b>تاريخ الإرسال:</b> ${item.created_at ? new Date(item.created_at).toLocaleString("ar") : "-"}</p>
          </div>

          <div class="verification-detail-box">
            <h4>📌 تنبيه</h4>
            <p>طابق اسم الهوية/كشف الحساب مع بيانات الحساب قبل القبول.</p>
            <p>لا تقبل ملفات غير واضحة أو ناقصة.</p>
          </div>
        </div>

        <div class="verification-warning">⚠️ قبل قبول توثيق المستثمر: تأكد من تطابق الاسم والهوية مع الحساب، وأن إثبات الملاءة واضح.</div>
      </article>
    `;
  }).join("");
}
