'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/authStore';
import { AvatarIcon } from './Avatars';
import { BuildingIcon, LogOutIcon, SparklesIcon, LinkIcon, CheckIcon, CloudIcon } from './Icons';
import FirebaseConfigModal from './FirebaseConfigModal';

export default function TeamSelectScreen() {
  const { currentUser, userTeams, switchTeam, createTeam, joinTeam, logout } = useAuth();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  if (!currentUser) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!teamName.trim()) {
      return setError('กรุณาระบุชื่อทีมของคุณ');
    }
    setLoading(true);
    const res = await createTeam(teamName);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'เกิดข้อผิดพลาดในการสร้างทีม');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!teamCode.trim()) {
      return setError('กรุณากรอกรหัสทีม (Team Code)');
    }
    setLoading(true);
    const res = await joinTeam(teamCode);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'ไม่พบทีมหรือรหัสไม่ถูกต้อง');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card team-setup-card">
        {/* Top User Bar */}
        <div className="team-user-header">
          <div className="team-user-info">
            <AvatarIcon id={currentUser.avatarId} size={38} />
            <div>
              <div className="team-user-name">สวัสดีคุณ, <b>{currentUser.name}</b></div>
              <div className="team-user-email">{currentUser.email}</div>
            </div>
          </div>
          <button
            type="button"
            className="btn ghost sm"
            onClick={logout}
            title="ออกจากระบบเพื่อสลับบัญชี"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <LogOutIcon size={14} /> ออกจากระบบ
          </button>
        </div>

        {/* Brand & Heading */}
        <div className="auth-header" style={{ marginTop: 8 }}>
          <div className="auth-logo">
            <BuildingIcon size={26} color="#fff" />
          </div>
          <h2>เลือกพื้นที่ทีมของคุณ</h2>
          <p className="mut">
            แยกงาน วันหยุด และวันลาเป็นสัดส่วนเฉพาะทีม ปลอดภัยและซิงค์ข้อมูลตรงกันแบบเรียลไทม์
          </p>
        </div>

        {/* Global Cloud Status Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: 'rgba(52, 199, 89, 0.08)',
              border: '1px solid rgba(52, 199, 89, 0.22)',
              padding: '4px 12px',
              borderRadius: 999,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="คลิกเพื่อดูหรือปรับแต่งการเชื่อมต่อ Firebase Cloud"
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
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#34c759' }}>
              Cloud ซิงค์ทีมอัตโนมัติ
            </span>
            <span style={{ fontSize: 11, color: 'var(--mut)', fontFamily: 'SF Mono, Menlo, monospace' }}>
              (work-planner-9caf4)
            </span>
            <span style={{ fontSize: 11, color: 'var(--pri)', fontWeight: 600, marginLeft: 2 }}>
              ตั้งค่า &rsaquo;
            </span>
          </button>
        </div>

        {/* Tab switch */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'create' ? 'active' : ''}`}
            onClick={() => {
              setTab('create');
              setError('');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <SparklesIcon size={15} /> สร้างทีมใหม่ (Create Team)
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'join' ? 'active' : ''}`}
            onClick={() => {
              setTab('join');
              setError('');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <LinkIcon size={15} /> เข้าร่วมทีมด้วยรหัส (Join Team)
          </button>
        </div>

        {/* Error Alert */}
        {error && <div className="auth-alert err">{error}</div>}

        {/* Form Create */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="auth-form">
            <div className="form-group">
              <label>ชื่อทีมของคุณ</label>
              <input
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="เช่น ทีมพัฒนาเว็บ, ฝ่ายขายและการตลาด, ทีมบริหาร..."
                autoFocus
                disabled={loading}
              />
              <small className="mut" style={{ display: 'block', marginTop: 4 }}>
                ระบบจะสร้าง <b>รหัสทีม 6 หลัก</b> ให้อัตโนมัติ เพื่อนำไปส่งต่อให้เพื่อนร่วมทีม
              </small>
            </div>

            <button
              type="submit"
              className="btn ok submit-btn"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? (
                'กำลังสร้างทีม...'
              ) : (
                <>
                  <SparklesIcon size={16} /> สร้างทีมและเข้าสู่ระบบทันที
                </>
              )}
            </button>
          </form>
        )}

        {/* Form Join */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="auth-form">
            <div className="form-group">
              <label>รหัสทีม (Team Code 6 หลัก)</label>
              <input
                type="text"
                value={teamCode}
                onChange={e => setTeamCode(e.target.value.toUpperCase())}
                placeholder="เช่น ABC92X หรือ 7K8M2N"
                maxLength={8}
                style={{
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  textAlign: 'center',
                  fontSize: 18,
                }}
                autoFocus
                disabled={loading}
              />
              <small className="mut" style={{ display: 'block', marginTop: 4 }}>
                ขอรหัสทีมนี้ได้จากหัวหน้าทีมหรือเพื่อนร่วมทีมที่สร้างห้องไว้แล้ว
              </small>
            </div>

            <button
              type="submit"
              className="btn submit-btn"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? (
                'กำลังค้นหาและเข้าร่วมทีม...'
              ) : (
                <>
                  <CheckIcon size={16} /> เข้าร่วมทีมนี้
                </>
              )}
            </button>
          </form>
        )}

        {/* Existing teams list if available */}
        {userTeams && userTeams.length > 0 && (
          <div style={{ marginTop: 20, padding: 14, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--txt)' }}>
              ทีมที่คุณสังกัดอยู่แล้ว ({userTeams.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {userTeams.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className="btn ghost"
                  onClick={() => switchTeam(t.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    textAlign: 'left',
                    borderRadius: 8,
                    background: 'var(--panel)',
                    border: '1px solid var(--line)',
                    width: '100%',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--pri)', fontWeight: 600 }}>เข้าสู่พื้นที่ทีมนี้ &rarr;</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Team features reminder */}
        <div className="hint" style={{ marginTop: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <SparklesIcon size={15} color="var(--pri)" />
          <span><b>หมายเหตุ:</b> คุณสามารถดูรหัสทีม หรือกดออกจากทีมได้ตลอดเวลาที่เมนูด้านบนของระบบ</span>
        </div>
      </div>

      <FirebaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}
