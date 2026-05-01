'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FloatingBar() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showModal) textareaRef.current?.focus();
  }, [showModal]);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]);

  const submit = () => {
    if (!query.trim()) return;
    setShowModal(false);
    router.push(`/query?q=${encodeURIComponent(query.trim())}`);
    setQuery('');
  };

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/receipts/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (res.status === 409) { router.push(`/receipts/${data.id}`); return; }
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      router.push(`/receipts/${data.id}`);
    } catch (err) {
      setUploadError(String(err));
    } finally {
      setUploading(false);
    }
  }, [router]);

  const CHIPS = [
    'Top stores this month',
    'Groceries vs last month',
    'How much tax did I pay?',
  ];

  return (
    <>
      {/* Pill bar */}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center',
        background: 'var(--text-primary)', borderRadius: 100,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)',
        padding: '6px 8px',
        gap: 4,
        zIndex: 50,
        whiteSpace: 'nowrap',
      }}>
        {/* Ask AI */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 100,
            background: 'rgba(255,255,255,0.12)', border: 'none',
            color: 'white', fontSize: 13, fontWeight: 500,
            fontFamily: 'inherit', cursor: 'pointer',
            transition: 'background 0.15s',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"
              fill="url(#starW)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="starW" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fff9c4"/>
                <stop offset="100%" stopColor="#ffd54f"/>
              </linearGradient>
            </defs>
          </svg>
          Ask AI
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />

        {/* Upload */}
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 100,
            background: uploading ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none',
            color: 'white', fontSize: 13, fontWeight: 500,
            fontFamily: 'inherit', cursor: uploading ? 'default' : 'pointer',
            transition: 'background 0.15s',
            letterSpacing: '-0.01em',
            opacity: uploading ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          {uploading ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          )}
          {uploading ? 'Processing…' : 'Upload'}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
        />
      </div>

      {/* Upload error toast */}
      {uploadError && (
        <div style={{
          position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
          background: '#dc2626', color: 'white', fontSize: 13, padding: '10px 16px',
          borderRadius: 8, zIndex: 51, maxWidth: 320, textAlign: 'center',
          boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
        }}>
          {uploadError}
          <button onClick={() => setUploadError('')} style={{
            marginLeft: 10, background: 'none', border: 'none', color: 'white',
            cursor: 'pointer', fontWeight: 600,
          }}>×</button>
        </div>
      )}

      {/* Ask AI modal */}
      {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 16px 96px',
          }}
        >
          <div style={{
            width: '100%', maxWidth: 520,
            background: 'var(--bg-primary)',
            borderRadius: 16,
            padding: '20px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"
                  fill="url(#starM)" stroke="#c8960a" strokeWidth="0.5" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="starM" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#f9e077"/>
                    <stop offset="100%" stopColor="#b8860b"/>
                  </linearGradient>
                </defs>
              </svg>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Ask about your spending</p>
              <button
                onClick={() => setShowModal(false)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 20, lineHeight: 1, padding: 0 }}
              >×</button>
            </div>

            <textarea
              ref={textareaRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="How much did I spend on groceries this month?"
              rows={3}
              style={{
                width: '100%', padding: '10px 12px',
                fontSize: 14, fontFamily: 'inherit',
                color: 'var(--text-primary)', background: 'var(--bg-secondary)',
                border: '0.5px solid var(--border-medium)', borderRadius: 8,
                outline: 'none', resize: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-medium)'}
            />

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, marginBottom: 14 }}>
              {CHIPS.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => { setQuery(chip); textareaRef.current?.focus(); }}
                  style={{
                    fontSize: 12, padding: '5px 11px',
                    background: 'var(--bg-secondary)',
                    border: '0.5px solid var(--border-medium)',
                    borderRadius: 8, color: 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={!query.trim()}
              style={{
                width: '100%', height: 42,
                background: query.trim() ? 'var(--text-primary)' : 'var(--bg-tertiary)',
                color: query.trim() ? 'white' : 'var(--text-tertiary)',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
                cursor: query.trim() ? 'pointer' : 'default',
                transition: 'background 0.15s, color 0.15s',
                letterSpacing: '-0.01em',
              }}
            >
              Ask
            </button>
          </div>
        </div>
      )}
    </>
  );
}
