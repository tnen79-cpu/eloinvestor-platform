export type AccountType = 'investor' | 'owner' | 'both' | 'admin' | 'super_admin' | string;

export function normalizeAccountType(value?: string | null): string {
  const raw = String(value || 'investor').trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  const map: Record<string, string> = {
    investor: 'investor',
    مستثمر: 'investor',
    owner: 'owner',
    seller: 'owner',
    founder: 'owner',
    project_owner: 'owner',
    صاحب_مشروع: 'owner',
    صاحب_المشروع: 'owner',
    both: 'both',
    owner_investor: 'both',
    investor_owner: 'both',
    investor_and_owner: 'both',
    project_owner_and_investor: 'both',
    مستثمر_وصاحب_مشروع: 'both',
    مستثمر_صاحب_مشروع: 'both',
    admin: 'admin',
    مدير: 'admin',
    super_admin: 'super_admin',
    verification_admin: 'admin',
    content_admin: 'admin',
    finance_admin: 'admin',
    support_admin: 'admin',
  };
  return map[raw] || raw;
}

export function isAdminRole(role?: string | null) {
  const normalized = normalizeAccountType(role);
  return normalized === 'admin' || normalized === 'super_admin';
}

export function canAddProjects(accountType?: string | null, role?: string | null) {
  if (isAdminRole(role) || isAdminRole(accountType)) return true;
  const type = normalizeAccountType(accountType);
  const normalizedRole = normalizeAccountType(role);
  return type === 'owner' || type === 'both' || normalizedRole === 'owner' || normalizedRole === 'both';
}

export function canInvest(accountType?: string | null, role?: string | null) {
  if (isAdminRole(role) || isAdminRole(accountType)) return true;
  const type = normalizeAccountType(accountType);
  const normalizedRole = normalizeAccountType(role);
  return type === 'investor' || type === 'both' || normalizedRole === 'investor' || normalizedRole === 'both';
}

export function accountTypeLabel(accountType: string | undefined | null, lang = 'ar') {
  const isAr = lang === 'ar';
  const type = normalizeAccountType(accountType);
  if (isAdminRole(type)) return isAr ? 'مدير' : 'Admin';
  if (type === 'owner') return isAr ? 'صاحب مشروع' : 'Project owner';
  if (type === 'both') return isAr ? 'مستثمر وصاحب مشروع' : 'Investor & owner';
  return isAr ? 'مستثمر' : 'Investor';
}
