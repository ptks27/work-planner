import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Task,
  RecurringRule,
  PlannerEvent,
  PlannerData,
  Priority,
  TaskStatus,
  SubTask,
  ThemeMode,
  AvatarId,
  TaskComment,
  TaskActivity,
  TaskAssignee,
  TaskAttachment,
  AppNotification,
} from './types';
import { uid } from './utils';
import { DEFAULT_FIREBASE_CONFIG } from './firebaseDefaultConfig';

export type NewTask = {
  date: string;
  endDate?: string;
  title: string;
  detail: string;
  priority: Priority;
  time?: string;
  done?: boolean;
  status?: TaskStatus;
  subtasks?: SubTask[];
  userId?: string;
  userName?: string;
  userAvatar?: AvatarId;
  assigneeIds?: string[];
  assignees?: TaskAssignee[];
  tags?: string[];
  comments?: TaskComment[];
  activities?: TaskActivity[];
};

interface PlannerState extends PlannerData {
  notified: string[];
  remindBefore: number;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  soundEnabled: boolean;
  setSoundEnabled: (on: boolean) => void;
  firebaseConfig: string;
  setFirebaseConfig: (cfg: string) => void;
  addTasks: (list: NewTask[]) => void;
  toggleTask: (id: string, actor?: { id: string; name: string; avatarId?: AvatarId }) => void;
  updateTaskStatus: (id: string, status: TaskStatus, actor?: { id: string; name: string; avatarId?: AvatarId }) => void;
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>, actor?: { id: string; name: string; avatarId?: AvatarId }) => void;
  addTaskComment: (taskId: string, comment: Omit<TaskComment, 'id' | 'createdAt'>) => void;
  toggleCommentReaction: (taskId: string, commentId: string, emoji: string, userId: string) => void;
  addTaskActivity: (taskId: string, activity: Omit<TaskActivity, 'id' | 'timestamp'>) => void;
  deleteTask: (id: string) => void;
  hideDone: (ids: string[]) => void;
  rolloverTasks: (fromDate: string, toDate: string) => number;
  rolloverAllOverdue: (toDate: string) => number;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  addTaskLink: (taskId: string, link: { url: string; title?: string }) => void;
  deleteTaskLink: (taskId: string, linkId: string) => void;
  addTaskAttachment: (taskId: string, attachment: Omit<TaskAttachment, 'id' | 'createdAt'>) => void;
  deleteTaskAttachment: (taskId: string, attachmentId: string) => void;
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId?: string) => void;
  clearNotifications: (userId?: string) => void;
  addRule: (r: Omit<RecurringRule, 'id' | 'skips'>) => void;
  deleteRule: (id: string) => void;
  addEvents: (list: Omit<PlannerEvent, 'id'>[]) => void;
  deleteEvent: (id: string) => void;
  markNotified: (key: string) => void;
  setRemindBefore: (n: number) => void;
  updateUserProfile: (userId: string, patch: { name?: string; avatarId?: AvatarId }) => void;
  customTags: string[];
  deletedTags: string[];
  addCustomTag: (tag: string) => void;
  deleteCustomTag: (tag: string) => void;
  resetDefaultTags: () => void;
  restore: (d: Partial<PlannerData>) => void;
}

// งานประจำที่ยังไม่ถูกแตะ จะมี id แบบ "r:<ruleId>:<date>"
const parseVirtual = (id: string) => { const [, ruleId, date] = id.split(':'); return { ruleId, date }; };

export const usePlanner = create<PlannerState>()(
  persist(
    (set, get) => ({
      tasks: [], rules: [], events: [], customTags: [], deletedTags: [], notifications: [], notified: [], remindBefore: 10,
      theme: 'light',
      setTheme: theme => set({ theme }),
      soundEnabled: true,
      setSoundEnabled: soundEnabled => set({ soundEnabled }),
      firebaseConfig: (typeof window !== 'undefined' && localStorage.getItem('firebase_config')) || DEFAULT_FIREBASE_CONFIG,
      setFirebaseConfig: firebaseConfig => {
        if (typeof window !== 'undefined') {
          if (firebaseConfig) {
            localStorage.setItem('firebase_config', firebaseConfig);
          } else {
            localStorage.removeItem('firebase_config');
          }
        }
        set({ firebaseConfig: firebaseConfig || DEFAULT_FIREBASE_CONFIG });
      },

      addTasks: list => set(s => ({
        tasks: [...s.tasks, ...list.map(t => {
          const id = uid();
          const initialActivity: TaskActivity = {
            id: uid(),
            type: 'created',
            userId: t.userId || 'system',
            userName: t.userName || 'สมาชิก',
            userAvatar: t.userAvatar,
            text: 'สร้างงานนี้',
            timestamp: Date.now(),
          };
          const assigneeIds = t.assigneeIds && t.assigneeIds.length ? t.assigneeIds : (t.userId ? [t.userId] : []);
          return {
            ...t,
            id,
            endDate: t.endDate && t.endDate > t.date ? t.endDate : undefined,
            status: t.status ?? (t.done ? 'done' : 'todo'),
            subtasks: t.subtasks ?? [],
            done: !!t.done,
            doneAt: t.done ? Date.now() : null,
            hidden: false,
            createdAt: Date.now(),
            userId: t.userId || assigneeIds[0],
            userName: t.userName,
            userAvatar: t.userAvatar,
            assigneeIds,
            assignees: t.assignees,
            tags: t.tags ?? [],
            comments: t.comments ?? [],
            activities: t.activities?.length ? t.activities : [initialActivity],
          };
        })],
      })),

      toggleTask: (id, actor) => set(s => {
        if (id.startsWith('r:')) { // งานประจำ: สร้างเป็นงานจริงเมื่อกดเสร็จ
          const { ruleId, date } = parseVirtual(id);
          const r = s.rules.find(x => x.id === ruleId);
          if (!r) return {};
          const t: Task = {
            id: uid(), date, title: r.title, detail: r.detail, priority: r.priority, time: r.time,
            status: 'done', subtasks: [],
            done: true, doneAt: Date.now(), hidden: false, createdAt: Date.now(), recurringId: r.id,
            assigneeIds: r.userId ? [r.userId] : [], tags: [], comments: [],
            activities: [{
              id: uid(),
              type: 'status_change',
              userId: actor?.id || 'system',
              userName: actor?.name || 'สมาชิก',
              userAvatar: actor?.avatarId,
              text: 'ทำเครื่องหมายว่าเสร็จสิ้น',
              timestamp: Date.now(),
            }],
          };
          return { tasks: [...s.tasks, t] };
        }
        return {
          tasks: s.tasks.map(t => {
            if (t.id !== id) return t;
            const nextDone = !t.done;
            const act: TaskActivity | undefined = actor ? {
              id: uid(),
              type: 'status_change',
              userId: actor.id,
              userName: actor.name,
              userAvatar: actor.avatarId,
              text: nextDone ? 'ทำเครื่องหมายว่าเสร็จสิ้น' : 'ยกเลิกสถานะเสร็จ (กลับมาทำต่อ)',
              timestamp: Date.now(),
            } : undefined;
            return {
              ...t,
              done: nextDone,
              status: nextDone ? 'done' : 'todo',
              doneAt: nextDone ? Date.now() : null,
              activities: act ? [act, ...(t.activities || [])] : t.activities,
            };
          }),
        };
      }),

      updateTaskStatus: (id, status, actor) => set(s => {
        const statusLabel = status === 'done' ? 'เสร็จสิ้น' : status === 'in_progress' ? 'กำลังทำ' : 'รอทำ';
        if (id.startsWith('r:')) {
          const { ruleId, date } = parseVirtual(id);
          const r = s.rules.find(x => x.id === ruleId);
          if (!r) return {};
          const isDone = status === 'done';
          const t: Task = {
            id: uid(), date, title: r.title, detail: r.detail, priority: r.priority, time: r.time,
            status, subtasks: [],
            done: isDone, doneAt: isDone ? Date.now() : null, hidden: false, createdAt: Date.now(), recurringId: r.id,
            assigneeIds: r.userId ? [r.userId] : [], tags: [], comments: [],
            activities: [{
              id: uid(),
              type: 'status_change',
              userId: actor?.id || 'system',
              userName: actor?.name || 'สมาชิก',
              userAvatar: actor?.avatarId,
              text: `เปลี่ยนสถานะเป็น "${statusLabel}"`,
              timestamp: Date.now(),
            }],
          };
          return { tasks: [...s.tasks, t] };
        }
        return {
          tasks: s.tasks.map(t => {
            if (t.id !== id) return t;
            const isDone = status === 'done';
            const act: TaskActivity | undefined = actor && t.status !== status ? {
              id: uid(),
              type: 'status_change',
              userId: actor.id,
              userName: actor.name,
              userAvatar: actor.avatarId,
              text: `เปลี่ยนสถานะเป็น "${statusLabel}"`,
              timestamp: Date.now(),
            } : undefined;
            return {
              ...t,
              status,
              done: isDone,
              doneAt: isDone ? (t.doneAt ?? Date.now()) : null,
              activities: act ? [act, ...(t.activities || [])] : t.activities,
            };
          }),
        };
      }),

      rolloverTasks: (fromDate, toDate) => {
        let count = 0;
        set(s => {
          const unDone = s.tasks.filter(
            t => (t.endDate ? t.endDate === fromDate : t.date === fromDate) && !t.done && !t.hidden
          );
          count = unDone.length;
          if (!count) return {};
          return {
            tasks: s.tasks.map(t => {
              if (!t.done && !t.hidden) {
                if (t.endDate && t.endDate === fromDate) {
                  return { ...t, endDate: toDate };
                }
                if (!t.endDate && t.date === fromDate) {
                  return { ...t, date: toDate };
                }
              }
              return t;
            }),
          };
        });
        return count;
      },

      rolloverAllOverdue: toDate => {
        let count = 0;
        set(s => {
          const isOverdue = (t: Task) => (t.endDate ? t.endDate < toDate : t.date < toDate) && !t.done && !t.hidden;
          const overdueList = s.tasks.filter(isOverdue);
          count = overdueList.length;
          if (!count) return {};
          return {
            tasks: s.tasks.map(t => {
              if (isOverdue(t)) {
                return { ...t, date: toDate, endDate: undefined };
              }
              return t;
            }),
          };
        });
        return count;
      },

      toggleSubtask: (taskId, subtaskId) => set(s => ({
        tasks: s.tasks.map(t => {
          if (t.id !== taskId || !t.subtasks) return t;
          return {
            ...t,
            subtasks: t.subtasks.map(st => st.id === subtaskId ? { ...st, done: !st.done } : st),
          };
        }),
      })),

      addSubtask: (taskId, title) => set(s => ({
        tasks: s.tasks.map(t => {
          if (t.id !== taskId) return t;
          const newSub: SubTask = { id: uid(), title: title.trim(), done: false };
          return {
            ...t,
            subtasks: [...(t.subtasks || []), newSub],
          };
        }),
      })),

      deleteSubtask: (taskId, subtaskId) => set(s => ({
        tasks: s.tasks.map(t => {
          if (t.id !== taskId || !t.subtasks) return t;
          return {
            ...t,
            subtasks: t.subtasks.filter(st => st.id !== subtaskId),
          };
        }),
      })),

      addTaskLink: (taskId, link) => set(s => ({
        tasks: s.tasks.map(t => {
          if (t.id !== taskId) return t;
          const newLink = { id: uid(), url: link.url.trim(), title: link.title?.trim() };
          return {
            ...t,
            links: [...(t.links || []), newLink],
          };
        }),
      })),

      deleteTaskLink: (taskId, linkId) => set(s => ({
        tasks: s.tasks.map(t => {
          if (t.id !== taskId || !t.links) return t;
          return {
            ...t,
            links: t.links.filter(l => l.id !== linkId),
          };
        }),
      })),

      addTaskAttachment: (taskId, attachment) => set(s => ({
        tasks: s.tasks.map(t => {
          if (t.id !== taskId) return t;
          const newAtt: TaskAttachment = {
            ...attachment,
            id: uid(),
            createdAt: Date.now(),
          };
          return {
            ...t,
            attachments: [...(t.attachments || []), newAtt],
          };
        }),
      })),

      deleteTaskAttachment: (taskId, attachmentId) => set(s => ({
        tasks: s.tasks.map(t => {
          if (t.id !== taskId || !t.attachments) return t;
          return {
            ...t,
            attachments: t.attachments.filter(a => a.id !== attachmentId),
          };
        }),
      })),

      addNotification: n => set(s => {
        const newNotif: AppNotification = {
          ...n,
          id: uid(),
          createdAt: Date.now(),
          read: false,
        };
        return {
          notifications: [newNotif, ...(s.notifications || [])].slice(0, 100),
        };
      }),

      markNotificationRead: id => set(s => ({
        notifications: (s.notifications || []).map(n => n.id === id ? { ...n, read: true } : n),
      })),

      markAllNotificationsRead: targetUserId => set(s => ({
        notifications: (s.notifications || []).map(n => {
          if (!targetUserId || n.targetUserId === targetUserId) {
            return { ...n, read: true };
          }
          return n;
        }),
      })),

      clearNotifications: targetUserId => set(s => ({
        notifications: targetUserId
          ? (s.notifications || []).filter(n => n.targetUserId !== targetUserId)
          : [],
      })),

      updateTask: (id, patch, actor) => set(s => {
        if (id.startsWith('r:')) {
          const { ruleId, date } = parseVirtual(id);
          const r = s.rules.find(x => x.id === ruleId);
          if (!r) return {};
          const isDone = patch.done ?? (patch.status ? patch.status === 'done' : false);
          const t: Task = {
            id: uid(),
            date: patch.date ?? date,
            endDate: patch.endDate,
            title: patch.title ?? r.title,
            detail: patch.detail ?? r.detail,
            priority: patch.priority ?? r.priority,
            time: patch.time !== undefined ? patch.time : r.time,
            status: patch.status ?? (isDone ? 'done' : 'todo'),
            subtasks: patch.subtasks ?? [],
            done: isDone,
            doneAt: isDone ? Date.now() : null,
            hidden: false,
            createdAt: Date.now(),
            recurringId: r.id,
            assigneeIds: patch.assigneeIds ?? (r.userId ? [r.userId] : []),
            assignees: patch.assignees,
            tags: patch.tags ?? [],
            comments: patch.comments ?? [],
            activities: [{
              id: uid(),
              type: 'edit',
              userId: actor?.id || 'system',
              userName: actor?.name || 'สมาชิก',
              userAvatar: actor?.avatarId,
              text: 'แก้ไขข้อมูลงาน',
              timestamp: Date.now(),
            }],
          };
          const skipRule = s.rules.map(rule =>
            rule.id === ruleId && !rule.skips.includes(date)
              ? { ...rule, skips: [...rule.skips, date] }
              : rule
          );
          return {
            tasks: [...s.tasks, t],
            rules: skipRule,
            notified: s.notified.filter(k => k !== id),
          };
        }

        const t = s.tasks.find(x => x.id === id);
        if (!t) return {};

        let rules = s.rules;
        if (t.recurringId && patch.date && patch.date !== t.date) {
          rules = rules.map(r =>
            r.id === t.recurringId && !r.skips.includes(t.date)
              ? { ...r, skips: [...r.skips, t.date] }
              : r
          );
        }

        const nextStatus = patch.status ?? (patch.done !== undefined ? (patch.done ? 'done' : 'todo') : t.status);
        const nextDone = patch.done !== undefined ? patch.done : (patch.status ? patch.status === 'done' : t.done);

        let editActivity: TaskActivity | undefined;
        if (actor) {
          if (t.status !== nextStatus) {
            const statusLabel = nextStatus === 'done' ? 'เสร็จสิ้น' : nextStatus === 'in_progress' ? 'กำลังทำ' : 'รอทำ';
            editActivity = {
              id: uid(),
              type: 'status_change',
              userId: actor.id,
              userName: actor.name,
              userAvatar: actor.avatarId,
              text: `เปลี่ยนสถานะเป็น "${statusLabel}"`,
              timestamp: Date.now(),
            };
          } else {
            editActivity = {
              id: uid(),
              type: 'edit',
              userId: actor.id,
              userName: actor.name,
              userAvatar: actor.avatarId,
              text: 'อัปเดตข้อมูลงาน',
              timestamp: Date.now(),
            };
          }
        }

        return {
          tasks: s.tasks.map(x => x.id === id ? {
            ...x,
            ...patch,
            status: nextStatus,
            done: nextDone,
            doneAt: nextDone ? (x.doneAt ?? Date.now()) : null,
            activities: editActivity ? [editActivity, ...(x.activities || [])] : x.activities,
          } : x),
          rules,
          notified: s.notified.filter(k => k !== id),
        };
      }),

      addTaskComment: (taskId, comment) => set(s => {
        const newComment: TaskComment = {
          ...comment,
          id: uid(),
          createdAt: Date.now(),
        };
        const newActivity: TaskActivity = {
          id: uid(),
          type: 'comment',
          userId: comment.userId,
          userName: comment.userName,
          userAvatar: comment.userAvatar,
          text: `ส่งข้อความ: "${comment.text.length > 28 ? comment.text.slice(0, 28) + '...' : comment.text}"`,
          timestamp: Date.now(),
        };
        return {
          tasks: s.tasks.map(t => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              comments: [...(t.comments || []), newComment],
              activities: [newActivity, ...(t.activities || [])],
            };
          }),
        };
      }),

      toggleCommentReaction: (taskId, commentId, emoji, userId) => set(s => {
        return {
          tasks: s.tasks.map(t => {
            if (t.id !== taskId) return t;
            const updatedComments = (t.comments || []).map(c => {
              if (c.id !== commentId) return c;
              const currentReactions = { ...(c.reactions || {}) };
              const currentUsers = currentReactions[emoji] || [];
              if (currentUsers.includes(userId)) {
                const remaining = currentUsers.filter(id => id !== userId);
                if (remaining.length === 0) {
                  delete currentReactions[emoji];
                } else {
                  currentReactions[emoji] = remaining;
                }
              } else {
                currentReactions[emoji] = [...currentUsers, userId];
              }
              return {
                ...c,
                reactions: currentReactions,
              };
            });
            return {
              ...t,
              comments: updatedComments,
            };
          }),
        };
      }),

      addTaskActivity: (taskId, activity) => set(s => {
        const newAct: TaskActivity = {
          ...activity,
          id: uid(),
          timestamp: Date.now(),
        };
        return {
          tasks: s.tasks.map(t => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              activities: [newAct, ...(t.activities || [])],
            };
          }),
        };
      }),

      deleteTask: id => set(s => {
        const skip = (ruleId: string, date: string) =>
          s.rules.map(r => r.id === ruleId && !r.skips.includes(date) ? { ...r, skips: [...r.skips, date] } : r);
        if (id.startsWith('r:')) { const { ruleId, date } = parseVirtual(id); return { rules: skip(ruleId, date) }; }
        const t = s.tasks.find(x => x.id === id);
        if (!t) return {};
        return {
          tasks: s.tasks.filter(x => x.id !== id),
          rules: t.recurringId ? skip(t.recurringId, t.date) : s.rules,
        };
      }),

      hideDone: ids => set(s => {
        const toDelete = s.tasks.filter(t => ids.includes(t.id) && t.done);
        let rules = s.rules;
        toDelete.forEach(t => {
          if (t.recurringId) {
            rules = rules.map(r => r.id === t.recurringId && !r.skips.includes(t.date)
              ? { ...r, skips: [...r.skips, t.date] }
              : r);
          }
        });
        return {
          tasks: s.tasks.filter(t => !ids.includes(t.id)),
          rules,
        };
      }),

      addRule: r => set(s => ({ rules: [...s.rules, { ...r, id: uid(), skips: [] }] })),
      deleteRule: id => set(s => ({ rules: s.rules.filter(r => r.id !== id) })),

      addEvents: list => set(s => ({ events: [...s.events, ...list.map(e => ({ ...e, id: uid() }))] })),
      deleteEvent: id => set(s => ({ events: s.events.filter(e => e.id !== id) })),

      markNotified: key => set(s => ({ notified: [...s.notified.slice(-300), key] })),
      setRemindBefore: n => set({ remindBefore: n }),

      updateUserProfile: (userId, patch) => set(s => ({
        tasks: s.tasks.map(t => (t.userId === userId ? {
          ...t,
          userName: patch.name !== undefined ? patch.name : t.userName,
          userAvatar: patch.avatarId !== undefined ? patch.avatarId : t.userAvatar,
        } : t)),
        events: s.events.map(e => (e.userId === userId ? {
          ...e,
          userName: patch.name !== undefined ? patch.name : e.userName,
          userAvatar: patch.avatarId !== undefined ? patch.avatarId : e.userAvatar,
        } : e)),
      })),

      addCustomTag: tag => {
        const clean = tag.replace(/^#/, '').trim();
        if (!clean) return;
        const lower = clean.toLowerCase();
        set(s => {
          const customList = s.customTags || [];
          const exists = customList.some(t => t.toLowerCase() === lower);
          const nextCustom = exists ? customList : [...customList, clean];
          const nextDeleted = (s.deletedTags || []).filter(t => t.toLowerCase() !== lower);
          return { customTags: nextCustom, deletedTags: nextDeleted };
        });
        triggerCloudSync();
      },

      deleteCustomTag: tag => {
        const clean = tag.replace(/^#/, '').trim();
        if (!clean) return;
        const lower = clean.toLowerCase();
        set(s => ({
          customTags: (s.customTags || []).filter(t => t.toLowerCase() !== lower),
          deletedTags: Array.from(new Set([...(s.deletedTags || []), lower])),
          tasks: s.tasks.map(task => {
            if (!task.tags || !task.tags.some(t => t.toLowerCase() === lower)) return task;
            return {
              ...task,
              tags: task.tags.filter(t => t.toLowerCase() !== lower),
            };
          }),
        }));
        triggerCloudSync();
      },

      resetDefaultTags: () => {
        set({ deletedTags: [], customTags: [] });
        triggerCloudSync();
      },

      restore: d => set(s => ({
        tasks: (d.tasks ?? s.tasks).map(t => ({ ...t, priority: t.priority ?? 'medium' })), // รองรับ backup จากเวอร์ชัน HTML
        rules: d.rules ?? s.rules,
        events: d.events ?? s.events,
        customTags: d.customTags !== undefined ? d.customTags : (s.customTags || []),
        deletedTags: d.deletedTags !== undefined ? d.deletedTags : (s.deletedTags || []),
        notifications: d.notifications !== undefined ? d.notifications : (s.notifications || []),
      })),
    }),
    {
      name: 'work-planner',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.firebaseConfig) {
            state.firebaseConfig = (typeof window !== 'undefined' && localStorage.getItem('firebase_config')) || DEFAULT_FIREBASE_CONFIG;
          }
          // ล้าง mockup tasks และ mockup events เก่าออกทั้งหมด
          const mockUserIds = ['user-mint', 'user-top', 'user-joy', 'user-somchai'];
          state.tasks = (state.tasks || []).filter(t => !mockUserIds.includes(t.userId || ''));
          state.events = (state.events || []).filter(e => !mockUserIds.includes(e.userId || ''));
        }
      },
    },
  ),
);

// ป้องกัน loop เวลารับข้อมูลจาก Cloud ลงมา
let isSyncingFromCloud = false;
export const setSyncingFromCloud = (val: boolean) => {
  isSyncingFromCloud = val;
};

// ฟังก์ชันซิงค์ข้อมูลขึ้น Firebase Cloud
export const syncPlannerToFirebase = async () => {
  if (isSyncingFromCloud) return;
  const state = usePlanner.getState();
  const cfg = state.firebaseConfig || DEFAULT_FIREBASE_CONFIG;
  if (!cfg) return;

  try {
    const { uploadToFirebase } = await import('./firebase');
    const { useAuth } = await import('./authStore');
    const user = useAuth.getState().currentUser;
    const res = await uploadToFirebase(
      {
        tasks: state.tasks,
        rules: state.rules,
        events: state.events,
        customTags: state.customTags || [],
        deletedTags: state.deletedTags || [],
        notifications: state.notifications || [],
      },
      cfg,
      user?.teamId
    );
    if (res.success) {
      console.log('☁️ Auto-synced to Firebase successfully:', state.tasks.length, 'tasks');
    } else {
      console.warn('⚠️ Cloud sync warning:', res.error);
    }
  } catch (err) {
    console.error('Auto cloud sync error:', err);
  }
};

let cloudSyncTimer: any = null;
export const triggerCloudSync = () => {
  if (typeof window === 'undefined') return;
  if (isSyncingFromCloud) return;
  if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
  // ซิงค์ทันทีอย่างรวดเร็ว (100ms debounce) เพื่อให้มั่นใจว่าก่อน F5 ข้อมูลขึ้น Cloud เรียบร้อย
  cloudSyncTimer = setTimeout(() => {
    syncPlannerToFirebase();
  }, 100);
};

// ติดตามการเปลี่ยนแปลงของ tasks, events, rules, customTags, deletedTags เพื่อซิงค์ขึ้น Cloud อัตโนมัติ
let previousTasks = usePlanner.getState().tasks;
let previousEvents = usePlanner.getState().events;
let previousRules = usePlanner.getState().rules;
let previousCustomTags = usePlanner.getState().customTags;
let previousDeletedTags = usePlanner.getState().deletedTags;
let previousNotifications = usePlanner.getState().notifications;

if (typeof window !== 'undefined') {
  usePlanner.subscribe(state => {
    if (isSyncingFromCloud) return;
    const cfg = state.firebaseConfig || DEFAULT_FIREBASE_CONFIG;
    if (!cfg) return;

    if (
      state.tasks !== previousTasks ||
      state.events !== previousEvents ||
      state.rules !== previousRules ||
      state.customTags !== previousCustomTags ||
      state.deletedTags !== previousDeletedTags ||
      state.notifications !== previousNotifications
    ) {
      previousTasks = state.tasks;
      previousEvents = state.events;
      previousRules = state.rules;
      previousCustomTags = state.customTags;
      previousDeletedTags = state.deletedTags;
      previousNotifications = state.notifications;
      triggerCloudSync();
    }
  });

  // บันทึกทันทีก่อนที่หน้าต่างจะถูกปิดหรือกดรีเฟรช F5
  window.addEventListener('beforeunload', () => {
    const state = usePlanner.getState();
    const cfg = state.firebaseConfig || DEFAULT_FIREBASE_CONFIG;
    if (cfg && !isSyncingFromCloud) {
      syncPlannerToFirebase();
    }
  });
}