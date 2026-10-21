'use client';

import React, { useState } from 'react';
import { usePlanner, setSyncingFromCloud } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { useModal } from '@/components/ModalContext';
import { DEFAULT_FIREBASE_CONFIG } from '@/lib/firebaseDefaultConfig';
import FirebaseConfigModal from './FirebaseConfigModal';
import { AvatarIcon } from './Avatars';
import {
  BellIcon,
  BellOffIcon,
  CheckIcon,
  CloudIcon,
  CloudUploadIcon,
  CloudDownloadIcon,
  TrashIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  SettingsIcon,
  UsersIcon,
  ClockIcon,
} from './Icons';

type Perm = NotificationPermission | 'unsupported';
const PERM_UI: Record<Perm, [string, string]> = {
  granted: ['เปิดใช้งานแล้ว', 'ok'],
  default: ['ยังไม่ได้เปิด', 'warn'],
  denied: ['ถูกบล็อกโดยเบราว์เซอร์', 'red'],
  unsupported: ['เบราว์เซอร์ไม่รองรับ', 'red'],
};

export default function SettingsTab() {
  const s = usePlanner();
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [perm, setPerm] = useState<Perm>(supported ? Notification.permission : 'unsupported');
  const [text, cls] = PERM_UI[perm];
  const { showAlert, showConfirm } = useModal();
  const { currentUser, currentTeam } = useAuth();

  const [syncStatus, setSyncStatus] = useState<string>('');
  const [syncing, setSyncing] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);

  const ask = async () => {
    if (!supported) return showAlert('แจ้งเตือน', 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน');
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === 'granted') {
      new Notification('เปิดการแจ้งเตือนแล้ว', { body: 'ระบบจะเตือนก่อนถึงเวลางาน' });
      showAlert('สำเร็จ', 'เปิดการแจ้งเตือนเรียบร้อยแล้ว');
    }
  };

  const test = () => {
    if (perm !== 'granted') return showAlert('แจ้งเตือน', 'กรุณากดเปิดการแจ้งเตือนก่อนทดสอบ');
    new Notification('🔔 ทดสอบการแจ้งเตือน Work Planner', {
      body: 'ระบบแจ้งเตือนกำลังทำงานได้อย่างสมบูรณ์แบบ',
    });
  };

  const handleUploadCloud = async () => {
    const cfg = s.firebaseConfig || DEFAULT_FIREBASE_CONFIG;
    setSyncing(true);
    setSyncStatus('กำลังอัปโหลดข้อมูล...');
    const { uploadToFirebase } = await import('@/lib/firebase');
    const res = await uploadToFirebase(
      {
        tasks: s.tasks,
        rules: s.rules,
        events: s.events,
        customTags: s.customTags || [],
        deletedTags: s.deletedTags || [],
      },
      cfg,
      currentUser?.teamId
    );
    setSyncing(false);
    if (res.success) {
      setSyncStatus('อัปโหลดสำเร็จ ✅');
      showAlert('สำเร็จ', 'ข้อมูลถูกบันทึกขึ้น Firebase Cloud เรียบร้อยแล้ว');
    } else {
      setSyncStatus(`เกิดข้อผิดพลาด: ${res.error}`);
      showAlert('ข้อผิดพลาด', res.error || 'ไม่สามารถอัปโหลดข้อมูลได้');
    }
  };

  const handleDownloadCloud = async () => {
    const cfg = s.firebaseConfig || DEFAULT_FIREBASE_CONFIG;
    showConfirm(
      'ดึงข้อมูลจาก Cloud',
      'ข้อมูลในเครื่องปัจจุบันจะถูกแทนที่ด้วยข้อมูลจาก Firebase Cloud ยืนยันไหม?',
      async () => {
        setSyncing(true);
        setSyncStatus('กำลังดาวน์โหลดข้อมูล...');
        const { downloadFromFirebase } = await import('@/lib/firebase');
        const res = await downloadFromFirebase(cfg, currentUser?.teamId);
        setSyncing(false);
        if (res.success && res.data) {
          setSyncingFromCloud(true);
          s.restore(res.data);
          setTimeout(() => setSyncingFromCloud(false), 600);
          setSyncStatus('ดึงข้อมูลสำเร็จ ✅');
          showAlert('สำเร็จ', 'ดึงข้อมูลจาก Firebase Cloud สำเร็จ');
        } else {
          setSyncStatus(`เกิดข้อผิดพลาด: ${res.error}`);
          showAlert('ข้อผิดพลาด', res.error || 'ไม่พบข้อมูลบน Cloud');
        }
      }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Row: System Preferences & Account Overview */}
      <div className="grid calendar-task-grid">
        {/* Left Card: macOS Preferences */}
        <div className="macos-form-card">
          <div className="macos-window-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="macos-traffic-lights" aria-hidden="true">
                <span className="macos-traffic-dot red" />
                <span className="macos-traffic-dot yellow" />
                <span className="macos-traffic-dot green" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SettingsIcon size={16} color="var(--pri)" strokeWidth={2.5} />
                <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
                  การแจ้งเตือน & ปรับแต่งระบบ
                </span>
              </div>
            </div>
          </div>

          {/* Setting Group 1: Notification Status */}
          <div className="macos-inset-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <b style={{ fontSize: 13, display: 'block', color: 'var(--txt)' }}>สถานะการแจ้งเตือน</b>
                <small style={{ color: 'var(--mut)', fontSize: 11 }}>แจ้งเตือนบนหน้าจอเมื่อถึงเวลานัดหมาย</small>
              </div>
              <span className={`status ${cls}`} style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 999 }}>
                {text}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn sm"
                onClick={ask}
                disabled={perm === 'granted'}
                style={{
                  borderRadius: 999,
                  fontSize: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {perm === 'granted' ? <><CheckIcon size={13} /> เปิดใช้งานแล้ว</> : 'เปิดการแจ้งเตือน'}
              </button>
              <button
                type="button"
                className="btn sm ghost"
                onClick={test}
                style={{ borderRadius: 999, fontSize: 12 }}
              >
                ทดสอบแจ้งเตือน
              </button>
            </div>
          </div>

          {/* Setting Group 2: Remind Before */}
          <div className="macos-inset-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <b style={{ fontSize: 13, display: 'block', color: 'var(--txt)' }}>เตือนล่วงหน้า</b>
                <small style={{ color: 'var(--mut)', fontSize: 11 }}>สำหรับงานที่ระบุเวลาไว้</small>
              </div>
              <select
                value={s.remindBefore}
                onChange={e => s.setRemindBefore(+e.target.value)}
                style={{ width: 'auto', margin: 0, padding: '5px 12px', fontSize: 12, borderRadius: 999 }}
              >
                {[0, 5, 10, 15, 30, 60].map(n => (
                  <option key={n} value={n}>
                    {n ? `ก่อน ${n} นาที` : 'ตรงเวลา'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Setting Group 3: Sound Effect */}
          <div className="macos-inset-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <b style={{ fontSize: 13, display: 'block', color: 'var(--txt)' }}>เสียงเอฟเฟกต์ (Celebration Sound)</b>
                <small style={{ color: 'var(--mut)', fontSize: 11 }}>เล่นเสียงเมื่อทำเครื่องหมายเสร็จสิ้นงาน</small>
              </div>
              <button
                type="button"
                className={`btn sm ${s.soundEnabled ? 'ok' : 'ghost'}`}
                onClick={() => s.setSoundEnabled(!s.soundEnabled)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 999,
                  fontSize: 12,
                  padding: '4px 12px',
                }}
              >
                {s.soundEnabled ? (
                  <><BellIcon size={13} /> เปิดอยู่</>
                ) : (
                  <><BellOffIcon size={13} /> ปิดอยู่</>
                )}
              </button>
            </div>
          </div>

          {/* Setting Group 4: Theme Mode */}
          <div className="macos-inset-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <b style={{ fontSize: 13, display: 'block', color: 'var(--txt)' }}>ธีมการแสดงผล</b>
                <small style={{ color: 'var(--mut)', fontSize: 11 }}>เลือกโหมดสีสไตล์ Apple macOS</small>
              </div>

              {/* Cupertino Theme Pill Switcher */}
              <div
                style={{
                  display: 'inline-flex',
                  background: 'rgba(120, 120, 128, 0.08)',
                  padding: 3,
                  borderRadius: 999,
                  gap: 2,
                }}
              >
                <button
                  type="button"
                  onClick={() => s.setTheme('light')}
                  style={{
                    border: 'none',
                    background: (s.theme || 'light') === 'light' ? 'var(--card-solid)' : 'transparent',
                    color: (s.theme || 'light') === 'light' ? 'var(--txt)' : 'var(--mut)',
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: (s.theme || 'light') === 'light' ? 600 : 500,
                    cursor: 'pointer',
                    boxShadow: (s.theme || 'light') === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <SunIcon size={13} color="#f59e0b" />
                  <span>สว่าง</span>
                </button>
                <button
                  type="button"
                  onClick={() => s.setTheme('dark')}
                  style={{
                    border: 'none',
                    background: s.theme === 'dark' ? 'var(--card-solid)' : 'transparent',
                    color: s.theme === 'dark' ? 'var(--txt)' : 'var(--mut)',
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: s.theme === 'dark' ? 600 : 500,
                    cursor: 'pointer',
                    boxShadow: s.theme === 'dark' ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <MoonIcon size={13} color="#38bdf8" />
                  <span>มืด</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Account & Team Overview Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--line)', marginBottom: 14 }}>
            <UsersIcon size={17} color="var(--pri)" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              ข้อมูลบัญชีและทีมปัจจุบัน
            </h3>
          </div>

          {/* Current User Card */}
          {currentUser && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px',
                borderRadius: 14,
                background: 'rgba(120, 120, 128, 0.04)',
                border: '1px solid var(--line)',
                marginBottom: 14,
              }}
            >
              <AvatarIcon id={currentUser.avatarId} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--txt)' }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 2 }}>
                  ระดับ: {currentUser.role === 'admin' ? 'หัวหน้าทีม (Admin)' : 'สมาชิก (Member)'} · รหัส: {currentUser.id}
                </div>
              </div>
            </div>
          )}

          {/* Team Info */}
          <div
            style={{
              padding: '14px',
              borderRadius: 14,
              background: 'rgba(0, 113, 227, 0.05)',
              border: '1px solid rgba(0, 113, 227, 0.18)',
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mut)' }}>ห้องทีมที่ใช้งาน:</span>
              <span style={{ fontSize: 11, background: 'var(--pri)', color: '#fff', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                {currentTeam?.code || 'โหมดเครื่องเดี่ยว'}
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>
              {currentTeam?.name || 'ทีมของฉัน (Local)'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 4 }}>
              สมาชิกทั้งหมด: <b>{currentTeam?.members?.length || 1}</b> คน
            </div>
          </div>

          {/* Overview Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              textAlign: 'center',
            }}
          >
            <div style={{ padding: '10px 6px', borderRadius: 10, background: 'rgba(120, 120, 128, 0.04)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt)' }}>{s.tasks.length}</div>
              <small style={{ color: 'var(--mut)', fontSize: 11 }}>งานทั้งหมด</small>
            </div>
            <div style={{ padding: '10px 6px', borderRadius: 10, background: 'rgba(120, 120, 128, 0.04)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#34c759' }}>{s.tasks.filter(t => t.done).length}</div>
              <small style={{ color: 'var(--mut)', fontSize: 11 }}>ทำเสร็จแล้ว</small>
            </div>
            <div style={{ padding: '10px 6px', borderRadius: 10, background: 'rgba(120, 120, 128, 0.04)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--pri)' }}>{s.events.length}</div>
              <small style={{ color: 'var(--mut)', fontSize: 11 }}>วันหยุด/ลา</small>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Sync Database (Apple Clean Status Bar) */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          padding: '16px 20px',
          borderRadius: 18,
          background: 'var(--card-solid)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 260 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(52, 199, 89, 0.12)',
              color: '#34c759',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CloudIcon size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>
                Cloud Database:
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'rgba(52, 199, 89, 0.12)',
                  color: '#34c759',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#34c759',
                    boxShadow: '0 0 6px #34c759',
                  }}
                />
                เชื่อมต่อ work-planner-9caf4 แล้ว (ซิงค์อัตโนมัติ)
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 3 }}>
              ระบบซิงค์งาน วันหยุด และข้อมูลทีมให้อัตโนมัติแบบ Real-time ข้ามอุปกรณ์
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn ok sm"
            onClick={handleUploadCloud}
            disabled={syncing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 999,
              padding: '7px 16px',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <CloudUploadIcon size={14} className={syncing ? 'spin' : ''} />
            <span>{syncing ? 'กำลังซิงค์...' : '🔄 ซิงค์ทันที'}</span>
          </button>

          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setIsFirebaseModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 999,
              padding: '7px 16px',
              fontSize: 12.5,
              fontWeight: 600,
              background: 'rgba(120, 120, 128, 0.08)',
            }}
          >
            <SettingsIcon size={13} />
            <span>⚙️ จัดการการเชื่อมต่อ</span>
          </button>
        </div>
      </div>

      <FirebaseConfigModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />
    </div>
  );
}
