import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EloInvestor | إلو مستثمر',
  description: 'Multi-country investment marketplace for verified business opportunities.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
