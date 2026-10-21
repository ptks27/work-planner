'use client';

import React, { useState, useRef } from 'react';
import { usePlanner } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { useToday } from '@/lib/hooks';
import { CanvasNote, CanvasConnection, StickyColor, Priority, PRIORITIES, PRIORITY } from '@/lib/types';
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

const FLOW_ROLES: Array<{
  id: 'input' | 'process' | 'output' | 'database';
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
}> = [
  { id: 'input', label: 'Input (รับข้อมูล)', icon: '📥', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.14)', border: 'rgba(2, 132, 199, 0.35)' },
  { id: 'process', label: 'Process (ประมวลผล)', icon: '⚙️', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.14)', border: 'rgba(124, 58, 237, 0.35)' },
  { id: 'output', label: 'Output (ส่งผลลัพธ์)', icon: '📤', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.14)', border: 'rgba(22, 163, 74, 0.35)' },
  { id: 'database', label: 'Database (ฐานข้อมูล)', icon: '🗄️', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.14)', border: 'rgba(234, 88, 12, 0.35)' },
];

export default function CanvasTab() {
  const {
    canvasNotes,
    canvasConnections,
    addCanvasNote,
    updateCanvasNote,
    deleteCanvasNote,
    addCanvasConnection,
    deleteCanvasConnection,
    autoLayoutDataFlow,
    setCanvasData,
    convertNoteToTask,
    tasks,
  } = usePlanner();

  const { currentUser, users } = useAuth();
  const today = useToday();

  const [search, setSearch] = useState('');
  const [selectedColorFilter, setSelectedColorFilter] = useState<StickyColor | 'all'>('all');
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [editingRoleNoteId, setEditingRoleNoteId] = useState<string | null>(null);

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
  const connections = canvasConnections || [];

  // Filter notes
  const filteredNotes = notes.filter(n => {
    if (selectedColorFilter !== 'all' && n.color !== selectedColorFilter) return false;
    if (search.trim() && !n.text.toLowerCase().includes(search.toLowerCase().trim())) return false;
    return true;
  });

  const handleCreateNote = (
    color: StickyColor = 'yellow',
    role?: 'input' | 'process' | 'output' | 'database',
    defaultText?: string
  ) => {
    const offsetIndex = notes.length % 10;
    const initialX = 50 + (offsetIndex % 5) * 280;
    const initialY = 60 + Math.floor(offsetIndex / 5) * 270;

    addCanvasNote({
      text: defaultText || '',
      color,
      x: initialX,
      y: initialY,
      authorId: currentUser?.id,
      authorName: currentUser?.name || 'สมาชิก',
      authorAvatar: currentUser?.avatarId,
      flowRole: role,
      stepNumber: role ? notes.filter(n => n.flowRole).length + 1 : undefined,
    });
  };

  const handleStartDrag = (e: React.MouseEvent, note: CanvasNote) => {
    if (
      (e.target as HTMLElement).tagName === 'TEXTAREA' ||
      (e.target as HTMLElement).tagName === 'BUTTON' ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('.note-role-popover')
    ) {
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

    newX = Math.min(newX, 3200);
    newY = Math.min(newY, 3200);

    updateCanvasNote(draggingNoteId, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDraggingNoteId(null);
  };

  // Connection Click Handler
  const handleNoteConnectClick = (noteId: string) => {
    if (!connectingFromId) {
      setConnectingFromId(noteId);
    } else if (connectingFromId === noteId) {
      // Cancel
      setConnectingFromId(null);
    } else {
      // Complete connection from connectingFromId -> noteId
      addCanvasConnection(connectingFromId, noteId);
      setConnectingFromId(null);
    }
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

  // Quick Preset Sample Data Flow
  const handleAddSampleDataFlow = () => {
    const ts = Date.now();
    const id1 = `sample-${ts}-1`;
    const id2 = `sample-${ts}-2`;
    const id3 = `sample-${ts}-3`;
    const id4 = `sample-${ts}-4`;

    const sampleNotes: CanvasNote[] = [
      {
        id: id1,
        text: '📥 1. ผู้ใช้กรอกฟอร์มลงทะเบียน\n- ตรวจสอบอีเมล & รหัสผ่าน\n- เช็กรหัสทีมที่แนบมา',
        color: 'blue',
        x: 50,
        y: 80,
        authorId: currentUser?.id,
        authorName: currentUser?.name || 'สถาปัตยกรรมระบบ',
        authorAvatar: currentUser?.avatarId,
        flowRole: 'input',
        stepNumber: 1,
        createdAt: ts,
      },
      {
        id: id2,
        text: '⚙️ 2. ตรวจสอบความถูกต้อง (Validation)\n- Hash Password\n- เช็กอีเมลซ้ำในระบบ Firestore',
        color: 'purple',
        x: 370,
        y: 80,
        authorId: currentUser?.id,
        authorName: currentUser?.name || 'สถาปัตยกรรมระบบ',
        authorAvatar: currentUser?.avatarId,
        flowRole: 'process',
        stepNumber: 2,
        createdAt: ts + 1,
      },
      {
        id: id3,
        text: '🗄️ 3. บันทึกข้อมูลลงฐานข้อมูล\n- สร้าง User Document ใน Firestore\n- เพิ่ม Member เข้าทีม',
        color: 'orange',
        x: 690,
        y: 80,
        authorId: currentUser?.id,
        authorName: currentUser?.name || 'สถาปัตยกรรมระบบ',
        authorAvatar: currentUser?.avatarId,
        flowRole: 'database',
        stepNumber: 3,
        createdAt: ts + 2,
      },
      {
        id: id4,
        text: '📤 4. ส่งผลลัพธ์ & เข้าสู่แดชบอร์ด\n- ออก JWT Token / Session\n- นำทางเข้าหน้า Planner พร้อมซิงค์ข้อมูล',
        color: 'green',
        x: 1010,
        y: 80,
        authorId: currentUser?.id,
        authorName: currentUser?.name || 'สถาปัตยกรรมระบบ',
        authorAvatar: currentUser?.avatarId,
        flowRole: 'output',
        stepNumber: 4,
        createdAt: ts + 3,
      },
    ];

    const sampleConnections: CanvasConnection[] = [
      { id: `conn-${id1}-${id2}`, fromId: id1, toId: id2, label: 'Step 1 ➔ 2' },
      { id: `conn-${id2}-${id3}`, fromId: id2, toId: id3, label: 'Step 2 ➔ 3' },
      { id: `conn-${id3}-${id4}`, fromId: id3, toId: id4, label: 'Step 3 ➔ 4' },
    ];

    setCanvasData([...notes, ...sampleNotes], [...connections, ...sampleConnections]);
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
        {/* Left: Title & Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="macos-traffic-lights" aria-hidden="true">
            <span className="macos-traffic-dot red" />
            <span className="macos-traffic-dot yellow" />
            <span className="macos-traffic-dot green" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: 'rgba(255, 149, 0, 0.12)',
                color: '#ff9500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <StickyNoteIcon size={17} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
                กระดานไอเดีย & Data Flow (Visual Canvas)
              </h2>
              <small style={{ color: 'var(--mut)', fontSize: 11 }}>
                ระดมความคิด แปะโพสต์อิท และเชื่อมโยงเป็น Data Flow / Pipeline แปลงเป็นงานได้ทันที
              </small>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(120, 120, 128, 0.08)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--mut)',
              }}
            >
              {notes.length} โน้ต
            </span>
            {connections.length > 0 && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(0, 113, 227, 0.1)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--pri)',
                }}
              >
                {connections.length} Flow
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick Actions & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Auto Layout Data Flow Button */}
          {notes.length >= 2 && (
            <button
              type="button"
              className="btn sm"
              onClick={() => autoLayoutDataFlow()}
              style={{
                borderRadius: 999,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 600,
                background: 'rgba(0, 113, 227, 0.1)',
                color: 'var(--pri)',
                border: '1px solid rgba(0, 113, 227, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
              title="จัดเรียงตำแหน่งโพสต์อิทเป็นสาย Data Flow ซ้ายไปขวาพร้อมเชื่อมต่อเส้นอัตโนมัติ"
            >
              <BoltIcon size={13} color="var(--pri)" />
              <span>⚡ จัดเรียง Data Flow</span>
            </button>
          )}

          {/* Color quick pills to add */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 999,
              background: 'rgba(120, 120, 128, 0.08)',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--mut)', paddingLeft: 2, paddingRight: 2, fontWeight: 600 }}>
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
          <div style={{ position: 'relative', width: 150 }}>
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
              onClick={handleAddSampleDataFlow}
              style={{
                borderRadius: 999,
                padding: '5px 12px',
                fontSize: 11.5,
                background: 'rgba(52, 199, 89, 0.12)',
                color: '#15803d',
                border: '1px solid rgba(52, 199, 89, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <SparklesIcon size={13} />
              <span>ใส่ตัวอย่าง Data Flow</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Connecting Notice Banner */}
      {connectingFromId && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.95), rgba(59, 130, 246, 0.95))',
            color: '#fff',
            borderRadius: 12,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(0, 113, 227, 0.3)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <span>🔗</span>
            <span>กำลังเลือกการ์ดปลายทางสำหรับ Data Flow: คลิกที่โพสต์อิทใดก็ได้เพื่อเชื่อมโยงเส้น Flow</span>
          </div>
          <button
            type="button"
            onClick={() => setConnectingFromId(null)}
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              border: 'none',
              color: '#ffffff',
              borderRadius: 999,
              padding: '3px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ยกเลิก
          </button>
        </div>
      )}

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
        {/* SVG Flow Arrows Overlay */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 3400,
            height: 3400,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <defs>
            <marker
              id="flow-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0071e3" />
            </marker>
          </defs>

          {connections.map(conn => {
            const fromNote = notes.find(n => n.id === conn.fromId);
            const toNote = notes.find(n => n.id === conn.toId);
            if (!fromNote || !toNote) return null;

            // Compute connection anchors
            const isLeftToRight = toNote.x >= fromNote.x;
            const x1 = isLeftToRight ? fromNote.x + 260 : fromNote.x;
            const y1 = fromNote.y + 100;
            const x2 = isLeftToRight ? toNote.x : toNote.x + 260;
            const y2 = toNote.y + 100;

            const dx = Math.max(50, Math.abs(x2 - x1) * 0.45);
            const pathD = isLeftToRight
              ? `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
              : `M ${x1} ${y1} C ${x1 - dx} ${y1}, ${x2 + dx} ${y2}, ${x2} ${y2}`;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g key={conn.id}>
                {/* Background glow stroke */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="rgba(0, 113, 227, 0.2)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                {/* Main animated dashed flow line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#0071e3"
                  strokeWidth="2.5"
                  className="flow-line-animated"
                  markerEnd="url(#flow-arrow)"
                />
              </g>
            );
          })}
        </svg>

        {/* HTML Badges for Flow Connection Delete / Label */}
        {connections.map(conn => {
          const fromNote = notes.find(n => n.id === conn.fromId);
          const toNote = notes.find(n => n.id === conn.toId);
          if (!fromNote || !toNote) return null;

          const isLeftToRight = toNote.x >= fromNote.x;
          const x1 = isLeftToRight ? fromNote.x + 260 : fromNote.x;
          const y1 = fromNote.y + 100;
          const x2 = isLeftToRight ? toNote.x : toNote.x + 260;
          const y2 = toNote.y + 100;

          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          return (
            <div
              key={`badge-${conn.id}`}
              className="flow-connector-badge"
              style={{
                position: 'absolute',
                left: midX - 16,
                top: midY - 12,
                zIndex: 15,
                pointerEvents: 'auto',
              }}
            >
              <button
                type="button"
                onClick={() => deleteCanvasConnection(conn.id)}
                title="คลิกเพื่อตัดการเชื่อมต่อ Flow นี้"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#ffffff',
                  border: '1.5px solid #0071e3',
                  color: '#0071e3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(0, 113, 227, 0.25)',
                  padding: 0,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#dc2626';
                  e.currentTarget.style.borderColor = '#dc2626';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#0071e3';
                  e.currentTarget.style.color = '#0071e3';
                }}
              >
                ×
              </button>
            </div>
          );
        })}

        {/* Empty Canvas Notice */}
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
              กระดานไอเดีย & Data Flow ยังว่างอยู่
            </h3>
            <p style={{ margin: '6px 0 14px', fontSize: 13 }}>
              คลิกเลือกสีโพสต์อิทด้านบน หรือกดปุ่ม "ใส่ตัวอย่าง Data Flow" เพื่อเริ่มต้นได้เลย
            </p>
          </div>
        )}

        {/* Render Sticky Notes */}
        {filteredNotes.map((note, idx) => {
          const theme = STICKY_THEMES[note.color] || STICKY_THEMES.yellow;
          const isDragging = draggingNoteId === note.id;
          const isConverted = Boolean(note.convertedTaskId);
          const convertedTask = isConverted ? tasks.find(t => t.id === note.convertedTaskId) : null;
          const isConnectingSource = connectingFromId === note.id;
          const isRoleEditing = editingRoleNoteId === note.id;

          const currentRoleObj = FLOW_ROLES.find(r => r.id === note.flowRole);

          return (
            <div
              key={note.id}
              style={{
                position: 'absolute',
                left: note.x,
                top: note.y,
                width: 260,
                minHeight: 220,
                borderRadius: 14,
                background: theme.bg,
                border: isConnectingSource
                  ? '2px solid #0071e3'
                  : `1.5px solid ${theme.border}`,
                boxShadow: isDragging
                  ? '0 20px 40px rgba(0,0,0,0.2), 0 0 0 2px var(--pri)'
                  : isConnectingSource
                  ? '0 0 0 4px rgba(0, 113, 227, 0.25), 0 8px 22px rgba(0, 0, 0, 0.12)'
                  : '0 8px 22px -4px rgba(0, 0, 0, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: isDragging ? 100 : isRoleEditing ? 90 : 20,
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
                  padding: '7px 10px',
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
                      maxWidth: 100,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {note.authorName || 'สมาชิก'}
                  </span>
                </div>

                {/* Right controls: Delete */}
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

              {/* Data Flow Role & Step Badge Row */}
              <div
                style={{
                  padding: '5px 10px',
                  background: 'rgba(255, 255, 255, 0.4)',
                  borderBottom: `1px dashed ${theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
              >
                {/* Role Pill */}
                <div style={{ position: 'relative' }}>
                  {currentRoleObj ? (
                    <button
                      type="button"
                      onClick={() => setEditingRoleNoteId(isRoleEditing ? null : note.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: currentRoleObj.bg,
                        color: currentRoleObj.color,
                        border: `1px solid ${currentRoleObj.border}`,
                        fontSize: 10.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title="คลิกเพื่อเปลี่ยน Role ใน Data Flow"
                    >
                      <span>{currentRoleObj.icon}</span>
                      <span>{currentRoleObj.label.split(' ')[0]}</span>
                      {note.stepNumber && <span>#{note.stepNumber}</span>}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingRoleNoteId(isRoleEditing ? null : note.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 7px',
                        borderRadius: 999,
                        background: 'rgba(120, 120, 128, 0.1)',
                        color: 'var(--mut)',
                        border: '1px dashed rgba(120, 120, 128, 0.3)',
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="กำหนดบทบาทใน Data Flow (Input / Process / Output / DB)"
                    >
                      <span>+ Role Flow</span>
                    </button>
                  )}

                  {/* Role Selector Popover */}
                  {isRoleEditing && (
                    <div
                      className="note-role-popover"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 4,
                        minWidth: 170,
                        background: '#ffffff',
                        border: '1px solid var(--line)',
                        borderRadius: 12,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                        padding: 4,
                        zIndex: 200,
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      {FLOW_ROLES.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            updateCanvasNote(note.id, {
                              flowRole: r.id,
                              stepNumber: note.stepNumber || notes.filter(n => n.flowRole).length + 1,
                            });
                            setEditingRoleNoteId(null);
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 8px',
                            border: 'none',
                            borderRadius: 8,
                            background: note.flowRole === r.id ? r.bg : 'transparent',
                            color: note.flowRole === r.id ? r.color : '#1d1d1f',
                            fontSize: 11.5,
                            fontWeight: 600,
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          <span>{r.icon}</span>
                          <span>{r.label}</span>
                        </button>
                      ))}
                      {note.flowRole && (
                        <button
                          type="button"
                          onClick={() => {
                            updateCanvasNote(note.id, { flowRole: undefined, stepNumber: undefined });
                            setEditingRoleNoteId(null);
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 8px',
                            border: 'none',
                            borderRadius: 8,
                            background: 'transparent',
                            color: '#dc2626',
                            fontSize: 11,
                            fontWeight: 600,
                            textAlign: 'left',
                            cursor: 'pointer',
                            marginTop: 2,
                            borderTop: '1px solid var(--line)',
                          }}
                        >
                          <span>🚫</span>
                          <span>เอาบทบาทออก</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Step number badge / adjuster */}
                {note.flowRole && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <button
                      type="button"
                      onClick={() => updateCanvasNote(note.id, { stepNumber: Math.max(1, (note.stepNumber || 1) - 1) })}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: 'none',
                        background: 'rgba(0,0,0,0.06)',
                        cursor: 'pointer',
                        fontSize: 10,
                        lineHeight: 1,
                        padding: 0,
                      }}
                      title="ลดขั้นตอน"
                    >
                      -
                    </button>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: theme.text }}>
                      ขั้นที่ {note.stepNumber || 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCanvasNote(note.id, { stepNumber: (note.stepNumber || 1) + 1 })}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: 'none',
                        background: 'rgba(0,0,0,0.06)',
                        cursor: 'pointer',
                        fontSize: 10,
                        lineHeight: 1,
                        padding: 0,
                      }}
                      title="เพิ่มขั้นตอน"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* Note Content (Textarea) */}
              <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <textarea
                  value={note.text}
                  onChange={e => updateCanvasNote(note.id, { text: e.target.value })}
                  placeholder="พิมพ์ความคิดเห็น หรือไอเดีย Data Flow..."
                  style={{
                    width: '100%',
                    flex: 1,
                    minHeight: 85,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    color: theme.text,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    fontFamily: 'inherit',
                    padding: 0,
                    margin: 0,
                  }}
                />
              </div>

              {/* Note Footer: Color Dots & Action Buttons */}
              <div
                style={{
                  padding: '6px 8px',
                  borderTop: `1px solid ${theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.4)',
                  borderBottomLeftRadius: 12,
                  borderBottomRightRadius: 12,
                  gap: 4,
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
                        width: 13,
                        height: 13,
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

                {/* Flow Connector & Convert Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {/* Connect Flow Button */}
                  <button
                    type="button"
                    onClick={() => handleNoteConnectClick(note.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '3px 7px',
                      borderRadius: 999,
                      background: isConnectingSource
                        ? '#0071e3'
                        : connectingFromId
                        ? 'rgba(0, 113, 227, 0.15)'
                        : '#ffffff',
                      color: isConnectingSource ? '#ffffff' : 'var(--pri)',
                      border: '1px solid rgba(0, 113, 227, 0.3)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                    title={
                      isConnectingSource
                        ? 'กำลังเชื่อมต่อ (คลิกเพื่อยกเลิก)'
                        : connectingFromId
                        ? 'คลิกเพื่อเชื่อมต่อมาที่นี่'
                        : 'เชื่อมต่อ Flow ไปยังโพสต์อิทอื่น'
                    }
                  >
                    <span>{isConnectingSource ? '⚡' : connectingFromId ? '➔' : '🔗'}</span>
                    <span>{isConnectingSource ? 'ยกเลิก' : connectingFromId ? 'ต่อที่นี่' : 'เชื่อม Flow'}</span>
                  </button>

                  {/* Convert to Task Button */}
                  {isConverted ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 6px',
                        borderRadius: 999,
                        background: 'rgba(52, 199, 89, 0.2)',
                        color: '#15803d',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                      title={convertedTask ? `งาน: ${convertedTask.title}` : 'แปลงเป็นงานแล้ว'}
                    >
                      <CheckIcon size={9} strokeWidth={3} />
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
                        gap: 3,
                        padding: '3px 7px',
                        borderRadius: 999,
                        background: '#ffffff',
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                        fontSize: 10.5,
                        fontWeight: 700,
                        cursor: note.text.trim() ? 'pointer' : 'default',
                        opacity: note.text.trim() ? 1 : 0.5,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                      title="แปลงความคิดเห็นนี้เป็นการ์ดงานจริง"
                    >
                      <BoltIcon size={10} color="var(--pri)" />
                      <span>แปลงงาน</span>
                    </button>
                  )}
                </div>
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
