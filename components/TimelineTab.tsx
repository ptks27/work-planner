'use client';

import React, { useState, useMemo } from 'react';
import { usePlanner } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { useToday } from '@/lib/hooks';
import { Task, Priority, TaskStatus, PRIORITY, STATUS_CONFIG } from '@/lib/types';
import { AvatarIcon } from './Avatars';
import EditTaskModal from './EditTaskModal';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  FilterIcon,
  CheckIcon,
  ClockIcon,
  SparklesIcon,
} from './Icons';
import { thDate, TH_DOW, TH_MONTHS } from '@/lib/utils';

// คำนวณช่วงวันที่ (Array of date strings YYYY-MM-DD)
function generateDateRange(startDateStr: string, daysCount: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDateStr);
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dates.push(dStr);
  }
  return dates;
}

export default function TimelineTab() {
  const { tasks, updateTask } = usePlanner();
  const { teamMembers, currentUser } = useAuth();
  const today = useToday();

  // วันเริ่มต้นของไทม์ไลน์ (เริ่มต้นที่ 7 วันก่อนหน้าวันนี้)
  const [baseDate, setBaseDate] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [daysCount, setDaysCount] = useState<number>(21); // แสดง 21 วัน (3 สัปดาห์)
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterMember, setFilterMember] = useState<string>('all');
  const [hideDone, setHideDone] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const timelineDates = useMemo(
    () => generateDateRange(baseDate, daysCount),
    [baseDate, daysCount]
  );

  const rangeStart = timelineDates[0];
  const rangeEnd = timelineDates[timelineDates.length - 1];

  // กรองงาน
  const visibleTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.hidden) return false;
      if (hideDone && (t.done || t.status === 'done')) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterMember !== 'all') {
        const assignees = t.assigneeIds || (t.userId ? [t.userId] : []);
        if (!assignees.includes(filterMember)) return false;
      }

      // เช็คว่าอยู่ในช่วงวันที่แสดงหรือไม่
      const taskStart = t.date;
      const taskEnd = t.endDate || t.date;
      return taskEnd >= rangeStart && taskStart <= rangeEnd;
    });
  }, [tasks, hideDone, filterPriority, filterMember, rangeStart, rangeEnd]);

  // เลื่อนช่วงวัน
  const handleShiftDays = (days: number) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    setBaseDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  };

  const handleResetToday = () => {
    const d = new Date(today);
    d.setDate(d.getDate() - 5);
    setBaseDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  };

  // คำนวณตำแหน่งแถบ Gantt Bar
  const getGanttBarStyle = (t: Task) => {
    const taskStart = t.date;
    const taskEnd = t.endDate || t.date;

    const startIndex = timelineDates.indexOf(taskStart);
    const endIndex = timelineDates.indexOf(taskEnd);

    // ถ้าเริ่มก่อนหน้าช่วงที่แสดง ให้ปัดไปที่ขอบซ้ายสุด (0)
    const leftIndex = startIndex >= 0 ? startIndex : taskStart < rangeStart ? 0 : -1;
    // ถ้าสิ้นสุดหลังช่วงที่แสดง ให้ปัดไปที่ขอบขวาสุด
    const rightIndex = endIndex >= 0 ? endIndex : taskEnd > rangeEnd ? timelineDates.length - 1 : -1;

    if (leftIndex === -1 && rightIndex === -1) return null;

    const span = Math.max(1, (rightIndex >= 0 ? rightIndex : leftIndex) - (leftIndex >= 0 ? leftIndex : 0) + 1);

    const leftPct = (Math.max(0, leftIndex) / daysCount) * 100;
    const widthPct = (span / daysCount) * 100;

    let bg = 'linear-gradient(135deg, #0284c7, #0071e3)';
    if (t.done || t.status === 'done') {
      bg = 'linear-gradient(135deg, #10b981, #059669)';
    } else if (t.priority === 'high') {
      bg = 'linear-gradient(135deg, #ef4444, #dc2626)';
    } else if (t.priority === 'medium') {
      bg = 'linear-gradient(135deg, #f59e0b, #d97706)';
    }

    return {
      left: `${leftPct}%`,
      width: `${Math.min(100 - leftPct, widthPct)}%`,
      background: bg,
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Header Card */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.15), rgba(175, 82, 222, 0.15))',
              color: 'var(--pri)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--txt)' }}>
              ไทม์ไลน์งาน & แผนงานโครงการ (Roadmap)
            </h2>
            <small style={{ color: 'var(--mut)', fontSize: 12 }}>
              มุมมองแกนต์ชาร์ตแสดงระยะเวลาของแต่ละงาน ภาพรวมโครงการทั้งสัปดาห์และเดือน
            </small>
          </div>
        </div>

        {/* Date Navigator Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => handleShiftDays(-7)}
            style={{ borderRadius: 999, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <ChevronLeftIcon size={14} /> <span>-7 วัน</span>
          </button>
          <button
            type="button"
            className="btn sm"
            onClick={handleResetToday}
            style={{ borderRadius: 999, padding: '6px 14px', fontWeight: 600 }}
          >
            วันนี้ (Today)
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => handleShiftDays(7)}
            style={{ borderRadius: 999, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span>+7 วัน</span> <ChevronRightIcon size={14} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          padding: '8px 4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Member Filter */}
          <select
            value={filterMember}
            onChange={e => setFilterMember(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid var(--line)',
              background: 'var(--card-solid)',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--txt)',
              cursor: 'pointer',
            }}
          >
            <option value="all">👥 สมาชิกทุกคน ({teamMembers.length})</option>
            {teamMembers.map(m => (
              <option key={m.userId} value={m.userId}>
                {m.name} {m.userId === currentUser?.id ? '(คุณ)' : ''}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as any)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid var(--line)',
              background: 'var(--card-solid)',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--txt)',
              cursor: 'pointer',
            }}
          >
            <option value="all">🎯 ทุกความสำคัญ</option>
            <option value="high">🔴 สำคัญสูง (High)</option>
            <option value="medium">🟡 สำคัญปานกลาง (Medium)</option>
            <option value="low">🟢 สำคัญทั่วไป (Low)</option>
          </select>

          {/* Hide Done Toggle */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12.5,
              color: 'var(--txt)',
              cursor: 'pointer',
              marginLeft: 6,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              userSelect: 'none',
              padding: '6px 14px',
              borderRadius: 999,
              background: hideDone ? 'rgba(0, 113, 227, 0.1)' : 'var(--card-solid)',
              border: `1px solid ${hideDone ? 'var(--pri)' : 'var(--line)'}`,
              transition: 'all 0.15s ease',
            }}
          >
            <input
              type="checkbox"
              checked={hideDone}
              onChange={e => setHideDone(e.target.checked)}
              style={{
                width: 15,
                height: 15,
                accentColor: 'var(--pri)',
                margin: 0,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
            <span style={{ whiteSpace: 'nowrap', fontWeight: hideDone ? 700 : 500 }}>
              ซ่อนงานที่เสร็จแล้ว
            </span>
          </label>
        </div>

        <div style={{ fontSize: 12, color: 'var(--mut)', fontWeight: 600 }}>
          แสดงงาน {visibleTasks.length} รายการ
        </div>
      </div>

      {/* Main Gantt Grid Card */}
      <div
        className="card"
        style={{
          padding: 0,
          overflowX: 'auto',
          borderRadius: 18,
          border: '1px solid var(--line)',
        }}
      >
        <div style={{ minWidth: 900 }}>
          {/* Header Row: Column Days */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'var(--gantt-title-col, 260px) 1fr',
              borderBottom: '1px solid var(--line)',
              background: 'rgba(120, 120, 128, 0.04)',
            }}
          >
            {/* Left Header */}
            <div
              style={{
                position: 'sticky',
                left: 0,
                zIndex: 6,
                background: 'var(--card-solid)',
                padding: '12px 16px',
                fontWeight: 700,
                fontSize: 13,
                color: 'var(--mut)',
                borderRight: '1px solid var(--line)',
              }}
            >
              รายการงานโครงการ
            </div>

            {/* Right Days Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${daysCount}, 1fr)`,
                textAlign: 'center',
              }}
            >
              {timelineDates.map(dStr => {
                const d = new Date(dStr);
                const dayNum = d.getDate();
                const dow = TH_DOW[d.getDay()] || '';
                const isToday = dStr === today;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                return (
                  <div
                    key={dStr}
                    style={{
                      padding: '8px 2px',
                      fontSize: 11,
                      borderRight: '1px solid var(--line)',
                      background: isToday
                        ? 'rgba(0, 113, 227, 0.1)'
                        : isWeekend
                        ? 'rgba(120, 120, 128, 0.03)'
                        : 'transparent',
                      color: isToday ? 'var(--pri)' : isWeekend ? 'var(--mut)' : 'var(--txt)',
                      fontWeight: isToday ? 800 : 600,
                    }}
                  >
                    <div>{dow}</div>
                    <div style={{ fontSize: 13, marginTop: 1 }}>{dayNum}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Rows */}
          {visibleTasks.length === 0 ? (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: 'var(--mut)',
                fontSize: 14,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
              <b>ไม่มีงานในช่วงเวลานี้</b>
              <p style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                ลองเลื่อนช่วงวันที่ หรือสร้างงานใหม่ที่มีวันเริ่มต้นและวันสิ้นสุด
              </p>
            </div>
          ) : (
            visibleTasks.map(t => {
              const barStyle = getGanttBarStyle(t);
              const assignees = t.assignees || [];
              const subCount = t.subtasks?.length || 0;
              const subDone = t.subtasks?.filter(s => s.done).length || 0;

              return (
                <div
                  key={t.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'var(--gantt-title-col, 260px) 1fr',
                    borderBottom: '1px solid var(--line)',
                    minHeight: 46,
                    alignItems: 'center',
                    transition: 'background 0.15s ease',
                  }}
                  className="timeline-task-row"
                >
                  {/* Left Column: Task Name & Assignee */}
                  <div
                    onClick={() => setEditingTask(t)}
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 5,
                      background: 'var(--card-solid)',
                      padding: '8px 16px',
                      borderRight: '1px solid var(--line)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      overflow: 'hidden',
                    }}
                    title="คลิกเพื่อแก้ไขงาน"
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: PRIORITY[t.priority].color,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: t.done ? 'var(--mut)' : 'var(--txt)',
                          textDecoration: t.done ? 'line-through' : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.title}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--mut)', marginTop: 1 }}>
                        {t.date} {t.endDate ? `→ ${t.endDate}` : ''}
                      </div>
                    </div>

                    {/* Assignee Avatar */}
                    <div style={{ flexShrink: 0 }}>
                      <AvatarIcon id={t.userAvatar || 'dev_boy'} size={24} />
                    </div>
                  </div>

                  {/* Right Timeline Canvas (Gantt Bar) */}
                  <div
                    style={{
                      position: 'relative',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px 0',
                    }}
                  >
                    {/* Background Day Column Grid Lines */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'grid',
                        gridTemplateColumns: `repeat(${daysCount}, 1fr)`,
                        pointerEvents: 'none',
                      }}
                    >
                      {timelineDates.map(dStr => (
                        <div
                          key={dStr}
                          style={{
                            borderRight: '1px solid rgba(120, 120, 128, 0.08)',
                            background: dStr === today ? 'rgba(0, 113, 227, 0.04)' : 'transparent',
                          }}
                        />
                      ))}
                    </div>

                    {/* Gantt Bar Pill */}
                    {barStyle && (
                      <div
                        onClick={() => setEditingTask(t)}
                        style={{
                          position: 'relative',
                          height: 28,
                          borderRadius: 8,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0 8px',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          transition: 'transform 0.15s ease',
                          zIndex: 2,
                          ...barStyle,
                        }}
                        title={`${t.title} (${t.date} ถึง ${t.endDate || t.date})`}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.title}
                        </span>

                        {subCount > 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              background: 'rgba(0,0,0,0.2)',
                              padding: '1px 5px',
                              borderRadius: 4,
                              marginLeft: 4,
                              flexShrink: 0,
                            }}
                          >
                            ✓ {subDone}/{subCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(id, patch, actor) => {
            updateTask(id, patch, actor);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}
