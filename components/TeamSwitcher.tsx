'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/authStore';
import { useModal } from './ModalContext';
import {
  BuildingIcon,
  ChevronDownIcon,
  CheckIcon,
  CopyIcon,
  PlusIcon,
  LinkIcon,
  LogOutIcon,
  SparklesIcon,
  CloseIcon,
  UsersIcon,
} from './Icons';

interface TeamSwitcherProps {
  onOpenMembers?: () => void;
}

export default function TeamSwitcher({ onOpenMembers }: TeamSwitcherProps = {}) {
  const {
    currentUser,
    currentTeam,
    userTeams,
    teamMembers,
    fetchUserTeams,
    switchTeam,
    createTeam,
    joinTeam,
    leaveTeam,
  } = useAuth();
  const { showAlert, showConfirm } = useModal();

  const [isOpen, setIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join' | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // ดึงรายการทีมทั้งหมดที่ผู้ใช้สังกัดอยู่
  useEffect(() => {
    if (currentUser?.id) {
      fetchUserTeams();
    }
  }, [currentUser?.id]);

  // ปิด dropdown เมื่อคลิกนอกขอบเขต
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!currentUser) return null;

  const isCurrentTeamCreator = currentTeam?.createdBy === currentUser.id;

  const handleCopyCode = (e: React.MouseEvent, code: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleSwitch = async (teamId: string) => {
    if (teamId === currentTeam?.id) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    await switchTeam(teamId);
  };

  const handleLeave = (e: React.MouseEvent, teamId: string, teamTitle: string) => {
    e.stopPropagation();
    showConfirm(
      'ยืนยันการออกจากทีม',
      `คุณต้องการออกจาก "${teamTitle}" ใช่หรือไม่?\n(หากต้องการเข้าใหม่ จะต้องใช้รหัสทีมที่ผู้สร้างแชร์ให้)`,
      async () => {
        const res = await leaveTeam(teamId);
        if (res.success) {
          showAlert('สำเร็จ', `ออกจากทีม "${teamTitle}" เรียบร้อยแล้ว`);
        } else {
          showAlert('เกิดข้อผิดพลาด', res.error || 'ไม่สามารถออกจากทีมได้');
        }
      }
    );
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!teamName.trim()) {
      return setError('กรุณาระบุชื่อทีม');
    }
    setLoading(true);
    const res = await createTeam(teamName.trim());
    setLoading(false);
    if (res.success) {
      setTeamName('');
      setModalMode(null);
      setIsOpen(false);
      showAlert('สำเร็จ', `สร้างทีม "${res.team?.name}" เรียบร้อยแล้ว`);
    } else {
      setError(res.error || 'ไม่สามารถสร้างทีมได้');
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!teamCode.trim()) {
      return setError('กรุณากรอกรหัสทีม');
    }
    setLoading(true);
    const res = await joinTeam(teamCode.trim());
    setLoading(false);
    if (res.success) {
      setTeamCode('');
      setModalMode(null);
      setIsOpen(false);
      showAlert('สำเร็จ', `เข้าร่วมทีม "${res.team?.name}" เรียบร้อยแล้ว`);
    } else {
      setError(res.error || 'ไม่พบทีมหรือรหัสไม่ถูกต้อง');
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Topbar Team Pill */}
      <div
        className="nav-team-pill"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
        title="คลิกเพื่อสลับทีม หรือจัดการทีมของคุณ"
      >
        <span className="nav-team-icon" style={{ display: 'grid', placeItems: 'center' }}>
          <BuildingIcon size={14} color="var(--pri)" />
        </span>

        <span className="nav-team-name">
          {currentTeam?.name || currentUser.teamName || 'ทีมของฉัน'}
        </span>

        {/* แสดงรหัสทีมเฉพาะผู้สร้างทีมเท่านั้น */}
        {isCurrentTeamCreator && (currentTeam?.code || currentUser.teamCode) && (
          <button
            type="button"
            className="nav-team-code-btn"
            onClick={e =>
              handleCopyCode(
                e,
                currentTeam?.code || currentUser.teamCode || '',
                currentTeam?.id || 'active'
              )
            }
            title="ผู้สร้างทีม: คลิกเพื่อคัดลอกรหัสทีมส่งให้เพื่อนร่วมงาน"
          >
            <span className="nav-team-code-badge">
              {currentTeam?.code || currentUser.teamCode}
            </span>
            {copiedCodeId === (currentTeam?.id || 'active') ? (
              <CheckIcon size={12} strokeWidth={2.5} color="var(--ok)" />
            ) : (
              <CopyIcon size={12} />
            )}
          </button>
        )}

        {/* ถ้าไม่ใช่ผู้สร้าง ให้แสดง Badge สมาชิก (ไม่แสดงรหัสทีม) */}
        {!isCurrentTeamCreator && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 6,
              background: 'var(--bg)',
              color: 'var(--mut)',
              border: '1px solid var(--line)',
            }}
          >
            สมาชิก
          </span>
        )}

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: 'var(--mut)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        >
          <ChevronDownIcon size={13} />
        </span>
      </div>

      {/* Team Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 1000,
            minWidth: 280,
            maxWidth: 340,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08)',
            padding: '8px',
            userSelect: 'none',
            animation: 'scaleUp 0.15s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '8px 10px 6px',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--mut)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>ทีมของคุณ ({userTeams.length})</span>
            <small style={{ fontWeight: 500, textTransform: 'none', color: 'var(--pri)' }}>
              สลับดูงานได้ทันที
            </small>
          </div>

          {/* Teams List */}
          <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {userTeams.map(t => {
              const isActive = t.id === currentTeam?.id;
              const isCreator = t.createdBy === currentUser.id;

              return (
                <div
                  key={t.id}
                  onClick={() => handleSwitch(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: isActive ? 'var(--pri-l)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    border: isActive ? '1px solid var(--pri)' : '1px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = 'var(--bg)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: isActive ? 'var(--pri)' : 'var(--bg)',
                        color: isActive ? '#fff' : 'var(--txt)',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <BuildingIcon size={14} />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: isActive ? 700 : 600,
                          fontSize: 13,
                          color: isActive ? 'var(--pri-d)' : 'var(--txt)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {t.name}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {isCreator ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#b45309',
                              background: '#fef3c7',
                              padding: '0 4px',
                              borderRadius: 4,
                            }}
                          >
                            👑 ผู้สร้าง
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: 'var(--mut)',
                            }}
                          >
                            สมาชิก
                          </span>
                        )}

                        {/* แสดงรหัสเฉพาะผู้สร้าง */}
                        {isCreator && (
                          <span
                            onClick={e => handleCopyCode(e, t.code, t.id)}
                            title="คลิกเพื่อคัดลอกรหัสทีม"
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--pri)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            <span>#{t.code}</span>
                            {copiedCodeId === t.id ? (
                              <CheckIcon size={10} color="var(--ok)" />
                            ) : (
                              <CopyIcon size={10} />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isActive && (
                      <span
                        style={{
                          color: 'var(--pri)',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                        title="ทีมที่กำลังใช้งานอยู่"
                      >
                        <CheckIcon size={16} strokeWidth={2.5} />
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={e => handleLeave(e, t.id, t.name)}
                      title="ออกจากทีมนี้"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--mut)',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: 6,
                        display: 'grid',
                        placeItems: 'center',
                        opacity: 0.6,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = 'var(--red)';
                        e.currentTarget.style.background = 'var(--red-l)';
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--mut)';
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.opacity = '0.6';
                      }}
                    >
                      <LogOutIcon size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <hr style={{ margin: '8px 0', borderColor: 'var(--line)' }} />

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => {
                setIsOpen(false);
                setError('');
                setModalMode('create');
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                justifyContent: 'flex-start',
                padding: '8px 10px',
                fontSize: 12,
                borderRadius: 8,
                color: 'var(--pri-d)',
              }}
            >
              <PlusIcon size={14} strokeWidth={2.5} />
              <span>สร้างทีมใหม่ (Create Team)</span>
            </button>

            <button
              type="button"
              className="btn sm ghost"
              onClick={() => {
                setIsOpen(false);
                setError('');
                setModalMode('join');
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                justifyContent: 'flex-start',
                padding: '8px 10px',
                fontSize: 12,
                borderRadius: 8,
              }}
            >
              <LinkIcon size={14} />
              <span>เข้าร่วมทีมด้วยรหัส (Join Team)</span>
            </button>

            {onOpenMembers && (
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => {
                  setIsOpen(false);
                  onOpenMembers();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  justifyContent: 'flex-start',
                  padding: '8px 10px',
                  fontSize: 12,
                  borderRadius: 8,
                  color: 'var(--txt)',
                  background: 'var(--bg)',
                  marginTop: 2,
                }}
              >
                <UsersIcon size={14} color="var(--pri)" />
                <span>ดูสมาชิกในทีม ({teamMembers.length} คน)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal: สร้างทีมใหม่ หรือ เข้าร่วมทีม */}
      {modalMode && (
        <div className="modal-overlay" onClick={() => setModalMode(null)}>
          <div
            className="modal-box"
            style={{ maxWidth: 440 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {modalMode === 'create' ? (
                  <>
                    <SparklesIcon size={18} color="var(--pri)" /> สร้างทีมใหม่
                  </>
                ) : (
                  <>
                    <LinkIcon size={18} color="var(--pri)" /> เข้าร่วมทีมด้วยรหัส
                  </>
                )}
              </h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setModalMode(null)}
                aria-label="ปิด"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="modal-body">
              {/* Tab Switcher in Modal */}
              <div className="auth-tabs" style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  className={`auth-tab ${modalMode === 'create' ? 'active' : ''}`}
                  onClick={() => {
                    setModalMode('create');
                    setError('');
                  }}
                >
                  สร้างทีมใหม่
                </button>
                <button
                  type="button"
                  className={`auth-tab ${modalMode === 'join' ? 'active' : ''}`}
                  onClick={() => {
                    setModalMode('join');
                    setError('');
                  }}
                >
                  เข้าร่วมทีมด้วยรหัส
                </button>
              </div>

              {error && (
                <div
                  style={{
                    color: 'var(--red)',
                    background: 'var(--red-l)',
                    padding: '8px 12px',
                    borderRadius: 8,
                    marginBottom: 12,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {error}
                </div>
              )}

              {modalMode === 'create' ? (
                <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label>ชื่อทีมของคุณ *</label>
                    <input
                      type="text"
                      placeholder="เช่น ทีมพัฒนา Frontend, ฝ่ายการตลาด"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <small className="mut" style={{ fontSize: 12, lineHeight: 1.4 }}>
                    💡 คุณจะเป็น <b>ผู้สร้างทีมนี้</b> และเป็นคนเดียวที่สามารถดูรหัสทีมเพื่อคัดลอกส่งให้สมาชิกคนอื่นได้
                  </small>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setModalMode(null)}
                    >
                      ยกเลิก
                    </button>
                    <button type="submit" className="btn sm" disabled={loading}>
                      {loading ? 'กำลังสร้าง...' : 'สร้างทีม'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label>รหัสทีม (Team Code) *</label>
                    <input
                      type="text"
                      placeholder="เช่น AB12CD"
                      value={teamCode}
                      onChange={e => setTeamCode(e.target.value.toUpperCase())}
                      style={{ letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}
                      autoFocus
                    />
                  </div>
                  <small className="mut" style={{ fontSize: 12, lineHeight: 1.4 }}>
                    🔑 กรอกรหัสทีมที่ได้รับจาก <b>ผู้สร้างทีม</b> เพื่อเข้าถึงปฏิทินงานและวันหยุดร่วมกัน
                  </small>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setModalMode(null)}
                    >
                      ยกเลิก
                    </button>
                    <button type="submit" className="btn sm" disabled={loading}>
                      {loading ? 'กำลังตรวจสอบ...' : 'เข้าร่วมทีม'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
