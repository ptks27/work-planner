'use client';
import { usePlanner } from '@/lib/store';
import { PRIORITY, getTagStyle, type Task } from '@/lib/types';
import { thDate } from '@/lib/utils';
import {
  TrashIcon,
  EditIcon,
  CheckIcon,
  RepeatIcon,
  BoltIcon,
  ClockIcon,
  CalendarIcon,
  MessageSquareIcon,
} from './Icons';
import { useModal } from './ModalContext';
import { playCompletionSound, triggerConfetti } from '@/lib/audio';
import { AvatarIcon } from './Avatars';
import { useAuth } from '@/lib/authStore';

export default function TaskItem({
  t,
  onEdit,
  showDate,
}: {
  t: Task;
  onEdit?: (t: Task) => void;
  showDate?: boolean;
}) {
  const { users, currentUser } = useAuth();
  const assignedIds = t.assigneeIds && t.assigneeIds.length ? t.assigneeIds : (t.userId ? [t.userId] : []);
  const assignedList = assignedIds.map(id => {
    const u = users.find(x => x.id === id);
    if (u) return { id: u.id, name: u.name, avatarId: u.avatarId };
    if (id === currentUser?.id) return { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId };
    if (id === t.userId && t.userName) return { id: t.userId, name: t.userName, avatarId: t.userAvatar };
    return { id, name: 'สมาชิก', avatarId: 'dev_boy' as const };
  });
  const firstUser = assignedList[0] || { id: 'me', name: 'ฉัน', avatarId: 'dev_boy' as const };

  const toggle = usePlanner(s => s.toggleTask);
  const toggleSub = usePlanner(s => s.toggleSubtask);
  const del = usePlanner(s => s.deleteTask);
  const soundEnabled = usePlanner(s => s.soundEnabled);
  const tasks = usePlanner(s => s.tasks);
  const { showConfirm } = useModal();
  const p = PRIORITY[t.priority];

  const handleToggle = () => {
    if (!t.done) {
      if (soundEnabled) playCompletionSound();
      // Check if this was the last remaining unfinished task of the date
      const otherUnfinished = tasks.filter(
        x => x.date === t.date && !x.done && !x.hidden && x.id !== t.id
      );
      if (otherUnfinished.length === 0) {
        triggerConfetti();
      }
    }
    toggle(
      t.id,
      currentUser ? { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId } : undefined
    );
  };

  const handleToggleSubtask = (stId: string, currentDone: boolean) => {
    if (!currentDone && soundEnabled) {
      playCompletionSound();
    }
    toggleSub(t.id, stId);
  };

  const onDelete = () => {
    const isVirtual = t.id.startsWith('r:');
    const msg = isVirtual
      ? 'ข้ามงานประจำนี้เฉพาะวันนี้ใช่ไหม?'
      : t.done
      ? 'ต้องการลบงานนี้ใช่ไหม? (จะไม่นำไปรวมใน Dashboard)'
      : 'งานนี้ยังไม่เสร็จ ต้องการลบใช่ไหม?';

    showConfirm('ยืนยันการลบ', msg, () => {
      del(t.id);
    });
  };

  const subs = t.subtasks || [];
  const doneSubs = subs.filter(st => st.done).length;

  return (
    <div
      className={`task ${t.done ? 'done' : ''}`}
      style={{ borderLeft: `4px solid ${p.color}` }}
    >
      <button
        className={`check ${t.done ? 'on' : ''}`}
        onClick={handleToggle}
        title={t.done ? 'ยกเลิกสถานะเสร็จ' : 'กดเมื่อทำเสร็จแล้ว'}
        aria-label={t.done ? 'ยกเลิกสถานะเสร็จ' : 'ทำเครื่องหมายว่าเสร็จแล้ว'}
      >
        {t.done && <CheckIcon size={12} strokeWidth={3} />}
      </button>

      <div
        className="task-body"
        onDoubleClick={() => onEdit?.(t)}
        title={onEdit ? 'ดับเบิลคลิกเพื่อแก้ไข' : undefined}
      >
        <div className="task-title">
          {t.recurringId && (
            <RepeatIcon size={13} style={{ marginRight: 4, opacity: 0.7 }} />
          )}
          {t.title}
          {t.status === 'in_progress' && !t.done && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                marginLeft: 6,
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: 11,
                background: '#e0f2fe',
                color: '#0284c7',
                fontWeight: 600,
              }}
            >
              <BoltIcon size={11} /> กำลังทำ
            </span>
          )}
        </div>
        {t.detail && <div className="task-detail">{t.detail}</div>}

        {subs.length > 0 && (
          <div className="subtasks">
            <div className="subtask-progress">
              <span>
                รายการย่อย ({doneSubs}/{subs.length})
              </span>
              <div className="subtask-bar">
                <div style={{ width: `${(doneSubs / subs.length) * 100}%` }} />
              </div>
            </div>
            {subs.map(st => (
              <div
                key={st.id}
                className="subtask-item"
                onClick={() => handleToggleSubtask(st.id, st.done)}
              >
                <div className={`subtask-check ${st.done ? 'on' : ''}`}>
                  {st.done && <CheckIcon size={10} strokeWidth={3} />}
                </div>
                <span className={`subtask-text ${st.done ? 'done' : ''}`}>
                  {st.title}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {t.tags && t.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {t.tags.map(tag => {
              const tagStyle = getTagStyle(tag);
              return (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: 999,
                    background: tagStyle.bg,
                    color: tagStyle.color,
                    border: `1px solid ${tagStyle.border}`,
                    letterSpacing: '-0.01em',
                  }}
                >
                  #{tag.replace(/^#/, '')}
                </span>
              );
            })}
          </div>
        )}

        <div className="task-meta">
          {/* Assignees (Single or Multiple) */}
          {assignedList.length > 1 ? (
            <span
              className="team-member-pill"
              title={`ผู้รับผิดชอบ (${assignedList.length} คน): ${assignedList.map(u => u.name).join(', ')}`}
              style={{ gap: 4, paddingRight: 6 }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                {assignedList.slice(0, 3).map((u, i) => (
                  <span
                    key={u.id}
                    style={{
                      marginLeft: i > 0 ? -5 : 0,
                      borderRadius: '999px',
                      display: 'inline-flex',
                      zIndex: 3 - i,
                      boxShadow: '0 0 0 1.5px var(--card-solid, #fff)',
                    }}
                  >
                    <AvatarIcon id={u.avatarId} size={15} />
                  </span>
                ))}
              </div>
              <span>{assignedList.length} คน</span>
            </span>
          ) : (
            <span className="team-member-pill" title={`ผู้รับผิดชอบ: ${firstUser.name}`}>
              <AvatarIcon id={firstUser.avatarId} size={16} />
              <span>{firstUser.name.split(' ')[0]}</span>
            </span>
          )}

          <span className="pri" style={{ background: p.color }}>
            {p.label}
          </span>

          {/* Comments count pill */}
          {t.comments && t.comments.length > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(0, 113, 227, 0.08)',
                color: 'var(--pri)',
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => onEdit?.(t)}
              title={`${t.comments.length} ข้อความโน้ต/ความคิดเห็น (คลิกเพื่อเปิดดู)`}
            >
              <MessageSquareIcon size={11} /> {t.comments.length}
            </span>
          )}

          {(showDate || (t.endDate && t.endDate !== t.date)) && (
            <span style={{ color: 'var(--pri)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <CalendarIcon size={12} />
              {t.endDate && t.endDate !== t.date ? `${thDate(t.date)} – ${thDate(t.endDate)}` : thDate(t.date)}
            </span>
          )}
          {t.time && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ClockIcon size={12} /> {t.time}
            </span>
          )}
          {t.done && t.doneAt && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <CheckIcon size={12} strokeWidth={2.5} color="var(--ok)" />
              เสร็จเมื่อ{' '}
              {new Date(t.doneAt).toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>

      <div className="acts">
        {onEdit && (
          <button
            className="icon-btn edit-btn"
            onClick={() => onEdit(t)}
            title="แก้ไขงาน"
            aria-label="แก้ไขงาน"
          >
            <EditIcon size={16} />
          </button>
        )}
        <button
          className="icon-btn del-btn"
          onClick={onDelete}
          title="ลบงาน"
          aria-label="ลบงาน"
        >
          <TrashIcon size={16} />
        </button>
      </div>
    </div>
  );
}