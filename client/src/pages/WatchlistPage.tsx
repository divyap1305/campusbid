import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Clock3, Heart, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useNotification } from '../context/NotificationContext.js';
import { WatchlistItem } from '../types/index.js';
import { formatRupees, getCategoryLabel } from '../utils/formatters.js';
import { CountdownTimer } from '../components/CountdownTimer.js';

export const WatchlistPage: React.FC = () => {
  const { showToast } = useNotification();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchWatchlist = useCallback(async () => {
    setError(null);
    try {
      const response = await api.get<{ success: boolean; watchlist: WatchlistItem[] }>('/watchlist');
      setWatchlist(response.watchlist);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load your watchlist.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWatchlist();
  }, [fetchWatchlist]);

  const handleRemove = async (listingId: string) => {
    setRemovingId(listingId);
    try {
      await api.del(`/watchlist/${listingId}`);
      setWatchlist((current) => current.filter((entry) => entry.listing?.id !== listingId));
      showToast('Auction removed from your watchlist.', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove auction.', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Your Auctions</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          Auction Watchlist
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Follow auctions for bid-price updates and a reminder 30 minutes before they close.
        </p>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading your watchlist...</div>
      ) : error ? (
        <div className="bg-white p-8 rounded-3xl border border-rose-200 text-center space-y-3">
          <p className="text-sm text-rose-700">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              void fetchWatchlist();
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
          >
            Try again
          </button>
        </div>
      ) : watchlist.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center space-y-3">
          <Heart className="w-10 h-10 text-slate-300 mx-auto" />
          <h2 className="font-bold text-slate-800">Your watchlist is empty</h2>
          <p className="text-xs text-slate-500">Open an active auction and select “Watch auction” to follow it.</p>
          <Link to="/auctions" className="inline-flex px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
            Browse Auctions
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {watchlist.map((entry) => {
            const listing = entry.listing;
            if (!listing) {
              return (
                <div key={entry.id} className="bg-white p-4 rounded-2xl border border-slate-200 text-sm text-slate-500">
                  This auction is no longer available.
                </div>
              );
            }

            const isActive = listing.status === 'ACTIVE' && new Date(listing.closingTime).getTime() > Date.now();
            return (
              <div key={entry.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <Link to={`/auctions/${listing.id}`} className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                  {listing.photos[0] ? (
                    <img src={listing.photos[0]} alt={listing.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Heart className="w-6 h-6" />
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                    {getCategoryLabel(listing.category)}
                  </span>
                  <Link to={`/auctions/${listing.id}`} className="block font-bold text-slate-900 hover:text-indigo-600 truncate">
                    {listing.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{listing.bidCount > 0 ? 'Current bid' : 'Starting price'}: <strong className="text-slate-800">{formatRupees(listing.currentPricePaise)}</strong></span>
                    <span>{listing.bidCount} bid{listing.bidCount === 1 ? '' : 's'}</span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="w-3 h-3" />
                        <CountdownTimer closingTime={listing.closingTime} compact />
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                      <Bell className="w-3 h-3" /> Price and closing alerts enabled
                    </div>
                  )}
                  {!isActive && (
                    <span className="mt-2 inline-block text-[10px] font-semibold text-slate-400">Auction ended</span>
                  )}
                </div>
                <button
                  onClick={() => void handleRemove(listing.id)}
                  disabled={removingId === listing.id}
                  title="Remove from watchlist"
                  aria-label={`Remove ${listing.title} from watchlist`}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
