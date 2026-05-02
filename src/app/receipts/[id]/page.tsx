'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Receipt, ReceiptItem } from '@/lib/types';

const CAT_COLORS: Record<string, { fg: string; bg: string }> = {
  Produce:             { fg: '#059669', bg: '#D1FAE5' },
  Bakery:              { fg: '#B45309', bg: '#FEF3C7' },
  'Frozen Foods':      { fg: '#0EA5E9', bg: '#E0F2FE' },
  Snacks:              { fg: '#EC4899', bg: '#FCE7F3' },
  Services:            { fg: '#8B5CF6', bg: '#EDE9FE' },
  Dining:              { fg: '#EF4444', bg: '#FEE2E2' },
  Shopping:            { fg: '#EF4444', bg: '#FEE2E2' },
  Dairy:               { fg: '#0EA5E9', bg: '#E0F2FE' },
  'Meat & Seafood':    { fg: '#EF4444', bg: '#FEE2E2' },
  Beverages:           { fg: '#2952E3', bg: '#EEF2FF' },
  'Canned & Packaged': { fg: '#7B8099', bg: '#F2F3F7' },
  'Oils & Condiments': { fg: '#B45309', bg: '#FEF3C7' },
  Household:           { fg: '#8B5CF6', bg: '#EDE9FE' },
  'Personal Care':     { fg: '#EC4899', bg: '#FCE7F3' },
  Other:               { fg: '#6366F1', bg: '#EEF2FF' },
};

function catInitial(cat: string) { return cat.trim()[0]?.toUpperCase() ?? '?'; }
function toTitleCase(s: string)  { return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
function storeInitials(n: string){ return n.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2); }

function IconTile({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#F2F3F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {children}
    </div>
  );
}

function InfoRow({ icon, children, first }: { icon: React.ReactNode; children: React.ReactNode; first?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: first ? 'none' : '1px solid #E2E4EE' }}>
      {icon}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1.5px solid #E2E4EE', borderRadius: 14, overflow: 'hidden' }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7B8099', margin: 0, padding: '12px 16px' }}>
        {label}
      </p>
      {children}
    </div>
  );
}

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [receipt, setReceipt]           = useState<Receipt | null>(null);
  const [items, setItems]               = useState<ReceiptItem[]>([]);
  const [imageUrl, setImageUrl]         = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [lightbox, setLightbox]         = useState(false);

  useEffect(() => {
    fetch(`/api/receipts/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else {
          setReceipt(data.receipt);
          setItems(data.items);
          setImageUrl(data.image_url ?? null);
        }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p style={{ fontSize: 14, color: '#7B8099' }}>Loading…</p>;
  if (error)   return <p style={{ fontSize: 14, color: 'var(--red)' }}>{error}</p>;
  if (!receipt) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/receipts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      router.push('/receipts');
    } catch (err) {
      setError(String(err));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const catCounts: Record<string, number> = {};
  for (const item of items) catCounts[item.category] = (catCounts[item.category] ?? 0) + 1;
  const primaryCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Other';
  const hasTotals = receipt.subtotal > 0 || receipt.tax_amount > 0 || receipt.discount > 0;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Nav row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/receipts" style={{
            width: 32, height: 32, borderRadius: 10, background: '#F2F3F7',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none', flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3D4154" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0D0F1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {receipt.store_name}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#7B8099' }}>{receipt.purchase_date}</p>
          </div>
          {confirmDelete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: '1.5px solid #E2E4EE', background: 'transparent', cursor: 'pointer', color: '#7B8099', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: 'none', background: 'var(--red)', color: 'white', cursor: deleting ? 'default' : 'pointer', fontFamily: 'inherit', opacity: deleting ? 0.6 : 1 }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={{
              padding: '6px 12px', borderRadius: 10, border: '1.5px solid #E2E4EE',
              background: '#F2F3F7', cursor: 'pointer', color: '#7B8099',
              fontSize: 12, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
              Delete
            </button>
          )}
        </div>

        {/* Summary card */}
        <div style={{ background: '#F2F3F7', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7B8099', margin: '0 0 4px' }}>TOTAL</p>
              <p className="mono" style={{ fontSize: 30, fontWeight: 500, color: '#0D0F1A', margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>
                ${receipt.total.toFixed(2)}
              </p>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: '#EEF2FF', color: '#2952E3',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700,
            }}>
              {storeInitials(receipt.store_name)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, background: 'white', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ fontSize: 11, color: '#7B8099', margin: '0 0 2px' }}>Items</p>
              <p className="mono" style={{ fontSize: 16, fontWeight: 500, color: '#0D0F1A', margin: 0 }}>{receipt.item_count}</p>
            </div>
            <div style={{ flex: 1, background: 'white', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ fontSize: 11, color: '#7B8099', margin: '0 0 2px' }}>Category</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#0D0F1A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{primaryCat}</p>
            </div>
            {receipt.purchase_time && (
              <div style={{ flex: 1, background: 'white', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ fontSize: 11, color: '#7B8099', margin: '0 0 2px' }}>Time</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#0D0F1A', margin: 0 }}>{receipt.purchase_time}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Receipt Image section ───────────────────────────────────────── */}
        <div>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7B8099' }}>
              Receipt Image
            </span>
            <button
              type="button"
              onClick={() => setImageExpanded(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 12, fontWeight: 500, color: '#2952E3', fontFamily: 'inherit',
              }}
            >
              {imageExpanded ? 'Collapse' : 'View'}
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="#2952E3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: 'transform 0.2s', transform: imageExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>

          {imageUrl ? (
            imageExpanded ? (
              /* ── Expanded ── */
              <div style={{ position: 'relative', borderRadius: 14, border: '1.5px solid #E2E4EE', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Receipt"
                  style={{ width: '100%', display: 'block' }}
                />
                {/* Fullscreen button */}
                <button
                  type="button"
                  onClick={() => setLightbox(true)}
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 32, height: 32, borderRadius: 8,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
                {/* AI badge */}
                <div style={{
                  position: 'absolute', bottom: 10, left: 10,
                  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                  borderRadius: 100, padding: '5px 10px',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: 4, background: '#FFD23F',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="#0D0F1A">
                      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
                    </svg>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'white' }}>
                    AI extracted {items.length} item{items.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ) : (
              /* ── Collapsed ── */
              <div
                onClick={() => setImageExpanded(true)}
                style={{
                  height: 110, borderRadius: 14, border: '1.5px solid #E2E4EE',
                  background: '#FAFAFA', overflow: 'hidden', position: 'relative', cursor: 'pointer',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Receipt"
                  style={{ width: '100%', display: 'block', objectFit: 'cover', objectPosition: 'top' }}
                />
                {/* Fade gradient */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
                  background: 'linear-gradient(to bottom, transparent, rgba(250,250,250,0.96))',
                }} />
                {/* "Tap to expand" pill */}
                <div style={{
                  position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                  borderRadius: 100, padding: '5px 12px',
                  display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                  <span style={{ fontSize: 11, color: 'white' }}>Tap to expand</span>
                </div>
              </div>
            )
          ) : (
            /* ── No image placeholder ── */
            <div style={{
              height: 96, borderRadius: 14, border: '1.5px dashed #E2E4EE',
              background: '#FAFAFA',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B4B8CC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span style={{ fontSize: 12, color: '#B4B8CC' }}>No image attached</span>
            </div>
          )}
        </div>

        {/* ── Extracted Items ─────────────────────────────────────────────── */}
        {items.length > 0 && (
          <div style={{ background: 'white', border: '1.5px solid #E2E4EE', borderRadius: 16, overflow: 'hidden' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7B8099', margin: 0, padding: '14px 16px 10px', borderBottom: '1px solid #E2E4EE' }}>
              Extracted Items
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {items.map((item) => {
                const colors = CAT_COLORS[item.category] ?? CAT_COLORS.Other;
                return (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
                    borderBottom: '1px solid #E2E4EE',
                  }}>
                    <span style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 600,
                      background: colors.bg, color: colors.fg,
                    }}>
                      {catInitial(item.category)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#0D0F1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {toTitleCase(item.item_name)}
                      </p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: '#7B8099' }}>{item.category}</p>
                    </div>
                    <p className="mono" style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#0D0F1A', flexShrink: 0 }}>
                      ${item.total_price.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Totals card (single connected block) ──────────────────────── */}
        {hasTotals && (
          <div style={{ background: '#F2F3F7', borderRadius: 12, overflow: 'hidden' }}>
            {receipt.subtotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                <span style={{ fontSize: 13, color: '#7B8099' }}>Subtotal</span>
                <span className="mono" style={{ fontSize: 13, color: '#0D0F1A' }}>${receipt.subtotal.toFixed(2)}</span>
              </div>
            )}
            {receipt.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #E8EAF2' }}>
                <span style={{ fontSize: 13, color: '#7B8099' }}>Discount</span>
                <span className="mono" style={{ fontSize: 13, color: 'var(--green)' }}>-${receipt.discount.toFixed(2)}</span>
              </div>
            )}
            {receipt.tax_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #E8EAF2' }}>
                <span style={{ fontSize: 13, color: '#7B8099' }}>Tax{receipt.tax_rate > 0 ? ` (${receipt.tax_rate}%)` : ''}</span>
                <span className="mono" style={{ fontSize: 13, color: '#0D0F1A' }}>${receipt.tax_amount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #E8EAF2' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0D0F1A' }}>Total</span>
              <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: '#0D0F1A' }}>${receipt.total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* ── Store Information ─────────────────────────────────────────── */}
        {(receipt.store_address || receipt.store_phone || receipt.store_website) && (
          <SectionCard label="Store Information">
            {/* Merchant row */}
            <InfoRow first icon={
              <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EEF2FF', color: '#2952E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {storeInitials(receipt.store_name)}
              </div>
            }>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#0D0F1A' }}>{receipt.store_name}</span>
              {receipt.store_address && <span style={{ fontSize: 12, color: '#7B8099', marginTop: 1 }}>{receipt.store_address}</span>}
            </InfoRow>
            {receipt.store_phone && (
              <InfoRow icon={<IconTile>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7B8099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.09 6.09l1.27-.78a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </IconTile>}>
                <span style={{ fontSize: 14, color: '#0D0F1A' }}>{receipt.store_phone}</span>
              </InfoRow>
            )}
            {receipt.store_website && (
              <InfoRow icon={<IconTile>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7B8099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </IconTile>}>
                <a href={receipt.store_website} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: '#2952E3', textDecoration: 'none' }}>
                  {receipt.store_website.replace(/^https?:\/\//, '')}
                </a>
              </InfoRow>
            )}
          </SectionCard>
        )}

        {/* ── Transaction Details ────────────────────────────────────────── */}
        {(receipt.order_number || receipt.payment_method || receipt.purchase_date) && (
          <SectionCard label="Transaction Details">
            {/* Date / Time side-by-side */}
            <InfoRow first icon={<IconTile>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7B8099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </IconTile>}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#7B8099' }}>Date</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#0D0F1A' }}>{receipt.purchase_date}</p>
                </div>
                {receipt.purchase_time && (
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: '#7B8099' }}>Time</p>
                    <p style={{ margin: 0, fontSize: 14, color: '#0D0F1A' }}>{receipt.purchase_time}</p>
                  </div>
                )}
              </div>
            </InfoRow>
            {receipt.employee_name && (
              <InfoRow icon={<IconTile>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7B8099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </IconTile>}>
                <span style={{ fontSize: 11, color: '#7B8099' }}>Served by</span>
                <span style={{ fontSize: 14, color: '#0D0F1A' }}>{receipt.employee_name}</span>
              </InfoRow>
            )}
            {receipt.order_number && (
              <InfoRow icon={<IconTile>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7B8099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </IconTile>}>
                <span style={{ fontSize: 11, color: '#7B8099' }}>Transaction ID</span>
                <span className="mono" style={{ fontSize: 13, color: '#0D0F1A' }}>{receipt.order_number}</span>
              </InfoRow>
            )}
            {receipt.payment_method && (
              <InfoRow icon={<IconTile>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7B8099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </IconTile>}>
                <span style={{ fontSize: 11, color: '#7B8099' }}>Payment</span>
                <span style={{ fontSize: 14, color: '#0D0F1A' }}>
                  {receipt.payment_method}{receipt.card_last4 ? ` ···· ${receipt.card_last4}` : ''}
                </span>
              </InfoRow>
            )}
          </SectionCard>
        )}

        {/* ── Rewards & Savings ──────────────────────────────────────────── */}
        {(receipt.reward_points_current > 0 || receipt.reward_program_name || receipt.discount > 0) && (
          <SectionCard label="Rewards & Savings">
            {receipt.reward_program_name && (
              <InfoRow first icon={<IconTile>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7B8099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </IconTile>}>
                <span style={{ fontSize: 11, color: '#7B8099' }}>Program</span>
                <span style={{ fontSize: 14, color: '#0D0F1A' }}>{receipt.reward_program_name}</span>
              </InfoRow>
            )}
            {receipt.reward_points_current > 0 && (
              <InfoRow icon={<IconTile>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#F59E0B">
                  <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
                </svg>
              </IconTile>}>
                <span style={{ fontSize: 11, color: '#7B8099' }}>Points balance</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#B45309' }}>
                  {receipt.reward_points_current.toLocaleString()} pts
                </span>
              </InfoRow>
            )}
            {receipt.discount > 0 && (
              <InfoRow icon={<IconTile>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                </svg>
              </IconTile>}>
                <span style={{ fontSize: 11, color: '#7B8099' }}>You saved</span>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: '#059669' }}>
                  −${receipt.discount.toFixed(2)}
                </span>
              </InfoRow>
            )}
          </SectionCard>
        )}

      </div>

      {/* ── Lightbox ────────────────────────────────────────────────────── */}
      {lightbox && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '24px 20px',
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightbox(false)}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <p style={{ fontSize: 14, fontWeight: 600, color: 'white', margin: '0 0 16px', textAlign: 'center' }}>
            {receipt.store_name}
          </p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl!}
            alt="Receipt"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 320, width: '100%', borderRadius: 12,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              display: 'block',
            }}
          />

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '14px 0 0' }}>
            Tap outside to close
          </p>
        </div>
      )}
    </>
  );
}
