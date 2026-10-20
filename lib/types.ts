export type Priority = 'high' | 'medium' | 'low';
export type EventType = 'holiday' | 'leave' | 'note';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type ThemeMode = 'light' | 'dark';

export type AvatarId =
  | 'dev_boy'
  | 'office_girl'
  | 'creative_guy'
  | 'active_girl'
  | 'bot_mascot'
  | 'manager_suit'
  | 'coffee_coder'
  | 'cyber_hacker'
  | 'cat_lover'
  | 'data_analyst'
  | 'music_producer'
  | 'gamer_streamer'
  | 'plant_doctor'
  | 'astro_explorer'
  | 'pixel_ninja';

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  avatarId: AvatarId;
  role?: string;          // ตำแหน่ง / ความเชี่ยวชาญ เช่น Frontend Developer
  department?: string;    // แผนก
  teamRole: 'owner' | 'member'; // ระดับในทีม: 'owner' (ผู้สร้างทีม) หรือ 'member' (สมาชิก)
  joinedAt: number;       // วันที่เข้าร่วมทีม (timestamp)
}

export interface Team {
  id: string;
  code: string;
  name: string;
  createdBy: string;
  createdAt: number;
  memberIds: string[];
  members?: TeamMember[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarId: AvatarId;
  role?: string;
  department?: string;
  teamId?: string;
  teamCode?: string;
  teamName?: string;
  teamIds?: string[];
  createdAt: number;
}

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: AvatarId;
  text: string;
  createdAt: number;
  reactions?: Record<string, string[]>; // emoji -> array of userIds
}

export interface TaskActivity {
  id: string;
  type: 'created' | 'status_change' | 'comment' | 'edit';
  userId: string;
  userName: string;
  userAvatar?: AvatarId;
  text: string;
  timestamp: number;
}

export interface TaskAssignee {
  id: string;
  name: string;
  avatarId?: AvatarId;
}

export interface Task {
  id: string;
  date: string;          // yyyy-mm-dd (วันเริ่มต้น)
  endDate?: string;      // yyyy-mm-dd (วันสิ้นสุด ถ้างานทำหลายวัน)
  title: string;
  detail: string;
  priority: Priority;
  time?: string;         // HH:mm ใช้สำหรับแจ้งเตือน
  status?: TaskStatus;   // สถานะ Kanban (todo / in_progress / done)
  subtasks?: SubTask[];  // รายการย่อย
  done: boolean;
  doneAt: number | null;
  hidden?: boolean;      // งานที่ถูกซ่อน/ลบ (ไม่นำมารวมใน Dashboard)
  createdAt: number;
  recurringId?: string;  // มาจากงานประจำ
  userId?: string;       // เจ้าของงานหลัก
  userName?: string;     // ชื่อผู้รับผิดชอบหลัก
  userAvatar?: AvatarId; // ไอคอนรูปประจำตัว
  assigneeIds?: string[]; // สมาชิกทุกคนที่รับผิดชอบงานนี้ (รองรับ 1 หรือ 2+ คน)
  assignees?: TaskAssignee[];
  tags?: string[];       // แท็กหมวดหมู่งาน เช่น ['Frontend', 'Bug', 'Meeting']
  comments?: TaskComment[]; // รายการคอมเมนต์/โน้ตสั้น
  activities?: TaskActivity[]; // ประวัติกิจกรรมและการเปลี่ยนแปลง
}

export interface RecurringRule {
  id: string;
  title: string;
  detail: string;
  priority: Priority;
  time?: string;
  weekdays: number[];    // 0=อาทิตย์ ... 6=เสาร์
  startDate: string;
  endDate?: string;
  skips: string[];       // วันที่ที่ข้าม
  userId?: string;
  userName?: string;
}

export interface PlannerEvent {
  id: string;
  date: string;
  type: EventType;
  title: string;
  userId?: string;       // ผู้ลา หรือเจ้าของโน้ต
  userName?: string;     // ชื่อผู้ลา
  userAvatar?: AvatarId; // รูปประจำตัวผู้ลา
}

export interface PlannerData {
  tasks: Task[];
  rules: RecurringRule[];
  events: PlannerEvent[];
  customTags?: string[];
  deletedTags?: string[];
}

export const PRIORITY: Record<Priority, { label: string; color: string; order: number }> = {
  high: { label: 'สูง', color: '#dc2626', order: 0 },
  medium: { label: 'กลาง', color: '#f59e0b', order: 1 },
  low: { label: 'ต่ำ', color: '#16a34a', order: 2 },
};
export const PRIORITIES: Priority[] = ['high', 'medium', 'low'];
export const TYPE_LABEL: Record<EventType, string> = { holiday: '🏖 วันหยุด', leave: '🌴 ลา', note: '📝 โน้ต' };
export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  todo: { label: 'รอทำ', color: '#64748b', bg: '#f1f5f9' },
  in_progress: { label: 'กำลังทำ', color: '#0284c7', bg: '#e0f2fe' },
  done: { label: 'เสร็จสิ้น', color: '#10b981', bg: '#ecfdf5' },
};

export interface TagConfig {
  name: string;
  color: string;
  bg: string;
  border: string;
}

export const PRESET_TAGS: TagConfig[] = [
  { name: 'Frontend', color: '#0071e3', bg: 'rgba(0, 113, 227, 0.1)', border: 'rgba(0, 113, 227, 0.25)' },
  { name: 'Backend', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.25)' },
  { name: 'Design', color: '#af52de', bg: 'rgba(175, 82, 222, 0.1)', border: 'rgba(175, 82, 222, 0.25)' },
  { name: 'Meeting', color: '#b25000', bg: 'rgba(255, 149, 0, 0.12)', border: 'rgba(255, 149, 0, 0.25)' },
  { name: 'Bug', color: '#d70015', bg: 'rgba(255, 59, 48, 0.12)', border: 'rgba(255, 59, 48, 0.25)' },
  { name: 'Urgent', color: '#e11d48', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.25)' },
  { name: 'Marketing', color: '#248a3d', bg: 'rgba(52, 199, 89, 0.12)', border: 'rgba(52, 199, 89, 0.25)' },
  { name: 'Docs', color: '#0f766e', bg: 'rgba(20, 184, 166, 0.12)', border: 'rgba(20, 184, 166, 0.25)' },
];

export function getTagStyle(tag: string): { color: string; bg: string; border: string } {
  const clean = tag.replace(/^#/, '').trim();
  const found = PRESET_TAGS.find(p => p.name.toLowerCase() === clean.toLowerCase());
  if (found) return { color: found.color, bg: found.bg, border: found.border };
  // Generate deterministic pastel color for custom tag
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return {
    color: `hsl(${hue}, 80%, 38%)`,
    bg: `hsl(${hue}, 80%, 94%)`,
    border: `hsl(${hue}, 80%, 80%)`,
  };
}