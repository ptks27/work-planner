/**
 * Smart Subtask Generator Engine (AI-Powered & Heuristic)
 */

interface SubtaskSuggestion {
  title: string;
  category?: string;
}

const DOMAIN_PATTERNS: Array<{
  keywords: string[];
  subtasks: string[];
}> = [
  {
    keywords: ['ออกแบบ', 'ui', 'ux', 'design', 'figma', 'mockup', 'wireframe', 'โลโก้', 'กราฟิก'],
    subtasks: [
      'ศึกษาความต้องการและรวบรวม User Stories / Moodboard',
      'ออกแบบ Wireframe โครงสร้างหน้าจอและโฟลว์การใช้งาน',
      'ทำ High-Fidelity UI Mockup พร้อม Design Tokens & สี',
      'สร้าง Interactive Prototype สำหรับทดสอบ UX',
      'ตรวจเช็ก Responsive (Mobile & Desktop) และ Accessibility',
      'ส่งมอบ Design Assets & Handoff ให้ทีมพัฒนา',
    ],
  },
  {
    keywords: ['api', 'backend', 'database', 'ฐานข้อมูล', 'ต่อ api', 'endpoint', 'server', 'ระบบหลังบ้าน'],
    subtasks: [
      'ออกแบบ Data Schema / ER Diagram และโครงสร้างตาราง',
      'สร้าง REST API Endpoints พร้อม Input Validation & DTO',
      'เขียน Logic การทำงานและเชื่อมต่อฐานข้อมูล',
      'ทำระบบ Authentication & ตรวจสอบสิทธิ์การเข้าถึง (Authorization)',
      'เขียน Unit Test / Integration Test ตรวจสอบ Edge cases',
      'จัดทำเอกสาร API (Swagger / Postman Collection)',
    ],
  },
  {
    keywords: ['เว็บ', 'frontend', 'หน้าเว็บ', 'react', 'next', 'vue', 'component', 'ระบบหน้าบ้าน'],
    subtasks: [
      'วางโครงสร้าง Components และ State Management',
      'ประกอบหน้า UI ตามดีไซน์ Figma รองรับ Responsive',
      'เชื่อมต่อ API รับส่งข้อมูลและจัดการสถานะ Loading / Error',
      'เพิ่ม Micro-interactions และ Animation ให้ลื่นไหล',
      'ทดสอบข้ามเบราว์เซอร์ (Cross-browser testing)',
      'ตรวจสอบและปรับแต่งความเร็ว (Core Web Vitals / Performance)',
    ],
  },
  {
    keywords: ['รายงาน', 'report', 'สรุป', 'เอกสาร', 'สไลด์', 'presentation', 'วิเคราะห์', 'data'],
    subtasks: [
      'กำหนดโครงร่าง (Outline) และวัตถุประสงค์ของรายงาน',
      'รวบรวมและตรวจสอบความถูกต้องของข้อมูลสถิติ',
      'วิเคราะห์ข้อมูลและสร้างกราฟ / Infographic สรุปผล',
      'เรียบเรียงเนื้อหาและจัดหน้าเอกสารให้เรียบร้อยสวยงาม',
      'ตรวจสอบตัวสะกดและทบทวนความถูกต้องร่วมกับทีม',
      'ส่งออกเป็น PDF / สไลด์และแชร์ให้ผู้เกี่ยวข้อง',
    ],
  },
  {
    keywords: ['ประชุม', 'meeting', 'สัมมนา', 'วางแผน', 'workshop', 'นัดหมาย'],
    subtasks: [
      'กำหนดวาระการประชุม (Agenda) และเป้าหมายที่ต้องการ',
      'ส่งคำเชิญและเอกสารเตรียมตัวล่วงหน้าให้ผู้เข้าร่วม',
      'จัดเตรียมสถานที่ / ลิงก์ประชุมออนไลน์และสไลด์นำเสนอ',
      'ดำเนินตามวาระและบันทึกประเด็นสำคัญ / Action Items',
      'สรุปบันทึกการประชุม (MoM) และมอบหมายงานผู้รับผิดชอบ',
    ],
  },
  {
    keywords: ['แก้บั๊ก', 'บั๊ก', 'bug', 'fix', 'error', 'แก้ปัญหา', 'ระบบพัง', 'crash'],
    subtasks: [
      'จำลองขั้นตอนเกิดปัญหา (Reproduce bug step-by-step)',
      'ตรวจสอบ Log และระบุหาสาเหตุที่แท้จริง (Root Cause)',
      'แก้ไขโค้ดและทดสอบในเครื่อง Local',
      'เขียน Regression Test ป้องกันไม่ให้เกิดปัญหาซ้ำ',
      'ทดสอบบน Staging และขอรีวิวโค้ด (PR Review)',
      'ปล่อยอัปเดตขึ้น Production และมอนิเตอร์ผล',
    ],
  },
  {
    keywords: ['ตลาด', 'marketing', 'ยิงแอด', 'โพสต์', 'คอนเทนต์', 'campaign', 'โปรโมท'],
    subtasks: [
      'กำหนดกลุ่มเป้าหมาย (Audience) และแกนการสื่อสาร (Key Message)',
      'เขียนแคปชั่น Copywriting และสตอรี่บอร์ด',
      'จัดทำชิ้นงานภาพและวิดีโอประกอบ',
      'ตั้งค่าแคมเปญโฆษณาและงบประมาณ (Targeting & Budget)',
      'ปล่อยแคมเปญและตอบข้อความลูกค้า',
      'วัดผล Conversion และจัดทำสรุป ROI',
    ],
  },
];

/**
 * ฟังก์ชันหลักในการสร้างงานย่อย (Subtasks) อัจฉริยะ
 */
export async function generateSmartSubtasks(
  taskTitle: string,
  taskDetail?: string
): Promise<SubtaskSuggestion[]> {
  const text = `${taskTitle} ${taskDetail || ''}`.toLowerCase();

  // 1. ค้นหา Domain ที่ตรงกับคีย์เวิร์ด
  for (const pattern of DOMAIN_PATTERNS) {
    if (pattern.keywords.some(k => text.includes(k))) {
      return pattern.subtasks.map(s => ({ title: s }));
    }
  }

  // 2. ถ้าไม่ตรงกับ Domain ไหนเป็นพิเศษ ให้แตกตามกระบวนการทำงานมาตรฐาน (Universal Lifecycle)
  const cleanTitle = taskTitle.trim();
  return [
    { title: `รวบรวมข้อมูลและวางแผนขั้นตอนสำหรับ "${cleanTitle}"` },
    { title: `จัดเตรียมทรัพยากร เครื่องมือ หรือไฟล์ที่ต้องใช้` },
    { title: `ลงมือปฏิบัติการตามแผนงานหลัก` },
    { title: `ตรวจทานความเรียบร้อยและทดสอบผลลัพธ์` },
    { title: `ส่งมอบงานและสรุปผลให้ทีมรับทราบ` },
  ];
}
