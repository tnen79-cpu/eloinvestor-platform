// Shared utilities

function statusLabel(status) {
  const labels = {
    pending: "قيد المراجعة",
    approved: "مقبول",
    rejected: "مرفوض",
    needs_revision: "راجع للتعديل"
  };
  return labels[status] || status || "-";
}

function normalizeWhatsapp(number) {
  if (!number) return "";

  let cleaned = String(number).replace(/[^\d]/g, "");
  if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);
  if (cleaned.length === 8) cleaned = "968" + cleaned;

  return cleaned;
}

function setText(root, selector, value) {
  root.querySelectorAll(selector).forEach(el => {
    el.textContent = value || "";
  });
}

function getProjectIdFromUrl() {
  return new URLSearchParams(location.search).get("id");
}

function getCategoryFromUrl() {
  return new URLSearchParams(location.search).get("category");
}

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function safeLinkUrl(value){try{const u=new URL(String(value||''),location.href);return ['https:','http:','storage:'].includes(u.protocol)?String(value):'#';}catch{return '#';}}
