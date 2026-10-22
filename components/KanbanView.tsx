'use client';
import { useState } from 'react';
import { usePlanner } from '@/lib/store';
import { PRIORITY, getTagStyle, type Task, type TaskStatus } from '@/lib/types';
import { thDate } from '@/lib/utils';
import { isTaskOnDate } from '@/lib/selectors';
import {
  EditIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  BoltIcon,
  FileTextIcon,
  CalendarIcon,
  ClockIcon,
  ClipboardCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageSquareIcon,
} from './Icons';
import { useModal } from './ModalContext';
import { playCompletionSound, triggerConfetti } from '@/lib/audio';
import { AvatarIcon } from './Avatars';
import { useAuth } from '@/lib/authStore';
import ThaiDatePicker from './ThaiDatePicker';
import { canUserEditTaskDirectly } from '@/lib/permissions';
import { sendTaskEditRequest } from '@/lib/notifications';

interface KanbanViewProps {
  currentDate: string;
  onEditTask: (t: Task) => void;
}

export default function KanbanView({ currentDate, onEditTask }: KanbanViewProps) {
  const s = usePlanner();
  const [filterDate, setFilterDate] = useState<string>(currentDate);
  const [newTitle, setNewTitle] = useState('');
  const { showConfirm, showAlert } = useModal();
  const { currentUser, currentTeam, users } = useAuth();

  const COLUMNS: { key: TaskStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'todo', label: 'รอทำ', icon: <FileTextIcon size={15} color="#64748b" />, color: '#64748b' },
    { key: 'in_progress', label: 'กำลังทำ', icon: <BoltIcon size={15} color="#0284c7" />, color: '#0284c7' },
    { key: 'done', label: 'เสร็จสิ้น', icon: <CheckIcon size={15} color="#10b981" />, color: '#10b981' },
  ];

  const tasks = s.tasks.filter(
    t => !t.hidden && (!filterDate || isTaskOnDate(t, filterDate))
  );

  const getColTasks = (col: TaskStatus) => {
    return tasks.filter(t => {
      const st: TaskStatus = t.status ?? (t.done ? 'done' : 'todo');
      return st === col;
    });
  };

  const handleMove = (task: Task, nextStatus: TaskStatus) => {
    const currentStatus: TaskStatus = task.status ?? (task.done ? 'done' : 'todo');
    if (currentStatus === nextStatus) return;

    // ถ้าไม่ใช่หัวห้อง และไม่ใช่งานของตัวเอง ต้องส่งคำขอแก้ไขไปยังเจ้าของงาน
    if (!canUserEditTaskDirectly(currentUser, currentTeam, task)) {
      const statusLabel =
        nextStatus === 'done' ? 'เสร็จสิ้น' : nextStatus === 'in_progress' ? 'กำลังทำ' : 'รอทำ';
      showConfirm(
        'ขอสิทธิ์เปลี่ยนสถานะงาน',
        `งานนี้เป็นของคุณ ${task.userName || 'สมาชิกคนอื่น'} คุณต้องการส่งคำขอเปลี่ยนสถานะเป็น "${statusLabel}" ไปยังเจ้าของงานใช่หรือไม่?`,
        () => {
          if (!currentUser) return;
          sendTaskEditRequest({
            task,
            proposedPatch: {
              status: nextStatus,
              done: nextStatus === 'done',
            },
            requestNote: `ขอเปลี่ยนสถานะงานเป็น "${statusLabel}"`,
            actor: {
              id: currentUser.id,
              name: currentUser.name,
              avatarId: currentUser.avatarId,
            },
          });
          showAlert(
            'ส่งคำขอเรียบร้อยแล้ว',
            `คำขอเปลี่ยนสถานะถูกส่งไปยังกล่องข้อความเตือนของ ${task.userName || 'เจ้าของงาน'} เรียบร้อยแล้ว เมื่อได้รับการอนุมัติ งานจะถูกปรับสถานะทันที`
          );
        }
      );
      return;
    }

    if (nextStatus === 'done' && !task.done) {
      if (s.soundEnabled) playCompletionSound();
      triggerConfetti();
    }
    s.updateTaskStatus(
      task.id,
      nextStatus,
      currentUser
        ? { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId }
        : undefined
    );
  };

  const handleDelete = (t: Task) => {
    if (!canUserEditTaskDirectly(currentUser, currentTeam, t)) {
      showAlert('ไม่มีสิทธิ์ลบงานนี้', 'เฉพาะเจ้าของงานหรือหัวห้องเท่านั้นที่สามารถลบงานนี้ได้');
      return;
    }
    showConfirm('ยืนยันการลบ', `ต้องการลบ "${t.title}" ใช่ไหม?`, () => {
      s.deleteTask(t.id);
    });
  };

  const handleQuickAdd = () => {
    if (!newTitle.trim()) return;
    s.addTasks([
      {
        date: filterDate || currentDate,
        title: newTitle.trim(),
        detail: '',
        priority: 'medium',
        status: 'todo',
        done: false,
        userId: currentUser?.id,
        userName: currentUser?.name,
        userAvatar: currentUser?.avatarId,
      },
    ]);
    setNewTitle('');
  };

  return (
    <div>
      <div className="card mb row" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <b>กรองตามวันที่:</b>
          <div style={{ width: 170 }}>
            <ThaiDatePicker
              value={filterDate}
              onChange={setFilterDate}
              clearable
              placeholder="ทุกวัน (ทั้งหมด)"
              style={{ margin: 0 }}
            />
          </div>
          <button
            className="btn sm ghost"
            onClick={() => setFilterDate(currentDate)}
          >
            วันนี้
          </button>
          <button
            className="btn sm ghost"
            onClick={() => setFilterDate('')}
          >
            แสดงทั้งหมด
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flex: 1, maxWidth: 360 }}>
          <input
            type="text"
            placeholder="+ เพิ่มงานด่วน..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
            style={{ margin: 0 }}
          />
          <button
            className="btn sm"
            onClick={handleQuickAdd}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <PlusIcon size={13} strokeWidth={2.5} /> เพิ่ม
          </button>
        </div>
      </div>

      <div className="kanban-grid">
        {COLUMNS.map(col => {
          const colTasks = getColTasks(col.key);
          return (
            <div key={col.key} className="kanban-col">
              <div className="kanban-head">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{col.icon}</span>
                  <span>{col.label}</span>
                </span>
                <span className="count">{colTasks.length}</span>
              </div>

              <div className="kanban-tasks">
                {colTasks.length === 0 ? (
                  <p className="mut" style={{ textAlign: 'center', margin: '30px 0' }}>
                    ไม่มีงานในช่องนี้
                  </p>
                ) : (
                  colTasks.map(t => {
                    const p = PRIORITY[t.priority];
                    const subs = t.subtasks || [];
                    const doneSubs = subs.filter(st => st.done).length;
                    return (
                      <div
                        key={t.id}
                        className="kanban-card"
                        style={{ borderLeft: `4px solid ${p.color}` }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 6,
                          }}
                        >
                          <b style={{ fontSize: 14, flex: 1 }}>{t.title}</b>
                          {(() => {
                            const assignedIds = t.assigneeIds && t.assigneeIds.length ? t.assigneeIds : (t.userId ? [t.userId] : []);
                            const assignedList = assignedIds.map(id => {
                              const u = users.find(x => x.id === id);
                              if (u) return { id: u.id, name: u.name, avatarId: u.avatarId };
                              if (id === currentUser?.id) return { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId };
                              return { id, name: t.userName || 'สมาชิก', avatarId: t.userAvatar || 'dev_boy' };
                            });
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                {assignedList.length > 1 ? (
                                  <span className="team-member-pill" style={{ padding: '1px 6px', fontSize: 10, gap: 3 }} title={assignedList.map(u => u.name).join(', ')}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                      {assignedList.slice(0, 2).map((u, i) => (
                                        <span key={u.id} style={{ marginLeft: i > 0 ? -4 : 0, borderRadius: '999px', display: 'inline-flex', zIndex: 2 - i }}>
                                          <AvatarIcon id={u.avatarId} size={14} />
                                        </span>
                                      ))}
                                    </div>
                                    <span>{assignedList.length} คน</span>
                                  </span>
                                ) : assignedList.length === 1 ? (
                                  <span className="team-member-pill" style={{ padding: '1px 5px', fontSize: 10 }}>
                                    <AvatarIcon id={assignedList[0].avatarId} size={14} />
                                    <span>{assignedList[0].name.split(' ')[0]}</span>
                                  </span>
                                ) : null}
                                <span
                                  className="pri"
                                  style={{
                                    background: p.color,
                                    fontSize: 10,
                                    marginRight: 0,
                                  }}
                                >
                                  {p.label}
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        {t.detail && (
                          <small className="mut" style={{ fontSize: 12 }}>
                            {t.detail}
                          </small>
                        )}

                        {/* Tags */}
                        {t.tags && t.tags.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, margin: '2px 0' }}>
                            {t.tags.map(tag => {
                              const ts = getTagStyle(tag);
                              return (
                                <span
                                  key={tag}
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: 600,
                                    padding: '0 5px',
                                    borderRadius: 999,
                                    background: ts.bg,
                                    color: ts.color,
                                    border: `1px solid ${ts.border}`,
                                  }}
                                >
                                  #{tag.replace(/^#/, '')}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {subs.length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--mut)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <ClipboardCheckIcon size={13} /> Checklist: {doneSubs}/{subs.length}
                          </div>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 4,
                            fontSize: 11,
                            color: 'var(--mut)',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CalendarIcon size={11} />
                            {t.endDate && t.endDate !== t.date
                              ? `${thDate(t.date)} – ${thDate(t.endDate)}`
                              : thDate(t.date)}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {t.comments && t.comments.length > 0 && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  fontSize: 10,
                                  color: 'var(--pri)',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                onClick={() => onEditTask(t)}
                                title={`${t.comments.length} คอมเมนต์`}
                              >
                                <MessageSquareIcon size={10} /> {t.comments.length}
                              </span>
                            )}
                            {t.time && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <ClockIcon size={11} /> {t.time}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="kanban-actions">
                          <div style={{ display: 'flex', gap: 4 }}>
                            {col.key !== 'todo' && (
                              <button
                                className="btn sm ghost"
                                style={{ padding: '2px 6px', fontSize: 11, display: 'inline-flex', alignItems: 'center' }}
                                onClick={() =>
                                  handleMove(
                                    t,
                                    col.key === 'done' ? 'in_progress' : 'todo'
                                  )
                                }
                                title="ย้ายกลับ"
                              >
                                <ChevronLeftIcon size={13} />
                              </button>
                            )}
                            {col.key !== 'done' && (
                              <button
                                className="btn sm ok"
                                style={{ padding: '2px 6px', fontSize: 11, display: 'inline-flex', alignItems: 'center' }}
                                onClick={() =>
                                  handleMove(
                                    t,
                                    col.key === 'todo' ? 'in_progress' : 'done'
                                  )
                                }
                                title="ย้ายไปข้างหน้า"
                              >
                                <ChevronRightIcon size={13} />
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: 2 }}>
                            <button
                              className="icon-btn edit-btn"
                              style={{ width: 26, height: 26 }}
                              onClick={() => onEditTask(t)}
                              title="แก้ไขงาน"
                            >
                              <EditIcon size={14} />
                            </button>
                            <button
                              className="icon-btn del-btn"
                              style={{ width: 26, height: 26 }}
                              onClick={() => handleDelete(t)}
                              title="ลบงาน"
                            >
                              <TrashIcon size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
