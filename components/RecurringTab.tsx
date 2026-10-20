'use client';
import { useState } from 'react';
import { usePlanner } from '@/lib/store';
import { useToday } from '@/lib/hooks';
import { TH_DOW, thDate } from '@/lib/utils';
import { PRIORITY, PRIORITIES, type Priority } from '@/lib/types';
import { useModal } from './ModalContext';
import { TrashIcon, RepeatIcon, CheckIcon, ClipboardCheckIcon, CalendarIcon, ClockIcon } from './Icons';
import ThaiDatePicker from './ThaiDatePicker';


const ORDER = [1, 2, 3, 4, 5, 6, 0]; // จันทร์ -> อาทิตย์
const dayText = (w: number[]) =>
  w.length === 7 ? 'ทุกวัน' : ORDER.filter(d => w.includes(d)).map(d => TH_DOW[d]).join(', ');

export default function RecurringTab() {
  const s = usePlanner();
  const today = useToday();
  const [f, setF] = useState({ title: '', detail: '', priority: 'medium' as Priority, time: '', startDate: today, endDate: '' });
  const [days, setDays] = useState<number[]>([1]);
  const toggleDay = (d: number) => setDays(x => (x.includes(d) ? x.filter(y => y !== d) : [...x, d]));
  const { showAlert, showConfirm } = useModal();

  const save = () => {
    if (!f.title.trim()) return showAlert('แจ้งเตือน', 'กรุณาใส่ชื่องาน');
    if (!days.length) return showAlert('แจ้งเตือน', 'เลือกอย่างน้อย 1 วัน');
    if (f.endDate && f.endDate < f.startDate) return showAlert('แจ้งเตือน', 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');
    s.addRule({ title: f.title.trim(), detail: f.detail.trim(), priority: f.priority, time: f.time || undefined,
      weekdays: days, startDate: f.startDate, endDate: f.endDate || undefined });
    setF({ ...f, title: '', detail: '' });
  };

  return (
    <section className="grid g2">
      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RepeatIcon size={18} /> เพิ่มงานที่ทำซ้ำทุกสัปดาห์
        </h3>
        <input placeholder="ชื่องาน * เช่น ประชุมทีม, ส่งรายงานประจำสัปดาห์" value={f.title}
          onChange={e => setF({ ...f, title: e.target.value })} />
        <textarea rows={2} placeholder="รายละเอียด" value={f.detail} onChange={e => setF({ ...f, detail: e.target.value })} />
        <label>ทำทุกวัน</label>
        <div className="chips">
          {ORDER.map(d => (
            <button key={d} className={`chip ${days.includes(d) ? 'on' : ''}`} onClick={() => toggleDay(d)}>{TH_DOW[d]}</button>
          ))}
          <button className="chip" onClick={() => setDays([1, 2, 3, 4, 5])}>จ–ศ</button>
          <button className="chip" onClick={() => setDays([0, 1, 2, 3, 4, 5, 6])}>ทุกวัน</button>
        </div>
        <div className="row">
          <div>
            <label>ความสำคัญ</label>
            <select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value as Priority })}>
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
            </select>
          </div>
          <div><label>เวลา (แจ้งเตือน)</label><input type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></div>
        </div>
        <div className="row">
          <div>
            <label>เริ่มวันที่</label>
            <ThaiDatePicker
              value={f.startDate}
              onChange={val => val && setF({ ...f, startDate: val })}
            />
          </div>
          <div>
            <label>สิ้นสุด (ไม่บังคับ)</label>
            <ThaiDatePicker
              value={f.endDate || ''}
              onChange={val => setF({ ...f, endDate: val })}
              min={f.startDate}
              clearable
              placeholder="วว/ดด/ปปปป (ไม่บังคับ)"
            />
          </div>
        </div>
        <button className="btn" onClick={save} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <CheckIcon size={14} /> บันทึกงานประจำ
        </button>
      </div>

      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardCheckIcon size={18} /> งานประจำทั้งหมด ({s.rules.length})
        </h3>
        {s.rules.length === 0 && <p className="mut">ยังไม่มีงานประจำ</p>}
        {s.rules.map(r => (
          <div key={r.id} className="task" style={{ borderLeft: `4px solid ${PRIORITY[r.priority].color}` }}>
            <div>
              <span className="pri" style={{ background: PRIORITY[r.priority].color }}>{PRIORITY[r.priority].label}</span>
              <b>{r.title}</b>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', margin: '4px 0' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <CalendarIcon size={12} /> <small>{dayText(r.weekdays)}</small>
                </span>
                {r.time && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <ClockIcon size={12} /> <small>{r.time}</small>
                  </span>
                )}
              </div>
              <div><small>ตั้งแต่ {thDate(r.startDate)}{r.endDate ? ` ถึง ${thDate(r.endDate)}` : ''}</small></div>
              {r.detail && <small>{r.detail}</small>}
            </div>
            <button
              className="icon-btn del-btn"
              title="ลบงานประจำ"
              aria-label="ลบงานประจำ"
              onClick={() => showConfirm('ยืนยันการลบ', 'ลบงานประจำนี้ใช่ไหม? (งานที่ทำเสร็จไปแล้วจะยังอยู่ในประวัติ)', () => s.deleteRule(r.id))}
            >
              <TrashIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}