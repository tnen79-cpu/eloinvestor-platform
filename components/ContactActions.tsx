'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageCircle, PhoneCall, LockKeyhole, Send } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { canInvest } from '@/lib/account';
import { trackPromotionMetric } from '@/lib/promotion-analytics';

type Props = {
  country: string;
  lang: string;
  projectId: string;
  projectTitle: string;
  ownerId?: string;
  whatsapp?: string;
  projectSnapshot?: Record<string, unknown>;
  showInvest?: boolean;
  showWhatsapp?: boolean;
  isSponsored?: boolean;
};

function cleanPhone(phone?: string) {
  return String(phone || '').replace(/[^0-9+]/g, '').replace(/^00/, '+');
}

export function ContactActions({ country, lang, projectId, projectTitle, ownerId, whatsapp, projectSnapshot, showWhatsapp = true, isSponsored = false }: Props) {
  const router = useRouter();
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState<'chat' | 'whatsapp' | 'call' | ''>('');
  const [error, setError] = useState('');

  async function getCurrentUser() {
    const { data } = await supabaseBrowser.auth.getUser();
    return data.user;
  }

  async function ensureConversation(action: 'chat' | 'whatsapp' | 'call') {
    setError('');
    setLoading(action);

    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push(`/${country}/${lang}/login?next=/${country}/${lang}/project/${encodeURIComponent(projectId)}`);
        return null;
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
        return null;
      }

      if (ownerId && user.id === ownerId) {
        setError(isAr ? 'لا يمكنك التواصل مع مشروعك نفسه.' : 'You cannot contact your own project.');
        return null;
      }

      if (!ownerId) {
        setError(isAr ? 'لا يوجد صاحب مشروع مرتبط بهذا المشروع.' : 'This project has no owner attached.');
        return null;
      }

      let ownerWelcomeMessage = '';
      try {
        const { data: ownerProfile } = await supabaseBrowser
          .from('users')
          .select('auto_welcome_message,welcome_message,name')
          .eq('auth_id', ownerId)
          .maybeSingle();
        ownerWelcomeMessage = String((ownerProfile as any)?.auto_welcome_message || (ownerProfile as any)?.welcome_message || '').trim();
      } catch (welcomeLookupError) {
        console.warn('Owner welcome message lookup skipped:', welcomeLookupError);
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
        const current = { ...payload };
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
        if (ownerWelcomeMessage) {
          const { error: welcomeError } = await supabaseBrowser.from('messages').insert({
            conversation_id: conversation.id,
            sender_id: ownerId,
            body: ownerWelcomeMessage,
            read_at: null,
          });
          if (welcomeError) console.warn('Auto welcome message skipped:', welcomeError.message);
        }
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

      const { error: counterError } = await supabaseBrowser.rpc('increment_project_contact_count', { p_project_id: projectId });
      if (counterError) console.warn('Contact counter skipped:', counterError.message);

      if (isSponsored) await trackPromotionMetric(projectId, 'contact');

      return conversation;
    } catch (err: any) {
      setError(err?.message || (isAr ? 'حدث خطأ أثناء فتح التواصل.' : 'Could not start contact.'));
      return null;
    } finally {
      setLoading('');
    }
  }

  async function openChat() {
    const conversation = await ensureConversation('chat');
    if (conversation?.id) router.push(`/${country}/${lang}/messages?conversation=${conversation.id}`);
  }

  async function openWhatsapp() {
    if (!showWhatsapp) return;
    const conversation = await ensureConversation('whatsapp');
    if (!conversation?.id) return;
    const phone = cleanPhone(whatsapp);
    if (!phone) {
      setError(isAr ? 'رقم واتساب غير متاح لهذا المشروع.' : 'WhatsApp number is unavailable for this project.');
      return;
    }
    const text = encodeURIComponent(isAr ? `مرحبًا، أنا مهتم بالمشروع: ${projectTitle}` : `Hello, I am interested in: ${projectTitle}`);
    window.open(`https://wa.me/${phone.replace('+', '')}?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  async function openCall() {
    const conversation = await ensureConversation('call');
    if (!conversation?.id) return;
    const phone = cleanPhone(whatsapp);
    if (!phone) {
      setError(isAr ? 'رقم الاتصال غير متاح لهذا المشروع.' : 'Phone number is unavailable for this project.');
      return;
    }
    window.location.href = `tel:${phone}`;
  }

  return (
    <div className="project-contact-actions-v34">
      {error ? <div className="project-contact-error-v34">{error}</div> : null}
      <button type="button" onClick={openWhatsapp} disabled={Boolean(loading) || !showWhatsapp} className="project-contact-whatsapp-v34">
        {loading === 'whatsapp' ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        {isAr ? 'واتساب' : 'WhatsApp'}
      </button>
      <button type="button" onClick={openCall} disabled={Boolean(loading)} className="project-contact-outline-v34">
        {loading === 'call' ? <Loader2 className="animate-spin" size={18} /> : whatsapp ? <PhoneCall size={18} /> : <LockKeyhole size={18} />}
        {isAr ? 'اتصال' : 'Call'}
      </button>
      <button type="button" onClick={openChat} disabled={Boolean(loading)} className="project-contact-outline-v34">
        {loading === 'chat' ? <Loader2 className="animate-spin" size={18} /> : <MessageCircle size={18} />}
        {isAr ? 'دردشة' : 'Chat'}
      </button>
      <p>{isAr ? 'بيانات التواصل متاحة للمستخدمين المسجلين فقط ويتم حفظ الطلب لحماية الطرفين.' : 'Contact is available for signed-in users and logged to protect both sides.'}</p>
    </div>
  );
}
