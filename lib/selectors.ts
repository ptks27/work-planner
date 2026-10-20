import { PRIORITY, type PlannerData, type Task } from './types';
import { parse, eachDay } from './utils';

export function isTaskOnDate(t: Task, date: string): boolean {
  if (!t.endDate || t.endDate === t.date) {
    return t.date === date;
  }
  return date >= t.date && date <= t.endDate;
}

/** งานของวันนั้น = งานจริง + งานประจำที่ตรงวัน */
export function tasksOn(d: PlannerData, date: string): Task[] {
  const real = d.tasks.filter(t => isTaskOnDate(t, date));
  const wd = parse(date).getDay();
  const virtual: Task[] = d.rules
    .filter(r => r.weekdays.includes(wd) && date >= r.startDate && (!r.endDate || date <= r.endDate)
      && !r.skips.includes(date) && !real.some(t => t.recurringId === r.id))
    .map(r => ({
      id: `r:${r.id}:${date}`, date, title: r.title, detail: r.detail, priority: r.priority, time: r.time,
      done: false, doneAt: null, hidden: false, createdAt: 0, recurringId: r.id,
    }));
  return [...real, ...virtual];
}

export const sortTasks = (ts: Task[]) => [...ts].sort((a, b) =>
  Number(a.done) - Number(b.done)
  || PRIORITY[a.priority].order - PRIORITY[b.priority].order
  || (a.time || '99').localeCompare(b.time || '99'));

export const visibleOn = (d: PlannerData, date: string) => sortTasks(tasksOn(d, date).filter(t => !t.hidden));
export const tasksInRange = (d: PlannerData, s: string, e: string) => eachDay(s, e).flatMap(x => visibleOn(d, x));
export const eventsOn = (d: PlannerData, date: string) => d.events.filter(e => e.date === date);