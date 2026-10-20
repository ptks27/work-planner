'use client';

import React, { useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import '@/lib/chart';
import { usePlanner } from '@/lib/store';
import { useToday } from '@/lib/hooks';
import { visibleOn, eventsOn } from '@/lib/selectors';
import { eachDay, getRange, thDate, parse, type Mode } from '@/lib/utils';
import { PRIORITY, PRIORITIES, PRESET_TAGS, getTagStyle } from '@/lib/types';
import { useAuth } from '@/lib/authStore';
import { AvatarIcon } from './Avatars';
import {
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  CalendarIcon,
  UsersIcon,
  TagIcon,
  FlagIcon,
  SparklesIcon,
  FileTextIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from './Icons';
import ThaiDatePicker from './ThaiDatePicker';
import ExecutiveReportModal from './ExecutiveReportModal';

const MODE_TITLE: Record<Mode, string> = {
  day: 'สรุปงานรายวัน',
  week: 'สรุปงานรายสัปดาห์',
  month: 'สรุปงานรายเดือน',
};

const APPLE_TAG_COLORS = [
  '#0071e3', // Apple Blue
  '#af52de', // Apple Purple
  '#ff9500', // Apple Orange
  '#34c759', // Apple Green
  '#ff3b30', // Apple Red
  '#5856d6', // Apple Indigo
  '#00c7be', // Apple Teal
  '#32ade6', // Apple Cyan
  '#ff2d55', // Apple Pink
];

export default function DashboardTab() {
  const s = usePlanner();
  const { users, currentUser } = useAuth();
  const today = useToday();
  const [mode, setMode] = useState<Mode>('week');
  const [date, setDate] = useState(today);
  const [activeTagFilter, setActiveTagFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExecutiveReportOpen, setIsExecutiveReportOpen] = useState(false);
  const pageSize = 10;

  const handleModeChange = (m: Mode) => {
    setMode(m);
    setCurrentPage(1);
  };

  const handleDateChange = (d: string) => {
    setDate(d);
    setCurrentPage(1);
  };

  const handleTagFilterChange = (tg: string) => {
    setActiveTagFilter(tg);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (st: 'all' | 'pending' | 'done') => {
    setStatusFilter(st);
    setCurrentPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  const goDay = (d: string) => {
    setMode('day');
    setDate(d);
    setCurrentPage(1);
  };

  const [S, E] = getRange(mode, date);
  const days = eachDay(S, E).map(d => ({
    date: d,
    tasks: visibleOn(s, d),
  }));

  const uniqueTasksMap = new Map<string, (typeof days)[0]['tasks'][0] & { occurrenceDate: string }>();
  days.forEach(d => {
    d.tasks.forEach(t => {
      if (!uniqueTasksMap.has(t.id)) {
        uniqueTasksMap.set(t.id, { ...t, occurrenceDate: d.date });
      }
    });
  });
  const allTasks = Array.from(uniqueTasksMap.values());
  // เรียงลำดับงานตามวันที่และเวลา
  allTasks.sort((a, b) => {
    const da = a.occurrenceDate || a.date || '';
    const db = b.occurrenceDate || b.date || '';
    const dateComp = da.localeCompare(db);
    if (dateComp !== 0) return dateComp;
    return (a.time || '').localeCompare(b.time || '');
  });

  const doneTasks = allTasks.filter(t => t.done);
  const pendingTasks = allTasks.filter(t => !t.done);
  const completionRate = allTasks.length ? Math.round((doneTasks.length / allTasks.length) * 100) : 0;

  // 1. Tag Distribution Data
  const tagCounts: Record<string, number> = {};
  allTasks.forEach(t => {
    if (t.tags && t.tags.length > 0) {
      t.tags.forEach(tg => {
        const clean = tg.replace(/^#/, '');
        tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      });
    } else {
      tagCounts['ไม่มีแท็ก'] = (tagCounts['ไม่มีแท็ก'] || 0) + 1;
    }
  });

  const tagLabels = Object.keys(tagCounts);
  const tagData = Object.values(tagCounts);
  const tagBackgrounds = tagLabels.map((_, i) => APPLE_TAG_COLORS[i % APPLE_TAG_COLORS.length]);

  // 2. Team Member Workload Breakdown
  const memberList = Array.from(
    new Map(
      (users || [])
        .concat(currentUser ? [currentUser] : [])
        .map(u => [u.id, u])
    ).values()
  );

  const memberStats = memberList.map(member => {
    const memberTasks = allTasks.filter(t => {
      if (t.assigneeIds && t.assigneeIds.length > 0) {
        return t.assigneeIds.includes(member.id);
      }
      return t.userId === member.id;
    });
    const mDone = memberTasks.filter(t => t.done).length;
    const mTotal = memberTasks.length;
    const mPct = mTotal ? Math.round((mDone / mTotal) * 100) : 0;
    return {
      id: member.id,
      name: member.name,
      avatarId: member.avatarId,
      done: mDone,
      total: mTotal,
      pct: mPct,
    };
  }).filter(m => m.total > 0);

  // 3. Daily Velocity Chart Data
  const dailyLabels = days.map(d => {
    const x = parse(d.date);
    return `${x.getDate()}/${x.getMonth() + 1}`;
  });

  const dailyDoneData = days.map(d => d.tasks.filter(t => t.done).length);
  const dailyPendingData = days.map(d => d.tasks.filter(t => !t.done).length);

  // Filter tasks for bottom list (by tag, status, and search query)
  const filteredTaskList = allTasks.filter(t => {
    // 1. Tag filter
    const matchesTag =
      activeTagFilter === 'all' ||
      (t.tags && t.tags.some(tg => tg.replace(/^#/, '').toLowerCase() === activeTagFilter.replace(/^#/, '').toLowerCase()));

    // 2. Status filter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'done' ? t.done : !t.done);

    // 3. Search query
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      (t.detail && t.detail.toLowerCase().includes(q)) ||
      (t.userName && t.userName.toLowerCase().includes(q)) ||
      (t.tags && t.tags.some(tg => tg.toLowerCase().includes(q)));

    return matchesTag && matchesStatus && matchesSearch;
  });

  // Pagination calculations (max 10 tasks per page)
  const totalPages = Math.max(1, Math.ceil(filteredTaskList.length / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredTaskList.length);
  const paginatedTasks = filteredTaskList.slice(startIndex, endIndex);

  // Group paginated tasks by their date for clean day headers
  const groupedPageTasks: { date: string; tasks: typeof paginatedTasks }[] = [];
  paginatedTasks.forEach(task => {
    const taskDate = task.occurrenceDate || task.date;
    const lastGroup = groupedPageTasks[groupedPageTasks.length - 1];
    if (lastGroup && lastGroup.date === taskDate) {
      lastGroup.tasks.push(task);
    } else {
      groupedPageTasks.push({ date: taskDate, tasks: [task] });
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* macOS Header & Filter Bar */}
      <div className="card" style={{ padding: '16px 20px', borderRadius: 'var(--radius)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {/* Left: Title & Traffic lights */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="macos-traffic-lights" aria-hidden="true">
              <span className="macos-traffic-dot red" />
              <span className="macos-traffic-dot yellow" />
              <span className="macos-traffic-dot green" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ChartBarIcon size={18} color="var(--pri)" strokeWidth={2.5} />
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>
                แดชบอร์ดวิเคราะห์ผลงาน (Analytics)
              </h2>
            </div>
          </div>

          {/* Right: Cupertino Mode Segmented Control + Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Segmented Pill */}
            <div
              style={{
                display: 'inline-flex',
                background: 'rgba(120, 120, 128, 0.08)',
                padding: 3,
                borderRadius: 999,
                gap: 2,
              }}
            >
              <button
                type="button"
                onClick={() => handleModeChange('day')}
                style={{
                  border: 'none',
                  background: mode === 'day' ? 'var(--card-solid)' : 'transparent',
                  color: mode === 'day' ? 'var(--txt)' : 'var(--mut)',
                  borderRadius: 999,
                  padding: '5px 14px',
                  fontSize: 12.5,
                  fontWeight: mode === 'day' ? 600 : 500,
                  cursor: 'pointer',
                  boxShadow: mode === 'day' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                รายวัน
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('week')}
                style={{
                  border: 'none',
                  background: mode === 'week' ? 'var(--card-solid)' : 'transparent',
                  color: mode === 'week' ? 'var(--txt)' : 'var(--mut)',
                  borderRadius: 999,
                  padding: '5px 14px',
                  fontSize: 12.5,
                  fontWeight: mode === 'week' ? 600 : 500,
                  cursor: 'pointer',
                  boxShadow: mode === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                รายสัปดาห์
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('month')}
                style={{
                  border: 'none',
                  background: mode === 'month' ? 'var(--card-solid)' : 'transparent',
                  color: mode === 'month' ? 'var(--txt)' : 'var(--mut)',
                  borderRadius: 999,
                  padding: '5px 14px',
                  fontSize: 12.5,
                  fontWeight: mode === 'month' ? 600 : 500,
                  cursor: 'pointer',
                  boxShadow: mode === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                รายเดือน
              </button>
            </div>

            {/* Thai Date Picker */}
            <div style={{ width: 140 }}>
              <ThaiDatePicker
                value={date}
                onChange={val => val && handleDateChange(val)}
                style={{ margin: 0 }}
              />
            </div>

            {/* Today Quick Button */}
            <button
              className="btn sm"
              onClick={() => handleDateChange(today)}
              style={{
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: 12,
                background: 'rgba(120, 120, 128, 0.08)',
                color: 'var(--txt)',
                boxShadow: 'none',
              }}
            >
              วันนี้
            </button>
          </div>
        </div>

        {/* Range Label & Executive Report Button */}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--mut)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CalendarIcon size={14} color="var(--pri)" />
            <span>ช่วงเวลาวิเคราะห์: <b>{S === E ? thDate(S) : `${thDate(S)} – ${thDate(E)}`}</b> ({MODE_TITLE[mode]})</span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--mut)' }}>
              พบทั้งหมด {allTasks.length} งาน
            </span>
            <button
              type="button"
              onClick={() => setIsExecutiveReportOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #0071e3, #60a5fa)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 113, 227, 0.28)',
                transition: 'transform 0.15s ease',
              }}
              title="สร้างเอกสารสรุปผลงาน"
            >
              <FileTextIcon size={14} color="#ffffff" />
              <span>📄 สรุปรายงาน (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Stat Cards (Apple Health / Activity Ring Style) */}
      <div className="grid g4">
        {/* Card 1: Completion Ring */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, position: 'relative', flexShrink: 0 }}>
            <Doughnut
              data={{
                labels: ['เสร็จแล้ว', 'ยังค้าง'],
                datasets: [
                  {
                    data: [doneTasks.length, allTasks.length ? allTasks.length - doneTasks.length : 1],
                    backgroundColor: allTasks.length ? ['#34c759', 'rgba(120, 120, 128, 0.15)'] : ['rgba(120, 120, 128, 0.15)', 'rgba(120, 120, 128, 0.15)'],
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                cutout: '76%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                maintainAspectRatio: true,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: allTasks.length ? 'var(--txt)' : 'var(--mut)',
              }}
            >
              {allTasks.length ? `${completionRate}%` : '0%'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--mut)', fontWeight: 600 }}>อัตราสำเร็จ</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: completionRate === 100 ? '#34c759' : 'var(--txt)' }}>
              {allTasks.length ? `${completionRate}%` : '-'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 2 }}>
              {doneTasks.length} จาก {allTasks.length} งาน
            </div>
          </div>
        </div>

        {/* Card 2: Total Tasks */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--mut)', fontWeight: 600 }}>งานทั้งหมด</span>
            <span style={{ background: 'var(--pri-l)', color: 'var(--pri)', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>
              รวม
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--txt)' }}>
            {allTasks.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 4 }}>
            ใน{MODE_TITLE[mode]}
          </div>
        </div>

        {/* Card 3: Completed */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--mut)', fontWeight: 600 }}>เสร็จสิ้น</span>
            <span style={{ background: 'rgba(52, 199, 89, 0.12)', color: '#34c759', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>
              ✓ เสร็จ
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#34c759' }}>
            {doneTasks.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 4 }}>
            {doneTasks.length === allTasks.length && allTasks.length > 0 ? 'ครบ 100% ยอดเยี่ยม 🎉' : 'งานที่ทำเรียบร้อย'}
          </div>
        </div>

        {/* Card 4: Pending */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--mut)', fontWeight: 600 }}>ยังค้างอยู่</span>
            <span style={{ background: 'rgba(255, 59, 48, 0.12)', color: '#ff3b30', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>
              รอทำ
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: pendingTasks.length > 0 ? '#ff3b30' : 'var(--txt)' }}>
            {pendingTasks.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 4 }}>
            {pendingTasks.length === 0 ? 'ไม่มีงานค้างเลย 👏' : 'งานที่ยังต้องทำให้เสร็จ'}
          </div>
        </div>
      </div>

      {/* Main Charts Row: Daily Velocity + Tag Distribution */}
      <div className="grid dashboard-charts-grid">
        {/* Chart 1: Daily Velocity (Apple Emerald & Sky Blue Stacked Bar) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
              <ChartBarIcon size={16} color="var(--pri)" />
              <span>ความคืบหน้างานรายวัน (Daily Velocity)</span>
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#34c759' }} /> เสร็จแล้ว
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#0071e3' }} /> ยังค้าง
              </span>
            </div>
          </div>

          <div style={{ height: 260 }}>
            {allTasks.length === 0 ? (
              <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--mut)', fontSize: 13 }}>
                ไม่มีข้อมูลงานในช่วงเวลานี้
              </div>
            ) : (
              <Bar
                data={{
                  labels: dailyLabels,
                  datasets: [
                    {
                      label: 'เสร็จแล้ว',
                      data: dailyDoneData,
                      backgroundColor: 'rgba(52, 199, 89, 0.85)',
                      hoverBackgroundColor: '#34c759',
                      borderRadius: 6,
                    },
                    {
                      label: 'ยังค้าง',
                      data: dailyPendingData,
                      backgroundColor: 'rgba(0, 113, 227, 0.65)',
                      hoverBackgroundColor: '#0071e3',
                      borderRadius: 6,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      stacked: true,
                      grid: { display: false },
                      ticks: { font: { size: 11 } },
                    },
                    y: {
                      stacked: true,
                      beginAtZero: true,
                      ticks: { precision: 0, font: { size: 11 } },
                      grid: { color: 'rgba(120, 120, 128, 0.1)' },
                    },
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(28, 28, 30, 0.95)',
                      titleFont: { size: 12, weight: 'bold' },
                      bodyFont: { size: 11 },
                      padding: 10,
                      cornerRadius: 8,
                    },
                  },
                }}
              />
            )}
          </div>
        </div>

        {/* Chart 2: Tag Distribution (Apple Pastel Doughnut) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
              <TagIcon size={16} color="var(--pri)" />
              <span>สัดส่วนงานตามแท็กหมวดหมู่</span>
            </h3>
            <span style={{ fontSize: 11, color: 'var(--mut)' }}>
              {tagLabels.length} หมวดหมู่
            </span>
          </div>

          {tagLabels.length === 0 || allTasks.length === 0 ? (
            <div style={{ height: 260, display: 'grid', placeItems: 'center', color: 'var(--mut)', fontSize: 13 }}>
              ยังไม่มีแท็กในงานช่วงนี้
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ height: 160, position: 'relative' }}>
                <Doughnut
                  data={{
                    labels: tagLabels.map(l => `#${l}`),
                    datasets: [
                      {
                        data: tagData,
                        backgroundColor: tagBackgrounds,
                        borderWidth: 2,
                        borderColor: 'var(--card-solid)',
                        hoverOffset: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(28, 28, 30, 0.95)',
                        padding: 10,
                        cornerRadius: 8,
                      },
                    },
                  }}
                />
              </div>

              {/* Tag Legend Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 86, overflowY: 'auto' }}>
                {tagLabels.map((tag, idx) => {
                  const count = tagCounts[tag];
                  const pct = Math.round((count / allTasks.length) * 100);
                  const color = tagBackgrounds[idx];
                  return (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: 'rgba(120, 120, 128, 0.06)',
                        border: '1px solid var(--line)',
                        fontSize: 11,
                        color: 'var(--txt)',
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                      <span>#{tag}</span>
                      <b style={{ color: 'var(--mut)' }}>{count} ({pct}%)</b>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Row: Priority Breakdown + Team Member Workload */}
      <div className="grid dashboard-charts-grid">
        {/* Priority Breakdown Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
              <FlagIcon size={16} color="var(--pri)" />
              <span>ความคืบหน้าตามระดับความสำคัญ (Priority)</span>
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PRIORITIES.map(p => {
              const pTasks = allTasks.filter(t => t.priority === p);
              const pDone = pTasks.filter(t => t.done).length;
              const pTotal = pTasks.length;
              const pPct = pTotal ? Math.round((pDone / pTotal) * 100) : 0;
              const conf = PRIORITY[p];
              return (
                <div
                  key={p}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'rgba(120, 120, 128, 0.04)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: conf.color }} />
                      <span>ระดับ{conf.label}</span>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: conf.color }}>
                      {pDone} / {pTotal} งาน ({pPct}%)
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 7, background: 'rgba(120, 120, 128, 0.12)', borderRadius: 999, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pPct}%`,
                        background: conf.color,
                        borderRadius: 999,
                        transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Member Workload Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
              <UsersIcon size={16} color="var(--pri)" />
              <span>ภาระงานสมาชิกในทีม (Team Contributions)</span>
            </h3>
            <span style={{ fontSize: 11, color: 'var(--mut)' }}>
              {memberStats.length} คนที่มีงาน
            </span>
          </div>

          {memberStats.length === 0 ? (
            <div style={{ height: 160, display: 'grid', placeItems: 'center', color: 'var(--mut)', fontSize: 13 }}>
              ยังไม่มีการมอบหมายงานให้สมาชิกในช่วงเวลานี้
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto' }}>
              {memberStats.map(m => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    borderRadius: 12,
                    background: 'rgba(120, 120, 128, 0.04)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <AvatarIcon id={m.avatarId} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {m.name} {m.id === currentUser?.id ? '(ฉัน)' : ''}
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: m.pct === 100 ? '#34c759' : 'var(--pri)' }}>
                        {m.done}/{m.total} งาน ({m.pct}%)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ height: 6, background: 'rgba(120, 120, 128, 0.12)', borderRadius: 999, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${m.pct}%`,
                          background: m.pct === 100 ? '#34c759' : 'var(--pri)',
                          borderRadius: 999,
                          transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Timeline List (Days & Tasks Inspector) with Search & Pagination */}
      <div className="card">
        {/* Header: Title, macOS Traffic Lights, Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="macos-traffic-lights" aria-hidden="true">
              <span className="macos-traffic-dot red" />
              <span className="macos-traffic-dot yellow" />
              <span className="macos-traffic-dot green" />
            </div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
              <FileTextIcon size={16} color="var(--pri)" />
              <span>รายการงานตามช่วงเวลา</span>
              <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 999, background: 'var(--pri-l)', color: 'var(--pri)', fontWeight: 600 }}>
                {filteredTaskList.length} งาน
              </span>
            </h3>
          </div>

          {/* Search Input Box */}
          <div style={{ position: 'relative', width: 300, maxWidth: '100%' }}>
            <SearchIcon
              size={14}
              color="var(--mut)"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="ค้นหางาน (ชื่อ, รายละเอียด, สมาชิก, แท็ก)..."
              style={{
                width: '100%',
                padding: '6px 28px 6px 30px',
                fontSize: 12,
                borderRadius: 999,
                border: '1px solid var(--line)',
                background: 'rgba(120, 120, 128, 0.06)',
                color: 'var(--txt)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'rgba(120, 120, 128, 0.2)',
                  color: 'var(--txt)',
                  cursor: 'pointer',
                  fontSize: 10,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  padding: 0,
                }}
                title="ล้างคำค้นหา"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filters Row: Status Segmented Control + Tag Chips */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          {/* Status Filter */}
          <div style={{ display: 'inline-flex', background: 'rgba(120, 120, 128, 0.08)', borderRadius: 999, padding: 3, gap: 2 }}>
            {[
              { key: 'all', label: 'ทั้งหมด', count: allTasks.length },
              { key: 'pending', label: 'ยังค้าง', count: pendingTasks.length },
              { key: 'done', label: 'เสร็จแล้ว', count: doneTasks.length },
            ].map(tab => (
              <button
                key={`status-tab-${tab.key}`}
                type="button"
                onClick={() => handleStatusFilterChange(tab.key as any)}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: 11,
                  fontWeight: statusFilter === tab.key ? 600 : 500,
                  background: statusFilter === tab.key ? 'var(--card-solid)' : 'transparent',
                  color: statusFilter === tab.key ? 'var(--txt)' : 'var(--mut)',
                  boxShadow: statusFilter === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>{tab.label}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Tag Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <small style={{ color: 'var(--mut)', fontSize: 11, fontWeight: 600 }}>แท็ก:</small>
            <button
              type="button"
              onClick={() => handleTagFilterChange('all')}
              style={{
                borderRadius: 999,
                padding: '3px 10px',
                fontSize: 11,
                border: activeTagFilter === 'all' ? '1px solid var(--pri)' : '1px solid var(--line)',
                background: activeTagFilter === 'all' ? 'var(--pri-l)' : 'transparent',
                color: activeTagFilter === 'all' ? 'var(--pri)' : 'var(--mut)',
                cursor: 'pointer',
                fontWeight: activeTagFilter === 'all' ? 700 : 500,
              }}
            >
              ทั้งหมด
            </button>
            {tagLabels.filter(t => t !== 'ไม่มีแท็ก').slice(0, 8).map(tg => (
              <button
                key={`dash-filter-${tg}`}
                type="button"
                onClick={() => handleTagFilterChange(activeTagFilter === tg ? 'all' : tg)}
                style={{
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: 11,
                  border: activeTagFilter === tg ? '1px solid var(--pri)' : '1px solid var(--line)',
                  background: activeTagFilter === tg ? 'var(--pri-l)' : 'transparent',
                  color: activeTagFilter === tg ? 'var(--pri)' : 'var(--mut)',
                  cursor: 'pointer',
                  fontWeight: activeTagFilter === tg ? 700 : 500,
                }}
              >
                #{tg}
              </button>
            ))}
          </div>
        </div>

        {/* Task List (Max 10 per page) */}
        {filteredTaskList.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--mut)' }}>
            <p style={{ margin: '0 0 10px', fontSize: 14 }}>
              {searchQuery || activeTagFilter !== 'all' || statusFilter !== 'all'
                ? '🔍 ไม่พบงานที่ตรงกับคำค้นหาหรือตัวกรอง'
                : 'ไม่มีงานในช่วงเวลานี้ 🎉'}
            </p>
            {(searchQuery || activeTagFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTagFilter('all');
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className="btn sm"
                style={{ borderRadius: 999, fontSize: 11.5, padding: '4px 14px' }}
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groupedPageTasks.map(group => {
              const dayEvents = eventsOn(s, group.date);
              const groupDone = group.tasks.filter(t => t.done).length;

              return (
                <div
                  key={`dash-group-${group.date}`}
                  style={{
                    borderRadius: 12,
                    background: 'rgba(120, 120, 128, 0.04)',
                    border: '1px solid var(--line)',
                    padding: '12px 14px',
                  }}
                >
                  {/* Day Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: 8,
                      marginBottom: 8,
                      borderBottom: '1px solid var(--line)',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => goDay(group.date)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--pri)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        title="คลิกเพื่อดูเฉพาะวันนี้"
                      >
                        <CalendarIcon size={14} />
                        <span>{thDate(group.date)}</span>
                      </button>
                      {group.date === today && (
                        <span className="badge" style={{ position: 'static', background: '#e0f2fe', color: '#0284c7', fontSize: 10, padding: '2px 6px' }}>
                          วันนี้
                        </span>
                      )}
                      {dayEvents.map(e => (
                        <span
                          key={e.id}
                          className={`tag t-${e.type}`}
                          style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999 }}
                        >
                          {e.title}
                        </span>
                      ))}
                    </div>

                    <span style={{ fontSize: 11, color: 'var(--mut)' }}>
                      เสร็จ {groupDone} / {group.tasks.length} งาน
                    </span>
                  </div>

                  {/* Task Rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {group.tasks.map(t => {
                      const priConf = PRIORITY[t.priority];
                      return (
                        <div
                          key={t.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: 8,
                            background: 'var(--card-solid)',
                            border: '1px solid var(--line)',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                            <button
                              type="button"
                              onClick={() =>
                                s.toggleTask(
                                  t.id,
                                  currentUser
                                    ? { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId }
                                    : undefined
                                )
                              }
                              style={{
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                flexShrink: 0,
                              }}
                              title={t.done ? 'ทำเครื่องหมายว่ายังไม่เสร็จ' : 'ทำเครื่องหมายว่าเสร็จแล้ว'}
                              aria-label={t.done ? 'ทำเครื่องหมายว่ายังไม่เสร็จ' : 'ทำเครื่องหมายว่าเสร็จแล้ว'}
                            >
                              {t.done ? (
                                <span style={{ display: 'inline-grid', placeItems: 'center', width: 17, height: 17, borderRadius: 5, background: 'rgba(52, 199, 89, 0.15)', color: '#34c759' }}>
                                  <CheckIcon size={12} strokeWidth={3} />
                                </span>
                              ) : (
                                <span style={{ width: 17, height: 17, borderRadius: 5, border: '1.5px solid var(--mut)', display: 'inline-block' }} />
                              )}
                            </button>

                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: priConf.color,
                                flexShrink: 0,
                              }}
                              title={`ความสำคัญ: ${priConf.label}`}
                            />
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: t.done ? 'var(--mut)' : 'var(--txt)',
                                textDecoration: t.done ? 'line-through' : 'none',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t.title}
                            </span>
                            {t.time && (
                              <span style={{ fontSize: 11, color: 'var(--mut)', background: 'rgba(120, 120, 128, 0.08)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
                                {t.time}
                              </span>
                            )}
                            {t.detail && (
                              <small style={{ color: 'var(--mut)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                – {t.detail}
                              </small>
                            )}
                          </div>

                          {/* Tags and Assignee Avatars */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {t.tags && t.tags.slice(0, 3).map(tg => {
                              const style = getTagStyle(tg);
                              return (
                                <span
                                  key={tg}
                                  style={{
                                    fontSize: 10.5,
                                    padding: '2px 7px',
                                    borderRadius: 999,
                                    background: style.bg,
                                    color: style.color,
                                    fontWeight: 600,
                                  }}
                                >
                                  #{tg.replace(/^#/, '')}
                                </span>
                              );
                            })}
                            {t.assignees && t.assignees.length > 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                {t.assignees.slice(0, 2).map(a => (
                                  <span key={a.id} title={a.name} style={{ display: 'inline-flex' }}>
                                    <AvatarIcon id={a.avatarId || 'dev_boy'} size={18} />
                                  </span>
                                ))}
                                {t.assignees.length > 2 && (
                                  <span style={{ fontSize: 10, color: 'var(--mut)', fontWeight: 600 }}>
                                    +{t.assignees.length - 2}
                                  </span>
                                )}
                              </div>
                            ) : t.userAvatar ? (
                              <span title={t.userName} style={{ display: 'inline-flex' }}>
                                <AvatarIcon id={t.userAvatar} size={18} />
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* macOS Pagination Controls (Shows when total tasks > 10) */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 14,
              marginTop: 14,
              borderTop: '1px solid var(--line)',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            {/* Status indicator */}
            <span style={{ fontSize: 12, color: 'var(--mut)', fontWeight: 500 }}>
              แสดงรายการที่ {startIndex + 1} - {endIndex} จากทั้งหมด {filteredTaskList.length} งาน (หน้า {validCurrentPage} จาก {totalPages})
            </span>

            {/* Pagination Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Previous Button */}
              <button
                type="button"
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid var(--line)',
                  background: validCurrentPage <= 1 ? 'rgba(120, 120, 128, 0.05)' : 'var(--card-solid)',
                  color: validCurrentPage <= 1 ? 'var(--mut)' : 'var(--txt)',
                  cursor: validCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: validCurrentPage <= 1 ? 0.45 : 1,
                  boxShadow: validCurrentPage <= 1 ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease',
                }}
              >
                <ChevronLeftIcon size={13} />
                <span>ก่อนหน้า</span>
              </button>

              {/* Page Numbers */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    return Math.abs(p - validCurrentPage) <= 1;
                  })
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const hasEllipsis = prev && p - prev > 1;
                    return (
                      <React.Fragment key={`page-${p}`}>
                        {hasEllipsis && (
                          <span style={{ padding: '0 4px', color: 'var(--mut)', fontSize: 11 }}>...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          style={{
                            minWidth: 28,
                            height: 28,
                            borderRadius: 7,
                            fontSize: 12,
                            fontWeight: p === validCurrentPage ? 700 : 500,
                            border: p === validCurrentPage ? '1px solid var(--pri)' : '1px solid var(--line)',
                            background: p === validCurrentPage ? 'var(--pri)' : 'var(--card-solid)',
                            color: p === validCurrentPage ? '#fff' : 'var(--txt)',
                            cursor: 'pointer',
                            display: 'grid',
                            placeItems: 'center',
                            boxShadow: p === validCurrentPage ? '0 2px 8px rgba(0, 113, 227, 0.3)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              {/* Next Button */}
              <button
                type="button"
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid var(--line)',
                  background: validCurrentPage >= totalPages ? 'rgba(120, 120, 128, 0.05)' : 'var(--card-solid)',
                  color: validCurrentPage >= totalPages ? 'var(--mut)' : 'var(--txt)',
                  cursor: validCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: validCurrentPage >= totalPages ? 0.45 : 1,
                  boxShadow: validCurrentPage >= totalPages ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>ถัดไป</span>
                <ChevronRightIcon size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ExecutiveReportModal
        isOpen={isExecutiveReportOpen}
        onClose={() => setIsExecutiveReportOpen(false)}
      />
    </div>
  );
}
