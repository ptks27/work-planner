import {
  initializeApp,
  getApps,
  type FirebaseApp,
} from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { PlannerData, User, Team, TeamMember } from './types';
import { DEFAULT_FIREBASE_CONFIG } from './firebaseDefaultConfig';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function parseFirebaseConfig(raw: string): any {
  let cleaned = raw.trim();
  if (cleaned.includes('=')) {
    cleaned = cleaned.substring(cleaned.indexOf('=') + 1).trim();
  }
  if (cleaned.endsWith(';')) {
    cleaned = cleaned.slice(0, -1).trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonFormatted = cleaned
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
      .replace(/'/g, '"')
      .replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(jsonFormatted);
  }
}

export function getFirebaseInstance(configStr?: string): { app: FirebaseApp; db: Firestore } | null {
  if (app && db) return { app, db };

  let configToUse = configStr;
  if (!configToUse && typeof window !== 'undefined') {
    configToUse = localStorage.getItem('firebase_config') || undefined;
  }
  if (!configToUse) {
    configToUse = DEFAULT_FIREBASE_CONFIG;
  }

  try {
    const config = parseFirebaseConfig(configToUse);
    if (!config.apiKey || !config.projectId) return null;

    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApps()[0];
    }
    try {
      db = initializeFirestore(app, { ignoreUndefinedProperties: true });
    } catch {
      db = getFirestore(app);
    }
    return { app, db };
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return null;
  }
}

export function resetFirebaseInstance() {
  app = null;
  db = null;
}

// ----------------- Team Code Generator -----------------

export function generateTeamCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < 6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

// ----------------- User Authentication via Firestore -----------------

export async function firebaseRegisterUser(
  user: User,
  configStr?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const instance = getFirebaseInstance(configStr);
    if (!instance) return { success: true }; // ถ้าไม่ได้ต่อ Firebase ให้ผ่านไปเก็บใน Local

    const cleanEmail = (user.email || '').toLowerCase().trim();
    const q = query(collection(instance.db, 'users'), where('email', '==', cleanEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { success: false, error: 'อีเมลนี้ถูกใช้งานแล้วในระบบ Firebase' };
    }

    await setDoc(doc(instance.db, 'users', user.id), {
      id: user.id,
      name: user.name,
      email: cleanEmail,
      password: user.password || '',
      avatarId: user.avatarId,
      role: user.role || 'Team Member',
      department: user.department || 'General',
      teamId: user.teamId || '',
      teamCode: user.teamCode || '',
      teamName: user.teamName || '',
      createdAt: user.createdAt || Date.now(),
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก User ไปยัง Firebase',
    };
  }
}

export async function firebaseLoginUser(
  email: string,
  password?: string,
  configStr?: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const instance = getFirebaseInstance(configStr);
    if (!instance) return { success: false, error: 'ไม่มีการเชื่อมต่อ Firebase' };

    const cleanEmail = email.trim().toLowerCase();
    const q = query(collection(instance.db, 'users'), where('email', '==', cleanEmail));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { success: false, error: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ Firebase' };
    }

    const userData = snap.docs[0].data() as User;
    if (password && userData.password && userData.password !== password) {
      return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
    }

    return { success: true, user: userData };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการตรวจสอบบัญชีใน Firebase',
    };
  }
}

export async function firebaseFetchUsers(configStr?: string): Promise<User[]> {
  try {
    const instance = getFirebaseInstance(configStr);
    if (!instance) return [];

    const snap = await getDocs(collection(instance.db, 'users'));
    return snap.docs.map(d => {
      const data = d.data();
      return { ...data, id: data.id || d.id } as User;
    });
  } catch {
    return [];
  }
}

export async function firebaseUpdateUser(
  user: User,
  configStr?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const instance = getFirebaseInstance(configStr);
    if (!instance) return { success: true };

    await setDoc(
      doc(instance.db, 'users', user.id),
      {
        id: user.id,
        name: user.name,
        email: (user.email || '').toLowerCase().trim(),
        avatarId: user.avatarId,
        role: user.role || 'Team Member',
        department: user.department || 'General',
        teamId: user.teamId || '',
        teamCode: user.teamCode || '',
        teamName: user.teamName || '',
      },
      { merge: true }
    );
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้ใน Firebase',
    };
  }
}

// ----------------- Team Management (Create, Join, Leave) -----------------

export async function firebaseCreateTeam(
  teamName: string,
  user: User,
  configStr?: string
): Promise<{ success: boolean; team?: Team; error?: string }> {
  try {
    const instance = getFirebaseInstance(configStr);
    const cleanName = teamName.trim();
    if (!cleanName) return { success: false, error: 'กรุณากรอกชื่อทีม' };

    let code = generateTeamCode();
    const teamId = `team-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    if (instance) {
      // ตรวจสอบว่ารหัสซ้ำไหม
      const checkQ = query(collection(instance.db, 'teams'), where('code', '==', code));
      const checkSnap = await getDocs(checkQ);
      if (!checkSnap.empty) {
        code = generateTeamCode();
      }

      const now = Date.now();
      const creatorMember: TeamMember = {
        userId: user.id,
        name: user.name || 'ผู้สร้างทีม',
        email: user.email || '',
        avatarId: user.avatarId || 'dev_boy',
        role: user.role || 'ผู้สร้างทีม',
        department: user.department || 'General',
        teamRole: 'owner',
        joinedAt: now,
      };

      const team: Team = {
        id: teamId,
        code,
        name: cleanName,
        createdBy: user.id,
        createdAt: now,
        memberIds: [user.id],
        members: [creatorMember],
      };

      // บันทึกทีม
      await setDoc(doc(instance.db, 'teams', teamId), team);

      // อัปเดตข้อมูลทีมลงในผู้ใช้
      await setDoc(
        doc(instance.db, 'users', user.id),
        {
          teamId,
          teamCode: code,
          teamName: cleanName,
        },
        { merge: true }
      );

      // เริ่มต้นพื้นที่ข้อมูล planner ของทีม
      await setDoc(doc(instance.db, 'team_planners', teamId), {
        tasks: [],
        rules: [],
        events: [],
        customTags: [],
        deletedTags: [],
        updatedAt: Date.now(),
      });

      return { success: true, team };
    } else {
      // Local mode
      const now = Date.now();
      const creatorMember: TeamMember = {
        userId: user.id,
        name: user.name || 'ผู้สร้างทีม',
        email: user.email || '',
        avatarId: user.avatarId || 'dev_boy',
        role: user.role || 'ผู้สร้างทีม',
        department: user.department || 'General',
        teamRole: 'owner',
        joinedAt: now,
      };

      const team: Team = {
        id: teamId,
        code,
        name: cleanName,
        createdBy: user.id,
        createdAt: now,
        memberIds: [user.id],
        members: [creatorMember],
      };
      return { success: true, team };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างทีม',
    };
  }
}

export async function firebaseJoinTeam(
  teamCode: string,
  user: User,
  configStr?: string
): Promise<{ success: boolean; team?: Team; plannerData?: PlannerData; error?: string }> {
  try {
    const cleanCode = teamCode.trim().toUpperCase();
    if (!cleanCode) return { success: false, error: 'กรุณากรอกรหัสทีม' };

    const instance = getFirebaseInstance(configStr);
    if (!instance) {
      return {
        success: false,
        error: 'ยังไม่ได้เชื่อมต่อ Firebase Cloud สำหรับค้นหาทีม',
      };
    }

    const q = query(collection(instance.db, 'teams'), where('code', '==', cleanCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { success: false, error: 'ไม่พบทีมที่มีรหัสนี้ กรุณาตรวจสอบรหัสอีกครั้ง' };
    }

    const teamData = snap.docs[0].data() as Team;
    const memberIds = Array.from(new Set([...(teamData.memberIds || []), user.id]));

    const isOwner = teamData.createdBy === user.id;
    const newMember: TeamMember = {
      userId: user.id,
      name: user.name || 'สมาชิก',
      email: user.email || '',
      avatarId: user.avatarId || 'dev_boy',
      role: user.role || (isOwner ? 'ผู้สร้างทีม' : 'สมาชิกทีม'),
      department: user.department || 'General',
      teamRole: isOwner ? 'owner' : 'member',
      joinedAt: Date.now(),
    };

    const prevMembers = teamData.members || [];
    const memberMap = new Map<string, TeamMember>();
    prevMembers.forEach(m => memberMap.set(m.userId, m));
    if (!memberMap.has(user.id)) {
      memberMap.set(user.id, newMember);
    } else {
      const prev = memberMap.get(user.id)!;
      memberMap.set(user.id, {
        ...prev,
        name: user.name || prev.name,
        avatarId: user.avatarId || prev.avatarId,
        role: user.role || prev.role,
      });
    }
    const updatedMembers = Array.from(memberMap.values());

    // อัปเดตสมาชิกในทีม
    await setDoc(
      doc(instance.db, 'teams', teamData.id),
      { memberIds, members: updatedMembers },
      { merge: true }
    );

    // อัปเดตทีมในบัญชีผู้ใช้
    await setDoc(
      doc(instance.db, 'users', user.id),
      {
        teamId: teamData.id,
        teamCode: teamData.code,
        teamName: teamData.name,
      },
      { merge: true }
    );

    // ดึงข้อมูล Planner ของทีมนั้น
    let plannerData: PlannerData = { tasks: [], rules: [], events: [], customTags: [], deletedTags: [] };
    const pSnap = await getDoc(doc(instance.db, 'team_planners', teamData.id));
    if (pSnap.exists()) {
      const p = pSnap.data();
      plannerData = {
        tasks: p.tasks || [],
        rules: p.rules || [],
        events: p.events || [],
        customTags: p.customTags || [],
        deletedTags: p.deletedTags || [],
      };
    }

    return {
      success: true,
      team: { ...teamData, memberIds, members: updatedMembers },
      plannerData,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าร่วมทีม',
    };
  }
}

export async function firebaseLeaveTeam(
  teamId: string,
  user: User,
  configStr?: string
): Promise<{ success: boolean; remainingTeams?: Team[]; error?: string }> {
  try {
    const instance = getFirebaseInstance(configStr);
    if (instance && teamId) {
      const teamRef = doc(instance.db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        const team = teamSnap.data() as Team;
        const memberIds = (team.memberIds || []).filter(id => id !== user.id);
        const members = (team.members || []).filter(m => m.userId !== user.id);
        await setDoc(teamRef, { memberIds, members }, { merge: true });
      }

      // ดึงทีมที่เหลืออยู่ของผู้ใช้
      const remainingQ = query(
        collection(instance.db, 'teams'),
        where('memberIds', 'array-contains', user.id)
      );
      const remainingSnap = await getDocs(remainingQ);
      const remainingTeams = remainingSnap.docs
        .map(d => ({ ...d.data(), id: d.id } as Team))
        .filter(t => t.id !== teamId);

      const nextTeam = remainingTeams.length > 0 ? remainingTeams[0] : null;

      await setDoc(
        doc(instance.db, 'users', user.id),
        {
          teamId: nextTeam ? nextTeam.id : '',
          teamCode: nextTeam ? nextTeam.code : '',
          teamName: nextTeam ? nextTeam.name : '',
        },
        { merge: true }
      );

      return { success: true, remainingTeams };
    }

    return { success: true, remainingTeams: [] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการออกจากทีม',
    };
  }
}

export async function firebaseRemoveMemberFromTeam(
  teamId: string,
  targetUserId: string,
  configStr?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const instance = getFirebaseInstance(configStr);
    if (!instance || !teamId || !targetUserId) {
      return { success: false, error: 'ข้อมูลไม่ครบถ้วน' };
    }

    const teamRef = doc(instance.db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    if (!teamSnap.exists()) {
      return { success: false, error: 'ไม่พบทีมนี้ในระบบ' };
    }

    const team = teamSnap.data() as Team;
    // ป้องกันไม่ให้ลบหัวหน้าทีม/ผู้สร้างทีม
    if (team.createdBy === targetUserId) {
      return { success: false, error: 'ไม่สามารถนำหัวหน้าทีม/ผู้สร้างทีมออกจากทีมได้' };
    }

    const memberIds = (team.memberIds || []).filter(id => id !== targetUserId);
    const members = (team.members || []).filter(m => m.userId !== targetUserId);
    await setDoc(teamRef, { memberIds, members }, { merge: true });

    // อัปเดตข้อมูลของผู้ใช้ที่ถูกนำออกใน Firestore
    const userRef = doc(instance.db, 'users', targetUserId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      // ตรวจสอบว่าผู้ใช้มีทีมอื่นเหลืออยู่หรือไม่
      const remainingQ = query(
        collection(instance.db, 'teams'),
        where('memberIds', 'array-contains', targetUserId)
      );
      const remainingSnap = await getDocs(remainingQ);
      const remainingTeams = remainingSnap.docs
        .map(d => ({ ...d.data(), id: d.id } as Team))
        .filter(t => t.id !== teamId);

      const nextTeam = remainingTeams.length > 0 ? remainingTeams[0] : null;

      await setDoc(
        userRef,
        {
          teamId: nextTeam ? nextTeam.id : '',
          teamCode: nextTeam ? nextTeam.code : '',
          teamName: nextTeam ? nextTeam.name : '',
        },
        { merge: true }
      );
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการนำสมาชิกออกจากทีม',
    };
  }
}

export async function firebaseFetchUserTeams(
  userId: string,
  configStr?: string
): Promise<Team[]> {
  try {
    const instance = getFirebaseInstance(configStr);
    if (!instance || !userId) return [];

    const q = query(
      collection(instance.db, 'teams'),
      where('memberIds', 'array-contains', userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return { ...data, id: data.id || d.id } as Team;
    });
  } catch (err) {
    console.error('firebaseFetchUserTeams error:', err);
    return [];
  }
}

export async function firebaseSwitchActiveTeam(
  userId: string,
  team: Team,
  configStr?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const instance = getFirebaseInstance(configStr);
    if (instance && userId && team) {
      await setDoc(
        doc(instance.db, 'users', userId),
        {
          teamId: team.id,
          teamCode: team.code,
          teamName: team.name,
        },
        { merge: true }
      );
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสลับทีม',
    };
  }
}

export async function firebaseFetchTeam(
  teamId: string,
  configStr?: string
): Promise<Team | null> {
  try {
    const instance = getFirebaseInstance(configStr);
    if (!instance || !teamId) return null;

    const snap = await getDoc(doc(instance.db, 'teams', teamId));
    if (!snap.exists()) return null;
    return snap.data() as Team;
  } catch {
    return null;
  }
}

export async function firebaseFetchTeamUsers(
  teamId: string,
  configStr?: string
): Promise<User[]> {
  try {
    const instance = getFirebaseInstance(configStr);
    if (!instance || !teamId) return [];

    const q = query(collection(instance.db, 'users'), where('teamId', '==', teamId));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return { ...data, id: data.id || d.id } as User;
    });
  } catch {
    return [];
  }
}

export async function firebaseFetchTeamMembers(
  teamId: string,
  configStr?: string
): Promise<TeamMember[]> {
  try {
    const instance = getFirebaseInstance(configStr);
    if (!instance || !teamId) return [];

    const teamSnap = await getDoc(doc(instance.db, 'teams', teamId));
    if (!teamSnap.exists()) return [];

    const team = teamSnap.data() as Team;
    const memberIds = team.memberIds || [];
    if (memberIds.length === 0) return [];

    // ดึงโปรไฟล์ผู้ใช้ล่าสุดเพื่ออัปเดต icon/ชื่อ/ตำแหน่ง ให้ตรงกับปัจจุบัน
    const userDocs = await Promise.all(
      memberIds.map(uid => getDoc(doc(instance.db, 'users', uid)).catch(() => null))
    );

    const members: TeamMember[] = [];
    const recordedMap = new Map<string, TeamMember>();
    (team.members || []).forEach(m => {
      if (m && m.userId) recordedMap.set(m.userId, m);
    });

    for (let i = 0; i < memberIds.length; i++) {
      const uid = memberIds[i];
      const uSnap = userDocs[i];
      const isOwner = team.createdBy === uid;
      const rec = recordedMap.get(uid);

      if (uSnap && uSnap.exists()) {
        const u = uSnap.data() as User;
        members.push({
          userId: uid,
          name: u.name || rec?.name || 'สมาชิก',
          email: u.email || rec?.email || '',
          avatarId: u.avatarId || rec?.avatarId || 'dev_boy',
          role: u.role || rec?.role || (isOwner ? 'ผู้สร้างทีม' : 'สมาชิกทั่วไป'),
          department: u.department || rec?.department || 'General',
          teamRole: isOwner ? 'owner' : 'member',
          joinedAt: rec?.joinedAt || u.createdAt || team.createdAt || Date.now(),
        });
      } else if (rec) {
        members.push({
          ...rec,
          teamRole: isOwner ? 'owner' : 'member',
          joinedAt: rec.joinedAt || team.createdAt || Date.now(),
        });
      } else {
        members.push({
          userId: uid,
          name: 'สมาชิก',
          email: '',
          avatarId: 'dev_boy',
          role: isOwner ? 'ผู้สร้างทีม' : 'สมาชิกทั่วไป',
          department: 'General',
          teamRole: isOwner ? 'owner' : 'member',
          joinedAt: isOwner ? team.createdAt : Date.now(),
        });
      }
    }

    // เรียงลำดับ: ผู้สร้างทีมอยู่บนสุด แล้วตามด้วยวันที่เข้าร่วมทีม (จากเก่าไปใหม่)
    members.sort((a, b) => {
      if (a.teamRole === 'owner') return -1;
      if (b.teamRole === 'owner') return 1;
      return (a.joinedAt || 0) - (b.joinedAt || 0);
    });

    return members;
  } catch (err) {
    console.error('Error fetching team members:', err);
    return [];
  }
}

// ----------------- Planner Data Sync (Tasks, Events/Leaves) -----------------

export async function uploadToFirebase(
  data: PlannerData,
  configStr?: string,
  teamId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const instance = getFirebaseInstance(configStr);
    if (!instance) {
      return { success: false, error: 'ยังไม่ได้ตั้งค่า Firebase Config ให้ถูกต้อง' };
    }

    const docRef = teamId
      ? doc(instance.db, 'team_planners', teamId)
      : doc(instance.db, 'work_planner', 'team_data');

    // ทำความสะอาด objects ป้องกัน undefined values ที่ทำให้ Firestore บันทึกไม่สำเร็จ
    const cleanTasks = (data.tasks || []).map(t => {
      const copy: any = { ...t };
      Object.keys(copy).forEach(k => {
        if (copy[k] === undefined) delete copy[k];
      });
      return copy;
    });

    const cleanEvents = (data.events || []).map(e => {
      const copy: any = { ...e };
      Object.keys(copy).forEach(k => {
        if (copy[k] === undefined) delete copy[k];
      });
      return copy;
    });

    const cleanRules = (data.rules || []).map(r => {
      const copy: any = { ...r };
      Object.keys(copy).forEach(k => {
        if (copy[k] === undefined) delete copy[k];
      });
      return copy;
    });

    await setDoc(docRef, {
      tasks: cleanTasks,
      rules: cleanRules,
      events: cleanEvents,
      customTags: data.customTags || [],
      deletedTags: data.deletedTags || [],
      notifications: data.notifications || [],
      updatedAt: Date.now(),
    });

    return { success: true };
  } catch (err) {
    console.error('uploadToFirebase error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ Firebase',
    };
  }
}

export async function downloadFromFirebase(
  configStr?: string,
  teamId?: string
): Promise<{ success: boolean; data?: PlannerData; error?: string }> {
  try {
    const instance = getFirebaseInstance(configStr);
    if (!instance) {
      return { success: false, error: 'ยังไม่ได้ตั้งค่า Firebase Config ให้ถูกต้อง' };
    }

    let docRef = teamId
      ? doc(instance.db, 'team_planners', teamId)
      : doc(instance.db, 'work_planner', 'team_data');

    let snap = await getDoc(docRef);

    if (!snap.exists() && !teamId) {
      docRef = doc(instance.db, 'work_planner', 'default_user');
      snap = await getDoc(docRef);
    }

    if (!snap.exists()) {
      return { success: false, error: 'ไม่พบข้อมูลบน Firebase Cloud' };
    }

    const val = snap.data();
    return {
      success: true,
      data: {
        tasks: val.tasks || [],
        rules: val.rules || [],
        events: val.events || [],
        customTags: val.customTags || [],
        deletedTags: val.deletedTags || [],
        notifications: val.notifications || [],
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Firebase',
    };
  }
}

export function subscribePlannerLive(
  onUpdate: (data: PlannerData) => void,
  configStr?: string,
  teamId?: string
): Unsubscribe | null {
  const instance = getFirebaseInstance(configStr);
  if (!instance) return null;

  try {
    const docRef = teamId
      ? doc(instance.db, 'team_planners', teamId)
      : doc(instance.db, 'work_planner', 'team_data');

    return onSnapshot(docRef, snap => {
      if (snap.exists()) {
        const val = snap.data();
        onUpdate({
          tasks: val.tasks || [],
          rules: val.rules || [],
          events: val.events || [],
          customTags: val.customTags || [],
          deletedTags: val.deletedTags || [],
          notifications: val.notifications || [],
        });
      }
    });
  } catch (err) {
    console.error('Firestore live subscription error:', err);
    return null;
  }
}

