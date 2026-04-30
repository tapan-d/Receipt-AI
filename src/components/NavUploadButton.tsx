'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NavUploadButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/receipts/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (res.status === 409 || res.ok) {
        router.push(`/receipts/${data.id}`);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }}
      />
      <button
        aria-label="Upload receipt"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          width: 32, height: 32, padding: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: '0.5px solid var(--border-light)', background: 'transparent',
          borderRadius: 8, cursor: uploading ? 'default' : 'pointer',
          color: uploading ? 'var(--text-tertiary)' : 'var(--text-secondary)',
        }}
      >
        {uploading ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        )}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
