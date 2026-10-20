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
} from './Icons';
import { useAuth } from '@/lib/authStore';
import { usePlanner } from '@/lib/store';
import { useModal } from '@/components/ModalContext';
import { AvatarIcon } from './Avatars';
import ThaiDatePicker from './ThaiDatePicker';

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
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');

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

  const handleSendComment = () => {
    if (!commentText.trim() || !currentUser) return;
    planner.addTaskComment(task.id, {
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatarId,
      text: commentText.trim(),
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
        time: time || undefined,
        userId: primaryAssignee?.id,
        userName: primaryAssignee?.name,
        userAvatar: primaryAssignee?.avatarId,
        assigneeIds: assignedUserIds,
        assignees,
        tags,
      },
      currentUser ? { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId } : undefined
    );
    onClose();
  };

  const comments = liveTask.comments || [];
  const activities = liveTask.activities || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
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

              {/* Checklist / Subtasks */}
              <div>
                <label>รายการย่อย (Checklist)</label>
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
                    <small>พิมพ์ข้อความด้านล่าง เช่น "แก้ไขแล้ว รอตรวจครับ" เพื่อแจ้งเตือนทีม</small>
                  </div>
                ) : (
                  comments.map(c => {
                    const isMe = c.userId === currentUser?.id;
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
                          <p style={{ margin: 0, fontSize: 13, wordBreak: 'break-word', color: 'var(--txt)' }}>
                            {c.text}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Comment Input Box */}
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                <input
                  type="text"
                  placeholder="พิมพ์คอมเมนต์หรือโน้ตสั้นๆ... (กด Enter เพื่อส่ง)"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  style={{ margin: 0 }}
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
    </div>
  );
}
