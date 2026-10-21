import { Task } from './types';
import { parse, fmt } from './utils';

export interface Badge {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progressText: string;
  progressPct: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  color: string;
  unlockedAtText?: string;
}

export interface ActivityStats {
  currentStreak: number;
  longestStreak: number;
  todayDone: number;
  todayTotal: number;
  todayPct: number;
  weekDone: number;
  weekTotal: number;
  weekPct: number;
  totalCompleted: number;
  activeDates: Set<string>;
  badges: Badge[];
  allRingsClosed: boolean;
}

export function computeActivityStats(
  tasks: Task[],
  userId?: string,
  todayStr: string = fmt(new Date())
): ActivityStats {
  // Filter user's tasks
  const userTasks = tasks.filter(t => {
    if (!userId) return true;
    if (t.assigneeIds && t.assigneeIds.length > 0) {
      return t.assigneeIds.includes(userId);
    }
    return !t.userId || t.userId === userId;
  });

  const completedTasks = userTasks.filter(t => t.done && !t.hidden);
  const totalCompleted = completedTasks.length;

  // Active dates map (Date String -> number of completed tasks)
  const dateCounts = new Map<string, number>();
  completedTasks.forEach(t => {
    let d = t.date;
    if (t.doneAt) {
      d = fmt(new Date(t.doneAt));
    }
    dateCounts.set(d, (dateCounts.get(d) || 0) + 1);
  });

  const activeDates = new Set(dateCounts.keys());

  // 1. Calculate Streak
  let currentStreak = 0;
  let cursor = new Date();
  const todayDateStr = fmt(cursor);
  const hasDoneToday = activeDates.has(todayDateStr);

  if (hasDoneToday) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  } else {
    // If today hasn't had a task yet, check if yesterday had one to maintain streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (activeDates.has(fmt(yesterday))) {
      currentStreak++;
      cursor = yesterday;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // Count backwards
  while (currentStreak > 0 && activeDates.has(fmt(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak calculation
  const sortedDates = Array.from(activeDates).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  sortedDates.forEach(dStr => {
    const curDate = parse(dStr);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffTime = curDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = curDate;
  });
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  // 2. Today's Rings
  const todayTasks = userTasks.filter(t => t.date === todayStr && !t.hidden);
  const todayDone = todayTasks.filter(t => t.done).length;
  const todayTotal = todayTasks.length;
  const todayPct = todayTotal > 0 ? Math.min(100, Math.round((todayDone / todayTotal) * 100)) : (hasDoneToday ? 100 : 0);

  // 3. Weekly Rings
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  const weekStartStr = fmt(weekStart);

  const weekTasks = userTasks.filter(t => t.date >= weekStartStr && t.date <= todayStr && !t.hidden);
  const weekDone = weekTasks.filter(t => t.done).length;
  const weekTotal = weekTasks.length;
  const weekPct = weekTotal > 0 ? Math.min(100, Math.round((weekDone / weekTotal) * 100)) : (todayPct > 0 ? todayPct : 0);

  const allRingsClosed = todayTotal > 0 && todayDone === todayTotal;

  // 4. Badges Evaluation
  // Badge 1: Early Bird
  const hasEarlyBird = completedTasks.some(t => {
    if (!t.doneAt) return false;
    const hour = new Date(t.doneAt).getHours();
    return hour < 12;
  });

  // Badge 2: Speed Runner (>= 3 tasks closed in 1 day)
  const hasSpeedRunner = Array.from(dateCounts.values()).some(count => count >= 3);

  // Badge 3: Task Master (>= 20 completed)
  const hasTaskMaster = totalCompleted >= 20;

  // Badge 4: On Fire (Streak >= 3)
  const hasOnFire = currentStreak >= 3 || longestStreak >= 3;

  // Badge 5: Team Player (collaborated on multi-assignee task or wrote comment)
  const hasTeamPlayer = userTasks.some(t => (t.assigneeIds && t.assigneeIds.length >= 2) || (t.comments && t.comments.some(c => c.userId === userId)));

  // Badge 6: Perfectionist (Today 100%)
  const hasPerfectionist = allRingsClosed && todayTotal >= 1;

  // Badge 7: Century Legend (>= 50 completed)
  const hasCentury = totalCompleted >= 50;

  const badges: Badge[] = [
    {
      id: 'early_bird',
      title: 'Early Bird',
      subtitle: 'นกตื่นเช้า',
      description: 'ปิดงานสำเร็จก่อนเที่ยงวัน (ก่อน 12:00 น.)',
      icon: '🌅',
      unlocked: hasEarlyBird,
      progressText: hasEarlyBird ? 'ปลดล็อกแล้ว' : 'ปิดงานก่อน 12:00 น.',
      progressPct: hasEarlyBird ? 100 : 0,
      tier: 'bronze',
      color: '#ff9500',
    },
    {
      id: 'speed_runner',
      title: 'Speed Runner',
      subtitle: 'ทำงานว่องไว',
      description: 'ปิดงานสำเร็จ 3 งานขึ้นไปภายในวันเดียว',
      icon: '⚡',
      unlocked: hasSpeedRunner,
      progressText: hasSpeedRunner ? 'ปลดล็อกแล้ว' : `${Math.min(3, Math.max(...Array.from(dateCounts.values()), 0))}/3 งานในวันเดียว`,
      progressPct: hasSpeedRunner ? 100 : Math.min(100, Math.round((Math.max(...Array.from(dateCounts.values()), 0) / 3) * 100)),
      tier: 'silver',
      color: '#0071e3',
    },
    {
      id: 'task_master',
      title: 'Task Master',
      subtitle: 'ปรมาจารย์งาน',
      description: 'เคลียร์งานสะสมครบ 20 งาน',
      icon: '🏆',
      unlocked: hasTaskMaster,
      progressText: `${Math.min(20, totalCompleted)}/20 งาน`,
      progressPct: Math.min(100, Math.round((totalCompleted / 20) * 100)),
      tier: 'gold',
      color: '#f59e0b',
    },
    {
      id: 'on_fire',
      title: 'On Fire',
      subtitle: 'ไฟแรงต่อเนื่อง',
      description: 'รักษา Streak ทำงานสำเร็จติดต่อกัน 3 วันขึ้นไป',
      icon: '🔥',
      unlocked: hasOnFire,
      progressText: `${Math.min(3, currentStreak)}/3 วันต่อเนื่อง`,
      progressPct: Math.min(100, Math.round((currentStreak / 3) * 100)),
      tier: 'gold',
      color: '#ff3b30',
    },
    {
      id: 'team_player',
      title: 'Team Player',
      subtitle: 'พลังทีมยอดเยี่ยม',
      description: 'ร่วมทำงานที่มีสมาชิกหลายคน หรือมีส่วนร่วมในความคิดเห็นงาน',
      icon: '🤝',
      unlocked: hasTeamPlayer,
      progressText: hasTeamPlayer ? 'ปลดล็อกแล้ว' : 'ร่วมงานกับเพื่อนในทีม',
      progressPct: hasTeamPlayer ? 100 : 0,
      tier: 'silver',
      color: '#5856d6',
    },
    {
      id: 'perfectionist',
      title: 'Perfectionist',
      subtitle: 'วงแหวนเต็มรอบ',
      description: 'ปิดงานของวันนี้ครบ 100% ทุกรายการ',
      icon: '🎯',
      unlocked: hasPerfectionist,
      progressText: hasPerfectionist ? 'ปลดล็อกแล้ว' : `${todayDone}/${todayTotal || 1} งานวันนี้`,
      progressPct: todayPct,
      tier: 'gold',
      color: '#34c759',
    },
    {
      id: 'century_legend',
      title: 'Century Legend',
      subtitle: 'ระดับตำนาน',
      description: 'เคลียร์งานสะสมครบ 50 งานในระบบ',
      icon: '👑',
      unlocked: hasCentury,
      progressText: `${Math.min(50, totalCompleted)}/50 งาน`,
      progressPct: Math.min(100, Math.round((totalCompleted / 50) * 100)),
      tier: 'platinum',
      color: '#af52de',
    },
  ];

  return {
    currentStreak,
    longestStreak,
    todayDone,
    todayTotal,
    todayPct,
    weekDone,
    weekTotal,
    weekPct,
    totalCompleted,
    activeDates,
    badges,
    allRingsClosed,
  };
}
