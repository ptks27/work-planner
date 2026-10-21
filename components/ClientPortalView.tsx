'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { Task, TaskAttachment } from '@/lib/types';
import { thDate } from '@/lib/utils';
import {
  CheckIcon,
  ClockIcon,
  CalendarIcon,
  LockIcon,
  CloseIcon,
  SparklesIcon,
  ImageIcon,
} from './Icons';
import ImageLightboxModal from './ImageLightboxModal';

interface ClientPortalViewProps {
  onClose?: () => void;
  isStandalone?: boolean;
}

export default function ClientPortalView({
  onClose,
  isStandalone = false,
}: ClientPortalViewProps) {
  const { tasks, clientPortal } = usePlanner();
  const { currentTeam } = useAuth();

  const settings = clientPortal || {
    enabled: true,
    shareKey: 'default',
    title: currentTeam ? `โครงการ ${currentTeam.name}` : 'ความคืบหน้าโครงการและแผนงาน',
    clientName: 'ลูกค้าคนสำคัญ / ผู้บริหาร',
    welcomeMessage: 'ยินดีต้อนรับสู่แดชบอร์ดติดตามความคืบหน้าโครงการแบบเรียลไทม์',
    password: '',
    hideInternalComments: true,
    showOnlyDone: false,
    updatedAt: Date.now(),
  };

  const hasPassword = Boolean(settings.password && settings.password.trim());
  const [unlocked, setUnlocked] = useState(!hasPassword);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Lightbox for attachments preview
  const [lightboxAttachment, setLightboxAttachment] = useState<TaskAttachment | null>(null);

  // Filter tasks for client view
  const visibleTasks = tasks.filter(t => {
    if (t.hidden) return false;
    if (settings.showOnlyDone) return t.done || t.status === 'done';
    return true;
  });

  // Calculate metrics
  const totalTasks = visibleTasks.length;
  const doneTasks = visibleTasks.filter(t => t.done || t.status === 'done').length;
  const inProgressTasks = visibleTasks.filter(t => !t.done && t.status === 'in_progress').length;
  const pendingTasks = visibleTasks.filter(t => !t.done && (!t.status || t.status === 'todo')).length;
  const completionPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Find latest target delivery date
  const targetDate = visibleTasks.reduce((max, t) => {
    const d = t.endDate || t.date || '';
    return d > max ? d : max;
  }, '');

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === settings.password?.trim()) {
      setUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // If password protected and locked: show Apple Glass Lock Screen
  if (!unlocked) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at top, #1e293b, #0f172a)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          color: '#ffffff',
        }}
      >
        <div
          style={{
            maxWidth: 380,
            width: '100%',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            borderRadius: 24,
            padding: '36px 28px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
            }}
          >
            <LockIcon size={24} color="#38bdf8" />
          </div>

          <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700 }}>
            {settings.title}
          </h2>
          <p style={{ margin: '0 0 22px', fontSize: 13, color: 'rgba(255, 255, 255, 0.65)' }}>
            โครงการนี้มีรหัสผ่านความปลอดภัย โปรดกรอกรหัส PIN เพื่อเข้าชม
          </p>

          <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password"
              placeholder="รหัสผ่านเข้าชม (Client PIN)"
              value={pinInput}
              onChange={e => {
                setPinInput(e.target.value);
                if (pinError) setPinError(false);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: pinError ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 15,
                textAlign: 'center',
                letterSpacing: '0.15em',
                margin: 0,
              }}
              autoFocus
            />

            {pinError && (
              <span style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>
                รหัสผ่านไม่ถูกต้อง โปรดลองอีกครั้ง
              </span>
            )}

            <button
              type="submit"
              className="btn primary"
              style={{
                borderRadius: 12,
                padding: '12px',
                fontSize: 14,
                fontWeight: 700,
                marginTop: 6,
              }}
            >
              ปลดล็อกเพื่อเข้าชม
            </button>

            {onClose && (
              <button
                type="button"
                className="btn ghost sm"
                onClick={onClose}
                style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: 4 }}
              >
                ย้อนกลับ
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        background: 'var(--bg)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Client Navbar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--card-solid)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--line)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: Traffic Lights & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="macos-traffic-lights" aria-hidden="true">
            <span className="macos-traffic-dot red" />
            <span className="macos-traffic-dot yellow" />
            <span className="macos-traffic-dot green" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{settings.title}</h1>
              {settings.clientName && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(0, 113, 227, 0.1)',
                    color: 'var(--pri)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  👤 {settings.clientName}
                </span>
              )}
            </div>
            <small style={{ color: 'var(--mut)', fontSize: 11 }}>
              {settings.welcomeMessage || 'พอร์ทัลติดตามความคืบหน้าโครงการสำหรับลูกค้า'}
            </small>
          </div>
        </div>

        {/* Right: Live Sync Pill & Exit Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(52, 199, 89, 0.12)',
              color: '#34c759',
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34c759' }} />
            <span>อัปเดตเรียลไทม์</span>
          </span>

          {onClose && (
            <button
              type="button"
              className="btn sm"
              onClick={onClose}
              style={{
                borderRadius: 999,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <CloseIcon size={14} />
              <span>ปิดพรีวิว</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1000, width: '100%', margin: '0 auto', padding: '24px 20px', flex: 1 }}>
        {/* Executive Hero Banner & Progress Ring */}
        <div
          className="card"
          style={{
            padding: '28px',
            marginBottom: 24,
            background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.05), rgba(175, 82, 222, 0.05))',
            borderRadius: 20,
            border: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <SparklesIcon size={18} color="var(--pri)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pri)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ภาพรวมสถานะโครงการ
              </span>
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>
              ความคืบหน้ารวม {completionPct}%
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--mut)' }}>
              <span>
                ✅ ส่งมอบแล้ว: <b style={{ color: 'var(--txt)' }}>{doneTasks} ชิ้น</b>
              </span>
              <span>
                🔵 กำลังดำเนินการ: <b style={{ color: 'var(--txt)' }}>{inProgressTasks} ชิ้น</b>
              </span>
              <span>
                ⚪ รอเริ่ม: <b style={{ color: 'var(--txt)' }}>{pendingTasks} ชิ้น</b>
              </span>
              {targetDate && (
                <span>
                  📅 ส่งมอบขั้นสุดท้าย: <b style={{ color: 'var(--pri)' }}>{thDate(targetDate)}</b>
                </span>
              )}
            </div>
          </div>

          {/* Progress Ring Visual */}
          <div style={{ position: 'relative', width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="55"
                cy="55"
                r="46"
                fill="transparent"
                stroke="rgba(120, 120, 128, 0.15)"
                strokeWidth="10"
              />
              <circle
                cx="55"
                cy="55"
                r="46"
                fill="transparent"
                stroke="url(#clientGrad)"
                strokeWidth="10"
                strokeDasharray="289.02"
                strokeDashoffset={289.02 - (289.02 * completionPct) / 100}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
              <defs>
                <linearGradient id="clientGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0071e3" />
                  <stop offset="100%" stopColor="#34c759" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{completionPct}%</span>
            </div>
          </div>
        </div>

        {/* Deliverables Section Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
            รายการงานส่งมอบ & แผนการดำเนินงาน (Deliverables)
          </h3>
          <span style={{ fontSize: 12, color: 'var(--mut)' }}>
            พบทั้งหมด {visibleTasks.length} ชิ้นงาน
          </span>
        </div>

        {/* Deliverables List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleTasks.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--mut)' }}>
              ยังไม่มีรายการงานที่เปิดเผยในขณะนี้
            </div>
          ) : (
            visibleTasks.map(task => {
              const isDone = task.done || task.status === 'done';
              const isInProgress = !isDone && task.status === 'in_progress';

              return (
                <div
                  key={task.id}
                  className="card"
                  style={{
                    padding: '16px 20px',
                    borderRadius: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    borderLeft: `4px solid ${isDone ? '#34c759' : isInProgress ? '#0071e3' : '#cbd5e1'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <h4
                        style={{
                          margin: '0 0 4px',
                          fontSize: 15,
                          fontWeight: 700,
                          color: 'var(--txt)',
                          textDecoration: isDone ? 'line-through' : 'none',
                          opacity: isDone ? 0.8 : 1,
                        }}
                      >
                        {task.title}
                      </h4>
                      {task.detail && (
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--mut)', lineHeight: 1.4 }}>
                          {task.detail}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        flexShrink: 0,
                        background: isDone
                          ? 'rgba(52, 199, 89, 0.12)'
                          : isInProgress
                          ? 'rgba(0, 113, 227, 0.12)'
                          : 'rgba(120, 120, 128, 0.08)',
                        color: isDone ? '#34c759' : isInProgress ? 'var(--pri)' : 'var(--mut)',
                      }}
                    >
                      {isDone ? '✅ เสร็จสมบูรณ์' : isInProgress ? '🔵 กำลังดำเนินการ' : '⚪ รอส่งมอบ'}
                    </span>
                  </div>

                  {/* Attached images preview (if any) */}
                  {task.attachments && task.attachments.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, overflowX: 'auto', paddingBottom: 2 }}>
                      {task.attachments.map(att => (
                        <div
                          key={att.id}
                          onClick={() => setLightboxAttachment(att)}
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: '1px solid var(--line)',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                          title={`คลิกเพื่อดูรูปภาพ: ${att.name}`}
                        >
                          <img
                            src={att.url}
                            alt={att.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Metadata Row: Date / Range */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11.5, color: 'var(--mut)', marginTop: 2 }}>
                    {(task.date || task.endDate) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CalendarIcon size={12} color="var(--pri)" />
                        <span>
                          {task.endDate && task.endDate !== task.date
                            ? `${thDate(task.date)} – ${thDate(task.endDate)}`
                            : thDate(task.date)}
                        </span>
                      </span>
                    )}

                    {isDone && task.doneAt && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#34c759', fontWeight: 600 }}>
                        <CheckIcon size={11} strokeWidth={3} />
                        <span>อนุมัติส่งมอบแล้วเมื่อ {new Date(task.doneAt).toLocaleDateString('th-TH')}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '20px 24px',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--mut)',
          borderTop: '1px solid var(--line)',
        }}
      >
        <span>🔒 ข้อมูลนี้เป็นความลับเฉพาะโครงการ • ขับเคลื่อนด้วย Work Planner Enterprise</span>
      </footer>

      {/* Lightbox for Deliverables */}
      {lightboxAttachment && (
        <ImageLightboxModal
          isOpen={true}
          attachment={lightboxAttachment}
          onClose={() => setLightboxAttachment(null)}
        />
      )}
    </div>
  );
}
