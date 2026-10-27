'use client';

import React, { useState, useRef } from 'react';
import { usePlanner } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { useToday } from '@/lib/hooks';
import {
  CanvasNote,
  CanvasConnection,
  CanvasBoard,
  CanvasStroke,
  CanvasSection,
  CanvasPoint,
  SectionType,
  StickyColor,
  Priority,
  PRIORITIES,
  PRIORITY,
} from '@/lib/types';
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
  CopyIcon,
  EditIcon,
  ClockIcon,
} from './Icons';
import ThaiDatePicker from './ThaiDatePicker';
import { playCompletionSound, triggerConfetti } from '@/lib/audio';
import { useModal } from './ModalContext';

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

const DRAWING_COLORS = [
  { color: '#1c1c1e', label: 'สีดำเข้ม' },
  { color: '#0071e3', label: 'สีน้ำเงิน Apple Blue' },
  { color: '#ff3b30', label: 'สีแดง Apple Red' },
  { color: '#34c759', label: 'สีเขียว Apple Green' },
  { color: '#ff9500', label: 'สีส้ม Apple Orange' },
  { color: '#af52de', label: 'สีม่วง Apple Purple' },
  { color: '#eab308', label: 'สีเหลืองไฮไลท์' },
];

function pointsToSvgPath(points?: CanvasPoint[]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.5} ${points[0].y + 0.5}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
  }
  d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  return d;
}

export default function CanvasTab() {
  const {
    canvasNotes,
    canvasConnections,
    canvasBoards,
    canvasStrokes,
    canvasSections,
    activeBoardId,
    addCanvasNote,
    updateCanvasNote,
    deleteCanvasNote,
    addCanvasConnection,
    deleteCanvasConnection,
    autoLayoutDataFlow,
    setCanvasData,
    addCanvasStroke,
    deleteCanvasStroke,
    undoLastStroke,
    clearCanvasStrokes,
    addCanvasSection,
    updateCanvasSection,
    deleteCanvasSection,
    createCanvasBoard,
    switchCanvasBoard,
    renameCanvasBoard,
    deleteCanvasBoard,
    duplicateCanvasBoard,
    convertNoteToTask,
    tasks,
  } = usePlanner();

  const { currentUser, users } = useAuth();
  const today = useToday();
  const { showAlert, showConfirm } = useModal();

  const [search, setSearch] = useState('');
  const [selectedColorFilter, setSelectedColorFilter] = useState<StickyColor | 'all'>('all');
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [editingRoleNoteId, setEditingRoleNoteId] = useState<string | null>(null);

  // Drawing Tools state (Select / Pencil / Highlighter / Eraser)
  const [toolMode, setToolMode] = useState<'select' | 'pencil' | 'highlighter' | 'eraser'>('select');
  const [pencilColor, setPencilColor] = useState<string>('#0071e3');
  const [pencilWidth, setPencilWidth] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStrokePoints, setCurrentStrokePoints] = useState<CanvasPoint[]>([]);

  // Sections and Dividers state
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const dragSectionOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });
  const [resizingSectionId, setResizingSectionId] = useState<string | null>(null);
  const resizeSectionStartRef = useRef<{ startX: number; startY: number }>({ startX: 0, startY: 0 });
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');

  // Board Manager state
  const [isBoardManagerOpen, setIsBoardManagerOpen] = useState(false);
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardTemplate, setNewBoardTemplate] = useState<'blank' | 'sample_flow'>('blank');
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingBoardTitle, setEditingBoardTitle] = useState('');
  const [boardSearch, setBoardSearch] = useState('');

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
  const strokes = canvasStrokes || [];
  const sections = canvasSections || [];

  // Compute Active Board & Board list
  const boards: CanvasBoard[] =
    canvasBoards && canvasBoards.length > 0
      ? canvasBoards
      : [
          {
            id: activeBoardId || 'default-board',
            title: 'กระดานเริ่มต้น (Main Flow)',
            notes,
            connections,
            strokes,
            sections,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ];
  const currentBoard = boards.find(b => b.id === (activeBoardId || 'default-board')) || boards[0];

  // Helper to get absolute canvas coordinate considering scroll
  const getCanvasCoords = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left + canvasRef.current.scrollLeft,
      y: e.clientY - rect.top + canvasRef.current.scrollTop,
    };
  };

  // Filter notes on current board
  const filteredNotes = notes.filter(n => {
    if (selectedColorFilter !== 'all' && n.color !== selectedColorFilter) return false;
    if (search.trim() && !n.text.toLowerCase().includes(search.toLowerCase().trim())) return false;
    return true;
  });

  // Filter saved boards in Manager
  const filteredBoards = boards.filter(b => {
    if (!boardSearch.trim()) return true;
    return b.title.toLowerCase().includes(boardSearch.toLowerCase().trim());
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

  // Sections & Dividers actions
  const handleCreateHorizontalDivider = () => {
    const scrollY = canvasRef.current?.scrollTop || 0;
    const initialY = Math.max(80, scrollY + 160);
    addCanvasSection({
      title: '📌 เส้นแบ่งเฟส / Phase',
      type: 'horizontal_line',
      x: 40,
      y: initialY,
      width: 2400,
      height: 4,
      color: '#0071e3',
      style: 'dashed',
    });
  };

  const handleCreateVerticalDivider = () => {
    const scrollX = canvasRef.current?.scrollLeft || 0;
    const initialX = Math.max(100, scrollX + 380);
    addCanvasSection({
      title: '▎ คอลัมน์สมาชิก / แผนก',
      type: 'vertical_line',
      x: initialX,
      y: 40,
      width: 4,
      height: 1800,
      color: '#af52de',
      style: 'dashed',
    });
  };

  const handleCreateSectionZone = (color: string = '#0071e3') => {
    const scrollX = canvasRef.current?.scrollLeft || 0;
    const scrollY = canvasRef.current?.scrollTop || 0;
    const initialX = Math.max(60, scrollX + 120);
    const initialY = Math.max(80, scrollY + 120);
    addCanvasSection({
      title: '🔲 โซนงาน (Section Frame)',
      type: 'zone',
      x: initialX,
      y: initialY,
      width: 580,
      height: 420,
      color,
      style: 'dashed',
    });
  };

  const handleStartDragSection = (e: React.MouseEvent, sec: CanvasSection) => {
    e.stopPropagation();
    if (toolMode !== 'select') return;
    setDraggingSectionId(sec.id);
    const coords = getCanvasCoords(e);
    dragSectionOffsetRef.current = {
      offsetX: coords.x - sec.x,
      offsetY: coords.y - sec.y,
    };
  };

  const handleStartResizeSection = (e: React.MouseEvent, sec: CanvasSection) => {
    e.stopPropagation();
    if (toolMode !== 'select') return;
    setResizingSectionId(sec.id);
    resizeSectionStartRef.current = {
      startX: sec.x,
      startY: sec.y,
    };
  };

  const handleStartEditSectionTitle = (sec: CanvasSection) => {
    setEditingSectionId(sec.id);
    setEditingSectionTitle(sec.title);
  };

  const handleSaveSectionTitle = (secId: string) => {
    if (editingSectionTitle.trim()) {
      updateCanvasSection(secId, { title: editingSectionTitle.trim() });
    }
    setEditingSectionId(null);
  };

  // Mouse Handlers for Drawing and Dragging
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (toolMode === 'pencil' || toolMode === 'highlighter') {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.closest('.canvas-section-handle')
      ) {
        return;
      }
      const coords = getCanvasCoords(e);
      setIsDrawing(true);
      setCurrentStrokePoints([{ x: Math.round(coords.x), y: Math.round(coords.y) }]);
    }
  };

  const handleStartDrag = (e: React.MouseEvent, note: CanvasNote) => {
    if (toolMode !== 'select') return;
    if (
      (e.target as HTMLElement).tagName === 'TEXTAREA' ||
      (e.target as HTMLElement).tagName === 'BUTTON' ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('.note-role-popover')
    ) {
      return;
    }
    setDraggingNoteId(note.id);
    const coords = getCanvasCoords(e);
    dragOffsetRef.current = {
      offsetX: coords.x - note.x,
      offsetY: coords.y - note.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Freehand drawing mode
    if (isDrawing && (toolMode === 'pencil' || toolMode === 'highlighter')) {
      const coords = getCanvasCoords(e);
      const rounded = { x: Math.round(coords.x), y: Math.round(coords.y) };
      const last = currentStrokePoints[currentStrokePoints.length - 1];
      if (!last || Math.hypot(rounded.x - last.x, rounded.y - last.y) >= 2) {
        setCurrentStrokePoints(prev => [...prev, rounded]);
      }
      return;
    }

    // 2. Dragging note
    if (draggingNoteId) {
      const coords = getCanvasCoords(e);
      let newX = Math.max(10, coords.x - dragOffsetRef.current.offsetX);
      let newY = Math.max(10, coords.y - dragOffsetRef.current.offsetY);
      newX = Math.min(newX, 3200);
      newY = Math.min(newY, 3200);
      updateCanvasNote(draggingNoteId, { x: newX, y: newY });
      return;
    }

    // 3. Dragging section or divider
    if (draggingSectionId) {
      const coords = getCanvasCoords(e);
      let newX = Math.max(10, coords.x - dragSectionOffsetRef.current.offsetX);
      let newY = Math.max(10, coords.y - dragSectionOffsetRef.current.offsetY);
      newX = Math.min(newX, 3200);
      newY = Math.min(newY, 3200);
      updateCanvasSection(draggingSectionId, { x: newX, y: newY });
      return;
    }

    // 4. Resizing section zone
    if (resizingSectionId) {
      const coords = getCanvasCoords(e);
      const newWidth = Math.max(240, Math.min(2400, coords.x - resizeSectionStartRef.current.startX));
      const newHeight = Math.max(160, Math.min(2400, coords.y - resizeSectionStartRef.current.startY));
      updateCanvasSection(resizingSectionId, { width: newWidth, height: newHeight });
      return;
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (currentStrokePoints.length >= 2) {
        addCanvasStroke({
          points: currentStrokePoints,
          color: pencilColor,
          width: toolMode === 'highlighter' ? 14 : pencilWidth,
          isHighlighter: toolMode === 'highlighter',
        });
      }
      setCurrentStrokePoints([]);
    }
    setDraggingNoteId(null);
    setDraggingSectionId(null);
    setResizingSectionId(null);
  };

  // Connection Click Handler
  const handleNoteConnectClick = (noteId: string) => {
    if (!connectingFromId) {
      setConnectingFromId(noteId);
    } else if (connectingFromId === noteId) {
      setConnectingFromId(null);
    } else {
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

  // Board Creation Handler
  const handleOpenCreateModal = () => {
    setNewBoardTitle(`Flow ใหม่ #${boards.length + 1}`);
    setNewBoardTemplate('blank');
    setIsCreateBoardModalOpen(true);
  };

  const handleConfirmCreateBoard = () => {
    const title = newBoardTitle.trim() || `Flow ใหม่ #${boards.length + 1}`;
    createCanvasBoard(title);

    if (newBoardTemplate === 'sample_flow') {
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
      setCanvasData(sampleNotes, sampleConnections);
    }

    setNewBoardTitle('');
    setIsCreateBoardModalOpen(false);
    setIsBoardManagerOpen(false);
  };

  const handleStartRename = (b: CanvasBoard, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBoardId(b.id);
    setEditingBoardTitle(b.title);
  };

  const handleSaveRename = (boardId: string) => {
    if (editingBoardTitle.trim()) {
      renameCanvasBoard(boardId, editingBoardTitle.trim());
    }
    setEditingBoardId(null);
  };

  const handleDeleteBoard = (b: CanvasBoard, e: React.MouseEvent) => {
    e.stopPropagation();
    if (boards.length <= 1) {
      showAlert('ไม่สามารถลบได้', 'ไม่สามารถลบ Flow สุดท้ายได้ คุณต้องมีอย่างน้อย 1 Flow สำหรับใช้งาน');
      return;
    }
    showConfirm(
      'ยืนยันการลบ Flow',
      `คุณต้องการลบ "${b.title}" ใช่หรือไม่?\n(ข้อมูลโพสต์อิทและการเชื่อมต่อทั้งหมดใน Flow นี้จะถูกลบออก)`,
      () => {
        deleteCanvasBoard(b.id);
      },
      { confirmText: 'ลบ Flow', danger: true }
    );
  };

  const handleDuplicateBoard = (b: CanvasBoard, e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateCanvasBoard(b.id);
    setIsBoardManagerOpen(false);
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
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          borderRadius: 14,
        }}
      >
        {/* Left: Title, Flow Switcher & Note Count */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  กระดานไอเดีย & Data Flow
                </h2>

                {/* Board Switcher Dropdown Button */}
                <button
                  type="button"
                  onClick={() => setIsBoardManagerOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: 'rgba(0, 113, 227, 0.08)',
                    border: '1px solid rgba(0, 113, 227, 0.25)',
                    color: 'var(--pri)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="คลิกเพื่อสลับดู Flow เก่าที่บันทึกไว้ หรือสร้าง Flow ใหม่"
                >
                  <span>📂</span>
                  <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentBoard.title}
                  </span>
                  <span style={{ fontSize: 10.5, opacity: 0.65 }}>({boards.length} Flows)</span>
                  <span style={{ fontSize: 9 }}>▼</span>
                </button>

                {/* Quick New Board Button */}
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: 'rgba(120, 120, 128, 0.08)',
                    border: '1px solid var(--line)',
                    color: 'var(--txt)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="สร้าง Flow ใหม่ (กระดานใหม่)"
                >
                  <PlusIcon size={11} />
                  <span>สร้าง Flow ใหม่</span>
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 2 }}>
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
            {strokes.length > 0 && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(255, 149, 0, 0.1)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#ea580c',
                }}
                title={`${strokes.length} เส้นวาดและไฮไลท์`}
              >
                ✏️ {strokes.length} เส้นวาด
              </span>
            )}
            {sections.length > 0 && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(175, 82, 222, 0.1)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#af52de',
                }}
                title={`${sections.length} เส้นคั่นและกรอบโซน`}
              >
                📏 {sections.length} เส้นคั่น
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
                fontSize: 11.5,
                fontWeight: 600,
                background: 'rgba(0, 113, 227, 0.1)',
                color: 'var(--pri)',
                border: '1px solid rgba(0, 113, 227, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
              }}
              title="จัดเรียงตำแหน่งโพสต์อิทเป็นสาย Data Flow ซ้ายไปขวาพร้อมเชื่อมต่อเส้นอัตโนมัติ"
            >
              <BoltIcon size={12} color="var(--pri)" />
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
          <div style={{ position: 'relative', width: 140 }}>
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
                fontSize: 11.5,
                borderRadius: 999,
                height: 28,
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
                padding: '4px 10px',
                fontSize: 11,
                background: 'rgba(52, 199, 89, 0.12)',
                color: '#15803d',
                border: '1px solid rgba(52, 199, 89, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <SparklesIcon size={12} />
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
        style={{
          flex: 1,
          position: 'relative',
          minHeight: 520,
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            overflow: 'auto',
            background: 'var(--bg)',
            backgroundImage:
              'radial-gradient(rgba(120, 120, 128, 0.22) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            cursor:
              toolMode === 'pencil' || toolMode === 'highlighter'
                ? 'crosshair'
                : toolMode === 'eraser'
                ? 'cell'
                : draggingNoteId || draggingSectionId
                ? 'grabbing'
                : 'default',
            userSelect: draggingNoteId || draggingSectionId || isDrawing ? 'none' : 'auto',
          }}
        >
          {/* Sections, Partitions & Divider Lines */}
          {sections.map(sec => {
            if (sec.type === 'horizontal_line') {
              return (
                <div
                  key={sec.id}
                  style={{
                    position: 'absolute',
                    left: sec.x,
                    top: sec.y,
                    width: sec.width || 2400,
                    zIndex: 5,
                    pointerEvents: toolMode === 'pencil' || toolMode === 'highlighter' ? 'none' : 'auto',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Draggable Header Badge */}
                    <div
                      onMouseDown={e => handleStartDragSection(e, sec)}
                      className="canvas-section-handle"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: 'var(--card-solid)',
                        border: `1.5px solid ${sec.color || '#0071e3'}`,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        cursor: toolMode === 'select' ? 'grab' : 'default',
                        userSelect: 'none',
                      }}
                    >
                      <span style={{ color: 'var(--mut)', fontSize: 13, cursor: 'grab' }}>⋮⋮</span>
                      {editingSectionId === sec.id ? (
                        <input
                          type="text"
                          value={editingSectionTitle}
                          autoFocus
                          onChange={e => setEditingSectionTitle(e.target.value)}
                          onBlur={() => handleSaveSectionTitle(sec.id)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveSectionTitle(sec.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            fontWeight: 700,
                            fontSize: 12,
                            color: 'var(--txt)',
                            outline: 'none',
                            minWidth: 120,
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => handleStartEditSectionTitle(sec)}
                          title="คลิกเพื่อแก้ไขชื่อเส้นคั่น"
                          style={{
                            fontWeight: 700,
                            fontSize: 12,
                            color: sec.color || 'var(--txt)',
                            cursor: 'text',
                          }}
                        >
                          {sec.title || 'เส้นคั่นแนวนอน'}
                        </span>
                      )}

                      {/* Color switcher button */}
                      <button
                        type="button"
                        onClick={() => {
                          const colors = ['#0071e3', '#af52de', '#ff9500', '#10b981', '#64748b'];
                          const nextColor = colors[(colors.indexOf(sec.color || '#0071e3') + 1) % colors.length];
                          updateCanvasSection(sec.id, { color: nextColor });
                        }}
                        style={{
                          width: 13,
                          height: 13,
                          borderRadius: '50%',
                          background: sec.color || '#0071e3',
                          border: '1.5px solid #ffffff',
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        title="เปลี่ยนสีเส้นคั่น"
                      />

                      {/* Style toggle (solid / dashed) */}
                      <button
                        type="button"
                        onClick={() => updateCanvasSection(sec.id, { style: sec.style === 'solid' ? 'dashed' : 'solid' })}
                        style={{
                          border: 'none',
                          background: 'none',
                          fontSize: 11,
                          color: 'var(--mut)',
                          cursor: 'pointer',
                          padding: '1px 3px',
                        }}
                        title="สลับรูปแบบเส้น (เส้นประ / เส้นทึบ)"
                      >
                        {sec.style === 'solid' ? '━' : '┄'}
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => deleteCanvasSection(sec.id)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: 'var(--mut)',
                          cursor: 'pointer',
                          padding: '1px 4px',
                          fontSize: 11,
                          lineHeight: 1,
                        }}
                        title="ลบเส้นคั่นนี้"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Horizontal line */}
                    <div
                      style={{
                        flex: 1,
                        height: 0,
                        borderTop: `2px ${sec.style === 'solid' ? 'solid' : 'dashed'} ${sec.color || '#0071e3'}`,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>
              );
            }

            if (sec.type === 'vertical_line') {
              return (
                <div
                  key={sec.id}
                  style={{
                    position: 'absolute',
                    left: sec.x,
                    top: sec.y,
                    height: sec.height || 1800,
                    width: 200,
                    zIndex: 5,
                    pointerEvents: toolMode === 'pencil' || toolMode === 'highlighter' ? 'none' : 'auto',
                  }}
                >
                  <div style={{ position: 'relative', height: '100%' }}>
                    {/* Draggable Header Badge at top */}
                    <div
                      onMouseDown={e => handleStartDragSection(e, sec)}
                      className="canvas-section-handle"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: 'var(--card-solid)',
                        border: `1.5px solid ${sec.color || '#af52de'}`,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        cursor: toolMode === 'select' ? 'grab' : 'default',
                        userSelect: 'none',
                        position: 'absolute',
                        top: 0,
                        left: -50,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ color: 'var(--mut)', fontSize: 13, cursor: 'grab' }}>⋮⋮</span>
                      {editingSectionId === sec.id ? (
                        <input
                          type="text"
                          value={editingSectionTitle}
                          autoFocus
                          onChange={e => setEditingSectionTitle(e.target.value)}
                          onBlur={() => handleSaveSectionTitle(sec.id)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveSectionTitle(sec.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            fontWeight: 700,
                            fontSize: 12,
                            color: 'var(--txt)',
                            outline: 'none',
                            minWidth: 100,
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => handleStartEditSectionTitle(sec)}
                          title="คลิกเพื่อแก้ไขชื่อคอลัมน์"
                          style={{
                            fontWeight: 700,
                            fontSize: 12,
                            color: sec.color || 'var(--txt)',
                            cursor: 'text',
                          }}
                        >
                          {sec.title || 'คอลัมน์แบ่งงาน'}
                        </span>
                      )}

                      {/* Color switcher button */}
                      <button
                        type="button"
                        onClick={() => {
                          const colors = ['#af52de', '#0071e3', '#ff9500', '#10b981', '#64748b'];
                          const nextColor = colors[(colors.indexOf(sec.color || '#af52de') + 1) % colors.length];
                          updateCanvasSection(sec.id, { color: nextColor });
                        }}
                        style={{
                          width: 13,
                          height: 13,
                          borderRadius: '50%',
                          background: sec.color || '#af52de',
                          border: '1.5px solid #ffffff',
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        title="เปลี่ยนสีเส้นคั่น"
                      />

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => deleteCanvasSection(sec.id)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: 'var(--mut)',
                          cursor: 'pointer',
                          padding: '1px 4px',
                          fontSize: 11,
                          lineHeight: 1,
                        }}
                        title="ลบเส้นคั่นนี้"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Vertical line stretching downwards */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 36,
                        left: 0,
                        width: 0,
                        height: 'calc(100% - 36px)',
                        borderLeft: `2px ${sec.style === 'solid' ? 'solid' : 'dashed'} ${sec.color || '#af52de'}`,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>
              );
            }

            if (sec.type === 'zone') {
              return (
                <div
                  key={sec.id}
                  style={{
                    position: 'absolute',
                    left: sec.x,
                    top: sec.y,
                    width: sec.width || 580,
                    height: sec.height || 420,
                    borderRadius: 20,
                    background: 'rgba(120, 120, 128, 0.04)',
                    border: `2px dashed ${sec.color || '#0071e3'}`,
                    boxShadow: 'inset 0 0 30px rgba(0,0,0,0.015)',
                    zIndex: 2,
                    pointerEvents: toolMode === 'pencil' || toolMode === 'highlighter' ? 'none' : 'auto',
                  }}
                >
                  {/* Zone Header Badge */}
                  <div
                    onMouseDown={e => handleStartDragSection(e, sec)}
                    className="canvas-section-handle"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 14px',
                      borderRadius: '18px 0 14px 0',
                      background: 'var(--card-solid)',
                      borderBottom: `1.5px solid ${sec.color || '#0071e3'}`,
                      borderRight: `1.5px solid ${sec.color || '#0071e3'}`,
                      cursor: toolMode === 'select' ? 'grab' : 'default',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ color: 'var(--mut)', fontSize: 13, cursor: 'grab' }}>⋮⋮</span>
                    <span style={{ fontSize: 14 }}>🔲</span>
                    {editingSectionId === sec.id ? (
                      <input
                        type="text"
                        value={editingSectionTitle}
                        autoFocus
                        onChange={e => setEditingSectionTitle(e.target.value)}
                        onBlur={() => handleSaveSectionTitle(sec.id)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveSectionTitle(sec.id)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          fontWeight: 700,
                          fontSize: 12.5,
                          color: 'var(--txt)',
                          outline: 'none',
                          minWidth: 120,
                        }}
                      />
                    ) : (
                      <span
                        onClick={() => handleStartEditSectionTitle(sec)}
                        title="คลิกเพื่อแก้ไขชื่อโซน"
                        style={{
                          fontWeight: 700,
                          fontSize: 12.5,
                          color: 'var(--txt)',
                          cursor: 'text',
                        }}
                      >
                        {sec.title || 'กรอบแบ่งโซน'}
                      </span>
                    )}

                    {/* Color switcher button */}
                    <button
                      type="button"
                      onClick={() => {
                        const colors = ['#0071e3', '#af52de', '#10b981', '#ff9500', '#64748b'];
                        const nextColor = colors[(colors.indexOf(sec.color || '#0071e3') + 1) % colors.length];
                        updateCanvasSection(sec.id, { color: nextColor });
                      }}
                      style={{
                        width: 13,
                        height: 13,
                        borderRadius: '50%',
                        background: sec.color || '#0071e3',
                        border: '1.5px solid #ffffff',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      title="เปลี่ยนสีธีมของโซนนี้"
                    />

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => deleteCanvasSection(sec.id)}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: 'var(--mut)',
                        cursor: 'pointer',
                        padding: '1px 4px',
                        fontSize: 12,
                        lineHeight: 1,
                      }}
                      title="ลบกรอบโซนนี้"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Resize Handle at Bottom-Right */}
                  <div
                    onMouseDown={e => handleStartResizeSection(e, sec)}
                    style={{
                      position: 'absolute',
                      right: 2,
                      bottom: 2,
                      width: 20,
                      height: 20,
                      cursor: 'nwse-resize',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: sec.color || '#0071e3',
                      fontSize: 14,
                      fontWeight: 'bold',
                      opacity: 0.6,
                      userSelect: 'none',
                    }}
                    title="ลากเพื่อปรับขนาดกรอบโซน"
                  >
                    ⌟
                  </div>
                </div>
              );
            }
            return null;
          })}

          {/* SVG Flow Arrows & Freehand Pencil Strokes Overlay */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 3400,
              height: 3400,
              pointerEvents: toolMode === 'eraser' ? 'auto' : 'none',
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

            {/* Flow Connections */}
            {connections.map(conn => {
              const fromNote = notes.find(n => n.id === conn.fromId);
              const toNote = notes.find(n => n.id === conn.toId);
              if (!fromNote || !toNote) return null;

              const isLeftToRight = toNote.x >= fromNote.x;
              const x1 = isLeftToRight ? fromNote.x + 260 : fromNote.x;
              const y1 = fromNote.y + 100;
              const x2 = isLeftToRight ? toNote.x : toNote.x + 260;
              const y2 = toNote.y + 100;

              const dx = Math.max(50, Math.abs(x2 - x1) * 0.45);
              const pathD = isLeftToRight
                ? `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
                : `M ${x1} ${y1} C ${x1 - dx} ${y1}, ${x2 + dx} ${y2}, ${x2} ${y2}`;

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

            {/* Saved Freehand Pencil & Highlighter Strokes */}
            {strokes.map(st => {
              const pathD = pointsToSvgPath(st.points);
              if (!pathD) return null;
              return (
                <path
                  key={st.id}
                  d={pathD}
                  fill="none"
                  stroke={st.color}
                  strokeWidth={st.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={st.isHighlighter ? 0.45 : 1}
                  style={{
                    pointerEvents: toolMode === 'eraser' ? 'stroke' : 'none',
                    cursor: toolMode === 'eraser' ? 'pointer' : 'default',
                    transition: 'opacity 0.15s ease',
                  }}
                  onClick={e => {
                    if (toolMode === 'eraser') {
                      e.stopPropagation();
                      deleteCanvasStroke(st.id);
                    }
                  }}
                />
              );
            })}

            {/* Active Drawing Stroke (Live while mouse is dragging) */}
            {isDrawing && currentStrokePoints.length >= 2 && (
              <path
                d={pointsToSvgPath(currentStrokePoints)}
                fill="none"
                stroke={pencilColor}
                strokeWidth={toolMode === 'highlighter' ? 14 : pencilWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={toolMode === 'highlighter' ? 0.45 : 1}
              />
            )}
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
              Flow นี้ยังว่างอยู่ ({currentBoard.title})
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

      {/* Floating Apple Freeform Tool Palette */}
      <div
        className="canvas-tool-palette"
        style={{
          position: 'absolute',
          bottom: 'var(--canvas-palette-bottom, 16px)',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '95%',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '6px 12px',
          borderRadius: 999,
          background: 'var(--card-solid)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18), 0 0 0 1px var(--line)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {/* 1. Mode Selectors */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(120, 120, 128, 0.08)',
            padding: 3,
            borderRadius: 999,
            gap: 2,
          }}
        >
          <button
            type="button"
            onClick={() => setToolMode('select')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 999,
              border: 'none',
              background: toolMode === 'select' ? 'var(--pri)' : 'transparent',
              color: toolMode === 'select' ? '#ffffff' : 'var(--txt)',
              fontWeight: toolMode === 'select' ? 700 : 500,
              fontSize: 11.5,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="โหมดเลือกและลากย้าย (Select & Move)"
          >
            <span>👆</span>
            <span>เลือก/ย้าย</span>
          </button>

          <button
            type="button"
            onClick={() => setToolMode('pencil')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 999,
              border: 'none',
              background: toolMode === 'pencil' ? 'var(--pri)' : 'transparent',
              color: toolMode === 'pencil' ? '#ffffff' : 'var(--txt)',
              fontWeight: toolMode === 'pencil' ? 700 : 500,
              fontSize: 11.5,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="โหมดดินสอ/ขีดเขียน (Pencil Freehand)"
          >
            <span>✏️</span>
            <span>ดินสอเขียน</span>
          </button>

          <button
            type="button"
            onClick={() => setToolMode('highlighter')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 999,
              border: 'none',
              background: toolMode === 'highlighter' ? 'var(--pri)' : 'transparent',
              color: toolMode === 'highlighter' ? '#ffffff' : 'var(--txt)',
              fontWeight: toolMode === 'highlighter' ? 700 : 500,
              fontSize: 11.5,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="โหมดปากกาเน้นข้อความ (Highlighter)"
          >
            <span>🖌️</span>
            <span>ไฮไลท์</span>
          </button>

          <button
            type="button"
            onClick={() => setToolMode('eraser')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 999,
              border: 'none',
              background: toolMode === 'eraser' ? '#ff3b30' : 'transparent',
              color: toolMode === 'eraser' ? '#ffffff' : 'var(--txt)',
              fontWeight: toolMode === 'eraser' ? 700 : 500,
              fontSize: 11.5,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="โหมดยางลบ (คลิกที่เส้นวาดเพื่อลบ)"
          >
            <span>🧹</span>
            <span>ยางลบ</span>
          </button>
        </div>

        {/* 2. Color Palette & Size (Visible in Pencil or Highlighter mode) */}
        {(toolMode === 'pencil' || toolMode === 'highlighter') && (
          <>
            <div style={{ width: 1, height: 18, background: 'var(--line)', margin: '0 2px' }} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {DRAWING_COLORS.map(c => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setPencilColor(c.color)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: c.color,
                    border: pencilColor === c.color ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.2)',
                    boxShadow: pencilColor === c.color ? `0 0 0 2px ${c.color}` : 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  title={c.label}
                />
              ))}

              <select
                value={pencilWidth}
                onChange={e => setPencilWidth(Number(e.target.value))}
                style={{
                  marginLeft: 4,
                  padding: '2px 6px',
                  borderRadius: 6,
                  border: '1px solid var(--line)',
                  background: 'var(--bg)',
                  fontSize: 11,
                  color: 'var(--txt)',
                  cursor: 'pointer',
                }}
                title="ขนาดหัวดินสอ"
              >
                <option value={2}>2px บาง</option>
                <option value={4}>4px ปกติ</option>
                <option value={7}>7px หนา</option>
                <option value={12}>12px หนาพิเศษ</option>
              </select>
            </div>
          </>
        )}

        {/* 3. Undo / Clear buttons if strokes exist */}
        {strokes.length > 0 && (
          <>
            <div style={{ width: 1, height: 18, background: 'var(--line)', margin: '0 2px' }} />
            <button
              type="button"
              onClick={() => undoLastStroke()}
              className="btn ghost sm"
              style={{ padding: '2px 8px', fontSize: 11, borderRadius: 999 }}
              title="เลิกทำเส้นวาดล่าสุด"
            >
              ↶ เลิกทำ
            </button>
            <button
              type="button"
              onClick={() => {
                showConfirm('ล้างเส้นวาด', 'ต้องการล้างเส้นวาดทั้งหมดบน Flow นี้ใช่ไหม?', () => {
                  clearCanvasStrokes();
                });
              }}
              className="btn ghost sm"
              style={{ padding: '2px 8px', fontSize: 11, borderRadius: 999, color: 'var(--mut)' }}
              title="ล้างเส้นวาดและไฮไลท์ทั้งหมด"
            >
              ล้างวาด ({strokes.length})
            </button>
          </>
        )}

        <div style={{ width: 1, height: 18, background: 'var(--line)', margin: '0 2px' }} />

        {/* 4. Dividers & Section Creators */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={handleCreateHorizontalDivider}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid rgba(0, 113, 227, 0.25)',
              background: 'rgba(0, 113, 227, 0.08)',
              color: 'var(--pri)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="เพิ่มเส้นคั่นแนวนอน (แบ่งเฟสงานหรือสปรินต์)"
          >
            <span>➖</span>
            <span>คั่นแนวนอน</span>
          </button>

          <button
            type="button"
            onClick={handleCreateVerticalDivider}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid rgba(175, 82, 222, 0.25)',
              background: 'rgba(175, 82, 222, 0.08)',
              color: '#af52de',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="เพิ่มเส้นคั่นแนวตั้ง (แบ่งคอลัมน์สมาชิกหรือแผนก)"
          >
            <span>▎</span>
            <span>คั่นแนวตั้ง</span>
          </button>

          <button
            type="button"
            onClick={() => handleCreateSectionZone('#0071e3')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid rgba(52, 199, 89, 0.25)',
              background: 'rgba(52, 199, 89, 0.08)',
              color: '#15803d',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="เพิ่มกรอบแบ่งโซน (Section Frame สำหรับจัดกลุ่มโพสต์อิท)"
          >
            <span>🔲</span>
            <span>กรอบโซน</span>
          </button>
        </div>
      </div>
    </div>

      {/* Board Manager Modal */}
      {isBoardManagerOpen && (
        <div className="modal-overlay" onClick={() => setIsBoardManagerOpen(false)}>
          <div
            className="modal-box"
            style={{ maxWidth: 620, width: '92%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: 'rgba(0, 113, 227, 0.12)',
                    color: 'var(--pri)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                  }}
                >
                  📂
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>คลังจัดเก็บ Flow & กระดานความคิด</h3>
                  <small style={{ color: 'var(--mut)', fontSize: 11.5 }}>
                    สลับดู Flow เก่าที่บันทึกไว้ สร้าง Flow ใหม่ หรือทำซ้ำแม่แบบ ({boards.length} รายการ)
                  </small>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setIsBoardManagerOpen(false)}>
                <CloseIcon size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Search & New Board Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <SearchIcon
                    size={14}
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--mut)' }}
                  />
                  <input
                    type="text"
                    placeholder="ค้นหา Flow ตามชื่อ..."
                    value={boardSearch}
                    onChange={e => setBoardSearch(e.target.value)}
                    style={{ paddingLeft: 30, borderRadius: 999, height: 34, fontSize: 12.5, margin: 0 }}
                  />
                </div>
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleOpenCreateModal}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, height: 34, padding: '0 16px', fontSize: 12.5 }}
                >
                  <PlusIcon size={14} />
                  <span>สร้าง Flow ใหม่</span>
                </button>
              </div>

              {/* Boards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredBoards.map(b => {
                  const isActive = b.id === (activeBoardId || 'default-board');
                  const isEditingThis = editingBoardId === b.id;
                  const noteCount = b.notes?.length || 0;
                  const connCount = b.connections?.length || 0;

                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        if (!isEditingThis) {
                          switchCanvasBoard(b.id);
                          setIsBoardManagerOpen(false);
                        }
                      }}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 14,
                        border: isActive ? '1.5px solid var(--pri)' : '1px solid var(--line)',
                        background: isActive ? 'rgba(0, 113, 227, 0.05)' : 'rgba(120, 120, 128, 0.03)',
                        cursor: isEditingThis ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (!isActive && !isEditingThis) e.currentTarget.style.background = 'rgba(0, 113, 227, 0.03)';
                      }}
                      onMouseLeave={e => {
                        if (!isActive && !isEditingThis) e.currentTarget.style.background = 'rgba(120, 120, 128, 0.03)';
                      }}
                    >
                      {/* Left: Icon, Title & Meta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 22 }}>{isActive ? '🟢' : '📁'}</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          {isEditingThis ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingBoardTitle}
                                onChange={e => setEditingBoardTitle(e.target.value)}
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveRename(b.id);
                                  if (e.key === 'Escape') setEditingBoardId(null);
                                }}
                                style={{ height: 28, fontSize: 13, borderRadius: 6, margin: 0, padding: '2px 8px' }}
                              />
                              <button
                                type="button"
                                className="btn primary sm"
                                onClick={() => handleSaveRename(b.id)}
                                style={{ padding: '2px 8px', fontSize: 11 }}
                              >
                                บันทึก
                              </button>
                              <button
                                type="button"
                                className="btn ghost sm"
                                onClick={() => setEditingBoardId(null)}
                                style={{ padding: '2px 8px', fontSize: 11 }}
                              >
                                ยกเลิก
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {b.title}
                              </h4>
                              {isActive && (
                                <span style={{ fontSize: 10, background: 'var(--pri)', color: '#fff', borderRadius: 999, padding: '1px 6px', fontWeight: 700 }}>
                                  ใช้งานอยู่
                                </span>
                              )}
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                            <span style={{ fontSize: 11, color: 'var(--mut)' }}>
                              📦 {noteCount} โน้ต
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--mut)' }}>
                              🔗 {connCount} Flow
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--mut)' }}>
                              • อัปเดตล่าสุด: {new Date(b.updatedAt || b.createdAt).toLocaleDateString('th-TH')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                        {!isActive && (
                          <button
                            type="button"
                            className="btn primary sm"
                            onClick={() => {
                              switchCanvasBoard(b.id);
                              setIsBoardManagerOpen(false);
                            }}
                            style={{ borderRadius: 999, padding: '3px 12px', fontSize: 11.5 }}
                          >
                            เปิด Flow นี้
                          </button>
                        )}

                        <button
                          type="button"
                          className="icon-btn sm"
                          onClick={e => handleDuplicateBoard(b, e)}
                          title="ทำซ้ำ Flow นี้ (Duplicate)"
                        >
                          <CopyIcon size={14} />
                        </button>

                        <button
                          type="button"
                          className="icon-btn sm"
                          onClick={e => handleStartRename(b, e)}
                          title="เปลี่ยนชื่อ Flow"
                        >
                          <EditIcon size={14} />
                        </button>

                        <button
                          type="button"
                          className="icon-btn sm"
                          onClick={e => handleDeleteBoard(b, e)}
                          disabled={boards.length <= 1}
                          style={{ color: boards.length <= 1 ? 'var(--mut)' : '#dc2626', opacity: boards.length <= 1 ? 0.3 : 1 }}
                          title={boards.length <= 1 ? 'ไม่สามารถลบ Flow สุดท้ายได้' : 'ลบ Flow นี้'}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button className="btn primary" onClick={() => setIsBoardManagerOpen(false)}>
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Board Modal */}
      {isCreateBoardModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateBoardModalOpen(false)}>
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
                    fontSize: 16,
                  }}
                >
                  ✨
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>สร้าง Flow ใหม่ (New Canvas)</h3>
                  <small style={{ color: 'var(--mut)', fontSize: 11.5 }}>
                    เพิ่มกระดานสำหรับวางแผนหรือระดมความคิดชุดใหม่
                  </small>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setIsCreateBoardModalOpen(false)}>
                <CloseIcon size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>ชื่อ Flow / ชื่องาน *</label>
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={e => setNewBoardTitle(e.target.value)}
                  placeholder="เช่น Flow การชำระเงิน, วางแผนไตรมาส 3..."
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>เลือกแม่แบบเริ่มต้น (Template)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setNewBoardTemplate('blank')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 12,
                      border: newBoardTemplate === 'blank' ? '2px solid var(--pri)' : '1px solid var(--line)',
                      background: newBoardTemplate === 'blank' ? 'rgba(0, 113, 227, 0.08)' : 'rgba(120, 120, 128, 0.04)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>⚪</span>
                    <strong style={{ fontSize: 12.5, color: newBoardTemplate === 'blank' ? 'var(--pri)' : 'var(--txt)' }}>
                      กระดานว่างเปล่า
                    </strong>
                    <small style={{ fontSize: 10.5, color: 'var(--mut)' }}>เริ่มต้นวางไอเดียใหม่จากศูนย์</small>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewBoardTemplate('sample_flow')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 12,
                      border: newBoardTemplate === 'sample_flow' ? '2px solid var(--pri)' : '1px solid var(--line)',
                      background: newBoardTemplate === 'sample_flow' ? 'rgba(0, 113, 227, 0.08)' : 'rgba(120, 120, 128, 0.04)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🚀</span>
                    <strong style={{ fontSize: 12.5, color: newBoardTemplate === 'sample_flow' ? 'var(--pri)' : 'var(--txt)' }}>
                      ตัวอย่าง Data Flow
                    </strong>
                    <small style={{ fontSize: 10.5, color: 'var(--mut)' }}>Input ➔ Process ➔ DB ➔ Output</small>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setIsCreateBoardModalOpen(false)}>
                ยกเลิก
              </button>
              <button
                className="btn primary"
                onClick={handleConfirmCreateBoard}
                disabled={!newBoardTitle.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <PlusIcon size={14} />
                <span>สร้างและเปิดใช้งาน</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
