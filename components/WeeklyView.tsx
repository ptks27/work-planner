'use client';
import { useState } from 'react';
import { usePlanner } from '@/lib/store';
import { visibleOn, eventsOn } from '@/lib/selectors';
import { fmt, parse, addDays, thDate, TH_DOW } from '@/lib/utils';
import { PRIORITY, getTagStyle, type Task } from '@/lib/types';
import { EditIcon, ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ClockIcon, PlusIcon, MessageSquareIcon, LeaveIcon, HolidayIcon, NoteIcon } from './Icons';
import { playCompletionSound, triggerConfetti } from '@/lib/audio';
import { AvatarIcon } from './Avatars';
import { useAuth } from '@/lib/authStore';
import { useModal } from './ModalContext';
import { canUserEditTaskDirectly } from '@/lib/permissions';
import { sendTaskEditRequest } from '@/lib/notifications';

interface WeeklyViewProps {
  currentDate: string;
  onEditTask: (t: Task) => void;
}

export default function WeeklyView({ currentDate, onEditTask }: WeeklyViewProps) {
  const s = usePlanner();
  const [baseDate, setBaseDate] = useState(() => parse(currentDate));
  const [quickInput, setQuickInput] = useState<{ [date: string]: string }>({});

  // Find Monday of the week
  const curr = new Date(baseDate);
  const day = curr.getDay();
  // Monday as first day: day === 0 (Sun) -> diff = -6, day === 1 (Mon) -> diff = 0, etc.
  const diff = day === 0 ? -6 : 1 - day;
  const monday = addDays(curr, diff);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const { showConfirm, showAlert } = useModal();
  const { currentUser, currentTeam, users } = useAuth();

  const handleToggle = (task: Task) => {
    // ถ้าไม่ใช่หัวห้อง และไม่ใช่งานของตนเอง ต้องส่งคำขอแก้ไขสถานะไปยังเจ้าของงาน
    if (!canUserEditTaskDirectly(currentUser, currentTeam, task)) {
      const nextDone = !task.done;
      const statusLabel = nextDone ? 'เสร็จสิ้น' : 'รอทำ';
      showConfirm(
        'ขอสิทธิ์เปลี่ยนสถานะงาน',
        `งานนี้เป็นของคุณ ${task.userName || 'สมาชิกคนอื่น'} คุณต้องการส่งคำขอเปลี่ยนสถานะเป็น "${statusLabel}" ไปยังเจ้าของงานใช่หรือไม่?`,
        () => {
          if (!currentUser) return;
          sendTaskEditRequest({
            task,
            proposedPatch: {
              done: nextDone,
              status: nextDone ? 'done' : 'todo',
            },
            requestNote: `ขอเปลี่ยนสถานะเป็น "${statusLabel}"`,
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

    if (!task.done) {
      if (s.soundEnabled) playCompletionSound();
      triggerConfetti();
    }
    s.toggleTask(
      task.id,
      currentUser
        ? { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId }
        : undefined
    );
  };

  const handleQuickAdd = (dateStr: string) => {
    const val = quickInput[dateStr]?.trim();
    if (!val) return;
    s.addTasks([
      {
        date: dateStr,
        title: val,
        detail: '',
        priority: 'medium',
        status: 'todo',
        done: false,
        userId: currentUser?.id,
        userName: currentUser?.name,
        userAvatar: currentUser?.avatarId,
      },
    ]);
    setQuickInput(prev => ({ ...prev, [dateStr]: '' }));
  };

  return (
    <div>
      <div className="card mb tasks-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn sm ghost"
            onClick={() => setBaseDate(prev => addDays(prev, -7))}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <ChevronLeftIcon size={13} /> สัปดาห์ก่อน
          </button>
          <button
            className="btn sm"
            onClick={() => setBaseDate(parse(currentDate))}
          >
            สัปดาห์นี้
          </button>
          <button
            className="btn sm ghost"
            onClick={() => setBaseDate(prev => addDays(prev, 7))}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            สัปดาห์ถัดไป <ChevronRightIcon size={13} />
          </button>
        </div>

        <b style={{ color: 'var(--pri)', fontSize: 'clamp(12px, 2.5vw, 14.5px)', wordBreak: 'break-word' }}>
          {thDate(fmt(weekDays[0]))} – {thDate(fmt(weekDays[6]))}
        </b>
      </div>

      <div className="weekly-grid">
        {weekDays.map(d => {
          const ds = fmt(d);
          const isToday = ds === currentDate;
          const dayTasks = visibleOn(s, ds);
          const ev = eventsOn(s, ds);
          const dowName = TH_DOW[d.getDay()];

          return (
            <div
              key={ds}
              className={`weekly-col ${isToday ? 'today' : ''}`}
            >
              <div className="weekly-head">
                <div
                  className="weekly-dow"
                  style={{
                    color: d.getDay() % 6 === 0 ? 'var(--red)' : 'var(--mut)',
                  }}
                >
                  {dowName}
                </div>
                <div className="weekly-date">{d.getDate()}</div>
                {ev.map(e => {
                  const evUser = users.find(u => u.id === e.userId) || (currentUser?.id === e.userId ? currentUser : null);
                  const evName = evUser?.name || e.userName;
                  const evAvatar = evUser?.avatarId || e.userAvatar;
                  if (e.type === 'leave') {
                    return (
                      <div
                        key={e.id}
                        className="cal-event-pill cal-leave-pill"
                        style={{ fontSize: 10, margin: '2px 0' }}
                        title={`${evName ? `[${evName}] ` : ''}${e.title}`}
                      >
                        {evAvatar ? <AvatarIcon id={evAvatar} size={12} /> : <LeaveIcon size={11} color="currentColor" />}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {evName ? `${evName.split(' ')[0]}: ` : ''}{e.title}
                        </span>
                      </div>
                    );
                  }
                  if (e.type === 'holiday') {
                    return (
                      <div
                        key={e.id}
                        className="cal-event-pill cal-holiday-pill"
                        style={{ fontSize: 10, margin: '2px 0' }}
                        title={`วันหยุด: ${e.title}`}
                      >
                        <HolidayIcon size={11} color="currentColor" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {e.title}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={e.id}
                      className="cal-event-pill cal-note-pill"
                      style={{ fontSize: 10, margin: '2px 0' }}
                      title={`โน้ต: ${e.title}`}
                    >
                      <NoteIcon size={11} color="currentColor" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {e.title}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="weekly-tasks">
                {dayTasks.length === 0 ? (
                  <p
                    className="mut"
                    style={{ textAlign: 'center', fontSize: 12, margin: '20px 0' }}
                  >
                    ไม่มีงาน
                  </p>
                ) : (
                  dayTasks.map(t => {
                    const p = PRIORITY[t.priority];
                    return (
                      <div
                        key={t.id}
                        style={{
                          background: 'var(--bg)',
                          borderLeft: `3px solid ${p.color}`,
                          padding: '6px 8px',
                          borderRadius: 8,
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => handleToggle(t)}
                          style={{
                            width: 14,
                            height: 14,
                            marginTop: 2,
                            cursor: 'pointer',
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              textDecoration: t.done ? 'line-through' : 'none',
                              color: t.done ? 'var(--mut)' : 'inherit',
                              wordBreak: 'break-word',
                              fontWeight: 600,
                            }}
                          >
                            {t.title}
                          </span>
                          {(() => {
                            const assignedIds = t.assigneeIds && t.assigneeIds.length ? t.assigneeIds : (t.userId ? [t.userId] : []);
                            const assignedList = assignedIds.map(id => {
                              const u = users.find(x => x.id === id);
                              if (u) return { id: u.id, name: u.name, avatarId: u.avatarId };
                              if (id === currentUser?.id) return { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId };
                              return { id, name: t.userName || 'สมาชิก', avatarId: t.userAvatar || 'dev_boy' };
                            });
                            if (!assignedList.length) return null;
                            return (
                              <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                                {assignedList.length > 1 ? (
                                  <span className="team-member-pill" style={{ fontSize: 9, padding: '1px 5px', gap: 3 }}>
                                    <span>👥 {assignedList.length} คน</span>
                                  </span>
                                ) : (
                                  <span className="team-member-pill" style={{ fontSize: 9, padding: '1px 5px' }}>
                                    <AvatarIcon id={assignedList[0].avatarId} size={12} />
                                    <span>{assignedList[0].name.split(' ')[0]}</span>
                                  </span>
                                )}
                              </div>
                            );
                          })()}

                          {/* Tags */}
                          {t.tags && t.tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 2 }}>
                              {t.tags.map(tag => {
                                const ts = getTagStyle(tag);
                                return (
                                  <span
                                    key={tag}
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 600,
                                      padding: '0 4px',
                                      borderRadius: 4,
                                      background: ts.bg,
                                      color: ts.color,
                                    }}
                                  >
                                    #{tag.replace(/^#/, '')}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                            {t.endDate && t.endDate !== t.date && (
                              <div style={{ color: 'var(--pri)', fontSize: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <CalendarIcon size={10} /> {thDate(t.date)} – {thDate(t.endDate)}
                              </div>
                            )}
                            {t.time && (
                              <div style={{ color: 'var(--mut)', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <ClockIcon size={10} /> {t.time}
                              </div>
                            )}
                            {t.comments && t.comments.length > 0 && (
                              <span style={{ color: 'var(--pri)', fontSize: 9.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                <MessageSquareIcon size={9} /> {t.comments.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          className="icon-btn"
                          style={{ width: 20, height: 20, padding: 0 }}
                          onClick={() => onEditTask(t)}
                          title="แก้ไข"
                        >
                          <EditIcon size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ marginTop: 10, display: 'flex', gap: 4 }}>
                <input
                  type="text"
                  placeholder="+ งาน..."
                  value={quickInput[ds] || ''}
                  onChange={e =>
                    setQuickInput(prev => ({ ...prev, [ds]: e.target.value }))
                  }
                  onKeyDown={e => e.key === 'Enter' && handleQuickAdd(ds)}
                  style={{ fontSize: 11, padding: '4px 6px', margin: 0 }}
                />
                <button
                  className="btn sm"
                  style={{ padding: '4px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => handleQuickAdd(ds)}
                >
                  <PlusIcon size={11} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
