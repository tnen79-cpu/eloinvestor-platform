'use client';

import { useEffect, useState } from 'react';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function FollowUserButton({ profileAuthId, lang = 'ar' }: { profileAuthId: string; lang?: string }) {
  const isAr = lang === 'ar';
  const [currentUserId, setCurrentUserId] = useState('');
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    async function boot() {
      const { data } = await supabaseBrowser.auth.getUser();
      const uid = data.user?.id || '';
      if (!mounted) return;
      setCurrentUserId(uid);
      if (!uid || !profileAuthId || uid === profileAuthId) {
        setLoading(false);
        return;
      }
      const { data: existing } = await supabaseBrowser
        .from('user_followers')
        .select('id')
        .eq('follower_auth_id', uid)
        .eq('following_auth_id', profileAuthId)
        .maybeSingle();
      if (mounted) {
        setFollowing(Boolean(existing));
        setLoading(false);
      }
    }
    void boot();
    return () => { mounted = false; };
  }, [profileAuthId]);

  async function toggleFollow() {
    setMessage('');
    if (!currentUserId) {
      setMessage(isAr ? 'سجّل الدخول لمتابعة الصفحة.' : 'Sign in to follow this profile.');
      return;
    }
    if (!profileAuthId || currentUserId === profileAuthId) return;
    setLoading(true);
    if (following) {
      const { error } = await supabaseBrowser
        .from('user_followers')
        .delete()
        .eq('follower_auth_id', currentUserId)
        .eq('following_auth_id', profileAuthId);
      if (!error) setFollowing(false);
      else setMessage(error.message);
    } else {
      const { error } = await supabaseBrowser.from('user_followers').insert({
        follower_auth_id: currentUserId,
        following_auth_id: profileAuthId,
      });
      if (!error) setFollowing(true);
      else setMessage(error.message);
    }
    setLoading(false);
  }

  if (!profileAuthId || currentUserId === profileAuthId) return null;

  return (
    <div>
      <button type="button" onClick={toggleFollow} disabled={loading} className={following ? 'profile-follow following' : 'profile-follow'}>
        {loading ? <Loader2 size={17} className="animate-spin" /> : following ? <UserCheck size={17} /> : <UserPlus size={17} />}
        {following ? (isAr ? 'تتم المتابعة' : 'Following') : (isAr ? 'متابعة الصفحة' : 'Follow profile')}
      </button>
      {message ? <p className="profile-follow-msg">{message}</p> : null}
    </div>
  );
}
