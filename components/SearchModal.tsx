'use client';
import { useState, useEffect, useRef } from 'react';
import { usePlanner } from '@/lib/store';
import { PRIORITY, type Task } from '@/lib/types';
import { thDate } from '@/lib/utils';
import { CloseIcon, SearchIcon, CheckIcon, ClockIcon } from './Icons';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  onEditTask: (task: Task) => void;
}

export default function SearchModal({
  isOpen,
  onClose,
  onSelectDate,
  onEditTask,
}: SearchModalProps) {
  const s = usePlanner();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();
  const tasks = s.tasks.filter(t => !t.hidden);
  const matchedTasks = q
    ? tasks.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.detail?.toLowerCase().includes(q) ||
          t.date.includes(q) ||
          (t.endDate && t.endDate.includes(q)) ||
          t.subtasks?.some(st => st.title.toLowerCase().includes(q))
      )
    : tasks.slice(-15).reverse();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 540 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="search-input-wrap">
          <SearchIcon size={18} color="var(--mut)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="ค้นหางาน, รายละเอียด, วันที่..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="icon-btn"
              onClick={() => setQuery('')}
              style={{ width: 24, height: 24 }}
            >
              <CloseIcon size={14} />
            </button>
          )}
          <button className="icon-btn" onClick={onClose} aria-label="ปิด">
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="search-results">
          {matchedTasks.length === 0 ? (
            <p className="mut" style={{ textAlign: 'center', padding: '24px 0' }}>
              ไม่พบงานที่ค้นหา &ldquo;{query}&rdquo;
            </p>
          ) : (
            matchedTasks.map(t => {
              const p = PRIORITY[t.priority];
              return (
                <div
                  key={t.id}
                  className="search-item"
                  onClick={() => {
                    onSelectDate(t.date);
                    onEditTask(t);
                    onClose();
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {t.done ? (
                        <CheckIcon size={15} color="var(--ok)" />
                      ) : (
                        <ClockIcon size={15} color="var(--mut)" />
                      )}
                      <b
                        style={{
                          textDecoration: t.done ? 'line-through' : 'none',
                          color: t.done ? 'var(--mut)' : 'inherit',
                        }}
                      >
                        {t.title}
                      </b>
                      <span
                        className="pri"
                        style={{ background: p.color, fontSize: 10 }}
                      >
                        {p.label}
                      </span>
                    </div>
                    {t.detail && (
                      <small className="mut" style={{ display: 'block' }}>
                        {t.detail}
                      </small>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <small className="mut">
                      {t.endDate && t.endDate !== t.date
                        ? `${thDate(t.date)} – ${thDate(t.endDate)}`
                        : thDate(t.date)}
                    </small>
                    {t.time && (
                      <small style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, color: 'var(--mut)' }}>
                        <ClockIcon size={11} /> {t.time}
                      </small>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            padding: '8px 16px',
            background: 'var(--bg)',
            borderTop: '1px solid var(--line)',
            fontSize: 12,
            color: 'var(--mut)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>คลิกรายการเพื่อเปิดดูและแก้ไข</span>
          <span>กด Esc เพื่อปิด</span>
        </div>
      </div>
    </div>
  );
}
