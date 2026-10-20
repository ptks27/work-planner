'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authStore';
import { AvatarIcon, AVATAR_LIST, type AvatarId } from './Avatars';
import { useModal } from './ModalContext';
import { UserIcon, CloseIcon, CheckIcon, BuildingIcon, CopyIcon, LogOutIcon, UsersIcon, EditIcon } from './Icons';

export default function ProfileModal({
  isOpen,
  onClose,
  onOpenMembers,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenMembers?: () => void;
}) {
  const { currentUser, currentTeam, userTeams, teamMembers, switchTeam, updateProfile, leaveTeam, logout } = useAuth();
  const { showAlert, showConfirm } = useModal();

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>('dev_boy');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [copiedTeamCode, setCopiedTeamCode] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setRole(currentUser.role || '');
      setSelectedAvatar(currentUser.avatarId || 'dev_boy');
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const currentMeta = AVATAR_LIST.find(a => a.id === selectedAvatar) || AVATAR_LIST[0];

  const handleSave = () => {
    if (!name.trim()) {
      return showAlert('แจ้งเตือน', 'กรุณาระบุชื่อของคุณ');
    }
    updateProfile({
      name: name.trim(),
      role: role.trim() || undefined,
      avatarId: selectedAvatar,
    });
    showAlert('สำเร็จ', 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว');
    onClose();
  };

  const handleLogout = () => {
    showConfirm('ยืนยันออกจากระบบ', 'คุณต้องการออกจากระบบหรือไม่?', () => {
      logout();
      onClose();
    });
  };

  const handleCopyCode = () => {
    const code = currentTeam?.code || currentUser?.teamCode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedTeamCode(true);
      setTimeout(() => setCopiedTeamCode(false), 2000);
    }
  };

  const handleLeaveTeam = () => {
    const teamTitle = currentTeam?.name || currentUser?.teamName || 'ทีมนี้';
    showConfirm(
      'ยืนยันออกจากทีม',
      `คุณต้องการออกจาก "${teamTitle}" ใช่หรือไม่?\n(คุณสามารถใช้รหัสทีมกลับเข้าทีมนี้ได้ตลอดเวลา)`,
      async () => {
        await leaveTeam();
        showAlert('สำเร็จ', 'ออกจากทีมเรียบร้อยแล้ว');
        onClose();
      }
    );
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <div
        className="modal-box"
        style={{
          maxWidth: 540,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 20,
          background: 'var(--card)',
          border: '1px solid var(--line)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'scaleUp 0.18s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserIcon size={18} /> ข้อมูลโปรไฟล์ส่วนตัว
          </h3>
          <button className="icon-btn" onClick={onClose} aria-label="ปิด">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '20px 24px', overflowY: 'auto' }}>
          {/* Main Avatar Hero */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 12px',
              marginBottom: 16,
              background: 'linear-gradient(180deg, var(--pri-l) 0%, transparent 100%)',
              borderRadius: 16,
              border: '1px solid var(--line)',
            }}
          >
            <div
              style={{
                position: 'relative',
                filter: 'drop-shadow(0 6px 12px rgba(99,102,241,0.25))',
                cursor: 'pointer',
              }}
              onClick={() => setIsPickerOpen(prev => !prev)}
              title="คลิกเพื่อเลือกเปลี่ยนรูป Avatar (มีให้เลือก 15 แบบ)"
            >
              <AvatarIcon id={selectedAvatar} size={92} animated />
              {/* รูปแก้ไขที่ซ้อนบน Avatar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  background: 'var(--pri)',
                  color: '#fff',
                  borderRadius: 999,
                  width: 28,
                  height: 28,
                  fontSize: 13,
                  display: 'grid',
                  placeItems: 'center',
                  border: '2px solid var(--card)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  transition: 'transform 0.15s ease',
                }}
                title="คลิกเพื่อเปลี่ยนรูป Avatar"
              >
                <EditIcon size={14} color="#fff" />
              </div>
            </div>

            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{currentMeta.name}</div>
              <small className="mut">{currentMeta.desc}</small>
            </div>

            <button
              type="button"
              className="btn sm ghost"
              onClick={() => setIsPickerOpen(prev => !prev)}
              style={{
                marginTop: 10,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600,
                borderRadius: 999,
                padding: '4px 14px',
                color: isPickerOpen ? 'var(--pri-d)' : 'var(--txt)',
                background: isPickerOpen ? 'var(--card)' : 'transparent',
                border: isPickerOpen ? '1.5px solid var(--pri)' : '1px solid var(--line)',
                boxShadow: isPickerOpen ? '0 2px 8px rgba(99,102,241,0.15)' : 'none',
              }}
            >
              <EditIcon size={13} color="var(--pri)" />
              <span>{isPickerOpen ? '▲ ซ่อนการเลือก Avatar' : '✏️ เปลี่ยนรูป Avatar (มีให้เลือก 15 แบบ)'}</span>
            </button>

            {/* 15 Avatar Picker Dropdown / Accordion */}
            {isPickerOpen && (
              <div
                style={{
                  marginTop: 14,
                  width: '100%',
                  padding: 12,
                  background: 'var(--card)',
                  borderRadius: 14,
                  border: '1.5px solid var(--pri)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--txt)' }}>
                      เลือกรูปประจำตัว Avatar (15 แบบ Animated Vector)
                    </div>
                    <small className="mut" style={{ fontSize: 11 }}>* ไม่ใช้อัปโหลดจากภายนอก เพื่อความเป็นเอกลักษณ์ของระบบ</small>
                  </div>
                  <button
                    type="button"
                    className="btn sm ghost"
                    onClick={() => setIsPickerOpen(false)}
                    style={{ padding: '2px 8px', fontSize: 11 }}
                  >
                    เสร็จสิ้น
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 8,
                    maxHeight: 280,
                    overflowY: 'auto',
                    padding: 4,
                  }}
                >
                  {AVATAR_LIST.map(av => {
                    const isSel = selectedAvatar === av.id;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setSelectedAvatar(av.id)}
                        style={{
                          background: isSel ? 'var(--pri-l)' : 'var(--bg)',
                          border: isSel ? '2px solid var(--pri)' : '1px solid var(--line)',
                          borderRadius: 12,
                          padding: '6px 4px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: isSel ? '0 4px 10px rgba(99,102,241,0.25)' : 'none',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                        title={`${av.name} (${av.desc})`}
                      >
                        <AvatarIcon id={av.id} size={42} animated={isSel} />
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: isSel ? 700 : 500,
                            color: isSel ? 'var(--pri-d)' : 'var(--mut)',
                            textAlign: 'center',
                            lineHeight: 1.1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                          }}
                        >
                          {av.name.split(' ')[0]}
                        </span>
                        {isSel && (
                          <span
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: 'var(--ok)',
                              color: '#fff',
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: 9,
                              fontWeight: 800,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label>ชื่อที่ใช้แสดง (Display Name) *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ชื่อของคุณ"
              />
            </div>

            <div className="row">
              <div>
                <label>ตำแหน่ง / แผนก</label>
                <input
                  type="text"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="เช่น Developer, Marketing, Designer"
                />
              </div>
              <div>
                <label>อีเมล (บัญชีผู้ใช้)</label>
                <input
                  type="text"
                  value={currentUser.email}
                  disabled
                  style={{ opacity: 0.7, cursor: 'not-allowed', background: 'var(--line)' }}
                />
              </div>
            </div>

            {/* Team Info Section */}
            {(currentTeam || currentUser?.teamId) && (
              <>
                <div
                  style={{
                    marginTop: 14,
                    padding: '12px 16px',
                    borderRadius: 14,
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: 'var(--pri-l)',
                          display: 'grid',
                          placeItems: 'center',
                          color: 'var(--pri)',
                        }}
                      >
                        <BuildingIcon size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {currentTeam?.name || currentUser.teamName || 'ทีมของฉัน'}
                        </div>
                        {currentTeam?.createdBy === currentUser.id ? (
                          <div className="mut" style={{ fontSize: 12 }}>
                            รหัสทีม: <b style={{ letterSpacing: '1px', color: 'var(--pri)', fontSize: 13 }}>{currentTeam?.code || currentUser.teamCode}</b>
                            <span style={{ marginLeft: 6, fontSize: 10, background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>👑 ผู้สร้างทีม</span>
                          </div>
                        ) : (
                          <div className="mut" style={{ fontSize: 12 }}>
                            บทบาท: <b style={{ color: 'var(--txt)', fontSize: 13 }}>สมาชิกทีม</b>
                            <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--mut)' }}>(เฉพาะผู้สร้างทีมเท่านั้นที่เห็นรหัส)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {currentTeam?.createdBy === currentUser.id && (
                      <button
                        type="button"
                        className="btn sm ghost"
                        onClick={handleCopyCode}
                        title="ผู้สร้างทีม: คัดลอกรหัสทีมส่งให้เพื่อน"
                        style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        {copiedTeamCode ? (
                          <>
                            <CheckIcon size={13} color="var(--ok)" /> คัดลอกแล้ว
                          </>
                        ) : (
                          <>
                            <CopyIcon size={13} /> คัดลอกรหัส
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                    <small className="mut" style={{ fontSize: 11 }}>
                      {currentTeam?.createdBy === currentUser.id
                        ? 'คุณเป็นผู้สร้างทีมนี้ สามารถแชร์รหัสให้เพื่อนร่วมงานเข้าร่วมได้'
                        : 'สมาชิกทุกคนในทีมจะแชร์งานและวันหยุดร่วมกัน'}
                    </small>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {onOpenMembers && (
                        <button
                          type="button"
                          className="btn sm ghost"
                          onClick={() => {
                            onClose();
                            onOpenMembers();
                          }}
                          title="ดูรายชื่อสมาชิกในทีมนี้"
                          style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <UsersIcon size={13} color="var(--pri)" /> สมาชิก ({teamMembers?.length || 1})
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn sm soft-red"
                        onClick={handleLeaveTeam}
                        title="ออกจากทีมนี้"
                        style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <LogOutIcon size={13} /> ออกจากทีม
                      </button>
                    </div>
                  </div>
                </div>

                {/* รายการทีมทั้งหมดที่สังกัด */}
                {userTeams && userTeams.length > 1 && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 12 }}>ทีมทั้งหมดที่คุณสังกัด ({userTeams.length})</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                      {userTeams.map(t => {
                        const isCurrent = t.id === currentTeam?.id;
                        return (
                          <div
                            key={t.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 10px',
                              borderRadius: 8,
                              background: isCurrent ? 'var(--pri-l)' : 'var(--bg)',
                              border: isCurrent ? '1px solid var(--pri)' : '1px solid var(--line)',
                            }}
                          >
                            <span style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 500 }}>
                              {t.name} {isCurrent ? '(กำลังใช้งาน)' : ''}
                            </span>
                            {!isCurrent && (
                              <button
                                type="button"
                                className="btn sm ghost"
                                onClick={() => switchTeam(t.id)}
                                style={{ padding: '2px 8px', fontSize: 11 }}
                              >
                                สลับมาทีมนี้
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 24px',
          }}
        >
          <button
            type="button"
            className="btn ghost soft-red sm"
            onClick={handleLogout}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <LogOutIcon size={14} /> ออกจากระบบ
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn ghost sm" onClick={onClose}>
              ยกเลิก
            </button>
            <button
              type="button"
              className="btn sm ok"
              onClick={handleSave}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <CheckIcon size={14} /> บันทึกโปรไฟล์
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
