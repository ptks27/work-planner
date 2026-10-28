'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/store';
import { useToday } from '@/lib/hooks';
import { eachDay, thDate } from '@/lib/utils';
import { TH_HOLIDAYS } from '@/lib/holidays';
import { TYPE_LABEL, type EventType } from '@/lib/types';
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
  StickyNoteIcon,
  UsersIcon,
  SparklesIcon,
  LeaveIcon,
  HolidayIcon,
  NoteIcon,
} from './Icons';
import ThaiDatePicker from './ThaiDatePicker';

export default function EventsTab() {
  const s = usePlanner();
  const { currentUser, users } = useAuth();
  const today = useToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState('');
  const [type, setType] = useState<EventType>('leave');
  const [title, setTitle] = useState('');
  const [memberId, setMemberId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [hYear, setHYear] = useState(new Date().getFullYear());
  const { showAlert, showConfirm } = useModal();

  const memberList = Array.from(
    new Map(
      (users || [])
        .concat(currentUser ? [currentUser] : [])
        .map(u => [u.id, u])
    ).values()
  );

  const add = () => {
    const end = to || from;
    if (!from || !title.trim()) return showAlert('แจ้งเตือน', 'กรุณาเลือกวันที่และใส่รายละเอียด');
    if (end < from) return showAlert('แจ้งเตือน', 'วันที่สิ้นสุดต้องไม่ก่อนวันเริ่มต้น');

    const targetUser = type === 'leave'
      ? (memberList.find(u => u.id === (memberId || currentUser?.id)) || currentUser)
      : null;

    s.addEvents(
      eachDay(from, end).map(date => ({
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
    showAlert('สำเร็จ', 'บันทึกรายการเรียบร้อยแล้ว');
  };

  const addHolidays = () => {
    const list = TH_HOLIDAYS.map(([md, name]) => ({
      date: `${hYear}-${md}`,
      type: 'holiday' as const,
      title: name,
    })).filter(h => !s.events.some(e => e.date === h.date && e.title === h.title));

    if (list.length === 0) {
      return showAlert('แจ้งเตือน', `มีวันหยุดราชการประจำปี ${hYear + 543} ครบถ้วนแล้ว`);
    }

    s.addEvents(list);
    showAlert('สำเร็จ', `เพิ่มวันหยุดราชการไทยเรียบร้อยแล้ว (${list.length} วัน)`);
  };

  const list = s.events
    .filter(e => e.date.startsWith(String(year)))
    .sort((a, b) => a.date.localeCompare(b.date));

  const leaves = list.filter(e => e.type === 'leave');
  const holidays = list.filter(e => e.type === 'holiday');
  const notes = list.filter(e => e.type === 'note');

  return (
    <div className="grid events-layout-grid">
      {/* Left Column: Form Card (macOS Inset Grouped Form) */}
      <div className="macos-form-card">
        {/* macOS Window Header Bar */}
        <div className="macos-window-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="macos-traffic-lights" aria-hidden="true">
              <span className="macos-traffic-dot red" />
              <span className="macos-traffic-dot yellow" />
              <span className="macos-traffic-dot green" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UmbrellaIcon size={16} color="var(--pri)" strokeWidth={2.5} />
              <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
                บันทึกวันหยุด / วันลา / โน้ต
              </span>
            </div>
          </div>
        </div>

        {/* Inset Group 1: ประเภทรายการ (Cupertino Segmented Control) */}
        <div className="macos-inset-section">
          <div className="macos-section-header">
            <span className="macos-section-title">
              <span>เลือกประเภท</span>
            </span>
          </div>

          <div className="macos-priority-pills">
            <button
              type="button"
              className={`macos-priority-pill ${type === 'leave' ? 'active' : ''}`}
              onClick={() => setType('leave')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <LeaveIcon size={14} color="currentColor" />
              <span>วันลา</span>
            </button>
            <button
              type="button"
              className={`macos-priority-pill ${type === 'holiday' ? 'active' : ''}`}
              onClick={() => setType('holiday')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <HolidayIcon size={14} color="currentColor" />
              <span>วันหยุด</span>
            </button>
            <button
              type="button"
              className={`macos-priority-pill ${type === 'note' ? 'active' : ''}`}
              onClick={() => setType('note')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <NoteIcon size={14} color="currentColor" />
              <span>โน้ต</span>
            </button>
          </div>
        </div>

        {/* Member Selector (If type is leave) */}
        {type === 'leave' && (
          <div className="macos-inset-section">
            <div className="macos-section-header">
              <span className="macos-section-title">
                <UsersIcon size={13} color="var(--pri)" />
                <span>ผู้ลา (สมาชิกในทีม)</span>
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
                      padding: '5px 12px 5px 6px',
                      borderRadius: 999,
                      border: isSelected ? '1.5px solid var(--pri)' : '1px solid var(--line)',
                      background: isSelected ? 'var(--pri-l)' : 'var(--card-solid)',
                      color: isSelected ? 'var(--pri)' : 'var(--txt)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: isSelected ? 600 : 500,
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 1px 4px rgba(0, 113, 227, 0.18)' : 'none',
                    }}
                  >
                    <AvatarIcon id={u.avatarId} size={18} />
                    <span>{u.name || 'สมาชิก'} {u.id === currentUser?.id ? '(ฉัน)' : ''}</span>
                    {isSelected && <CheckIcon size={11} strokeWidth={3} color="var(--pri)" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Hero Input: Title / Details */}
        <div className="macos-hero-input-group">
          <input
            className="macos-hero-title"
            placeholder={
              type === 'leave'
                ? 'รายละเอียดการลา (เช่น ลาพักร้อน, ลาป่วย, ลากิจ)... *'
                : type === 'holiday'
                ? 'ชื่อวันหยุด (เช่น วันหยุดพิเศษบริษัท)... *'
                : 'ข้อความโน้ตประกาศ... *'
            }
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
        </div>

        {/* Date Range Inset */}
        <div className="macos-inset-section">
          <div className="macos-section-header">
            <span className="macos-section-title">
              <CalendarIcon size={13} color="var(--pri)" />
              <span>ช่วงวันที่</span>
            </span>
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
              <label style={{ fontSize: 11, marginBottom: 4 }}>ถึงวันที่ (กรณีลาหลายวัน)</label>
              <ThaiDatePicker
                value={to}
                onChange={setTo}
                min={from}
                clearable
                placeholder="วว/ดด/ปปปป (ไม่บังคับ)"
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>
        </div>

        {/* Save CTA Button */}
        <button
          className="btn"
          onClick={add}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(0, 113, 227, 0.3)',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          <CheckIcon size={16} strokeWidth={2.5} />
          <span>บันทึกรายการ</span>
        </button>

        {/* Quick Import Thai Public Holidays */}
        <div
          style={{
            marginTop: 6,
            padding: '12px 14px',
            borderRadius: 14,
            background: 'rgba(52, 199, 89, 0.06)',
            border: '1px solid rgba(52, 199, 89, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--txt)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <BeachIcon size={15} color="#34c759" />
              <span>วันหยุดราชการไทย (ประจำปี)</span>
            </span>
            <span style={{ fontSize: 11, color: 'var(--mut)' }}>
              ปี {hYear + 543}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              value={hYear}
              onChange={e => setHYear(+e.target.value)}
              style={{ width: 90, margin: 0, padding: '5px 8px', fontSize: 12, borderRadius: 8 }}
            />
            <button
              type="button"
              className="btn sm ok"
              onClick={addHolidays}
              style={{
                flex: 1,
                borderRadius: 999,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <PlusIcon size={14} />
              <span>เพิ่มวันหยุดปี {hYear + 543}</span>
            </button>
          </div>
          <small style={{ color: 'var(--mut)', fontSize: 11 }}>
            * วันหยุดทางพุทธศาสนาและวันหยุดพิเศษ ให้เพิ่มเองตามประกาศทางการ
          </small>
        </div>
      </div>

      {/* Right Column: Events List & Overview */}
      <div className="card">
        {/* Header & Year Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--line)', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarIcon size={17} color="var(--pri)" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              รายการประจำปี {year + 543} ({list.length} รายการ)
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <small style={{ color: 'var(--mut)', fontSize: 12 }}>ปี ค.ศ.:</small>
            <input
              type="number"
              value={year}
              onChange={e => setYear(+e.target.value)}
              style={{ width: 85, margin: 0, padding: '4px 8px', fontSize: 12, borderRadius: 8 }}
            />
          </div>
        </div>

        {/* Statistics Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 999,
              background: 'rgba(255, 149, 0, 0.1)',
              border: '1px solid rgba(255, 149, 0, 0.25)',
              fontSize: 12,
              fontWeight: 600,
              color: '#b45309',
            }}
          >
            <LeaveIcon size={14} color="#b45309" />
            <span>วันลาทั้งหมด: <b>{leaves.length}</b> วัน</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 999,
              background: 'rgba(255, 59, 48, 0.08)',
              border: '1px solid rgba(255, 59, 48, 0.22)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--red)',
            }}
          >
            <HolidayIcon size={14} color="var(--red)" />
            <span>วันหยุดราชการ: <b>{holidays.length}</b> วัน</span>
          </div>

          {notes.length > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(175, 82, 222, 0.08)',
                border: '1px solid rgba(175, 82, 222, 0.22)',
                fontSize: 12,
                fontWeight: 600,
                color: '#8e24aa',
              }}
            >
              <NoteIcon size={14} color="#8e24aa" />
              <span>โน้ต: <b>{notes.length}</b> รายการ</span>
            </div>
          )}
        </div>

        {/* Events Table List */}
        <div className="scroll" style={{ maxHeight: 520, overflowY: 'auto' }}>
          {list.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--mut)' }}>
              <p style={{ margin: 0, fontSize: 14 }}>ยังไม่มีรายการวันหยุดหรือวันลาในปี {year + 543}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {list.map(e => {
                const evUser = memberList.find(u => u.id === e.userId) || (currentUser?.id === e.userId ? currentUser : null);
                const evName = evUser?.name || e.userName;
                const evAvatar = evUser?.avatarId || e.userAvatar;

                return (
                  <div
                    key={e.id}
                    className="event-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: 'var(--card-solid)',
                      border: '1px solid var(--line)',
                      gap: 10,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Left: Date + Badge + Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--txt)', minWidth: 130 }}>
                        {thDate(e.date)}
                      </span>

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
                        {e.type === 'leave' && <LeaveIcon size={12} color="currentColor" />}
                        {e.type === 'holiday' && <HolidayIcon size={12} color="currentColor" />}
                        {e.type === 'note' && <NoteIcon size={12} color="currentColor" />}
                        <span>{TYPE_LABEL[e.type]}</span>
                      </span>

                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                        {e.title}
                      </span>
                    </div>

                    {/* Right: Member Avatar & Delete Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      {evName && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(120, 120, 128, 0.06)',
                            padding: '3px 8px',
                            borderRadius: 999,
                            fontSize: 11.5,
                          }}
                        >
                          {evAvatar && <AvatarIcon id={evAvatar} size={16} />}
                          <span>{evName}</span>
                        </div>
                      )}

                      <button
                        className="icon-btn del-btn"
                        title="ลบรายการ"
                        aria-label="ลบรายการ"
                        onClick={() =>
                          showConfirm(
                            'ยืนยันการลบ',
                            `ต้องการลบ "${e.title}" ในวันที่ ${thDate(e.date)} ใช่ไหม?`,
                            () => s.deleteEvent(e.id)
                          )
                        }
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          border: 'none',
                          background: 'rgba(255, 59, 48, 0.08)',
                          color: 'var(--red)',
                          cursor: 'pointer',
                        }}
                      >
                        <TrashIcon size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
