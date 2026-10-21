import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Team, TeamMember, AvatarId } from './types';
import { uid } from './utils';
import { DEFAULT_FIREBASE_CONFIG } from './firebaseDefaultConfig';
import {
  firebaseRegisterUser,
  firebaseLoginUser,
  firebaseCreateTeam,
  firebaseJoinTeam,
  firebaseLeaveTeam,
  firebaseRemoveMemberFromTeam,
  firebaseFetchTeam,
  firebaseFetchTeamUsers,
  firebaseFetchTeamMembers,
  firebaseFetchUserTeams,
  firebaseSwitchActiveTeam,
  downloadFromFirebase,
  generateTeamCode,
} from './firebase';
import { usePlanner } from './store';

const DEFAULT_AVATARS: AvatarId[] = [
  'dev_boy',
  'office_girl',
  'creative_guy',
  'active_girl',
  'bot_mascot',
  'manager_suit',
  'coffee_coder',
  'cyber_hacker',
  'cat_lover',
  'data_analyst',
  'music_producer',
  'gamer_streamer',
  'plant_doctor',
  'astro_explorer',
  'pixel_ninja',
];

const getFirebaseCfg = () => usePlanner.getState().firebaseConfig || DEFAULT_FIREBASE_CONFIG;

interface AuthState {
  currentUser: User | null;
  currentTeam: Team | null;
  userTeams: Team[];
  teamMembers: TeamMember[];
  users: User[];
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  updateProfile: (patch: { name?: string; avatarId?: AvatarId; role?: string; department?: string }) => void;
  createTeam: (teamName: string) => Promise<{ success: boolean; team?: Team; error?: string }>;
  joinTeam: (teamCode: string) => Promise<{ success: boolean; team?: Team; error?: string }>;
  switchTeam: (teamId: string) => Promise<{ success: boolean; team?: Team; error?: string }>;
  leaveTeam: (teamId?: string) => Promise<{ success: boolean; error?: string }>;
  removeMember: (targetUserId: string) => Promise<{ success: boolean; error?: string }>;
  fetchUserTeams: () => Promise<Team[]>;
  fetchTeamMembers: (teamId?: string) => Promise<TeamMember[]>;
  syncTeamUsers: () => Promise<void>;
  getAllUsers: () => User[];
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      currentTeam: null,
      userTeams: [],
      teamMembers: [],
      users: [],

      login: async (email, password) => {
        const cleanEmail = email.trim().toLowerCase();
        const firebaseCfg = getFirebaseCfg();

        // 1. ลองตรวจสอบกับ Firebase Firestore ก่อน (ถ้ามีการตั้งค่า Firebase)
        if (firebaseCfg) {
          const fbRes = await firebaseLoginUser(cleanEmail, password, firebaseCfg);
          if (fbRes.success && fbRes.user) {
            const user = fbRes.user;
            let team: Team | null = null;
            if (user.teamId) {
              team = await firebaseFetchTeam(user.teamId, firebaseCfg);
              const planRes = await downloadFromFirebase(firebaseCfg, user.teamId);
              if (planRes.success && planRes.data) {
                usePlanner.getState().restore(planRes.data);
              }
            }

            const allTeams = await firebaseFetchUserTeams(user.id, firebaseCfg);
            if (!team && allTeams.length > 0) {
              team = allTeams[0];
              user.teamId = team.id;
              user.teamCode = team.code;
              user.teamName = team.name;
            }

            set(state => {
              const exists = state.users.some(u => u.id === user.id);
              return {
                currentUser: user,
                currentTeam: team,
                userTeams: allTeams,
                users: exists ? state.users.map(u => (u.id === user.id ? user : u)) : [...state.users, user],
              };
            });
            await get().fetchTeamMembers(team?.id || user.teamId);
            return { success: true };
          }
          if (fbRes.error && fbRes.error.includes('รหัสผ่านไม่ถูกต้อง')) {
            return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
          }
        }

        // 2. ถ้าไม่พบใน Firebase หรือไม่มี Firebase ให้ตรวจสอบกับข้อมูลในเครื่อง (Local)
        const found = get().users.find(u => (u.email || '').toLowerCase() === cleanEmail);
        if (!found) {
          return { success: false, error: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาสมัครสมาชิก' };
        }
        if (password && found.password && found.password !== password) {
          return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
        }
        set({ currentUser: found });
        await get().fetchTeamMembers(found.teamId);
        return { success: true };
      },

      register: async (name, email, password) => {
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        const firebaseCfg = getFirebaseCfg();

        if (!cleanName) {
          return { success: false, error: 'กรุณากรอกชื่อ-นามสกุล' };
        }
        if (!cleanEmail || !cleanEmail.includes('@')) {
          return { success: false, error: 'กรุณากรอกอีเมลให้ถูกต้อง' };
        }

        // สุ่ม Avatar ให้ผู้สมัครใหม่จาก 5 แบบ
        const randomAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];

        const newUser: User = {
          id: `u-${uid()}`,
          name: cleanName,
          email: cleanEmail,
          password: password || '123456',
          avatarId: randomAvatar,
          role: 'Team Member',
          department: 'General',
          createdAt: Date.now(),
        };

        // 1. บันทึกไปยัง Firebase Firestore (ถ้ามีการตั้งค่า Firebase)
        if (firebaseCfg) {
          const fbRes = await firebaseRegisterUser(newUser, firebaseCfg);
          if (!fbRes.success) {
            return { success: false, error: fbRes.error };
          }
        } else {
          // ถ้าไม่มี Firebase ให้เช็คซ้ำใน Local
          const existing = get().users.find(u => (u.email || '').toLowerCase() === cleanEmail);
          if (existing) {
            return { success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ' };
          }
        }

        // 2. บันทึกและล็อกอินใน Local
        set(state => ({
          users: [...state.users.filter(u => (u.email || '').toLowerCase() !== cleanEmail), newUser],
          currentUser: newUser,
          currentTeam: null,
          userTeams: [],
          teamMembers: [],
        }));

        return { success: true, user: newUser };
      },

      createTeam: async (teamName: string) => {
        const user = get().currentUser;
        if (!user) return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนสร้างทีม' };

        const firebaseCfg = getFirebaseCfg();
        const res = await firebaseCreateTeam(teamName, user, firebaseCfg);
        if (!res.success || !res.team) {
          return { success: false, error: res.error || 'ไม่สามารถสร้างทีมได้' };
        }

        const team = res.team;
        const updatedUser: User = {
          ...user,
          teamId: team.id,
          teamCode: team.code,
          teamName: team.name,
          teamIds: Array.from(new Set([...(user.teamIds || []), team.id])),
        };

        // ล้างงานเก่าออกเพื่อให้พร้อมสำหรับพื้นที่ทีมใหม่
        usePlanner.getState().restore({ tasks: [], rules: [], events: [] });

        set(state => ({
          currentUser: updatedUser,
          currentTeam: team,
          userTeams: [...state.userTeams.filter(t => t.id !== team.id), team],
          users: state.users.map(u => (u.id === user.id ? updatedUser : u)),
        }));

        await get().fetchTeamMembers(team.id);

        return { success: true, team };
      },

      joinTeam: async (teamCode: string) => {
        const user = get().currentUser;
        if (!user) return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนเข้าร่วมทีม' };

        const firebaseCfg = getFirebaseCfg();
        const res = await firebaseJoinTeam(teamCode, user, firebaseCfg);
        if (!res.success || !res.team) {
          return { success: false, error: res.error || 'ไม่พบทีมหรือรหัสไม่ถูกต้อง' };
        }

        const team = res.team;
        const updatedUser: User = {
          ...user,
          teamId: team.id,
          teamCode: team.code,
          teamName: team.name,
          teamIds: Array.from(new Set([...(user.teamIds || []), team.id])),
        };

        // กู้คืนงานและวันหยุดของทีมที่เข้าร่วม
        if (res.plannerData) {
          usePlanner.getState().restore(res.plannerData);
        } else {
          usePlanner.getState().restore({ tasks: [], rules: [], events: [] });
        }

        set(state => ({
          currentUser: updatedUser,
          currentTeam: team,
          userTeams: [...state.userTeams.filter(t => t.id !== team.id), team],
          users: state.users.map(u => (u.id === user.id ? updatedUser : u)),
        }));

        // ซิงค์สมาชิกในทีมทันที
        await get().syncTeamUsers();

        return { success: true, team };
      },

      switchTeam: async (teamId: string) => {
        const user = get().currentUser;
        if (!user) return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
        if (user.teamId === teamId && get().currentTeam?.id === teamId) {
          return { success: true, team: get().currentTeam || undefined };
        }

        let targetTeam = get().userTeams.find(t => t.id === teamId);
        const firebaseCfg = getFirebaseCfg();

        if (!targetTeam && firebaseCfg) {
          targetTeam = (await firebaseFetchTeam(teamId, firebaseCfg)) || undefined;
        }

        if (!targetTeam) {
          return { success: false, error: 'ไม่พบข้อมูลทีมนี้' };
        }

        if (firebaseCfg) {
          await firebaseSwitchActiveTeam(user.id, targetTeam, firebaseCfg);
        }

        const updatedUser: User = {
          ...user,
          teamId: targetTeam.id,
          teamCode: targetTeam.code,
          teamName: targetTeam.name,
        };

        // เคลียร์งานเดิมเพื่อให้ห้องทีมใหม่โหลดข้อมูลสดของทีมนั้น
        usePlanner.getState().restore({ tasks: [], rules: [], events: [] });

        set(state => ({
          currentUser: updatedUser,
          currentTeam: targetTeam,
          userTeams: state.userTeams.some(t => t.id === targetTeam!.id)
            ? state.userTeams
            : [...state.userTeams, targetTeam!],
        }));

        // ซิงค์สมาชิกของทีมใหม่
        await get().syncTeamUsers();

        return { success: true, team: targetTeam };
      },

      leaveTeam: async (targetTeamId?: string) => {
        const user = get().currentUser;
        if (!user) return { success: false, error: 'กรุณาเข้าสู่ระบบ' };

        const teamIdToLeave = targetTeamId || user.teamId;
        if (!teamIdToLeave) return { success: false, error: 'ไม่มีทีมที่ต้องการออก' };

        const firebaseCfg = getFirebaseCfg();
        let remainingTeams: Team[] = get().userTeams.filter(t => t.id !== teamIdToLeave);

        if (firebaseCfg) {
          const res = await firebaseLeaveTeam(teamIdToLeave, user, firebaseCfg);
          if (res.remainingTeams) {
            remainingTeams = res.remainingTeams;
          }
        }

        const isLeavingActive = user.teamId === teamIdToLeave;
        const nextTeam = isLeavingActive
          ? (remainingTeams.length > 0 ? remainingTeams[0] : null)
          : get().currentTeam;

        const updatedUser: User = {
          ...user,
          teamId: nextTeam ? nextTeam.id : undefined,
          teamCode: nextTeam ? nextTeam.code : undefined,
          teamName: nextTeam ? nextTeam.name : undefined,
          teamIds: remainingTeams.map(t => t.id),
        };

        if (isLeavingActive) {
          // ล้างงานของทีมที่เพิ่งออกไป
          usePlanner.getState().restore({ tasks: [], rules: [], events: [] });
        }

        set({
          currentUser: updatedUser,
          currentTeam: nextTeam,
          userTeams: remainingTeams,
        });

        if (nextTeam) {
          await get().syncTeamUsers();
        }

        return { success: true };
      },

      removeMember: async (targetUserId: string) => {
        const currentUser = get().currentUser;
        const currentTeam = get().currentTeam;
        if (!currentUser || !currentTeam) {
          return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
        }

        // สิทธิ์: ต้องเป็นผู้สร้างทีม (createdBy) หรือมี role เป็น owner/admin
        const isOwner =
          currentTeam.createdBy === currentUser.id ||
          currentUser.role === 'admin' ||
          get().teamMembers.some(m => m.userId === currentUser.id && m.teamRole === 'owner');

        if (!isOwner) {
          return { success: false, error: 'เฉพาะหัวหน้าทีม/ผู้สร้างทีมเท่านั้นที่สามารถนำสมาชิกออกได้' };
        }

        if (targetUserId === currentUser.id) {
          return { success: false, error: 'ไม่สามารถนำตนเองออกจากทีมได้ หากต้องการออกกรุณาใช้เมนูออกจากทีม' };
        }

        const firebaseCfg = getFirebaseCfg();
        if (firebaseCfg) {
          const res = await firebaseRemoveMemberFromTeam(currentTeam.id, targetUserId, firebaseCfg);
          if (!res.success) {
            return { success: false, error: res.error || 'ไม่สามารถนำสมาชิกออกจากทีมได้' };
          }
        }

        // อัปเดตในเครื่อง
        const updatedMemberIds = (currentTeam.memberIds || []).filter(id => id !== targetUserId);
        const updatedMembers = (get().teamMembers || []).filter(m => m.userId !== targetUserId);
        const updatedTeam: Team = {
          ...currentTeam,
          memberIds: updatedMemberIds,
          members: updatedMembers,
        };

        set(state => ({
          currentTeam: updatedTeam,
          teamMembers: updatedMembers,
          users: state.users.map(u => {
            if (u.id === targetUserId) {
              return { ...u, teamId: undefined, teamCode: undefined, teamName: undefined };
            }
            return u;
          }),
        }));

        await get().fetchTeamMembers(currentTeam.id);
        return { success: true };
      },

      fetchUserTeams: async () => {
        const user = get().currentUser;
        if (!user) return [];
        const firebaseCfg = getFirebaseCfg();
        if (firebaseCfg) {
          const teams = await firebaseFetchUserTeams(user.id, firebaseCfg);
          set({ userTeams: teams });
          return teams;
        }
        return get().userTeams;
      },

      fetchTeamMembers: async (teamId?: string) => {
        const user = get().currentUser;
        const targetTeamId = teamId || user?.teamId || get().currentTeam?.id;
        if (!targetTeamId) {
          set({ teamMembers: [] });
          return [];
        }

        const firebaseCfg = getFirebaseCfg();
        if (firebaseCfg) {
          const members = await firebaseFetchTeamMembers(targetTeamId, firebaseCfg);
          if (members.length > 0) {
            set({ teamMembers: members });
            return members;
          }
        }

        // โหมด Local หรือเมื่อไม่มี Firebase
        const curTeam = get().currentTeam;
        const memberIds = curTeam?.memberIds || (user ? [user.id] : []);
        const localUsers = get().users;
        const members: TeamMember[] = [];

        memberIds.forEach(id => {
          const found = localUsers.find(u => u.id === id) || (user?.id === id ? user : null);
          const isOwner = curTeam?.createdBy === id || user?.id === id;
          if (found) {
            members.push({
              userId: found.id,
              name: found.name || 'สมาชิก',
              email: found.email || '',
              avatarId: found.avatarId || 'dev_boy',
              role: found.role || (isOwner ? 'ผู้สร้างทีม' : 'สมาชิกทั่วไป'),
              department: found.department || 'General',
              teamRole: isOwner ? 'owner' : 'member',
              joinedAt: curTeam?.createdAt || found.createdAt || Date.now(),
            });
          }
        });

        // เรียงลำดับ: ผู้สร้างทีมอยู่บนสุด แล้วตามด้วยวันที่เข้าร่วมทีม
        members.sort((a, b) => {
          if (a.teamRole === 'owner') return -1;
          if (b.teamRole === 'owner') return 1;
          return (a.joinedAt || 0) - (b.joinedAt || 0);
        });

        set({ teamMembers: members });
        return members;
      },

      syncTeamUsers: async () => {
        const user = get().currentUser;
        const firebaseCfg = getFirebaseCfg();
        if (!firebaseCfg || !user?.teamId) return;

        // ดึงเฉพาะสมาชิกในทีมเดียวกัน
        const teamUsers = await firebaseFetchTeamUsers(user.teamId, firebaseCfg);
        if (teamUsers.length > 0) {
          set(state => {
            const userMap = new Map<string, User>();
            if (state.currentUser && state.currentUser.id) {
              userMap.set(state.currentUser.id, state.currentUser);
            }
            teamUsers.forEach((u, i) => {
              const id = u.id || `u-member-${i}`;
              userMap.set(id, { ...u, id });
              // ซิงค์ชื่อและ avatar ของเพื่อนร่วมทีมไปยังงานในปฏิทินด้วย
              if (u.id && (u.name || u.avatarId)) {
                usePlanner.getState().updateUserProfile(u.id, {
                  name: u.name,
                  avatarId: u.avatarId,
                });
              }
            });
            return { users: Array.from(userMap.values()) };
          });
        }

        // อัปเดตข้อมูลทีม
        const team = await firebaseFetchTeam(user.teamId, firebaseCfg);
        if (team) {
          // หากผู้ใช้ปัจจุบันไม่ได้เป็นสมาชิกในทีมนี้แล้ว (ถูกนำออกจากทีม) ให้ล้างข้อมูลทีมและกลับสู่หน้าเลือกทีม
          if (team.memberIds && !team.memberIds.includes(user.id)) {
            const updatedUser: User = {
              ...user,
              teamId: undefined,
              teamCode: undefined,
              teamName: undefined,
            };
            usePlanner.getState().restore({ tasks: [], rules: [], events: [] });
            set({ currentUser: updatedUser, currentTeam: null, teamMembers: [] });
            return;
          }
          set({ currentTeam: team });
        }

        // ซิงค์สมาชิกพร้อมระดับและวันที่เข้าร่วมทีม
        await get().fetchTeamMembers(user.teamId);
      },

      logout: () => {
        usePlanner.getState().restore({ tasks: [], rules: [], events: [] });
        set({ currentUser: null, currentTeam: null, teamMembers: [], userTeams: [] });
      },

      updateProfile: patch => {
        set(state => {
          if (!state.currentUser) return {};
          const updatedUser: User = {
            ...state.currentUser,
            ...patch,
          };

          // อัปเดต icon และชื่อในงานและวันหยุดทั้งหมดในระบบทันที
          usePlanner.getState().updateUserProfile(updatedUser.id, {
            name: updatedUser.name,
            avatarId: updatedUser.avatarId,
          });

          // อัปเดตข้อมูลในรายการสมาชิกทีมทันที
          const updatedMembers = (state.teamMembers || []).map(m =>
            m.userId === updatedUser.id
              ? {
                  ...m,
                  name: updatedUser.name,
                  avatarId: updatedUser.avatarId,
                  role: updatedUser.role || m.role,
                  department: updatedUser.department || m.department,
                }
              : m
          );

          const firebaseCfg = getFirebaseCfg();
          if (firebaseCfg) {
            import('./firebase').then(({ firebaseUpdateUser }) => {
              firebaseUpdateUser(updatedUser, firebaseCfg);
            });
          }
          return {
            currentUser: updatedUser,
            users: state.users.map(u => (u.id === updatedUser.id ? updatedUser : u)),
            teamMembers: updatedMembers,
          };
        });
      },

      getAllUsers: () => get().users,
    }),
    {
      name: 'work-planner-auth',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // ล้าง mockup users เก่าออกทั้งหมด และป้องกัน id ว่าง / ซ้ำ
          const userMap = new Map<string, User>();
          (state.users || []).forEach((u, i) => {
            if (!u || typeof u !== 'object') return;
            const validId = u.id || `u-${i}`;
            if (validId.startsWith('user-')) return;
            userMap.set(validId, {
              ...u,
              id: validId,
              name: u.name || 'สมาชิก',
              email: (u.email || '').toLowerCase().trim(),
              avatarId: u.avatarId || 'dev_boy',
            });
          });
          state.users = Array.from(userMap.values());
          if (state.currentUser && state.currentUser.id?.startsWith('user-')) {
            state.currentUser = null;
          }
          // ป้องกันทีมของบัญชีเดิมค้างอยู่ใน userTeams ของบัญชีใหม่
          if (state.currentUser) {
            state.userTeams = (state.userTeams || []).filter(
              t => t.memberIds?.includes(state.currentUser!.id) || t.createdBy === state.currentUser!.id
            );
          } else {
            state.userTeams = [];
          }
        }
      },
    }
  )
);
