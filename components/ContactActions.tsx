'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageCircle, PhoneCall, LockKeyhole } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { canInvest } from '@/lib/account';

type Props = {
  country: string;
  lang: string;
  projectId: string;
  projectTitle: string;
  ownerId?: string;
  whatsapp?: string;
  projectSnapshot?: Record<string, unknown>;
};

function cleanPhone(phone?: string) {
  return String(phone || '').replace(/[^0-9+]/g, '').replace(/^00/, '+');
}

export function ContactActions({ country, lang, projectId, projectTitle, ownerId, whatsapp, projectSnapshot }: Props) {
  const router = useRouter();
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function getCurrentUser() {
    const { data } = await supabaseBrowser.auth.getUser();
    return data.user;
  }

  async function startConversation(openWhatsapp = false) {
    setError('');
    setLoading(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push(`/${country}/${lang}/login?next=/${country}/${lang}/project/${encodeURIComponent(projectId)}`);
        return;
      }

      let accountType = user.user_metadata?.account_type || 'investor';
      let role = user.user_metadata?.role || 'user';
      try {
        const { data: profile } = await supabaseBrowser
          .from('users')
          .select('role,account_type')
          .eq('auth_id', user.id)
          .maybeSingle();
        accountType = (profile as any)?.account_type || accountType;
        role = (profile as any)?.role || role;
      } catch (profileError) {
        console.warn('Contact role lookup failed:', profileError);
      }

      if (!canInvest(accountType, role)) {
        setError(isAr ? 'التواصل مع المشاريع متاح لحساب المستثمر أو حساب الاثنين معًا.' : 'Contacting projects is available for investor or combined accounts.');
        return;
      }

      if (ownerId && user.id === ownerId) {
        setError(isAr ? 'لا يمكنك التواصل مع مشروعك نفسه.' : 'You cannot contact your own project.');
        return;
      }

      if (!ownerId) {
        setError(isAr ? 'لا يوجد صاحب مشروع مرتبط بهذا المشروع.' : 'This project has no owner attached.');
        return;
      }

      const baseConversationPayload = {
        project_id: projectId,
        buyer_id: user.id,
        investor_id: user.id,
        owner_id: ownerId,
        country_code: country,
        status: 'open',
        last_message: isAr ? `طلب تواصل بخصوص: ${projectTitle}` : `Contact request about: ${projectTitle}`,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      async function upsertConversationWithFallback(payload: Record<string, unknown>, conflict = 'project_id,buyer_id') {
        let current = { ...payload };
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const { data, error } = await supabaseBrowser
            .from('conversations')
            .upsert(current, { onConflict: conflict })
            .select('id')
            .single();
          if (!error) return data;
          const message = [error.message, (error as any).details, (error as any).hint].filter(Boolean).join(' ');
          const missing = message.match(/column ['"]?([^'"\s]+)['"]? of relation/i)?.[1] || message.match(/Could not find the ['"]([^'"]+)['"] column/i)?.[1];
          if (missing && Object.prototype.hasOwnProperty.call(current, missing)) {
            delete current[missing];
            if (missing === 'buyer_id') conflict = 'project_id,investor_id';
            if (missing === 'investor_id') conflict = 'project_id,buyer_id';
            continue;
          }
          throw error;
        }
        throw new Error(isAr ? 'تعذر إنشاء المحادثة بسبب توافق قاعدة البيانات.' : 'Could not create conversation due to database compatibility.');
      }

      const conversation = await upsertConversationWithFallback(baseConversationPayload);

      const { count: existingMessages, error: countError } = await supabaseBrowser
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversation.id);
      if (countError) console.warn('Message count skipped:', countError.message);

      if (!existingMessages || existingMessages === 0) {
        const { error: messageError } = await supabaseBrowser.from('messages').insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          body: isAr ? `مرحبًا، أنا مهتم بهذا المشروع: ${projectTitle}` : `Hello, I am interested in this project: ${projectTitle}`,
          read_at: null,
        });
        if (messageError) throw messageError;
      }

      try {
        await supabaseBrowser.from('investor_contacted_projects').upsert({
          investor_auth_id: user.id,
          project_id: projectId,
          conversation_id: conversation.id,
          project_snapshot: projectSnapshot || { id: projectId, title_ar: projectTitle, title: projectTitle },
        }, { onConflict: 'investor_auth_id,project_id' });
      } catch (contactLogError) {
        console.warn('Investor contact log skipped:', contactLogError);
      }

      // Increment contact count if the RPC exists. Do not block chat/contact if it is missing.
      const { error: counterError } = await supabaseBrowser.rpc('increment_project_contact_count', {
        p_project_id: projectId,
      });
      if (counterError) console.warn('Contact counter skipped:', counterError.message);

      if (openWhatsapp) {
        const phone = cleanPhone(whatsapp);
        if (!phone) {
          router.push(`/${country}/${lang}/messages?conversation=${conversation.id}`);
          return;
        }
        const text = encodeURIComponent(isAr ? `مرحبًا، أنا مهتم بالمشروع: ${projectTitle}` : `Hello, I am interested in: ${projectTitle}`);
        window.open(`https://wa.me/${phone.replace('+', '')}?text=${text}`, '_blank', 'noopener,noreferrer');
      }

      router.push(`/${country}/${lang}/messages?conversation=${conversation.id}`);
    } catch (err: any) {
      setError(err?.message || (isAr ? 'حدث خطأ أثناء فتح التواصل.' : 'Could not start contact.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700 ring-1 ring-red-100">{error}</div> : null}
      <button
        onClick={() => startConversation(false)}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 font-black text-white shadow-lg shadow-emerald-900/10 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
        {isAr ? 'بدء محادثة داخلية' : 'Start internal chat'}
      </button>
      <button
        onClick={() => startConversation(true)}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 font-black text-emerald-900 disabled:opacity-60"
      >
        {whatsapp ? <PhoneCall className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
        {whatsapp ? (isAr ? 'فتح واتساب' : 'Open WhatsApp') : (isAr ? 'واتساب غير متاح' : 'WhatsApp unavailable')}
      </button>
      <p className="text-center text-xs font-bold leading-6 text-slate-500">
        {isAr ? 'بيانات التواصل لا تظهر إلا بعد تسجيل الدخول ويتم حفظ طلب التواصل لحماية الطرفين.' : 'Contact is gated behind sign-in and logged to protect both parties.'}
      </p>
    </div>
  );
}
