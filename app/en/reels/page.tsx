import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function EnglishReelsRedirect() {
  redirect('/om/en/reels');
}
