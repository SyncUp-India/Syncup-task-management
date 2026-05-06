'use client';
import { useEffect, useState } from 'react';

const AVATAR_COLORS = ['#7c5cfc','#38bdf8','#10b981','#f59e0b','#f43f5e','#a78bfa'];

function grade(completionRate: number, overdueCount: number, total: number) {
  if (total === 0) return { label: 'No tasks', color: 'var(--muted)', bg: 'rgba(255,255,255,0.06)' };
  if (completionRate >= 80 && overdueCount === 0) return { label: 'On Track', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.12)' };
  if (completionRate >= 50 || overdueCount <= 1) return { label: 'Average', color: 'var(--amber)', bg: 'rgba(245,158,11,0.12)' };
  return { label: 'Needs Attention', color: 'var(--rose)', bg: 'rgba(244,63,94,0.12)' };
}

export default function InsightsPage() {
  const [tasks, setTasks]     = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState<'all' | 'at-risk'>('all');

  useEffect(() => {
    Promise.all([fetch('/api/tasks').then(r=>r.json()), fetch('/api/members').then(r=>r.json())])
      .then(([t,m]) => { setTasks(t.tasks||[]); setMembers(m.members||[]); setLoading(false); });
  }, []);

  if (loading) return <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Loading…</p>;

  const today      = new Date().toISOString().slice(0, 10);
  const isOverdue  = (t: any) => t.status !== 'done' && t.due_date && t.due_date < today;
  const overdueTasks = tasks.filter(isOverdue);
  const merged       = tasks.filter(t => t.github_pr_status === 'merged');
  const openPRs      = tasks.filter(t => t.github_pr_status === 'open' || t.github_pr_status === 'review');
  const doneAll      = tasks.filter(t => t.status === 'done');

  const perMember = members.map((m, i) => {
    const mine         = tasks.filter(t => t.assignee_id === m.id);
    const done         = mine.filter(t => t.status === 'done');
    const inProg       = mine.filter(t => t.status === 'inprogress');
    const overdue      = mine.filter(isOverdue);
    const totalHours   = mine.reduce((s, t) => s + (t.spent_hours || 0), 0);
    const avgCycle     = done.length ? done.reduce((s, t) => s + (t.spent_hours || 0), 0) / done.length : 0;
    const testTasks    = mine.filter(t => t.test_id || t.pass_fail);
    const passTasks    = testTasks.filter(t => t.pass_fail === 'pass');
    const qaPassRate   = testTasks.length > 0 ? Math.round((passTasks.length / testTasks.length) * 100) : null;
    const completionRate = mine.length > 0 ? Math.round((done.length / mine.length) * 100) : 0;
    const g = grade(completionRate, overdue.length, mine.length);
    return {
      ...m,
      total: mine.length, done: done.length, inProg: inProg.length,
      overdue: overdue.length, totalHours, avgCycle,
      completionRate, qaPassRate,
      wip: inProg.length > 3, grade: g,
      color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    };
  }).filter(m => m.total > 0).sort((a, b) => b.completionRate - a.completionRate);

  const onTrackCount  = perMember.filter(m => m.grade.label === 'On Track').length;
  const avgCount      = perMember.filter(m => m.grade.label === 'Average').length;
  const atRiskCount   = perMember.filter(m => m.grade.label === 'Needs Attention').length;

  const shown = view === 'at-risk'
    ? perMember.filter(m => m.grade.label === 'Needs Attention' || m.grade.label === 'Average')
    : perMember;

  const bySource = {
    excel:  tasks.filter(t => t.source === 'excel').length,
    manual: tasks.filter(t => t.source === 'manual').length,
    github: tasks.filter(t => t.source === 'github').length,
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem' }}>Insights</h1>
      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1.75rem' }}>Team productivity &amp; performance overview</p>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.875rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total tasks',  value: tasks.length,          color: 'var(--accent)' },
          { label: 'Completed',    value: doneAll.length,         color: 'var(--emerald)' },
          { label: 'Open PRs',     value: openPRs.length,         color: 'var(--sky)' },
          { label: 'Overdue',      value: overdueTasks.length,    color: overdueTasks.length > 0 ? 'var(--rose)' : 'var(--muted)' },
        ].map(s => (
          <div key={s.label} className="tb-card" style={{ padding: '1rem 1.125rem' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: s.color, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Team health bar */}
      {perMember.length > 0 && (
        <div className="tb-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: '600' }}>Team Health</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[
                { label: 'On Track', count: onTrackCount, color: 'var(--emerald)' },
                { label: 'Average',  count: avgCount,     color: 'var(--amber)' },
                { label: 'Needs Attention', count: atRiskCount, color: 'var(--rose)' },
              ].map(s => (
                <span key={s.label} style={{ fontSize: '0.75rem', color: s.color, fontWeight: '600' }}>
                  {s.count} {s.label}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', height: '8px', borderRadius: '999px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', gap: '2px' }}>
            {onTrackCount > 0 && <div style={{ flex: onTrackCount, background: 'var(--emerald)', borderRadius: '999px 0 0 999px', opacity: 0.85 }} />}
            {avgCount > 0     && <div style={{ flex: avgCount,     background: 'var(--amber)', opacity: 0.85 }} />}
            {atRiskCount > 0  && <div style={{ flex: atRiskCount,  background: 'var(--rose)', borderRadius: '0 999px 999px 0', opacity: 0.85 }} />}
          </div>
        </div>
      )}

      {/* Member productivity table */}
      <div className="tb-card" style={{ marginBottom: '1.25rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '0.875rem', fontWeight: '600' }}>Per-member productivity</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
              Sorted by completion rate — WIP limit is 3
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['all', 'at-risk'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '999px',
                  border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
                  background: view === v ? 'rgba(124,92,252,0.15)' : 'transparent',
                  color: view === v ? 'var(--accent)' : 'var(--muted)',
                  fontWeight: view === v ? '600' : '400',
                }}
              >
                {v === 'all' ? `All (${perMember.length})` : `Needs Attention (${atRiskCount + avgCount})`}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse', minWidth: '860px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Member', 'Status', 'Total', 'Done', 'Completion', 'Overdue', 'In Progress', 'QA Pass', 'Hours', 'Avg cycle'].map((h, i) => (
                  <th key={h} style={{ padding: '0.625rem 1rem', textAlign: i < 2 ? 'left' : 'right', fontSize: '0.6875rem', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(255,255,255,0.02)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: m.color+'22', color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600', flexShrink: 0 }}>
                        {m.name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p style={{ fontWeight: '500', lineHeight: 1.2 }}>{m.name}</p>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>{m.role}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '999px', background: m.grade.bg, color: m.grade.color, fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {m.grade.label}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{m.total}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--emerald)', fontWeight: '600' }}>{m.done}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                      <span style={{ fontWeight: '700', color: m.completionRate >= 80 ? 'var(--emerald)' : m.completionRate >= 50 ? 'var(--amber)' : 'var(--rose)' }}>
                        {m.completionRate}%
                      </span>
                      <div style={{ width: '60px', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)' }}>
                        <div style={{ height: '100%', borderRadius: '999px', width: `${m.completionRate}%`, background: m.completionRate >= 80 ? 'var(--emerald)' : m.completionRate >= 50 ? 'var(--amber)' : 'var(--rose)' }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: m.overdue > 0 ? 'var(--rose)' : 'var(--muted)', fontWeight: m.overdue > 0 ? '600' : '400' }}>
                    {m.overdue > 0 ? `⚠ ${m.overdue}` : '0'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: m.wip ? 'var(--amber)' : 'var(--ink)', fontWeight: m.wip ? '600' : '400' }}>
                    {m.inProg}{m.wip && ' ⚠'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    {m.qaPassRate !== null ? (
                      <span style={{ color: m.qaPassRate >= 80 ? 'var(--emerald)' : m.qaPassRate >= 50 ? 'var(--amber)' : 'var(--rose)', fontWeight: '600' }}>
                        {m.qaPassRate}%
                      </span>
                    ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--muted)' }}>
                    {m.totalHours > 0 ? `${m.totalHours.toFixed(1)}h` : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--muted)' }}>
                    {m.avgCycle > 0 ? `${m.avgCycle.toFixed(1)}h` : '—'}
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>No activity data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
        {/* Task source */}
        <div className="tb-card" style={{ padding: '1.125rem' }}>
          <h3 style={{ fontSize: '0.8125rem', fontWeight: '600', marginBottom: '1rem' }}>Task sources</h3>
          {[
            { label: 'Excel import', count: bySource.excel, color: 'var(--sky)' },
            { label: 'Manual',       count: bySource.manual, color: 'var(--accent)' },
            { label: 'GitHub',       count: bySource.github, color: 'var(--muted)' },
          ].map(b => <Bar key={b.label} {...b} total={tasks.length} />)}
        </div>
        {/* Overdue */}
        <div className="tb-card" style={{ padding: '1.125rem' }}>
          <h3 style={{ fontSize: '0.8125rem', fontWeight: '600', marginBottom: '1rem' }}>Overdue by priority</h3>
          {overdueTasks.length === 0 ? (
            <p style={{ fontSize: '0.8125rem', color: 'var(--emerald)', textAlign: 'center', padding: '1rem 0' }}>✓ No overdue tasks</p>
          ) : (
            [
              { label: 'High',   count: overdueTasks.filter(t=>t.priority==='high').length,   color: 'var(--rose)' },
              { label: 'Medium', count: overdueTasks.filter(t=>t.priority==='medium').length, color: 'var(--amber)' },
              { label: 'Low',    count: overdueTasks.filter(t=>t.priority==='low').length,    color: 'var(--muted)' },
            ].map(b => <Bar key={b.label} {...b} total={overdueTasks.length} />)
          )}
        </div>
        {/* GitHub */}
        <div className="tb-card" style={{ padding: '1.125rem' }}>
          <h3 style={{ fontSize: '0.8125rem', fontWeight: '600', marginBottom: '1rem' }}>GitHub PRs</h3>
          {[
            { label: 'Open',      val: openPRs.filter(t=>t.github_pr_status==='open').length,   color: 'var(--sky)' },
            { label: 'In review', val: openPRs.filter(t=>t.github_pr_status==='review').length, color: 'var(--amber)' },
            { label: 'Merged',    val: merged.length,                                            color: 'var(--emerald)' },
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
