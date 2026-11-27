'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/authStore';
import { isAdminUser } from '@/lib/types';
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
  ClockIcon,
  AlertCircleIcon,
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
    teamRequests,
    fetchUserTeams,
    switchTeam,
    createTeam,
    submitTeamRequest,
    cancelTeamRequest,
    acknowledgeTeamRequest,
    joinTeam,
    leaveTeam,
  } = useAuth();
  const { showAlert, showConfirm } = useModal();

  const [isOpen, setIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join' | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamNote, setTeamNote] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = isAdminUser(currentUser);
  const pendingRequest = !isAdmin
    ? (teamRequests || []).find(r => r.status === 'pending')
    : undefined;
  const unackRejectedRequest = !isAdmin
    ? (teamRequests || []).find(r => r.status === 'rejected' && !r.acknowledged)
    : undefined;

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

    if (isAdmin) {
      const res = await createTeam(teamName.trim());
      setLoading(false);
      if (res.success) {
        setTeamName('');
        setTeamNote('');
        setModalMode(null);
        setIsOpen(false);
        showAlert('สำเร็จ', `สร้างทีม "${res.team?.name}" เรียบร้อยแล้ว`);
      } else {
        setError(res.error || 'ไม่สามารถสร้างทีมได้');
      }
      return;
    }

    if (unackRejectedRequest) {
      await acknowledgeTeamRequest(unackRejectedRequest.id);
    }
    const res = await submitTeamRequest(teamName.trim(), teamNote.trim());
    setLoading(false);
    if (res.success) {
      setTeamName('');
      setTeamNote('');
    } else {
      setError(res.error || 'ไม่สามารถส่งคำขอสร้างทีมได้');
    }
  };

  const handleCancelPendingRequest = async () => {
    if (!pendingRequest) return;
    setLoading(true);
    setError('');
    const res = await cancelTeamRequest(pendingRequest.id);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'ไม่สามารถยกเลิกคำขอได้');
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
      {/* Topbar Team Pill - Compact Apple HIG style */}
      <div
        className="nav-team-pill"
        onClick={() => setIsOpen(prev => !prev)}
        title={`ทีมปัจจุบัน: ${currentTeam?.name || currentUser.teamName || 'ทีมของฉัน'} (คลิกเพื่อสลับทีมหรือคัดลอกรหัส)`}
      >
        <span className="nav-team-icon" style={{ display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <BuildingIcon size={13} color="var(--pri)" />
        </span>

        <span className="nav-team-name">
          {currentTeam?.name || currentUser.teamName || 'ทีมของฉัน'}
        </span>

        {/* Member count badge */}
        <span
          className="nav-team-count-badge"
          title={`${teamMembers.length} สมาชิกในทีม`}
        >
          <UsersIcon size={11} color="var(--pri)" />
          <span>{teamMembers.length}</span>
        </span>

        <span
          className="nav-team-caret"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: 'var(--mut)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            flexShrink: 0,
          }}
        >
          <ChevronDownIcon size={11} />
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
          {/* Active Team Invite Code Banner for Team Creator */}
          {isCurrentTeamCreator && (currentTeam?.code || currentUser.teamCode) && (
            <div
              style={{
                margin: '2px 4px 8px',
                padding: '8px 10px',
                background: 'var(--pri-l)',
                border: '1px solid rgba(109, 40, 217, 0.2)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--mut)' }}>
                  รหัสแชร์เข้าร่วมทีม:
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.8, color: 'var(--pri)' }}>
                  {currentTeam?.code || currentUser.teamCode}
                </span>
              </div>
              <button
                type="button"
                onClick={e =>
                  handleCopyCode(
                    e,
                    currentTeam?.code || currentUser.teamCode || '',
                    currentTeam?.id || 'active'
                  )
                }
                style={{
                  border: 'none',
                  background: copiedCodeId === (currentTeam?.id || 'active') ? 'var(--ok)' : 'var(--pri)',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'background 0.15s ease',
                }}
              >
                {copiedCodeId === (currentTeam?.id || 'active') ? (
                  <>
                    <CheckIcon size={11} strokeWidth={2.5} />
                    <span>คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <CopyIcon size={11} />
                    <span>คัดลอกรหัส</span>
                  </>
                )}
              </button>
            </div>
          )}

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

          {/* Pending Request Indicator in Dropdown */}
          {pendingRequest && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setError('');
                setModalMode('create');
              }}
              style={{
                width: '100%',
                marginBottom: 6,
                padding: '7px 10px',
                borderRadius: 10,
                border: '1px solid rgba(245, 158, 11, 0.35)',
                background: 'rgba(245, 158, 11, 0.1)',
                color: 'var(--txt)',
                fontSize: 11.5,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span className="team-req-pulse-dot" />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                รอผู้ดูแลระบบอนุมัติ: {pendingRequest.teamName}
              </span>
            </button>
          )}

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
                pendingRequest ? (
                  <div className="team-req-status-box is-pending">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="team-req-pulse-dot" />
                      <b style={{ fontSize: 14, color: 'var(--txt)' }}>รอผู้ดูแลระบบอนุมัติ</b>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.5 }}>
                      ส่งคำขอสร้างทีม <b>&ldquo;{pendingRequest.teamName}&rdquo;</b> เรียบร้อยแล้ว กรุณารอผู้ดูแลระบบตรวจสอบและอนุมัติ
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={handleCancelPendingRequest}
                        disabled={loading}
                      >
                        {loading ? 'กำลังยกเลิก...' : 'ยกเลิกคำขอ'}
                      </button>
                      <button
                        type="button"
                        className="btn primary sm"
                        onClick={() => setModalMode(null)}
                      >
                        ปิดหน้าต่าง
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {unackRejectedRequest && (
                      <div className="team-req-status-box is-rejected">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--red)', fontWeight: 700, fontSize: 13 }}>
                          <AlertCircleIcon size={15} />
                          <span>ผู้ดูแลระบบไม่อนุมัติ กรุณาลองใหม่อีกครั้ง</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--txt)' }}>
                          คำขอทีม &ldquo;{unackRejectedRequest.teamName}&rdquo; ไม่ได้รับอนุมัติ
                        </div>
                      </div>
                    )}

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
                      {!isAdmin && (
                        <div>
                          <label>หมายเหตุถึงผู้ดูแลระบบ (ไม่บังคับ)</label>
                          <input
                            type="text"
                            placeholder="ระบุเหตุผลหรือแผนก..."
                            value={teamNote}
                            onChange={e => setTeamNote(e.target.value)}
                          />
                        </div>
                      )}
                      <small className="mut" style={{ fontSize: 12, lineHeight: 1.45 }}>
                        {isAdmin ? (
                          <>💡 สิทธิ์ผู้ดูแลระบบ (Admin): คุณสามารถสร้างทีมใหม่และรับรหัสทีมได้ทันที</>
                        ) : (
                          <>⏳ การสร้างทีมใหม่ต้องส่งคำขอให้ผู้ดูแลระบบอนุมัติก่อน เมื่อได้รับอนุมัติทีมจะปรากฏในรายการทีมของคุณทันที</>
                        )}
                      </small>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => setModalMode(null)}
                        >
                          ยกเลิก
                        </button>
                        <button type="submit" className="btn primary sm" disabled={loading}>
                          {loading
                            ? isAdmin
                              ? 'กำลังสร้าง...'
                              : 'กำลังส่งคำขอ...'
                            : isAdmin
                              ? 'สร้างทีมทันที'
                              : 'ส่งคำขอสร้างทีม'}
                        </button>
                      </div>
                    </form>
                  </div>
                )
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
