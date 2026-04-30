'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CHIPS = [
  'Top 5 stores this year',
  'Groceries vs last quarter',
  'How much tax did I pay?',
];

export default function DashboardQuery() {
  const router = useRouter();
  const [input, setInput] = useState('');

  const go = (q: string) => {
    if (!q.trim()) return;
    router.push(`/query?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <section style={{
      border: '0.5px solid var(--border-medium)',
      borderRadius: 12,
      padding: '18px 20px',
      background: 'var(--bg-secondary)',
    }}>
      {/* Label with AI icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)', flexShrink: 0 }}>
          <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
        </svg>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
          Ask anything about your spending
        </p>
      </div>

      {/* Input */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: 'var(--text-tertiary)', display: 'flex',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
        </span>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go(input)}
          placeholder="How much did I spend on groceries this month?"
          style={{
            width: '100%', padding: '11px 12px 11px 36px',
            fontSize: 14, fontFamily: 'inherit',
            color: 'var(--text-primary)', background: 'var(--bg-primary)',
            border: '0.5px solid var(--border-medium)', borderRadius: 8,
            outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--text-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.05)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {CHIPS.map(chip => (
          <button
            key={chip}
            type="button"
            onClick={() => go(chip)}
            style={{
              fontSize: 12, padding: '5px 11px',
              background: 'var(--bg-primary)',
              border: '0.5px solid var(--border-medium)',
              borderRadius: 8, color: 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-primary)'; }}
          >
            {chip}
          </button>
        ))}
      </div>
    </section>
  );
}
