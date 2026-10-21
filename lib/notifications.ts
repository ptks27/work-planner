import { AppNotification, AvatarId, Task, TaskStatus } from './types';
import { usePlanner } from './store';
import { useAuth } from './authStore';

/**
 * ดึงชื่อที่ถูก @Mention ในข้อความคอมเมนต์ เช่น "@สมชาย ช่วยดูงานนี้ที @มินท์"
 */
export function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9ก-๙_]+(?:\s+[a-zA-Z0-9ก-๙_]+)?)/g);
  if (!matches) return [];
  return matches.map(m => m.slice(1).trim().toLowerCase());
}

/**
 * ตรวจสอบและสร้างการแจ้งเตือน Mention เมื่อมีคนส่งคอมเมนต์
 */
export function notifyMentionsInComment({
  taskId,
  taskTitle,
  commentText,
  actor,
}: {
  taskId: string;
  taskTitle: string;
  commentText: string;
  actor: { id: string; name: string; avatarId?: AvatarId };
}) {
  const mentionedNames = extractMentions(commentText);
  if (mentionedNames.length === 0) return;

  const { teamMembers, users } = useAuth.getState();
  const allKnownUsers = [...teamMembers.map(m => ({ id: m.userId, name: m.name })), ...users];

  const notifiedUserIds = new Set<string>();

  mentionedNames.forEach(mentionName => {
    // หาผู้ใช้ที่มีชื่อตรงกัน
    const target = allKnownUsers.find(
      u => u.name && u.name.toLowerCase().includes(mentionName)
    );
    if (target && target.id !== actor.id && !notifiedUserIds.has(target.id)) {
      notifiedUserIds.add(target.id);
      usePlanner.getState().addNotification({
        type: 'mention',
        taskId,
        taskTitle,
        targetUserId: target.id,
        actorId: actor.id,
        actorName: actor.name,
        actorAvatar: actor.avatarId,
        text: `ได้กล่าวถึงคุณในคอมเมนต์: "${commentText.length > 40 ? commentText.slice(0, 40) + '...' : commentText}"`,
      });
    }
  });
}

/**
 * แจ้งเตือนเมื่อมีการมอบหมายงาน (Assign) ให้สมาชิกคนอื่น
 */
export function notifyTaskAssignment({
  task,
  prevAssigneeIds,
  actor,
}: {
  task: Task;
  prevAssigneeIds?: string[];
  actor: { id: string; name: string; avatarId?: AvatarId };
}) {
  const currentAssignees = task.assigneeIds || (task.userId ? [task.userId] : []);
  const prevSet = new Set(prevAssigneeIds || []);

  currentAssignees.forEach(assigneeId => {
    // ถ้าเพิ่งถูกเพิ่มเข้ามาใหม่ และไม่ใช่ตัวผู้กระทำเอง
    if (!prevSet.has(assigneeId) && assigneeId !== actor.id) {
      usePlanner.getState().addNotification({
        type: 'assigned',
        taskId: task.id,
        taskTitle: task.title,
        targetUserId: assigneeId,
        actorId: actor.id,
        actorName: actor.name,
        actorAvatar: actor.avatarId,
        text: `ได้มอบหมายงานนี้ให้คุณ`,
      });
    }
  });
}

/**
 * แจ้งเตือนเมื่อมีการเปลี่ยนสถานะของงาน
 */
export function notifyTaskStatusChange({
  task,
  newStatus,
  actor,
}: {
  task: Task;
  newStatus: TaskStatus;
  actor: { id: string; name: string; avatarId?: AvatarId };
}) {
  const assignees = task.assigneeIds || (task.userId ? [task.userId] : []);
  const statusLabel =
    newStatus === 'done'
      ? 'เสร็จสิ้น'
      : newStatus === 'in_progress'
      ? 'กำลังทำ'
      : 'รอทำ';

  assignees.forEach(targetId => {
    if (targetId !== actor.id) {
      usePlanner.getState().addNotification({
        type: 'status_change',
        taskId: task.id,
        taskTitle: task.title,
        targetUserId: targetId,
        actorId: actor.id,
        actorName: actor.name,
        actorAvatar: actor.avatarId,
        text: `ได้เปลี่ยนสถานะงานเป็น "${statusLabel}"`,
      });
    }
  });
}

/**
 * ฟอร์แมตเวลาสัมพัทธ์ภาษาไทย เช่น "เมื่อสักครู่", "5 นาทีที่แล้ว"
 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'เมื่อสักครู่';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'เมื่อวานนี้';
  if (days < 7) return `${days} วันที่แล้ว`;

  const d = new Date(timestamp);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`;
}
