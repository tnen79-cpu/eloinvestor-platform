export type Lang = 'ar' | 'en';
export type CountryCode = 'om' | 'qa' | 'sa';

export const countries = [
  { code: 'om', nameAr: 'سلطنة عمان', nameEn: 'Oman', flag: '🇴🇲', currency: 'OMR', symbolAr: 'ر.ع', symbolEn: 'OMR' },
  { code: 'qa', nameAr: 'قطر', nameEn: 'Qatar', flag: '🇶🇦', currency: 'QAR', symbolAr: 'ر.ق', symbolEn: 'QAR' },
  { code: 'sa', nameAr: 'السعودية', nameEn: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', symbolAr: 'ر.س', symbolEn: 'SAR' },
] as const;

export const categories = [
  { key: 'restaurants', ar: 'مطاعم وكافيهات', en: 'Restaurants & Cafes' },
  { key: 'services', ar: 'خدمات', en: 'Services' },
  { key: 'beauty', ar: 'تجميل وعناية', en: 'Beauty' },
  { key: 'retail', ar: 'تجارة وتجزئة', en: 'Retail' },
];

export const projects = [
  {
    slug: 'premium-cafe-muscat',
    country: 'om',
    titleAr: 'مقهى قائم للبيع في الخوض',
    titleEn: 'Operating cafe for sale in Al Khoud',
    cityAr: 'الخوض، مسقط',
    cityEn: 'Al Khoud, Muscat',
    price: 8000,
    roi: 23,
    monthlyProfit: 720,
    category: 'restaurants',
    verified: true,
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1600&auto=format&fit=crop',
    summaryAr: 'مقهى مجهز بالكامل مع ديكور حديث وقاعدة عملاء ثابتة، مناسب لمستثمر يبحث عن مشروع جاهز للتشغيل.',
    summaryEn: 'Fully equipped cafe with modern interiors and an existing customer base, ideal for investors seeking an operating business.',
  },
  {
    slug: 'beauty-brand-distribution',
    country: 'om',
    titleAr: 'علامة تجميل مع قنوات بيع جاهزة',
    titleEn: 'Beauty brand with active sales channels',
    cityAr: 'بوشر، مسقط',
    cityEn: 'Bawshar, Muscat',
    price: 12500,
    roi: 31,
    monthlyProfit: 1100,
    category: 'beauty',
    verified: true,
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=1600&auto=format&fit=crop',
    summaryAr: 'مشروع تجميل جاهز يشمل منتجات، هوية، صفحات بيع، وموردين قابل للتوسع داخل الخليج.',
    summaryEn: 'Ready beauty business with products, branding, sales pages, and suppliers, built to scale across the GCC.',
  },
  {
    slug: 'qatar-food-kiosk',
    country: 'qa',
    titleAr: 'كشك وجبات سريع في قطر',
    titleEn: 'Fast food kiosk in Qatar',
    cityAr: 'الدوحة',
    cityEn: 'Doha',
    price: 42000,
    roi: 18,
    monthlyProfit: 2500,
    category: 'restaurants',
    verified: false,
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1600&auto=format&fit=crop',
    summaryAr: 'فرصة تشغيل كشك وجبات سريع في موقع حيوي مع قابلية توسع وامتياز.',
    summaryEn: 'Fast food kiosk opportunity in a busy location with room for expansion and franchising.',
  },
  {
    slug: 'riyadh-service-company',
    country: 'sa',
    titleAr: 'شركة خدمات تشغيلية في الرياض',
    titleEn: 'Operational services company in Riyadh',
    cityAr: 'الرياض',
    cityEn: 'Riyadh',
    price: 95000,
    roi: 27,
    monthlyProfit: 6200,
    category: 'services',
    verified: true,
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop',
    summaryAr: 'شركة خدمات قائمة بعقود عملاء وفريق تشغيل، مناسبة لتوسع مستثمر استراتيجي.',
    summaryEn: 'Existing services company with client contracts and operations team, suitable for strategic expansion.',
  },
];

export function getCountry(code: string) {
  return countries.find((c) => c.code === code) || countries[0];
}

export function getDictionary(lang: string) {
  const ar = lang !== 'en';
  return {
    home: ar ? 'الرئيسية' : 'Home',
    opportunities: ar ? 'فرص الاستثمار' : 'Opportunities',
    packages: ar ? 'الباقات' : 'Packages',
    addProject: ar ? 'أضف مشروع' : 'Add Project',
    login: ar ? 'تسجيل الدخول' : 'Login',
    register: ar ? 'إنشاء حساب' : 'Create Account',
    heroTitle: ar ? 'استثمر في فرص حقيقية بثقة وشفافية' : 'Invest in real opportunities with confidence',
    heroText: ar ? 'منصة إلو مستثمر تجمع أصحاب الأعمال مع المستثمرين في الخليج لتمويل وبيع المشاريع الواعدة.' : 'EloInvestor connects entrepreneurs with investors across the Gulf to fund and acquire promising businesses.',
    explore: ar ? 'استكشف الفرص' : 'Explore Opportunities',
    publish: ar ? 'اعرض مشروعك' : 'List Your Project',
    featured: ar ? 'فرص مميزة' : 'Featured Opportunities',
    verified: ar ? 'موثق' : 'Verified',
    roi: ar ? 'العائد المتوقع' : 'Expected ROI',
    price: ar ? 'سعر المشروع' : 'Project Price',
    details: ar ? 'التفاصيل' : 'Details',
    contact: ar ? 'تواصل' : 'Contact',
    searchPlaceholder: ar ? 'ابحث عن فرصة استثمارية' : 'Search investment opportunities',
    allCategories: ar ? 'كل القطاعات' : 'All Categories',
    allRegions: ar ? 'كل المناطق' : 'All Regions',
    latest: ar ? 'الأحدث' : 'Latest',
    overview: ar ? 'نظرة عامة' : 'Overview',
    financials: ar ? 'البيانات المالية' : 'Financials',
    location: ar ? 'الموقع' : 'Location',
    howItWorks: ar ? 'كيف تعمل المنصة؟' : 'How it works',
  };
}

export function formatMoney(amount: number, countryCode: string, lang: string) {
  const country = getCountry(countryCode);
  const symbol = lang === 'ar' ? country.symbolAr : country.symbolEn;
  return lang === 'ar' ? `${symbol} ${new Intl.NumberFormat('en-US').format(amount)}` : `${new Intl.NumberFormat('en-US').format(amount)} ${symbol}`;
}

export function getCategoryLabel(key: string, lang: string) {
  const cat = categories.find((c) => c.key === key);
  if (!cat) return key;
  return lang === 'ar' ? cat.ar : cat.en;
}
