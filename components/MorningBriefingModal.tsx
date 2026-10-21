'use client';

import React, { useState, useEffect } from 'react';
import { usePlanner } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { useToday } from '@/lib/hooks';
import { visibleOn, eventsOn } from '@/lib/selectors';
import { thDate } from '@/lib/utils';
import { PRIORITY, type Task } from '@/lib/types';
import { AvatarIcon } from './Avatars';
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  FlagIcon,
  UsersIcon,
  SparklesIcon,
  SunIcon,
} from './Icons';

interface MorningBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewTodayTasks: () => void;
}

const PRODUCTIVITY_TIPS = [
  'การจัดลำดับงานสำคัญที่สุด 3 ชิ้นแรกในแต่ละวัน ช่วยให้งานสำเร็จลุล่วงได้เร็วขึ้น 40% ✨',
  'อย่าลืมพักสายตา 5 นาที ทุกๆ 50 นาทีของการทำงาน เพื่อรักษาความสดชื่นและสมาธิ ☕',
  'การแบ่งงานใหญ่เป็นชิ้นย่อย (Subtasks) ช่วยลดความกังวลและทำให้เริ่มลงมือทำได้ทันใจ 🎯',
  'ปิดงานยากก่อนเที่ยงวัน จะช่วยให้ช่วงบ่ายของคุณผ่อนคลายและมีประสิทธิภาพสูงสุด 🚀',
  'การสื่อสารและอัปเดตสถานะงานสั้นๆ ให้ทีมรับรู้ ช่วยประหยัดเวลาประชุมได้มหาศาล 💬',
  'โฟกัสทำงานทีละหนึ่งอย่าง (Single-tasking) ได้ผลลัพธ์ที่ดีกว่า Multitasking เสมอ 🧠',
];

export default function MorningBriefingModal({
  isOpen,
  onClose,
  onViewTodayTasks,
}: MorningBriefingModalProps) {
  const { currentUser, teamMembers, currentTeam } = useAuth();
  const s = usePlanner();
  const today = useToday();
  const [dontShowAgainToday, setDontShowAgainToday] = useState(true);

  if (!isOpen) return null;

  // Determine greeting based on current hour
  const currentHour = new Date().getHours();
  let greetingTime = 'สวัสดีตอนเช้า';
  let greetingEmoji = '🌅';
  if (currentHour >= 12 && currentHour < 17) {
    greetingTime = 'สวัสดีตอนบ่าย';
    greetingEmoji = '☀️';
  } else if (currentHour >= 17 || currentHour < 5) {
    greetingTime = 'สวัสดีตอนเย็น';
    greetingEmoji = '🌙';
  }

  // Today's tasks
  const allTodayTasks = visibleOn(s, today);
  const myTasks = allTodayTasks.filter(t => {
    if (t.assigneeIds && t.assigneeIds.length > 0) {
      return t.assigneeIds.includes(currentUser?.id || '');
    }
    return t.userId === currentUser?.id;
  });

  const myDoneTasks = myTasks.filter(t => t.done);
  const myPendingTasks = myTasks.filter(t => !t.done);
  const myHighPriorityTasks = myPendingTasks.filter(t => t.priority === 'high');

  // Today's events: Leaves and Holidays
  const todayEvents = eventsOn(s, today);
  const leavesToday = todayEvents.filter(e => e.type === 'leave');
  const holidaysToday = todayEvents.filter(e => e.type === 'holiday');

  // Productivity Tip of the Day
  const tipIndex = new Date().getDate() % PRODUCTIVITY_TIPS.length;
  const tipOfTheDay = PRODUCTIVITY_TIPS[tipIndex];

  const handleStartWorking = () => {
    if (dontShowAgainToday) {
      localStorage.setItem('wp_last_briefing_date', today);
    }
    onViewTodayTasks();
    onClose();
  };

  const handleClose = () => {
    if (dontShowAgainToday) {
      localStorage.setItem('wp_last_briefing_date', today);
    }
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={handleClose}
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        zIndex: 9999,
      }}
    >
      <div
        className="card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          background: 'var(--card-solid)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28), 0 0 0 1px var(--line)',
          borderRadius: 22,
          padding: 0,
          overflow: 'hidden',
          animation: 'modalSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* macOS Window Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--line)',
            background: 'rgba(120, 120, 128, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="macos-traffic-lights" aria-hidden="true">
              <span className="macos-traffic-dot red" onClick={handleClose} style={{ cursor: 'pointer' }} />
              <span className="macos-traffic-dot yellow" />
              <span className="macos-traffic-dot green" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--mut)', marginLeft: 6 }}>
              สรุปภาพรวมประจำวัน • Morning Briefing
            </span>
          </div>

          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--pri)',
              background: 'var(--pri-l)',
              padding: '3px 10px',
              borderRadius: 999,
            }}
          >
            {thDate(today)}
          </span>
        </div>

        {/* Content Container */}
        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '82vh', overflowY: 'auto' }}>
          {/* Hero Greeting Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <AvatarIcon id={currentUser?.avatarId} size={48} />
            <div>
              <h2 style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--txt)' }}>
                {greetingTime}ครับ, คุณ{currentUser?.name || 'สมาชิก'} {greetingEmoji}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--mut)' }}>
                ยินดีต้อนรับสู่ห้องทำงานของทีม <b>{currentTeam?.name || 'Work Planner'}</b> พร้อมลุยงานวันนี้ไปด้วยกันครับ
              </p>
            </div>
          </div>

          {/* Quick Metrics Cards (Apple Inset Grid) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
            }}
          >
            {/* Card 1: My Tasks Today */}
            <div
              style={{
                borderRadius: 14,
                padding: '14px 16px',
                background: 'rgba(0, 113, 227, 0.06)',
                border: '1px solid rgba(0, 113, 227, 0.18)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pri)' }}>งานของคุณวันนี้</span>
                <ClockIcon size={15} color="var(--pri)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--txt)', letterSpacing: '-0.03em' }}>
                {myTasks.length} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--mut)' }}>งาน</span>
              </div>
              <small style={{ fontSize: 11, color: 'var(--mut)' }}>
                {myPendingTasks.length > 0 ? `รอดำเนินการ ${myPendingTasks.length} งาน` : 'ทำเสร็จหมดแล้ว 🎉'}
              </small>
            </div>

            {/* Card 2: High Priority Tasks */}
            <div
              style={{
                borderRadius: 14,
                padding: '14px 16px',
                background: myHighPriorityTasks.length > 0 ? 'rgba(255, 59, 48, 0.06)' : 'rgba(52, 199, 89, 0.06)',
                border: myHighPriorityTasks.length > 0 ? '1px solid rgba(255, 59, 48, 0.2)' : '1px solid rgba(52, 199, 89, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: myHighPriorityTasks.length > 0 ? 'var(--red)' : '#34c759' }}>
                  งานด่วนสำคัญ (High)
                </span>
                <FlagIcon size={15} color={myHighPriorityTasks.length > 0 ? 'var(--red)' : '#34c759'} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--txt)', letterSpacing: '-0.03em' }}>
                {myHighPriorityTasks.length} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--mut)' }}>งาน</span>
              </div>
              <small style={{ fontSize: 11, color: 'var(--mut)' }}>
                {myHighPriorityTasks.length > 0 ? 'ควรเริ่มทำเป็นลำดับแรก' : 'ไม่มีงานด่วนค้างอยู่ ✨'}
              </small>
            </div>

            {/* Card 3: Team Leaves / Availability */}
            <div
              style={{
                borderRadius: 14,
                padding: '14px 16px',
                background: leavesToday.length > 0 ? 'rgba(255, 149, 0, 0.08)' : 'rgba(120, 120, 128, 0.06)',
                border: '1px solid var(--line)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: leavesToday.length > 0 ? '#f59e0b' : 'var(--mut)' }}>
                  การลาของเพื่อนในทีม
                </span>
                <UsersIcon size={15} color={leavesToday.length > 0 ? '#f59e0b' : 'var(--mut)'} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--txt)', letterSpacing: '-0.03em' }}>
                {leavesToday.length} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--mut)' }}>คน</span>
              </div>
              <small style={{ fontSize: 11, color: 'var(--mut)' }}>
                {leavesToday.length > 0 ? 'มีเพื่อนลาวันนี้' : 'ทุกคนพร้อมปฏิบัติงาน 💯'}
              </small>
            </div>
          </div>

          {/* Today's Leaves Detail (if any) */}
          {(leavesToday.length > 0 || holidaysToday.length > 0) && (
            <div
              style={{
                borderRadius: 14,
                padding: '12px 14px',
                background: 'rgba(255, 149, 0, 0.06)',
                border: '1px solid rgba(255, 149, 0, 0.18)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🌴</span>
                <span>ประกาศวันหยุดและการลาของทีมวันนี้</span>
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {holidaysToday.map(h => (
                  <span
                    key={h.id}
                    className="tag t-holiday"
                    style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999 }}
                  >
                    🎉 วันหยุด: {h.title}
                  </span>
                ))}
                {leavesToday.map(l => (
                  <span
                    key={l.id}
                    className="tag t-leave"
                    style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    {l.userAvatar && <AvatarIcon id={l.userAvatar} size={14} />}
                    <span>{l.userName || 'สมาชิก'}: {l.title}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Today's Urgent Tasks Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FlagIcon size={14} color="var(--pri)" />
                <span>งานสำคัญที่แนะนำให้ทำวันนี้ ({myPendingTasks.length} งาน)</span>
              </span>
              <button
                type="button"
                onClick={handleStartWorking}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 12,
                  color: 'var(--pri)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                ดูทั้งหมด →
              </button>
            </div>

            {myPendingTasks.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  borderRadius: 12,
                  background: 'rgba(52, 199, 89, 0.08)',
                  border: '1px solid rgba(52, 199, 89, 0.2)',
                  textAlign: 'center',
                  fontSize: 13,
                  color: '#2e7d32',
                  fontWeight: 600,
                }}
              >
                🎉 ยอดเยี่ยมมาก! คุณไม่มีงานค้างสำหรับวันนี้
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {myPendingTasks.slice(0, 3).map(t => {
                  const pri = PRIORITY[t.priority];
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: 'rgba(120, 120, 128, 0.04)',
                        border: '1px solid var(--line)',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: pri.color,
                            flexShrink: 0,
                          }}
                          title={`ความสำคัญ: ${pri.label}`}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </span>
                        {t.time && (
                          <span style={{ fontSize: 11, color: 'var(--mut)', background: 'rgba(120, 120, 128, 0.08)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
                            {t.time}
                          </span>
                        )}
                        {t.detail && (
                          <small style={{ color: 'var(--mut)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            – {t.detail}
                          </small>
                        )}
                      </div>

                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: `${pri.color}15`,
                          color: pri.color,
                          flexShrink: 0,
                        }}
                      >
                        {pri.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Daily Productivity Tip Card */}
          <div
            style={{
              borderRadius: 14,
              padding: '12px 16px',
              background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.05), rgba(175, 82, 222, 0.05))',
              border: '1px solid rgba(0, 113, 227, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <SparklesIcon size={18} color="var(--pri)" />
            <div style={{ fontSize: 12.5, color: 'var(--txt)', lineHeight: 1.45 }}>
              <b>ข้อคิดประจำวัน:</b> {tipOfTheDay}
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 10,
              borderTop: '1px solid var(--line)',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--mut)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={dontShowAgainToday}
                onChange={e => setDontShowAgainToday(e.target.checked)}
                style={{ accentColor: 'var(--pri)', margin: 0, width: 14, height: 14 }}
              />
              <span style={{ whiteSpace: 'nowrap' }}>ไม่แสดงหน้านี้อัตโนมัติอีกในวันนี้</span>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className="btn sm"
                onClick={handleClose}
                style={{
                  borderRadius: 999,
                  padding: '6px 14px',
                  fontSize: 12,
                  background: 'rgba(120, 120, 128, 0.08)',
                  color: 'var(--txt)',
                  boxShadow: 'none',
                }}
              >
                ปิด
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleStartWorking}
                style={{
                  borderRadius: 999,
                  padding: '7px 18px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>เริ่มลุยงานกันเลย 🚀</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
