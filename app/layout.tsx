import './globals.css';
import type { Metadata } from 'next';
import { Sarabun } from 'next/font/google';
import { ModalProvider } from '@/components/ModalContext';

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sarabun',
});

export const metadata: Metadata = {
  title: 'My Work Planner',
  description: 'ปฏิทินงาน วันลา และ Dashboard ออกแบบด้วย Apple Design System',
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
