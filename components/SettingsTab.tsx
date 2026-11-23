'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePlanner, setSyncingFromCloud, syncPlannerToFirebase } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { useModal } from '@/components/ModalContext';
import { DEFAULT_FIREBASE_CONFIG } from '@/lib/firebaseDefaultConfig';
import { parseFirebaseConfig } from '@/lib/firebase';
import { isUserTeamOwner } from '@/lib/permissions';
import {
  measureCloudStorage,
  formatStorageBytes,
  downloadBackupJson,
  parseBackupJson,
  mergePlannerData,
  CLOUD_DOC_LIMIT_BYTES,
  MAX_BACKUP_IMPORT_BYTES,
  type ParsedBackupResult,
} from '@/lib/storageBackup';
import FirebaseConfigModal from './FirebaseConfigModal';
import AppleSelect from './AppleSelect';
import { AvatarIcon } from './Avatars';
import {
  BellIcon,
  BellOffIcon,
  CheckIcon,
  CloudIcon,
  CloudUploadIcon,
  CloudDownloadIcon,
  DownloadIcon,
  UploadIcon,
  ImageIcon,
  CloseIcon,
  FileTextIcon,
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
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{
    fileName: string;
    parsed: ParsedBackupResult;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wp_last_backup_at');
      if (saved) setLastBackupAt(saved);
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const storageStats = useMemo(
    () =>
      measureCloudStorage({
        tasks: s.tasks,
        rules: s.rules,
        events: s.events,
        customTags: s.customTags,
        deletedTags: s.deletedTags,
        notifications: s.notifications,
        canvasNotes: s.canvasNotes,
        canvasConnections: s.canvasConnections,
        canvasBoards: s.canvasBoards,
        canvasStrokes: s.canvasStrokes,
        canvasSections: s.canvasSections,
        activeBoardId: s.activeBoardId,
      }),
    [
      s.tasks,
      s.rules,
      s.events,
      s.customTags,
      s.deletedTags,
      s.notifications,
      s.canvasNotes,
      s.canvasConnections,
      s.canvasBoards,
      s.canvasStrokes,
      s.canvasSections,
      s.activeBoardId,
    ]
  );

  const previewRestoreResult = useMemo(() => {
    if (!pendingRestore) return null;
    const candidate =
      restoreMode === 'merge'
        ? mergePlannerData(
            {
              tasks: s.tasks,
              rules: s.rules,
              events: s.events,
              customTags: s.customTags,
              deletedTags: s.deletedTags,
              notifications: s.notifications,
              canvasNotes: s.canvasNotes,
              canvasConnections: s.canvasConnections,
              canvasBoards: s.canvasBoards,
              canvasStrokes: s.canvasStrokes,
              canvasSections: s.canvasSections,
              activeBoardId: s.activeBoardId,
            },
            pendingRestore.parsed.data
          )
        : pendingRestore.parsed.data;
    return {
      data: candidate,
      stats: measureCloudStorage(candidate),
    };
  }, [
    pendingRestore,
    restoreMode,
    s.tasks,
    s.rules,
    s.events,
    s.customTags,
    s.deletedTags,
    s.notifications,
    s.canvasNotes,
    s.canvasConnections,
    s.canvasBoards,
    s.canvasStrokes,
    s.canvasSections,
    s.activeBoardId,
  ]);

  const handleBackupJson = () => {
    try {
      const res = downloadBackupJson(
        {
          tasks: s.tasks,
          rules: s.rules,
          events: s.events,
          customTags: s.customTags,
          deletedTags: s.deletedTags,
          notifications: s.notifications,
          canvasNotes: s.canvasNotes,
          canvasConnections: s.canvasConnections,
          canvasBoards: s.canvasBoards,
          canvasStrokes: s.canvasStrokes,
          canvasSections: s.canvasSections,
          activeBoardId: s.activeBoardId,
        },
        {
          teamName: currentTeam?.name || 'Personal Workspace',
          userName: currentUser?.name,
        }
      );
      const isoNow = new Date().toISOString();
      setLastBackupAt(isoNow);
      try {
        localStorage.setItem('wp_last_backup_at', isoNow);
      } catch {
        // Ignore storage write error
      }
      showAlert(
        'สำรองข้อมูลสำเร็จ',
        `ดาวน์โหลดไฟล์ ${res.filename} (${formatStorageBytes(res.bytes)}) เรียบร้อยแล้ว แนะนำเก็บสำรองไว้ในเครื่องหรือ Google Drive`
      );
    } catch (err) {
      showAlert('ข้อผิดพลาด', err instanceof Error ? err.message : 'ไม่สามารถสร้างไฟล์สำรองข้อมูลได้');
    }
  };

  const handleSelectBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_BACKUP_IMPORT_BYTES) {
      showAlert('ไฟล์ใหญ่เกินกำหนด', 'รองรับไฟล์ Backup JSON ขนาดไม่เกิน 5 MB เท่านั้น');
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseBackupJson(text);
      if (!parsed.ok) {
        showAlert('ไฟล์ไม่ถูกต้อง', parsed.error);
        return;
      }
      setRestoreMode('merge');
      setPendingRestore({ fileName: file.name, parsed });
    } catch {
      showAlert('ข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์ที่เลือกได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore || !previewRestoreResult || restoring) return;
    setRestoring(true);
    try {
      s.restore(previewRestoreResult.data);
      const ok = await syncPlannerToFirebase();
      setPendingRestore(null);
      if (ok) {
        showAlert(
          'กู้คืนข้อมูลสำเร็จ',
          `นำเข้าข้อมูลแบบ${restoreMode === 'merge' ? 'รวมกับข้อมูลเดิม' : 'แทนที่ทั้งหมด'} และซิงค์ขึ้น Firebase Cloud เรียบร้อยแล้ว`
        );
      } else {
        const errMsg = usePlanner.getState().cloudSyncError;
        showAlert(
          'กู้คืนในเครื่องแล้ว (ซิงค์ Cloud ไม่สำเร็จ)',
          errMsg || 'นำเข้าข้อมูลในเครื่องเรียบร้อยแล้ว แต่ไม่สามารถซิงค์ขึ้น Cloud ได้ กรุณาตรวจสอบขนาดข้อมูลและการเชื่อมต่อ'
        );
      }
    } finally {
      setRestoring(false);
    }
  };

  const handleClearDoneAttachments = () => {
    const count = storageStats.counts.doneTaskAttachments;
    const savedSize = formatStorageBytes(storageStats.counts.doneTaskAttachmentBytes);
    if (count === 0) return;
    showConfirm(
      'ล้างรูปแนบของงานที่เสร็จแล้ว',
      `ต้องการลบรูปแนบทั้งหมด ${count} รูป (ประหยัดพื้นที่ได้ประมาณ ${savedSize}) ออกจากงานที่ทำเสร็จแล้วใช่ไหม? ชื่องาน เช็กลิสต์ และสถิติ Dashboard จะยังอยู่ครบเหมือนเดิม`,
      async () => {
        const removed = s.clearDoneTaskAttachments();
        if (removed > 0) {
          await syncPlannerToFirebase();
          showAlert('เคลียร์พื้นที่สำเร็จ', `ลบรูปแนบออกแล้ว ${removed} รูป และซิงค์ขึ้น Cloud เรียบร้อย`);
        }
      }
    );
  };

  const handleClearAllNotifications = () => {
    const count = storageStats.counts.notifications;
    if (count === 0) return;
    showConfirm(
      'ล้างประวัติการแจ้งเตือน',
      `ต้องการลบประวัติการแจ้งเตือนทั้งหมด ${count} รายการเพื่อประหยัดพื้นที่ใช่ไหม?`,
      async () => {
        s.clearNotifications();
        await syncPlannerToFirebase();
        showAlert('เคลียร์พื้นที่สำเร็จ', 'ล้างประวัติการแจ้งเตือนเรียบร้อยแล้ว');
      }
    );
  };

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
    setSyncing(true);
    setSyncStatus('กำลังอัปโหลดข้อมูลทั้งหมด...');
    const ok = await syncPlannerToFirebase();
    setSyncing(false);
    if (ok) {
      setSyncStatus('อัปโหลดสำเร็จ ✅');
      showAlert('สำเร็จ', 'ข้อมูลทั้งหมด (งาน วันลา กระดาษไอเดีย และแจ้งเตือน) ถูกบันทึกขึ้น Firebase Cloud เรียบร้อยแล้ว');
    } else {
      const errMsg = usePlanner.getState().cloudSyncError || 'ไม่สามารถอัปโหลดข้อมูลได้ กรุณาตรวจสอบการตั้งค่า Firebase';
      setSyncStatus(`เกิดข้อผิดพลาด: ${errMsg}`);
      showAlert('ข้อผิดพลาด', errMsg);
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
              <AppleSelect
                variant="pill"
                align="right"
                ariaLabel="เตือนล่วงหน้า"
                value={String(s.remindBefore)}
                onChange={v => s.setRemindBefore(Number(v))}
                minMenuWidth={155}
                options={[0, 5, 10, 15, 30, 60].map(n => ({
                  value: String(n),
                  label: n ? `ก่อน ${n} นาที` : 'ตรงเวลา',
                  icon: <ClockIcon size={12} color="var(--pri)" />,
                }))}
              />
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
                <small style={{ color: 'var(--mut)', fontSize: 11 }}>เลือกโหมดสี ขาว-ม่วง (สว่าง) หรือ ดำ-ม่วง (มืด)</small>
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
                  ระดับ: {isUserTeamOwner(currentUser, currentTeam) ? 'หัวหน้าทีม (Owner)' : 'สมาชิก (Member)'}
                  {currentUser.role ? ` · ตำแหน่ง: ${currentUser.role}` : ''} · รหัส: {currentUser.id}
                </div>
              </div>
            </div>
          )}

          {/* Team Info */}
          <div
            style={{
              padding: '14px',
              borderRadius: 14,
              background: 'rgba(109, 40, 217, 0.05)',
              border: '1px solid rgba(109, 40, 217, 0.18)',
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
            {(() => {
              const activeProjectId = (() => {
                try {
                  return parseFirebaseConfig(s.firebaseConfig || DEFAULT_FIREBASE_CONFIG)?.projectId || 'Cloud Database';
                } catch {
                  return 'Cloud Database';
                }
              })();
              const isSyncErr = s.cloudSyncStatus === 'error';
              const isSyncingNow = s.cloudSyncStatus === 'syncing' || syncing;
              const pillColor = isSyncErr ? 'var(--red)' : isSyncingNow ? 'var(--warn)' : '#34c759';
              const pillBg = isSyncErr
                ? 'rgba(255, 59, 48, 0.12)'
                : isSyncingNow
                  ? 'rgba(255, 149, 0, 0.12)'
                  : 'rgba(52, 199, 89, 0.12)';
              return (
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
                      background: pillBg,
                      color: pillColor,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: pillColor,
                        boxShadow: `0 0 6px ${pillColor}`,
                      }}
                    />
                    {isSyncingNow
                      ? `กำลังซิงค์กับ ${activeProjectId}...`
                      : isSyncErr
                        ? `ซิงค์ ${activeProjectId} มีปัญหา`
                        : `เชื่อมต่อ ${activeProjectId} แล้ว (ซิงค์อัตโนมัติ)`}
                  </span>
                </div>
              );
            })()}
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
            <span>{syncing ? 'กำลังซิงค์...' : 'ซิงค์ทันที'}</span>
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
            <span>จัดการการเชื่อมต่อ</span>
          </button>
        </div>
      </div>

      {/* Cloud Storage Meter & Backup / Restore JSON Card (macOS Storage Style) */}
      <div className="card" style={{ padding: '20px 22px', borderRadius: 18 }}>
        {(() => {
          const statusColor =
            storageStats.status === 'danger'
              ? '#ff3b30'
              : storageStats.status === 'warn'
                ? '#ff9500'
                : '#34c759';
          const statusBg =
            storageStats.status === 'danger'
              ? 'rgba(255, 59, 48, 0.12)'
              : storageStats.status === 'warn'
                ? 'rgba(255, 149, 0, 0.14)'
                : 'rgba(52, 199, 89, 0.12)';
          const statusLabel =
            storageStats.status === 'danger'
              ? 'ใกล้เต็มเพดาน'
              : storageStats.status === 'warn'
                ? 'เริ่มใช้พื้นที่เยอะ'
                : 'พื้นที่ปกติ';

          const barDenom = Math.max(storageStats.limitBytes, storageStats.totalBytes);
          const segPct = (bytes: number) => {
            if (bytes <= 0) return 0;
            return Math.max(0.8, Math.min(100, (bytes / barDenom) * 100));
          };

          const segments = [
            {
              key: 'tasks',
              label: 'งาน & เช็กลิสต์',
              color: '#7c3aed',
              bytes: storageStats.breakdown.tasksBytes,
              sub: `${storageStats.counts.tasks} งาน`,
            },
            {
              key: 'attachments',
              label: 'รูปแนบในงาน',
              color: '#ff9500',
              bytes: storageStats.breakdown.attachmentsBytes,
              sub: `${storageStats.counts.attachments} รูป`,
            },
            {
              key: 'canvas',
              label: 'กระดานไอเดีย',
              color: '#af52de',
              bytes: storageStats.breakdown.canvasBytes,
              sub: `${storageStats.counts.boards} บอร์ด`,
            },
            {
              key: 'other',
              label: 'วันลา & แจ้งเตือน',
              color: '#34c759',
              bytes: storageStats.breakdown.otherBytes,
              sub: `${storageStats.counts.events} วัน · ${storageStats.counts.notifications} เตือน`,
            },
          ];

          return (
            <>
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="macos-traffic-lights" aria-hidden="true">
                    <span className="macos-traffic-dot red" />
                    <span className="macos-traffic-dot yellow" />
                    <span className="macos-traffic-dot green" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>
                        พื้นที่จัดเก็บ Cloud & สำรองข้อมูล
                      </h3>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '2px 9px',
                          borderRadius: 999,
                          background: statusBg,
                          color: statusColor,
                          fontSize: 11.5,
                          fontWeight: 700,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: statusColor,
                          }}
                        />
                        {statusLabel}
                      </span>
                    </div>
                    <small style={{ color: 'var(--mut)', fontSize: 12 }}>
                      คำนวณขนาดข้อมูลจริงก่อนซิงค์เทียบเพดาน 980 KB ของ Firestore (ไม่เสียโควตา Read/Write)
                    </small>
                  </div>
                </div>

                {/* Usage Numeric Summary */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--txt)', letterSpacing: '-0.02em' }}>
                    {formatStorageBytes(storageStats.totalBytes)}{' '}
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mut)' }}>
                      / {Math.round(CLOUD_DOC_LIMIT_BYTES / 1000)} KB
                    </span>
                  </div>
                  <small style={{ color: statusColor, fontSize: 11.5, fontWeight: 700 }}>
                    ใช้งานไป {storageStats.percent.toFixed(1)}%
                  </small>
                </div>
              </div>

              {/* Multi-Segment macOS Storage Bar */}
              <div
                className="storage-bar-track"
                role="progressbar"
                aria-valuenow={storageStats.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="พื้นที่ใช้งาน Cloud Storage"
              >
                {segments.map(seg =>
                  seg.bytes > 0 ? (
                    <div
                      key={seg.key}
                      className="storage-bar-seg"
                      style={{
                        width: `${segPct(seg.bytes)}%`,
                        background: seg.color,
                      }}
                      title={`${seg.label}: ${formatStorageBytes(seg.bytes)}`}
                    />
                  ) : null
                )}
              </div>

              {/* Breakdown Legend */}
              <div className="storage-legend-grid">
                {segments.map(seg => (
                  <div key={seg.key} className="storage-legend-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: seg.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: 'var(--mut)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {seg.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--txt)' }}>
                      {formatStorageBytes(seg.bytes)}
                    </div>
                    <small style={{ fontSize: 11, color: 'var(--mut)' }}>{seg.sub}</small>
                  </div>
                ))}
              </div>

              {/* Warning Banner when >= 70% */}
              {storageStats.status !== 'ok' && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: statusBg,
                    border: `1px solid ${statusColor}40`,
                    color: statusColor,
                    fontSize: 12.5,
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  {storageStats.status === 'danger'
                    ? 'พื้นที่ใกล้เต็มเพดาน 980 KB แล้ว! หากเกินกำหนดจะไม่สามารถซิงค์ขึ้น Firebase ได้ แนะนำให้กด Backup JSON เก็บไว้ แล้วล้างรูปแนบของงานที่เสร็จแล้วครับ'
                    : 'เริ่มใช้พื้นที่เกิน 70% แล้ว แนะนำสำรองไฟล์ JSON เก็บไว้ และล้างรูปแนบเก่าเพื่อลดขนาดไฟล์ครับ'}
                </div>
              )}

              {/* Backup/Restore & Quick Cleanup Panels */}
              <div className="storage-actions-grid">
                {/* Panel 1: Backup & Restore JSON */}
                <div className="storage-action-panel">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: 'var(--txt)' }}>
                      <FileTextIcon size={15} color="var(--pri)" />
                      <span>สำรองและกู้คืนข้อมูล (JSON)</span>
                    </div>
                    <small style={{ display: 'block', color: 'var(--mut)', fontSize: 11.5, marginTop: 3, lineHeight: 1.45 }}>
                      ดาวน์โหลดข้อมูลทั้งหมดเก็บลงเครื่องหรือ Google Drive และนำกลับเข้ามาได้ทุกเมื่อ (ซิงค์ขึ้น Cloud ให้อัตโนมัติ)
                    </small>
                    {lastBackupAt && (
                      <div style={{ fontSize: 11, color: '#34c759', fontWeight: 600, marginTop: 6 }}>
                        สำรองล่าสุด:{' '}
                        {new Date(lastBackupAt).toLocaleString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={handleBackupJson}
                      style={{ borderRadius: 999 }}
                    >
                      <DownloadIcon size={14} />
                      <span>สำรองข้อมูล (Backup JSON)</span>
                    </button>

                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ borderRadius: 999 }}
                    >
                      <UploadIcon size={14} />
                      <span>กู้คืนข้อมูล (Restore JSON)</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleSelectBackupFile}
                      style={{ display: 'none' }}
                      aria-label="เลือกไฟล์สำรองข้อมูล JSON"
                    />
                  </div>
                </div>

                {/* Panel 2: Safe Storage Cleanup */}
                <div className="storage-action-panel">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: 'var(--txt)' }}>
                      <ImageIcon size={15} color="#ff9500" />
                      <span>เคลียร์พื้นที่อย่างปลอดภัย</span>
                    </div>
                    <small style={{ display: 'block', color: 'var(--mut)', fontSize: 11.5, marginTop: 3, lineHeight: 1.45 }}>
                      ลบเฉพาะไฟล์รูปแนบในงานที่ทำเสร็จแล้วหรือแจ้งเตือนเก่า โดยยังคงชื่องาน เช็กลิสต์ และสถิติ Dashboard ไว้ครบ 100%
                    </small>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={storageStats.counts.doneTaskAttachments > 0 ? 'btn soft-red sm' : 'btn ghost sm'}
                      onClick={handleClearDoneAttachments}
                      disabled={storageStats.counts.doneTaskAttachments === 0}
                      style={{ borderRadius: 999 }}
                    >
                      <TrashIcon size={13} />
                      <span>
                        {storageStats.counts.doneTaskAttachments > 0
                          ? `ล้างรูปงานที่เสร็จ (${storageStats.counts.doneTaskAttachments} รูป · ${formatStorageBytes(storageStats.counts.doneTaskAttachmentBytes)})`
                          : 'ไม่มีรูปค้างในงานที่เสร็จ'}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={handleClearAllNotifications}
                      disabled={storageStats.counts.notifications === 0}
                      style={{ borderRadius: 999 }}
                    >
                      <BellOffIcon size={13} />
                      <span>
                        {storageStats.counts.notifications > 0
                          ? `ล้างแจ้งเตือน (${storageStats.counts.notifications})`
                          : 'ไม่มีแจ้งเตือนค้าง'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Restore Backup Preview Modal */}
      {pendingRestore && previewRestoreResult && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!restoring) setPendingRestore(null);
          }}
        >
          <div
            className="modal-box"
            style={{ maxWidth: 520, width: '92%' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'var(--pri-l)',
                    color: 'var(--pri)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <UploadIcon size={17} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>ตรวจสอบข้อมูลก่อนกู้คืน</h3>
                  <small
                    style={{
                      color: 'var(--mut)',
                      fontSize: 11.5,
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ไฟล์: {pendingRestore.fileName}
                    {pendingRestore.parsed.exportedAt
                      ? ` · สำรองเมื่อ ${new Date(pendingRestore.parsed.exportedAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                      : ''}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => !restoring && setPendingRestore(null)}
                aria-label="ปิดหน้าต่าง"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Backup File Summary */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: 8,
                  textAlign: 'center',
                }}
              >
                <div className="storage-legend-item" style={{ alignItems: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--txt)' }}>
                    {pendingRestore.parsed.summary.tasks}
                  </div>
                  <small style={{ fontSize: 11, color: 'var(--mut)' }}>งานทั้งหมด</small>
                </div>
                <div className="storage-legend-item" style={{ alignItems: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--pri)' }}>
                    {pendingRestore.parsed.summary.events}
                  </div>
                  <small style={{ fontSize: 11, color: 'var(--mut)' }}>วันหยุด/ลา</small>
                </div>
                <div className="storage-legend-item" style={{ alignItems: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#af52de' }}>
                    {pendingRestore.parsed.summary.boards}
                  </div>
                  <small style={{ fontSize: 11, color: 'var(--mut)' }}>กระดานไอเดีย</small>
                </div>
                <div className="storage-legend-item" style={{ alignItems: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#ff9500' }}>
                    {pendingRestore.parsed.summary.attachments}
                  </div>
                  <small style={{ fontSize: 11, color: 'var(--mut)' }}>รูปแนบ</small>
                </div>
              </div>

              {/* Restore Mode Selector */}
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>
                  เลือกรูปแบบการนำเข้า
                </div>
                <div className="backup-mode-grid">
                  <button
                    type="button"
                    className={`backup-mode-card ${restoreMode === 'merge' ? 'active' : ''}`}
                    onClick={() => setRestoreMode('merge')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>
                        รวมกับข้อมูลเดิม
                      </span>
                      <span className="count-pill info">แนะนำ</span>
                    </div>
                    <small style={{ fontSize: 11.5, color: 'var(--mut)', lineHeight: 1.4 }}>
                      เพิ่มเฉพาะงานและรายการที่ยังไม่มีในระบบ ไม่ลบของเดิมที่มีอยู่
                    </small>
                  </button>

                  <button
                    type="button"
                    className={`backup-mode-card ${restoreMode === 'replace' ? 'active' : ''}`}
                    onClick={() => setRestoreMode('replace')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>
                        แทนที่ทั้งหมด
                      </span>
                      <span className="count-pill warn">เขียนทับ</span>
                    </div>
                    <small style={{ fontSize: 11.5, color: 'var(--mut)', lineHeight: 1.4 }}>
                      ล้างข้อมูลปัจจุบันทั้งหมด แล้วใช้ข้อมูลตามไฟล์ Backup นี้
                    </small>
                  </button>
                </div>
              </div>

              {/* Resulting Cloud Size Preview */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  background:
                    previewRestoreResult.stats.totalBytes > CLOUD_DOC_LIMIT_BYTES
                      ? 'rgba(255, 59, 48, 0.12)'
                      : 'rgba(109, 40, 217, 0.07)',
                  border:
                    previewRestoreResult.stats.totalBytes > CLOUD_DOC_LIMIT_BYTES
                      ? '1px solid rgba(255, 59, 48, 0.35)'
                      : '1px solid rgba(109, 40, 217, 0.2)',
                  fontSize: 12.5,
                  color:
                    previewRestoreResult.stats.totalBytes > CLOUD_DOC_LIMIT_BYTES
                      ? '#ff3b30'
                      : 'var(--txt)',
                  lineHeight: 1.45,
                }}
              >
                ขนาดรวมหลังกู้คืน: <b>{formatStorageBytes(previewRestoreResult.stats.totalBytes)}</b> / 980 KB ({previewRestoreResult.stats.percent.toFixed(1)}%)
                {previewRestoreResult.stats.totalBytes > CLOUD_DOC_LIMIT_BYTES && (
                  <div style={{ marginTop: 4, fontWeight: 600 }}>
                    ขนาดเกินเพดาน 980 KB ของ Firestore — ข้อมูลจะกู้คืนในเครื่องได้ แต่ต้องล้างรูปแนบก่อนจึงจะซิงค์ขึ้น Cloud ได้
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setPendingRestore(null)}
                disabled={restoring}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className={restoreMode === 'replace' ? 'btn red' : 'btn primary'}
                onClick={handleConfirmRestore}
                disabled={restoring}
              >
                <CheckIcon size={14} />
                <span>
                  {restoring
                    ? 'กำลังกู้คืนและซิงค์...'
                    : restoreMode === 'replace'
                      ? 'ยืนยันแทนที่ข้อมูลทั้งหมด'
                      : 'ยืนยันรวมข้อมูลและซิงค์ Cloud'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <FirebaseConfigModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />
    </div>
  );
}
