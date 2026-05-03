'use client';
import { useState } from 'react';

const COLS = [
  { name: 'title', note: 'required', color: 'var(--accent)' },
  { name: 'assignee', note: 'must match a member name exactly', color: 'var(--sky)' },
  { name: 'priority', note: 'high / medium / low', color: 'var(--amber)' },
  { name: 'status', note: 'todo / inprogress / review / done', color: 'var(--emerald)' },
  { name: 'due_date', note: 'YYYY-MM-DD', color: 'var(--muted)' },
  { name: 'est_hours', note: 'number', color: 'var(--muted)' },
  { name: 'description', note: 'optional', color: 'var(--muted)' },
];

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function upload(f?: File) {
    const target = f || file;
    if (!target) return;
    setUploading(true);
    setResult(null);
    const fd = new FormData();
    fd.append('file', target);
    const res = await fetch('/api/import', { method: 'POST', body: fd });
    setResult(await res.json());
    setUploading(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); upload(f); }
  }

  return (
    <div style={{ maxWidth: '640px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem' }}>Import from Excel</h1>
      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1.75rem' }}>
        QA keeps using their existing sheet — just upload it and tasks appear on the board instantly.
      </p>

      {/* Column guide */}
      <div className="tb-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.875rem' }}>Required column headers</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {COLS.map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8125rem', color: c.color, fontFamily: 'monospace', minWidth: '100px' }}>{c.name}</code>
              <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{c.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        className="tb-card"
        style={{
          padding: '2.5rem',
          textAlign: 'center',
          borderStyle: dragging ? 'solid' : 'dashed',
          borderColor: dragging ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
          boxShadow: dragging ? '0 0 0 1px var(--accent), 0 8px 32px rgba(124,92,252,0.12)' : undefined,
          transition: 'all 0.15s',
          cursor: 'pointer',
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
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
          onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
      </div>

      {file && !uploading && !result && (
        <div style={{ marginTop: '0.875rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="tb-btn tb-btn-primary" onClick={() => upload()}>
            Upload &amp; import
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
        <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', borderRadius: '0.75rem', border: `1px solid ${result.error ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`, background: result.error ? 'rgba(244,63,94,0.08)' : 'rgba(16,185,129,0.08)' }}>
          {result.error ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--rose)' }}>Error: {result.error}</p>
          ) : (
            <>
              <p style={{ fontSize: '0.875rem', color: 'var(--emerald)', fontWeight: '600' }}>✓ Imported {result.imported} tasks successfully</p>
              {result.warnings?.length > 0 && (
                <ul style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--amber)' }}>
                  {result.warnings.map((w: string, i: number) => <li key={i} style={{ marginBottom: '0.25rem' }}>⚠ {w}</li>)}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
