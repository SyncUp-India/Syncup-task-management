'use client';

import { DEPT_META } from '@/lib/departments';

const AVATAR_COLORS = [
  ['#7c5cfc22','#7c5cfc'],['#38bdf822','#38bdf8'],['#10b98122','#10b981'],
  ['#f59e0b22','#f59e0b'],['#f43f5e22','#f43f5e'],['#a78bfa22','#a78bfa'],
];

export default function TaskCard({ task, members, overdue, onClick }: any) {
  const assignee = members.find((m: any) => m.id === task.assignee_id);
  const initials  = assignee ? assignee.name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0,2) : '?';
  const colorIdx  = assignee ? assignee.name.charCodeAt(0) % AVATAR_COLORS.length : 0;
  const [bg, fg]  = AVATAR_COLORS[colorIdx];

  const priorityStyle: any = {
    high:   { background: 'rgba(244,63,94,0.15)',  color: '#f43f5e' },
    medium: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    low:    { background: 'rgba(107,107,128,0.2)', color: 'var(--muted)' },
  };
  const prStyle: any = {
    open:   { background: 'rgba(56,189,248,0.12)', color: '#38bdf8' },
    review: { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    merged: { background: 'rgba(16,185,129,0.12)', color: '#10b981' },
    closed: { background: 'rgba(107,107,128,0.15)', color: 'var(--muted)' },
  };

  const progress = task.est_hours > 0 ? Math.min(100, Math.round((task.spent_hours / task.est_hours) * 100)) : 0;

  return (
    <div
      onClick={onClick}
      className={`tb-card task-card ${overdue ? 'overdue-pulse' : ''}`}
      style={{
        padding: '0.75rem',
        marginBottom: '0.5rem',
        cursor: 'pointer',
        borderColor: overdue ? 'rgba(244,63,94,0.4)' : undefined,
      }}
    >
      {/* Badges row */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <span className="tb-chip" style={priorityStyle[task.priority] || priorityStyle.low}>{task.priority}</span>
        {overdue && <span className="tb-chip" style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--rose)' }}>overdue</span>}
        {task.department && DEPT_META[task.department] && (
          <span className="tb-chip" style={{ background: DEPT_META[task.department].bg, color: DEPT_META[task.department].color }}>
            {DEPT_META[task.department].label}
          </span>
        )}
        {task.github_pr_status && (
          <span className="tb-chip" style={prStyle[task.github_pr_status] || {}}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '3px' }}><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 9v1a2 2 0 0 0 2 2h4a2 2 0 0 1 2 2v1"/></svg>
            PR · {task.github_pr_status}
          </span>
        )}
      </div>

      {/* Title */}
      <p style={{ fontSize: '0.8125rem', lineHeight: '1.45', color: 'var(--ink)', marginBottom: '0.625rem' }}>
        <span style={{ fontSize: '0.6875rem', color: 'var(--accent)', fontWeight: '700', fontFamily: 'monospace', marginRight: '4px', opacity: 0.65 }}>#{task.id}</span>
        {task.title}
      </p>

      {/* Progress bar (only if has estimates) */}
      {task.est_hours > 0 && (
        <div className="progress-track" style={{ marginBottom: '0.625rem' }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div style={{
            width: '20px', height: '20px', borderRadius: '50%',
            background: bg, color: fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '9px', fontWeight: '600', flexShrink: 0,
          }}>{initials}</div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>{assignee?.name || 'Unassigned'}</span>
        </div>
        {task.due_date && (
          <span style={{ fontSize: '0.6875rem', color: overdue ? 'var(--rose)' : 'var(--muted)' }}>
            {task.due_date.slice(5)}
          </span>
        )}
      </div>
    </div>
  );
}
