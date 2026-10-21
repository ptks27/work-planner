'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/authStore';
import { AvatarIcon, AVATAR_LIST } from './Avatars';
import { BoltIcon, SparklesIcon, CheckIcon, CloudIcon } from './Icons';
import FirebaseConfigModal from './FirebaseConfigModal';

export default function AuthScreen({ onLoggedIn }: { onLoggedIn?: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (isRegister) {
      if (!name.trim()) return setError('กรุณากรอกชื่อของคุณ');
      if (!email.trim()) return setError('กรุณากรอกอีเมล');
      const res = await register(name, email, password);
      if (!res.success) {
        return setError(res.error || 'เกิดข้อผิดพลาดในการสมัคร');
      }
      setSuccessMsg('สมัครสมาชิกสำเร็จ! ยินดีต้อนรับสู่ทีม');
      onLoggedIn?.();
    } else {
      if (!email.trim()) return setError('กรุณากรอกอีเมล');
      const res = await login(email, password);
      if (!res.success) {
        return setError(res.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
      onLoggedIn?.();
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Header / Brand */}
        <div className="auth-header">
          <div className="auth-logo">
            <BoltIcon size={26} color="#fff" />
          </div>
          <h2>Work Planner</h2>
          <p className="mut">ระบบวางแผนงาน ปฏิทินทีม และติดตามงานรายวัน</p>
        </div>

        {/* Global Cloud Status Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: 'rgba(52, 199, 89, 0.09)',
              border: '1px solid rgba(52, 199, 89, 0.25)',
              color: '#34c759',
              fontSize: 12,
              fontWeight: 600,
              padding: '5px 12px',
              borderRadius: 999,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="คลิกเพื่อดูหรือปรับแต่งการเชื่อมต่อ Firebase Cloud"
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#34c759',
                boxShadow: '0 0 6px #34c759',
              }}
            />
            <span style={{ color: 'var(--txt)' }}>Cloud ซิงค์ทีมอัตโนมัติ</span>
            <span style={{ fontSize: 11, opacity: 0.7, color: 'var(--mut)' }}>(work-planner-9caf4)</span>
            <span style={{ fontSize: 11, color: 'var(--pri)', marginLeft: 2 }}>⚙️ ตั้งค่า</span>
          </button>
        </div>

        {/* Animated Avatars Preview Ribbon */}
        <div className="auth-avatar-ribbon">
          {AVATAR_LIST.slice(0, 6).map(av => (
            <div key={av.id} className="avatar-chip-item" title={av.name}>
              <AvatarIcon id={av.id} size={42} animated />
            </div>
          ))}
        </div>

        {/* Tabs: Login vs Register */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(false);
              setError('');
            }}
          >
            เข้าสู่ระบบ (Sign In)
          </button>
          <button
            type="button"
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(true);
              setError('');
            }}
          >
            สมัครสมาชิกใหม่ (Register)
          </button>
        </div>

        {/* Alerts */}
        {error && <div className="auth-alert err">{error}</div>}
        {successMsg && <div className="auth-alert ok">{successMsg}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div>
              <label>ชื่อ-นามสกุล / ชื่อเล่น *</label>
              <input
                type="text"
                placeholder="เช่น สมชาย งานดี"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus={isRegister}
              />
            </div>
          )}

          <div>
            <label>อีเมล *</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus={!isRegister}
            />
          </div>

          <div>
            <label>รหัสผ่าน</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {isRegister && (
            <div className="auth-tip-box" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <SparklesIcon size={20} color="var(--pri)" />
              <span>
                ระบบจะสุ่ม <b>รูปประจำตัว Avatar Animation</b> ให้คุณทันที 1 จาก 5 แบบ
                และสามารถเลือกเปลี่ยนได้ตลอดเวลาที่หน้า Profile
              </span>
            </div>
          )}

          <button
            type="submit"
            className="btn block"
            style={{
              marginTop: 8,
              padding: 12,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {isRegister ? (
              <>
                <SparklesIcon size={16} /> สมัครสมาชิกและเริ่มใช้งาน
              </>
            ) : (
              <>
                <CheckIcon size={16} /> เข้าสู่ระบบ
              </>
            )}
          </button>
        </form>
      </div>

      <FirebaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}
