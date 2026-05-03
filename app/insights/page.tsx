'use client';
import { useEffect, useState } from 'react';

const AVATAR_COLORS = ['#7c5cfc','#38bdf8','#10b981','#f59e0b','#f43f5e','#a78bfa'];

export default function InsightsPage() {
  const [tasks, setTasks]   = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch('/api/tasks').then(r=>r.json()), fetch('/api/members').then(r=>r.json())])
      .then(([t,m]) => { setTasks(t.tasks||[]); setMembers(m.members||[]); setLoading(false); });
  }, []);

  if (loading) return <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Loading…</p>;

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (t: any) => t.status !== 'done' && t.due_date && t.due_date < today;
  const overdueTasks = tasks.filter(isOverdue);
  const merged   = tasks.filter(t => t.github_pr_status === 'merged');
  const openPRs  = tasks.filter(t => t.github_pr_status === 'open' || t.github_pr_status === 'review');
  const doneAll  = tasks.filter(t => t.status === 'done');

  const perMember = members.map((m, i) => {
    const mine    = tasks.filter(t => t.assignee_id === m.id);
    const done    = mine.filter(t => t.status === 'done');
    const inProg  = mine.filter(t => t.status === 'inprogress');
    const overdue = mine.filter(isOverdue);
    const avg     = done.length ? done.reduce((s,t) => s+(t.spent_hours||0), 0)/done.length : 0;
    return { ...m, total: mine.length, done: done.length, inProg: inProg.length, overdue: overdue.length, avg, wip: inProg.length > 3, color: AVATAR_COLORS[i % AVATAR_COLORS.length] };
  }).filter(m => m.total > 0).sort((a,b) => b.done - a.done);

  const bySource = {
    excel:  tasks.filter(t => t.source === 'excel').length,
    manual: tasks.filter(t => t.source === 'manual').length,
    github: tasks.filter(t => t.source === 'github').length,
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem' }}>Insights</h1>
      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1.75rem' }}>Team productivity metrics</p>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.875rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total tasks', value: tasks.length, color: 'var(--accent)' },
          { label: 'Completed', value: doneAll.length, color: 'var(--emerald)' },
          { label: 'Open PRs', value: openPRs.length, color: 'var(--sky)' },
          { label: 'Overdue', value: overdueTasks.length, color: overdueTasks.length > 0 ? 'var(--rose)' : 'var(--muted)' },
        ].map(s => (
          <div key={s.label} className="tb-card" style={{ padding: '1rem 1.125rem' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: s.color, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Member table */}
      <div className="tb-card" style={{ marginBottom: '1.25rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: '600' }}>Per-member activity</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>WIP limit is 3 — flagged if exceeded</p>
        </div>
        <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Member','Role','Total','Done','In Progress','Overdue','Avg cycle'].map((h,i) => (
                <th key={h} style={{ padding: '0.625rem 1rem', textAlign: i < 2 ? 'left' : 'right', fontSize: '0.6875rem', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(255,255,255,0.02)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perMember.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: m.color+'22', color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600', flexShrink: 0 }}>
                      {m.name.split(' ').map((p: string)=>p[0]).join('').toUpperCase().slice(0,2)}
                    </div>
                    <span style={{ fontWeight: '500' }}>{m.name}</span>
                  </div>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ fontSize: '0.6875rem', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '999px', color: 'var(--muted)' }}>{m.role}</span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{m.total}</td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--emerald)', fontWeight: '600' }}>{m.done}</td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: m.wip ? 'var(--amber)' : 'var(--ink)', fontWeight: m.wip ? '600' : '400' }}>
                  {m.inProg}{m.wip && ' ⚠'}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: m.overdue > 0 ? 'var(--rose)' : 'var(--muted)', fontWeight: m.overdue > 0 ? '600' : '400' }}>{m.overdue}</td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--muted)' }}>{m.avg > 0 ? m.avg.toFixed(1)+'h' : '—'}</td>
              </tr>
            ))}
            {perMember.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>No activity data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
        {/* Task source */}
        <div className="tb-card" style={{ padding: '1.125rem' }}>
          <h3 style={{ fontSize: '0.8125rem', fontWeight: '600', marginBottom: '1rem' }}>Task sources</h3>
          {[
            { label: 'Excel import', count: bySource.excel, color: 'var(--sky)' },
            { label: 'Manual', count: bySource.manual, color: 'var(--accent)' },
            { label: 'GitHub', count: bySource.github, color: 'var(--muted)' },
          ].map(b => <Bar key={b.label} {...b} total={tasks.length} />)}
        </div>
        {/* Overdue */}
        <div className="tb-card" style={{ padding: '1.125rem' }}>
          <h3 style={{ fontSize: '0.8125rem', fontWeight: '600', marginBottom: '1rem' }}>Overdue by priority</h3>
          {overdueTasks.length === 0 ? (
            <p style={{ fontSize: '0.8125rem', color: 'var(--emerald)', textAlign: 'center', padding: '1rem 0' }}>✓ No overdue tasks</p>
          ) : (
            [
              { label: 'High', count: overdueTasks.filter(t=>t.priority==='high').length, color: 'var(--rose)' },
              { label: 'Medium', count: overdueTasks.filter(t=>t.priority==='medium').length, color: 'var(--amber)' },
              { label: 'Low', count: overdueTasks.filter(t=>t.priority==='low').length, color: 'var(--muted)' },
            ].map(b => <Bar key={b.label} {...b} total={overdueTasks.length} />)
          )}
        </div>
        {/* GitHub */}
        <div className="tb-card" style={{ padding: '1.125rem' }}>
          <h3 style={{ fontSize: '0.8125rem', fontWeight: '600', marginBottom: '1rem' }}>GitHub PRs</h3>
          {[
            { label: 'Open', val: openPRs.filter(t=>t.github_pr_status==='open').length, color: 'var(--sky)' },
            { label: 'In review', val: openPRs.filter(t=>t.github_pr_status==='review').length, color: 'var(--amber)' },
            { label: 'Merged', val: merged.length, color: 'var(--emerald)' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{s.label}</span>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: s.color }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Bar({ label, count, total, color }: any) {
  const pct = total > 0 ? Math.round((count/total)*100) : 0;
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--ink)' }}>{label}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{count} · {pct}%</span>
      </div>
      <div className="progress-track">
        <div style={{ height: '100%', borderRadius: '999px', background: color, width: `${pct}%`, transition: 'width 0.4s ease' }}/>
      </div>
    </div>
  );
}
