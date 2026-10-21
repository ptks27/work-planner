'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authStore';
import { useModal } from '@/components/ModalContext';
import { AvatarIcon } from './Avatars';
import {
  UsersIcon,
  CloseIcon,
  SearchIcon,
  CopyIcon,
  CheckIcon,
  RefreshCwIcon,
  CalendarIcon,
  BuildingIcon,
  SparklesIcon,
  TrashIcon,
} from './Icons';
import { TH_DOW_FULL, TH_MONTHS, pad } from '@/lib/utils';

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** จัดรูปแบบวันที่เข้าทีมเป็นภาษาไทยแบบเต็ม เช่น วันพุธ 14 ตุลาคม 2569 เวลา 14:30 น. */
function formatJoinedDate(ts?: number): string {
  if (!ts) return 'ไม่ระบุวันที่';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'ไม่ระบุวันที่';
  const dow = TH_DOW_FULL[d.getDay()] || '';
  const day = d.getDate();
  const month = TH_MONTHS[d.getMonth()] || '';
  const year = d.getFullYear() + 543;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())} น.`;
  return `${dow} ${day} ${month} ${year} (${time})`;
}

export default function TeamMembersModal({ isOpen, onClose }: TeamMembersModalProps) {
  const { currentUser, currentTeam, teamMembers, fetchTeamMembers, removeMember } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // ดึงข้อมูลสมาชิกสดใหม่ทุกครั้งที่เปิด modal
  useEffect(() => {
    if (isOpen && currentTeam?.id) {
      fetchTeamMembers(currentTeam.id);
    }
  }, [isOpen, currentTeam?.id]);

  if (!isOpen || !currentUser) return null;

  const isCreator = currentTeam?.createdBy === currentUser.id;
  const canManage = isCreator || currentUser.role === 'admin';

  const handleKickMember = (member: any) => {
    showConfirm(
      'นำสมาชิกออกจากทีม',
      `คุณต้องการนำคุณ "${member.name}" ออกจากทีมนี้ใช่หรือไม่?\n\nสมาชิกคนนี้จะไม่สามารถเข้าถึงงาน วันหยุด หรือปฏิทินของทีมนี้ได้อีกต่อไป`,
      async () => {
        setRemovingUserId(member.userId);
        const res = await removeMember(member.userId);
        setRemovingUserId(null);
        if (res.success) {
          showAlert('สำเร็จ', `นำคุณ "${member.name}" ออกจากทีมเรียบร้อยแล้ว`);
        } else {
          showAlert('ข้อผิดพลาด', res.error || 'ไม่สามารถนำสมาชิกออกจากทีมได้');
        }
      }
    );
  };

  const handleRefresh = async () => {
    if (!currentTeam?.id) return;
    setRefreshing(true);
    await fetchTeamMembers(currentTeam.id);
    setRefreshing(false);
  };

  const handleCopyCode = () => {
    const code = currentTeam?.code || currentUser.teamCode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // กรองตามคำค้นหา
  const q = search.trim().toLowerCase();
  const filteredMembers = (teamMembers || []).filter(m => {
    if (!q) return true;
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.role || '').toLowerCase().includes(q) ||
      (m.department || '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 1000,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 20,
          background: 'var(--card-solid, #ffffff)',
          border: '1px solid var(--line)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
          overflow: 'hidden',
          animation: 'appleScaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--panel)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--pri), #8b5cf6)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <UsersIcon size={22} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                  สมาชิกในทีม
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'var(--pri-l)',
                    color: 'var(--pri-d)',
                  }}
                >
                  {teamMembers.length} คน
                </span>
              </div>
              <div className="mut" style={{ fontSize: 12, marginTop: 2 }}>
                ทีม: <b>{currentTeam?.name || currentUser.teamName || 'ทีมของฉัน'}</b>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn sm ghost"
              onClick={handleRefresh}
              title="รีเฟรชรายชื่อสมาชิก"
              disabled={refreshing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <RefreshCwIcon size={13} className={refreshing ? 'spin' : ''} />
              <span>รีเฟรช</span>
            </button>
            <button
              type="button"
              className="btn sm ghost"
              onClick={onClose}
              title="ปิด"
              style={{ padding: '6px 8px', borderRadius: 8 }}
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>

        {/* Creator Share Code Box */}
        {isCreator && (currentTeam?.code || currentUser.teamCode) && (
          <div
            style={{
              padding: '12px 20px',
              background: '#fef3c7',
              borderBottom: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e' }}>
              <SparklesIcon size={16} color="#b45309" />
              <span>
                คุณเป็น<b>ผู้สร้างทีม</b> แชร์รหัสทีมนี้ให้เพื่อนร่วมงาน:
                <b
                  style={{
                    marginLeft: 6,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: '#fff',
                    border: '1px solid #fcd34d',
                    letterSpacing: '1px',
                    fontSize: 14,
                    color: '#b45309',
                  }}
                >
                  {currentTeam?.code || currentUser.teamCode}
                </b>
              </span>
            </div>
            <button
              type="button"
              className="btn sm"
              onClick={handleCopyCode}
              style={{
                background: '#fff',
                borderColor: '#fcd34d',
                color: '#92400e',
                fontSize: 12,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {copiedCode ? (
                <>
                  <CheckIcon size={13} color="var(--ok)" /> คัดลอกแล้ว
                </>
              ) : (
                <>
                  <CopyIcon size={13} /> คัดลอกรหัสทีม
                </>
              )}
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--bg)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 10,
              background: 'var(--card)',
              border: '1px solid var(--line)',
            }}
          >
            <SearchIcon size={15} color="var(--mut)" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อสมาชิก, ตำแหน่ง หรืออีเมล..."
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontSize: 13,
                color: 'var(--txt)',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--mut)',
                  padding: 2,
                }}
              >
                <CloseIcon size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Member List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxHeight: '460px',
          }}
        >
          {filteredMembers.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--mut)',
                fontSize: 13,
              }}
            >
              {search ? 'ไม่พบสมาชิกที่ตรงกับการค้นหา' : 'ยังไม่มีสมาชิกในทีมนี้'}
            </div>
          ) : (
            filteredMembers.map(member => {
              const isMe = member.userId === currentUser.id;
              const isOwner =
                member.teamRole === 'owner' ||
                member.userId === currentTeam?.createdBy;

              return (
                <div
                  key={member.userId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: isMe ? 'var(--pri-l)' : 'var(--panel)',
                    border: isMe ? '1.5px solid var(--pri)' : '1px solid var(--line)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Left: Avatar + Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <AvatarIcon id={member.avatarId} size={44} />
                      {isOwner && (
                        <span
                          title="ผู้สร้างทีม"
                          style={{
                            position: 'absolute',
                            bottom: -3,
                            right: -3,
                            fontSize: 12,
                            background: '#fff',
                            borderRadius: '50%',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                            padding: '1px',
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          👑
                        </span>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: 'var(--txt)',
                          }}
                        >
                          {member.name}
                        </span>

                        {isMe && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'var(--pri)',
                              color: '#fff',
                            }}
                          >
                            คุณ
                          </span>
                        )}

                        {/* ระดับในทีม (Team Role) */}
                        {isOwner ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '1px 7px',
                              borderRadius: 6,
                              background: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            👑 ผู้สร้างทีม
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '1px 7px',
                              borderRadius: 6,
                              background: 'var(--bg)',
                              color: 'var(--mut)',
                              border: '1px solid var(--line)',
                            }}
                          >
                            👤 สมาชิกทีม
                          </span>
                        )}

                        {/* ระดับ/ตำแหน่งหน้าที่ (Professional Role) */}
                        {member.role && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              padding: '1px 6px',
                              borderRadius: 6,
                              background: 'var(--card)',
                              color: 'var(--txt)',
                              border: '1px solid var(--line)',
                            }}
                          >
                            {member.role}
                          </span>
                        )}
                      </div>

                      {/* อีเมล */}
                      {member.email && (
                        <div
                          className="mut"
                          style={{
                            fontSize: 12,
                            marginTop: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {member.email}
                        </div>
                      )}

                      {/* วันที่เข้าทีม */}
                      <div
                        style={{
                          fontSize: 11,
                          marginTop: 4,
                          color: 'var(--mut)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <CalendarIcon size={12} color="var(--pri)" />
                        <span>
                          วันที่เข้าทีม:{' '}
                          <b style={{ color: 'var(--txt)', fontWeight: 600 }}>
                            {formatJoinedDate(member.joinedAt)}
                          </b>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action: Kick button for team creator / admin */}
                  {canManage && !isMe && !isOwner && (
                    <button
                      type="button"
                      onClick={() => handleKickMember(member)}
                      disabled={removingUserId === member.userId}
                      className="btn ghost sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#ff3b30',
                        background: 'rgba(255, 59, 48, 0.08)',
                        border: '1px solid rgba(255, 59, 48, 0.22)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        flexShrink: 0,
                      }}
                      title={`นำคุณ ${member.name} ออกจากทีม`}
                    >
                      <TrashIcon size={13} color="#ff3b30" />
                      <span>{removingUserId === member.userId ? 'กำลังนำออก...' : 'เอาออกจากทีม'}</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--line)',
            background: 'var(--panel)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <small className="mut" style={{ fontSize: 11 }}>
            สมาชิกทุกคนในทีมนี้จะแชร์ปฏิทินงาน วันหยุด และวันลาร่วมกันแบบเรียลไทม์
          </small>
          <button
            type="button"
            className="btn ghost sm"
            onClick={onClose}
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
