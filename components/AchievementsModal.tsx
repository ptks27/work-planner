'use client';

import React from 'react';
import { usePlanner } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { useToday } from '@/lib/hooks';
import { computeActivityStats, type Badge } from '@/lib/achievements';
import { triggerConfetti, playCompletionSound } from '@/lib/audio';
import { SparklesIcon, CheckIcon, FireIcon } from './Icons';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AchievementsModal({
  isOpen,
  onClose,
}: AchievementsModalProps) {
  const { currentUser } = useAuth();
  const s = usePlanner();
  const today = useToday();

  if (!isOpen) return null;

  const stats = computeActivityStats(s.tasks, currentUser?.id, today);

  const handleBadgeClick = (b: Badge) => {
    if (b.unlocked) {
      triggerConfetti();
      playCompletionSound();
    }
  };

  // Day names for the current week streak row
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);

  const weekDayLabels = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
  const weekDays = weekDayLabels.map((label, idx) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + idx);
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isActive = stats.activeDates.has(dStr);
    const isToday = dStr === today;
    const isFuture = d > now;
    return { label, dStr, isActive, isToday, isFuture };
  });

  // Calculate SVG Ring Parameters
  const size = 160;
  const strokeWidth = 12;

  // Ring 1 (Red / Pink: Today)
  const r1 = 66;
  const circ1 = 2 * Math.PI * r1;
  const offset1 = circ1 - (stats.todayPct / 100) * circ1;

  // Ring 2 (Green: Week)
  const r2 = 50;
  const circ2 = 2 * Math.PI * r2;
  const offset2 = circ2 - (stats.weekPct / 100) * circ2;

  // Ring 3 (Blue: Overall)
  const totalRatio = stats.totalCompleted > 0 ? Math.min(100, stats.totalCompleted * 5) : 0;
  const r3 = 34;
  const circ3 = 2 * Math.PI * r3;
  const offset3 = circ3 - (totalRatio / 100) * circ3;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
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
          maxWidth: 680,
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
              <span className="macos-traffic-dot red" onClick={onClose} style={{ cursor: 'pointer' }} />
              <span className="macos-traffic-dot yellow" />
              <span className="macos-traffic-dot green" />
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--txt)', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
              <span>🔥</span>
              <span>วงแหวนกิจกรรม & เหรียญความสำเร็จ (Activity & Badges)</span>
            </span>
          </div>

          <button
            type="button"
            className="btn sm"
            onClick={onClose}
            style={{ borderRadius: 999, padding: '4px 12px', fontSize: 11.5 }}
          >
            ปิด
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', maxHeight: '82vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top Hero: Apple Activity Rings & Streak Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '170px 1fr',
              gap: 20,
              alignItems: 'center',
              padding: '18px 20px',
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(255, 45, 85, 0.05), rgba(52, 199, 89, 0.05), rgba(0, 113, 227, 0.05))',
              border: '1px solid var(--line)',
            }}
          >
            {/* Concentric SVG Rings */}
            <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
              <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {/* Ring 1: Today background & value */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r1}
                  stroke="rgba(255, 45, 85, 0.18)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r1}
                  stroke="#ff2d55"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circ1}
                  strokeDashoffset={offset1}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />

                {/* Ring 2: Week background & value */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r2}
                  stroke="rgba(52, 199, 89, 0.18)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r2}
                  stroke="#34c759"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circ2}
                  strokeDashoffset={offset2}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />

                {/* Ring 3: Total Completed */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r3}
                  stroke="rgba(0, 113, 227, 0.18)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r3}
                  stroke="#0071e3"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circ3}
                  strokeDashoffset={offset3}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              </svg>

              {/* Center Ring Info */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <span style={{ fontSize: 16 }}>{stats.allRingsClosed ? '🎉' : '🔥'}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--txt)' }}>{stats.todayPct}%</span>
              </div>
            </div>

            {/* Streak & Ring Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 22 }}>🔥</span>
                  <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--txt)' }}>
                    {stats.currentStreak > 0
                      ? `Streak ปิดงานต่อเนื่อง ${stats.currentStreak} วัน!`
                      : 'เริ่มสะสม Streak วันนี้เลย!'}
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--mut)' }}>
                  สถิติต่อเนื่องสูงสุด: <b>{stats.longestStreak} วัน</b> · เคลียร์งานสะสมทั้งหมด: <b>{stats.totalCompleted} งาน</b>
                </p>
              </div>

              {/* 7 Days of the Week Dots */}
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {weekDays.map(day => (
                  <div
                    key={day.dStr}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      flex: 1,
                    }}
                  >
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: day.isToday ? 'var(--pri)' : 'var(--mut)' }}>
                      {day.label}
                    </span>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        background: day.isActive
                          ? '#34c759'
                          : day.isToday
                          ? 'var(--pri-l)'
                          : 'rgba(120, 120, 128, 0.08)',
                        color: day.isActive ? '#ffffff' : day.isToday ? 'var(--pri)' : 'var(--mut)',
                        border: day.isToday ? '2px solid var(--pri)' : '1px solid transparent',
                        boxShadow: day.isActive ? '0 2px 6px rgba(52, 199, 89, 0.35)' : 'none',
                      }}
                      title={`${day.dStr}: ${day.isActive ? 'มีงานที่ทำเสร็จแล้ว ✅' : 'ยังไม่มีงานเสร็จ'}`}
                    >
                      {day.isActive ? <CheckIcon size={12} strokeWidth={3} /> : ''}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ring Metrics Legend */}
              <div style={{ display: 'flex', gap: 14, fontSize: 11.5, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff2d55' }} />
                  <span>วันนี้: <b>{stats.todayDone}/{stats.todayTotal} งาน ({stats.todayPct}%)</b></span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34c759' }} />
                  <span>สัปดาห์นี้: <b>{stats.weekPct}%</b></span>
                </span>
              </div>
            </div>
          </div>

          {/* Badges Gallery Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SparklesIcon size={16} color="var(--pri)" />
                <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--txt)' }}>
                  เหรียญเกียรติยศ (Team Medallions)
                </h4>
              </div>
              <span style={{ fontSize: 12, color: 'var(--mut)', fontWeight: 600 }}>
                ปลดล็อกแล้ว {stats.badges.filter(b => b.unlocked).length} / {stats.badges.length} เหรียญ
              </span>
            </div>

            {/* Badges Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              {stats.badges.map(b => (
                <div
                  key={b.id}
                  onClick={() => handleBadgeClick(b)}
                  style={{
                    borderRadius: 16,
                    padding: '14px',
                    background: b.unlocked
                      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(245, 245, 247, 0.9))'
                      : 'rgba(120, 120, 128, 0.05)',
                    border: b.unlocked ? `1.5px solid ${b.color}` : '1px solid var(--line)',
                    boxShadow: b.unlocked ? `0 4px 16px ${b.color}25` : 'none',
                    opacity: b.unlocked ? 1 : 0.65,
                    cursor: b.unlocked ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={e => {
                    if (b.unlocked) e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    if (b.unlocked) e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  title={b.unlocked ? 'คลิกเพื่อฉลองความสำเร็จ 🎉' : b.description}
                >
                  {/* Badge Icon Medallion */}
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      background: b.unlocked ? `${b.color}15` : 'rgba(120, 120, 128, 0.1)',
                      border: b.unlocked ? `1px solid ${b.color}40` : '1px solid transparent',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 24,
                      marginBottom: 8,
                      filter: b.unlocked ? 'none' : 'grayscale(1)',
                    }}
                  >
                    {b.icon}
                  </div>

                  <b style={{ fontSize: 13, color: b.unlocked ? 'var(--txt)' : 'var(--mut)', marginBottom: 2 }}>
                    {b.title}
                  </b>
                  <small style={{ fontSize: 10.5, color: b.color, fontWeight: 700, marginBottom: 4 }}>
                    {b.subtitle}
                  </small>
                  <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--mut)', lineHeight: 1.35 }}>
                    {b.description}
                  </p>

                  {/* Progress Pill / Unlocked Tag */}
                  <div style={{ marginTop: 'auto', width: '100%' }}>
                    {b.unlocked ? (
                      <span
                        style={{
                          display: 'inline-block',
                          width: '100%',
                          padding: '3px 0',
                          borderRadius: 999,
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: `${b.color}18`,
                          color: b.color,
                        }}
                      >
                        ✓ สำเร็จแล้ว!
                      </span>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--mut)', marginBottom: 3 }}>
                          <span>ความคืบหน้า</span>
                          <span>{b.progressText}</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(120, 120, 128, 0.15)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${b.progressPct}%`, background: b.color, borderRadius: 999 }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
