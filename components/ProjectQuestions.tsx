'use client';

import { useEffect, useState } from 'react';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export type ProjectQuestionItem = {
  id: string;
  question: string;
  answer?: string;
  askerAuthId?: string;
  ownerAuthId?: string;
  createdAt?: string;
  answeredAt?: string;
};

export function ProjectQuestions({
  projectId,
  ownerId,
  initialQuestions,
  lang,
}: {
  projectId: string;
  ownerId?: string;
  initialQuestions: ProjectQuestionItem[];
  lang: string;
}) {
  const isAr = lang === 'ar';
  const [userId, setUserId] = useState('');
  const [questions, setQuestions] = useState<ProjectQuestionItem[]>(initialQuestions || []);
  const [question, setQuestion] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isOwner = Boolean(userId && ownerId && userId === ownerId);

  useEffect(() => {
    let mounted = true;
    supabaseBrowser.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id || '');
    });
    return () => { mounted = false; };
  }, []);

  async function reload() {
    const { data } = await supabaseBrowser
      .from('project_questions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    setQuestions((data || []).map((row: any) => ({
      id: String(row.id),
      question: String(row.question || row.body || row.content || ''),
      answer: String(row.answer || row.reply || row.owner_reply || ''),
      askerAuthId: String(row.asker_auth_id || row.user_auth_id || row.created_by || ''),
      ownerAuthId: String(row.owner_auth_id || ''),
      createdAt: String(row.created_at || ''),
      answeredAt: String(row.answered_at || row.updated_at || ''),
    })).filter((item) => item.question));
  }

  async function submitQuestion() {
    setMessage('');
    if (!userId) {
      setMessage(isAr ? 'يجب تسجيل الدخول لطرح سؤال.' : 'Please login to ask a question.');
      return;
    }
    if (!question.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabaseBrowser.from('project_questions').insert({
        project_id: projectId,
        asker_auth_id: userId,
        user_auth_id: userId,
        owner_auth_id: ownerId || null,
        question: question.trim(),
        status: 'published',
      });
      if (error) throw error;
      setQuestion('');
      setMessage(isAr ? 'تم نشر السؤال.' : 'Question posted.');
      await reload();
    } catch (error: any) {
      setMessage(error?.message || (isAr ? 'تعذر إرسال السؤال.' : 'Could not submit question.'));
    } finally {
      setLoading(false);
    }
  }

  async function submitReply(questionId: string) {
    setMessage('');
    if (!isOwner) return;
    const value = (replyText[questionId] || '').trim();
    if (!value) return;
    setLoading(true);
    try {
      const { error } = await supabaseBrowser
        .from('project_questions')
        .update({ answer: value, owner_reply: value, answered_at: new Date().toISOString(), status: 'answered' })
        .eq('id', questionId);
      if (error) throw error;
      setReplyText((prev) => ({ ...prev, [questionId]: '' }));
      setMessage(isAr ? 'تم حفظ الرد.' : 'Reply saved.');
      await reload();
    } catch (error: any) {
      setMessage(error?.message || (isAr ? 'تعذر حفظ الرد.' : 'Could not save reply.'));
    } finally {
      setLoading(false);
    }
  }

  if (!userId) {
    return (
      <div className="project-questions-v34">
        <div className="project-empty-v34">
          {isAr ? 'الأسئلة تظهر للمستخدمين المسجلين فقط. سجّل الدخول لمشاهدة الأسئلة أو طرح سؤال.' : 'Questions are visible to registered users only. Login to view or ask questions.'}
        </div>
      </div>
    );
  }

  return (
    <div className="project-questions-v34">
      <div className="project-question-form-v34">
        <MessageCircle size={18} />
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={isAr ? 'اكتب سؤالك لصاحب المشروع...' : 'Write your question to the project owner...'}
        />
        <button type="button" onClick={submitQuestion} disabled={loading || !question.trim()}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          {isAr ? 'إرسال السؤال' : 'Ask'}
        </button>
      </div>

      {message ? <div className="project-question-message-v34">{message}</div> : null}

      <div className="project-question-list-v34">
        {questions.length ? questions.map((item) => (
          <article key={item.id}>
            <div>
              <strong>{isAr ? 'سؤال' : 'Question'}</strong>
              <p>{item.question}</p>
            </div>

            {item.answer ? (
              <div className="answer">
                <strong>{isAr ? 'رد صاحب المشروع' : 'Owner reply'}</strong>
                <p>{item.answer}</p>
              </div>
            ) : isOwner ? (
              <div className="reply-box">
                <textarea
                  value={replyText[item.id] || ''}
                  onChange={(event) => setReplyText((prev) => ({ ...prev, [item.id]: event.target.value }))}
                  placeholder={isAr ? 'اكتب ردك على هذا السؤال...' : 'Write your reply...'}
                />
                <button type="button" onClick={() => submitReply(item.id)} disabled={loading || !(replyText[item.id] || '').trim()}>
                  {isAr ? 'رد الآن' : 'Reply'}
                </button>
              </div>
            ) : (
              <small>{isAr ? 'بانتظار رد صاحب المشروع.' : 'Waiting for owner reply.'}</small>
            )}
          </article>
        )) : <div className="project-empty-v34">{isAr ? 'لا توجد أسئلة بعد. كن أول من يسأل.' : 'No questions yet. Be the first to ask.'}</div>}
      </div>
    </div>
  );
}
