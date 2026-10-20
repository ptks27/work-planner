'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { useToday } from '@/lib/hooks';
import { visibleOn } from '@/lib/selectors';
import { eachDay, getRange, thDate, type Mode } from '@/lib/utils';
import { PRIORITY, PRIORITIES, type Task, type Priority } from '@/lib/types';
import { AvatarIcon } from './Avatars';
import {
  FileTextIcon,
  CheckIcon,
  ClockIcon,
  FlagIcon,
  UsersIcon,
  CalendarIcon,
  TagIcon,
} from './Icons';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExecutiveReportModal({
  isOpen,
  onClose,
}: ExecutiveReportModalProps) {
  const s = usePlanner();
  const { currentUser, currentTeam, users } = useAuth();
  const today = useToday();
  const [reportPeriod, setReportPeriod] = useState<Mode>('week');

  if (!isOpen) return null;

  // Calculate tasks for selected period
  const [S, E] = getRange(reportPeriod, today);
  const days = eachDay(S, E).map(d => ({
    date: d,
    tasks: visibleOn(s, d),
  }));

  const uniqueTasksMap = new Map<string, Task & { occurrenceDate?: string }>();
  days.forEach(d => {
    d.tasks.forEach(t => {
      if (!uniqueTasksMap.has(t.id)) {
        uniqueTasksMap.set(t.id, { ...t, occurrenceDate: d.date });
      }
    });
  });

  const allTasks = Array.from(uniqueTasksMap.values());
  const doneTasks = allTasks.filter(t => t.done);
  const pendingTasks = allTasks.filter(t => !t.done);
  const completionRate = allTasks.length ? Math.round((doneTasks.length / allTasks.length) * 100) : 0;
  const highPriorityTasks = allTasks.filter(t => t.priority === 'high');

  // Tag statistics
  const tagCounts: Record<string, number> = {};
  allTasks.forEach(t => {
    if (t.tags && t.tags.length > 0) {
      t.tags.forEach(tg => {
        const clean = tg.replace(/^#/, '');
        tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      });
    }
  });

  // Team Member Workload
  const memberList = Array.from(
    new Map(
      (users || [])
        .concat(currentUser ? [currentUser] : [])
        .map(u => [u.id, u])
    ).values()
  );

  const memberStats = memberList.map(member => {
    const memberTasks = allTasks.filter(t => {
      if (t.assigneeIds && t.assigneeIds.length > 0) {
        return t.assigneeIds.includes(member.id);
      }
      return t.userId === member.id;
    });
    const mDone = memberTasks.filter(t => t.done).length;
    return {
      id: member.id,
      name: member.name,
      avatarId: member.avatarId,
      done: mDone,
      total: memberTasks.length,
      pct: memberTasks.length ? Math.round((mDone / memberTasks.length) * 100) : 0,
    };
  }).filter(m => m.total > 0);

  const periodLabel = reportPeriod === 'day' ? 'รายวัน' : reportPeriod === 'week' ? 'รายสัปดาห์' : 'รายเดือน';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="modal-overlay no-print-backdrop"
      onClick={onClose}
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        zIndex: 9999,
      }}
    >
      <div
        className="card executive-report-modal-wrapper"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 860,
          maxHeight: '90vh',
          background: 'var(--card-solid)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28), 0 0 0 1px var(--line)',
          borderRadius: 22,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modalSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Modal Controls Header (Hidden during Print) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--line)',
            background: 'rgba(120, 120, 128, 0.05)',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="macos-traffic-lights" aria-hidden="true">
              <span className="macos-traffic-dot red" onClick={onClose} style={{ cursor: 'pointer' }} />
              <span className="macos-traffic-dot yellow" />
              <span className="macos-traffic-dot green" />
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--txt)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileTextIcon size={15} color="var(--pri)" />
              <span>สรุปรายงานผลงานผู้บริหาร (Executive Report)</span>
            </span>
          </div>

          {/* Period Selector & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Period Switcher */}
            <div style={{ display: 'inline-flex', background: 'rgba(120, 120, 128, 0.08)', borderRadius: 999, padding: 3, gap: 2 }}>
              {(['day', 'week', 'month'] as Mode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setReportPeriod(m)}
                  style={{
                    border: 'none',
                    borderRadius: 999,
                    padding: '3px 10px',
                    fontSize: 11.5,
                    fontWeight: reportPeriod === m ? 600 : 500,
                    background: reportPeriod === m ? 'var(--card-solid)' : 'transparent',
                    color: reportPeriod === m ? 'var(--txt)' : 'var(--mut)',
                    cursor: 'pointer',
                  }}
                >
                  {m === 'day' ? 'วันนี้' : m === 'week' ? 'สัปดาห์นี้' : 'เดือนนี้'}
                </button>
              ))}
            </div>

            {/* Print Button */}
            <button
              type="button"
              className="btn primary"
              onClick={handlePrint}
              style={{
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="พิมพ์เอกสาร หรือบันทึกเป็น PDF"
            >
              <span>🖨️ พิมพ์ / บันทึก PDF</span>
            </button>

            <button
              type="button"
              className="btn sm"
              onClick={onClose}
              style={{
                borderRadius: 999,
                padding: '6px 12px',
                fontSize: 12,
                background: 'rgba(120, 120, 128, 0.08)',
                color: 'var(--txt)',
              }}
            >
              ปิด
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div
          className="executive-report-document-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '32px 36px',
            background: '#ffffff',
            color: '#1d1d1f',
          }}
        >
          {/* Document Header (Minimalist Apple Style) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #0071e3',
              paddingBottom: 16,
              marginBottom: 24,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span
                  style={{
                    background: 'linear-gradient(135deg, #0071e3, #60a5fa)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {currentTeam?.name || 'Work Planner'}
                </span>
                <span style={{ fontSize: 12, color: '#86868b', fontWeight: 500 }}>
                  รหัสเอกสาร: RPT-{new Date().getFullYear()}-{Date.now().toString().slice(-4)}
                </span>
              </div>
              <h1 style={{ margin: '4px 0', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#1d1d1f' }}>
                รายงานสรุปผลการปฏิบัติงานและการดำเนินงาน
              </h1>
              <span style={{ fontSize: 13, color: '#6e6e73' }}>
                Executive Performance & Project Progress Summary
              </span>
            </div>

            <div style={{ textAlign: 'right', fontSize: 12, color: '#6e6e73', lineHeight: 1.6 }}>
              <div><b>ช่วงเวลา:</b> {thDate(S)} – {thDate(E)} ({periodLabel})</div>
              <div><b>วันที่จัดทำ:</b> {thDate(today)} เวลา {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</div>
              <div><b>ผู้จัดทำ:</b> {currentUser?.name || 'ผู้ดูแลระบบ'}</div>
            </div>
          </div>

          {/* Section 1: Key Executive Metrics Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div style={{ border: '1px solid #e5e5ea', borderRadius: 12, padding: '12px 14px', background: '#f5f5f7' }}>
              <span style={{ fontSize: 11, color: '#86868b', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                งานทั้งหมด
              </span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1d1d1f' }}>{allTasks.length} <small style={{ fontSize: 12, fontWeight: 500, color: '#86868b' }}>งาน</small></div>
            </div>

            <div style={{ border: '1px solid #d1fae5', borderRadius: 12, padding: '12px 14px', background: '#ecfdf5' }}>
              <span style={{ fontSize: 11, color: '#059669', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                เสร็จสมบูรณ์แล้ว
              </span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#059669' }}>{doneTasks.length} <small style={{ fontSize: 12, fontWeight: 500, color: '#059669' }}>งาน</small></div>
            </div>

            <div style={{ border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 14px', background: '#eff6ff' }}>
              <span style={{ fontSize: 11, color: '#0071e3', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                อัตราความสำเร็จ
              </span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0071e3' }}>{completionRate}%</div>
            </div>

            <div style={{ border: '1px solid #fee2e2', borderRadius: 12, padding: '12px 14px', background: '#fff5f5' }}>
              <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                งานสำคัญระดับสูง
              </span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>{highPriorityTasks.length} <small style={{ fontSize: 12, fontWeight: 500, color: '#dc2626' }}>งาน</small></div>
            </div>
          </div>

          {/* Section 2: Priority & Category Distribution */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* Priority Progress */}
            <div style={{ border: '1px solid #e5e5ea', borderRadius: 12, padding: '14px 16px', background: '#fafafc' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f', display: 'block', marginBottom: 10 }}>
                ความคืบหน้าจำแนกตามความสำคัญ
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PRIORITIES.map(p => {
                  const pTasks = allTasks.filter(t => t.priority === p);
                  const pDone = pTasks.filter(t => t.done).length;
                  const pPct = pTasks.length ? Math.round((pDone / pTasks.length) * 100) : 0;
                  const conf = PRIORITY[p];
                  return (
                    <div key={p}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, color: conf.color }}>ระดับ{conf.label} ({pTasks.length} งาน)</span>
                        <span style={{ color: '#6e6e73' }}>{pDone}/{pTasks.length} ({pPct}%)</span>
                      </div>
                      <div style={{ height: 6, background: '#e5e5ea', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pPct}%`, background: conf.color, borderRadius: 999 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team Contributions Summary */}
            <div style={{ border: '1px solid #e5e5ea', borderRadius: 12, padding: '14px 16px', background: '#fafafc' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f', display: 'block', marginBottom: 10 }}>
                สถิติการปฏิบัติงานของสมาชิก ({memberStats.length} คน)
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 110, overflowY: 'auto' }}>
                {memberStats.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5 }}>
                    <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{m.name}</span>
                    <span style={{ color: m.pct === 100 ? '#059669' : '#0071e3', fontWeight: 600 }}>
                      {m.done}/{m.total} งาน ({m.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Completed Accomplishments Table */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✅</span>
              <span>1. รายการงานที่ดำเนินการเสร็จสิ้น (Completed Accomplishments - {doneTasks.length} งาน)</span>
            </h3>

            {doneTasks.length === 0 ? (
              <p style={{ fontSize: 12, color: '#86868b', fontStyle: 'italic', margin: 0 }}>ไม่มีงานที่เสร็จในช่วงเวลานี้</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: '#f5f5f7', borderBottom: '1px solid #d1d1d6', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', width: '35px' }}>#</th>
                    <th style={{ padding: '6px 8px' }}>ชื่องานและรายละเอียด</th>
                    <th style={{ padding: '6px 8px', width: '90px' }}>ความสำคัญ</th>
                    <th style={{ padding: '6px 8px', width: '110px' }}>ผู้รับผิดชอบ</th>
                    <th style={{ padding: '6px 8px', width: '90px' }}>วันที่</th>
                  </tr>
                </thead>
                <tbody>
                  {doneTasks.map((t, idx) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f2f2f7' }}>
                      <td style={{ padding: '6px 8px', color: '#86868b' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <b style={{ color: '#1d1d1f' }}>{t.title}</b>
                        {t.detail && <span style={{ color: '#6e6e73', marginLeft: 6 }}>– {t.detail}</span>}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{ color: PRIORITY[t.priority].color, fontWeight: 600 }}>
                          {PRIORITY[t.priority].label}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', color: '#6e6e73' }}>
                        {t.userName || 'สมาชิก'}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#86868b' }}>
                        {thDate(t.occurrenceDate || t.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 4: Pending / Ongoing Work Table */}
          <div style={{ marginBottom: 30 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#0071e3', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⏳</span>
              <span>2. รายการงานที่อยู่ระหว่างดำเนินการ / แผนงานถัดไป (Pending Tasks - {pendingTasks.length} งาน)</span>
            </h3>

            {pendingTasks.length === 0 ? (
              <p style={{ fontSize: 12, color: '#059669', fontWeight: 600, margin: 0 }}>🎉 ไม่มีงานคงค้าง</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: '#f5f5f7', borderBottom: '1px solid #d1d1d6', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', width: '35px' }}>#</th>
                    <th style={{ padding: '6px 8px' }}>ชื่องานและรายละเอียด</th>
                    <th style={{ padding: '6px 8px', width: '90px' }}>ความสำคัญ</th>
                    <th style={{ padding: '6px 8px', width: '110px' }}>ผู้รับผิดชอบ</th>
                    <th style={{ padding: '6px 8px', width: '90px' }}>กำหนดเวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTasks.map((t, idx) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f2f2f7' }}>
                      <td style={{ padding: '6px 8px', color: '#86868b' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <b style={{ color: '#1d1d1f' }}>{t.title}</b>
                        {t.time && <span style={{ marginLeft: 6, color: '#0071e3' }}>⏰ {t.time}</span>}
                        {t.detail && <span style={{ color: '#6e6e73', marginLeft: 6 }}>– {t.detail}</span>}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{ color: PRIORITY[t.priority].color, fontWeight: 600 }}>
                          {PRIORITY[t.priority].label}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', color: '#6e6e73' }}>
                        {t.userName || 'สมาชิก'}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#86868b' }}>
                        {thDate(t.occurrenceDate || t.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 5: Executive Sign-off / Signature */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: 40,
              paddingTop: 20,
              borderTop: '1px solid #e5e5ea',
              pageBreakInside: 'avoid',
            }}
          >
            <div style={{ textAlign: 'center', width: 220 }}>
              <div style={{ borderBottom: '1px solid #1d1d1f', height: 40, marginBottom: 8 }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>({currentUser?.name || 'ผู้รายงาน'})</div>
              <div style={{ fontSize: 11, color: '#86868b' }}>ผู้จัดทำรายงาน / ผู้รายงาน</div>
              <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 2 }}>วันที่: ...... / ...... / ..........</div>
            </div>

            <div style={{ textAlign: 'center', width: 220 }}>
              <div style={{ borderBottom: '1px solid #1d1d1f', height: 40, marginBottom: 8 }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>(.......................................................)</div>
              <div style={{ fontSize: 11, color: '#86868b' }}>ผู้มีอำนาจอนุมัติ / หัวหน้างาน</div>
              <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 2 }}>วันที่: ...... / ...... / ..........</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
