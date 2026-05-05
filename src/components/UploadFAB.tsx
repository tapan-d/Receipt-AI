'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { preprocessImage } from '@/lib/imagePreprocess';

export default function UploadFAB() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const processed = await preprocessImage(file);
      const form = new FormData();
      form.append('image', processed);
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
        aria-label="Add receipt"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--text-primary)',
          color: 'white',
          border: 'none',
          cursor: uploading ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)',
          zIndex: 50,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          opacity: uploading ? 0.7 : 1,
        }}
        onMouseEnter={e => {
          if (!uploading) {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 6px 22px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)';
        }}
      >
        {uploading ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        )}
      </button>
    </>
  );
}
