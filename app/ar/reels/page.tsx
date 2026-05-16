import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function ArabicReelsRedirect() {
  redirect('/om/ar/reels');
}
