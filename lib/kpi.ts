import { Task, MemberScorecard, User, AvatarId } from './types';

/**
 * คำนวณบัตรคะแนนประเมิน KPI & ผลงานของสมาชิกรายบุคคล
 */
export function calculateMemberScorecard({
  member,
  tasks,
  periodLabel = 'ภาพรวมผลงานสะสม',
}: {
  member: { id: string; name: string; avatarId?: AvatarId; role?: string; department?: string };
  tasks: Task[];
  periodLabel?: string;
}): MemberScorecard {
  // กรองเฉพาะงานที่สมาชิกคนนี้รับผิดชอบ
  const memberTasks = tasks.filter(t => {
    if (t.hidden) return false;
    if (t.assigneeIds && t.assigneeIds.includes(member.id)) return true;
    return t.userId === member.id;
  });

  const totalAssigned = memberTasks.length;
  const completedTasks = memberTasks.filter(t => t.done || t.status === 'done');
  const totalCompleted = completedTasks.length;
  const completionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  // คำนวณการส่งงานตรงเวลา (On-Time Delivery)
  let onTimeCompleted = 0;
  let totalTurnaroundMs = 0;
  let turnaroundCount = 0;

  completedTasks.forEach(t => {
    const doneTime = t.doneAt ? new Date(t.doneAt).getTime() : 0;
    const deadlineStr = t.endDate || t.date;
    const deadlineTime = deadlineStr ? new Date(`${deadlineStr}T23:59:59`).getTime() : 0;

    // ถ้าไม่มีเดดไลน์ หรือส่งก่อน/ตรงตามเดดไลน์ (บวกเผื่อ 2 ชม.)
    if (!deadlineTime || (doneTime && doneTime <= deadlineTime + 2 * 3600 * 1000)) {
      onTimeCompleted++;
    }

    // คำนวณระยะเวลาเฉลี่ยจากวันที่สร้าง ถึงวันที่ทำเสร็จ
    const createdTime = t.createdAt ? new Date(t.createdAt).getTime() : 0;
    if (createdTime && doneTime && doneTime >= createdTime) {
      totalTurnaroundMs += doneTime - createdTime;
      turnaroundCount++;
    }
  });

  const onTimeRate = totalCompleted > 0 ? Math.round((onTimeCompleted / totalCompleted) * 100) : 0;

  // ระยะเวลาเฉลี่ยในการปิดงาน (หน่วยเป็นวัน)
  const avgTurnaroundDays =
    turnaroundCount > 0
      ? Math.max(0.2, parseFloat((totalTurnaroundMs / turnaroundCount / (1000 * 3600 * 24)).toFixed(1)))
      : 0;

  // งานระดับความสำคัญสูงที่ปิดได้
  const highPriorityClosed = completedTasks.filter(t => t.priority === 'high').length;

  // คำนวณเกรดประเมิน
  let grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | '-' = '-';
  if (totalCompleted === 0) {
    grade = '-';
  } else if (onTimeRate >= 90 && totalCompleted >= 8) {
    grade = 'A+';
  } else if (onTimeRate >= 80 && totalCompleted >= 4) {
    grade = 'A';
  } else if (onTimeRate >= 70) {
    grade = 'B+';
  } else if (onTimeRate >= 55) {
    grade = 'B';
  } else {
    grade = 'C';
  }

  // ไฮไลท์จุดเด่น (Strengths)
  const strengths: string[] = [];
  if (totalCompleted === 0) {
    strengths.push('✨ ยังไม่มีประวัติการส่งมอบงาน');
  } else {
    if (onTimeRate >= 85) strengths.push('🎯 ส่งงานตรงตามกำหนดสูงมาก');
    if (avgTurnaroundDays <= 1.5 && avgTurnaroundDays > 0) strengths.push('⚡ ปิดงานได้รวดเร็วฉับไว');
    if (highPriorityClosed >= 2) strengths.push('👑 เคลียร์งานด่วนวิกฤตได้ดีเยี่ยม');
    if (completionRate >= 80 && totalAssigned >= 3) strengths.push('💪 อัตราเคลียร์งานสำเร็จสูง');
    if (strengths.length === 0) strengths.push('✨ กำลังสะสมผลงานอย่างต่อเนื่อง');
  }

  return {
    memberId: member.id,
    memberName: member.name,
    avatarId: member.avatarId,
    role: member.role || 'Team Member',
    department: member.department || 'General',
    periodLabel,
    totalAssigned,
    totalCompleted,
    completionRate,
    onTimeCompleted,
    onTimeRate,
    avgTurnaroundDays,
    highPriorityClosed,
    currentStreak: totalCompleted > 0 ? Math.min(14, totalCompleted + 1) : 0,
    grade,
    strengths,
  };
}

/**
 * สร้างข้อความสรุป KPI สำหรับส่งใน LINE หรืออีเมล
 */
export function formatScorecardShareText(card: MemberScorecard): string {
  const onTimeDisplay = card.totalCompleted > 0 ? `${card.onTimeRate}% (${card.onTimeCompleted}/${card.totalCompleted} งาน)` : '- (ยังไม่มีงานส่งมอบ)';
  const turnaroundDisplay = card.totalCompleted > 0 && card.avgTurnaroundDays > 0 ? `${card.avgTurnaroundDays} วัน/งาน` : '- (ยังไม่มีการปิดงาน)';
  return [
    `📊 บัตรประเมินผลงาน KPI: คุณ ${card.memberName}`,
    `🏢 ตำแหน่ง: ${card.role} (${card.department})`,
    `🏆 ผลการประเมิน: เกรด ${card.grade}`,
    `--------------------------------`,
    `🎯 อัตราส่งงานตรงเวลา: ${onTimeDisplay}`,
    `⚡ ความเร็วเฉลี่ยในการปิดงาน: ${turnaroundDisplay}`,
    `📦 งานที่ส่งมอบสำเร็จ: ${card.totalCompleted} จาก ${card.totalAssigned} ชิ้น (${card.completionRate}%)`,
    `👑 งานด่วนที่เคลียร์สำเร็จ: ${card.highPriorityClosed} งาน`,
    `🌟 จุดเด่น: ${card.strengths.join(', ')}`,
    `--------------------------------`,
    `✨ ออกรายงานโดย Work Planner Enterprise`,
  ].join('\n');
}
