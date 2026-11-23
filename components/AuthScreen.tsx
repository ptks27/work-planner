'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/authStore';
import { usePlanner } from '@/lib/store';
import { parseFirebaseConfig } from '@/lib/firebase';
import { DEFAULT_FIREBASE_CONFIG } from '@/lib/firebaseDefaultConfig';
import type { AvatarId } from '@/lib/types';
import { AvatarIcon, AVATAR_LIST } from './Avatars';
import {
  BoltIcon,
  SparklesIcon,
  CheckIcon,
  MailIcon,
  LockIcon,
  UserIcon,
  EyeIcon,
  EyeOffIcon,
  SunIcon,
  MoonIcon,
  CalendarIcon,
  ChartBarIcon,
  StickyNoteIcon,
  RefreshCwIcon,
  ArrowRightIcon,
} from './Icons';
import FirebaseConfigModal from './FirebaseConfigModal';
import { Tilt3DCard } from './AppleMotion';

interface PreviewTask {
  id: string;
  title: string;
  tag: string;
  color: string;
  done: boolean;
}

const INITIAL_PREVIEW_TASKS: PreviewTask[] = [
  { id: 'p1', title: 'สรุปแผนงานประจำสัปดาห์', tag: 'วางแผน', color: '#0071e3', done: true },
  { id: 'p2', title: 'อัปเดตหน้า Dashboard & KPI', tag: 'Design', color: '#af52de', done: true },
  { id: 'p3', title: 'ตรวจเช็กเดดไลน์งานสำคัญวันนี้', tag: 'ด่วน', color: '#ff9500', done: false },
];

function evaluatePasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 9) score += 1;
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pw) || (/[A-Z]/.test(pw) && /[0-9]/.test(pw))) score += 1;

  if (score <= 1) return { score: 1, label: 'รหัสผ่านอ่อน', color: '#ff3b30' };
  if (score === 2) return { score: 2, label: 'พอใช้ได้', color: '#ff9500' };
  if (score === 3) return { score: 3, label: 'ปลอดภัยดี', color: '#0071e3' };
  return { score: 4, label: 'แข็งแรงมาก', color: '#34c759' };
}

export default function AuthScreen({ onLoggedIn }: { onLoggedIn?: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(AVATAR_LIST[0].id);
  const [error, setError] = useState('');
  const [shakeCard, setShakeCard] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [previewTasks, setPreviewTasks] = useState<PreviewTask[]>(INITIAL_PREVIEW_TASKS);

  const { login, register } = useAuth();
  const firebaseConfig = usePlanner(s => s.firebaseConfig);
  const theme = usePlanner(s => s.theme);
  const setTheme = usePlanner(s => s.setTheme);

  const activeProjectId = useMemo(() => {
    try {
      const parsed = parseFirebaseConfig(firebaseConfig || DEFAULT_FIREBASE_CONFIG);
      if (parsed?.projectId) return parsed.projectId;
    } catch {
      // fallback
    }
    return 'Cloud Sync';
  }, [firebaseConfig]);

  const pwStrength = useMemo(() => evaluatePasswordStrength(password), [password]);

  const previewDone = previewTasks.filter(t => t.done).length;
  const previewPct = Math.round((previewDone / previewTasks.length) * 100);

  const triggerError = (msg: string) => {
    setError(msg);
    setShakeCard(true);
    setTimeout(() => setShakeCard(false), 420);
  };

  const handleRandomAvatar = () => {
    const others = AVATAR_LIST.filter(a => a.id !== selectedAvatar);
    const pick = others[Math.floor(Math.random() * others.length)] || AVATAR_LIST[0];
    setSelectedAvatar(pick.id);
  };

  const handleTogglePreviewTask = (id: string) => {
    setPreviewTasks(prev => prev.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSuccessMsg('');

    if (isRegister) {
      if (!name.trim()) return triggerError('กรุณากรอกชื่อของคุณ');
      if (!email.trim()) return triggerError('กรุณากรอกอีเมล');
      if (!password || password.length < 6) {
        return triggerError('กรุณาตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษรเพื่อความปลอดภัย');
      }
      setSubmitting(true);
      const res = await register(name, email, password, selectedAvatar);
      setSubmitting(false);
      if (!res.success) {
        return triggerError(res.error || 'เกิดข้อผิดพลาดในการสมัคร');
      }
      setSuccessMsg('สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...');
      onLoggedIn?.();
    } else {
      if (!email.trim()) return triggerError('กรุณากรอกอีเมล');
      if (!password) return triggerError('กรุณากรอกรหัสผ่าน');
      setSubmitting(true);
      const res = await login(email, password);
      setSubmitting(false);
      if (!res.success) {
        return triggerError(res.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
      onLoggedIn?.();
    }
  };

  const switchMode = (nextRegister: boolean) => {
    setIsRegister(nextRegister);
    setError('');
    setSuccessMsg('');
  };

  const selectedAvatarMeta = AVATAR_LIST.find(a => a.id === selectedAvatar) || AVATAR_LIST[0];

  return (
    <div className="auth-stage">
      {/* Ambient Animated Aurora & Frosted Dot Grid */}
      <div className="auth-ambient-bg" aria-hidden="true">
        <span className="auth-ambient-orb orb-1" />
        <span className="auth-ambient-orb orb-2" />
        <span className="auth-ambient-orb orb-3" />
      </div>
      <div className="auth-stage-grid-overlay" aria-hidden="true" />

      {/* Top Floating Bar: Cloud Status + Theme Switcher */}
      <div className="auth-floating-topbar">
        <button
          type="button"
          className="auth-top-pill"
          onClick={() => setIsConfigOpen(true)}
          title="คลิกเพื่อดูหรือปรับแต่งการเชื่อมต่อ Firebase Cloud"
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#34c759',
              boxShadow: '0 0 8px #34c759',
            }}
          />
          <span style={{ color: '#34c759' }}>Cloud ซิงค์อัตโนมัติ</span>
          <span
            className="auth-cloud-proj"
            style={{ color: 'var(--mut)', fontFamily: 'SF Mono, Menlo, monospace', fontSize: 11 }}
          >
            ({activeProjectId})
          </span>
          <span style={{ color: 'var(--pri)' }}>ตั้งค่า &rsaquo;</span>
        </button>

        <button
          type="button"
          className="auth-top-pill"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
          title={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
        >
          {theme === 'dark' ? <SunIcon size={14} color="#ff9500" /> : <MoonIcon size={14} color="var(--pri)" />}
          <span>{theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
        </button>
      </div>

      {/* Main Split Stage */}
      <div className="auth-split-shell">
        {/* LEFT COLUMN: Interactive 3D Hero Showcase (Desktop) */}
        <div className="auth-showcase">
          <div className="auth-brand-row">
            <div className="auth-brand-badge">
              <BoltIcon size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--txt)' }}>
                Work Planner
              </div>
              <div style={{ fontSize: 12, color: 'var(--mut)', fontWeight: 500 }}>
                Apple-style Workspace · Real-time Sync
              </div>
            </div>
          </div>

          <h1 className="auth-hero-title">
            {isRegister ? (
              <>
                เริ่มต้นพื้นที่ทำงานของคุณ{' '}
                <span className="auth-hero-gradient">พร้อมอวาตาร์ส่วนตัว</span>
              </>
            ) : (
              <>
                จัดการทุกงานให้ชัดเจน{' '}
                <span className="auth-hero-gradient">ลื่นไหลในที่เดียว</span>
              </>
            )}
          </h1>

          <p className="auth-hero-sub">
            {isRegister
              ? 'เลือกคาแร็กเตอร์ที่ใช่ กรอกข้อมูลเพียงไม่กี่วินาที ก็เริ่มวางแผนงาน ปฏิทิน วันลา และซิงค์ข้ามมือถือกับคอมได้ทันที'
              : 'รวมปฏิทินงาน ไทม์ไลน์ กระดานไอเดีย Flow วันหยุด/วันลา และ Dashboard วิเคราะห์ผลงานไว้ในหน้าเดียวที่ออกแบบอย่างพิถีพิถัน'}
          </p>

          {/* Interactive 3D Floating Preview Widget */}
          <Tilt3DCard maxTilt={8} glare holographic className="auth-preview-card">
            {isRegister ? (
              /* Live 3D Profile Card Preview while Registering */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="macos-traffic-lights" aria-hidden="true">
                    <span className="macos-traffic-dot red" />
                    <span className="macos-traffic-dot yellow" />
                    <span className="macos-traffic-dot green" />
                  </div>
                  <span className="count-pill info" style={{ fontSize: 10.5 }}>
                    ตัวอย่างโปรไฟล์ของคุณ
                  </span>
                </div>

                <div
                  className="tilt3d-pop"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '14px 16px',
                    borderRadius: 16,
                    background: 'rgba(0, 113, 227, 0.06)',
                    border: '1px solid rgba(0, 113, 227, 0.16)',
                  }}
                >
                  <div
                    style={{
                      padding: 4,
                      borderRadius: '50%',
                      background: 'var(--card-solid)',
                      boxShadow: '0 8px 20px rgba(0, 113, 227, 0.22)',
                      flexShrink: 0,
                    }}
                  >
                    <AvatarIcon id={selectedAvatar} size={62} animated />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: 'var(--txt)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {name.trim() || 'ชื่อของคุณจะแสดงตรงนี้'}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: 'var(--mut)',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {email.trim() || 'name@company.com'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <span className="count-pill ok" style={{ fontSize: 10 }}>
                        พร้อมซิงค์ Cloud
                      </span>
                      <span className="count-pill" style={{ fontSize: 10 }}>
                        {selectedAvatarMeta.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Interactive Mini Today Planner Preview on Login */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="macos-traffic-lights" aria-hidden="true">
                      <span className="macos-traffic-dot red" />
                      <span className="macos-traffic-dot yellow" />
                      <span className="macos-traffic-dot green" />
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--txt)' }}>
                      งานวันนี้ (ลองคลิกติ๊กเล่นได้)
                    </span>
                  </div>
                  <span
                    className={`count-pill ${previewPct === 100 ? 'ok' : 'info'}`}
                    style={{ fontSize: 11 }}
                  >
                    สำเร็จ {previewPct}%
                  </span>
                </div>

                {/* Live Mini Progress Bar */}
                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: 'rgba(120, 120, 128, 0.14)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${previewPct}%`,
                      borderRadius: 999,
                      background:
                        previewPct === 100
                          ? 'linear-gradient(90deg, #34c759, #30d158)'
                          : 'linear-gradient(90deg, #0071e3, #5856d6)',
                      transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {previewTasks.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={`auth-preview-task ${item.done ? 'done' : ''}`}
                      onClick={() => handleTogglePreviewTask(item.id)}
                    >
                      <span
                        className={`check ${item.done ? 'on' : ''}`}
                        style={{ marginTop: 0, width: 20, height: 20, pointerEvents: 'none' }}
                      >
                        {item.done && <CheckIcon size={11} strokeWidth={3} />}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: item.done ? 'var(--mut)' : 'var(--txt)',
                          textDecoration: item.done ? 'line-through' : 'none',
                        }}
                      >
                        {item.title}
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: `${item.color}18`,
                          color: item.color,
                        }}
                      >
                        {item.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Tilt3DCard>

          {/* 3 Feature Highlight Pills */}
          <div className="auth-feature-grid">
            <div className="auth-feature-pill">
              <span className="auth-feature-icon" style={{ background: 'rgba(0, 113, 227, 0.12)', color: 'var(--pri)' }}>
                <CalendarIcon size={15} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>ปฏิทิน & Kanban</div>
                <small style={{ fontSize: 10.5, color: 'var(--mut)' }}>จัดคิวงานรายวัน</small>
              </div>
            </div>

            <div className="auth-feature-pill">
              <span className="auth-feature-icon" style={{ background: 'rgba(175, 82, 222, 0.12)', color: '#af52de' }}>
                <StickyNoteIcon size={15} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>กระดาน Flow</div>
                <small style={{ fontSize: 10.5, color: 'var(--mut)' }}>แตกไอเดียเป็นงาน</small>
              </div>
            </div>

            <div className="auth-feature-pill">
              <span className="auth-feature-icon" style={{ background: 'rgba(52, 199, 89, 0.14)', color: '#34c759' }}>
                <ChartBarIcon size={15} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>Dashboard KPI</div>
                <small style={{ fontSize: 10.5, color: 'var(--mut)' }}>สรุปผล & PDF/Excel</small>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Frosted Glass Login / Register Card */}
        <Tilt3DCard maxTilt={3} glare className={`auth-panel ${shakeCard ? 'shake' : ''}`}>
          {/* Mobile / Card Header */}
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div
              className="auth-brand-badge"
              style={{ margin: '0 auto 12px', width: 48, height: 48, borderRadius: 15 }}
            >
              <BoltIcon size={24} color="#ffffff" />
            </div>
            <h2 style={{ margin: '0 0 4px', fontSize: 21, fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--txt)' }}>
              {isRegister ? 'สร้างบัญชีใหม่' : 'ยินดีต้อนรับกลับมา'}
            </h2>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--mut)' }}>
              {isRegister
                ? 'เลือก Avatar และตั้งค่าบัญชีของคุณเพื่อเริ่มใช้งาน'
                : 'ลงชื่อเข้าใช้เพื่อซิงค์แผนงานของคุณแบบเรียลไทม์'}
            </p>
          </div>

          {/* Sliding Segmented Tabs */}
          <div className="auth-seg-tabs" role="tablist" aria-label="โหมดการเข้าใช้งาน">
            <span className={`auth-seg-slider ${isRegister ? 'is-register' : ''}`} aria-hidden="true" />
            <button
              type="button"
              role="tab"
              aria-selected={!isRegister}
              className={`auth-seg-btn ${!isRegister ? 'active' : ''}`}
              onClick={() => switchMode(false)}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              className={`auth-seg-btn ${isRegister ? 'active' : ''}`}
              onClick={() => switchMode(true)}
            >
              สมัครสมาชิกใหม่
            </button>
          </div>

          {/* Interactive Avatar Picker (Register) OR Welcome Avatar Strip (Login) */}
          {isRegister ? (
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>
                  เลือก Avatar ประจำตัว{' '}
                  <span style={{ color: 'var(--pri)', fontWeight: 700 }}>· {selectedAvatarMeta.name}</span>
                </span>
                <button
                  type="button"
                  className="btn ghost xs"
                  onClick={handleRandomAvatar}
                  title="สุ่ม Avatar ใหม่"
                >
                  <RefreshCwIcon size={11} />
                  <span>สุ่ม</span>
                </button>
              </div>
              <div className="auth-avatar-picker" style={{ marginBottom: 0, justifyContent: 'flex-start', gap: 8 }}>
                {AVATAR_LIST.map(av => {
                  const isSelected = selectedAvatar === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      className={`auth-avatar-choice ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedAvatar(av.id)}
                      title={av.name}
                      aria-label={`เลือกอวาตาร์ ${av.name}`}
                      aria-pressed={isSelected}
                    >
                      <AvatarIcon id={av.id} size={38} animated={isSelected} />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="auth-avatar-picker" aria-hidden="true">
              {AVATAR_LIST.slice(0, 6).map(av => (
                <div key={av.id} className="avatar-chip-item" title={av.name}>
                  <AvatarIcon id={av.id} size={38} animated />
                </div>
              ))}
            </div>
          )}

          {/* Alerts */}
          {error && <div className="auth-alert err">{error}</div>}
          {successMsg && <div className="auth-alert ok">{successMsg}</div>}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {isRegister && (
              <div className="auth-field">
                <label htmlFor="auth-name">ชื่อ-นามสกุล / ชื่อเล่น *</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <UserIcon size={15} />
                  </span>
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="เช่น สมชาย งานดี"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="auth-email">อีเมล *</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <MailIcon size={15} />
                </span>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus={!isRegister}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">
                <span>รหัสผ่าน *</span>
                {isRegister && pwStrength.label && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: pwStrength.color }}>
                    {pwStrength.label}
                  </span>
                )}
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <LockIcon size={15} />
                </span>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isRegister ? 'อย่างน้อย 6 ตัวอักษร' : '••••••••'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                </button>
              </div>

              {isRegister && (
                <div className="auth-pw-meter" aria-hidden="true">
                  {[1, 2, 3, 4].map(level => (
                    <span
                      key={level}
                      className="auth-pw-seg"
                      style={{
                        background: pwStrength.score >= level ? pwStrength.color : undefined,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn primary block auth-submit-btn"
              style={{ marginTop: 4 }}
            >
              {submitting ? (
                <>
                  <RefreshCwIcon size={15} className="spin" />
                  <span>{isRegister ? 'กำลังสร้างบัญชี...' : 'กำลังเข้าสู่ระบบ...'}</span>
                </>
              ) : isRegister ? (
                <>
                  <SparklesIcon size={15} />
                  <span>สมัครสมาชิกและเริ่มใช้งาน</span>
                  <ArrowRightIcon size={14} />
                </>
              ) : (
                <>
                  <span>เข้าสู่ระบบ</span>
                  <ArrowRightIcon size={14} />
                </>
              )}
            </button>
          </form>

          {/* Subtle Mode Toggle Footer Link */}
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5, color: 'var(--mut)' }}>
            {isRegister ? (
              <>
                มีบัญชีอยู่แล้วใช่ไหม?{' '}
                <button
                  type="button"
                  onClick={() => switchMode(false)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--pri)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 12.5,
                  }}
                >
                  เข้าสู่ระบบเลย
                </button>
              </>
            ) : (
              <>
                ยังไม่มีบัญชีใช่ไหม?{' '}
                <button
                  type="button"
                  onClick={() => switchMode(true)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--pri)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 12.5,
                  }}
                >
                  สมัครสมาชิกฟรี
                </button>
              </>
            )}
          </div>
        </Tilt3DCard>
      </div>

      <FirebaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}
