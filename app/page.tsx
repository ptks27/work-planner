'use client';
import dynamic from 'next/dynamic';

// โหลดแอปเฉพาะในเบราว์เซอร์ (ไม่ prerender บนเซิร์ฟเวอร์)
const App = dynamic(() => import('@/components/App'), {
  ssr: false,
  loading: () => <div className="loading">กำลังโหลด...</div>,
});

export default function Page() {
  return <App />;
}