import { redirect } from 'next/navigation';

export default function OldAdminRedirect() {
  redirect('/eloinvestor-admin/login');
}
