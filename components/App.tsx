'use client';
import { useState, useEffect, useRef } from 'react';
import Sidebar, { TABS, type TabId } from '@/components/Sidebar';
import Notifier from '@/components/Notifier';
import TasksTab from '@/components/TasksTab';
import RecurringTab from '@/components/RecurringTab';
import EventsTab from '@/components/EventsTab';
import TimelineTab from '@/components/TimelineTab';
import CanvasTab from '@/components/CanvasTab';
import DashboardTab from '@/components/DashboardTab';
import SettingsTab from '@/components/SettingsTab';
import NotificationCenter from '@/components/NotificationCenter';
import MemberScorecardModal from '@/components/MemberScorecardModal';
import SearchModal from '@/components/SearchModal';
import EditTaskModal from '@/components/EditTaskModal';
import AuthScreen from '@/components/AuthScreen';
import TeamSelectScreen from '@/components/TeamSelectScreen';
import ProfileModal from '@/components/ProfileModal';
import TeamSwitcher from '@/components/TeamSwitcher';
import TeamMembersModal from '@/components/TeamMembersModal';
import MorningBriefingModal from '@/components/MorningBriefingModal';
import AchievementsModal from '@/components/AchievementsModal';
import { computeActivityStats } from '@/lib/achievements';
import { AvatarIcon } from '@/components/Avatars';
import { useToday } from '@/lib/hooks';
import { thDate } from '@/lib/utils';
import { usePlanner, setSyncingFromCloud, syncPlannerToFirebase } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { DEFAULT_FIREBASE_CONFIG } from '@/lib/firebaseDefaultConfig';
import { subscribePlannerLive } from '@/lib/firebase';
import { visibleOn } from '@/lib/selectors';
import { PRIORITY, type Task } from '@/lib/types';
import {
  SearchIcon,
  SunIcon,
  MoonIcon,
  ClipboardIcon,
  ClipboardCheckIcon,
  BuildingIcon,
  CopyIcon,
  CheckIcon,
  LogOutIcon,
  ChevronDownIcon,
  UsersIcon,
  AwardIcon,
  BoltIcon,
} from '@/components/Icons';

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabId>('tasks');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTeamMembersOpen, setIsTeamMembersOpen] = useState(false);
  const [isMorningBriefingOpen, setIsMorningBriefingOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [reportCopied, setReportCopied] = useState(false);
  const [teamCodeCopied, setTeamCodeCopied] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const quickMenuRef = useRef<HTMLDivElement>(null);
  const today = useToday();
  const s = usePlanner();
  const { currentUser, currentTeam, teamMembers, fetchTeamMembers, leaveTeam } = useAuth();
  const cur = TABS.find(t => t.id === tab) || TABS[0];
  const activityStats = computeActivityStats(s.tasks, currentUser?.id, today);

  // ปิด Quick Menu เมื่อคลิกนอกขอบเขต
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target as Node)) {
        setIsQuickMenuOpen(false);
      }
    };
    if (isQuickMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isQuickMenuOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // โหลดรายชื่อสมาชิกในทีมเมื่อเข้าสู่ระบบ
  useEffect(() => {
    if (mounted && currentUser?.teamId) {
      fetchTeamMembers(currentUser.teamId);
    }
  }, [mounted, currentUser?.teamId]);

  // แสดงสรุปภาพรวมยามเช้า (Morning Briefing) อัตโนมัติเมื่อเข้าใช้งานครั้งแรกของวัน
  useEffect(() => {
    if (mounted && currentUser) {
      const lastBriefing = localStorage.getItem('wp_last_briefing_date');
      if (lastBriefing !== today) {
        const timer = setTimeout(() => {
          setIsMorningBriefingOpen(true);
        }, 700);
        return () => clearTimeout(timer);
      }
    }
  }, [mounted, currentUser, today]);

  // ซิงค์สมาชิกในทีมและเชื่อมต่อข้อมูลสด Real-time เมื่อมี Firebase Config และอยู่ในทีม
  useEffect(() => {
    const activeCfg = s.firebaseConfig || DEFAULT_FIREBASE_CONFIG;
    if (!mounted || !activeCfg || !currentUser?.teamId) return;

    // 1. ดึงข้อมูลรายชื่อทีมงานเฉพาะทีมนี้จาก Firestore
    useAuth.getState().syncTeamUsers();

    // 2. รับข้อมูลสด Real-time เฉพาะห้องของทีมนี้
    const unsub = subscribePlannerLive(
      cloudData => {
        const localTasks = usePlanner.getState().tasks;
        const cloudHasTasks = cloudData.tasks && cloudData.tasks.length > 0;
        const localHasTasks = localTasks && localTasks.length > 0;

        // ถ้าบน Cloud ยังไม่มีงาน (เช่น เพิ่งสร้างห้อง) แต่ใน Local มีงานอยู่ ให้ดันงานในเครื่องขึ้น Cloud
        if (!cloudHasTasks && localHasTasks) {
          syncPlannerToFirebase();
          return;
        }

        setSyncingFromCloud(true);
        s.restore(cloudData);
        setTimeout(() => {
          setSyncingFromCloud(false);
        }, 500);
      },
      activeCfg,
      currentUser.teamId
    );

    return () => {
      if (unsub) unsub();
    };
  }, [mounted, s.firebaseConfig, currentUser?.teamId]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', s.theme || 'light');
  }, [s.theme]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleCopyReport = () => {
    const ts = visibleOn(s, today);
    const doneList = ts.filter(t => t.done);
    const pendingList = ts.filter(t => !t.done);
    const pct = ts.length ? Math.round((doneList.length / ts.length) * 100) : 0;

    const lines = [
      `📌 สรุปงานประจำวัน: ${thDate(today)}`,
      `------------------------------------`,
      `✅ เสร็จแล้ว (${doneList.length} งาน):`,
      ...(doneList.length
        ? doneList.map(
            t =>
              `  • [${PRIORITY[t.priority].label}] ${t.title}${
                t.time ? ` (${t.time})` : ''
              }${t.detail ? ` - ${t.detail}` : ''}${t.userName ? ` [${t.userName}]` : ''}`
          )
        : ['  • ไม่มี']),
      ``,
      `⏳ กำลังทำ / ยังค้าง (${pendingList.length} งาน):`,
      ...(pendingList.length
        ? pendingList.map(
            t =>
              `  • [${PRIORITY[t.priority].label}] ${t.title}${
                t.time ? ` (${t.time})` : ''
              }${t.detail ? ` - ${t.detail}` : ''}${t.userName ? ` [${t.userName}]` : ''}`
          )
        : ['  • ไม่มี']),
      `------------------------------------`,
      `🎯 ความคืบหน้ารวม: ${pct}% (${doneList.length}/${ts.length})`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 2500);
  };

  const handleCopyTeamCode = () => {
    const code = currentTeam?.code || currentUser?.teamCode;
    if (code) {
      navigator.clipboard.writeText(code);
      setTeamCodeCopied(true);
      setTimeout(() => setTeamCodeCopied(false), 2000);
    }
  };

  const handleLeaveTeam = () => {
    const teamTitle = currentTeam?.name || currentUser?.teamName || 'ทีมนี้';
    if (confirm(`คุณต้องการออกจาก "${teamTitle}" ใช่หรือไม่?\n(คุณสามารถใช้รหัสทีมกลับเข้าทีมนี้ได้ตลอดเวลา)`)) {
      leaveTeam();
    }
  };

  if (!mounted) {
    return <div className="loading">กำลังเตรียมระบบ...</div>;
  }

  // ถ้ายังไม่ Login ให้แสดงหน้า Login / Register เป็นหน้าแรก
  if (!currentUser) {
    return (
      <div data-theme={s.theme || 'light'}>
        <AuthScreen />
      </div>
    );
  }

  // ถ้า Login แล้วแต่ยังไม่ได้สร้างทีมหรือเข้าร่วมทีม ให้แสดงหน้าเลือกทีม
  if (!currentUser.teamId) {
    return (
      <div data-theme={s.theme || 'light'}>
        <TeamSelectScreen />
      </div>
    );
  }

  return (
    <div className="layout" data-theme={s.theme || 'light'}>
      <Sidebar tab={tab} onTab={setTab} onOpenProfile={() => setIsProfileOpen(true)} />
      <div className="content">
        <header className="topbar">
          {/* Left: Identity Badge & Title Breadcrumb */}
          <div className="nav-left">
            <div className="nav-page-badge">
              <span>{cur.icon}</span>
            </div>
            <div className="nav-page-info">
              <div className="nav-breadcrumb">
                <span>Work Planner</span>
                <span className="nav-breadcrumb-sep">/</span>
                <span className="nav-breadcrumb-current">{cur.label}</span>
              </div>
              <h1 className="nav-title">{cur.label}</h1>
            </div>

            {/* Interactive Team Switcher Dropdown & Member Count Button */}
            {(currentTeam || currentUser.teamId) && (
              <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                <TeamSwitcher onOpenMembers={() => setIsTeamMembersOpen(true)} />
                <button
                  type="button"
                  className="nav-team-members-btn"
                  onClick={() => setIsTeamMembersOpen(true)}
                  title={`ดูสมาชิกในทีม (${teamMembers.length} คน)`}
                >
                  <UsersIcon size={14} color="var(--pri)" />
                  <span>สมาชิก ({teamMembers.length})</span>
                </button>
              </div>
            )}
          </div>

          {/* Center: Search Trigger Bar (Command Palette style) */}
          <div className="nav-center">
            <button
              className="nav-search-bar"
              onClick={() => setIsSearchOpen(true)}
              title="ค้นหางานทั้งหมด (Ctrl + K)"
            >
              <span className="nav-search-icon">
                <SearchIcon size={15} />
              </span>
              <span className="nav-search-placeholder">ค้นหางาน, โน้ต, วันลา...</span>
              <kbd className="nav-search-kbd">Ctrl K</kbd>
            </button>
          </div>

          {/* Right: Clean Apple macOS Controls with Unified Quick Action Menu */}
          <div className="nav-right">
            {/* Streak & Activity Ring Trigger Chip */}
            <button
              type="button"
              className="nav-action-btn"
              onClick={() => setIsAchievementsOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: activityStats.currentStreak > 0 ? 'rgba(255, 59, 48, 0.08)' : 'rgba(120, 120, 128, 0.08)',
                color: activityStats.currentStreak > 0 ? '#ff3b30' : 'var(--txt)',
                border: activityStats.currentStreak > 0 ? '1px solid rgba(255, 59, 48, 0.25)' : '1px solid var(--line)',
                padding: '4px 10px',
                borderRadius: 999,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 12,
              }}
              title={`ดูวงแหวนกิจกรรมและความสำเร็จ (Streak ${activityStats.currentStreak} วัน, ปิดงานวันนี้ ${activityStats.todayPct}%)`}
            >
              <span>🔥</span>
              <span>{activityStats.currentStreak > 0 ? `${activityStats.currentStreak} วัน` : 'Streak'}</span>
              <span
                style={{
                  fontSize: 10.5,
                  background: activityStats.allRingsClosed ? '#34c759' : '#ff2d55',
                  color: '#ffffff',
                  borderRadius: 999,
                  padding: '1px 6px',
                  fontWeight: 800,
                }}
              >
                {activityStats.todayPct}%
              </span>
            </button>

            {/* macOS Quick Actions Menu Popover */}
            <div ref={quickMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="nav-action-btn"
                onClick={() => setIsQuickMenuOpen(prev => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isQuickMenuOpen ? 'var(--pri-l)' : 'rgba(255, 255, 255, 0.8)',
                  color: isQuickMenuOpen ? 'var(--pri)' : 'var(--txt)',
                  borderColor: isQuickMenuOpen ? 'var(--pri)' : 'var(--line)',
                  fontWeight: 600,
                  fontSize: 12.5,
                }}
                title="เปิดเมนูด่วน / เครื่องมือช่วยงาน"
              >
                <BoltIcon size={14} color="var(--pri)" />
                <span>เมนูด่วน</span>
                <ChevronDownIcon
                  size={12}
                  style={{
                    transform: isQuickMenuOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                />
              </button>

              {isQuickMenuOpen && (
                <div className="quick-menu-popover" onClick={e => e.stopPropagation()}>
                  <div
                    style={{
                      padding: '6px 10px 4px',
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: 'var(--mut)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    ⚡ เครื่องมือและรายงานด่วน
                  </div>

                  <button
                    type="button"
                    className="quick-menu-item"
                    onClick={() => {
                      setIsMorningBriefingOpen(true);
                      setIsQuickMenuOpen(false);
                    }}
                  >
                    <span style={{ fontSize: 16 }}>🌅</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>สรุปภาพรวมยามเช้า</div>
                      <small style={{ color: 'var(--mut)', fontSize: 11 }}>
                        Morning Briefing สรุปเดดไลน์ & วันลา
                      </small>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="quick-menu-item"
                    onClick={() => {
                      setIsScorecardOpen(true);
                      setIsQuickMenuOpen(false);
                    }}
                  >
                    <span style={{ fontSize: 16 }}>📊</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>ประเมิน KPI รายบุคคล</div>
                      <small style={{ color: 'var(--mut)', fontSize: 11 }}>
                        Member Scorecard & On-Time Rate
                      </small>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="quick-menu-item"
                    onClick={() => {
                      setIsAchievementsOpen(true);
                      setIsQuickMenuOpen(false);
                    }}
                  >
                    <span style={{ fontSize: 16 }}>🏆</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>วงแหวนความสำเร็จ & Streak</div>
                      <small style={{ color: 'var(--mut)', fontSize: 11 }}>
                        ความต่อเนื่องและเป้าหมายประจำวัน
                      </small>
                    </div>
                  </button>

                  <div className="quick-menu-divider" />

                  <button
                    type="button"
                    className="quick-menu-item"
                    onClick={() => {
                      handleCopyReport();
                      setIsQuickMenuOpen(false);
                    }}
                  >
                    <span style={{ fontSize: 16 }}>📋</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        {reportCopied ? '✅ คัดลอกสรุปงานแล้ว!' : 'คัดลอกสรุปงานประจำวัน'}
                      </div>
                      <small style={{ color: 'var(--mut)', fontSize: 11 }}>
                        ฟอร์แมตสวยงามพร้อมส่งใน LINE / Slack
                      </small>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="quick-menu-item"
                    onClick={() => {
                      setIsTeamMembersOpen(true);
                      setIsQuickMenuOpen(false);
                    }}
                  >
                    <span style={{ fontSize: 16 }}>👥</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>รายชื่อสมาชิกในทีม</div>
                      <small style={{ color: 'var(--mut)', fontSize: 11 }}>
                        จัดการทีมและดูบทบาท ({teamMembers.length} คน)
                      </small>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Notification Center Popover */}
            <NotificationCenter onOpenTask={task => setEditingTask(task)} />

            {/* Theme Toggle Button */}
            <button
              className="nav-icon-btn"
              onClick={() => s.setTheme(s.theme === 'dark' ? 'light' : 'dark')}
              title={s.theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
              aria-label="สลับธีม"
            >
              {s.theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            </button>

            {/* Vertical Separator */}
            <div className="nav-divider" />

            {/* User Profile Chip */}
            <button
              className="nav-user-chip"
              onClick={() => setIsProfileOpen(true)}
              title="ดูโปรไฟล์และเลือก Avatar"
            >
              <AvatarIcon id={currentUser.avatarId} size={32} />
              <div className="nav-user-meta">
                <span className="nav-user-name">{currentUser.name}</span>
                <span className="nav-user-role">{currentUser.role || 'โปรไฟล์'}</span>
              </div>
              <span className="nav-user-caret">
                <ChevronDownIcon size={13} />
              </span>
            </button>
          </div>
        </header>

        <main>
          {tab === 'tasks' && <TasksTab />}
          {tab === 'timeline' && <TimelineTab />}
          {tab === 'canvas' && <CanvasTab />}
          {tab === 'events' && <EventsTab />}
          {tab === 'dash' && <DashboardTab />}
          {tab === 'settings' && <SettingsTab />}
        </main>
      </div>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectDate={() => setTab('tasks')}
        onEditTask={task => setEditingTask(task)}
      />

      <EditTaskModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={s.updateTask}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenMembers={() => setIsTeamMembersOpen(true)}
      />

      <TeamMembersModal
        isOpen={isTeamMembersOpen}
        onClose={() => setIsTeamMembersOpen(false)}
      />

      <MorningBriefingModal
        isOpen={isMorningBriefingOpen}
        onClose={() => setIsMorningBriefingOpen(false)}
        onViewTodayTasks={() => setTab('tasks')}
      />

      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
      />

      {isScorecardOpen && (
        <MemberScorecardModal
          isOpen={isScorecardOpen}
          onClose={() => setIsScorecardOpen(false)}
        />
      )}

      <Notifier />
    </div>
  );
}