'use client';
import { usePlanner } from '@/lib/store';
import { useToday } from '@/lib/hooks';
import { visibleOn } from '@/lib/selectors';
import { useAuth } from '@/lib/authStore';
import { AvatarIcon } from './Avatars';

import {
  CalendarIcon,
  ColumnsIcon,
  UmbrellaIcon,
  ChartBarIcon,
  SpreadsheetIcon,
  SettingsIcon,
  BoltIcon,
  StickyNoteIcon,
} from './Icons';

export interface TabItem {
  id: 'tasks' | 'timeline' | 'canvas' | 'events' | 'dash' | 'settings';
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  desc: string;
}

export const TABS: TabItem[] = [
  { id: 'tasks', icon: <CalendarIcon size={18} />, label: 'ปฏิทินงาน', shortLabel: 'ปฏิทิน', desc: 'ดูและจัดการงานของแต่ละวัน' },
  { id: 'timeline', icon: <ColumnsIcon size={18} />, label: 'ไทม์ไลน์งาน', shortLabel: 'ไทม์ไลน์', desc: 'แกนต์ชาร์ตและ Roadmap โครงการ' },
  { id: 'canvas', icon: <StickyNoteIcon size={18} />, label: 'กระดานไอเดีย', shortLabel: 'ไอเดีย', desc: 'ระดมความคิดและโพสต์อิท Visual Canvas' },
  { id: 'events', icon: <UmbrellaIcon size={18} />, label: 'วันหยุด / วันลา', shortLabel: 'วันลา', desc: 'บันทึกวันหยุด วันลา และโน้ต' },
  { id: 'dash', icon: <ChartBarIcon size={18} />, label: 'Dashboard', shortLabel: 'แดชบอร์ด', desc: 'สรุปผลงานและสถิติกราฟ' },
  { id: 'settings', icon: <SettingsIcon size={18} />, label: 'ตั้งค่า', shortLabel: 'ตั้งค่า', desc: 'ระบบ คลาวด์ และการแจ้งเตือน' },
];
export type TabId = 'tasks' | 'timeline' | 'canvas' | 'events' | 'dash' | 'settings';

export default function Sidebar({
  tab,
  onTab,
  onOpenProfile,
}: {
  tab: TabId;
  onTab: (t: TabId) => void;
  onOpenProfile?: () => void;
}) {
  const s = usePlanner();
  const { currentUser } = useAuth();
  const today = useToday();
  const ts = visibleOn(s, today);
  const done = ts.filter(t => t.done).length;
  const pct = ts.length ? Math.round((done / ts.length) * 100) : 0;

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="logo">
          <BoltIcon size={20} color="#fff" />
        </span>
        <div><b>Work Planner</b><small>ระบบวางแผนและปฏิทินทีม</small></div>
      </div>

      <nav className="menu">
        {TABS.map(t => (
          <button key={t.id} className={`menu-item ${tab === t.id ? 'active' : ''}`} onClick={() => onTab(t.id)}>
            <span className="mi-icon">{t.icon}</span>
            <span className="menu-label-full">{t.label}</span>
            <span className="menu-label-short">{t.shortLabel}</span>
          </button>
        ))}
      </nav>

      <div className="side-progress">
        <small>ความคืบหน้าวันนี้</small>
        <div className="sp-num"><b>{done}</b> / {ts.length} งาน</div>
        <div className="bar"><div style={{ width: `${pct}%` }} /></div>
        <small>{ts.length === 0 ? 'วันนี้ยังไม่มีงาน' : pct === 100 ? 'ยอดเยี่ยม เสร็จครบแล้ว 🎉' : `สำเร็จแล้ว ${pct}%`}</small>
      </div>

      {currentUser && (
        <div
          onClick={onOpenProfile}
          className="side-user-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 16,
            background: 'rgba(120, 120, 128, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid var(--line)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          title="ดูโปรไฟล์และเลือก Avatar"
        >
          <AvatarIcon id={currentUser.avatarId} size={36} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentUser.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--mut)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentUser.role || 'โปรไฟล์ส่วนตัว'}
            </div>
          </div>
          <span style={{ fontSize: 13, color: 'var(--mut)' }}>👤</span>
        </div>
      )}
    </aside>
  );
}