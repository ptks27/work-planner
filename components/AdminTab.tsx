'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/authStore';
import { usePlanner } from '@/lib/store';
import { DEFAULT_FIREBASE_CONFIG } from '@/lib/firebaseDefaultConfig';
import {
  firebaseAdminSubscribeAllTeams,
  firebaseAdminSubscribeTeamRequests,
  firebaseAdminFetchRoomStats,
  firebaseAdminUpdateTeam,
  firebaseAdminDeleteTeam,
  firebaseAdminRemoveMemberFromTeam,
  firebaseAdminApproveTeamRequest,
  firebaseAdminRejectTeamRequest,
  firebaseAdminDeleteTeamRequest,
  firebaseFetchUsers,
  firebaseFetchTeamMembers,
  generateTeamCode,
} from '@/lib/firebase';
import {
  isAdminUser,
  ADMIN_EMAIL,
  type Team,
  type TeamMember,
  type TeamCreationRequest,
  type AdminTeamRoomStats,
  type User,
} from '@/lib/types';
import { useModal } from './ModalContext';
import { AvatarIcon } from './Avatars';
import { VisionGlowCard, AnimatedNumber } from './AppleMotion';
import {
  ShieldIcon,
  BuildingIcon,
  UsersIcon,
  ClockIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  RefreshCwIcon,
  CopyIcon,
  PlusIcon,
  SparklesIcon,
  FileTextIcon,
  AlertCircleIcon,
} from './Icons';

type AdminSubTab = 'teams' | 'requests';
type RequestFilter = 'pending' | 'approved' | 'rejected' | 'all';

function formatThaiDateTime(ts?: number): string {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

export default function AdminTab() {
  const {
    currentUser,
    currentTeam,
    switchTeam,
    createTeam,
    handleTeamUpdatedByAdmin,
    handleTeamDeletedByAdmin,
  } = useAuth();
  const firebaseConfig = usePlanner(s => s.firebaseConfig);
  const activeCfg = firebaseConfig || DEFAULT_FIREBASE_CONFIG;
  const { showAlert, showConfirm } = useModal();

  const isAdmin = isAdminUser(currentUser);

  const [subTab, setSubTab] = useState<AdminSubTab>('teams');
  const [reqFilter, setReqFilter] = useState<RequestFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allRequests, setAllRequests] = useState<TeamCreationRequest[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [roomStats, setRoomStats] = useState<Record<string, AdminTeamRoomStats>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Edit Team Modal state
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editMembers, setEditMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Quick Admin Create Team Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Reject Reason Modal
  const [rejectingReq, setRejectingReq] = useState<TeamCreationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);

  const refreshMetadata = async () => {
    if (!isAdmin || !currentUser?.email) return;
    setLoadingStats(true);
    try {
      const [stats, usersList] = await Promise.all([
        firebaseAdminFetchRoomStats(currentUser.email, activeCfg),
        firebaseFetchUsers(activeCfg),
      ]);
      setRoomStats(stats);
      setAllUsers(usersList);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!isAdmin || !currentUser?.email) return;

    const unsubTeams = firebaseAdminSubscribeAllTeams(
      currentUser.email,
      teams => setAllTeams(teams),
      activeCfg
    );
    const unsubReqs = firebaseAdminSubscribeTeamRequests(
      currentUser.email,
      reqs => setAllRequests(reqs),
      activeCfg
    );

    refreshMetadata();

    return () => {
      if (unsubTeams) unsubTeams();
      if (unsubReqs) unsubReqs();
    };
  }, [isAdmin, currentUser?.email, activeCfg]);

  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    allUsers.forEach(u => {
      if (u.id) map.set(u.id, u);
    });
    return map;
  }, [allUsers]);

  const pendingRequests = useMemo(
    () => allRequests.filter(r => r.status === 'pending'),
    [allRequests]
  );
  const approvedRequests = useMemo(
    () => allRequests.filter(r => r.status === 'approved'),
    [allRequests]
  );
  const rejectedRequests = useMemo(
    () => allRequests.filter(r => r.status === 'rejected'),
    [allRequests]
  );

  const totalTasksAcrossRooms = useMemo(() => {
    return Object.values(roomStats).reduce((acc, st) => acc + (st.tasksCount || 0), 0);
  }, [roomStats]);

  const filteredTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allTeams;
    return allTeams.filter(t => {
      const creator = userMap.get(t.createdBy);
      const creatorName = (creator?.name || '').toLowerCase();
      const creatorEmail = (creator?.email || '').toLowerCase();
      const memberNames = (t.members || []).map(m => `${m.name} ${m.email}`).join(' ').toLowerCase();
      return (
        (t.name || '').toLowerCase().includes(q) ||
        (t.code || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        creatorName.includes(q) ||
        creatorEmail.includes(q) ||
        memberNames.includes(q)
      );
    });
  }, [allTeams, searchQuery, userMap]);

  const filteredRequests = useMemo(() => {
    const base =
      reqFilter === 'all'
        ? allRequests
        : allRequests.filter(r => r.status === reqFilter);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      r =>
        (r.teamName || '').toLowerCase().includes(q) ||
        (r.requesterName || '').toLowerCase().includes(q) ||
        (r.requesterEmail || '').toLowerCase().includes(q) ||
        (r.note || '').toLowerCase().includes(q)
    );
  }, [allRequests, reqFilter, searchQuery]);

  if (!isAdmin) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ display: 'inline-flex', padding: 14, borderRadius: 16, background: 'var(--red-l)', color: 'var(--red)', marginBottom: 12 }}>
          <ShieldIcon size={28} />
        </div>
        <h3 style={{ margin: '0 0 6px' }}>ไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแลระบบ</h3>
        <p className="mut" style={{ margin: 0, fontSize: 13 }}>
          หน้านี้สงวนสิทธิ์ไว้สำหรับผู้ดูแลระบบ ({ADMIN_EMAIL}) เท่านั้น
        </p>
      </div>
    );
  }

  const handleCopyCode = (code: string, teamId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(teamId);
    setTimeout(() => setCopiedCodeId(null), 1800);
  };

  const openEditTeamModal = async (team: Team) => {
    setEditingTeam(team);
    setEditName(team.name || '');
    setEditCode(team.code || '');
    setEditDesc(team.description || '');
    setEditError('');
    setEditMembers(team.members || []);
    setLoadingMembers(true);
    try {
      const freshMembers = await firebaseFetchTeamMembers(team.id, activeCfg);
      if (freshMembers.length > 0) {
        setEditMembers(freshMembers);
      }
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSaveTeamEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !currentUser?.email) return;
    setEditError('');
    if (!editName.trim()) {
      setEditError('กรุณาระบุชื่อทีม');
      return;
    }
    setEditSaving(true);
    const res = await firebaseAdminUpdateTeam(
      currentUser.email,
      editingTeam.id,
      {
        name: editName.trim(),
        code: editCode.trim().toUpperCase(),
        description: editDesc.trim(),
      },
      activeCfg
    );
    setEditSaving(false);

    if (!res.success || !res.team) {
      setEditError(res.error || 'ไม่สามารถบันทึกการแก้ไขได้');
      return;
    }

    handleTeamUpdatedByAdmin(res.team);
    setEditingTeam(null);
    showAlert('บันทึกสำเร็จ', `อัปเดตข้อมูลทีม "${res.team.name}" (#${res.team.code}) เรียบร้อยแล้ว`);
  };

  const handleRemoveMember = (member: TeamMember) => {
    if (!editingTeam || !currentUser?.email) return;
    showConfirm(
      'ยืนยันนำสมาชิกออกจากทีม',
      `ต้องการนำ "${member.name}" (${member.email || member.userId}) ออกจากทีม "${editingTeam.name}" ใช่หรือไม่?`,
      async () => {
        const res = await firebaseAdminRemoveMemberFromTeam(
          currentUser.email,
          editingTeam.id,
          member.userId,
          activeCfg
        );
        if (res.success) {
          setEditMembers(prev => prev.filter(m => m.userId !== member.userId));
          showAlert('สำเร็จ', `นำ "${member.name}" ออกจากทีมเรียบร้อยแล้ว`);
        } else {
          showAlert('ไม่สำเร็จ', res.error || 'ไม่สามารถนำสมาชิกออกได้');
        }
      },
      { confirmText: 'นำออกจากทีม', danger: true }
    );
  };

  const handleDeleteTeam = (team: Team) => {
    if (!currentUser?.email) return;
    const stats = roomStats[team.id];
    const extraInfo = stats
      ? `\n(ข้อมูลที่จะถูกลบ: งาน ${stats.tasksCount} รายการ, วันลา/โน้ต ${stats.eventsCount} รายการ, กระดานไอเดีย ${stats.boardsCount} บอร์ด)`
      : '';
    showConfirm(
      'ยืนยันการลบห้อง / ทีมถาวร',
      `ต้องการลบทีม "${team.name}" (#${team.code}) ออกจากฐานข้อมูลใช่หรือไม่?${extraInfo}\n\nการลบนี้ไม่สามารถย้อนกลับได้`,
      async () => {
        setBusyId(team.id);
        const res = await firebaseAdminDeleteTeam(currentUser.email, team.id, activeCfg);
        setBusyId(null);
        if (res.success) {
          await handleTeamDeletedByAdmin(team.id);
          await refreshMetadata();
          showAlert('ลบทีมเรียบร้อยแล้ว', `ลบทีม "${team.name}" ออกจากระบบเรียบร้อยแล้ว`);
        } else {
          showAlert('เกิดข้อผิดพลาด', res.error || 'ไม่สามารถลบทีมได้');
        }
      },
      { confirmText: 'ลบทีมถาวร', danger: true }
    );
  };

  const handleApproveRequest = async (req: TeamCreationRequest) => {
    if (!currentUser?.email) return;
    showConfirm(
      'อนุมัติคำขอสร้างทีม',
      `ยืนยันอนุมัติคำขอสร้างทีม "${req.teamName}" ของคุณ ${req.requesterName} (${req.requesterEmail})?\n\nระบบจะสร้างห้องทีมให้ทันทีและผู้ขอจะสามารถเข้าใช้งานตามขั้นตอนปกติได้ทันที`,
      async () => {
        setBusyId(req.id);
        const res = await firebaseAdminApproveTeamRequest(currentUser.email, req.id, activeCfg);
        setBusyId(null);
        if (res.success && res.team) {
          await refreshMetadata();
          showAlert(
            'อนุมัติและสร้างทีมสำเร็จ',
            `สร้างทีม "${res.team.name}" (รหัส #${res.team.code}) ให้คุณ ${req.requesterName} เรียบร้อยแล้ว`
          );
        } else {
          showAlert('ไม่สามารถอนุมัติได้', res.error || 'เกิดข้อผิดพลาด');
        }
      },
      { confirmText: 'อนุมัติ & สร้างทีม' }
    );
  };

  const openRejectModal = (req: TeamCreationRequest) => {
    setRejectingReq(req);
    setRejectReason('');
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReq || !currentUser?.email) return;
    setRejectSaving(true);
    const res = await firebaseAdminRejectTeamRequest(
      currentUser.email,
      rejectingReq.id,
      rejectReason.trim() || 'ผู้ดูแลระบบไม่อนุมัติ กรุณาลองใหม่อีกครั้ง',
      activeCfg
    );
    setRejectSaving(false);
    if (res.success) {
      const targetName = rejectingReq.teamName;
      setRejectingReq(null);
      setRejectReason('');
      showAlert('ดำเนินการแล้ว', `ปฏิเสธคำขอสร้างทีม "${targetName}" เรียบร้อยแล้ว`);
    } else {
      showAlert('เกิดข้อผิดพลาด', res.error || 'ไม่สามารถปฏิเสธคำขอได้');
    }
  };

  const handleDeleteRequestHistory = (req: TeamCreationRequest) => {
    if (!currentUser?.email) return;
    showConfirm(
      'ลบประวัติคำขอ',
      `ต้องการลบประวัติคำขอสร้างทีม "${req.teamName}" ออกจากรายการใช่หรือไม่?`,
      async () => {
        setBusyId(req.id);
        const res = await firebaseAdminDeleteTeamRequest(currentUser.email, req.id, activeCfg);
        setBusyId(null);
        if (!res.success) {
          showAlert('เกิดข้อผิดพลาด', res.error || 'ไม่สามารถลบประวัติได้');
        }
      },
      { confirmText: 'ลบประวัติ', danger: true }
    );
  };

  const handleAdminCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newTeamName.trim()) {
      setCreateError('กรุณาระบุชื่อทีม');
      return;
    }
    setCreateLoading(true);
    const res = await createTeam(newTeamName.trim());
    setCreateLoading(false);
    if (res.success && res.team) {
      setNewTeamName('');
      setIsCreateOpen(false);
      await refreshMetadata();
      showAlert('สร้างทีมสำเร็จ', `สร้างทีม "${res.team.name}" (#${res.team.code}) เรียบร้อยแล้ว`);
    } else {
      setCreateError(res.error || 'ไม่สามารถสร้างทีมได้');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Hero Banner */}
      <div className="card admin-hero-card">
        <div className="admin-hero-left">
          <div className="admin-hero-badge">
            <ShieldIcon size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--txt)' }}>
                ศูนย์ควบคุมผู้ดูแลระบบ (Admin Console)
              </h2>
              <span className="admin-role-chip">{ADMIN_EMAIL}</span>
            </div>
            <p className="mut" style={{ margin: '4px 0 0', fontSize: 13 }}>
              ตรวจสอบจำนวนห้อง/ทีมทั้งหมดในฐานข้อมูล แก้ไข ลบทีม และอนุมัติคำขอสร้างทีมใหม่แบบเรียลไทม์
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={refreshMetadata}
            disabled={loadingStats}
          >
            <RefreshCwIcon size={13} />
            <span>{loadingStats ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}</span>
          </button>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => {
              setCreateError('');
              setNewTeamName('');
              setIsCreateOpen(true);
            }}
          >
            <PlusIcon size={14} strokeWidth={2.5} />
            <span>สร้างห้องใหม่ทันที</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid g4">
        <VisionGlowCard
          className="card admin-kpi-card"
          glowColor="rgba(124, 58, 237, 0.22)"
          onClick={() => setSubTab('teams')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">ห้อง / ทีมในฐานข้อมูล</span>
            <span className="admin-kpi-icon" style={{ background: 'var(--pri-l)', color: 'var(--pri)' }}>
              <BuildingIcon size={15} />
            </span>
          </div>
          <div className="admin-kpi-value" style={{ color: 'var(--pri)' }}>
            <AnimatedNumber value={allTeams.length} />
            <span className="admin-kpi-unit">ห้อง</span>
          </div>
          <div className="admin-kpi-sub">ซิงค์สดจาก Firestore (teams)</div>
        </VisionGlowCard>

        <VisionGlowCard
          className="card admin-kpi-card"
          glowColor={pendingRequests.length > 0 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.2)'}
          onClick={() => {
            setSubTab('requests');
            setReqFilter('pending');
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">คำขอสร้างทีมรออนุมัติ</span>
            <span
              className="admin-kpi-icon"
              style={{
                background: pendingRequests.length > 0 ? 'rgba(245, 158, 11, 0.16)' : 'var(--ok-l)',
                color: pendingRequests.length > 0 ? 'var(--warn)' : 'var(--ok)',
              }}
            >
              <ClockIcon size={15} />
            </span>
          </div>
          <div
            className="admin-kpi-value"
            style={{ color: pendingRequests.length > 0 ? 'var(--warn)' : 'var(--ok)' }}
          >
            <AnimatedNumber value={pendingRequests.length} />
            <span className="admin-kpi-unit">คำขอ</span>
          </div>
          <div className="admin-kpi-sub">
            {pendingRequests.length > 0 ? 'คลิกเพื่อตรวจสอบและอนุมัติ' : 'ไม่มีคำขอค้างอนุมัติ'}
          </div>
        </VisionGlowCard>

        <VisionGlowCard className="card admin-kpi-card" glowColor="rgba(16, 185, 129, 0.2)">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">บัญชีผู้ใช้ในระบบ</span>
            <span className="admin-kpi-icon" style={{ background: 'var(--ok-l)', color: 'var(--ok)' }}>
              <UsersIcon size={15} />
            </span>
          </div>
          <div className="admin-kpi-value">
            <AnimatedNumber value={allUsers.length} />
            <span className="admin-kpi-unit">บัญชี</span>
          </div>
          <div className="admin-kpi-sub">ลงทะเบียนในฐานข้อมูลทั้งหมด</div>
        </VisionGlowCard>

        <VisionGlowCard className="card admin-kpi-card" glowColor="rgba(168, 85, 247, 0.2)">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">ปริมาณงานรวมทุกห้อง</span>
            <span className="admin-kpi-icon" style={{ background: 'rgba(168, 85, 247, 0.14)', color: 'var(--purple)' }}>
              <FileTextIcon size={15} />
            </span>
          </div>
          <div className="admin-kpi-value">
            <AnimatedNumber value={totalTasksAcrossRooms} />
            <span className="admin-kpi-unit">งาน</span>
          </div>
          <div className="admin-kpi-sub">รวมจาก {Object.keys(roomStats).length} ห้องที่มีข้อมูล</div>
        </VisionGlowCard>
      </div>

      {/* Main Content Card */}
      <div className="card task-panel-card">
        <div className="admin-toolbar">
          <div className="task-panel-tabs cols-2" style={{ maxWidth: 440 }} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'teams'}
              className={`task-panel-tab ${subTab === 'teams' ? 'active' : ''}`}
              onClick={() => setSubTab('teams')}
            >
              <BuildingIcon size={14} />
              <span className="task-panel-tab-label">จัดการทีม / ห้องทั้งหมด</span>
              <span className="task-panel-tab-count">{allTeams.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'requests'}
              className={`task-panel-tab ${subTab === 'requests' ? 'active' : ''}`}
              onClick={() => setSubTab('requests')}
            >
              <ClockIcon size={14} />
              <span className="task-panel-tab-label">คำขอสร้างทีม</span>
              <span className={`task-panel-tab-count ${pendingRequests.length > 0 ? 'is-hot' : ''}`}>
                {pendingRequests.length}
              </span>
            </button>
          </div>

          <div className="admin-search-wrap">
            <SearchIcon size={14} className="admin-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                subTab === 'teams'
                  ? 'ค้นหาชื่อทีม, รหัสทีม, หรือผู้สร้าง...'
                  : 'ค้นหาชื่อทีมที่ขอ, ชื่อผู้ขอ, อีเมล...'
              }
            />
            {searchQuery && (
              <button
                type="button"
                className="admin-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="ล้างคำค้นหา"
              >
                <CloseIcon size={12} />
              </button>
            )}
          </div>
        </div>

        {/* SUB-TAB 1: ALL TEAMS IN DATABASE */}
        {subTab === 'teams' && (
          <>
            {filteredTeams.length === 0 ? (
              <div className="empty-state-box">
                <div className="empty-state-emoji">🏢</div>
                <div className="empty-state-title">
                  {searchQuery ? 'ไม่พบทีมที่ตรงกับคำค้นหา' : 'ยังไม่มีทีมในฐานข้อมูล'}
                </div>
                <div className="empty-state-sub">
                  {searchQuery
                    ? 'ลองค้นหาด้วยชื่อทีมหรือรหัสทีมอื่น'
                    : 'กดปุ่ม "สร้างห้องใหม่ทันที" เพื่อเริ่มสร้างห้องแรกของระบบ'}
                </div>
              </div>
            ) : (
              <div className="admin-teams-grid">
                {filteredTeams.map(team => {
                  const stats = roomStats[team.id];
                  const creator = userMap.get(team.createdBy);
                  const creatorFromMembers = (team.members || []).find(m => m.userId === team.createdBy);
                  const creatorName = creator?.name || creatorFromMembers?.name || 'ไม่ระบุ';
                  const creatorEmail = creator?.email || creatorFromMembers?.email || '';
                  const memberCount = Math.max(team.memberIds?.length || 0, team.members?.length || 0);
                  const isCurrentActive = currentTeam?.id === team.id;
                  const adminIsMember =
                    Boolean(currentUser?.id) &&
                    ((team.memberIds || []).includes(currentUser!.id) || team.createdBy === currentUser!.id);

                  return (
                    <div key={team.id} className={`admin-team-card ${isCurrentActive ? 'is-active' : ''}`}>
                      <div className="admin-team-card-head">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                          <div className="admin-team-icon">
                            <BuildingIcon size={17} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <b className="admin-team-name">{team.name}</b>
                              {isCurrentActive && (
                                <span className="task-panel-badge is-today">กำลังใช้งาน</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="admin-code-pill"
                                onClick={() => handleCopyCode(team.code, team.id)}
                                title="คลิกเพื่อคัดลอกรหัสทีม"
                              >
                                <span>#{team.code}</span>
                                {copiedCodeId === team.id ? (
                                  <CheckIcon size={11} color="var(--ok)" />
                                ) : (
                                  <CopyIcon size={11} />
                                )}
                              </button>
                              <span style={{ fontSize: 11, color: 'var(--mut)' }}>
                                สร้างเมื่อ {formatThaiDateTime(team.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {team.description && (
                        <p className="admin-team-desc">{team.description}</p>
                      )}

                      <div className="admin-team-meta">
                        <div className="admin-meta-pill">
                          <UsersIcon size={12} color="var(--pri)" />
                          <span>{memberCount} สมาชิก</span>
                        </div>
                        <div className="admin-meta-pill">
                          <FileTextIcon size={12} color="var(--ok)" />
                          <span>{stats?.tasksCount ?? 0} งาน</span>
                        </div>
                        <div className="admin-meta-pill">
                          <span>วันลา/โน้ต {stats?.eventsCount ?? 0}</span>
                        </div>
                      </div>

                      <div className="admin-team-creator-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span style={{ fontSize: 11.5, color: 'var(--mut)', flexShrink: 0 }}>ผู้สร้าง:</span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--txt)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {creatorName}
                            {creatorEmail ? ` (${creatorEmail})` : ''}
                          </span>
                        </div>

                        {(team.members || []).length > 0 && (
                          <div className="admin-avatar-stack">
                            {(team.members || []).slice(0, 4).map(m => (
                              <span key={m.userId} className="admin-avatar-ring" title={`${m.name} (${m.email || m.teamRole})`}>
                                <AvatarIcon id={m.avatarId || 'dev_boy'} size={22} />
                              </span>
                            ))}
                            {(team.members || []).length > 4 && (
                              <span className="admin-avatar-more">+{(team.members || []).length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="admin-team-actions">
                        {adminIsMember && !isCurrentActive && (
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => switchTeam(team.id)}
                          >
                            <span>เข้าห้องนี้</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => openEditTeamModal(team)}
                          disabled={busyId === team.id}
                        >
                          <EditIcon size={13} />
                          <span>แก้ไขทีม</span>
                        </button>
                        <button
                          type="button"
                          className="btn soft-red sm"
                          onClick={() => handleDeleteTeam(team)}
                          disabled={busyId === team.id}
                        >
                          <TrashIcon size={13} />
                          <span>{busyId === team.id ? 'กำลังลบ...' : 'ลบทีม'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* SUB-TAB 2: TEAM CREATION REQUESTS */}
        {subTab === 'requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="chips" style={{ margin: 0, width: 'fit-content' }}>
              <button
                type="button"
                className={`chip ${reqFilter === 'pending' ? 'on' : ''}`}
                onClick={() => setReqFilter('pending')}
              >
                <span>รออนุมัติ</span>
                <span className={`task-panel-tab-count ${pendingRequests.length > 0 ? 'is-hot' : ''}`}>
                  {pendingRequests.length}
                </span>
              </button>
              <button
                type="button"
                className={`chip ${reqFilter === 'approved' ? 'on' : ''}`}
                onClick={() => setReqFilter('approved')}
              >
                <span>อนุมัติแล้ว</span>
                <span className="task-panel-tab-count">{approvedRequests.length}</span>
              </button>
              <button
                type="button"
                className={`chip ${reqFilter === 'rejected' ? 'on' : ''}`}
                onClick={() => setReqFilter('rejected')}
              >
                <span>ไม่อนุมัติ</span>
                <span className="task-panel-tab-count">{rejectedRequests.length}</span>
              </button>
              <button
                type="button"
                className={`chip ${reqFilter === 'all' ? 'on' : ''}`}
                onClick={() => setReqFilter('all')}
              >
                <span>ทั้งหมด</span>
                <span className="task-panel-tab-count">{allRequests.length}</span>
              </button>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="empty-state-box">
                <div className="empty-state-emoji">
                  {reqFilter === 'pending' ? '✨' : '📋'}
                </div>
                <div className="empty-state-title">
                  {reqFilter === 'pending'
                    ? 'ไม่มีคำขอสร้างทีมที่รออนุมัติ'
                    : 'ไม่พบรายการคำขอในหมวดนี้'}
                </div>
                <div className="empty-state-sub">
                  เมื่อผู้ใช้ส่งคำขอสร้างทีมใหม่ รายการจะเด้งขึ้นมาที่นี่ทันทีแบบเรียลไทม์
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredRequests.map(req => {
                  const isBusy = busyId === req.id;
                  return (
                    <div key={req.id} className={`admin-req-card status-${req.status}`}>
                      <div className="admin-req-main">
                        <div style={{ flexShrink: 0 }}>
                          <AvatarIcon id={req.requesterAvatar || 'dev_boy'} size={40} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--txt)' }}>
                              {req.teamName}
                            </span>
                            {req.status === 'pending' && (
                              <span className="task-panel-badge is-past">รอผู้ดูแลระบบอนุมัติ</span>
                            )}
                            {req.status === 'approved' && (
                              <span className="admin-status-badge approved">
                                <CheckIcon size={11} /> อนุมัติแล้ว
                                {req.createdTeamCode ? ` · #${req.createdTeamCode}` : ''}
                              </span>
                            )}
                            {req.status === 'rejected' && (
                              <span className="admin-status-badge rejected">
                                <CloseIcon size={11} /> ไม่อนุมัติ
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: 12.5, color: 'var(--mut)', marginTop: 3 }}>
                            ผู้ขอ: <b style={{ color: 'var(--txt)' }}>{req.requesterName}</b> ({req.requesterEmail}) · ส่งเมื่อ {formatThaiDateTime(req.createdAt)}
                          </div>

                          {req.note && (
                            <div className="admin-req-note">
                              หมายเหตุจากผู้ขอ: {req.note}
                            </div>
                          )}

                          {req.status === 'rejected' && req.rejectReason && (
                            <div className="admin-req-reject-reason">
                              <AlertCircleIcon size={13} />
                              <span>เหตุผล: {req.rejectReason}</span>
                            </div>
                          )}

                          {req.resolvedAt && (
                            <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 4 }}>
                              ดำเนินการโดย {req.resolvedBy || ADMIN_EMAIL} เมื่อ {formatThaiDateTime(req.resolvedAt)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="admin-req-actions">
                        {req.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              className="btn ok sm"
                              disabled={isBusy}
                              onClick={() => handleApproveRequest(req)}
                            >
                              <CheckIcon size={13} />
                              <span>{isBusy ? 'กำลังสร้างทีม...' : 'อนุมัติ'}</span>
                            </button>
                            <button
                              type="button"
                              className="btn soft-red sm"
                              disabled={isBusy}
                              onClick={() => openRejectModal(req)}
                            >
                              <CloseIcon size={13} />
                              <span>ไม่อนุมัติ</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="icon-btn"
                            disabled={isBusy}
                            onClick={() => handleDeleteRequestHistory(req)}
                            title="ลบประวัติคำขอนี้"
                            aria-label="ลบประวัติคำขอ"
                          >
                            <TrashIcon size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Edit Team Modal */}
      {editingTeam && (
        <div className="modal-overlay" onClick={() => !editSaving && setEditingTeam(null)}>
          <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <EditIcon size={17} color="var(--pri)" />
                <span>แก้ไขข้อมูลทีม</span>
              </h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => !editSaving && setEditingTeam(null)}
                aria-label="ปิด"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTeamEdit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {editError && (
                <div className="auth-alert err" style={{ margin: 0 }}>
                  {editError}
                </div>
              )}

              <div>
                <label>ชื่อทีม *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="ชื่อทีม..."
                  disabled={editSaving}
                />
              </div>

              <div>
                <label>รหัสเข้าร่วมทีม (Team Code)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={editCode}
                    onChange={e => setEditCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    maxLength={8}
                    style={{ fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0 }}
                    disabled={editSaving}
                  />
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setEditCode(generateTeamCode())}
                    disabled={editSaving}
                  >
                    <RefreshCwIcon size={13} />
                    <span>สุ่มรหัสใหม่</span>
                  </button>
                </div>
              </div>

              <div>
                <label>คำอธิบาย / หมายเหตุห้อง (ไม่บังคับ)</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="ระบุรายละเอียดหรือแผนกของทีมนี้..."
                  disabled={editSaving}
                />
              </div>

              {/* Team Members Management */}
              <div className="macos-inset-section" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <b style={{ fontSize: 12.5, color: 'var(--txt)' }}>
                    สมาชิกในทีม ({editMembers.length} คน)
                  </b>
                  {loadingMembers && <small className="mut">กำลังโหลด...</small>}
                </div>

                {editMembers.length === 0 ? (
                  <div className="mut" style={{ fontSize: 12 }}>ยังไม่มีข้อมูลสมาชิก</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                    {editMembers.map(m => {
                      const isOwner = m.teamRole === 'owner' || editingTeam.createdBy === m.userId;
                      return (
                        <div
                          key={m.userId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '6px 8px',
                            borderRadius: 10,
                            background: 'var(--card-solid)',
                            border: '1px solid var(--line)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <AvatarIcon id={m.avatarId || 'dev_boy'} size={28} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--txt)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {m.name}
                                </span>
                                {isOwner && <span className="task-panel-badge is-today">ผู้สร้าง</span>}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--mut)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.email || m.userId}
                              </div>
                            </div>
                          </div>

                          {!isOwner && (
                            <button
                              type="button"
                              className="btn soft-red xs"
                              onClick={() => handleRemoveMember(m)}
                            >
                              นำออก
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setEditingTeam(null)}
                  disabled={editSaving}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn primary sm" disabled={editSaving}>
                  <CheckIcon size={13} />
                  <span>{editSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Admin Quick Create Team */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => !createLoading && setIsCreateOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <SparklesIcon size={17} color="var(--pri)" />
                <span>สร้างห้อง / ทีมใหม่ทันที (Admin)</span>
              </h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => !createLoading && setIsCreateOpen(false)}
                aria-label="ปิด"
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <form onSubmit={handleAdminCreateTeam} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {createError && <div className="auth-alert err" style={{ margin: 0 }}>{createError}</div>}
              <div>
                <label>ชื่อทีมใหม่ *</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder="เช่น ทีมพัฒนาหลัก, ฝ่ายปฏิบัติการ..."
                  autoFocus
                  disabled={createLoading}
                />
              </div>
              <small className="mut" style={{ fontSize: 12 }}>
                บัญชีผู้ดูแลระบบสามารถสร้างทีมได้ทันทีโดยไม่ต้องส่งคำขออนุมัติ
              </small>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button type="button" className="btn ghost sm" onClick={() => setIsCreateOpen(false)} disabled={createLoading}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn primary sm" disabled={createLoading}>
                  {createLoading ? 'กำลังสร้าง...' : 'สร้างทีมทันที'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reject Team Request Reason */}
      {rejectingReq && (
        <div className="modal-overlay" onClick={() => !rejectSaving && setRejectingReq(null)}>
          <div className="modal-box" style={{ maxWidth: 430 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: 'var(--red)' }}>
                <AlertCircleIcon size={18} color="var(--red)" />
                <span>ยืนยันไม่อนุมัติคำขอสร้างทีม</span>
              </h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => !rejectSaving && setRejectingReq(null)}
                aria-label="ปิด"
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <form onSubmit={handleConfirmReject} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--txt)' }}>
                คำขอสร้างทีม <b>&ldquo;{rejectingReq.teamName}&rdquo;</b> โดย {rejectingReq.requesterName} ({rejectingReq.requesterEmail})
              </div>
              <div>
                <label>เหตุผลเพิ่มเติม (ไม่บังคับ)</label>
                <textarea
                  rows={2}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="หากเว้นว่าง ระบบจะแจ้งว่า: ผู้ดูแลระบบไม่อนุมัติ กรุณาลองใหม่อีกครั้ง"
                  disabled={rejectSaving}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button type="button" className="btn ghost sm" onClick={() => setRejectingReq(null)} disabled={rejectSaving}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn red sm" disabled={rejectSaving}>
                  {rejectSaving ? 'กำลังบันทึก...' : 'ยืนยันไม่อนุมัติ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
