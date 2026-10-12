export function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value); return Number.isFinite(n) ? n : null;
}
export function financialMetrics(row: Record<string, unknown>) {
  const first = (keys: string[]) => keys.map(k => optionalNumber(row[k])).find(n => n !== null) ?? null;
  const price = first(['price','project_price','asking_price','sale_price','investment_amount']);
  const profit = first(['monthly_profit','expected_monthly_profit','profit_monthly']);
  const reported = first(['roi','profit_percentage','expected_profit_percentage','expected_profit_percent','return_percentage']);
  const calculated = price !== null && price > 0 && profit !== null;
  return { price, profit, annualRoi: calculated ? profit * 12 / price * 100 : reported, source: calculated ? 'calculated' : reported === null ? 'missing' : 'reported' };
}
export function investmentScenario(price: unknown, profit: unknown, costs: unknown, change = 0) {
  const p = optionalNumber(price), m = optionalNumber(profit), c = optionalNumber(costs);
  if (p === null || p <= 0 || m === null || c === null || c < 0 || !Number.isFinite(change)) return null;
  const monthly = m * (1 + change / 100), total = p + c;
  return { annualRoi: monthly * 12 / total * 100, paybackMonths: monthly > 0 ? total / monthly : null };
}
export function normalizeComparisonIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))].slice(0,4);
}

export function normalizeCategory(value: unknown) {
 const key=String(value||'').trim().toLowerCase();
 const aliases:Record<string,string>={restaurant:'restaurants',restaurants:'restaurants','مطاعم':'restaurants','مطعم':'restaurants',technology:'tech',tech:'tech','تقنية':'tech','تكنولوجيا':'tech',trade:'commerce',retail:'commerce',commerce:'commerce','تجارة':'commerce',service:'services',services:'services','خدمات':'services',construction:'contracting',contracting:'contracting','مقاولات':'contracting',real_estate:'realestate',realestate:'realestate','عقارات':'realestate'};
 return aliases[key]||key;
}
