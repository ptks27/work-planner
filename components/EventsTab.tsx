'use client';

import React, { useState, useMemo } from 'react';
import { usePlanner } from '@/lib/store';
import { useToday } from '@/lib/hooks';
import { eachDay, parse, thDate, TH_MONTHS, TH_DOW } from '@/lib/utils';
import { TH_HOLIDAYS } from '@/lib/holidays';
import { TYPE_LABEL, type EventType, type PlannerEvent } from '@/lib/types';
import { useModal } from '@/components/ModalContext';
import { useAuth } from '@/lib/authStore';
import { AvatarIcon } from './Avatars';
import {
  TrashIcon,
  PlusIcon,
  UmbrellaIcon,
  CalendarIcon,
  CheckIcon,
  BeachIcon,
  UsersIcon,
  LeaveIcon,
  HolidayIcon,
  NoteIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  CloseIcon,
  ClockIcon,
} from './Icons';
import ThaiDatePicker from './ThaiDatePicker';

const TYPE_META: Record<
  EventType,
  {
    accent: string;
    softBg: string;
    softBorder: string;
    tileTop: string;
    placeholder: string;
    presets: string[];
  }
> = {
  leave: {
    accent: '#ea580c',
    softBg: 'rgba(255, 149, 0, 0.12)',
    softBorder: 'rgba(255, 149, 0, 0.3)',
    tileTop: 'linear-gradient(135deg, #f59e0b, #ea580c)',
    placeholder: 'รายละเอียดการลา (เช่น ลาพักร้อน, ลาป่วย, ลากิจ)... *',
    presets: ['ลาพักร้อน', 'ลาป่วย', 'ลากิจ', 'Work From Home'],
  },
  holiday: {
    accent: '#ff3b30',
    softBg: 'rgba(255, 59, 48, 0.1)',
    softBorder: 'rgba(255, 59, 48, 0.25)',
    tileTop: 'linear-gradient(135deg, #ff5e57, #ff3b30)',
    placeholder: 'ชื่อวันหยุด (เช่น วันหยุดพิเศษบริษัท, วันหยุดชดเชย)... *',
    presets: ['วันหยุดพิเศษ', 'วันหยุดชดเชย', 'วันหยุดบริษัท'],
  },
  note: {
    accent: '#9333ea',
    softBg: 'rgba(175, 82, 222, 0.1)',
    softBorder: 'rgba(175, 82, 222, 0.28)',
    tileTop: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    placeholder: 'ข้อความโน้ต / บันทึกสำคัญประจำวัน... *',
    presets: ['ประชุมสำคัญ', 'นัดหมายนอกสถานที่', 'กำหนดส่งงาน'],
  },
};

function getDayDiff(fromIso: string, toIso: string): number {
  const d1 = parse(fromIso);
  const d2 = parse(toIso);
  return Math.round((d2.getTime() - d1.getTime()) / 86_400_000);
}

export default function EventsTab() {
  const s = usePlanner();
  const { currentUser, users } = useAuth();
  const today = useToday();
  const currentYear = new Date().getFullYear();

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState('');
  const [type, setType] = useState<EventType>('leave');
  const [title, setTitle] = useState('');
  const [memberId, setMemberId] = useState('');
  const [year, setYear] = useState(currentYear);
  const [hYear, setHYear] = useState(currentYear);
  const [filterType, setFilterType] = useState<'all' | EventType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [upcomingOnly, setUpcomingOnly] = useState(false);

  const { showAlert, showConfirm } = useModal();

  const memberList = useMemo(
    () =>
      Array.from(
        new Map(
          (users || [])
            .concat(currentUser ? [currentUser] : [])
            .map(u => [u.id, u])
        ).values()
      ),
    [users, currentUser]
  );

  const dayCount = useMemo(() => {
    if (!from) return 0;
    const end = to || from;
    if (end < from) return 0;
    return eachDay(from, end).length;
  }, [from, to]);

  const activeMeta = TYPE_META[type];

  const add = () => {
    const end = to || from;
    if (!from || !title.trim()) {
      return showAlert('แจ้งเตือน', 'กรุณาเลือกวันที่และใส่รายละเอียด');
    }
    if (end < from) {
      return showAlert('แจ้งเตือน', 'วันที่สิ้นสุดต้องไม่ก่อนวันเริ่มต้น');
    }

    const targetUser =
      type === 'leave'
        ? memberList.find(u => u.id === (memberId || currentUser?.id)) || currentUser
        : null;

    const days = eachDay(from, end);
    s.addEvents(
      days.map(date => ({
        date,
        type,
        title: title.trim(),
        userId: targetUser?.id,
        userName: targetUser?.name,
        userAvatar: targetUser?.avatarId,
      }))
    );
    setTitle('');
    setTo('');
    showAlert('สำเร็จ', `บันทึกรายการเรียบร้อยแล้ว (${days.length} วัน)`);
  };

  const addHolidays = () => {
    const listToAdd = TH_HOLIDAYS.map(([md, name]) => ({
      date: `${hYear}-${md}`,
      type: 'holiday' as const,
      title: name,
    })).filter(h => !s.events.some(e => e.date === h.date && e.title === h.title));

    if (listToAdd.length === 0) {
      return showAlert('แจ้งเตือน', `มีวันหยุดราชการประจำปี ${hYear + 543} ครบถ้วนแล้ว`);
    }

    s.addEvents(listToAdd);
    setYear(hYear);
    showAlert('สำเร็จ', `เพิ่มวันหยุดราชการไทยประจำปี ${hYear + 543} เรียบร้อยแล้ว (${listToAdd.length} วัน)`);
  };

  const yearEvents = useMemo(
    () =>
      s.events
        .filter(e => e.date.startsWith(String(year)))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [s.events, year]
  );

  const leavesCount = useMemo(() => yearEvents.filter(e => e.type === 'leave').length, [yearEvents]);
  const holidaysCount = useMemo(() => yearEvents.filter(e => e.type === 'holiday').length, [yearEvents]);
  const notesCount = useMemo(() => yearEvents.filter(e => e.type === 'note').length, [yearEvents]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return yearEvents.filter(e => {
      if (filterType !== 'all' && e.type !== filterType) return false;
      if (upcomingOnly && e.date < today) return false;
      if (q) {
        const hay = `${e.title} ${thDate(e.date)} ${e.userName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [yearEvents, filterType, upcomingOnly, searchQuery, today]);

  const monthGroups = useMemo(() => {
    const map = new Map<number, PlannerEvent[]>();
    for (const ev of filteredEvents) {
      const m = parse(ev.date).getMonth();
      const arr = map.get(m);
      if (arr) arr.push(ev);
      else map.set(m, [ev]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredEvents]);

  const renderTypeIcon = (t: EventType, size = 13) => {
    if (t === 'leave') return <LeaveIcon size={size} color="currentColor" />;
    if (t === 'holiday') return <HolidayIcon size={size} color="currentColor" />;
    return <NoteIcon size={size} color="currentColor" />;
  };

  return (
    <div className="grid events-layout-grid">
      {/* Left Column: Apple Form Card */}
      <div className="macos-form-card">
        {/* Window Header Bar */}
        <div className="macos-window-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="macos-traffic-lights" aria-hidden="true">
              <span className="macos-traffic-dot red" />
              <span className="macos-traffic-dot yellow" />
              <span className="macos-traffic-dot green" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: activeMeta.softBg,
                  color: activeMeta.accent,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                <UmbrellaIcon size={15} strokeWidth={2.3} />
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--txt)' }}>
                บันทึกวันหยุด / วันลา / โน้ต
              </span>
            </div>
          </div>
        </div>

        {/* 1. Type Segmented Selector */}
        <div className="macos-inset-section">
          <div className="macos-section-header">
            <span className="macos-section-title">เลือกประเภท</span>
          </div>

          <div className="macos-priority-pills">
            {(['leave', 'holiday', 'note'] as EventType[]).map(t => {
              const active = type === t;
              const meta = TYPE_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  className={`macos-priority-pill ${active ? 'active' : ''}`}
                  onClick={() => setType(t)}
                  style={{
                    color: active ? meta.accent : undefined,
                  }}
                >
                  {renderTypeIcon(t, 14)}
                  <span>{TYPE_LABEL[t]}</span>
                </button>
              );
            })}
          </div>

          {/* Quick-fill Suggestion Chips */}
          <div className="event-quick-chips" style={{ marginTop: 4 }}>
            {activeMeta.presets.map(preset => (
              <button
                key={preset}
                type="button"
                className="event-quick-chip"
                onClick={() => setTitle(preset)}
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Member Selector (Only when Leave & team has multiple members) */}
        {type === 'leave' && memberList.length > 1 && (
          <div className="macos-inset-section">
            <div className="macos-section-header">
              <span className="macos-section-title">
                <UsersIcon size={13} color="var(--pri)" />
                <span>ผู้ลา</span>
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {memberList.map(u => {
                const isSelected = (memberId || currentUser?.id) === u.id;
                return (
                  <button
                    key={`event-user-${u.id}`}
                    type="button"
                    onClick={() => setMemberId(u.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 11px 4px 5px',
                      borderRadius: 999,
                      border: isSelected ? '1.5px solid var(--pri)' : '1px solid var(--line)',
                      background: isSelected ? 'var(--pri-l)' : 'var(--card-solid)',
                      color: isSelected ? 'var(--pri)' : 'var(--txt)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: isSelected ? 600 : 500,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <AvatarIcon id={u.avatarId} size={18} />
                    <span>
                      {u.name || 'สมาชิก'}
                      {u.id === currentUser?.id ? ' (ฉัน)' : ''}
                    </span>
                    {isSelected && <CheckIcon size={11} strokeWidth={3} color="var(--pri)" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Title / Note Hero Input */}
        <div className="macos-hero-input-group">
          {type === 'note' ? (
            <textarea
              className="macos-hero-detail"
              rows={3}
              placeholder={activeMeta.placeholder}
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ fontSize: 14, fontWeight: 500, padding: '12px 14px' }}
            />
          ) : (
            <input
              className="macos-hero-title"
              placeholder={activeMeta.placeholder}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              style={{ padding: '12px 14px' }}
            />
          )}
        </div>

        {/* 4. Date Range Picker */}
        <div className="macos-inset-section">
          <div className="macos-section-header">
            <span className="macos-section-title">
              <CalendarIcon size={13} color="var(--pri)" />
              <span>ช่วงวันที่</span>
            </span>
            {dayCount > 0 && (
              <span className="count-pill info">
                {dayCount === 1 ? '1 วัน' : `รวม ${dayCount} วัน`}
              </span>
            )}
          </div>

          <div className="macos-date-grid">
            <div>
              <label style={{ fontSize: 11, marginBottom: 4 }}>ตั้งแต่วันที่ *</label>
              <ThaiDatePicker
                value={from}
                onChange={v => v && setFrom(v)}
                style={{ marginBottom: 0 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, marginBottom: 4 }}>ถึงวันที่ (หลายวัน)</label>
              <ThaiDatePicker
                value={to}
                onChange={setTo}
                min={from}
                clearable
                placeholder="ไม่บังคับ"
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>
        </div>

        {/* 5. Primary Save CTA */}
        <button
          type="button"
          className="btn primary block"
          onClick={add}
          style={{
            minHeight: 42,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <CheckIcon size={15} strokeWidth={2.6} />
          <span>{dayCount > 1 ? `บันทึกรายการ (${dayCount} วัน)` : 'บันทึกรายการ'}</span>
        </button>

        {/* 6. Thai Public Holidays Quick Import */}
        <div
          style={{
            marginTop: 4,
            padding: '14px 15px',
            borderRadius: 15,
            background: 'rgba(52, 199, 89, 0.06)',
            border: '1px solid rgba(52, 199, 89, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: 'var(--txt)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <BeachIcon size={15} color="#34c759" />
              <span>นำเข้าวันหยุดราชการไทย</span>
            </span>

            {/* Cupertino Year Stepper for Holiday Import */}
            <div className="event-year-stepper">
              <button
                type="button"
                className="event-year-stepper-btn"
                onClick={() => setHYear(y => y - 1)}
                aria-label="ปีก่อนหน้า"
                title="ปีก่อนหน้า"
              >
                <ChevronLeftIcon size={13} />
              </button>
              <span className="event-year-stepper-label">พ.ศ. {hYear + 543}</span>
              <button
                type="button"
                className="event-year-stepper-btn"
                onClick={() => setHYear(y => y + 1)}
                aria-label="ปีถัดไป"
                title="ปีถัดไป"
              >
                <ChevronRightIcon size={13} />
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn ok sm block"
            onClick={addHolidays}
            style={{ minHeight: 34, fontSize: 12.5 }}
          >
            <PlusIcon size={14} />
            <span>เพิ่มวันหยุดราชการปี {hYear + 543}</span>
          </button>

          <small style={{ color: 'var(--mut)', fontSize: 11, lineHeight: 1.4 }}>
            * วันหยุดทางพุทธศาสนาและวันหยุดพิเศษสามารถเพิ่มเองได้ตามประกาศทางการ
          </small>
        </div>
      </div>

      {/* Right Column: Month-Grouped Calendar Events View */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Header & Cupertino Year Stepper */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 14,
            borderBottom: '1px solid var(--line)',
            marginBottom: 14,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="macos-traffic-lights" aria-hidden="true">
              <span className="macos-traffic-dot red" />
              <span className="macos-traffic-dot yellow" />
              <span className="macos-traffic-dot green" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <CalendarIcon size={17} color="var(--pri)" />
              <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: 'var(--txt)' }}>
                ปฏิทินประจำปี {year + 543}
              </h3>
              <span className="count-pill">{yearEvents.length} รายการ</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {year !== currentYear && (
              <button
                type="button"
                className="btn ghost xs"
                onClick={() => setYear(currentYear)}
              >
                ปีนี้
              </button>
            )}
            <div className="event-year-stepper">
              <button
                type="button"
                className="event-year-stepper-btn"
                onClick={() => setYear(y => y - 1)}
                aria-label="ดูปีก่อนหน้า"
                title="ปีก่อนหน้า"
              >
                <ChevronLeftIcon size={13} />
              </button>
              <span className="event-year-stepper-label">พ.ศ. {year + 543}</span>
              <button
                type="button"
                className="event-year-stepper-btn"
                onClick={() => setYear(y => y + 1)}
                aria-label="ดูปีถัดไป"
                title="ปีถัดไป"
              >
                <ChevronRightIcon size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Interactive Stat Filter Cards */}
        <div className="event-stats-grid">
          <button
            type="button"
            className={`event-stat-card ${filterType === 'all' ? 'active' : ''}`}
            style={{ ['--stat-accent' as string]: 'var(--pri)' }}
            onClick={() => setFilterType('all')}
          >
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--mut)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <CalendarIcon size={12} color="var(--pri)" />
              <span>ทั้งหมด</span>
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt)', lineHeight: 1.1 }}>
              {yearEvents.length}
            </span>
          </button>

          <button
            type="button"
            className={`event-stat-card ${filterType === 'leave' ? 'active' : ''}`}
            style={{ ['--stat-accent' as string]: '#ea580c' }}
            onClick={() => setFilterType(prev => (prev === 'leave' ? 'all' : 'leave'))}
          >
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#ea580c', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <LeaveIcon size={12} color="#ea580c" />
              <span>วันลา</span>
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt)', lineHeight: 1.1 }}>
              {leavesCount}
            </span>
          </button>

          <button
            type="button"
            className={`event-stat-card ${filterType === 'holiday' ? 'active' : ''}`}
            style={{ ['--stat-accent' as string]: '#ff3b30' }}
            onClick={() => setFilterType(prev => (prev === 'holiday' ? 'all' : 'holiday'))}
          >
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--red)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <HolidayIcon size={12} color="var(--red)" />
              <span>วันหยุด</span>
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt)', lineHeight: 1.1 }}>
              {holidaysCount}
            </span>
          </button>

          <button
            type="button"
            className={`event-stat-card ${filterType === 'note' ? 'active' : ''}`}
            style={{ ['--stat-accent' as string]: '#9333ea' }}
            onClick={() => setFilterType(prev => (prev === 'note' ? 'all' : 'note'))}
          >
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#9333ea', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <NoteIcon size={12} color="#9333ea" />
              <span>โน้ต</span>
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt)', lineHeight: 1.1 }}>
              {notesCount}
            </span>
          </button>
        </div>

        {/* Search & Upcoming Toggle */}
        <div className="event-search-row">
          <div className="event-search-box">
            <SearchIcon
              size={13}
              style={{
                position: 'absolute',
                left: 11,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--mut)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อวันหยุด, วันลา หรือโน้ต..."
              aria-label="ค้นหารายการวันหยุด วันลา หรือโน้ต"
            />
            {searchQuery && (
              <button
                type="button"
                className="icon-btn xs"
                onClick={() => setSearchQuery('')}
                aria-label="ล้างคำค้นหา"
                style={{
                  position: 'absolute',
                  right: 5,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              >
                <CloseIcon size={12} />
              </button>
            )}
          </div>

          <button
            type="button"
            className={`btn sm ${upcomingOnly ? 'primary' : 'ghost'}`}
            onClick={() => setUpcomingOnly(prev => !prev)}
            style={{ fontSize: 12 }}
          >
            <ClockIcon size={12} />
            <span>กำลังจะมาถึง</span>
          </button>
        </div>

        {/* Grouped Events Timeline */}
        <div className="scroll" style={{ maxHeight: 540, overflowY: 'auto', paddingRight: 2 }}>
          {filteredEvents.length === 0 ? (
            <div className="empty-state-box" style={{ padding: '44px 20px' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'var(--pri-l)',
                  color: 'var(--pri)',
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: 4,
                }}
              >
                <CalendarIcon size={22} />
              </div>
              <div className="empty-state-title">
                {yearEvents.length === 0
                  ? `ยังไม่มีรายการในปี พ.ศ. ${year + 543}`
                  : 'ไม่พบรายการที่ตรงกับเงื่อนไข'}
              </div>
              <div className="empty-state-sub">
                {yearEvents.length === 0
                  ? 'เพิ่มวันลา โน้ต หรือกดนำเข้าวันหยุดราชการไทยจากกล่องด้านซ้ายได้เลย'
                  : 'ลองเปลี่ยนตัวกรองหมวดหมู่หรือคำค้นหาเพื่อดูรายการทั้งหมด'}
              </div>
              {(filterType !== 'all' || searchQuery || upcomingOnly) && (
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    setFilterType('all');
                    setSearchQuery('');
                    setUpcomingOnly(false);
                  }}
                >
                  แสดงทั้งหมด
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {monthGroups.map(([monthIdx, items]) => (
                <div key={monthIdx} className="event-month-group">
                  <div className="event-month-header">
                    <span>
                      {TH_MONTHS[monthIdx]} {year + 543}
                    </span>
                    <span className="count-pill" style={{ fontSize: 10, padding: '1px 7px' }}>
                      {items.length} รายการ
                    </span>
                  </div>

                  {items.map(e => {
                    const d = parse(e.date);
                    const meta = TYPE_META[e.type];
                    const diffDays = getDayDiff(today, e.date);
                    const isToday = diffDays === 0;
                    const isPast = diffDays < 0;
                    const evUser =
                      memberList.find(u => u.id === e.userId) ||
                      (currentUser?.id === e.userId ? currentUser : null);
                    const evName = evUser?.name || e.userName;
                    const evAvatar = evUser?.avatarId || e.userAvatar;

                    return (
                      <div
                        key={e.id}
                        className={`event-card-item ${isToday ? 'is-today' : isPast ? 'is-past' : ''}`}
                      >
                        {/* Mini Apple Calendar Tile */}
                        <div className="event-date-tile" aria-hidden="true">
                          <div
                            className="event-date-tile-top"
                            style={{ background: meta.tileTop }}
                          >
                            {TH_DOW[d.getDay()]}
                          </div>
                          <div className="event-date-tile-day">{d.getDate()}</div>
                        </div>

                        {/* Middle Content: Title + Meta Pills */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: 'var(--txt)',
                              lineHeight: 1.4,
                              wordBreak: 'break-word',
                            }}
                          >
                            {e.title}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 6,
                              marginTop: 5,
                            }}
                          >
                            <span
                              className={`tag t-${e.type}`}
                              style={{
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 999,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {renderTypeIcon(e.type, 11)}
                              <span>{TYPE_LABEL[e.type]}</span>
                            </span>

                            <span style={{ fontSize: 11.5, color: 'var(--mut)', fontWeight: 500 }}>
                              {thDate(e.date)}
                            </span>

                            {isToday && (
                              <span className="count-pill info" style={{ fontSize: 10 }}>
                                วันนี้
                              </span>
                            )}
                            {diffDays === 1 && (
                              <span className="count-pill ok" style={{ fontSize: 10 }}>
                                พรุ่งนี้
                              </span>
                            )}
                            {diffDays > 1 && diffDays <= 45 && (
                              <span
                                className="count-pill"
                                style={{
                                  fontSize: 10,
                                  background: meta.softBg,
                                  color: meta.accent,
                                }}
                              >
                                อีก {diffDays} วัน
                              </span>
                            )}

                            {evName && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  background: 'rgba(120, 120, 128, 0.08)',
                                  padding: '2px 8px 2px 4px',
                                  borderRadius: 999,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: 'var(--txt)',
                                }}
                              >
                                {evAvatar && <AvatarIcon id={evAvatar} size={15} />}
                                <span>{evName}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Subtle Delete Action */}
                        <button
                          type="button"
                          className="icon-btn sm del-btn"
                          title="ลบรายการ"
                          aria-label={`ลบ ${e.title}`}
                          onClick={() =>
                            showConfirm(
                              'ยืนยันการลบ',
                              `ต้องการลบ "${e.title}" ในวันที่ ${thDate(e.date)} ใช่ไหม?`,
                              () => s.deleteEvent(e.id)
                            )
                          }
                          style={{ marginTop: 2 }}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
