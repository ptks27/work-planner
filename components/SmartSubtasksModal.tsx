'use client';

import React, { useState, useEffect } from 'react';
import { generateSmartSubtasks } from '@/lib/aiSubtasks';
import { SparklesIcon, CloseIcon, CheckIcon, PlusIcon } from './Icons';

interface SmartSubtasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  taskDetail?: string;
  onApplySubtasks: (newSubtasks: string[]) => void;
}

export default function SmartSubtasksModal({
  isOpen,
  onClose,
  taskTitle,
  taskDetail,
  onApplySubtasks,
}: SmartSubtasksModalProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ title: string; selected: boolean }>>([]);
  const [newCustomTitle, setNewCustomTitle] = useState('');

  useEffect(() => {
    if (isOpen && taskTitle) {
      setLoading(true);
      generateSmartSubtasks(taskTitle, taskDetail).then(results => {
        setSuggestions(results.map(r => ({ title: r.title, selected: true })));
        setLoading(false);
      });
    }
  }, [isOpen, taskTitle, taskDetail]);

  if (!isOpen) return null;

  const handleToggle = (index: number) => {
    setSuggestions(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setSuggestions(prev => prev.map(item => ({ ...item, selected: select })));
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomTitle.trim()) return;
    setSuggestions(prev => [...prev, { title: newCustomTitle.trim(), selected: true }]);
    setNewCustomTitle('');
  };

  const handleApply = () => {
    const selectedList = suggestions.filter(s => s.selected).map(s => s.title);
    if (selectedList.length > 0) {
      onApplySubtasks(selectedList);
    }
    onClose();
  };

  const selectedCount = suggestions.filter(s => s.selected).length;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        zIndex: 10000,
        animation: 'appleFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--card-solid, #ffffff)',
          borderRadius: 22,
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.32), 0 0 0 1px var(--line)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          border: '1px solid var(--line)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.04), rgba(175, 82, 222, 0.04))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0071e3, #af52de)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(175, 82, 222, 0.3)',
              }}
            >
              <SparklesIcon size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>
                AI ช่วยแตกงานย่อย (Subtasks Generator)
              </h3>
              <small style={{ color: 'var(--mut)', fontSize: 12 }}>
                วิเคราะห์ชื่องานและแนะนำขั้นตอนที่ควรทำให้อัตโนมัติ
              </small>
            </div>
          </div>

          <button
            type="button"
            className="btn ghost sm"
            onClick={onClose}
            style={{ borderRadius: 999, padding: '6px 8px' }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Task Title Context Card */}
        <div style={{ padding: '14px 20px 8px' }}>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(120, 120, 128, 0.05)',
              border: '1px solid var(--line)',
              fontSize: 13,
            }}
          >
            <span style={{ color: 'var(--mut)', fontSize: 11, display: 'block', fontWeight: 600 }}>
              ชื่องานปัจจุบัน:
            </span>
            <b style={{ color: 'var(--txt)', fontSize: 14 }}>{taskTitle}</b>
          </div>
        </div>

        {/* Content & Suggestions List */}
        <div style={{ padding: '10px 20px', maxHeight: '55vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--mut)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✨</div>
              <b>AI กำลังวิเคราะห์และแตกงานย่อย...</b>
            </div>
          ) : (
            <div>
              {/* Select All & Deselect All Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                  fontSize: 12,
                }}
              >
                <span style={{ color: 'var(--mut)', fontWeight: 600 }}>
                  เลือกขั้นตอนที่ต้องการ ({selectedCount}/{suggestions.length}):
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-link-subtle"
                    onClick={() => handleSelectAll(true)}
                    style={{ fontSize: 12, color: 'var(--pri)', cursor: 'pointer', background: 'none', border: 'none' }}
                  >
                    เลือกทั้งหมด
                  </button>
                  <span style={{ color: 'var(--line)' }}>|</span>
                  <button
                    type="button"
                    className="btn-link-subtle"
                    onClick={() => handleSelectAll(false)}
                    style={{ fontSize: 12, color: 'var(--mut)', cursor: 'pointer', background: 'none', border: 'none' }}
                  >
                    ยกเลิกทั้งหมด
                  </button>
                </div>
              </div>

              {/* Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {suggestions.map((item, idx) => (
                  <label
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: item.selected ? 'rgba(0, 113, 227, 0.05)' : 'var(--card-solid)',
                      border: item.selected
                        ? '1px solid rgba(0, 113, 227, 0.25)'
                        : '1px solid var(--line)',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'var(--txt)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => handleToggle(idx)}
                      style={{ accentColor: 'var(--pri)', width: 16, height: 16 }}
                    />
                    <span style={{ flex: 1, lineHeight: 1.4 }}>{item.title}</span>
                  </label>
                ))}
              </div>

              {/* Quick Add Custom Step form */}
              <form onSubmit={handleAddCustom} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input
                  type="text"
                  placeholder="+ เพิ่มขั้นตอนของคุณเอง..."
                  value={newCustomTitle}
                  onChange={e => setNewCustomTitle(e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: 12.5,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: 'var(--bg)',
                  }}
                />
                <button
                  type="submit"
                  className="btn sm"
                  style={{ borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <PlusIcon size={14} /> เพิ่ม
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--line)',
            background: 'rgba(120, 120, 128, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button type="button" className="btn ghost sm" onClick={onClose}>
            ยกเลิก
          </button>

          <button
            type="button"
            className="btn ok sm"
            onClick={handleApply}
            disabled={selectedCount === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 999,
              padding: '8px 18px',
              fontWeight: 600,
            }}
          >
            <SparklesIcon size={14} />
            <span>นำเข้า {selectedCount} งานย่อย</span>
          </button>
        </div>
      </div>
    </div>
  );
}
