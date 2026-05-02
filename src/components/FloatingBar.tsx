'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Message { role: 'user' | 'assistant'; text: string; }

export default function FloatingBar() {
  const router = useRouter();
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showChat) setTimeout(() => inputRef.current?.focus(), 100);
  }, [showChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!showChat) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowChat(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showChat]);

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer || data.error || 'Something went wrong.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: String(err) }]);
    } finally {
      setLoading(false);
    }
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
    'Biggest single purchase',
  ];

  return (
    <>
      {/* FAB bar */}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center',
        background: '#0D0F1A', borderRadius: 100,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        padding: '5px',
        zIndex: 50,
        whiteSpace: 'nowrap',
      }}>
        {/* Ask AI */}
        <button
          type="button"
          onClick={() => setShowChat(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 100,
            background: '#FFD23F', border: 'none',
            color: '#0D0F1A', fontSize: 13, fontWeight: 600,
            fontFamily: 'inherit', cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#0D0F1A" style={{ flexShrink: 0 }}>
            <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
          </svg>
          Ask AI
        </button>

        {/* Upload */}
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 100,
            background: 'transparent', border: 'none',
            color: 'white', fontSize: 13, fontWeight: 500,
            fontFamily: 'inherit', cursor: uploading ? 'default' : 'pointer',
            transition: 'opacity 0.15s',
            opacity: uploading ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!uploading) e.currentTarget.style.opacity = '0.88'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = uploading ? '0.6' : '1'; }}
        >
          {uploading ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
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
        }}>
          {uploadError}
          <button onClick={() => setUploadError('')} style={{ marginLeft: 10, background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 600 }}>×</button>
        </div>
      )}

      {/* Ask AI chat bottom sheet */}
      {showChat && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowChat(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div style={{
            width: '100%', maxWidth: 560,
            background: 'white',
            borderRadius: '20px 20px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column',
            maxHeight: '75vh',
          }}>
            {/* Drag handle */}
            <div style={{ width: 36, height: 4, background: '#E2E4EE', borderRadius: 2, margin: '12px auto 0' }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px 12px', borderBottom: '1px solid #E2E4EE' }}>
              <span style={{
                width: 24, height: 24, borderRadius: 6, background: '#FFD23F', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#0D0F1A">
                  <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
                </svg>
              </span>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0D0F1A', letterSpacing: '-0.01em', flex: 1 }}>
                Ask about your spending
              </p>
              <button
                onClick={() => setShowChat(false)}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#F2F3F7', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#7B8099', fontSize: 16, lineHeight: 1, fontFamily: 'inherit',
                }}
              >×</button>
            </div>

            {/* Chat area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 120 }}>
              {messages.length === 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CHIPS.map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => ask(chip)}
                      style={{
                        fontSize: 12, fontWeight: 500, padding: '7px 14px',
                        border: '1.5px solid #E2E4EE', borderRadius: 100,
                        background: 'white', color: '#0D0F1A',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    background: msg.role === 'user' ? '#2952E3' : '#F2F3F7',
                    color: msg.role === 'user' ? 'white' : '#0D0F1A',
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '12px 16px', borderRadius: '14px 14px 14px 4px', background: '#F2F3F7', display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <div key={i} className="dot-bounce" style={{
                        width: 6, height: 6, borderRadius: '50%', background: '#7B8099',
                        animationDelay: `${delay}s`,
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input row */}
            <div style={{ padding: '12px 20px 28px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ask(input); } }}
                placeholder="Ask about your purchases…"
                disabled={loading}
                style={{
                  flex: 1, padding: '10px 14px',
                  fontSize: 14, fontFamily: 'inherit',
                  color: '#0D0F1A', background: 'white',
                  border: '1.5px solid #E2E4EE', borderRadius: 12, outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#2952E3'}
                onBlur={e => e.currentTarget.style.borderColor = '#E2E4EE'}
              />
              <button
                type="button"
                onClick={() => ask(input)}
                disabled={loading || !input.trim()}
                style={{
                  width: 40, height: 40, borderRadius: 12, border: 'none', flexShrink: 0,
                  background: input.trim() && !loading ? '#2952E3' : '#E2E4EE',
                  cursor: input.trim() && !loading ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={input.trim() && !loading ? 'white' : '#7B8099'}
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
