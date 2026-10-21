'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePlanner } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { useToday } from '@/lib/hooks';
import { CanvasNote, StickyColor, Priority, PRIORITIES, PRIORITY } from '@/lib/types';
import { AvatarIcon } from './Avatars';
import {
  StickyNoteIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  SearchIcon,
  SparklesIcon,
  CloseIcon,
  BoltIcon,
} from './Icons';
import ThaiDatePicker from './ThaiDatePicker';
import { playCompletionSound, triggerConfetti } from '@/lib/audio';

const STICKY_THEMES: Record<
  StickyColor,
  { bg: string; border: string; text: string; header: string; label: string }
> = {
  yellow: {
    bg: '#fef9c3',
    border: '#fde047',
    text: '#713f12',
    header: '#fef08a',
    label: 'สีเหลือง',
  },
  blue: {
    bg: '#e0f2fe',
    border: '#7dd3fc',
    text: '#075985',
    header: '#bae6fd',
    label: 'สีฟ้า',
  },
  green: {
    bg: '#dcfce7',
    border: '#86efac',
    text: '#14532d',
    header: '#bbf7d0',
    label: 'สีเขียว',
  },
  pink: {
    bg: '#fce7f3',
    border: '#f9a8d4',
    text: '#831843',
    header: '#fbcfe8',
    label: 'สีชมพู',
  },
  purple: {
    bg: '#f3e8ff',
    border: '#d8b4fe',
    text: '#581c87',
    header: '#e9d5ff',
    label: 'สีม่วง',
  },
  orange: {
    bg: '#ffedd5',
    border: '#fdba74',
    text: '#7c2d12',
    header: '#fed7aa',
    label: 'สีส้ม',
  },
};

const COLOR_KEYS: StickyColor[] = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'];

export default function CanvasTab() {
  const { canvasNotes, addCanvasNote, updateCanvasNote, deleteCanvasNote, convertNoteToTask, tasks } = usePlanner();
  const { currentUser, users } = useAuth();
  const today = useToday();

  const [search, setSearch] = useState('');
  const [selectedColorFilter, setSelectedColorFilter] = useState<StickyColor | 'all'>('all');

  // Dragging state
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Convert to task modal state
  const [convertingNote, setConvertingNote] = useState<CanvasNote | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDetail, setTaskDetail] = useState('');
  const [taskDate, setTaskDate] = useState(today);
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>('');

  const notes = canvasNotes || [];

  // Filter notes
  const filteredNotes = notes.filter(n => {
    if (selectedColorFilter !== 'all' && n.color !== selectedColorFilter) return false;
    if (search.trim() && !n.text.toLowerCase().includes(search.toLowerCase().trim())) return false;
    return true;
  });

  const handleCreateNote = (color: StickyColor = 'yellow') => {
    // คำนวณตำแหน่งไม่ให้ซ้อนกันตรงๆ
    const offsetIndex = notes.length % 10;
    const initialX = 40 + (offsetIndex % 5) * 250;
    const initialY = 40 + Math.floor(offsetIndex / 5) * 260;

    addCanvasNote({
      text: '',
      color,
      x: initialX,
      y: initialY,
      authorId: currentUser?.id,
      authorName: currentUser?.name || 'สมาชิก',
      authorAvatar: currentUser?.avatarId,
    });
  };

  const handleStartDrag = (e: React.MouseEvent, note: CanvasNote) => {
    // Only drag from header bar or when not clicking inside textarea/buttons
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }
    setDraggingNoteId(note.id);
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      dragOffsetRef.current = {
        offsetX: e.clientX - canvasRect.left - note.x,
        offsetY: e.clientY - canvasRect.top - note.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNoteId) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    let newX = Math.max(10, e.clientX - canvasRect.left - dragOffsetRef.current.offsetX);
    let newY = Math.max(10, e.clientY - canvasRect.top - dragOffsetRef.current.offsetY);

    // Limit to reasonable canvas bounds
    newX = Math.min(newX, 3200);
    newY = Math.min(newY, 3200);

    updateCanvasNote(draggingNoteId, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDraggingNoteId(null);
  };

  const openConvertModal = (note: CanvasNote) => {
    setConvertingNote(note);
    const lines = note.text.trim().split('\n');
    setTaskTitle(lines[0] || 'ไอเดียใหม่จากกระดาน');
    setTaskDetail(lines.slice(1).join('\n') || '');
    setTaskDate(today);
    setTaskPriority('medium');
    setTaskAssigneeId(currentUser?.id || (users[0]?.id ?? ''));
  };

  const handleConfirmConvert = () => {
    if (!convertingNote || !taskTitle.trim()) return;

    convertNoteToTask(convertingNote.id, {
      title: taskTitle.trim(),
      detail: taskDetail.trim(),
      date: taskDate || today,
      priority: taskPriority,
      assigneeId: taskAssigneeId || undefined,
    });

    playCompletionSound();
    triggerConfetti();
    setConvertingNote(null);
  };

  // Add sample brainstorming notes if canvas is empty
  const handleAddSampleNotes = () => {
    const samples: Array<{ text: string; color: StickyColor; x: number; y: number }> = [
      {
        text: '🎨 Redesign Landing Page 2026\n- อัปเดต SF Pro Typography\n- ใส่ Interactive Lightbox\n- เคลียร์ Contrast ให้เข้าเกณฑ์ WCAG',
        color: 'yellow',
        x: 40,
        y: 40,
      },
      {
        text: '🚀 แคมเปญโปรโมตเปิดตัวแอป\n- ทำวิดีโอตัวอย่าง 30 วินาที\n- ส่งเมลหาผู้ใช้งานกลุ่มทดสอบ VIP\n- โพสต์แชร์ใน Facebook Group',
        color: 'pink',
        x: 320,
        y: 40,
      },
      {
        text: '🔒 Security & Backup Audit\n- เช็ก Firestore Security Rules\n- ตั้งรอบ Backup ทุกสิ้นสัปดาห์\n- ตรวจสอบ Token Firebase',
        color: 'blue',
        x: 600,
        y: 40,
      },
      {
        text: '💡 ข้อเสนอแนะจากลูกค้า\n- อยากได้ระบบแชร์ความคืบหน้าให้ลูกค้าดู\n- ระบบส่งตรวจงานก่อนกด Done\n- โพสต์อิทระดมไอเดีย',
        color: 'green',
        x: 180,
        y: 330,
      },
    ];

    samples.forEach(s => {
      addCanvasNote({
        text: s.text,
        color: s.color,
        x: s.x,
        y: s.y,
        authorId: currentUser?.id,
        authorName: currentUser?.name || 'ตัวอย่างไอเดีย',
        authorAvatar: currentUser?.avatarId,
      });
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 110px)',
        minHeight: 650,
        gap: 12,
      }}
    >
      {/* Top Controls Bar */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          borderRadius: 14,
        }}
      >
        {/* Left: Title & Note Count */}
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
                background: 'rgba(255, 149, 0, 0.12)',
                color: '#ff9500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <StickyNoteIcon size={16} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
                กระดานไอเดีย & ระดมความคิด (Visual Canvas)
              </h2>
              <small style={{ color: 'var(--mut)', fontSize: 11 }}>
                ระดมไอเดีย แปะโพสต์อิทอิสระ และคลิกเดียวแปลงเข้าตารางงานของทีมได้ทันที
              </small>
            </div>
          </div>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(120, 120, 128, 0.08)',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--mut)',
              marginLeft: 4,
            }}
          >
            {notes.length} โน้ต
          </span>
        </div>

        {/* Right: Quick Add Colors + Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Color quick pills to add */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 6px',
              borderRadius: 999,
              background: 'rgba(120, 120, 128, 0.08)',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--mut)', paddingLeft: 4, paddingRight: 2, fontWeight: 600 }}>
              + โพสต์อิท:
            </span>
            {COLOR_KEYS.map(c => (
              <button
                key={`btn-color-${c}`}
                type="button"
                onClick={() => handleCreateNote(c)}
                title={`เพิ่มโพสต์อิท ${STICKY_THEMES[c].label}`}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: STICKY_THEMES[c].bg,
                  border: `2px solid ${STICKY_THEMES[c].border}`,
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'transform 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              />
            ))}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: 170 }}>
            <SearchIcon
              size={13}
              style={{
                position: 'absolute',
                left: 9,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--mut)',
              }}
            />
            <input
              type="text"
              placeholder="ค้นหาไอเดีย..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                paddingLeft: 28,
                paddingRight: 10,
                fontSize: 12,
                borderRadius: 999,
                height: 30,
                margin: 0,
              }}
            />
          </div>

          {notes.length === 0 && (
            <button
              type="button"
              className="btn sm"
              onClick={handleAddSampleNotes}
              style={{
                borderRadius: 999,
                padding: '4px 12px',
                fontSize: 11.5,
                background: 'rgba(0, 113, 227, 0.1)',
                color: 'var(--pri)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <SparklesIcon size={12} />
              <span>ใส่ตัวอย่างไอเดีย</span>
            </button>
          )}
        </div>
      </div>

      {/* Infinite Canvas Area with Apple Freeform Dot Grid */}
      <div
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          borderRadius: 16,
          background: 'var(--bg)',
          backgroundImage:
            'radial-gradient(rgba(120, 120, 128, 0.22) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
          border: '1px solid var(--line)',
          minHeight: 520,
          cursor: draggingNoteId ? 'grabbing' : 'default',
          userSelect: draggingNoteId ? 'none' : 'auto',
        }}
      >
        {filteredNotes.length === 0 && notes.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'var(--mut)',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 10 }}>🎨</div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>
              กระดานไอเดียยังว่างอยู่
            </h3>
            <p style={{ margin: '6px 0 14px', fontSize: 13 }}>
              คลิกเลือกสีโพสต์อิทด้านบน เพื่อแปะไอเดียแรกของคุณกับทีมได้เลย
            </p>
          </div>
        )}

        {/* Render Sticky Notes */}
        {filteredNotes.map((note, idx) => {
          const theme = STICKY_THEMES[note.color] || STICKY_THEMES.yellow;
          const isDragging = draggingNoteId === note.id;
          const isConverted = Boolean(note.convertedTaskId);
          const convertedTask = isConverted ? tasks.find(t => t.id === note.convertedTaskId) : null;

          return (
            <div
              key={note.id}
              style={{
                position: 'absolute',
                left: note.x,
                top: note.y,
                width: 260,
                minHeight: 210,
                borderRadius: 14,
                background: theme.bg,
                border: `1.5px solid ${theme.border}`,
                boxShadow: isDragging
                  ? '0 20px 40px rgba(0,0,0,0.2), 0 0 0 2px var(--pri)'
                  : '0 8px 22px -4px rgba(0, 0, 0, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: isDragging ? 100 : 1,
                transform: isDragging
                  ? 'scale(1.03) rotate(0deg)'
                  : idx % 2 === 0
                  ? 'rotate(-0.8deg)'
                  : 'rotate(0.8deg)',
                transition: isDragging
                  ? 'box-shadow 0.15s ease, transform 0.15s ease'
                  : 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={e => {
                if (!isDragging) e.currentTarget.style.transform = 'scale(1.02) rotate(0deg)';
              }}
              onMouseLeave={e => {
                if (!isDragging) {
                  e.currentTarget.style.transform =
                    idx % 2 === 0 ? 'rotate(-0.8deg)' : 'rotate(0.8deg)';
                }
              }}
            >
              {/* Note Header / Drag Handle */}
              <div
                onMouseDown={e => handleStartDrag(e, note)}
                style={{
                  padding: '8px 12px',
                  background: theme.header,
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'grab',
                  borderBottom: `1px solid ${theme.border}`,
                }}
              >
                {/* Author Avatar & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {note.authorAvatar && <AvatarIcon id={note.authorAvatar} size={18} />}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: theme.text,
                      maxWidth: 110,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {note.authorName || 'สมาชิก'}
                  </span>
                </div>

                {/* Right controls: Color swatches & Delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => deleteCanvasNote(note.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: theme.text,
                      opacity: 0.6,
                      cursor: 'pointer',
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="ลบโพสต์อิทนี้"
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                  >
                    <TrashIcon size={13} />
                  </button>
                </div>
              </div>

              {/* Note Content (Textarea) */}
              <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <textarea
                  value={note.text}
                  onChange={e => updateCanvasNote(note.id, { text: e.target.value })}
                  placeholder="พิมพ์ไอเดียของคุณที่นี่..."
                  style={{
                    width: '100%',
                    flex: 1,
                    minHeight: 100,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    color: theme.text,
                    fontSize: 13,
                    lineHeight: 1.5,
                    fontFamily: 'inherit',
                    padding: 0,
                    margin: 0,
                  }}
                />
              </div>

              {/* Note Footer: Convert to Task Button & Color Selector */}
              <div
                style={{
                  padding: '6px 10px',
                  borderTop: `1px solid ${theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.3)',
                  borderBottomLeftRadius: 12,
                  borderBottomRightRadius: 12,
                }}
              >
                {/* Color Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {COLOR_KEYS.map(c => (
                    <button
                      key={`sub-c-${c}`}
                      type="button"
                      onClick={() => updateCanvasNote(note.id, { color: c })}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: STICKY_THEMES[c].bg,
                        border: `1.5px solid ${STICKY_THEMES[c].border}`,
                        padding: 0,
                        cursor: 'pointer',
                        transform: note.color === c ? 'scale(1.2)' : 'scale(1)',
                        boxShadow: note.color === c ? '0 0 0 1px #000' : 'none',
                      }}
                      title={STICKY_THEMES[c].label}
                    />
                  ))}
                </div>

                {/* Convert to Task Button */}
                {isConverted ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(52, 199, 89, 0.2)',
                      color: '#15803d',
                      fontSize: 10.5,
                      fontWeight: 700,
                    }}
                    title={convertedTask ? `งาน: ${convertedTask.title} (${convertedTask.status})` : 'แปลงเป็นงานแล้ว'}
                  >
                    <CheckIcon size={10} strokeWidth={3} />
                    <span>แปลงแล้ว</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openConvertModal(note)}
                    disabled={!note.text.trim()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 9px',
                      borderRadius: 999,
                      background: '#ffffff',
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: note.text.trim() ? 'pointer' : 'default',
                      opacity: note.text.trim() ? 1 : 0.5,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <BoltIcon size={11} color="var(--pri)" />
                    <span>แปลงเป็นงาน</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Convert Note to Task Modal */}
      {convertingNote && (
        <div className="modal-overlay" onClick={() => setConvertingNote(null)}>
          <div
            className="modal-box"
            style={{ maxWidth: 460, width: '92%' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(0, 113, 227, 0.12)',
                    color: 'var(--pri)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BoltIcon size={16} />
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>แปลงโพสต์อิทเข้าตารางงาน</h3>
                  <small style={{ color: 'var(--mut)', fontSize: 11.5 }}>
                    สร้างเป็นการ์ดงานจริงในระบบเพื่อติดตามความคืบหน้า
                  </small>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setConvertingNote(null)}>
                <CloseIcon size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>ชื่องาน *</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="สิ่งที่ต้องทำ..."
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>รายละเอียดเพิ่มเติม</label>
                <textarea
                  rows={2}
                  value={taskDetail}
                  onChange={e => setTaskDetail(e.target.value)}
                  placeholder="รายละเอียด..."
                />
              </div>

              <div className="row">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>กำหนดส่ง *</label>
                  <ThaiDatePicker value={taskDate} onChange={setTaskDate} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>ความสำคัญ</label>
                  <select
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value as Priority)}
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>
                        {PRIORITY[p].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>ผู้รับผิดชอบงาน</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {users.map(u => {
                    const isSelected = taskAssigneeId === u.id;
                    return (
                      <button
                        key={`modal-assignee-${u.id}`}
                        type="button"
                        onClick={() => setTaskAssigneeId(u.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px 4px 6px',
                          borderRadius: 999,
                          border: isSelected ? '1.5px solid var(--pri)' : '1px solid var(--line)',
                          background: isSelected ? 'var(--pri-l)' : 'rgba(120, 120, 128, 0.05)',
                          color: isSelected ? 'var(--pri)' : 'var(--txt)',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: isSelected ? 700 : 500,
                        }}
                      >
                        <AvatarIcon id={u.avatarId} size={18} />
                        <span>{u.name} {u.id === currentUser?.id ? '(ฉัน)' : ''}</span>
                        {isSelected && <CheckIcon size={12} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setConvertingNote(null)}>
                ยกเลิก
              </button>
              <button
                className="btn primary"
                onClick={handleConfirmConvert}
                disabled={!taskTitle.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <CheckIcon size={14} />
                <span>ยืนยันแปลงเป็นงาน</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
