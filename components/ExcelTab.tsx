'use client';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Bar } from 'react-chartjs-2';
import '@/lib/chart';
import { usePlanner, type NewTask } from '@/lib/store';
import { f2, thDate, toDateStr } from '@/lib/utils';
import type { Priority } from '@/lib/types';
import { useModal } from '@/components/ModalContext';
import {
  SpreadsheetIcon,
  DownloadIcon,
  ChartBarIcon,
  ColumnsIcon,
  UploadIcon,
  CheckIcon,
  FileTextIcon,
} from '@/components/Icons';


type Row = Record<string, unknown>;
type Fn = 'sum' | 'count' | 'avg';
const FN_LABEL: Record<Fn, string> = { sum: 'ผลรวม', count: 'จำนวน', avg: 'ค่าเฉลี่ย' };


const num = (v: unknown): number | null => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const s = v.replace(/[,฿$\s]/g, '');
    if (!s) return null;
    const n = Number(s);
    return isNaN(n) ? null : n;
  }
  return null;
};
const cellText = (v: unknown) => {
  if (v instanceof Date) { const d = toDateStr(v); return d ? thDate(d) : ''; }
  return String(v ?? '').trim();
};
const detectNumCols = (rows: Row[], cols: string[]) => cols.filter(c => {
  const v = rows.map(r => r[c]).filter(x => x !== '');
  return v.length > 0 && v.filter(x => num(x) !== null).length / v.length >= 0.8;
});
const toPriority = (s: string): Priority => (/สูง|high|ด่วน|urgent/i.test(s) ? 'high' : /ต่ำ|low/i.test(s) ? 'low' : 'medium');

export default function ExcelTab() {
  const addTasks = usePlanner(s => s.addTasks);
  const [wb, setWb] = useState<XLSX.WorkBook | null>(null);
  const [sheet, setSheet] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [group, setGroup] = useState('');
  const [val, setVal] = useState('');
  const [fn, setFn] = useState<Fn>('sum');
  const [map, setMap] = useState({ date: '', title: '', status: '', priority: '' });

  const cols = useMemo(() => (rows.length ? Object.keys(rows[0]) : []), [rows]);
  const numCols = useMemo(() => detectNumCols(rows, cols), [rows, cols]);

  const { showAlert, showConfirm } = useModal();

  const loadSheet = (book: XLSX.WorkBook, name: string) => {
    const r = XLSX.utils.sheet_to_json<Row>(book.Sheets[name], { defval: '' });
    const c = r.length ? Object.keys(r[0]) : [];
    const nc = detectNumCols(r, c);
    const tc = c.filter(x => !nc.includes(x));
    const guess = (re: RegExp) => c.find(x => re.test(x)) ?? '';
    setSheet(name); setRows(r);
    setGroup(tc[0] ?? ''); setVal(nc[0] ?? ''); setFn(nc[0] ? 'sum' : 'count');
    setMap({ date: guess(/date|วันที่|วัน/i), title: guess(/task|title|งาน|รายการ|เรื่อง/i),
      status: guess(/status|สถานะ/i), priority: guess(/priority|ความสำคัญ|ด่วน/i) });
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    const book = XLSX.read(await f.arrayBuffer(), { cellDates: true });
    setWb(book);
    loadSheet(book, book.SheetNames[0]);
  };

  const numStats = useMemo(() => numCols.map(c => {
    const v = rows.map(r => num(r[c])).filter((x): x is number => x !== null);
    const sum = v.reduce((a, b) => a + b, 0);
    return { col: c, sum, avg: v.length ? sum / v.length : 0,
      min: v.reduce((a, b) => Math.min(a, b), Infinity), max: v.reduce((a, b) => Math.max(a, b), -Infinity), n: v.length };
  }), [rows, numCols]);

  const grouped = useMemo(() => {
    if (!group || (fn !== 'count' && !val)) return null;
    const m = new Map<string, { sum: number; n: number; c: number }>();
    rows.forEach(r => {
      const k = cellText(r[group]) || '(ว่าง)';
      const o = m.get(k) ?? { sum: 0, n: 0, c: 0 };
      o.c++;
      const x = val ? num(r[val]) : null;
      if (x !== null) { o.sum += x; o.n++; }
      m.set(k, o);
    });
    const out = [...m].map(([k, o]) => [k, fn === 'count' ? o.c : fn === 'sum' ? o.sum : (o.n ? o.sum / o.n : 0)] as [string, number])
      .sort((a, b) => b[1] - a[1]);
    return { out, total: out.reduce((a, b) => a + b[1], 0) };
  }, [rows, group, val, fn]);

  const importTasks = () => {
    if (!map.date || !map.title) return showAlert('แจ้งเตือน', 'เลือกคอลัมน์วันที่และชื่องาน');
    const list: NewTask[] = [];
    let skip = 0;
    rows.forEach(r => {
      const date = toDateStr(r[map.date]);
      const title = cellText(r[map.title]);
      if (!date || !title) { skip++; return; }
      const st = map.status ? cellText(r[map.status]) : '';
      const done = /เสร็จ|done|complete|finish|yes|true|✓/i.test(st) && !/ไม่|ยัง|not|in ?progress|pending/i.test(st);
      list.push({ date, title, detail: 'นำเข้าจาก Excel', done,
        priority: map.priority ? toPriority(cellText(r[map.priority])) : 'medium' });
    });
    addTasks(list);
    showAlert('แจ้งเตือน', `นำเข้า ${list.length} งาน${skip ? ` (ข้าม ${skip} แถวที่ข้อมูลไม่ครบ)` : ''}`);
  };

  const exportSummary = () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(numStats.map(x => ({
      'คอลัมน์': x.col, 'ผลรวม': x.sum, 'เฉลี่ย': x.avg, 'ต่ำสุด': x.min, 'สูงสุด': x.max, 'จำนวน': x.n }))), 'สรุปตัวเลข');
    if (grouped) {
      const valName = `${FN_LABEL[fn]}${fn !== 'count' ? ' ' + val : ''}`;
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(grouped.out.map(([k, v]) => ({
        [group]: k, [valName]: v,
        ...(fn !== 'avg' ? { '%': grouped.total ? +(v / grouped.total * 100).toFixed(2) : 0 } : {}),
      }))), 'สรุปจัดกลุ่ม');
    }
    XLSX.writeFile(book, `excel-summary-${sheet || 'data'}.xlsx`);
  };

  const opts = (ph: string, list: string[]) => [
    <option key="__" value="">{ph}</option>, ...list.map(c => <option key={c} value={c}>{c}</option>),
  ];
  const top = grouped?.out.slice(0, 15) ?? [];

  return (
    <section>
      <div className="card mb">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SpreadsheetIcon size={18} /> นำเข้าไฟล์ Excel / CSV
        </h3>
        <div className="row">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={e => onFile(e.target.files?.[0])} />
          {wb && (
            <select value={sheet} onChange={e => loadSheet(wb, e.target.value)}>
              {wb.SheetNames.map(n => <option key={n}>{n}</option>)}
            </select>
          )}
          {rows.length > 0 && (
            <button
              className="btn ok"
              style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={exportSummary}
            >
              <DownloadIcon size={15} /> ส่งออกผลสรุปเป็น Excel
            </button>
          )}
        </div>
        {wb && <p className="mut" style={{ margin: 0 }}>พบ {rows.length.toLocaleString()} แถว, {cols.length} คอลัมน์</p>}
      </div>

      <div className="card mb">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ChartBarIcon size={18} /> สรุปคอลัมน์ตัวเลขอัตโนมัติ
        </h3>
        {!wb ? <p className="mut">ยังไม่ได้เลือกไฟล์</p> : numStats.length === 0 ? <p className="mut">ไม่พบคอลัมน์ตัวเลข</p> : (
          <table>
            <thead><tr><th>คอลัมน์</th><th>ผลรวม</th><th>เฉลี่ย</th><th>ต่ำสุด</th><th>สูงสุด</th><th>จำนวน</th></tr></thead>
            <tbody>{numStats.map(x => (
              <tr key={x.col}><td><b>{x.col}</b></td><td>{f2(x.sum)}</td><td>{f2(x.avg)}</td><td>{f2(x.min)}</td><td>{f2(x.max)}</td><td>{x.n}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <div className="grid g2 mb">
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ColumnsIcon size={18} /> สรุปแบบจัดกลุ่ม
          </h3>
          <div className="row">
            <select value={group} onChange={e => setGroup(e.target.value)}>{opts('-- จัดกลุ่มตาม --', cols)}</select>
            <select value={val} onChange={e => setVal(e.target.value)}>{opts('-- คอลัมน์ค่า --', numCols)}</select>
            <select value={fn} onChange={e => setFn(e.target.value as Fn)}>
              <option value="sum">ผลรวม</option><option value="count">นับจำนวน</option><option value="avg">ค่าเฉลี่ย</option>
            </select>
          </div>
          <div className="scroll">
            {grouped && (
              <table>
                <thead><tr><th>{group}</th><th>{FN_LABEL[fn]} {fn !== 'count' && val}</th>{fn !== 'avg' && <th>%</th>}</tr></thead>
                <tbody>
                  {grouped.out.map(([k, v]) => (
                    <tr key={k}><td>{k}</td><td>{f2(v)}</td>{fn !== 'avg' && <td>{grouped.total ? f2(v / grouped.total * 100) : 0}%</td>}</tr>
                  ))}
                  {fn !== 'avg' && <tr><th>รวม</th><th>{f2(grouped.total)}</th><th>100%</th></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ChartBarIcon size={18} /> กราฟวิเคราะห์
          </h3>
          {top.length > 0 && (
            <Bar options={{ indexAxis: 'y' }} data={{ labels: top.map(x => x[0]),
              datasets: [{ label: `${FN_LABEL[fn]} (Top 15)`, data: top.map(x => x[1]), backgroundColor: '#4f46e5' }] }} />
          )}
        </div>
      </div>

      <div className="card mb">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UploadIcon size={18} /> นำเข้าเป็นงานในปฏิทิน
        </h3>
        <div className="row">
          <select value={map.date} onChange={e => setMap({ ...map, date: e.target.value })}>{opts('-- คอลัมน์วันที่ --', cols)}</select>
          <select value={map.title} onChange={e => setMap({ ...map, title: e.target.value })}>{opts('-- คอลัมน์ชื่องาน --', cols)}</select>
          <select value={map.status} onChange={e => setMap({ ...map, status: e.target.value })}>{opts('-- สถานะ (ไม่บังคับ) --', cols)}</select>
          <select value={map.priority} onChange={e => setMap({ ...map, priority: e.target.value })}>{opts('-- ความสำคัญ (ไม่บังคับ) --', cols)}</select>
        </div>
        <button
          className="btn"
          onClick={importTasks}
          disabled={!rows.length}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <CheckIcon size={14} /> นำเข้าเป็นงาน
        </button>
      </div>

      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileTextIcon size={18} /> ตัวอย่างข้อมูล (100 แถวแรก)
        </h3>
        <div className="scroll">
          {cols.length > 0 && (
            <table>
              <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{rows.slice(0, 100).map((r, i) => <tr key={i}>{cols.map(c => <td key={c}>{cellText(r[c])}</td>)}</tr>)}</tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}