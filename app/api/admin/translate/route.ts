import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type TranslateBody = {
  text?: string;
  source?: string;
  target?: string;
};

async function readProviderSettings() {
  const { data, error } = await supabaseAdmin
    .from('translation_provider_settings')
    .select('*')
    .eq('is_enabled', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as any;
}

const quickMap: Record<string, string> = {
  'تسجيل الدخول': 'Login',
  'إنشاء حساب': 'Create account',
  'أضف مشروعك': 'Add your project',
  'أضف إعلانك': 'Add listing',
  'تواصل': 'Contact',
  'موثق': 'Verified',
  'حفظ': 'Save',
  'إلغاء': 'Cancel',
  'بحث': 'Search',
  'الرئيسية': 'Home',
  'الفرص': 'Opportunities',
  'لوحة التحكم': 'Dashboard',
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TranslateBody;
    const text = String(body.text || '').trim();
    const source = String(body.source || 'ar').trim().toLowerCase();
    const target = String(body.target || 'en').trim().toLowerCase();
    if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 });

    const settings = await readProviderSettings().catch(() => null);
    if (!settings || settings.provider === 'manual' || !settings.api_url || !settings.api_key) {
      if (source === 'ar' && target === 'en') return NextResponse.json({ translatedText: quickMap[text] || `[Needs translation] ${text}`, provider: 'local_fallback' });
      if (source === 'en' && target === 'ar') {
        const reverse = Object.fromEntries(Object.entries(quickMap).map(([k, v]) => [v.toLowerCase(), k]));
        return NextResponse.json({ translatedText: reverse[text.toLowerCase()] || `[بحاجة ترجمة] ${text}`, provider: 'local_fallback' });
      }
      return NextResponse.json({ translatedText: text, provider: 'local_fallback' });
    }

    const provider = String(settings.provider || '').toLowerCase();
    let translatedText = '';

    if (provider.includes('deepl')) {
      const response = await fetch(settings.api_url, {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${settings.api_key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ text, source_lang: source.toUpperCase(), target_lang: target.toUpperCase() }).toString(),
      });
      const json = await response.json();
      translatedText = json?.translations?.[0]?.text || '';
    } else if (provider.includes('azure')) {
      const response = await fetch(`${settings.api_url}?api-version=3.0&from=${source}&to=${target}`, {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': settings.api_key, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ Text: text }]),
      });
      const json = await response.json();
      translatedText = json?.[0]?.translations?.[0]?.text || '';
    }

    return NextResponse.json({ translatedText: translatedText || text, provider: provider || 'custom' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Translation failed' }, { status: 500 });
  }
}
