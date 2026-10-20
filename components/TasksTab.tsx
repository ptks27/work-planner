'use client';
import { useState } from 'react';
import { usePlanner } from '@/lib/store';
import { useToday } from '@/lib/hooks';
import { visibleOn, eventsOn, sortTasks } from '@/lib/selectors';
import { fmt, parse, addDays, thDate, TH_MONTHS, TH_DOW } from '@/lib/utils';
import {
  PRIORITY,
  PRIORITIES,
  TYPE_LABEL,
  PRESET_TAGS,
  getTagStyle,
  type Priority,
  type Task,
  type TaskAssignee,
} from '@/lib/types';
import { useAuth } from '@/lib/authStore';
import { AvatarIcon } from './Avatars';
import TaskItem from './TaskItem';
import EditTaskModal from './EditTaskModal';
import KanbanView from './KanbanView';
import WeeklyView from './WeeklyView';
import {
  TrashIcon,
  CalendarIcon,
  KanbanIcon,
  ColumnsIcon,
  RefreshCwIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  FileTextIcon,
  CheckIcon,
  UsersIcon,
  TagIcon,
  FlagIcon,
} from './Icons';
import { useModal } from '@/components/ModalContext';
import ThaiDatePicker from './ThaiDatePicker';

type TabViewMode = 'calendar' | 'kanban' | 'weekly';

export default function TasksTab() {
  const s = usePlanner();
  const { currentUser, users } = useAuth();
  const today = useToday();
  const tomorrow = fmt(addDays(parse(today), 1));
  const [activeView, setActiveView] = useState<TabViewMode>('calendar');
  const [leftTab, setLeftTab] = useState<'today' | 'overdue' | 'past'>('today');
  const [rightTab, setRightTab] = useState<'selected' | 'tomorrow'>('selected');
  const [sel, setSel] = useState(today);
  const [view, setView] = useState(() => { const d = parse(today); d.setDate(1); return d; });
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [time, setTime] = useState('');
  const [filter, setFilter] = useState<'all' | Priority>('all');
  const [memberFilter, setMemberFilter] = useState<'all' | 'me' | string>('all');
  const [tagFilter, setTagFilter] = useState<'all' | string>('all');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLeftExpanded, setIsLeftExpanded] = useState(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightExpanded, setIsRightExpanded] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const { showAlert, showConfirm } = useModal();

  // สร้างรายชื่อสมาชิกทีมที่กรองซ้ำและรับประกันว่ามี id เสมอ
  const memberList = Array.from(
    new Map(
      (users || [])
        .filter(u => Boolean(u && typeof u === 'object'))
        .map((u, i) => {
          const id = String(u.id || `u-${i}`);
          return [id, { ...u, id }];
        })
    ).values()
  );

  // รวบรวมแท็กทั้งหมดที่มีในระบบ: รวมจาก Preset + CustomTags ใน Store + ที่มีอยู่ในงาน โดยไม่เอาแท็กที่ถูกลบ
  const deletedSet = new Set((s.deletedTags || []).map(t => t.toLowerCase()));
  const allTagNames = Array.from(
    new Set([
      ...PRESET_TAGS.map(p => p.name).filter(name => !deletedSet.has(name.toLowerCase())),
      ...(s.customTags || []).filter(name => !deletedSet.has(name.toLowerCase())),
      ...s.tasks.flatMap(t => t.tags || []).filter(name => !deletedSet.has(name.toLowerCase())),
    ])
  ).filter(Boolean);

  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => {
      if (prev.some(t => t.toLowerCase() === tagName.toLowerCase())) {
        return prev.filter(t => t.toLowerCase() !== tagName.toLowerCase());
      }
      return [...prev, tagName];
    });
  };

  const addCustomTag = () => {
    const clean = customTag.replace(/^#/, '').trim();
    if (!clean) return;
    s.addCustomTag(clean);
    if (!selectedTags.some(t => t.toLowerCase() === clean.toLowerCase())) {
      setSelectedTags(prev => [...prev, clean]);
    }
    setCustomTag('');
  };

  const handleDeleteTag = (e: React.MouseEvent, tagName: string) => {
    e.stopPropagation();
    showConfirm(
      'ลบแท็ก',
      `ต้องการลบแท็ก #${tagName} ออกจากระบบและงานทั้งหมดใช่ไหม?`,
      () => {
        s.deleteCustomTag(tagName);
        setSelectedTags(prev => prev.filter(t => t.toLowerCase() !== tagName.toLowerCase()));
      }
    );
  };

  const add = () => {
    if (!title.trim()) return showAlert('แจ้งเตือน', 'กรุณาใส่สิ่งที่ต้องทำ');
    if (endDate && endDate < sel) return showAlert('แจ้งเตือน', 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น');

    const effectiveAssigneeIds = selectedAssigneeIds.length > 0
      ? selectedAssigneeIds
      : (currentUser?.id ? [currentUser.id] : []);

    const assignees: TaskAssignee[] = effectiveAssigneeIds.map(id => {
      const u = memberList.find(x => x.id === id);
      if (u) return { id: u.id, name: u.name, avatarId: u.avatarId };
      if (id === currentUser?.id) return { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId };
      return { id, name: 'สมาชิก', avatarId: 'dev_boy' };
    });

    const primaryUser = assignees[0] || (currentUser ? { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId } : null);

    s.addTasks([{
      date: sel,
      endDate: endDate && endDate > sel ? endDate : undefined,
      title: title.trim(),
      detail: detail.trim(),
      priority,
      time: time || undefined,
      userId: primaryUser?.id,
      userName: primaryUser?.name,
      userAvatar: primaryUser?.avatarId,
      assigneeIds: effectiveAssigneeIds,
      assignees,
      tags: selectedTags,
    }]);

    setTitle('');
    setDetail('');
    setTime('');
    setEndDate('');
    setSelectedTags([]);
  };

  const clearDone = () => {
    const ids = visibleOn(s, sel).filter(t => t.done).map(t => t.id);
    if (!ids.length) return showAlert('แจ้งเตือน', 'ไม่มีงานที่เสร็จแล้วในวันนี้');
    showConfirm('ยืนยันการลบ', `ต้องการลบงานที่เสร็จแล้ว ${ids.length} งานใช่ไหม? (จะไม่นำไปรวมใน Dashboard)`, () => {
      s.hideDone(ids);
    });
  };

  const filterTasks = (ts: Task[]) => {
    let res = ts;
    if (filter !== 'all') {
      res = res.filter(t => t.priority === filter);
    }
    if (memberFilter === 'me') {
      res = res.filter(t => {
        if (t.assigneeIds && t.assigneeIds.length > 0) {
          return t.assigneeIds.includes(currentUser?.id || '');
        }
        return !t.userId || t.userId === currentUser?.id;
      });
    } else if (memberFilter !== 'all') {
      res = res.filter(t => {
        if (t.assigneeIds && t.assigneeIds.length > 0) {
          return t.assigneeIds.includes(memberFilter);
        }
        return t.userId === memberFilter;
      });
    }
    if (tagFilter !== 'all') {
      res = res.filter(t => t.tags && t.tags.some(tg => tg.toLowerCase() === tagFilter.toLowerCase()));
    }
    return res;
  };

  const unfinishedToday = visibleOn(s, today).filter(t => !t.done);

  const handleRolloverToday = () => {
    if (!unfinishedToday.length) return showAlert('แจ้งเตือน', 'ไม่มีงานค้างของวันนี้ที่ต้องยกยอด');
    showConfirm(
      'ยกยอดงานค้าง',
      `ต้องการย้ายงานที่ยังไม่เสร็จของวันนี้ (${unfinishedToday.length} งาน) ไปเป็นวันพรุ่งนี้ใช่ไหม?`,
      () => {
        const moved = s.rolloverTasks(today, tomorrow);
        showAlert('สำเร็จ', `ยกยอดงาน ${moved} งานไปวันพรุ่งนี้เรียบร้อยแล้ว`);
      }
    );
  };

  // ค้นหางานค้างย้อนหลัง (Overdue) และงานเก่าในอดีต (Past)
  const allTasks = s.tasks.filter(t => !t.hidden);
  const overdueTasks = filterTasks(
    sortTasks(
      allTasks.filter(t => (t.endDate ? t.endDate < today : t.date < today) && !t.done)
    )
  );
  const pastTasks = filterTasks(
    sortTasks(
      allTasks.filter(t => (t.endDate ? t.endDate < today : t.date < today))
    )
  );

  const currentLeftTasks =
    leftTab === 'today'
      ? filterTasks(visibleOn(s, today))
      : leftTab === 'overdue'
      ? overdueTasks
      : pastTasks;

  const currentRightTasks =
    rightTab === 'selected'
      ? filterTasks(visibleOn(s, sel))
      : filterTasks(visibleOn(s, tomorrow));

  const handleRolloverAllOverdue = () => {
    if (!overdueTasks.length) return showAlert('แจ้งเตือน', 'ไม่มีงานค้างย้อนหลัง');
    showConfirm(
      'ยกยอดงานค้างทั้งหมด',
      `ต้องการย้ายงานค้างย้อนหลังทั้งหมด (${overdueTasks.length} งาน) มาเป็นงานของวันนี้ (${thDate(today)}) ใช่ไหม?`,
      () => {
        const moved = s.rolloverAllOverdue(today);
        showAlert('สำเร็จ', `ยกยอดงานค้าง ${moved} งานมาเป็นของวันนี้เรียบร้อยแล้ว`);
      }
    );
  };

  const y = view.getFullYear(), m = view.getMonth();
  const first = new Date(y, m, 1);
  const start = addDays(first, -first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  return (
    <section>
      <div className="card mb row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="chips" style={{ margin: 0 }}>
          <button
            className={`chip ${activeView === 'calendar' ? 'on' : ''}`}
            onClick={() => setActiveView('calendar')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <CalendarIcon size={14} />
            <span>ปฏิทินและรายการ</span>
          </button>
          <button
            className={`chip ${activeView === 'kanban' ? 'on' : ''}`}
            onClick={() => setActiveView('kanban')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <KanbanIcon size={14} />
            <span>บอร์ด Kanban</span>
          </button>
          <button
            className={`chip ${activeView === 'weekly' ? 'on' : ''}`}
            onClick={() => setActiveView('weekly')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ColumnsIcon size={14} />
            <span>รายสัปดาห์ 7 วัน</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {unfinishedToday.length > 0 && (
            <button
              className="btn sm"
              style={{ background: 'var(--warn)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={handleRolloverToday}
            >
              <RefreshCwIcon size={13} />
              <span>ยกยอดงานค้างไปพรุ่งนี้ ({unfinishedToday.length})</span>
            </button>
          )}

          {activeView === 'calendar' && (
            <>
              {/* Filter by Team Member */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <small className="mut">ทีม:</small>
                <select
                  value={memberFilter}
                  onChange={e => setMemberFilter(e.target.value)}
                  style={{ width: 'auto', margin: 0, padding: '6px 10px' }}
                >
                  <option key="filter-opt-all" value="all">👥 สมาชิกทุกคน ({memberList.length} คน)</option>
                  <option key="filter-opt-me" value="me">👤 เฉพาะของฉัน</option>
                  {memberList.map((u, idx) => (
                    <option key={`filter-user-${u.id || idx}`} value={u.id}>
                      {u.name || 'สมาชิก'} {u.id === currentUser?.id ? '(ฉัน)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Priority */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <small className="mut">กรอง:</small>
                <select
                  value={filter}
                  onChange={e => setFilter(e.target.value as 'all' | Priority)}
                  style={{ width: 'auto', margin: 0, padding: '6px 10px' }}
                >
                  <option value="all">ทุกระดับ</option>
                  {PRIORITIES.map(p => (
                    <option key={p} value={p}>
                      {PRIORITY[p].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Tag */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <small className="mut">แท็ก:</small>
                <select
                  value={tagFilter}
                  onChange={e => setTagFilter(e.target.value)}
                  style={{ width: 'auto', margin: 0, padding: '6px 10px' }}
                >
                  <option value="all">🏷 ทุกแท็ก</option>
                  {allTagNames.map(tag => (
                    <option key={`filter-tag-${tag}`} value={tag}>
                      #{tag.replace(/^#/, '')}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {activeView === 'kanban' && (
        <KanbanView currentDate={today} onEditTask={setEditingTask} />
      )}

      {activeView === 'weekly' && (
        <WeeklyView currentDate={today} onEditTask={setEditingTask} />
      )}

      {activeView === 'calendar' && (
        <>
          <div className="grid calendar-task-grid mb">
            {/* Top Left Card: วันนี้ต้องทำ / งานค้างย้อนหลัง / ประวัติงานเก่า */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div className="macos-traffic-lights" aria-hidden="true">
                    <span className="macos-traffic-dot red" />
                    <span className="macos-traffic-dot yellow" />
                    <span className="macos-traffic-dot green" />
                  </div>
                  <div className="chips" style={{ margin: 0 }}>
                  <button
                    className={`chip ${leftTab === 'today' ? 'on' : ''}`}
                    onClick={() => setLeftTab('today')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                  >
                    <CalendarIcon size={14} />
                    <span>วันนี้ต้องทำ ({filterTasks(visibleOn(s, today)).length})</span>
                  </button>

                  <button
                    className={`chip ${leftTab === 'overdue' ? 'on' : ''}`}
                    onClick={() => setLeftTab('overdue')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      color: overdueTasks.length > 0 && leftTab !== 'overdue' ? 'var(--warn)' : undefined,
                      fontWeight: overdueTasks.length > 0 ? 600 : undefined,
                    }}
                  >
                    <ClockIcon size={14} />
                    <span>งานค้างย้อนหลัง</span>
                    {overdueTasks.length > 0 && (
                      <span className="badge hot" style={{ fontSize: 10, padding: '1px 6px', marginLeft: 2 }}>
                        {overdueTasks.length}
                      </span>
                    )}
                  </button>

                  <button
                    className={`chip ${leftTab === 'past' ? 'on' : ''}`}
                    onClick={() => setLeftTab('past')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                  >
                    <FileTextIcon size={14} />
                    <span>ประวัติงานเก่า ({pastTasks.length})</span>
                  </button>
                </div>
              </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {leftTab === 'overdue' && overdueTasks.length > 0 && (
                    <button
                      className="btn sm"
                      style={{ background: 'var(--pri)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                      onClick={handleRolloverAllOverdue}
                      title="ย้ายงานค้างย้อนหลังทั้งหมดมาเป็นของวันนี้"
                    >
                      <RefreshCwIcon size={12} />
                      <span>ย้ายมาวันนี้ทั้งหมด</span>
                    </button>
                  )}

                  {currentLeftTasks.length > 3 && (
                    <button
                      className="btn sm"
                      onClick={() => setIsLeftExpanded(!isLeftExpanded)}
                      style={{ fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      title={isLeftExpanded ? 'ย่อเป็นกล่องเลื่อน (Scroll)' : 'ขยายดูทั้งหมด'}
                    >
                      {isLeftExpanded ? 'ย่อเป็น Scroll' : `ดูทั้งหมด (${currentLeftTasks.length})`}
                    </button>
                  )}

                  <button
                    className="btn sm"
                    onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
                    style={{ padding: '3px 6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    title={isLeftCollapsed ? 'กางการ์ดออก' : 'พับเก็บการ์ด'}
                  >
                    {isLeftCollapsed ? <ChevronDownIcon size={14} /> : <ChevronUpIcon size={14} />}
                  </button>
                </div>
              </div>

              {isLeftCollapsed ? (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg)',
                    borderRadius: 10,
                    fontSize: 13,
                    color: 'var(--mut)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => setIsLeftCollapsed(false)}
                >
                  <span>พับรายการไว้ ({currentLeftTasks.length} งาน) — คลิกเพื่อกางออก</span>
                  <ChevronDownIcon size={14} />
                </div>
              ) : (
                <>
                  {currentLeftTasks.length === 0 ? (
                    leftTab === 'today' ? (
                      <p className="mut">ไม่มีงาน 🎉</p>
                    ) : leftTab === 'overdue' ? (
                      <p className="mut">ไม่มีงานค้างย้อนหลัง ยอดเยี่ยมมาก! 👏</p>
                    ) : (
                      <p className="mut">ไม่มีประวัติงานในอดีต</p>
                    )
                  ) : (
                    <>
                      <div className={`task-scroll-box ${isLeftExpanded ? 'expanded' : ''}`}>
                        {currentLeftTasks.map(t => (
                          <TaskItem
                            key={t.id}
                            t={t}
                            onEdit={setEditingTask}
                            showDate={leftTab !== 'today'}
                          />
                        ))}
                      </div>

                      {currentLeftTasks.length > 3 && (
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 8,
                            fontSize: 11,
                            color: 'var(--mut)',
                            paddingTop: 6,
                            borderTop: '1px dashed var(--line)',
                          }}
                        >
                          <span>
                            {isLeftExpanded
                              ? `แสดงทั้งหมด (${currentLeftTasks.length} งาน)`
                              : `แสดง 2-3 งานแรก (เลื่อนลงเพื่อดูอีก ${currentLeftTasks.length - 3} งาน)`}
                          </span>
                          <button
                            className="btn sm"
                            style={{ fontSize: 11, padding: '2px 8px' }}
                            onClick={() => setIsLeftExpanded(!isLeftExpanded)}
                          >
                            {isLeftExpanded ? 'ย่อเป็น Scroll' : 'ดูทั้งหมด'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Top Right Card: งานวันที่เลือก / พรุ่งนี้ต้องทำ */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div className="macos-traffic-lights" aria-hidden="true">
                    <span className="macos-traffic-dot red" />
                    <span className="macos-traffic-dot yellow" />
                    <span className="macos-traffic-dot green" />
                  </div>
                  <div className="chips" style={{ margin: 0 }}>
                  <button
                    className={`chip ${rightTab === 'selected' ? 'on' : ''}`}
                    onClick={() => setRightTab('selected')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                  >
                    <CalendarIcon size={14} />
                    <span>งานวันที่เลือก: {thDate(sel)}</span>
                  </button>

                  <button
                    className={`chip ${rightTab === 'tomorrow' ? 'on' : ''}`}
                    onClick={() => setRightTab('tomorrow')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                  >
                    <ChevronRightIcon size={14} />
                    <span>พรุ่งนี้ต้องทำ ({filterTasks(visibleOn(s, tomorrow)).length})</span>
                  </button>
                </div>
              </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {rightTab === 'selected' && sel !== today && (
                    <small className="mut" style={{ fontSize: 12, fontWeight: 500 }}>
                      {sel < today ? '📅 งานย้อนหลัง' : '📅 งานล่วงหน้า'}
                    </small>
                  )}
                  {rightTab === 'selected' && visibleOn(s, sel).some(t => t.done) && (
                    <button
                      className="btn red sm"
                      onClick={clearDone}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '3px 8px' }}
                      title="ลบงานที่เสร็จแล้วของวันนี้"
                    >
                      <TrashIcon size={13} /> ลบที่เสร็จ ({visibleOn(s, sel).filter(t => t.done).length})
                    </button>
                  )}

                  {currentRightTasks.length > 3 && (
                    <button
                      className="btn sm"
                      onClick={() => setIsRightExpanded(!isRightExpanded)}
                      style={{ fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      title={isRightExpanded ? 'ย่อเป็นกล่องเลื่อน (Scroll)' : 'ขยายดูทั้งหมด'}
                    >
                      {isRightExpanded ? 'ย่อเป็น Scroll' : `ดูทั้งหมด (${currentRightTasks.length})`}
                    </button>
                  )}

                  <button
                    className="btn sm"
                    onClick={() => setIsRightCollapsed(!isRightCollapsed)}
                    style={{ padding: '3px 6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    title={isRightCollapsed ? 'กางการ์ดออก' : 'พับเก็บการ์ด'}
                  >
                    {isRightCollapsed ? <ChevronDownIcon size={14} /> : <ChevronUpIcon size={14} />}
                  </button>
                </div>
              </div>

              {isRightCollapsed ? (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg)',
                    borderRadius: 10,
                    fontSize: 13,
                    color: 'var(--mut)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => setIsRightCollapsed(false)}
                >
                  <span>พับรายการไว้ ({currentRightTasks.length} งาน) — คลิกเพื่อกางออก</span>
                  <ChevronDownIcon size={14} />
                </div>
              ) : (
                <>
                  {currentRightTasks.length === 0 ? (
                    <p className="mut">ไม่มีงาน 🎉</p>
                  ) : (
                    <>
                      <div className={`task-scroll-box ${isRightExpanded ? 'expanded' : ''}`}>
                        {currentRightTasks.map(t => (
                          <TaskItem key={t.id} t={t} onEdit={setEditingTask} />
                        ))}
                      </div>

                      {currentRightTasks.length > 3 && (
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 8,
                            fontSize: 11,
                            color: 'var(--mut)',
                            paddingTop: 6,
                            borderTop: '1px dashed var(--line)',
                          }}
                        >
                          <span>
                            {isRightExpanded
                              ? `แสดงทั้งหมด (${currentRightTasks.length} งาน)`
                              : `แสดง 2-3 งานแรก (เลื่อนลงเพื่อดูอีก ${currentRightTasks.length - 3} งาน)`}
                          </span>
                          <button
                            className="btn sm"
                            style={{ fontSize: 11, padding: '2px 8px' }}
                            onClick={() => setIsRightExpanded(!isRightExpanded)}
                          >
                            {isRightExpanded ? 'ย่อเป็น Scroll' : 'ดูทั้งหมด'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="grid calendar-task-grid">
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--line)', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="macos-traffic-lights" aria-hidden="true">
                    <span className="macos-traffic-dot red" />
                    <span className="macos-traffic-dot yellow" />
                    <span className="macos-traffic-dot green" />
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--txt)' }}>
                    ปฏิทินงานประจำเดือน
                  </span>
                </div>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setView(new Date())}
                  style={{ borderRadius: 999, fontSize: 11, padding: '3px 10px', background: 'rgba(120, 120, 128, 0.08)', color: 'var(--txt)', boxShadow: 'none' }}
                >
                  เดือนนี้
                </button>
              </div>

              <div className="cal-head">
                <button
                  className="btn sm"
                  onClick={() => setView(new Date(y, m - 1, 1))}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronLeftIcon size={13} />
                </button>
                <h3 style={{ margin: 0 }}>{TH_MONTHS[m]} {y + 543}</h3>
                <button
                  className="btn sm"
                  onClick={() => setView(new Date(y, m + 1, 1))}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronRightIcon size={13} />
                </button>
              </div>
              <div className="cal">
                {TH_DOW.map(d => <div key={d} className="dow">{d}</div>)}
                {cells.map(d => {
                  const ds = fmt(d);
                  const tsAll = visibleOn(s, ds);
                  const ts = filterTasks(tsAll);
                  const ev = eventsOn(s, ds);
                  const done = ts.filter(t => t.done).length;
                  const hot = ts.some(t => !t.done && t.priority === 'high');
                  const hasLeave = ev.some(e => e.type === 'leave');
                  const hasHoliday = ev.some(e => e.type === 'holiday');
                  const cls = ['day',
                    d.getMonth() !== m && 'other', ds === today && 'today', ds === sel && 'sel',
                    d.getDay() % 6 === 0 && 'weekend',
                    hasHoliday ? 'holiday' : hasLeave ? 'leave' : '',
                  ].filter(Boolean).join(' ');

                  // ดึง Avatar ของผู้รับผิดชอบงานอย่างไดนามิกตามโปรไฟล์ล่าสุด
                  const uniqueAvatars = Array.from(
                    new Set(
                      ts.map(t => {
                        const u = memberList.find(m => m.id === t.userId) || (t.userId === currentUser?.id ? currentUser : null);
                        return u?.avatarId || t.userAvatar;
                      }).filter(Boolean)
                    )
                  );

                  return (
                    <div
                      key={ds}
                      className={cls}
                      onClick={() => {
                        setSel(ds);
                        setRightTab('selected');
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="num">{d.getDate()}</span>
                        {ts.length > 0 && (
                          <span className={`badge ${done === ts.length ? 'done' : hot ? 'hot' : ''}`}>
                            {done}/{ts.length}
                          </span>
                        )}
                      </div>

                      {/* แสดง Avatar ของผู้รับผิดชอบในช่องวัน */}
                      {uniqueAvatars.length > 0 && (
                        <div style={{ display: 'flex', gap: 2, margin: '2px 0', flexWrap: 'wrap' }}>
                          {uniqueAvatars.slice(0, 3).map((av, idx) => (
                            <AvatarIcon key={idx} id={av!} size={14} />
                          ))}
                        </div>
                      )}

                      {/* แสดงรายการการลาและวันหยุด พร้อมชื่อและ Avatar ล่าสุด */}
                      {ev.map(e => {
                        const u = memberList.find(m => m.id === e.userId) || (e.userId === currentUser?.id ? currentUser : null);
                        const evAvatar = u?.avatarId || e.userAvatar;
                        const evName = u?.name || e.userName;
                        if (e.type === 'leave') {
                          return (
                            <div
                              key={e.id}
                              className="cal-leave-pill"
                              title={`${evName ? `[${evName}] ` : ''}${e.title}`}
                            >
                              {evAvatar && <AvatarIcon id={evAvatar} size={13} />}
                              <span>{evName ? `${evName.split(' ')[0]}: ` : ''}{e.title}</span>
                            </div>
                          );
                        }
                        return (
                          <span key={e.id} className={`tag t-${e.type}`} title={e.title}>
                            {e.title}
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Right Card: ฟอร์มเพิ่มงานใหม่ในวันที่เลือก (macOS Inspector Style) */}
            <div className="macos-form-card">
              {/* macOS Window Header Bar */}
              <div className="macos-window-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="macos-traffic-lights" aria-hidden="true">
                    <span className="macos-traffic-dot red" />
                    <span className="macos-traffic-dot yellow" />
                    <span className="macos-traffic-dot green" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PlusIcon size={16} strokeWidth={2.5} color="var(--pri)" />
                    <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
                      เพิ่มงานใหม่
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      background: 'rgba(120, 120, 128, 0.08)',
                      borderRadius: 999,
                      padding: '3px 10px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--txt)',
                    }}
                  >
                    <CalendarIcon size={12} color="var(--pri)" />
                    <span>{thDate(sel)}</span>
                  </span>

                  {sel < today && (
                    <span className="badge" style={{ position: 'static', background: '#fef3c7', color: '#b45309', fontSize: 10.5, padding: '2px 8px' }}>
                      งานย้อนหลัง
                    </span>
                  )}
                  {sel === today && (
                    <span className="badge" style={{ position: 'static', background: '#e0f2fe', color: '#0284c7', fontSize: 10.5, padding: '2px 8px' }}>
                      วันนี้
                    </span>
                  )}
                </div>
              </div>

              {/* รายการเหตุการณ์หรือวันลาในวันที่เลือก (ถ้ามี) */}
              {eventsOn(s, sel).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {eventsOn(s, sel).map(e => {
                    const u = memberList.find(m => m.id === e.userId) || (e.userId === currentUser?.id ? currentUser : null);
                    const evAvatar = u?.avatarId || e.userAvatar;
                    const evName = u?.name || e.userName;
                    return (
                      <div
                        key={e.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: e.type === 'leave' ? '#fef3c7' : 'rgba(120, 120, 128, 0.08)',
                          border: '1px solid var(--line)',
                          fontSize: 11.5,
                          fontWeight: 600,
                        }}
                      >
                        {evAvatar && <AvatarIcon id={evAvatar} size={16} />}
                        <span>
                          {TYPE_LABEL[e.type]}: {evName ? `(${evName.split(' ')[0]}) ` : ''}{e.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* macOS Hero Input Card: ชื่องาน + บันทึกรายละเอียด */}
              <div className="macos-hero-input-group">
                <input
                  className="macos-hero-title"
                  placeholder="สิ่งที่ต้องทำ... *"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && add()}
                />
                <div className="macos-hero-divider" />
                <textarea
                  className="macos-hero-detail"
                  rows={2}
                  placeholder="รายละเอียด หรือบันทึกเพิ่มเติม (ไม่บังคับ)..."
                  value={detail}
                  onChange={e => setDetail(e.target.value)}
                />
              </div>

              {/* macOS Inset Group 1: กำหนดการและเวลา */}
              <div className="macos-inset-section">
                <div className="macos-section-header">
                  <span className="macos-section-title">
                    <CalendarIcon size={13} color="var(--pri)" />
                    <span>กำหนดการและเวลา</span>
                  </span>
                </div>

                <div className="macos-date-grid">
                  <div>
                    <label style={{ fontSize: 11, marginBottom: 4 }}>วันที่เริ่มต้น *</label>
                    <ThaiDatePicker
                      value={sel}
                      onChange={val => val && setSel(val)}
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, marginBottom: 4 }}>ถึงวันที่ (กรณีหลายวัน)</label>
                    <ThaiDatePicker
                      value={endDate}
                      onChange={setEndDate}
                      min={sel}
                      clearable
                      placeholder="วว/ดด/ปปปป (ไม่บังคับ)"
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--line)', marginTop: 2, gap: 10 }}>
                  <label style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                    <ClockIcon size={14} color="var(--pri)" />
                    <span>เวลาแจ้งเตือน</span>
                  </label>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      style={{ width: 'auto', margin: 0, padding: '4px 10px', fontSize: 12, height: 32 }}
                    />
                    {time && (
                      <button
                        type="button"
                        onClick={() => setTime('')}
                        title="ล้างเวลา"
                        style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* macOS Inset Group 2: ระดับความสำคัญ (Segmented Control) */}
              <div className="macos-inset-section">
                <div className="macos-section-header">
                  <span className="macos-section-title">
                    <FlagIcon size={13} color="var(--pri)" />
                    <span>ระดับความสำคัญ</span>
                  </span>
                  <span style={{ fontSize: 11, color: PRIORITY[priority].color, fontWeight: 600 }}>
                    {PRIORITY[priority].label}
                  </span>
                </div>

                <div className="macos-priority-pills">
                  <button
                    type="button"
                    className={`macos-priority-pill ${priority === 'low' ? 'active' : ''}`}
                    onClick={() => setPriority('low')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34c759' }} />
                    <span>ต่ำ</span>
                  </button>
                  <button
                    type="button"
                    className={`macos-priority-pill ${priority === 'medium' ? 'active' : ''}`}
                    onClick={() => setPriority('medium')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff9500' }} />
                    <span>กลาง</span>
                  </button>
                  <button
                    type="button"
                    className={`macos-priority-pill ${priority === 'high' ? 'active' : ''}`}
                    onClick={() => setPriority('high')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3b30' }} />
                    <span>สูง</span>
                  </button>
                </div>
              </div>

              {/* macOS Inset Group 3: ผู้รับผิดชอบงาน */}
              <div className="macos-inset-section">
                <div className="macos-section-header">
                  <span className="macos-section-title">
                    <UsersIcon size={13} color="var(--pri)" />
                    <span>ผู้รับผิดชอบงาน</span>
                    <span className="count" style={{ padding: '1px 8px', fontSize: 11 }}>
                      {selectedAssigneeIds.length > 0 ? `${selectedAssigneeIds.length} คน` : 'เริ่มต้น: ตัวฉัน'}
                    </span>
                  </span>
                  <small style={{ color: 'var(--mut)', fontSize: 11 }}>
                    เลือก 1 หรือหลายคน
                  </small>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {memberList.map(u => {
                    const isSelected = selectedAssigneeIds.length > 0
                      ? selectedAssigneeIds.includes(u.id)
                      : u.id === currentUser?.id;
                    return (
                      <button
                        key={`form-assignee-${u.id}`}
                        type="button"
                        onClick={() => toggleAssignee(u.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 12px 5px 6px',
                          borderRadius: 999,
                          border: isSelected ? '1.5px solid var(--pri)' : '1px solid var(--line)',
                          background: isSelected ? 'var(--pri-l)' : 'var(--card-solid)',
                          color: isSelected ? 'var(--pri)' : 'var(--txt)',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: isSelected ? 600 : 500,
                          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: isSelected ? '0 1px 4px rgba(0, 113, 227, 0.18)' : 'none',
                        }}
                      >
                        <AvatarIcon id={u.avatarId} size={18} />
                        <span>{u.name || 'สมาชิก'} {u.id === currentUser?.id ? '(ฉัน)' : ''}</span>
                        {isSelected && <CheckIcon size={11} strokeWidth={3} color="var(--pri)" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* macOS Inset Group 4: แท็กหมวดหมู่งาน */}
              <div className="macos-inset-section">
                <div className="macos-section-header">
                  <span className="macos-section-title">
                    <TagIcon size={13} color="var(--pri)" />
                    <span>แท็กหมวดหมู่งาน</span>
                    {selectedTags.length > 0 && (
                      <span className="count" style={{ padding: '1px 8px', fontSize: 11 }}>
                        {selectedTags.length}
                      </span>
                    )}
                  </span>
                  {s.deletedTags && s.deletedTags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        showConfirm(
                          'คืนค่าแท็กเริ่มต้น',
                          'ต้องการนำแท็กเริ่มต้นทั้งหมดกลับมาแสดงใหม่ใช่ไหม?',
                          () => s.resetDefaultTags()
                        );
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontSize: 11,
                        color: 'var(--pri)',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      ↺ คืนค่าแท็กเริ่มต้น
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 28, alignItems: 'center' }}>
                  {allTagNames.length === 0 ? (
                    <small style={{ color: 'var(--mut)', fontSize: 12 }}>
                      ยังไม่มีแท็ก (พิมพ์เพิ่มแท็กที่ต้องการด้านล่างได้เลย)
                    </small>
                  ) : (
                    allTagNames.map(tagName => {
                      const tagStyle = getTagStyle(tagName);
                      const isSelected = selectedTags.some(t => t.toLowerCase() === tagName.toLowerCase());
                      return (
                        <span
                          key={`form-tag-${tagName}`}
                          onClick={() => toggleTag(tagName)}
                          style={{
                            border: `1px solid ${isSelected ? tagStyle.color : 'var(--line)'}`,
                            background: isSelected ? tagStyle.bg : 'var(--card-solid)',
                            color: isSelected ? tagStyle.color : 'var(--mut)',
                            borderRadius: 999,
                            padding: '3px 10px',
                            fontSize: 11.5,
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            transition: 'all 0.15s ease',
                            userSelect: 'none',
                            boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                          }}
                        >
                          <span>#{tagName}</span>
                          {isSelected && <CheckIcon size={10} strokeWidth={3} />}
                          <span
                            onClick={e => handleDeleteTag(e, tagName)}
                            title={`ลบแท็ก #${tagName}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 16,
                              height: 16,
                              borderRadius: 999,
                              background: 'rgba(0, 0, 0, 0.08)',
                              marginLeft: 2,
                              fontSize: 11,
                              fontWeight: 700,
                              lineHeight: 1,
                              color: 'var(--mut)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.background = 'var(--red-l)';
                              (e.currentTarget as HTMLElement).style.color = 'var(--red)';
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background = 'rgba(0, 0, 0, 0.08)';
                              (e.currentTarget as HTMLElement).style.color = 'var(--mut)';
                            }}
                          >
                            ×
                          </span>
                        </span>
                      );
                    })
                  )}
                </div>

                {/* Quick Add Tag Bar */}
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  <input
                    type="text"
                    placeholder="+ พิมพ์แท็กใหม่ (เช่น #Database, #UX)"
                    value={customTag}
                    onChange={e => setCustomTag(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomTag();
                      }
                    }}
                    style={{
                      margin: 0,
                      fontSize: 12,
                      padding: '6px 12px',
                      borderRadius: 999,
                      background: 'var(--card-solid)',
                      border: '1px solid var(--line-strong)',
                    }}
                  />
                  <button
                    type="button"
                    className="btn sm"
                    onClick={addCustomTag}
                    style={{ flexShrink: 0, borderRadius: 999, padding: '4px 14px', fontSize: 12 }}
                  >
                    เพิ่ม
                  </button>
                </div>
              </div>

              {/* Submit CTA Button */}
              <button
                className="btn"
                onClick={add}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(0, 113, 227, 0.3)',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: 4,
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <PlusIcon size={16} strokeWidth={2.5} />
                <span>บันทึกงานใหม่</span>
                <span
                  style={{
                    fontSize: 10.5,
                    opacity: 0.8,
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 4,
                    padding: '1px 6px',
                    marginLeft: 4,
                  }}
                >
                  ↵ Enter
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      <EditTaskModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={s.updateTask}
      />
    </section>
  );
}