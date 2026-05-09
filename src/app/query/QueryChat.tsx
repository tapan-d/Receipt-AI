'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface Message { role: 'user' | 'assistant'; text: string; }

export default function QueryChat() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const didAutoAsk = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !didAutoAsk.current) {
      const trimmed = q.trim().slice(0, 500);
      if (trimmed.length > 0) {
        didAutoAsk.current = true;
        ask(trimmed);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const EXAMPLES = [
    'How much did I spend on dairy this month?',
    'What are my most purchased items?',
    'Show me olive oil price history.',
    'Total spent at Costco this year?',
  ];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 10rem)' }}>
      <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 16px', letterSpacing: '-0.015em' }}>Ask AI</h1>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Ask anything about your receipts. Try:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => ask(ex)} style={{
                  textAlign: 'left', padding: '12px 14px',
                  background: 'var(--bg-secondary)',
                  border: '0.5px solid var(--border-light)', borderRadius: 8,
                  fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '10px 14px', borderRadius: 10,
              fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              background: msg.role === 'user' ? 'var(--text-primary)' : 'var(--bg-secondary)',
              color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px', borderRadius: 10, fontSize: 14,
              background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
            }}>
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ paddingTop: 14, borderTop: '0.5px solid var(--border-light)', display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask(input)}
          placeholder="Ask about your purchases…"
          disabled={loading}
          style={{
            flex: 1, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit',
            color: 'var(--text-primary)', background: 'var(--bg-primary)',
            border: '0.5px solid var(--border-light)', borderRadius: 8, outline: 'none',
          }}
        />
        <button
          onClick={() => ask(input)}
          disabled={loading || !input.trim()}
          style={{
            padding: '11px 18px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
            background: 'var(--text-primary)', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            opacity: loading || !input.trim() ? 0.4 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          Ask
        </button>
      </div>
    </div>
  );
}
