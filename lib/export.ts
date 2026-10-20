
import * as XLSX from 'xlsx';
import { PRIORITY, PRIORITIES, type PlannerData, type EventType } from './types';
import { thDate, eachDay, esc } from './utils';
import { visibleOn } from './selectors';

const TYPE_TEXT: Record<EventType, string> = {
  holiday: 'วันหยุด',
  leave: 'ลา',
  note: 'โน้ต',
};

type ShowAlert = (title: string, message: string) => void;

function buildSummary(d: PlannerData, s: string, e: string) {
  const days = eachDay(s, e).map(date => ({
    date,
    tasks: visibleOn(d, date),
    events: d.events.filter(x => x.date === date),
  }));

  const uniqueTasks = new Map<string, (typeof days)[0]['tasks'][0]>();
  days.forEach(x => x.tasks.forEach(t => uniqueTasks.set(t.id, t)));
  const all = Array.from(uniqueTasks.values());
  const done = all.filter(t => t.done).length;

  const byPri = PRIORITIES.map(p => {
    const l = all.filter(t => t.priority === p);
    return {
      label: PRIORITY[p].label,
      total: l.length,
      done: l.filter(t => t.done).length,
    };
  });

  return { days, all, done, byPri };
}

export function exportExcel(
  d: PlannerData,
  s: string,
  e: string,
  title: string
) {
  const { days, all, done, byPri } = buildSummary(d, s, e);
  const wb = XLSX.utils.book_new();

  const summary: (string | number)[][] = [
    ['รายงาน', title],
    ['ช่วงวันที่', s === e ? thDate(s) : `${thDate(s)} - ${thDate(e)}`],
    [],
    ['งานทั้งหมด', all.length],
    ['เสร็จแล้ว', done],
    ['ยังค้าง', all.length - done],
    ['อัตราสำเร็จ (%)', all.length ? Math.round(done / all.length * 100) : 0],
    [],
    ['ความสำคัญ', 'ทั้งหมด', 'เสร็จ', 'ค้าง'],
    ...byPri.map(x => [x.label, x.total, x.done, x.total - x.done]),
    [],
    ['วันที่', 'ทั้งหมด', 'เสร็จ', 'ค้าง', 'วันหยุด / ลา / โน้ต'],
    ...days.map(x => [
      thDate(x.date),
      x.tasks.length,
      x.tasks.filter(t => t.done).length,
      x.tasks.filter(t => !t.done).length,
      x.events.map(ev => `${TYPE_TEXT[ev.type]}: ${ev.title}`).join(', '),
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(summary);
  ws['!cols'] = [
    { wch: 30 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 40 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'สรุป');

  const rows = days.flatMap(x =>
    x.tasks.map(t => ({
      'วันที่': x.date,
      'เวลา': t.time ?? '',
      'งาน': t.title,
      'รายละเอียด': t.detail,
      'ความสำคัญ': PRIORITY[t.priority].label,
      'งานประจำ': t.recurringId ? 'ใช่' : '',
      'สถานะ': t.done ? 'เสร็จแล้ว' : 'ยังค้าง',
      'เสร็จเมื่อ': t.doneAt
        ? new Date(t.doneAt).toLocaleString('th-TH')
        : '',
    }))
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      rows.length ? rows : [{ 'หมายเหตุ': 'ไม่มีงาน' }]
    ),
    'รายการงาน'
  );

  const ev = d.events
    .filter(x => x.date >= s && x.date <= e)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(x => ({
      'วันที่': thDate(x.date),
      'ประเภท': TYPE_TEXT[x.type],
      'รายละเอียด': x.title,
    }));

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      ev.length ? ev : [{ 'หมายเหตุ': 'ไม่มีรายการ' }]
    ),
    'วันหยุด-วันลา'
  );

  XLSX.writeFile(wb, `summary_${s}_${e}.xlsx`);
}

/**
 * เปิดรายงานในหน้าต่างใหม่ แล้วสั่งพิมพ์
 * เพื่อให้ผู้ใช้เลือกบันทึกเป็น PDF
 */
export function exportPDF(
  d: PlannerData,
  s: string,
  e: string,
  title: string,
  showAlert: ShowAlert
) {
  const { days, all, done, byPri } = buildSummary(d, s, e);
  const w = window.open('', '_blank');

  if (!w) {
    showAlert(
      'แจ้งเตือน',
      'เบราว์เซอร์บล็อกหน้าต่างใหม่ กรุณาอนุญาต pop-up'
    );
    return;
  }

  const pct = all.length
    ? Math.round(done / all.length * 100)
    : 0;

  const detail = days
    .filter(x => x.tasks.length || x.events.length)
    .map(x => `
      <h3>${thDate(x.date)}
        <small>(เสร็จ ${x.tasks.filter(t => t.done).length}/${x.tasks.length})</small>
      </h3>

      ${x.events.map(ev =>
        `<span class="tag">${TYPE_TEXT[ev.type]}: ${esc(ev.title)}</span>`
      ).join('')}

      ${x.tasks.length ? `
        <table>
          <tr>
            <th>สถานะ</th>
            <th>เวลา</th>
            <th>ความสำคัญ</th>
            <th>งาน</th>
            <th>รายละเอียด</th>
          </tr>
          ${x.tasks.map(t => `
            <tr>
              <td>${t.done ? '✔ เสร็จ' : '✘ ค้าง'}</td>
              <td>${esc(t.time ?? '')}</td>
              <td style="color:${PRIORITY[t.priority].color}">
                ${PRIORITY[t.priority].label}
              </td>
              <td>${esc(t.title)}${t.recurringId ? ' (ประจำ)' : ''}</td>
              <td>${esc(t.detail ?? '')}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}
    `)
    .join('');

  w.document.write(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>${esc(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 12mm; }
    body {
      font-family: 'Sarabun', sans-serif;
      color: #1f2937;
      margin: 0;
      padding: 24px;
      font-size: 13px;
    }
    @media print { body { padding: 0; } }
    h1 { margin: 0 0 4px; color: #4f46e5; }
    .stats { display: flex; gap: 10px; margin: 16px 0; }
    .stat {
      flex: 1;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }
    .stat b { display: block; font-size: 22px; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
    th, td { border: 1px solid #d1d5db; padding: 5px 7px; text-align: left; }
    th { background: #f3f4f6; }
    tr { page-break-inside: avoid; }
    h3 { margin: 16px 0 4px; font-size: 15px; page-break-after: avoid; }
    small { color: #6b7280; font-weight: 400; }
    .tag {
      display: inline-block;
      background: #fef3c7;
      border-radius: 4px;
      padding: 1px 6px;
      margin: 0 4px 4px 0;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <div>${s === e ? thDate(s) : `${thDate(s)} – ${thDate(e)}`}</div>

  <div class="stats">
    <div class="stat"><b>${all.length}</b>งานทั้งหมด</div>
    <div class="stat"><b style="color:#16a34a">${done}</b>เสร็จแล้ว</div>
    <div class="stat"><b style="color:#dc2626">${all.length - done}</b>ยังค้าง</div>
    <div class="stat"><b>${pct}%</b>อัตราสำเร็จ</div>
  </div>

  <table>
    <tr><th>ความสำคัญ</th><th>ทั้งหมด</th><th>เสร็จ</th><th>ค้าง</th></tr>
    ${byPri.map(x => `
      <tr>
        <td>${x.label}</td>
        <td>${x.total}</td>
        <td>${x.done}</td>
        <td>${x.total - x.done}</td>
      </tr>
    `).join('')}
  </table>

  ${detail || '<p>ไม่มีงานในช่วงนี้</p>'}

  <p style="margin-top:24px;color:#9ca3af">
    พิมพ์เมื่อ ${new Date().toLocaleString('th-TH')}
  </p>
</body>
</html>`);

  w.document.close();

  setTimeout(() => {
    w.document.fonts.ready.then(() => {
      w.focus();
      w.print();
    });
  }, 600);
}
