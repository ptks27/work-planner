import type { PlannerData, Task } from './types';
import { sanitizeForPollution } from './security';

/**
 * Firestore hard limit is 1 MiB (1,048,576 bytes) per document.
 * uploadToFirebase enforces a 980,000-byte safety ceiling.
 */
export const CLOUD_DOC_LIMIT_BYTES = 980_000;
export const MAX_BACKUP_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB client file guard

export interface CloudStorageBreakdown {
  tasksBytes: number;
  attachmentsBytes: number;
  canvasBytes: number;
  otherBytes: number;
}

export interface CloudStorageStats {
  totalBytes: number;
  limitBytes: number;
  percent: number;
  status: 'ok' | 'warn' | 'danger';
  breakdown: CloudStorageBreakdown;
  counts: {
    tasks: number;
    doneTasks: number;
    attachments: number;
    doneTaskAttachments: number;
    doneTaskAttachmentBytes: number;
    events: number;
    rules: number;
    boards: number;
    notifications: number;
  };
}

export interface BackupEnvelope {
  app: 'work-planner';
  backupVersion: 1;
  exportedAt: string;
  meta?: {
    teamName?: string;
    userName?: string;
  };
  data: PlannerData;
}

export interface ParsedBackupResult {
  ok: true;
  data: PlannerData;
  exportedAt?: string;
  teamName?: string;
  summary: {
    tasks: number;
    doneTasks: number;
    events: number;
    rules: number;
    boards: number;
    attachments: number;
    bytes: number;
    exceedsCloudLimit: boolean;
  };
}

export interface ParsedBackupError {
  ok: false;
  error: string;
}

function byteLength(obj: unknown): number {
  const str = JSON.stringify(obj ?? null);
  if (!str) return 0;
  return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(str).length : str.length;
}

export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function extractPlannerSnapshot(data: Partial<PlannerData>): PlannerData {
  return {
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    rules: Array.isArray(data.rules) ? data.rules : [],
    events: Array.isArray(data.events) ? data.events : [],
    customTags: Array.isArray(data.customTags) ? data.customTags : [],
    deletedTags: Array.isArray(data.deletedTags) ? data.deletedTags : [],
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    canvasNotes: Array.isArray(data.canvasNotes) ? data.canvasNotes : [],
    canvasConnections: Array.isArray(data.canvasConnections) ? data.canvasConnections : [],
    canvasBoards: Array.isArray(data.canvasBoards) ? data.canvasBoards : [],
    canvasStrokes: Array.isArray(data.canvasStrokes) ? data.canvasStrokes : [],
    canvasSections: Array.isArray(data.canvasSections) ? data.canvasSections : [],
    activeBoardId: typeof data.activeBoardId === 'string' && data.activeBoardId ? data.activeBoardId : 'default-board',
  };
}

/**
 * Measure exact JSON payload size matching uploadToFirebase() in lib/firebase.ts
 */
export function measureCloudStorage(data: Partial<PlannerData>): CloudStorageStats {
  const snapshot = extractPlannerSnapshot(data);
  const fullPayload = {
    ...snapshot,
    updatedAt: Date.now(),
  };

  const totalBytes = byteLength(fullPayload);

  let attachmentsCount = 0;
  let attachmentsBytes = 0;
  let doneTaskAttachments = 0;
  let doneTaskAttachmentBytes = 0;
  let doneTasks = 0;

  const tasksWithoutAttachments = snapshot.tasks.map(t => {
    if (t.done) doneTasks++;
    if (Array.isArray(t.attachments) && t.attachments.length > 0) {
      const attSize = byteLength(t.attachments);
      attachmentsCount += t.attachments.length;
      attachmentsBytes += attSize;
      if (t.done) {
        doneTaskAttachments += t.attachments.length;
        doneTaskAttachmentBytes += attSize;
      }
      const { attachments: _omit, ...rest } = t;
      return rest;
    }
    return t;
  });

  const tasksBytes = byteLength({ tasks: tasksWithoutAttachments, rules: snapshot.rules });
  const canvasBytes = byteLength({
    canvasNotes: snapshot.canvasNotes,
    canvasConnections: snapshot.canvasConnections,
    canvasBoards: snapshot.canvasBoards,
    canvasStrokes: snapshot.canvasStrokes,
    canvasSections: snapshot.canvasSections,
    activeBoardId: snapshot.activeBoardId,
  });
  const otherBytes = Math.max(0, totalBytes - tasksBytes - attachmentsBytes - canvasBytes);

  const percent = Math.min(100, Math.round((totalBytes / CLOUD_DOC_LIMIT_BYTES) * 1000) / 10);
  const status: CloudStorageStats['status'] =
    percent >= 85 ? 'danger' : percent >= 70 ? 'warn' : 'ok';

  return {
    totalBytes,
    limitBytes: CLOUD_DOC_LIMIT_BYTES,
    percent,
    status,
    breakdown: {
      tasksBytes,
      attachmentsBytes,
      canvasBytes,
      otherBytes,
    },
    counts: {
      tasks: snapshot.tasks.length,
      doneTasks,
      attachments: attachmentsCount,
      doneTaskAttachments,
      doneTaskAttachmentBytes,
      events: snapshot.events.length,
      rules: snapshot.rules.length,
      boards: snapshot.canvasBoards?.length || 0,
      notifications: snapshot.notifications?.length || 0,
    },
  };
}

export function downloadBackupJson(
  data: Partial<PlannerData>,
  meta?: { teamName?: string; userName?: string }
): { filename: string; bytes: number } {
  const snapshot = extractPlannerSnapshot(data);
  const envelope: BackupEnvelope = {
    app: 'work-planner',
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    ...(meta ? { meta } : {}),
    data: snapshot,
  };

  const json = JSON.stringify(envelope, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const filename = `work-planner-backup-${y}-${m}-${d}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { filename, bytes: blob.size };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

export function parseBackupJson(rawText: string): ParsedBackupResult | ParsedBackupError {
  if (!rawText || !rawText.trim()) {
    return { ok: false, error: 'ไฟล์ว่างเปล่า ไม่พบข้อมูล JSON' };
  }

  let parsedRaw: unknown;
  try {
    parsedRaw = sanitizeForPollution(JSON.parse(rawText));
  } catch {
    return { ok: false, error: 'รูปแบบไฟล์ JSON ไม่ถูกต้อง (ไม่สามารถอ่านไฟล์ได้)' };
  }

  if (!isRecord(parsedRaw)) {
    return { ok: false, error: 'โครงสร้างไฟล์ Backup ไม่ถูกต้อง' };
  }

  const isEnvelope = isRecord(parsedRaw.data);
  const payload = (isEnvelope ? parsedRaw.data : parsedRaw) as Record<string, unknown>;

  const hasKnownArray =
    Array.isArray(payload.tasks) ||
    Array.isArray(payload.events) ||
    Array.isArray(payload.rules) ||
    Array.isArray(payload.canvasBoards) ||
    Array.isArray(payload.canvasNotes);

  if (!hasKnownArray) {
    return {
      ok: false,
      error: 'ไม่พบข้อมูลของ Work Planner ในไฟล์นี้ (ต้องมีรายการงาน วันหยุด หรือกระดานไอเดีย)',
    };
  }

  const validTasks: Task[] = Array.isArray(payload.tasks)
    ? payload.tasks
        .filter((t): t is Task => isRecord(t) && typeof t.title === 'string' && typeof t.date === 'string')
        .map(t => ({
          ...t,
          id: typeof t.id === 'string' && t.id ? t.id : `restored-${Math.random().toString(36).slice(2, 10)}`,
          detail: typeof t.detail === 'string' ? t.detail : '',
          priority: t.priority === 'high' || t.priority === 'medium' || t.priority === 'low' ? t.priority : 'medium',
          done: Boolean(t.done),
          doneAt: typeof t.doneAt === 'number' ? t.doneAt : null,
          createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
        }))
    : [];

  const cleanData = extractPlannerSnapshot({
    ...payload,
    tasks: validTasks,
  } as Partial<PlannerData>);

  const stats = measureCloudStorage(cleanData);
  const exportedAt = isEnvelope && typeof parsedRaw.exportedAt === 'string' ? parsedRaw.exportedAt : undefined;
  const meta = isEnvelope && isRecord(parsedRaw.meta) ? parsedRaw.meta : undefined;
  const teamName = meta && typeof meta.teamName === 'string' ? meta.teamName : undefined;

  return {
    ok: true,
    data: cleanData,
    exportedAt,
    teamName,
    summary: {
      tasks: stats.counts.tasks,
      doneTasks: stats.counts.doneTasks,
      events: stats.counts.events,
      rules: stats.counts.rules,
      boards: stats.counts.boards,
      attachments: stats.counts.attachments,
      bytes: stats.totalBytes,
      exceedsCloudLimit: stats.totalBytes > CLOUD_DOC_LIMIT_BYTES,
    },
  };
}

function mergeById<T extends { id: string }>(existing: T[] = [], incoming: T[] = []): T[] {
  const seen = new Set(existing.map(item => item.id));
  const merged = [...existing];
  for (const item of incoming) {
    if (item && typeof item.id === 'string' && !seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

export function mergePlannerData(current: Partial<PlannerData>, incoming: PlannerData): PlannerData {
  const cur = extractPlannerSnapshot(current);
  const inc = extractPlannerSnapshot(incoming);

  return {
    tasks: mergeById(cur.tasks, inc.tasks),
    rules: mergeById(cur.rules, inc.rules),
    events: mergeById(cur.events, inc.events),
    customTags: Array.from(new Set([...(cur.customTags || []), ...(inc.customTags || [])])),
    deletedTags: Array.from(new Set([...(cur.deletedTags || []), ...(inc.deletedTags || [])])),
    notifications: mergeById(cur.notifications || [], inc.notifications || []).slice(0, 100),
    canvasNotes: mergeById(cur.canvasNotes || [], inc.canvasNotes || []),
    canvasConnections: mergeById(cur.canvasConnections || [], inc.canvasConnections || []),
    canvasBoards: mergeById(cur.canvasBoards || [], inc.canvasBoards || []),
    canvasStrokes: mergeById(cur.canvasStrokes || [], inc.canvasStrokes || []),
    canvasSections: mergeById(cur.canvasSections || [], inc.canvasSections || []),
    activeBoardId: cur.activeBoardId || inc.activeBoardId || 'default-board',
  };
}
