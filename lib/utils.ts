export const pad = (n: number | string) => String(n).padStart(2, '0');
export const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const eachDay = (s: string, e: string) => {
  const out: string[] = [];
  for (let d = parse(s); fmt(d) <= e; d = addDays(d, 1)) out.push(fmt(d));
  return out;
};

export const TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
export const TH_DOW = ['อา','จ','อ','พ','พฤ','ศ','ส'];
export const TH_DOW_FULL = ['วันอาทิตย์','วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์'];

export const thDate = (s: string, full = true) => {
  const d = parse(s);
  const dow = full ? TH_DOW_FULL[d.getDay()] : TH_DOW[d.getDay()];
  return `${dow} ${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export const thDateShort = (s: string) => {
  const d = parse(s);
  return `${TH_DOW[d.getDay()]} ${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

/** แปลง YYYY-MM-DD เป็น dd/mm/yyyy พ.ศ. เช่น 2026-10-14 -> 14/10/2569 */
export const toThaiDateDisplay = (s: string): string => {
  if (!s) return '';
  const d = parse(s);
  if (isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543}`;
};

/** แปลง dd/mm/yyyy (พ.ศ. หรือ ค.ศ.) เป็น YYYY-MM-DD */
export const fromThaiDateDisplay = (displayStr: string): string | null => {
  if (!displayStr) return null;
  const s = displayStr.trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (!m) return null;
  const day = +m[1];
  const month = +m[2];
  let year = +m[3];
  if (year > 2400) year -= 543;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);
export const f2 = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 2 });

export type Mode = 'day' | 'week' | 'month';
export function getRange(mode: Mode, ds: string): [string, string] {
  const d = parse(ds);
  if (mode === 'day') return [ds, ds];
  if (mode === 'week') { const s = addDays(d, -((d.getDay() + 6) % 7)); return [fmt(s), fmt(addDays(s, 6))]; } // จันทร์–อาทิตย์
  return [fmt(new Date(d.getFullYear(), d.getMonth(), 1)), fmt(new Date(d.getFullYear(), d.getMonth() + 1, 0))];
}

/** แปลงค่าวันที่จาก Excel (Date, serial number, dd/mm/yyyy, yyyy-mm-dd รองรับ พ.ศ.) */
export function toDateStr(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return fmt(new Date(v.getTime() + 12 * 3600e3));
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 864e5));
    return fmt(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  if (typeof v === 'string') {
    const s = v.trim();
    let m: RegExpMatchArray | null;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { let y = +m[1]; if (y > 2400) y -= 543; return `${y}-${pad(m[2])}-${pad(m[3])}`; }
    if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/))) { let y = +m[3]; if (y > 2400) y -= 543; return `${y}-${pad(m[2])}-${pad(m[1])}`; }
  }
  return null;
}