import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Sarabun } from 'next/font/google';
import { ModalProvider } from '@/components/ModalContext';

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sarabun',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover', // Support iPhone Notch, Dynamic Island, iPad & Foldable devices
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#161617' },
  ],
};

export const metadata: Metadata = {
  title: 'My Work Planner',
  description: 'ปฏิทินงาน วันลา และ Dashboard ออกแบบด้วย Apple Design System',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Work Planner',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body>
        <ModalProvider>{children}</ModalProvider>
      </body>
    </html>
  );
}
