'use client';

import React from 'react';
import { usePlanner } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { AvatarIcon } from './Avatars';
import { UsersIcon, SparklesIcon, CheckIcon } from './Icons';
import { Task } from '@/lib/types';

interface MemberWorkload {
  userId: string;
  name: string;
  avatarId: any;
  role?: string;
  department?: string;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  totalActive: number;
  urgentCount: number;
  level: 'light' | 'optimal' | 'heavy';
}

export default function TeamWorkloadBar({
  onFilterMember,
}: {
  onFilterMember?: (userId: string) => void;
}) {
  const { tasks } = usePlanner();
  const { teamMembers, users, currentUser } = useAuth();

  // สร้างรายชื่อสมาชิกทั้งหมด (ผสานทั้ง teamMembers, users และ currentUser แบบไม่ซ้ำ)
  const memberMap = new Map<string, { userId: string; name: string; avatarId: any; role?: string; department?: string }>();
  
  (teamMembers || []).forEach(m => {
    memberMap.set(m.userId, {
      userId: m.userId,
      name: m.name,
      avatarId: m.avatarId,
      role: m.role,
      department: m.department,
    });
  });

  (users || []).forEach(u => {
    if (!memberMap.has(u.id)) {
      memberMap.set(u.id, {
        userId: u.id,
        name: u.name,
        avatarId: u.avatarId,
        role: u.role,
        department: u.department,
      });
    }
  });

  if (currentUser && !memberMap.has(currentUser.id)) {
    memberMap.set(currentUser.id, {
      userId: currentUser.id,
      name: currentUser.name,
      avatarId: currentUser.avatarId,
      role: currentUser.role,
      department: currentUser.department,
    });
  }

  const rawMembers = Array.from(memberMap.values());

  // คำนวณภาระงานของสมาชิกแต่ละคน
  const workloads: MemberWorkload[] = rawMembers.map(member => {
    // หางานที่สมาชิกคนนี้เป็นผู้รับผิดชอบ (assignee หรือ userId)
    const memberTasks = tasks.filter(t => {
      if (t.hidden) return false;
      if (t.assigneeIds && t.assigneeIds.includes(member.userId)) return true;
      return t.userId === member.userId;
    });

    const todoCount = memberTasks.filter(t => !t.done && (!t.status || t.status === 'todo')).length;
    const inProgressCount = memberTasks.filter(t => !t.done && t.status === 'in_progress').length;
    const doneCount = memberTasks.filter(t => t.done || t.status === 'done').length;
    const urgentCount = memberTasks.filter(t => !t.done && t.priority === 'high').length;
    const totalActive = todoCount + inProgressCount;

    let level: 'light' | 'optimal' | 'heavy' = 'light';
    if (totalActive > 6) {
      level = 'heavy';
    } else if (totalActive >= 3) {
      level = 'optimal';
    }

    return {
      userId: member.userId,
      name: member.name,
      avatarId: member.avatarId,
      role: member.role,
      department: member.department,
      todoCount,
      inProgressCount,
      doneCount,
      totalActive,
      urgentCount,
      level,
    };
  });

  // เรียงลำดับคนที่มีงานล้นมืออยู่บนสุด
  workloads.sort((a, b) => b.totalActive - a.totalActive);

  const heavyCount = workloads.filter(w => w.level === 'heavy').length;

  if (workloads.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          paddingBottom: 14,
          borderBottom: '1px solid var(--line)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(0, 113, 227, 0.12)',
              color: 'var(--pri)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UsersIcon size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>
              ภาระงานของสมาชิกในทีม (Team Workload Balancing)
            </h3>
            <small style={{ color: 'var(--mut)', fontSize: 12 }}>
              วิเคราะห์ความสมดุลของปริมาณงาน เพื่อช่วยหัวหน้าทีมกระจายงานได้อย่างเหมาะสม
            </small>
          </div>
        </div>

        {/* Status Pill */}
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: 999,
            background: heavyCount > 0 ? 'rgba(255, 59, 48, 0.12)' : 'rgba(52, 199, 89, 0.12)',
            color: heavyCount > 0 ? '#ff3b30' : '#34c759',
            border: heavyCount > 0 ? '1px solid rgba(255, 59, 48, 0.25)' : '1px solid rgba(52, 199, 89, 0.25)',
          }}
        >
          {heavyCount > 0 ? `⚠️ มีสมาชิกงานล้นมือ ${heavyCount} คน` : '🟢 การกระจายงานสมดุลดี'}
        </span>
      </div>

      {/* Member Workload Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {workloads.map(member => {
          const totalTasks = member.totalActive + member.doneCount;
          const todoPct = totalTasks > 0 ? (member.todoCount / totalTasks) * 100 : 0;
          const progPct = totalTasks > 0 ? (member.inProgressCount / totalTasks) * 100 : 0;
          const donePct = totalTasks > 0 ? (member.doneCount / totalTasks) * 100 : 0;

          return (
            <div
              key={member.userId}
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(120, 120, 128, 0.04)',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {/* Member Info Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AvatarIcon id={member.avatarId} size={36} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--txt)' }}>
                        {member.name}
                      </span>
                      {member.userId === currentUser?.id && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: 'var(--pri)',
                            color: '#fff',
                          }}
                        >
                          คุณ
                        </span>
                      )}
                    </div>
                    <small style={{ color: 'var(--mut)', fontSize: 11.5 }}>
                      {member.role || 'สมาชิกทีม'} {member.department ? `· ${member.department}` : ''}
                    </small>
                  </div>
                </div>

                {/* Level Tag & Urgent Warning */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {member.urgentCount > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(255, 59, 48, 0.12)',
                        color: '#ff3b30',
                      }}
                      title="งานสำคัญระดับสูงที่ยังไม่เสร็จ"
                    >
                      🔥 งานด่วน {member.urgentCount}
                    </span>
                  )}

                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 999,
                      background:
                        member.level === 'heavy'
                          ? 'rgba(255, 59, 48, 0.12)'
                          : member.level === 'optimal'
                          ? 'rgba(255, 149, 0, 0.12)'
                          : 'rgba(52, 199, 89, 0.12)',
                      color:
                        member.level === 'heavy'
                          ? '#ff3b30'
                          : member.level === 'optimal'
                          ? '#ff9500'
                          : '#34c759',
                    }}
                  >
                    {member.level === 'heavy'
                      ? `🔴 งานล้นมือ (${member.totalActive} งาน)`
                      : member.level === 'optimal'
                      ? `🟡 กำลังดี (${member.totalActive} งาน)`
                      : `🟢 งานเบา (${member.totalActive} งาน)`}
                  </span>
                </div>
              </div>

              {/* Progress Bar (Stacked) */}
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: 'rgba(120, 120, 128, 0.12)',
                  overflow: 'hidden',
                  display: 'flex',
                }}
              >
                <div
                  style={{ width: `${progPct}%`, background: '#0284c7', transition: 'width 0.3s ease' }}
                  title={`กำลังทำ: ${member.inProgressCount} งาน`}
                />
                <div
                  style={{ width: `${todoPct}%`, background: '#94a3b8', transition: 'width 0.3s ease' }}
                  title={`รอทำ: ${member.todoCount} งาน`}
                />
                <div
                  style={{ width: `${donePct}%`, background: '#34c759', transition: 'width 0.3s ease' }}
                  title={`เสร็จสิ้น: ${member.doneCount} งาน`}
                />
              </div>

              {/* Breakdown Labels */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11,
                  color: 'var(--mut)',
                }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <span>กำลังทำ: <b style={{ color: '#0284c7' }}>{member.inProgressCount}</b></span>
                  <span>รอทำ: <b style={{ color: 'var(--txt)' }}>{member.todoCount}</b></span>
                  <span>เสร็จแล้ว: <b style={{ color: '#34c759' }}>{member.doneCount}</b></span>
                </div>
                <span>รวมทั้งหมด {totalTasks} งาน</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
