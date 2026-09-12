import type { Metadata } from 'next';
import './globals.css';
import Splash from '@/components/Splash';

export const metadata: Metadata = {
  title: 'One Step | NH Math Academy',
  description: 'One Step Educational Platform',
  icons: {
    icon: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-[#030712] text-slate-100 antialiased">
        {/* شاشة السبلاش الترحيبية */}
        <Splash />
        {children}
      </body>
    </html>
  );
}