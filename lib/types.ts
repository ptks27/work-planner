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

export interface TaskLink {
  id: string;
  url: string;
  title?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;          // base64 data url
  size?: number;        // ขนาดไฟล์เป็น byte
  type?: string;        // mime type เช่น image/png, image/jpeg
  createdAt: number;
}

export type NotificationType =
  | 'mention'
  | 'assigned'
  | 'status_change'
  | 'edit_request'
  | 'edit_approved'
  | 'edit_rejected';

export interface AppNotification {
  id: string;
  type: NotificationType;
  taskId: string;
  taskTitle: string;
  targetUserId: string; // ผู้รับการแจ้งเตือน
  actorId: string;      // ผู้กระทำ
  actorName: string;
  actorAvatar?: AvatarId;
  text: string;
  createdAt: number;
  read: boolean;
  // สำหรับระบบขอสิทธิ์แก้ไขงานของคนอื่น
  proposedPatch?: Partial<Omit<Task, 'id'>>;
  requestStatus?: 'pending' | 'approved' | 'rejected';
  requestNote?: string;
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
  links?: TaskLink[];    // ลิงก์แนบงาน เช่น Figma, Google Drive, Docs, GitHub
  attachments?: TaskAttachment[]; // ไฟล์และภาพแคปเจอร์หน้าจอแนบ
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

export type StickyColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange';

export interface CanvasConnection {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  color?: string;
}

export interface CanvasNote {
  id: string;
  text: string;
  color: StickyColor;
  x: number;
  y: number;
  width?: number;
  height?: number;
  authorId?: string;
  authorName?: string;
  authorAvatar?: AvatarId;
  createdAt: number;
  convertedTaskId?: string; // ID ของงานที่ถูกแปลงไป
  stepNumber?: number;      // ลำดับขั้นตอนใน Data Flow เช่น 1, 2, 3
  flowRole?: 'input' | 'process' | 'output' | 'database'; // บทบาทใน Data Flow
}

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasStroke {
  id: string;
  points: CanvasPoint[];
  color: string;
  width: number;
  isHighlighter?: boolean;
  createdAt: number;
}

export type SectionType = 'horizontal_line' | 'vertical_line' | 'zone';

export interface CanvasSection {
  id: string;
  title: string;
  type: SectionType;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string; // hex หรือ theme accent เช่น '#0071e3', '#af52de', '#ff9500', '#10b981', '#64748b'
  style?: 'solid' | 'dashed';
  createdAt: number;
}

export interface CanvasBoard {
  id: string;
  title: string;
  notes: CanvasNote[];
  connections: CanvasConnection[];
  strokes?: CanvasStroke[];
  sections?: CanvasSection[];
  createdAt: number;
  updatedAt: number;
}

export interface MemberScorecard {
  memberId: string;
  memberName: string;
  avatarId?: AvatarId;
  role?: string;
  department?: string;
  periodLabel: string;
  totalAssigned: number;
  totalCompleted: number;
  completionRate: number;      // %
  onTimeCompleted: number;
  onTimeRate: number;          // %
  avgTurnaroundDays: number;   // วันเฉลี่ยในการปิดงาน
  highPriorityClosed: number;  // งานด่วนที่ปิดได้
  currentStreak: number;       // วันติดต่อกัน
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | '-';
  strengths: string[];
}

export interface PlannerData {
  tasks: Task[];
  rules: RecurringRule[];
  events: PlannerEvent[];
  customTags?: string[];
  deletedTags?: string[];
  notifications?: AppNotification[];
  canvasNotes?: CanvasNote[];
  canvasConnections?: CanvasConnection[];
  canvasBoards?: CanvasBoard[];
  canvasStrokes?: CanvasStroke[];
  canvasSections?: CanvasSection[];
  activeBoardId?: string;
}

export const PRIORITY: Record<Priority, { label: string; color: string; order: number }> = {
  high: { label: 'สูง', color: '#dc2626', order: 0 },
  medium: { label: 'กลาง', color: '#f59e0b', order: 1 },
  low: { label: 'ต่ำ', color: '#16a34a', order: 2 },
};
export const PRIORITIES: Priority[] = ['high', 'medium', 'low'];
export const TYPE_LABEL: Record<EventType, string> = { holiday: 'วันหยุด', leave: 'วันลา', note: 'โน้ต' };
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