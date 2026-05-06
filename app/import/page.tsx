'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'

const QA_COLS = [
  { name: 'Test ID',              note: 'unique test identifier',           color: 'var(--muted)' },
  { name: 'Title',                note: 'required — test case title',       color: 'var(--accent)' },
  { name: 'Description',          note: 'what is being tested',             color: 'var(--muted)' },
  { name: 'Steps to Reproduce',   note: 'numbered steps',                   color: 'var(--muted)' },
  { name: 'Expected Result',      note: 'what should happen',               color: 'var(--muted)' },
  { name: 'Actual Result',        note: 'what actually happened',           color: 'var(--muted)' },
  { name: 'Pass/Fail',            note: 'Pass · Fail · Pending',            color: 'var(--emerald)' },
  { name: 'Severity/Priority',    note: 'Critical · High · Medium · Low',   color: 'var(--amber)' },
  { name: 'Attachment',           note: 'link URL to screenshot/file',      color: 'var(--sky)' },
  { name: 'Status',               note: 'todo · inprogress · review · done', color: 'var(--muted)' },
  { name: 'Assign To',            note: 'must match a member name exactly', color: 'var(--accent)' },
  { name: 'Expected Time',        note: 'hours (number)',                   color: 'var(--muted)' },
]

export default function ImportPage() {
  const { user } = useAuth()
  const [file,       setFile]       = useState<File | null>(null)
  const [result,     setResult]     = useState<any>(null)
  const [uploading,  setUploading]  = useState(false)
  const [dragging,   setDragging]   = useState(false)
  const [department, setDepartment] = useState('')
  const [depts,      setDepts]      = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/departments').then(r => r.json()).then(d => setDepts(d.departments || []))
  }, [])

  async function upload(f?: File) {
    const target = f || file
    if (!target) return
    setUploading(true)
    setResult(null)
    const fd = new FormData()
    fd.append('file', target)
    if (department) fd.append('department', department)
    const res = await fetch('/api/import', { method: 'POST', body: fd })
    setResult(await res.json())
    setUploading(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); upload(f) }
  }

  return (
    <div style={{ maxWidth: '680px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem' }}>Import from Excel</h1>
      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1.75rem' }}>
        Import QA test cases from your Excel sheet. Multiple tabs are supported — each tab becomes a tag.
      </p>

      {/* Multi-tab tip */}
      <div className="tb-card" style={{ padding: '0.875rem 1rem', marginBottom: '1.25rem', background: 'rgba(59,130,246,0.04)', borderColor: 'rgba(59,130,246,0.2)' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: '500', marginBottom: '2px' }}>📑 Multi-tab support</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          Each Excel sheet tab (e.g. "Login Module", "Dashboard") is imported as a separate tag on your tasks.
          Single-tab files don't get a tag.
        </p>
      </div>

      {/* Column guide */}
      <div className="tb-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.875rem' }}>Column headers (QA test case format)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {QA_COLS.map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', color: c.color, fontFamily: 'monospace', minWidth: '160px', flexShrink: 0 }}>{c.name}</code>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{c.note}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.625rem' }}>
          Column names are case-insensitive. Only <code style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>Title</code> is required. All other columns are optional.
        </p>
      </div>

      {/* Department selector */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: '500', marginBottom: '0.375rem' }}>
          Assign to Department (optional)
        </label>
        <select className="tb-input" style={{ maxWidth: '260px' }} value={department} onChange={e => setDepartment(e.target.value)}>
          <option value="">— All departments / unassigned —</option>
          {depts.filter(d => d.name !== 'admin').map(d => (
            <option key={d.name} value={d.name}>{d.label}</option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      <div
        className="tb-card"
        style={{
          padding: '2.5rem', textAlign: 'center',
          borderStyle: dragging ? 'solid' : 'dashed',
          borderColor: dragging ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
          boxShadow: dragging ? '0 0 0 1px var(--accent)' : undefined,
          transition: 'all 0.15s', cursor: 'pointer',
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(124,92,252,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--ink)', marginBottom: '0.375rem' }}>
          {file ? file.name : 'Drop your Excel file here'}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>or click to browse · .xlsx, .xls, .csv</p>
        <input id="file-input" type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
      </div>

      {file && !uploading && !result && (
        <div style={{ marginTop: '0.875rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="tb-btn tb-btn-primary" onClick={() => upload()}>
            Upload &amp; Import
          </button>
        </div>
      )}

      {uploading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', marginTop: '1rem', fontSize: '0.875rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Importing…
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', borderRadius: '0.75rem', border: `1px solid ${result.error ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`, background: result.error ? 'rgba(244,63,94,0.06)' : 'rgba(16,185,129,0.06)' }}>
          {result.error ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--rose)' }}>Error: {result.error}</p>
          ) : (
            <>
              <p style={{ fontSize: '0.875rem', color: 'var(--emerald)', fontWeight: '600' }}>
                ✓ Imported {result.imported} task{result.imported !== 1 ? 's' : ''} from {result.sheets} sheet{result.sheets !== 1 ? 's' : ''}
              </p>
              {result.warnings?.length > 0 && (
                <ul style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--amber)' }}>
                  {result.warnings.map((w: string, i: number) => <li key={i} style={{ marginBottom: '0.25rem' }}>⚠ {w}</li>)}
                </ul>
              )}
              <button className="tb-btn" style={{ marginTop: '0.75rem', fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => { setFile(null); setResult(null) }}>
                Import another file
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
