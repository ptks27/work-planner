'use client';
import { useState } from 'react';
import { usePlanner } from '@/lib/store';
import { PRIORITY, getTagStyle, type Task, type TaskAttachment } from '@/lib/types';
import { thDate } from '@/lib/utils';
import { extractAllLinks, getCleanDetail } from '@/lib/links';
import { safeUrl } from '@/lib/security';
import {
  TrashIcon,
  EditIcon,
  CheckIcon,
  RepeatIcon,
  BoltIcon,
  ClockIcon,
  CalendarIcon,
  MessageSquareIcon,
  ImageIcon,
} from './Icons';
import { useModal } from './ModalContext';
import { playCompletionSound, triggerConfetti } from '@/lib/audio';
import { AvatarIcon } from './Avatars';
import { useAuth } from '@/lib/authStore';
import ImageLightboxModal from './ImageLightboxModal';
import { canUserEditTaskDirectly } from '@/lib/permissions';
import { sendTaskEditRequest } from '@/lib/notifications';

export default function TaskItem({
  t,
  onEdit,
  showDate,
}: {
  t: Task;
  onEdit?: (t: Task) => void;
  showDate?: boolean;
}) {
  const { users, currentUser, currentTeam } = useAuth();
  const [quickSubtask, setQuickSubtask] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [activeLightboxAttachment, setActiveLightboxAttachment] = useState<TaskAttachment | null>(null);

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
  const addSub = usePlanner(s => s.addSubtask);
  const delSub = usePlanner(s => s.deleteSubtask);
  const addLink = usePlanner(s => s.addTaskLink);
  const delLink = usePlanner(s => s.deleteTaskLink);
  const del = usePlanner(s => s.deleteTask);
  const soundEnabled = usePlanner(s => s.soundEnabled);
  const tasks = usePlanner(s => s.tasks);
  const { showConfirm, showAlert } = useModal();
  const p = PRIORITY[t.priority];

  const handleToggle = () => {
    // ถ้าไม่ใช่หัวห้อง และไม่ใช่งานของตนเอง ต้องส่งคำขอแก้ไขสถานะไปยังเจ้าของงาน
    if (!canUserEditTaskDirectly(currentUser, currentTeam, t)) {
      const nextDone = !t.done;
      const statusLabel = nextDone ? 'เสร็จสิ้น' : 'รอทำ';
      showConfirm(
        'ขอสิทธิ์เปลี่ยนสถานะงาน',
        `งานนี้เป็นของคุณ ${t.userName || 'สมาชิกคนอื่น'} คุณต้องการส่งคำขอเปลี่ยนสถานะเป็น "${statusLabel}" ไปยังเจ้าของงานใช่หรือไม่?`,
        () => {
          if (!currentUser) return;
          sendTaskEditRequest({
            task: t,
            proposedPatch: {
              done: nextDone,
              status: nextDone ? 'done' : 'todo',
            },
            requestNote: `ขอทำเครื่องหมายงานเป็น "${statusLabel}"`,
            actor: {
              id: currentUser.id,
              name: currentUser.name,
              avatarId: currentUser.avatarId,
            },
          });
          showAlert(
            'ส่งคำขอเรียบร้อยแล้ว',
            `คำขอเปลี่ยนสถานะถูกส่งไปยังกล่องข้อความเตือนของ ${t.userName || 'เจ้าของงาน'} เรียบร้อยแล้ว เมื่อได้รับการอนุมัติ งานจะถูกปรับสถานะทันที`
          );
        }
      );
      return;
    }

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
    if (!canUserEditTaskDirectly(currentUser, currentTeam, t)) {
      showAlert('ไม่มีสิทธิ์แก้ไขงานนี้', 'เฉพาะเจ้าของงานหรือหัวห้องเท่านั้นที่สามารถปรับสถานะงานย่อยได้');
      return;
    }
    if (!currentDone && soundEnabled) {
      playCompletionSound();
    }
    toggleSub(t.id, stId);
  };

  const handleAddQuickSubtask = () => {
    if (!canUserEditTaskDirectly(currentUser, currentTeam, t)) {
      showAlert('ไม่มีสิทธิ์แก้ไขงานนี้', 'เฉพาะเจ้าของงานหรือหัวห้องเท่านั้นที่สามารถเพิ่มงานย่อยได้ หากต้องการเสนอ ให้เปิดดูงานและส่งคำขอแก้ไข');
      return;
    }
    if (!quickSubtask.trim()) return;
    addSub(t.id, quickSubtask.trim());
    setQuickSubtask('');
  };

  const handleAddQuickLink = () => {
    if (!canUserEditTaskDirectly(currentUser, currentTeam, t)) {
      showAlert('ไม่มีสิทธิ์แก้ไขงานนี้', 'เฉพาะเจ้าของงานหรือหัวห้องเท่านั้นที่สามารถแนบลิงก์ได้');
      return;
    }
    const raw = linkUrl.trim();
    if (!raw) return;
    const validated = safeUrl(raw);
    if (validated === '#') {
      showAlert('ลิงก์ไม่ปลอดภัย', 'กรุณาระบุ URL ที่ถูกต้อง (รองรับเฉพาะ http:// หรือ https://)');
      return;
    }
    addLink(t.id, { url: validated, title: linkTitle.trim() || undefined });
    setLinkUrl('');
    setLinkTitle('');
    setIsAddingLink(false);
  };

  const onDelete = () => {
    if (!canUserEditTaskDirectly(currentUser, currentTeam, t)) {
      showAlert('ไม่มีสิทธิ์ลบงานนี้', 'เฉพาะเจ้าของงานหรือหัวห้องเท่านั้นที่สามารถลบงานนี้ได้');
      return;
    }
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
  const detectedLinks = extractAllLinks(t.detail, t.links);
  const cleanDetail = getCleanDetail(t.detail);

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
        {cleanDetail && <div className="task-detail">{cleanDetail}</div>}

        {/* 🔗 Attached & Auto-Detected Links Row */}
        {detectedLinks.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '5px 0' }} onClick={e => e.stopPropagation()}>
            {detectedLinks.map(link => (
              <a
                key={`link-${link.url}`}
                href={safeUrl(link.url)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: link.bg,
                  color: link.color,
                  border: '1px solid rgba(120, 120, 128, 0.15)',
                  textDecoration: 'none',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                title={`เปิดลิงก์: ${link.url}`}
              >
                <span>{link.emoji}</span>
                <span>{link.label}</span>
                <span style={{ fontSize: 9.5, opacity: 0.65 }}>↗</span>
              </a>
            ))}
          </div>
        )}

        {/* Quick Add Link Inline Input */}
        {isAddingLink && (
          <div
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              marginTop: 6,
              padding: '6px 8px',
              borderRadius: 8,
              background: 'rgba(120, 120, 128, 0.06)',
              border: '1px solid var(--line)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <input
              type="url"
              placeholder="วางลิงก์ เช่น Figma, Drive, GitHub..."
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddQuickLink()}
              style={{ flex: 2, padding: '4px 8px', fontSize: 11.5, margin: 0 }}
              autoFocus
            />
            <input
              type="text"
              placeholder="ชื่อลิงก์ (ไม่บังคับ)"
              value={linkTitle}
              onChange={e => setLinkTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddQuickLink()}
              style={{ flex: 1, padding: '4px 8px', fontSize: 11.5, margin: 0 }}
            />
            <button
              type="button"
              className="btn sm primary"
              onClick={handleAddQuickLink}
              disabled={!linkUrl.trim()}
              style={{ padding: '3px 10px', fontSize: 11, borderRadius: 6 }}
            >
              เพิ่ม
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={() => setIsAddingLink(false)}
              style={{ padding: '3px 8px', fontSize: 11, borderRadius: 6 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 📋 Subtasks Interactive Checklist Directly on Card */}
        {(subs.length > 0 || isAddingSubtask) && (
          <div className="subtasks" onClick={e => e.stopPropagation()}>
            <div className="subtask-progress" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>
                เช็กลิสต์ย่อย ({doneSubs}/{subs.length})
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="subtask-bar" style={{ width: 60 }}>
                  <div style={{ width: `${subs.length ? (doneSubs / subs.length) * 100 : 0}%` }} />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingSubtask(prev => !prev)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--pri)',
                    fontSize: 11,
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  {isAddingSubtask ? 'ซ่อน' : '+ ข้อย่อย'}
                </button>
              </div>
            </div>

            {subs.map(st => (
              <div
                key={st.id}
                className="subtask-item"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, cursor: 'pointer' }}
                  onClick={() => handleToggleSubtask(st.id, st.done)}
                >
                  <div className={`subtask-check ${st.done ? 'on' : ''}`}>
                    {st.done && <CheckIcon size={10} strokeWidth={3} />}
                  </div>
                  <span className={`subtask-text ${st.done ? 'done' : ''}`} style={{ fontSize: 12 }}>
                    {st.title}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => delSub(t.id, st.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--mut)',
                    cursor: 'pointer',
                    fontSize: 11,
                    padding: '2px 4px',
                    opacity: 0.5,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                  title="ลบข้อย่อยนี้"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Quick Add Subtask Input Field */}
            {isAddingSubtask && (
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <input
                  type="text"
                  placeholder="พิมพ์งานย่อยแล้วกด Enter..."
                  value={quickSubtask}
                  onChange={e => setQuickSubtask(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddQuickSubtask();
                    }
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: 11.5,
                    borderRadius: 6,
                    border: '1px solid var(--line)',
                    background: 'var(--card-solid)',
                    margin: 0,
                    flex: 1,
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={handleAddQuickSubtask}
                  disabled={!quickSubtask.trim()}
                  style={{ padding: '2px 8px', fontSize: 11, borderRadius: 6 }}
                >
                  เพิ่ม
                </button>
              </div>
            )}
          </div>
        )}

        {/* 🖼️ Attached Images Preview Strip */}
        {t.attachments && t.attachments.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 6,
              overflowX: 'auto',
              paddingBottom: 2,
            }}
            onClick={e => e.stopPropagation()}
          >
            {t.attachments.slice(0, 4).map(att => (
              <div
                key={att.id}
                onClick={() => setActiveLightboxAttachment(att)}
                title={`คลิกเพื่อดูภาพเต็ม: ${att.name}`}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  overflow: 'hidden',
                  flexShrink: 0,
                  cursor: 'pointer',
                  border: '1px solid var(--line)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <img
                  src={att.url}
                  alt={att.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ))}
            {t.attachments.length > 4 && (
              <button
                type="button"
                onClick={() => onEdit?.(t)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  border: '1px dashed var(--line)',
                  background: 'rgba(120, 120, 128, 0.08)',
                  color: 'var(--mut)',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                +{t.attachments.length - 4}
              </button>
            )}
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

          {/* Quick Action: Add Subtask (if none currently) */}
          {subs.length === 0 && !isAddingSubtask && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setIsAddingSubtask(true);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--mut)',
                fontSize: 11,
                cursor: 'pointer',
                padding: '1px 5px',
                borderRadius: 4,
              }}
              title="เพิ่มเช็กลิสต์งานย่อย"
            >
              + ข้อย่อย
            </button>
          )}

          {/* Quick Action: Attach Link */}
          {!isAddingLink && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setIsAddingLink(true);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--mut)',
                fontSize: 11,
                cursor: 'pointer',
                padding: '1px 5px',
                borderRadius: 4,
              }}
              title="แนบลิงก์ Figma, Docs, Drive, GitHub..."
            >
              + 🔗 ลิงก์
            </button>
          )}

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

          {/* Attachments count pill */}
          {t.attachments && t.attachments.length > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(175, 82, 222, 0.08)',
                color: '#af52de',
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (t.attachments && t.attachments[0]) {
                  setActiveLightboxAttachment(t.attachments[0]);
                }
              }}
              title={`${t.attachments.length} รูปภาพแนบ (คลิกเพื่อดูรูปแรก)`}
            >
              <ImageIcon size={11} /> {t.attachments.length}
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

      {activeLightboxAttachment && (
        <ImageLightboxModal
          isOpen={true}
          attachment={activeLightboxAttachment}
          onClose={() => setActiveLightboxAttachment(null)}
        />
      )}
    </div>
  );
}
