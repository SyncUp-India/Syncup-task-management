'use client';

import { useEffect, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import TaskCard from '@/components/TaskCard';
import TaskDetail from '@/components/TaskDetail';
import NewTaskModal from '@/components/NewTaskModal';
import StatusChangeModal from '@/components/StatusChangeModal';
import { useAuth } from '@/context/AuthContext';
import { BOARD_TITLE, DEPT_META, TASK_DEPARTMENTS } from '@/lib/departments';

type Task = any;

const COLUMNS = [
  { key: 'todo',       label: 'Todo',        color: 'var(--muted)' },
  { key: 'inprogress', label: 'In Progress',  color: 'var(--sky)' },
  { key: 'review',     label: 'In Review',    color: 'var(--amber)' },
  { key: 'done',       label: 'Done',         color: 'var(--emerald)' },
];

export default function BoardPage() {
  const { user } = useAuth();
  const isAdmin   = user?.role === 'admin';
  const showReview = isAdmin || user?.department === 'developer';

  const [tasks, setTasks]               = useState<Task[]>([]);
  const [members, setMembers]           = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<Task | null>(null);
  const [showNew, setShowNew]           = useState(false);
  const [filterMember, setFilterMember] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterOverdue, setFilterOverdue]   = useState(false);
  const [filterDept, setFilterDept]         = useState('');
  const draggingRef = useRef(false);

  // Pending status change (intercept before drag completes)
  const [pendingChange, setPendingChange] = useState<{ task: Task; newStatus: string } | null>(null);

  async function load() {
    setLoading(true);
    const [tRes, mRes] = await Promise.all([
      fetch('/api/tasks').then(r => r.json()),
      fetch('/api/members').then(r => r.json()),
    ]);
    setTasks(tRes.tasks || []);
    setMembers(mRes.members || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const boardTitle = BOARD_TITLE[user?.department ?? ''] ?? 'SyncUp Board';

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (t: Task) => t.status !== 'done' && t.due_date && t.due_date < today;

  const filtered = tasks.filter(t => {
    if (filterMember   && t.assignee_id !== filterMember)   return false;
    if (filterPriority && t.priority    !== filterPriority) return false;
    if (filterOverdue  && !isOverdue(t))                    return false;
    if (isAdmin && filterDept && t.department !== filterDept) return false;
    return true;
  });

  const overdueCount = tasks.filter(isOverdue).length;
  const reviewCount  = tasks.filter(t => t.status === 'review').length;
  const doneCount    = tasks.filter(t => t.status === 'done').length;
  const pct          = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  async function updateTask(id: number, patch: any) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    load();
  }

  async function applyStatusChange(task: Task, patch: Record<string, any>) {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: patch.status } : t));
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setPendingChange(null);
    load();
  }

  function onDragEnd(result: DropResult) {
    draggingRef.current = false;
    const { draggableId, source, destination } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    if (source.droppableId === newStatus) return;

    const taskId = parseInt(draggableId);
    const task   = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Only inprogress needs the estimate modal
    if (newStatus === 'inprogress') {
      setPendingChange({ task, newStatus });
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).catch(console.error);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '0.25rem' }}>
            {boardTitle}
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
            {tasks.length} tasks &nbsp;·&nbsp;
            <span style={{ color: overdueCount > 0 ? 'var(--rose)' : 'var(--muted)' }}>{overdueCount} overdue</span>
            &nbsp;·&nbsp; {reviewCount} in review &nbsp;·&nbsp; {pct}% complete
          </p>
        </div>
        <button className="tb-btn tb-btn-primary" onClick={() => setShowNew(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New task
        </button>
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total',     value: tasks.length,  color: 'var(--accent)' },
          { label: 'Overdue',   value: overdueCount,  color: overdueCount > 0 ? 'var(--rose)' : 'var(--muted)' },
          { label: 'In Review', value: reviewCount,   color: 'var(--amber)' },
          { label: 'Done',      value: doneCount,     color: 'var(--emerald)' },
        ].map(s => (
          <div key={s.label} className="tb-card stat-glow" style={{ padding: '1rem 1.125rem' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: s.color, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="tb-input" style={{ maxWidth: '180px' }} value={filterMember} onChange={e => setFilterMember(e.target.value)}>
          <option value="">All members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
        </select>
        <select className="tb-input" style={{ maxWidth: '160px' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {isAdmin && (
          <select className="tb-input" style={{ maxWidth: '180px' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All departments</option>
            {TASK_DEPARTMENTS.map(d => (
              <option key={d} value={d}>{DEPT_META[d]?.label ?? d}</option>
            ))}
          </select>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={filterOverdue} onChange={e => setFilterOverdue(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          Overdue only
        </label>
      </div>

      {/* Board */}
      {loading ? (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--muted)', marginTop: '3rem', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          Loading…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <DragDropContext
          onDragStart={() => { draggingRef.current = true; }}
          onDragEnd={onDragEnd}
        >
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${showReview ? 4 : 3}, minmax(0, 1fr))`, gap: '0.875rem' }}>
            {COLUMNS.filter(c => c.key !== 'review' || showReview).map(col => {
              const colTasks = filtered.filter(t => t.status === col.key);
              return (
                <Droppable key={col.key} droppableId={col.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="tb-col"
                      style={{
                        background: snapshot.isDraggingOver ? 'rgba(59,130,246,0.04)' : 'rgba(15,23,42,0.02)',
                        borderColor: snapshot.isDraggingOver ? 'rgba(59,130,246,0.35)' : undefined,
                        transition: 'background 0.18s, border-color 0.18s',
                      }}
                    >
                      {/* Column header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: col.color, display: 'inline-block' }}/>
                          <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--ink)' }}>{col.label}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'rgba(15,23,42,0.06)', padding: '1px 7px', borderRadius: '999px' }}>{colTasks.length}</span>
                      </div>

                      {colTasks.map((t, index) => (
                        <Draggable key={t.id} draggableId={String(t.id)} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.88 : 1,
                              }}
                              onClick={() => {
                                if (!draggingRef.current && !snapshot.isDragging) setSelected(t);
                              }}
                            >
                              <TaskCard
                                task={t}
                                members={members}
                                overdue={isOverdue(t)}
                                onClick={() => {}}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {provided.placeholder}

                      {colTasks.length === 0 && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center', padding: '1.5rem 0', opacity: 0.5 }}>
                          {snapshot.isDraggingOver ? 'Drop here' : 'Empty'}
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {selected && (
        <TaskDetail
          task={selected}
          members={members}
          onClose={() => setSelected(null)}
          onUpdate={async (patch: any) => {
            // Intercept status changes that need a modal
            if (patch.status && patch.status === 'inprogress' &&
                patch.status !== selected.status) {
              setPendingChange({ task: selected, newStatus: patch.status });
              setSelected(null);
            } else {
              await updateTask(selected.id, patch);
              setSelected(null);
            }
          }}
        />
      )}
      {showNew && (
        <NewTaskModal
          members={members}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
        />
      )}
      {pendingChange && (
        <StatusChangeModal
          task={pendingChange.task}
          newStatus={pendingChange.newStatus}
          onConfirm={patch => applyStatusChange(pendingChange.task, patch)}
          onCancel={() => { setPendingChange(null); load(); }}
        />
      )}
    </div>
  );
}
