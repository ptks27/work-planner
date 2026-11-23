import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Sarabun, Plus_Jakarta_Sans } from 'next/font/google';
import { ModalProvider } from '@/components/ModalContext';

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sarabun',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafe' },
    { media: '(prefers-color-scheme: dark)', color: '#09080e' },
  ],
};

export const metadata: Metadata = {
  title: 'My Work Planner',
  description: 'ปฏิทินงาน วันลา กระดานไอเดีย และ Dashboard สไตล์ Editorial Minimal (White & Violet)',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Work Planner',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${jakarta.variable} ${sarabun.variable}`}>
      <body>
        <ModalProvider>{children}</ModalProvider>
      </body>
    </html>
  );
}
