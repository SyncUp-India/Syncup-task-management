'use client'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { DEPT_META, TASK_DEPARTMENTS } from '@/lib/departments'

const EMPTY = {
  title: '', description: '', assignee_id: '', priority: 'medium',
  due_date: '', est_hours: 0, status: 'todo', department: '',
  // QA fields
  test_id: '', steps_to_reproduce: '', expected_result: '', actual_result: '', pass_fail: '',
  // Dev fields
  github_pr_url: '',
}

export default function NewTaskModal({ members, onClose, onCreated }: any) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  // Determine active department for field logic
  const activeDept = isAdmin ? form.department : (user?.department || '')
  const isDevTask  = activeDept === 'developer'
  const isQATask   = activeDept === 'qa'

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function submit() {
    if (!form.title.trim()) { alert('Title is required'); return }
    setSaving(true)

    const body: any = {
      title:       form.title.trim(),
      description: form.description || null,
      assignee_id: form.assignee_id || null,
      priority:    form.priority,
      due_date:    form.due_date || null,
      est_hours:   form.est_hours || 0,
      status:      form.status,
      source:      'manual',
    }
    if (isAdmin) body.department = form.department || null

    if (isDevTask && form.github_pr_url) body.github_pr_url = form.github_pr_url

    if (isQATask) {
      if (form.test_id)            body.test_id            = form.test_id
      if (form.steps_to_reproduce) body.steps_to_reproduce = form.steps_to_reproduce
      if (form.expected_result)    body.expected_result    = form.expected_result
      if (form.actual_result)      body.actual_result      = form.actual_result
      if (form.pass_fail)          body.pass_fail          = form.pass_fail
    }

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) onCreated()
    else alert('Failed to create task')
  }

  return (
    <div className="tb-modal-bg" onClick={onClose}>
      <div className="tb-modal" style={{ width: '100%', maxWidth: '540px' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg,rgba(59,130,246,0.05) 0%,transparent 100%)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>New Task</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
            {isQATask ? 'QA test case' : isDevTask ? 'Development task' : 'Task'}
          </p>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', maxHeight: '70vh', overflowY: 'auto' }}>

          {/* Department — admin only, controls which fields appear */}
          {isAdmin && (
            <div>
              <Lbl>Department</Lbl>
              <select className="tb-input" value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">— None —</option>
                {TASK_DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{DEPT_META[d]?.label ?? d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <Lbl>Title *</Lbl>
            <input className="tb-input" placeholder="What needs to be done?" value={form.title}
              onChange={e => set('title', e.target.value)} autoFocus />
          </div>

          {/* Description */}
          <div>
            <Lbl>Description</Lbl>
            <textarea className="tb-input" style={{ minHeight: '68px', resize: 'vertical' }}
              placeholder="Optional details…" value={form.description}
              onChange={e => set('description', e.target.value)} />
          </div>

          {/* QA-specific fields */}
          {isQATask && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <Lbl>Test ID</Lbl>
                  <input className="tb-input" placeholder="TC-001" value={form.test_id}
                    onChange={e => set('test_id', e.target.value)} />
                </div>
                <div>
                  <Lbl>Pass / Fail</Lbl>
                  <select className="tb-input" value={form.pass_fail} onChange={e => set('pass_fail', e.target.value)}>
                    <option value="">Pending</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                  </select>
                </div>
              </div>
              <div>
                <Lbl>Steps to Reproduce</Lbl>
                <textarea className="tb-input" style={{ minHeight: '60px', resize: 'vertical' }}
                  placeholder="1. Open app&#10;2. Click…" value={form.steps_to_reproduce}
                  onChange={e => set('steps_to_reproduce', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <Lbl>Expected Result</Lbl>
                  <textarea className="tb-input" style={{ minHeight: '56px', resize: 'vertical' }}
                    placeholder="Should show…" value={form.expected_result}
                    onChange={e => set('expected_result', e.target.value)} />
                </div>
                <div>
                  <Lbl>Actual Result</Lbl>
                  <textarea className="tb-input" style={{ minHeight: '56px', resize: 'vertical' }}
                    placeholder="Instead shows…" value={form.actual_result}
                    onChange={e => set('actual_result', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* Dev-specific fields */}
          {isDevTask && (
            <div>
              <Lbl>GitHub PR URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></Lbl>
              <input className="tb-input" placeholder="https://github.com/org/repo/pull/42"
                value={form.github_pr_url} onChange={e => set('github_pr_url', e.target.value)} />
            </div>
          )}

          {/* Common fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <Lbl>Assignee</Lbl>
              <select className="tb-input" value={form.assignee_id} onChange={e => set('assignee_id', e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <Lbl>Priority</Lbl>
              <select className="tb-input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <Lbl>Due Date</Lbl>
              <input type="date" className="tb-input" value={form.due_date}
                onChange={e => set('due_date', e.target.value)} />
            </div>
            <div>
              <Lbl>Estimate (hrs)</Lbl>
              <input type="number" step="0.5" min="0" className="tb-input" placeholder="0"
                value={form.est_hours || ''}
                onChange={e => set('est_hours', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <button className="tb-btn" onClick={onClose}>Cancel</button>
            <button className="tb-btn tb-btn-primary" onClick={submit} disabled={saving}>
              {saving ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Lbl({ children }: any) {
  return (
    <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginBottom: '0.375rem' }}>
      {children}
    </p>
  )
}
