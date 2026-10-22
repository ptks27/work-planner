import { Task, User, Team } from './types';

/**
 * ตรวจสอบว่าผู้ใช้เป็นหัวห้อง (Team Owner / Team Creator) หรือไม่
 * ตามกฎ: หัวห้องมีสิทธิ์แก้ไขงานของทุกคนได้โดยตรงโดยไม่ต้องส่งคำขอ
 */
export function isUserTeamOwner(
  currentUser: User | null | undefined,
  currentTeam: Team | null | undefined
): boolean {
  if (!currentUser) return false;
  if (currentTeam?.createdBy && currentTeam.createdBy === currentUser.id) return true;
  if ((currentUser as any).teamRole === 'owner' || (currentUser as any).role === 'owner') return true;
  return false;
}

/**
 * ตรวจสอบว่าผู้ใช้เป็นเจ้าของงานหลัก หรือมีชื่ออยู่ในรายชื่อผู้รับผิดชอบงาน (Assignee) หรือไม่
 */
export function isUserTaskOwner(
  currentUser: User | null | undefined,
  task: Task | null | undefined
): boolean {
  if (!currentUser || !task) return false;
  if (task.userId && task.userId === currentUser.id) return true;
  if (task.assigneeIds && task.assigneeIds.includes(currentUser.id)) return true;
  return false;
}

/**
 * ตรวจสอบว่าเป็นงานที่ยังไม่มีผู้รับผิดชอบ (Unassigned) หรือไม่
 * หากไม่มีผู้รับผิดชอบ สมาชิกคนใดก็สามารถหยิบงานไปทำหรือแก้ไขได้
 */
export function isTaskUnassigned(task: Task | null | undefined): boolean {
  if (!task) return true;
  const hasUser = Boolean(task.userId);
  const hasAssignees = Boolean(task.assigneeIds && task.assigneeIds.length > 0);
  return !hasUser && !hasAssignees;
}

/**
 * ตรวจสอบว่าผู้ใช้สามารถแก้ไขหรืออัปเดตงานนี้ได้โดยตรงหรือไม่
 * - ถ้าเป็น หัวห้อง (Team Owner) -> แก้ไขได้หมด
 * - ถ้าเป็น เจ้าของงาน / ผู้รับผิดชอบ (Task Owner / Assignee) -> แก้ไขได้
 * - ถ้าเป็น งานที่ไม่มีเจ้าของ (Unassigned) -> แก้ไขได้
 * - ถ้าเป็นงานของคนอื่น -> แก้ไขโดยตรงไม่ได้ ต้องส่งคำขอ (Edit Request)
 */
export function canUserEditTaskDirectly(
  currentUser: User | null | undefined,
  currentTeam: Team | null | undefined,
  task: Task | null | undefined
): boolean {
  if (!currentUser) return false;
  if (!task) return true;
  // หัวห้องแก้ไขได้หมดเลย
  if (isUserTeamOwner(currentUser, currentTeam)) return true;
  // เจ้าของงาน/ผู้รับผิดชอบ แก้ไขได้
  if (isUserTaskOwner(currentUser, task)) return true;
  // งานที่ไม่มีคนรับผิดชอบ ใครก็แก้ไขได้
  if (isTaskUnassigned(task)) return true;

  return false;
}

/**
 * ดึงรายชื่อ User IDs ของเจ้าของงานที่จะต้องส่งคำขอแก้ไขไปหา
 */
export function getTaskOwnerUserIds(task: Task): string[] {
  const list: string[] = [];
  if (task.userId && !list.includes(task.userId)) {
    list.push(task.userId);
  }
  if (task.assigneeIds) {
    task.assigneeIds.forEach(id => {
      if (id && !list.includes(id)) {
        list.push(id);
      }
    });
  }
  return list;
}
