'use client';
import { useEffect, useState } from 'react';
import { usePlanner } from '@/lib/store';
import { tasksOn } from '@/lib/selectors';
import { fmt } from '@/lib/utils';

export default function Notifier() {
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);

  useEffect(() => {
    const check = () => {
      const s = usePlanner.getState();
      const now = new Date();
      const today = fmt(now);
      const mins = now.getHours() * 60 + now.getMinutes();

      tasksOn(s, today).forEach(t => {
        if (t.done || t.hidden || !t.time || s.notified.includes(t.id)) return;
        const [h, m] = t.time.split(':').map(Number);
        const at = h * 60 + m;
        // เตือนตั้งแต่ (เวลา - remindBefore) จนถึงเลยเวลาไม่เกิน 60 นาที
        if (mins >= at - s.remindBefore && mins <= at + 60) {
          const text = `${t.time} · ${t.title}`;
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⏰ ใกล้ถึงเวลางาน', { body: text, tag: t.id });
          }
          setToasts(x => [...x, { id: t.id, text }]);
          s.markNotified(t.id);
        }
      });
    };
    check();
    const i = setInterval(check, 30000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="toasts">
      {toasts.map(t => (
        <div key={t.id} className="toast" onClick={() => setToasts(x => x.filter(y => y.id !== t.id))}>
          ⏰ {t.text}<small>คลิกเพื่อปิด</small>
        </div>
      ))}
    </div>
  );
}