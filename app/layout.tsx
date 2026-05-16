import type { Metadata } from 'next';
import './globals.css';
import './landing.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://eloinvestor.com'),
  title: { default: 'إلو مستثمر | منصة الاستثمار الذكي', template: '%s | إلو مستثمر' },
  description: 'منصة تربط المستثمرين بأصحاب المشاريع والفرص الاستثمارية الموثوقة في عُمان والخليج.',
  openGraph: {
    type: 'website',
    locale: 'ar_OM',
    siteName: 'إلو مستثمر',
    title: 'إلو مستثمر | منصة الاستثمار الذكي',
    description: 'فرص استثمارية موثوقة، تواصل محمي، وتوصيات ذكية للمستثمرين.',
  },
  twitter: { card: 'summary_large_image', title: 'إلو مستثمر', description: 'منصة الاستثمار الذكي في عُمان والخليج' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
