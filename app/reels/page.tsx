import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function ReelsRedirect() {
  redirect('/om/ar/reels');
}
