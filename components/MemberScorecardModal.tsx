'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { AvatarIcon } from './Avatars';
import { calculateMemberScorecard, formatScorecardShareText } from '@/lib/kpi';
import {
  CloseIcon,
  CheckIcon,
  CopyIcon,
  AwardIcon,
  SparklesIcon,
  ClockIcon,
  CalendarIcon,
  UsersIcon,
} from './Icons';

interface MemberScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMemberId?: string;
}

export default function MemberScorecardModal({
  isOpen,
  onClose,
  defaultMemberId,
}: MemberScorecardModalProps) {
  const { tasks } = usePlanner();
  const { users, currentUser } = useAuth();

  // Combine unique members
  const memberList = Array.from(
    new Map(
      (users || [])
        .concat(currentUser ? [currentUser] : [])
        .map(u => [u.id, u])
    ).values()
  );

  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    defaultMemberId || currentUser?.id || memberList[0]?.id || ''
  );
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentMember = memberList.find(m => m.id === selectedMemberId) || memberList[0];
  if (!currentMember) return null;

  const card = calculateMemberScorecard({
    member: currentMember,
    tasks,
  });

  // Recent completed tasks by this member
  const completedByMember = tasks
    .filter(t => {
      if (t.hidden || (!t.done && t.status !== 'done')) return false;
      if (t.assigneeIds && t.assigneeIds.includes(currentMember.id)) return true;
      return t.userId === currentMember.id;
    })
    .slice(0, 4);

  const handleCopySummary = () => {
    const text = formatScorecardShareText(card);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'A+': { bg: 'rgba(52, 199, 89, 0.15)', text: '#34c759', border: 'rgba(52, 199, 89, 0.4)' },
    A: { bg: 'rgba(0, 113, 227, 0.15)', text: '#0071e3', border: 'rgba(0, 113, 227, 0.4)' },
    'B+': { bg: 'rgba(175, 82, 222, 0.15)', text: '#af52de', border: 'rgba(175, 82, 222, 0.4)' },
    B: { bg: 'rgba(255, 149, 0, 0.15)', text: '#ff9500', border: 'rgba(255, 149, 0, 0.4)' },
    C: { bg: 'rgba(255, 59, 48, 0.15)', text: '#ff3b30', border: 'rgba(255, 59, 48, 0.4)' },
  };

  const gradeStyle = GRADE_COLORS[card.grade] || GRADE_COLORS['B'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{
          maxWidth: 620,
          width: '92%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--card-solid)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(255, 149, 0, 0.12)',
                color: '#ff9500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AwardIcon size={18} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16.5 }}>บัตรประเมินผลงาน KPI รายบุคคล</h3>
              <small style={{ color: 'var(--mut)', fontSize: 11.5 }}>
                คำนวณจากความเร็ว อัตราส่งงานตรงเวลา และผลผลิตรวมของงานจริงในระบบ
              </small>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Member Selector Switcher */}
        <div
          style={{
            padding: '10px 22px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: 11.5, color: 'var(--mut)', fontWeight: 600, flexShrink: 0 }}>
            เลือกสมาชิก:
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {memberList.map(m => {
              const isSelected = m.id === selectedMemberId;
              return (
                <button
                  key={`kpi-m-${m.id}`}
                  type="button"
                  onClick={() => setSelectedMemberId(m.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px 4px 6px',
                    borderRadius: 999,
                    border: isSelected ? '1.5px solid var(--pri)' : '1px solid var(--line)',
                    background: isSelected ? 'var(--pri-l)' : 'transparent',
                    color: isSelected ? 'var(--pri)' : 'var(--txt)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: isSelected ? 700 : 500,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <AvatarIcon id={m.avatarId} size={18} />
                  <span>{m.name} {m.id === currentUser?.id ? '(ฉัน)' : ''}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body / Scorecard Content */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          {/* Member Hero Card (Cupertino Glass Style) */}
          <div
            style={{
              padding: '20px',
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(120, 120, 128, 0.08), rgba(0, 113, 227, 0.05))',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14,
            }}
          >
            {/* Member Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <AvatarIcon id={card.avatarId} size={54} />
                <span
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    background: '#34c759',
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: '2px solid var(--card-solid)',
                  }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{card.memberName}</h3>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(120, 120, 128, 0.1)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--mut)',
                    }}
                  >
                    {card.role}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 2 }}>
                  แผนก: <b>{card.department}</b> • {card.periodLabel}
                </div>
              </div>
            </div>

            {/* Performance Grade Badge */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 16,
                  background: gradeStyle.bg,
                  border: `2px solid ${gradeStyle.border}`,
                  color: gradeStyle.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  boxShadow: `0 8px 16px ${gradeStyle.bg}`,
                }}
              >
                {card.grade}
              </div>
              <small style={{ fontSize: 10.5, fontWeight: 700, color: gradeStyle.text, display: 'block', marginTop: 4 }}>
                เกรดประเมิน
              </small>
            </div>
          </div>

          {/* 4 Quadrants Key Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {/* Metric 1: On-Time Rate */}
            <div
              style={{
                padding: '14px',
                borderRadius: 14,
                background: 'rgba(120, 120, 128, 0.04)',
                border: '1px solid var(--line)',
              }}
            >
              <div style={{ fontSize: 11.5, color: 'var(--mut)', fontWeight: 600 }}>🎯 ส่งงานตรงเวลา</div>
              <div style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 2px', color: card.onTimeRate >= 80 ? '#34c759' : 'var(--txt)' }}>
                {card.onTimeRate}%
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--mut)' }}>
                {card.onTimeCompleted} จาก {card.totalCompleted} งาน
              </div>
            </div>

            {/* Metric 2: Turnaround Time */}
            <div
              style={{
                padding: '14px',
                borderRadius: 14,
                background: 'rgba(120, 120, 128, 0.04)',
                border: '1px solid var(--line)',
              }}
            >
              <div style={{ fontSize: 11.5, color: 'var(--mut)', fontWeight: 600 }}>⚡ เวลาเฉลี่ยต่อชิ้น</div>
              <div style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 2px', color: 'var(--pri)' }}>
                {card.avgTurnaroundDays} <span style={{ fontSize: 13, fontWeight: 600 }}>วัน</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--mut)' }}>
                ความเร็วในการปิดงาน
              </div>
            </div>

            {/* Metric 3: Total Completed */}
            <div
              style={{
                padding: '14px',
                borderRadius: 14,
                background: 'rgba(120, 120, 128, 0.04)',
                border: '1px solid var(--line)',
              }}
            >
              <div style={{ fontSize: 11.5, color: 'var(--mut)', fontWeight: 600 }}>📦 งานสำเร็จรวม</div>
              <div style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 2px', color: '#10b981' }}>
                {card.totalCompleted} <span style={{ fontSize: 13, fontWeight: 600 }}>งาน</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--mut)' }}>
                จากทั้งหมด {card.totalAssigned} งาน ({card.completionRate}%)
              </div>
            </div>

            {/* Metric 4: Urgent Tasks Done */}
            <div
              style={{
                padding: '14px',
                borderRadius: 14,
                background: 'rgba(120, 120, 128, 0.04)',
                border: '1px solid var(--line)',
              }}
            >
              <div style={{ fontSize: 11.5, color: 'var(--mut)', fontWeight: 600 }}>👑 งานด่วนที่ปิดได้</div>
              <div style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 2px', color: '#ff3b30' }}>
                {card.highPriorityClosed} <span style={{ fontSize: 13, fontWeight: 600 }}>งาน</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--mut)' }}>
                งานระดับความสำคัญสูง
              </div>
            </div>
          </div>

          {/* Strengths & Highlights */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              background: 'rgba(0, 113, 227, 0.04)',
              border: '1px solid rgba(0, 113, 227, 0.15)',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pri)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <SparklesIcon size={14} color="var(--pri)" />
              <span>จุดเด่นและสมรรถนะการทำงาน (Key Strengths)</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {card.strengths.map(str => (
                <span
                  key={str}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: 'var(--card-solid)',
                    border: '1px solid var(--line)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--txt)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  {str}
                </span>
              ))}
            </div>
          </div>

          {/* Standout Completed Tasks */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--txt)' }}>
              ผลงานเด่นที่ปิดสำเร็จล่าสุด ({completedByMember.length} ชิ้น)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {completedByMember.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--mut)', fontSize: 12.5, borderRadius: 10, background: 'rgba(120, 120, 128, 0.04)' }}>
                  ยังไม่มีงานที่ปิดสำเร็จในช่วงนี้
                </div>
              ) : (
                completedByMember.map(t => (
                  <div
                    key={t.id}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: 'rgba(120, 120, 128, 0.04)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12.5,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckIcon size={13} color="var(--ok)" />
                      <span style={{ fontWeight: 600 }}>{t.title}</span>
                    </div>
                    {t.doneAt && (
                      <span style={{ fontSize: 11, color: 'var(--mut)' }}>
                        เสร็จเมื่อ {new Date(t.doneAt).toLocaleDateString('th-TH')}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={handleCopySummary}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {copied ? <CheckIcon size={14} color="var(--ok)" /> : <CopyIcon size={14} />}
            <span>{copied ? 'คัดลอกสรุปแล้ว!' : 'คัดลอกสรุปส่ง LINE/Email'}</span>
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn sm"
              onClick={handlePrint}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>🖨️ พิมพ์ / PDF</span>
            </button>
            <button className="btn ghost" onClick={onClose}>
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
