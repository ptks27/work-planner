'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  parse,
  fmt,
  addDays,
  pad,
  TH_MONTHS,
  TH_DOW,
  toThaiDateDisplay,
  fromThaiDateDisplay,
} from '@/lib/utils';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon } from './Icons';

interface ThaiDatePickerProps {
  value: string; // ISO format: YYYY-MM-DD
  onChange: (value: string) => void;
  min?: string; // ISO format: YYYY-MM-DD
  max?: string; // ISO format: YYYY-MM-DD
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function ThaiDatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'วว/ดด/ปปปป',
  clearable = false,
  disabled = false,
  style,
  className,
}: ThaiDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // คำนวณวันปัจจุบัน
  const todayStr = fmt(new Date());

  // เดือนและปีที่กำลังเปิดดูในปฏิทิน (เริ่มต้นจากค่า value หรือ วันปัจจุบัน)
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const d = parse(value);
      if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // อัปเดตข้อความใน input เมื่อ value เปลี่ยน
  useEffect(() => {
    if (value) {
      setInputText(toThaiDateDisplay(value));
      const d = parse(value);
      if (!isNaN(d.getTime())) {
        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    } else {
      setInputText('');
    }
  }, [value]);

  // ปิด Popover เมื่อคลิกด้านนอก
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // จัดการการพิมพ์วันที่ด้วยตัวเองใน input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };

  const handleInputBlur = () => {
    if (!inputText.trim()) {
      if (clearable) onChange('');
      else setInputText(toThaiDateDisplay(value));
      return;
    }
    const parsedIso = fromThaiDateDisplay(inputText);
    if (parsedIso) {
      if (min && parsedIso < min) {
        setInputText(toThaiDateDisplay(value));
        return;
      }
      if (max && parsedIso > max) {
        setInputText(toThaiDateDisplay(value));
        return;
      }
      onChange(parsedIso);
      setInputText(toThaiDateDisplay(parsedIso));
    } else {
      // คืนค่าเดิมถ้าพิมพ์ผิดรูปแบบ
      setInputText(toThaiDateDisplay(value));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // เปลี่ยนเดือน
  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const selectDate = (dateStr: string) => {
    onChange(dateStr);
    setInputText(toThaiDateDisplay(dateStr));
    setIsOpen(false);
  };

  const selectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectDate(todayStr);
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setInputText('');
    setIsOpen(false);
  };

  // ข้อมูลสำหรับแสดงผลในปฏิทิน
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDay = addDays(firstDay, -firstDay.getDay());
  const calendarCells = Array.from({ length: 42 }, (_, i) => addDays(startDay, i));

  // สร้างตัวเลือกปี พ.ศ. (ย้อนหลัง 5 ปี ถึง ล่วงหน้า 10 ปี)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 20 }, (_, i) => currentYear - 5 + i);

  return (
    <div
      ref={containerRef}
      className={`thai-date-picker-container ${className || ''}`}
      style={{ position: 'relative', width: '100%', marginBottom: 10, ...style }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          onClick={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            margin: 0,
            paddingRight: clearable && value ? 62 : 38,
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontWeight: 500,
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={clearDate}
              title="ล้างวันที่"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--mut)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px',
              }}
            >
              ✕
            </button>
          )}

          <button
            type="button"
            onClick={() => !disabled && setIsOpen(prev => !prev)}
            disabled={disabled}
            title="เลือกจากปฏิทิน"
            style={{
              border: 'none',
              background: 'transparent',
              color: isOpen ? 'var(--pri)' : 'var(--mut)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
              transition: 'color 0.15s',
            }}
          >
            <CalendarIcon size={16} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1000,
            minWidth: 290,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08)',
            padding: 14,
            userSelect: 'none',
          }}
        >
          {/* Calendar Header with Month/Year Navigation */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
              gap: 6,
            }}
          >
            <button
              type="button"
              className="btn sm ghost"
              onClick={prevMonth}
              style={{
                padding: '4px 6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
              }}
              title="เดือนก่อนหน้า"
            >
              <ChevronLeftIcon size={14} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Month Select */}
              <select
                value={viewMonth}
                onChange={e =>
                  setViewDate(new Date(viewYear, parseInt(e.target.value, 10), 1))
                }
                style={{
                  width: 'auto',
                  margin: 0,
                  padding: '4px 8px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                {TH_MONTHS.map((mName, idx) => (
                  <option key={mName} value={idx}>
                    {mName}
                  </option>
                ))}
              </select>

              {/* Year Select (พ.ศ.) */}
              <select
                value={viewYear}
                onChange={e =>
                  setViewDate(new Date(parseInt(e.target.value, 10), viewMonth, 1))
                }
                style={{
                  width: 'auto',
                  margin: 0,
                  padding: '4px 8px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>
                    {y + 543}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn sm ghost"
              onClick={nextMonth}
              style={{
                padding: '4px 6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
              }}
              title="เดือนถัดไป"
            >
              <ChevronRightIcon size={14} />
            </button>
          </div>

          {/* Days of Week Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              fontWeight: 600,
              fontSize: 12,
              color: 'var(--mut)',
              marginBottom: 6,
              paddingBottom: 4,
              borderBottom: '1px solid var(--line)',
            }}
          >
            {TH_DOW.map((dName, idx) => (
              <span
                key={dName}
                style={{
                  color: idx === 0 || idx === 6 ? 'var(--red)' : undefined,
                  padding: '2px 0',
                }}
              >
                {dName}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 3,
            }}
          >
            {calendarCells.map((d, index) => {
              const ds = fmt(d);
              const isCurrentMonth = d.getMonth() === viewMonth;
              const isSelected = ds === value;
              const isToday = ds === todayStr;
              const isDisabled = Boolean((min && ds < min) || (max && ds > max));
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;

              return (
                <button
                  key={`${ds}-${index}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => selectDate(ds)}
                  style={{
                    border: isToday && !isSelected ? '1.5px solid var(--pri)' : 'none',
                    borderRadius: 8,
                    background: isSelected
                      ? 'var(--pri)'
                      : isToday
                      ? 'var(--pri-l)'
                      : 'transparent',
                    color: isSelected
                      ? '#fff'
                      : isDisabled
                      ? 'var(--mut)'
                      : !isCurrentMonth
                      ? 'var(--mut)'
                      : isWeekend
                      ? 'var(--red)'
                      : 'var(--txt)',
                    opacity: isDisabled ? 0.3 : !isCurrentMonth ? 0.45 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    fontWeight: isSelected || isToday ? 700 : 500,
                    fontSize: 12,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.background = 'var(--pri-l)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.background = isToday
                        ? 'var(--pri-l)'
                        : 'transparent';
                    }
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid var(--line)',
            }}
          >
            <button
              type="button"
              className="btn sm ghost"
              onClick={selectToday}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                color: 'var(--pri)',
                fontWeight: 600,
              }}
            >
              วันนี้
            </button>

            <div style={{ display: 'flex', gap: 6 }}>
              {clearable && value && (
                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={clearDate}
                  style={{ fontSize: 11, padding: '4px 10px', color: 'var(--red)' }}
                >
                  ล้างค่า
                </button>
              )}
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => setIsOpen(false)}
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
