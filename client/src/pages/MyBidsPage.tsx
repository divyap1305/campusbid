import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { formatRupees, getStatusBadge } from '../utils/formatters.js';
import { 
  TrendingUp, 
  Gavel, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  Handshake,
  Clock
} from 'lucide-react';

interface MyBidItem {
  listing: any;
  myHighestBidPaise: number;
  isWinning: boolean;
  myLatestBidStatus: string;
  bidsCount: number;
}

export const MyBidsPage: React.FC = () => {
  const { user } = useAuth();
  const [bids, setBids] = useState<MyBidItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'ALL' | 'WINNING' | 'OUTBID' | 'WON'>('ALL');

  useEffect(() => {
    const fetchBids = async () => {
      try {
        const res = await api.get<{ success: boolean; myBids: MyBidItem[] }>('/auctions/my/bids');
        if (res.success) {
          setBids(res.myBids);
        }
      } catch (err) {
        // error
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
  }, [user]);

  const filteredBids = bids.filter((item) => {
    if (filter === 'WINNING') return item.isWinning && item.listing.status === 'ACTIVE';
    if (filter === 'OUTBID') return !item.isWinning && item.listing.status === 'ACTIVE';
    if (filter === 'WON') return ['PENDING_SELLER_DECISION', 'RESERVED_PENDING_HANDOVER', 'COMPLETED'].includes(item.listing.status) && item.isWinning;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Buyer Dashboard</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          My Active Bids & Outcomes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Track all campus items you are currently bidding on or have won.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-8 overflow-x-auto">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Bids ({bids.length})
        </button>

        <button
          onClick={() => setFilter('WINNING')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
            filter === 'WINNING'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Currently Winning</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
            {bids.filter((b) => b.isWinning && b.listing.status === 'ACTIVE').length}
          </span>
        </button>

        <button
          onClick={() => setFilter('OUTBID')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
            filter === 'OUTBID'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Outbid (Action Needed)</span>
          <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full">
            {bids.filter((b) => !b.isWinning && b.listing.status === 'ACTIVE').length}
          </span>
        </button>

        <button
          onClick={() => setFilter('WON')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filter === 'WON'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Won Auctions ({bids.filter((b) => ['PENDING_SELLER_DECISION', 'RESERVED_PENDING_HANDOVER', 'COMPLETED'].includes(b.listing.status) && b.isWinning).length})
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading your bids...</div>
      ) : filteredBids.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center space-y-2">
          <TrendingUp className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No bids found</h3>
          <p className="text-xs text-slate-400">
            Browse campus auctions to find bikes, calculators, or textbooks.
          </p>
          <Link
            to="/auctions"
            className="inline-block mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
          >
            Browse Marketplace →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBids.map((item, idx) => {
            const listing = item.listing;
            const status = getStatusBadge(listing.status);
            return (
              <div
                key={listing._id || idx}
                className={`bg-white p-5 sm:p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition ${
                  item.isWinning && listing.status === 'ACTIVE'
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : !item.isWinning && listing.status === 'ACTIVE'
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    {listing.photos && listing.photos[0] ? (
                      <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Gavel className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${status.color}`}>
                        {status.label}
                      </span>
                      {listing.status === 'ACTIVE' && (
                        item.isWinning ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Leading Bidder
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> You are Outbid
                          </span>
                        )
                      )}
                    </div>

                    <Link
                      to={`/auctions/${listing._id}`}
                      className="font-bold text-slate-900 text-base hover:text-indigo-600 transition block"
                    >
                      {listing.title}
                    </Link>

                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>Your Highest Bid: <strong className="text-slate-900">{formatRupees(item.myHighestBidPaise)}</strong></span>
                      <span>•</span>
                      <span>Current Leading: <strong className="text-indigo-600 font-extrabold">{formatRupees(listing.currentPricePaise)}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {listing.status === 'RESERVED_PENDING_HANDOVER' && item.isWinning && (
                    <Link
                      to={`/handover/${listing._id}`}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Handshake className="w-4 h-4" />
                      <span>View Handover OTP →</span>
                    </Link>
                  )}

                  {!item.isWinning && listing.status === 'ACTIVE' && (
                    <Link
                      to={`/auctions/${listing._id}`}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      Re-bid to Lead
                    </Link>
                  )}

                  <Link
                    to={`/auctions/${listing._id}`}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                  >
                    View Auction
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
