'use client';
import { useRef, useState } from 'react';
import { usePlanner } from '@/lib/store';
import { fmt } from '@/lib/utils';
import { useModal } from '@/components/ModalContext';
import { BoltIcon, BellIcon, BellOffIcon, DownloadIcon, UploadIcon } from './Icons';


export const TABS = [
  { id: 'tasks', label: 'ปฏิทินงาน' },
  { id: 'recurring', label: 'งานประจำ' },
  { id: 'events', label: 'วันหยุด / วันลา' },
  { id: 'dash', label: 'Dashboard' },
  { id: 'excel', label: 'Import Excel' },
] as const;
export type TabId = (typeof TABS)[number]['id'];



export default function Header({ tab, onTab }: { tab: TabId; onTab: (t: TabId) => void }) {
  const s = usePlanner();
  const fileRef = useRef<HTMLInputElement>(null);
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [perm, setPerm] = useState<NotificationPermission>(supported ? Notification.permission : 'denied');
  const { showAlert, showConfirm } = useModal();

  const askPermission = async () => {
    if (!supported) return showAlert('แจ้งเตือน', 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน');
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === 'granted') new Notification('เปิดการแจ้งเตือนแล้ว', { body: 'ระบบจะเตือนก่อนถึงเวลางาน' });
    else showAlert('แจ้งเตือน', 'ยังไม่ได้รับอนุญาต ระบบจะแจ้งเตือนเฉพาะในหน้าเว็บ');
  };

  const backup = () => {
    const blob = new Blob([JSON.stringify({ tasks: s.tasks, rules: s.rules, events: s.events }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `planner-backup-${fmt(new Date())}.json`;
    a.click();
  };

  const restore = async (f?: File) => {
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.tasks) || !Array.isArray(d.events)) throw new Error();
      if (!confirm('ข้อมูลปัจจุบันจะถูกแทนที่ทั้งหมด ยืนยันไหม?')) return;
      s.restore(d);
      alert('กู้คืนข้อมูลเรียบร้อย');
    } catch { alert('ไฟล์ไม่ถูกต้อง'); }
  };

  return (
    <header>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BoltIcon size={24} color="var(--pri)" /> My Work Planner
      </h1>
      <nav>
        {TABS.map(t => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => onTab(t.id)}>{t.label}</button>
        ))}
        <button onClick={askPermission} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {perm === 'granted' ? <><BellIcon size={14} /> แจ้งเตือนเปิดอยู่</> : <><BellOffIcon size={14} /> เปิดแจ้งเตือน</>}
        </button>
        <select className="hsel" value={s.remindBefore} onChange={e => s.setRemindBefore(+e.target.value)}>
          {[0, 5, 10, 15, 30, 60].map(n => <option key={n} value={n}>{n ? `เตือนก่อน ${n} นาที` : 'เตือนตรงเวลา'}</option>)}
        </select>
        <button onClick={backup} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <DownloadIcon size={14} /> Backup
        </button>
        <button onClick={() => fileRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <UploadIcon size={14} /> Restore
        </button>
        <input ref={fileRef} type="file" accept=".json" hidden
          onChange={e => { restore(e.target.files?.[0]); e.target.value = ''; }} />
      </nav>
    </header>
  );
}