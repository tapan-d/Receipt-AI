'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function EmptyStateCTA({ userName }: { userName: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/receipts/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (res.status === 409) { router.push(`/receipts/${data.id}`); return; }
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      router.push(`/receipts/${data.id}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  }, [router]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = userName?.split(' ')[0] ?? 'there';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Greeting */}
      <div>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#0D0F1A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          {greeting}, {firstName} 👋
        </p>
        <p style={{ fontSize: 14, color: '#7B8099', margin: 0 }}>
          Let&apos;s start tracking your spending.
        </p>
      </div>

      {/* Upload CTA card */}
      <div style={{
        background: 'linear-gradient(135deg, #1A3ACC, #2952E3)',
        borderRadius: 18, padding: 20,
      }}>
        <div
          style={{
            border: '1.5px dashed rgba(255,255,255,0.35)',
            borderRadius: 14, padding: '28px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) upload(file);
          }}
        >
          {/* Camera icon with sparkle badge */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <span style={{
              position: 'absolute', top: -4, right: -4,
              width: 18, height: 18, borderRadius: '50%',
              background: '#FFD23F',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: '#0D0F1A', fontWeight: 700,
            }}>✦</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>
              Upload your first receipt
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>
              Drag &amp; drop or tap to select
            </p>
          </div>

          {/* Format badges */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['JPEG', 'PNG', 'PDF', 'HEIC'].map(fmt => (
              <span key={fmt} className="mono" style={{
                background: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 10, borderRadius: 6, padding: '3px 7px',
              }}>{fmt}</span>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          style={{
            width: '100%', marginTop: 12, padding: '11px',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 12,
            color: 'white', fontSize: 14, fontWeight: 500,
            cursor: uploading ? 'default' : 'pointer', fontFamily: 'inherit',
            opacity: uploading ? 0.7 : 1,
          }}
        >
          {uploading ? 'Processing…' : 'Take a photo now'}
        </button>
      </div>

      {/* How it works */}
      <div style={{
        background: 'white', border: '1.5px solid #E2E4EE',
        borderRadius: 16, padding: '16px 20px',
      }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7B8099', margin: '0 0 16px' }}>
          How it works
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { n: 1, title: 'Snap your receipt', sub: 'Take a photo or upload an image' },
            { n: 2, title: 'AI extracts everything', sub: 'Items, prices, and categories automatically' },
            { n: 3, title: 'Explore your spending', sub: 'Charts, trends, and AI-powered insights' },
          ].map(({ n, title, sub }) => (
            <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <span style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: '#EEF2FF', color: '#2952E3',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700,
              }}>{n}</span>
              <div style={{ paddingTop: 4 }}>
                <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: '#0D0F1A' }}>{title}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#7B8099' }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ fontSize: 13, color: 'var(--red)', textAlign: 'center', margin: 0 }}>{error}</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
      />
    </div>
  );
}
