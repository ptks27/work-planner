'use client';
import { useState, useEffect } from 'react';
import {
  PRIORITY,
  PRIORITIES,
  PRESET_TAGS,
  getTagStyle,
  type Priority,
  type Task,
  type TaskStatus,
  type SubTask,
  type AvatarId,
  type TaskAssignee,
  type TaskAttachment,
} from '@/lib/types';
import { uid, thDate } from '@/lib/utils';
import {
  CloseIcon,
  TrashIcon,
  EditIcon,
  CheckIcon,
  PlusIcon,
  UsersIcon,
  TagIcon,
  MessageSquareIcon,
  HistoryIcon,
  CalendarIcon,
  ClockIcon,
  SparklesIcon,
  ImageIcon,
  PaperclipIcon,
} from './Icons';
import { useAuth } from '@/lib/authStore';
import { usePlanner } from '@/lib/store';
import { useModal } from '@/components/ModalContext';
import { AvatarIcon } from './Avatars';
import ThaiDatePicker from './ThaiDatePicker';
import SmartSubtasksModal from './SmartSubtasksModal';
import ImageLightboxModal from './ImageLightboxModal';
import { compressImageFile, getImageFilesFromClipboard, formatFileSize } from '@/lib/attachments';
import { notifyMentionsInComment, notifyTaskAssignment, notifyTaskStatusChange } from '@/lib/notifications';

interface EditTaskModalProps {
  task: Task | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Omit<Task, 'id'>>, actor?: { id: string; name: string; avatarId?: AvatarId }) => void;
}

type ModalTab = 'details' | 'comments' | 'activity';

export default function EditTaskModal({ task, onClose, onSave }: EditTaskModalProps) {
  const { users, currentUser } = useAuth();
  const planner = usePlanner();
  const { showConfirm } = useModal();
  const [activeTab, setActiveTab] = useState<ModalTab>('details');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isSmartSubtasksOpen, setIsSmartSubtasksOpen] = useState(false);
  const [lightboxAttachment, setLightboxAttachment] = useState<TaskAttachment | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [activeReactionPickerCommentId, setActiveReactionPickerCommentId] = useState<string | null>(null);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);

  // Keep live task reference from store so comments/activity update immediately
  const liveTask = task ? planner.tasks.find(t => t.id === task.id) || task : null;

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDetail(task.detail || '');
      setDate(task.date || '');
      setEndDate(task.endDate || '');
      setPriority(task.priority || 'medium');
      setStatus(task.status ?? (task.done ? 'done' : 'todo'));

      const initialAssignees = task.assigneeIds && task.assigneeIds.length
        ? task.assigneeIds
        : (task.userId ? [task.userId] : (currentUser?.id ? [currentUser.id] : []));
      setAssignedUserIds(initialAssignees);

      setTags(task.tags ? [...task.tags] : []);
      setSubtasks(task.subtasks ? [...task.subtasks] : []);
      setAttachments(task.attachments ? [...task.attachments] : []);
      setTime(task.time || '');
      setError('');
      setActiveTab('details');
    }
  }, [task, currentUser]);

  if (!task || !liveTask) return null;

  // รวบรวมแท็กทั้งหมดที่มีในระบบ: รวมจาก Preset + CustomTags ใน Store + ที่มีอยู่ในงาน โดยไม่เอาแท็กที่ถูกลบ
  const deletedSet = new Set((planner.deletedTags || []).map(t => t.toLowerCase()));
  const allTagNames = Array.from(
    new Set([
      ...PRESET_TAGS.map(p => p.name).filter(name => !deletedSet.has(name.toLowerCase())),
      ...(planner.customTags || []).filter(name => !deletedSet.has(name.toLowerCase())),
      ...planner.tasks.flatMap(t => t.tags || []).filter(name => !deletedSet.has(name.toLowerCase())),
    ])
  ).filter(Boolean);

  // Toggle assignee selection (multi-select)
  const toggleAssignee = (userId: string) => {
    setAssignedUserIds(prev => {
      if (prev.includes(userId)) {
        if (prev.length === 1) return prev; // Keep at least one assignee
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  // Toggle tag selection
  const toggleTag = (tagName: string) => {
    setTags(prev => {
      if (prev.some(t => t.toLowerCase() === tagName.toLowerCase())) {
        return prev.filter(t => t.toLowerCase() !== tagName.toLowerCase());
      }
      return [...prev, tagName];
    });
  };

  const handleAddCustomTag = () => {
    const clean = customTagInput.replace(/^#/, '').trim();
    if (!clean) return;
    planner.addCustomTag(clean);
    if (!tags.some(t => t.toLowerCase() === clean.toLowerCase())) {
      setTags(prev => [...prev, clean]);
    }
    setCustomTagInput('');
  };

  const handleDeleteTag = (e: React.MouseEvent, tagName: string) => {
    e.stopPropagation();
    showConfirm(
      'ลบแท็ก',
      `ต้องการลบแท็ก #${tagName} ออกจากระบบและงานทั้งหมดใช่ไหม?`,
      () => {
        planner.deleteCustomTag(tagName);
        setTags(prev => prev.filter(t => t.toLowerCase() !== tagName.toLowerCase()));
      }
    );
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks(prev => [
      ...prev,
      { id: uid(), title: newSubtask.trim(), done: false },
    ]);
    setNewSubtask('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== id));
  };

  const handleProcessImageFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploadingImage(true);
    try {
      for (const file of files) {
        const dataUrl = await compressImageFile(file);
        const newAtt: TaskAttachment = {
          id: uid(),
          name: file.name || `ภาพแนบ_${new Date().toLocaleTimeString('th-TH')}.jpg`,
          url: dataUrl,
          size: file.size,
          type: file.type || 'image/jpeg',
          createdAt: Date.now(),
        };
        setAttachments(prev => [...prev, newAtt]);
      }
    } catch (err) {
      console.error('Error processing image:', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = getImageFilesFromClipboard(e);
    if (files.length > 0) {
      e.preventDefault();
      handleProcessImageFiles(files);
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const f = e.target.files[i];
        if (f.type.startsWith('image/')) {
          files.push(f);
        }
      }
      if (files.length > 0) {
        handleProcessImageFiles(files);
      }
      e.target.value = '';
    }
  };

  const handleSendComment = () => {
    if (!commentText.trim() || !currentUser) return;
    const newComment = {
      id: uid(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatarId,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    planner.addTaskComment(task.id, newComment);

    // แจ้งเตือนเพื่อนร่วมทีมที่ถูก @Mention
    notifyMentionsInComment({
      taskId: task.id,
      taskTitle: liveTask.title,
      commentText: commentText.trim(),
      actor: { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId },
    });

    setCommentText('');
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError('กรุณาระบุสิ่งที่ต้องทำ');
      return;
    }
    if (!date) {
      setError('กรุณาเลือกวันที่');
      return;
    }
    if (endDate && endDate < date) {
      setError('วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น');
      return;
    }

    // Build assignee snapshot objects
    const assignees: TaskAssignee[] = assignedUserIds.map(id => {
      const u = users.find(x => x.id === id);
      if (u) return { id: u.id, name: u.name, avatarId: u.avatarId };
      if (id === currentUser?.id) return { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId };
      return { id, name: 'สมาชิก', avatarId: 'dev_boy' };
    });

    const primaryAssignee = assignees[0];

    // แจ้งเตือนเมื่อมีการมอบหมายงานใหม่
    const previousAssignees = task.assigneeIds || (task.userId ? [task.userId] : []);
    const newlyAssigned = assignedUserIds.filter(id => !previousAssignees.includes(id));
    if (newlyAssigned.length > 0 && currentUser) {
      notifyTaskAssignment({
        task: { ...task, title: title.trim(), assigneeIds: assignedUserIds },
        prevAssigneeIds: previousAssignees,
        actor: { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId },
      });
    }

    // แจ้งเตือนเมื่อมีการเปลี่ยนสถานะงาน
    const prevStatus = task.status ?? (task.done ? 'done' : 'todo');
    if (prevStatus !== status && currentUser) {
      notifyTaskStatusChange({
        task: { ...task, title: title.trim() },
        newStatus: status,
        actor: { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId },
      });
    }

    onSave(
      task.id,
      {
        title: title.trim(),
        detail: detail.trim(),
        date,
        endDate: endDate && endDate > date ? endDate : undefined,
        priority,
        status,
        done: status === 'done',
        subtasks,
        attachments,
        time: time || undefined,
        userId: primaryAssignee?.id,
        userName: primaryAssignee?.name,
        userAvatar: primaryAssignee?.avatarId,
        assigneeIds: assignedUserIds,
        assignees,
        tags,
        links: task.links,
      },
      currentUser ? { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId } : undefined
    );
    onClose();
  };

  const memberList = Array.from(
    new Map(
      (users || [])
        .concat(currentUser ? [currentUser] : [])
        .map(u => [u.id, u])
    ).values()
  );

  const PRESET_EMOJIS = ['👍', '❤️', '🎉', '👀', '🔥', '🚀'];

  const renderCommentWithMentions = (text: string) => {
    const parts = text.split(/(@[^\s,]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '1px 6px',
              borderRadius: 6,
              background: 'var(--pri-l)',
              color: 'var(--pri)',
              fontWeight: 600,
              fontSize: 12,
              margin: '0 2px',
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleInsertMention = (name: string) => {
    setCommentText(prev => `${prev.trim()} @${name} `);
    setShowMentionSuggestions(false);
  };

  const comments = liveTask.comments || [];
  const activities = liveTask.activities || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        onPaste={handlePaste}
        style={{
          maxWidth: 560,
          width: '92%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'var(--pri-l)',
                color: 'var(--pri)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <EditIcon size={17} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 17 }}>รายละเอียดงาน</h3>
              <small style={{ color: 'var(--mut)', fontSize: 11.5 }}>
                สร้างเมื่อ {new Date(liveTask.createdAt).toLocaleDateString('th-TH')}
              </small>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="ปิด">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Apple Segmented Controls (3 Tabs) */}
        <div style={{ padding: '0 22px 10px' }}>
          <div className="chips" style={{ width: '100%', display: 'flex', margin: 0 }}>
            <button
              className={`chip ${activeTab === 'details' ? 'on' : ''}`}
              onClick={() => setActiveTab('details')}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <EditIcon size={13} />
              <span>ข้อมูลงาน</span>
            </button>
            <button
              className={`chip ${activeTab === 'comments' ? 'on' : ''}`}
              onClick={() => setActiveTab('comments')}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <MessageSquareIcon size={13} />
              <span>คอมเมนต์ ({comments.length})</span>
            </button>
            <button
              className={`chip ${activeTab === 'activity' ? 'on' : ''}`}
              onClick={() => setActiveTab('activity')}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <HistoryIcon size={13} />
              <span>ประวัติ ({activities.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div
          className="modal-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: 8,
            paddingBottom: 16,
          }}
        >
          {error && (
            <div
              style={{
                color: 'var(--red)',
                background: 'var(--red-l)',
                padding: '8px 12px',
                borderRadius: 10,
                marginBottom: 12,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label>สิ่งที่ต้องทำ *</label>
                <input
                  type="text"
                  placeholder="สิ่งที่ต้องทำ *"
                  value={title}
                  onChange={e => {
                    setTitle(e.target.value);
                    if (error) setError('');
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label>รายละเอียด</label>
                <textarea
                  rows={2}
                  placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                  value={detail}
                  onChange={e => setDetail(e.target.value)}
                />
              </div>

              {/* Multiple Assignees Selector */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <UsersIcon size={14} color="var(--pri)" />
                    <span>ผู้รับผิดชอบงาน ({assignedUserIds.length} คน)</span>
                  </label>
                  <small style={{ color: 'var(--mut)', fontSize: 11 }}>
                    คลิกเพื่อเลือกหรือสลับได้หลายคน
                  </small>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {users.map(u => {
                    const isSelected = assignedUserIds.includes(u.id);
                    return (
                      <button
                        key={`assignee-chip-${u.id}`}
                        type="button"
                        onClick={() => toggleAssignee(u.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px 4px 6px',
                          borderRadius: 999,
                          border: isSelected ? '1.5px solid var(--pri)' : '1px solid var(--line)',
                          background: isSelected ? 'var(--pri-l)' : 'rgba(255,255,255,0.7)',
                          color: isSelected ? 'var(--pri)' : 'var(--txt)',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: isSelected ? 600 : 500,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <AvatarIcon id={u.avatarId} size={18} />
                        <span>{u.name} {u.id === currentUser?.id ? '(ฉัน)' : ''}</span>
                        {isSelected && <CheckIcon size={12} strokeWidth={3} color="var(--pri)" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags & Labels Selector */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <TagIcon size={14} color="var(--pri)" />
                    <span>แท็กหมวดหมู่งาน ({tags.length})</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {planner.deletedTags && planner.deletedTags.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          showConfirm(
                            'คืนค่าแท็กเริ่มต้น',
                            'ต้องการนำแท็กเริ่มต้นทั้งหมดกลับมาแสดงใหม่ใช่ไหม?',
                            () => planner.resetDefaultTags()
                          );
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontSize: 11,
                          color: 'var(--pri)',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        ↺ คืนค่าแท็กเริ่มต้น
                      </button>
                    )}
                    <small style={{ color: 'var(--mut)', fontSize: 11 }}>
                      เลือกหมวดหมู่เพื่อการกรองที่ง่ายขึ้น
                    </small>
                  </div>
                </div>

                {/* Preset & Custom Tag Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, minHeight: 28, alignItems: 'center' }}>
                  {allTagNames.length === 0 ? (
                    <small style={{ color: 'var(--mut)', fontSize: 12 }}>
                      ยังไม่มีแท็ก (พิมพ์เพิ่มแท็กที่ต้องการด้านล่างได้เลย)
                    </small>
                  ) : (
                    allTagNames.map(tagName => {
                      const tagStyle = getTagStyle(tagName);
                      const isSelected = tags.some(t => t.toLowerCase() === tagName.toLowerCase());
                      return (
                        <span
                          key={`modal-tag-${tagName}`}
                          onClick={() => toggleTag(tagName)}
                          style={{
                            border: `1px solid ${isSelected ? tagStyle.color : 'var(--line)'}`,
                            background: isSelected ? tagStyle.bg : 'rgba(120, 120, 128, 0.05)',
                            color: isSelected ? tagStyle.color : 'var(--mut)',
                            borderRadius: 999,
                            padding: '3px 10px',
                            fontSize: 11.5,
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            transition: 'all 0.15s ease',
                            userSelect: 'none',
                          }}
                        >
                          <span>#{tagName}</span>
                          {isSelected && <CheckIcon size={10} strokeWidth={3} />}
                          <span
                            onClick={e => handleDeleteTag(e, tagName)}
                            title={`ลบแท็ก #${tagName}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 16,
                              height: 16,
                              borderRadius: 999,
                              background: 'rgba(0, 0, 0, 0.08)',
                              marginLeft: 2,
                              fontSize: 11,
                              fontWeight: 700,
                              lineHeight: 1,
                              color: 'var(--mut)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.background = 'var(--red-l)';
                              (e.currentTarget as HTMLElement).style.color = 'var(--red)';
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background = 'rgba(0, 0, 0, 0.08)';
                              (e.currentTarget as HTMLElement).style.color = 'var(--mut)';
                            }}
                          >
                            ×
                          </span>
                        </span>
                      );
                    })
                  )}
                </div>

                {/* Custom Tag Input */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="+ เพิ่มแท็กกำหนดเอง (เช่น #Database, #UX)"
                    value={customTagInput}
                    onChange={e => setCustomTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    style={{ margin: 0, fontSize: 12, padding: '6px 12px' }}
                  />
                  <button
                    type="button"
                    className="btn sm"
                    onClick={handleAddCustomTag}
                    style={{ flexShrink: 0 }}
                  >
                    เพิ่มแท็ก
                  </button>
                </div>
              </div>

              {/* Date & Range Picker */}
              <div className="row">
                <div>
                  <label>ตั้งแต่วันที่ *</label>
                  <ThaiDatePicker value={date} onChange={setDate} />
                </div>
                <div>
                  <label>ถึงวันที่ (กรณีทำหลายวัน)</label>
                  <ThaiDatePicker
                    value={endDate}
                    onChange={setEndDate}
                    min={date}
                    clearable
                    placeholder="วว/ดด/ปปปป (ไม่บังคับ)"
                  />
                </div>
              </div>

              {/* Priority & Status */}
              <div className="row">
                <div>
                  <label>ความสำคัญ</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as Priority)}
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>
                        {PRIORITY[p].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>สถานะงาน</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as TaskStatus)}
                  >
                    <option value="todo">รอทำ (To Do)</option>
                    <option value="in_progress">กำลังทำ (In Progress)</option>
                    <option value="done">เสร็จสิ้น (Done)</option>
                  </select>
                </div>
              </div>

              <div>
                <label>เวลาแจ้งเตือน</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  style={{ width: 'auto', minWidth: 160 }}
                />
              </div>

              {/* Checklist / Subtasks with AI Generator button */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ margin: 0, fontWeight: 600 }}>รายการย่อย (Checklist)</label>
                  <button
                    type="button"
                    onClick={() => setIsSmartSubtasksOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.12), rgba(175, 82, 222, 0.12))',
                      color: 'var(--pri)',
                      border: '1px solid rgba(0, 113, 227, 0.25)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <SparklesIcon size={13} color="var(--pri)" />
                    <span>✨ AI ช่วยแตกงานย่อย</span>
                  </button>
                </div>
                {subtasks.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    {subtasks.map(st => (
                      <div
                        key={st.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(120, 120, 128, 0.06)',
                          padding: '6px 10px',
                          borderRadius: 8,
                          fontSize: 13,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {st.done ? (
                            <CheckIcon size={13} color="var(--ok)" />
                          ) : (
                            <span
                              style={{
                                width: 12,
                                height: 12,
                                border: '1.5px solid var(--mut)',
                                borderRadius: 3,
                                display: 'inline-block',
                              }}
                            />
                          )}
                          <span style={{ textDecoration: st.done ? 'line-through' : 'none', color: st.done ? 'var(--mut)' : 'inherit' }}>
                            {st.title}
                          </span>
                        </span>
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ width: 22, height: 22 }}
                          onClick={() => handleRemoveSubtask(st.id)}
                          title="ลบรายการย่อย"
                        >
                          <TrashIcon size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="+ พิมพ์รายการย่อยแล้วกด Enter"
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    style={{ margin: 0 }}
                  />
                  <button
                    type="button"
                    className="btn sm"
                    onClick={handleAddSubtask}
                    style={{ flexShrink: 0 }}
                  >
                    <PlusIcon size={13} strokeWidth={2.5} /> เพิ่ม
                  </button>
                </div>
              </div>

              {/* Image Attachments & Screenshots (Drag & Drop / Paste Screenshot) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <PaperclipIcon size={14} color="var(--pri)" />
                    <span>รูปภาพ & สกรีนช็อตแนบ ({attachments.length})</span>
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--mut)' }}>
                    กด Ctrl + V หรือลากวางได้ทันที
                  </span>
                </div>

                {/* Upload Zone / Dropzone */}
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    if (e.dataTransfer.files) {
                      const files: File[] = [];
                      for (let i = 0; i < e.dataTransfer.files.length; i++) {
                        const f = e.dataTransfer.files[i];
                        if (f.type.startsWith('image/')) files.push(f);
                      }
                      if (files.length > 0) handleProcessImageFiles(files);
                    }
                  }}
                  style={{
                    border: '1.5px dashed var(--line)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    background: 'rgba(120, 120, 128, 0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: attachments.length > 0 ? 10 : 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'rgba(0, 113, 227, 0.1)',
                        color: 'var(--pri)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ImageIcon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                        {isUploadingImage ? 'กำลังประมวลผลรูปภาพ...' : 'แนบภาพหรือแคปหน้าจอ'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mut)' }}>
                        รองรับ PNG, JPG, WebP (บีบอัดอัตโนมัติ)
                      </div>
                    </div>
                  </div>

                  <label
                    className="btn sm"
                    style={{
                      borderRadius: 999,
                      fontSize: 12,
                      cursor: 'pointer',
                      margin: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <PlusIcon size={12} strokeWidth={2.5} />
                    <span>เลือกไฟล์</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileInputChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {/* Thumbnails grid */}
                {attachments.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                      gap: 8,
                    }}
                  >
                    {attachments.map(att => (
                      <div
                        key={att.id}
                        style={{
                          position: 'relative',
                          borderRadius: 10,
                          overflow: 'hidden',
                          border: '1px solid var(--line)',
                          background: 'rgba(120, 120, 128, 0.05)',
                          aspectRatio: '1',
                          cursor: 'pointer',
                        }}
                        onClick={() => setLightboxAttachment(att)}
                      >
                        <img
                          src={att.url}
                          alt={att.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                            padding: '4px 6px',
                            color: '#fff',
                            fontSize: 10,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 55 }}>
                            {att.name}
                          </span>
                          <span>{formatFileSize(att.size)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAttachment(att.id);
                          }}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'rgba(0, 0, 0, 0.65)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            lineHeight: 1,
                          }}
                          title="ลบรูปภาพ"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COMMENTS & NOTES */}
          {activeTab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  minHeight: 180,
                  maxHeight: 320,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                {comments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--mut)' }}>
                    <span style={{ fontSize: 32, display: 'block', marginBottom: 6 }}>💬</span>
                    <p style={{ margin: 0, fontSize: 13.5 }}>ยังไม่มีความคิดเห็นหรือโน้ตสั้น</p>
                    <small>พิมพ์ข้อความด้านล่าง เช่น "แก้ไขแล้ว รอตรวจครับ" หรือใช้ @ เพื่อแท็กเพื่อน</small>
                  </div>
                ) : (
                  comments.map(c => {
                    const isMe = c.userId === currentUser?.id;
                    const reactions = c.reactions || {};

                    return (
                      <div
                        key={c.id}
                        style={{
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                          background: isMe ? 'var(--pri-l)' : 'rgba(120, 120, 128, 0.06)',
                          padding: '10px 12px',
                          borderRadius: 14,
                          border: '1px solid var(--line)',
                        }}
                      >
                        <AvatarIcon id={c.userAvatar} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                            <b style={{ fontSize: 12.5, color: isMe ? 'var(--pri)' : 'var(--txt)' }}>
                              {c.userName} {isMe ? '(ฉัน)' : ''}
                            </b>
                            <small style={{ fontSize: 10.5, color: 'var(--mut)' }}>
                              {new Date(c.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </small>
                          </div>
                          <p style={{ margin: 0, fontSize: 13, wordBreak: 'break-word', color: 'var(--txt)', lineHeight: 1.45 }}>
                            {renderCommentWithMentions(c.text)}
                          </p>

                          {/* Emoji Reactions Row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                            {Object.entries(reactions).map(([emoji, userIds]) => {
                              if (!userIds || userIds.length === 0) return null;
                              const hasReacted = userIds.includes(currentUser?.id || '');
                              const userNames = userIds
                                .map(id => memberList.find(m => m.id === id)?.name || (id === currentUser?.id ? 'คุณ' : 'สมาชิก'))
                                .join(', ');

                              return (
                                <button
                                  key={`react-${c.id}-${emoji}`}
                                  type="button"
                                  onClick={() => {
                                    if (currentUser && task) {
                                      planner.toggleCommentReaction(task.id, c.id, emoji, currentUser.id);
                                    }
                                  }}
                                  title={`${userNames} กด ${emoji}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '2px 7px',
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    border: hasReacted ? '1px solid var(--pri)' : '1px solid var(--line)',
                                    background: hasReacted ? 'rgba(0, 113, 227, 0.15)' : 'var(--card-solid)',
                                    color: hasReacted ? 'var(--pri)' : 'var(--txt)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <span>{emoji}</span>
                                  <span>{userIds.length}</span>
                                </button>
                              );
                            })}

                            {/* + Reaction Button with Apple Popover */}
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                onClick={() => setActiveReactionPickerCommentId(activeReactionPickerCommentId === c.id ? null : c.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '2px 6px',
                                  borderRadius: 999,
                                  fontSize: 11,
                                  border: '1px solid var(--line)',
                                  background: 'transparent',
                                  color: 'var(--mut)',
                                  cursor: 'pointer',
                                }}
                                title="เพิ่ม Reaction"
                              >
                                + 😊
                              </button>

                              {activeReactionPickerCommentId === c.id && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: 0,
                                    marginBottom: 6,
                                    background: 'var(--card-solid)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid var(--line)',
                                    borderRadius: 999,
                                    padding: '4px 8px',
                                    display: 'flex',
                                    gap: 6,
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                                    zIndex: 30,
                                  }}
                                >
                                  {PRESET_EMOJIS.map(emoji => (
                                    <button
                                      key={`picker-${c.id}-${emoji}`}
                                      type="button"
                                      onClick={() => {
                                        if (currentUser && task) {
                                          planner.toggleCommentReaction(task.id, c.id, emoji, currentUser.id);
                                          setActiveReactionPickerCommentId(null);
                                        }
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        fontSize: 16,
                                        cursor: 'pointer',
                                        padding: '2px',
                                        transition: 'transform 0.1s ease',
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.25)')}
                                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* @Mention Suggestion Bar */}
              {showMentionSuggestions && (
                <div
                  style={{
                    background: 'var(--card-solid)',
                    border: '1px solid var(--line)',
                    borderRadius: 12,
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                  }}
                >
                  <small style={{ color: 'var(--mut)', fontSize: 11, fontWeight: 600 }}>แท็กเพื่อน:</small>
                  {memberList.map(m => (
                    <button
                      key={`mention-${m.id}`}
                      type="button"
                      onClick={() => handleInsertMention(m.name)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 8px',
                        borderRadius: 999,
                        border: '1px solid var(--line)',
                        background: 'rgba(120, 120, 128, 0.08)',
                        color: 'var(--txt)',
                        fontSize: 11.5,
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      <AvatarIcon id={m.avatarId} size={16} />
                      <span>{m.name}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowMentionSuggestions(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--mut)',
                      fontSize: 11,
                      cursor: 'pointer',
                      marginLeft: 'auto',
                    }}
                  >
                    ปิด
                  </button>
                </div>
              )}

              {/* Comment Input Box */}
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--line)', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowMentionSuggestions(prev => !prev)}
                  style={{
                    background: showMentionSuggestions ? 'var(--pri-l)' : 'rgba(120, 120, 128, 0.08)',
                    color: showMentionSuggestions ? 'var(--pri)' : 'var(--txt)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0,
                  }}
                  title="แท็กเพื่อนร่วมทีม (@mention)"
                >
                  <span>@</span>
                  <span style={{ fontSize: 11 }}>แท็ก</span>
                </button>

                <input
                  type="text"
                  placeholder="พิมพ์คอมเมนต์หรือโน้ตสั้นๆ... (กด Enter เพื่อส่ง)"
                  value={commentText}
                  onChange={e => {
                    setCommentText(e.target.value);
                    if (e.target.value.endsWith('@')) {
                      setShowMentionSuggestions(true);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  style={{ margin: 0, flex: 1 }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={handleSendComment}
                  disabled={!commentText.trim()}
                  style={{ flexShrink: 0 }}
                >
                  ส่ง
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY LOG */}
          {activeTab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--mut)' }}>
                  <span style={{ fontSize: 32, display: 'block', marginBottom: 6 }}>⏱</span>
                  <p style={{ margin: 0, fontSize: 13.5 }}>ยังไม่มีบันทึกประวัติการเปลี่ยนแปลง</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 6 }}>
                  {activities.map((act, idx) => (
                    <div
                      key={act.id || idx}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                        position: 'relative',
                      }}
                    >
                      <AvatarIcon id={act.userAvatar} size={24} />
                      <div style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
                        <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                          <b>{act.userName}</b>{' '}
                          <span style={{ color: 'var(--txt)' }}>{act.text}</span>
                        </div>
                        <small style={{ color: 'var(--mut)', fontSize: 11 }}>
                          {new Date(act.timestamp).toLocaleDateString('th-TH')}{' '}
                          {new Date(act.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>
            ปิด
          </button>
          <button
            className="btn"
            onClick={handleSave}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <CheckIcon size={14} /> บันทึกการแก้ไข
          </button>
        </div>
      </div>

      {isSmartSubtasksOpen && (
        <SmartSubtasksModal
          isOpen={isSmartSubtasksOpen}
          taskTitle={title}
          taskDetail={detail}
          onClose={() => setIsSmartSubtasksOpen(false)}
          onApplySubtasks={(newSubtaskTitles: string[]) => {
            const toAdd: SubTask[] = newSubtaskTitles.map((t: string) => ({
              id: uid(),
              title: t,
              done: false,
            }));
            setSubtasks(prev => [...prev, ...toAdd]);
          }}
        />
      )}

      {lightboxAttachment && (
        <ImageLightboxModal
          isOpen={true}
          attachment={lightboxAttachment}
          onClose={() => setLightboxAttachment(null)}
        />
      )}
    </div>
  );
}
