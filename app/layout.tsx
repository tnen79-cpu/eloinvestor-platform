import type { Metadata } from 'next';
import './globals.css';
import './landing.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://eloinvestor.com'),
  title: { default: 'إلو مستثمر | منصة الاستثمار الذكي', template: '%s | إلو مستثمر' },
  description: 'منصة تربط المستثمرين بأصحاب المشاريع والفرص الاستثمارية الموثوقة في عُمان والخليج.',
  manifest: '/manifest.json',
  themeColor: '#1d4ed8',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'إلو مستثمر' },
  openGraph: {
    type: 'website',
    locale: 'ar_OM',
    siteName: 'إلو مستثمر',
    title: 'إلو مستثمر | منصة الاستثمار الذكي',
    description: 'فرص استثمارية موثوقة، تواصل محمي، وتوصيات ذكية للمستثمرين.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'إلو مستثمر | منصة الاستثمار الذكي' }],
  },
  twitter: { card: 'summary_large_image', title: 'إلو مستثمر', description: 'منصة الاستثمار الذكي في عُمان والخليج', images: ['/opengraph-image'] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
