'use client';
import { useState, useEffect } from 'react';
import Sidebar, { TABS, type TabId } from '@/components/Sidebar';
import Notifier from '@/components/Notifier';
import TasksTab from '@/components/TasksTab';
import RecurringTab from '@/components/RecurringTab';
import EventsTab from '@/components/EventsTab';
import DashboardTab from '@/components/DashboardTab';
import SettingsTab from '@/components/SettingsTab';
import SearchModal from '@/components/SearchModal';
import EditTaskModal from '@/components/EditTaskModal';
import AuthScreen from '@/components/AuthScreen';
import TeamSelectScreen from '@/components/TeamSelectScreen';
import ProfileModal from '@/components/ProfileModal';
import TeamSwitcher from '@/components/TeamSwitcher';
import TeamMembersModal from '@/components/TeamMembersModal';
import MorningBriefingModal from '@/components/MorningBriefingModal';
import { AvatarIcon } from '@/components/Avatars';
import { useToday } from '@/lib/hooks';
import { thDate } from '@/lib/utils';
import { usePlanner, setSyncingFromCloud, syncPlannerToFirebase } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
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
} from '@/components/Icons';

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabId>('tasks');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTeamMembersOpen, setIsTeamMembersOpen] = useState(false);
  const [isMorningBriefingOpen, setIsMorningBriefingOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [reportCopied, setReportCopied] = useState(false);
  const [teamCodeCopied, setTeamCodeCopied] = useState(false);
  const today = useToday();
  const s = usePlanner();
  const { currentUser, currentTeam, teamMembers, fetchTeamMembers, leaveTeam } = useAuth();
  const cur = TABS.find(t => t.id === tab) || TABS[0];

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
    if (!mounted || !s.firebaseConfig || !currentUser?.teamId) return;

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
      s.firebaseConfig,
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

          {/* Right: Date, Daily Report, Theme Toggle & User Profile */}
          <div className="nav-right">
            {/* Today's Date with Live Indicator */}
            <div className="nav-today-pill" title={`วันที่ปัจจุบัน: ${thDate(today)}`}>
              <span className="nav-live-dot" />
              <span>{thDate(today)}</span>
            </div>

            {/* Morning Briefing Trigger Button */}
            <button
              className="nav-action-btn"
              onClick={() => setIsMorningBriefingOpen(true)}
              title="เปิดดูสรุปภาพรวมยามเช้า (Morning Briefing)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>🌅</span>
              <span>สรุปเช้านี้</span>
            </button>

            {/* Daily Report Button */}
            <button
              className="nav-action-btn primary"
              onClick={handleCopyReport}
              title="คัดลอกสรุปงานประจำวันสำหรับส่ง LINE / Slack"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {reportCopied ? <ClipboardCheckIcon size={15} /> : <ClipboardIcon size={15} />}
              <span>{reportCopied ? 'คัดลอกแล้ว!' : 'สรุปงานวันนี้'}</span>
            </button>

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

      <Notifier />
    </div>
  );
}