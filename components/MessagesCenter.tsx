'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowUp, Inbox, Loader2, MessageCircle, Search, ShieldAlert } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Conversation = {
  id: string;
  project_id: string;
  buyer_id: string;
  owner_id: string;
  country_code: string;
  status: string;
  last_message: string;
  last_message_at: string;
  project?: { id: string; title?: string; slug?: string; cover_image?: string; image_url?: string } | null;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  image_url?: string | null;
  created_at: string;
  read_at?: string | null;
};

function timeAgo(value: string, lang: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-OM' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function pickTitle(project: any, lang: string) {
  return project?.title_ar || project?.title || project?.project_title || (lang === 'ar' ? 'مشروع' : 'Project');
}

export function MessagesCenter({ country, lang }: { country: string; lang: string }) {
  const isAr = lang === 'ar';
  const params = useSearchParams();
  const wantedConversation = params.get('conversation');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const activeConversation = useMemo(() => conversations.find((item) => item.id === activeId), [conversations, activeId]);

  async function loadConversations(currentUserId: string) {
    const { data, error } = await supabaseBrowser
      .from('conversations')
      .select('*, project:projects(id,title,slug,cover_image,image_url)')
      .or(`buyer_id.eq.${currentUserId},owner_id.eq.${currentUserId}`)
      .eq('country_code', country)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    const list = (data || []) as any[];
    setConversations(list as Conversation[]);
    if (wantedConversation && list.some((item) => item.id === wantedConversation)) setActiveId(wantedConversation);
    else if (!activeId && list[0]) setActiveId(list[0].id);
  }

  async function loadMessages(conversationId: string) {
    const { data, error } = await supabaseBrowser
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    setMessages((data || []) as ChatMessage[]);

    const { error: readError } = await supabaseBrowser
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (readError) console.warn('Read receipt skipped:', readError.message);
  }

  useEffect(() => {
    let mounted = true;
    async function init() {
      setLoading(true);
      setError('');
      try {
        const { data } = await supabaseBrowser.auth.getUser();
        const user = data.user;
        if (!user) {
          setUserId('');
          setLoading(false);
          return;
        }
        if (!mounted) return;
        setUserId(user.id);
        await loadConversations(user.id);
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Could not load conversations');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, wantedConversation]);

  useEffect(() => {
    if (!activeId || !userId) return;
    loadMessages(activeId).catch((err) => setError(err?.message || 'Could not load messages'));

    const channel = supabaseBrowser
      .channel(`conversation-${activeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` }, (payload) => {
        setMessages((current) => {
          if (current.some((item) => item.id === (payload.new as any).id)) return current;
          return [...current, payload.new as ChatMessage];
        });
      })
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function sendMessage() {
    const body = message.trim();
    if (!body || !activeId || !userId || sending) return;
    setSending(true);
    setError('');
    try {
      const { error: insertError } = await supabaseBrowser.from('messages').insert({ conversation_id: activeId, sender_id: userId, body });
      if (insertError) throw insertError;
      setMessage('');
      await supabaseBrowser
        .from('conversations')
        .update({ last_message: body, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', activeId);
      await loadConversations(userId);
    } catch (err: any) {
      setError(err?.message || (isAr ? 'تعذر إرسال الرسالة.' : 'Could not send message.'));
    } finally {
      setSending(false);
    }
  }

  const filteredConversations = conversations.filter((item) => {
    const title = pickTitle(item.project, lang).toLowerCase();
    return !query || title.includes(query.toLowerCase()) || item.last_message?.toLowerCase().includes(query.toLowerCase());
  });

  if (!userId && !loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 text-2xl font-black text-slate-950">{isAr ? 'سجّل الدخول لعرض المحادثات' : 'Sign in to view messages'}</h1>
        <Link href={`/${country}/${lang}/login`} className="mt-6 inline-flex rounded-2xl bg-emerald-700 px-6 py-4 font-black text-white">{isAr ? 'تسجيل الدخول' : 'Login'}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-black text-emerald-700">{isAr ? 'مركز التواصل' : 'Communication center'}</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">{isAr ? 'المحادثات وطلبات التواصل' : 'Messages & contact requests'}</h1>
        <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-500">{isAr ? 'كل محادثة مرتبطة بمشروع محدد ويتم حفظ الرسائل لحماية صاحب المشروع والمستثمر.' : 'Each conversation is attached to a project and messages are logged for trust and safety.'}</p>
      </div>

      {error ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700 ring-1 ring-red-100">{error}</div> : null}

      <div className="grid min-h-[620px] gap-4 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative mb-4">
            <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isAr ? 'بحث في المحادثات' : 'Search messages'} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pe-4 ps-11 text-sm font-bold outline-none focus:border-emerald-500" />
          </div>

          {loading ? (
            <div className="grid place-items-center rounded-2xl bg-slate-50 p-10"><Loader2 className="h-6 w-6 animate-spin text-emerald-700" /></div>
          ) : filteredConversations.length ? (
            <div className="space-y-2">
              {filteredConversations.map((item) => {
                const active = item.id === activeId;
                return (
                  <button key={item.id} onClick={() => setActiveId(item.id)} className={`w-full rounded-2xl p-4 text-start transition ${active ? 'bg-emerald-700 text-white' : 'bg-slate-50 text-slate-900 hover:bg-emerald-50'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-black">{pickTitle(item.project, lang)}</p>
                      <span className={`text-[10px] font-black ${active ? 'text-white/70' : 'text-slate-400'}`}>{timeAgo(item.last_message_at, lang)}</span>
                    </div>
                    <p className={`mt-2 line-clamp-1 text-xs font-bold ${active ? 'text-white/80' : 'text-slate-500'}`}>{item.last_message || (isAr ? 'لا توجد رسائل بعد' : 'No messages yet')}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid place-items-center rounded-2xl bg-slate-50 p-10 text-center">
              <Inbox className="h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-black text-slate-600">{isAr ? 'لا توجد محادثات بعد.' : 'No conversations yet.'}</p>
            </div>
          )}
        </aside>

        <section className="flex min-h-[620px] flex-col rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          {activeConversation ? (
            <>
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
                <div>
                  <p className="text-xs font-black text-emerald-700">{isAr ? 'محادثة مشروع' : 'Project conversation'}</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{pickTitle(activeConversation.project, lang)}</h2>
                </div>
                <Link href={`/${country}/${lang}/project/${activeConversation.project_id}`} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 hover:bg-emerald-50">{isAr ? 'فتح المشروع' : 'Open project'}</Link>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {messages.length ? messages.map((msg) => {
                  const mine = msg.sender_id === userId;
                  return (
                    <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-3xl px-5 py-3 ${mine ? 'rounded-br-md bg-emerald-700 text-white' : 'rounded-bl-md bg-slate-100 text-slate-900'}`}>
                        <p className="whitespace-pre-wrap text-sm font-bold leading-7">{msg.body}</p>
                        <p className={`mt-2 text-[10px] font-bold ${mine ? 'text-white/60' : 'text-slate-400'}`}>{timeAgo(msg.created_at, lang)}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="grid h-full place-items-center text-center text-slate-500">
                    <div>
                      <MessageCircle className="mx-auto h-10 w-10" />
                      <p className="mt-3 font-black">{isAr ? 'ابدأ المحادثة الآن' : 'Start the conversation'}</p>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-slate-100 p-4">
                <div className="flex gap-3">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={isAr ? 'اكتب رسالتك...' : 'Write a message...'}
                    className="h-14 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 font-bold outline-none focus:border-emerald-500"
                  />
                  <button onClick={sendMessage} disabled={sending || !message.trim()} className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-700 text-white disabled:opacity-50">
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-10 text-center text-slate-500">
              <div>
                <MessageCircle className="mx-auto h-12 w-12" />
                <p className="mt-4 text-lg font-black">{isAr ? 'اختر محادثة لعرض الرسائل.' : 'Select a conversation to view messages.'}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
