'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { preprocessImage } from '@/lib/imagePreprocess';

export default function DashboardUpload() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const upload = useCallback(async (file: File) => {
    setState('uploading');
    try {
      const processed = await preprocessImage(file);
      const form = new FormData();
      form.append('image', processed);
      const res = await fetch('/api/receipts/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (res.status === 409) {
        router.push(`/receipts/${data.id}`);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      router.push(`/receipts/${data.id}`);
    } catch (err) {
      setErrorMsg(String(err));
      setState('error');
    }
  }, [router]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  return (
    <label
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      style={{
        display: 'block',
        background: isDragging ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: `1px solid ${isDragging ? 'var(--border-medium)' : 'var(--border-light)'}`,
        borderRadius: 12,
        padding: '36px 24px 28px',
        textAlign: 'center',
        cursor: state === 'uploading' ? 'default' : 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={state === 'uploading'}
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }}
      />

      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'var(--accent)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10, color: 'white',
        transition: 'transform 0.2s ease',
      }}>
        {state === 'uploading' ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        )}
      </div>

      <p style={{ fontSize: 15, fontWeight: 500, margin: '0 0 3px', letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>
        {state === 'uploading' ? 'Extracting receipt data…' : 'Add receipts'}
      </p>
      <p style={{ fontSize: 13, color: state === 'error' ? 'var(--danger-text)' : 'var(--text-secondary)', margin: 0 }}>
        {state === 'error' ? errorMsg : 'Snap a photo, upload from your files, or drop one here'}
      </p>
      {state === 'error' && (
        <button
          type="button"
          onClick={e => { e.preventDefault(); setState('idle'); setErrorMsg(''); }}
          style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Try again
        </button>
      )}

    </label>
  );
}
