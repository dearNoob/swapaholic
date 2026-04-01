'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { bidsApi, WonBid } from '../../../api/bids';

export default function WonBidsPage() {
  const router = useRouter();
  const [wonBids, setWonBids] = useState<WonBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchWonBids = useCallback(async () => {
    try {
      setLoading(true);
      const data = await bidsApi.getWonBids();
      setWonBids(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load won bids');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWonBids();
  }, [fetchWonBids]);

  // Live countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setWonBids(prev =>
        prev.map(bid => {
          const now = new Date().getTime();
          const deadline = new Date(bid.confirmationDeadline).getTime();
          const timeLeftMs = Math.max(0, deadline - now);
          const totalMinutes = Math.floor(timeLeftMs / 60000);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          const seconds = Math.floor((timeLeftMs % 60000) / 1000);

          return {
            ...bid,
            timeLeftMs,
            timeLeft: timeLeftMs > 0 ? `${hours}h ${minutes}m ${seconds}s` : 'Expired',
            isExpired: timeLeftMs <= 0
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleConfirm = async (bidId: string) => {
    try {
      setConfirming(bidId);
      setError('');
      const result = await bidsApi.confirmAuctionWin(bidId);
      setSuccessMsg(result.message);
      // Remove from list
      setWonBids(prev => prev.filter(b => b.id !== bidId));
      // Redirect to payment after short delay
      setTimeout(() => {
        router.push(`/payment/gateway?orderId=${result.order.id}`);
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to confirm purchase');
    } finally {
      setConfirming(null);
    }
  };

  const getTimeBarWidth = (bid: WonBid) => {
    const totalMs = 3 * 60 * 60 * 1000; // 3 hours
    return Math.max(0, Math.min(100, (bid.timeLeftMs / totalMs) * 100));
  };

  const getTimeBarColor = (bid: WonBid) => {
    const pct = getTimeBarWidth(bid);
    if (pct > 50) return '#22c55e';
    if (pct > 25) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => router.back()} style={styles.backBtn}>
          ← Back
        </button>
        <h1 style={styles.title}>🏆 Won Auctions</h1>
        <p style={styles.subtitle}>
          Confirm your winning bids within the 3-hour window to secure your purchase.
        </p>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️</span> {error}
        </div>
      )}

      {successMsg && (
        <div style={styles.successBanner}>
          <span>✅</span> {successMsg}
        </div>
      )}

      {loading ? (
        <div style={styles.loadingContainer}>
          {[1, 2].map(i => (
            <div key={i} style={styles.skeleton}>
              <div style={{ ...styles.skeletonBar, width: '60%' }} />
              <div style={{ ...styles.skeletonBar, width: '40%' }} />
              <div style={{ ...styles.skeletonBar, width: '80%' }} />
            </div>
          ))}
        </div>
      ) : wonBids.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🎯</div>
          <h2 style={styles.emptyTitle}>No Pending Confirmations</h2>
          <p style={styles.emptyText}>
            When you win an auction, it will appear here for confirmation.
          </p>
          <button onClick={() => router.push('/browse')} style={styles.browseBtn}>
            Browse Products →
          </button>
        </div>
      ) : (
        <div style={styles.bidsList}>
          {wonBids.map(bid => (
            <div key={bid.id} style={{
              ...styles.bidCard,
              borderColor: bid.isExpired ? '#fecaca' : '#c7d2fe'
            }}>
              {/* Product image */}
              <div style={styles.cardTop}>
                {bid.product?.images?.[0] && (
                  <img
                    src={bid.product.images[0].startsWith('http')
                      ? bid.product.images[0]
                      : `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '')}/${bid.product.images[0]}`
                    }
                    alt={bid.product?.title}
                    style={styles.productImage}
                  />
                )}
                <div style={styles.cardInfo}>
                  <h3 style={styles.productTitle}>{bid.product?.title || 'Product'}</h3>
                  <span style={styles.categoryBadge}>{bid.product?.category}</span>
                  <p style={styles.basePrice}>
                    Base Price: <strong>৳{bid.product?.basePrice}</strong>
                  </p>
                </div>
              </div>

              {/* Pricing */}
              <div style={styles.priceSection}>
                <div style={styles.priceRow}>
                  <span style={styles.priceLabel}>Your Winning Bid</span>
                  <span style={styles.priceValue}>৳{bid.bidAmount}</span>
                </div>
                <div style={styles.priceRow}>
                  <span style={styles.priceLabel}>Platform Fee</span>
                  <span style={styles.priceValueSmall}>+ ৳{bid.platformFee}</span>
                </div>
                <div style={{ ...styles.priceRow, ...styles.totalRow }}>
                  <span style={styles.totalLabel}>Total Payable</span>
                  <span style={styles.totalValue}>৳{bid.totalPayable}</span>
                </div>
              </div>

              {/* Countdown timer */}
              <div style={styles.timerSection}>
                <div style={styles.timerHeader}>
                  <span style={styles.timerIcon}>⏰</span>
                  <span style={{
                    ...styles.timerText,
                    color: bid.isExpired ? '#ef4444' : getTimeBarColor(bid)
                  }}>
                    {bid.isExpired ? 'Time Expired' : `${bid.timeLeft} remaining`}
                  </span>
                </div>
                <div style={styles.timerBarBg}>
                  <div style={{
                    ...styles.timerBarFill,
                    width: `${getTimeBarWidth(bid)}%`,
                    backgroundColor: getTimeBarColor(bid)
                  }} />
                </div>
              </div>

              {/* Actions */}
              <div style={styles.actions}>
                {bid.isExpired ? (
                  <div style={styles.expiredBanner}>
                    This confirmation window has expired. Your buyer rating may be affected.
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleConfirm(bid.id)}
                      disabled={confirming === bid.id}
                      style={{
                        ...styles.confirmBtn,
                        opacity: confirming === bid.id ? 0.6 : 1
                      }}
                    >
                      {confirming === bid.id ? '⏳ Confirming...' : '✅ Confirm Purchase'}
                    </button>
                    <p style={styles.warningText}>
                      ⚠️ Not confirming will reduce your buyer rating by 0.5 stars
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontSize: 14,
    cursor: 'pointer',
    padding: '4px 0',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1e1b4b',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    margin: 0,
  },
  errorBanner: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#dc2626',
    marginBottom: 16,
    fontSize: 14,
  },
  successBanner: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#16a34a',
    marginBottom: 16,
    fontSize: 14,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  skeleton: {
    background: '#f3f4f6',
    borderRadius: 12,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  skeletonBar: {
    height: 16,
    background: '#e5e7eb',
    borderRadius: 8,
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    background: '#fafafa',
    borderRadius: 16,
    border: '2px dashed #e5e7eb',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 8px 0',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    margin: '0 0 20px 0',
  },
  browseBtn: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  bidsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  bidCard: {
    background: 'white',
    borderRadius: 16,
    border: '2px solid #c7d2fe',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)',
  },
  cardTop: {
    display: 'flex',
    gap: 16,
    padding: '20px 20px 12px',
  },
  productImage: {
    width: 100,
    height: 100,
    objectFit: 'cover' as const,
    borderRadius: 12,
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1e1b4b',
    margin: '0 0 6px 0',
  },
  categoryBadge: {
    display: 'inline-block',
    background: '#e0e7ff',
    color: '#4338ca',
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 12,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  basePrice: {
    fontSize: 13,
    color: '#6b7280',
    margin: 0,
  },
  priceSection: {
    padding: '0 20px 12px',
    borderTop: '1px solid #f3f4f6',
    marginTop: 4,
    paddingTop: 12,
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1e1b4b',
  },
  priceValueSmall: {
    fontSize: 13,
    color: '#9ca3af',
  },
  totalRow: {
    borderTop: '2px dashed #e5e7eb',
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: 700,
    color: '#1e1b4b',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 700,
    color: '#4f46e5',
  },
  timerSection: {
    padding: '0 20px 16px',
  },
  timerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  timerIcon: {
    fontSize: 14,
  },
  timerText: {
    fontSize: 13,
    fontWeight: 600,
  },
  timerBarBg: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 1s linear, background-color 0.3s ease',
  },
  actions: {
    padding: '16px 20px',
    background: '#f8fafc',
    borderTop: '1px solid #f3f4f6',
  },
  confirmBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 0.3,
  },
  warningText: {
    fontSize: 12,
    color: '#f59e0b',
    textAlign: 'center' as const,
    margin: '8px 0 0 0',
  },
  expiredBanner: {
    background: '#fef2f2',
    color: '#dc2626',
    fontSize: 13,
    padding: '10px 16px',
    borderRadius: 8,
    textAlign: 'center' as const,
  },
};
