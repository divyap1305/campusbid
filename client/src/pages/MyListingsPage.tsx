import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Listing } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { formatRupees, getStatusBadge } from '../utils/formatters.js';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Gavel, 
  AlertCircle, 
  ArrowRight,
  Handshake,
  Trash2,
  Pencil
} from 'lucide-react';

export const MyListingsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'DECISIONS' | 'RESERVED' | 'COMPLETED'>('DECISIONS');

  // Decision Modal
  const [decisionModal, setDecisionModal] = useState<{
    listing: Listing;
    type: 'APPROVE' | 'REJECT';
  } | null>(null);
  const [decisionNote, setDecisionNote] = useState<string>('');
  const [decisionLoading, setDecisionLoading] = useState<boolean>(false);

  const fetchMyListings = async () => {
    try {
      const res = await api.get<{ success: boolean; listings: Listing[] }>('/auctions/my/listings');
      if (res.success) {
        setListings(res.listings);
        // Default to active tab if no pending decisions
        const hasPending = res.listings.some((l) => l.status === 'PENDING_SELLER_DECISION');
        if (!hasPending) setActiveTab('ACTIVE');
      }
    } catch (err) {
      // Error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyListings();
  }, [user]);

  const handleDecisionSubmit = async () => {
    if (!decisionModal) return;
    setDecisionLoading(true);

    try {
      if (decisionModal.type === 'APPROVE') {
        const res = await api.post<{ success: boolean; message: string }>(
          `/auctions/${decisionModal.listing.id}/seller/approve`,
          { decisionNote }
        );
        if (res.success) {
          showToast(res.message, 'success');
          setDecisionModal(null);
          setDecisionNote('');
          fetchMyListings();
        }
      } else {
        const res = await api.post<{ success: boolean; message: string }>(
          `/auctions/${decisionModal.listing.id}/seller/reject`,
          { reason: decisionNote || 'Seller rejected price' }
        );
        if (res.success) {
          showToast(res.message, 'info');
          setDecisionModal(null);
          setDecisionNote('');
          fetchMyListings();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Action failed.', 'error');
    } finally {
      setDecisionLoading(false);
    }
  };

  // Filter listings by active tab
  const filteredListings = listings.filter((l) => {
    if (activeTab === 'DECISIONS') return l.status === 'PENDING_SELLER_DECISION';
    if (activeTab === 'ACTIVE') return l.status === 'ACTIVE';
    if (activeTab === 'RESERVED') return l.status === 'RESERVED_PENDING_HANDOVER';
    return ['COMPLETED', 'CANCELLED', 'UNSOLD', 'FAILED_PICKUP'].includes(l.status);
  });

  const pendingDecisionsCount = listings.filter((l) => l.status === 'PENDING_SELLER_DECISION').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Seller Dashboard</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            My Published Listings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your campus auctions, approve winning bids, and track physical item handovers.
          </p>
        </div>

        <Link
          to="/sell"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition"
        >
          + Post New Item
        </Link>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('DECISIONS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'DECISIONS'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Pending My Decision</span>
          {pendingDecisionsCount > 0 && (
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${activeTab === 'DECISIONS' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800 animate-pulse'}`}>
              {pendingDecisionsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'ACTIVE'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Active Auctions ({listings.filter((l) => l.status === 'ACTIVE').length})
        </button>

        <button
          onClick={() => setActiveTab('RESERVED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'RESERVED'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Reserved for Handover ({listings.filter((l) => l.status === 'RESERVED_PENDING_HANDOVER').length})
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'COMPLETED'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Past / Completed
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading your listings...</div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center space-y-2">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No listings in this view</h3>
          <p className="text-xs text-slate-400">
            {activeTab === 'DECISIONS'
              ? 'You have no auctions awaiting your approval right now.'
              : 'Check other tabs or post a new auction.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredListings.map((listing) => {
            const status = getStatusBadge(listing.status);
            const isAuctionOpen = listing.status === 'ACTIVE' && new Date(listing.closingTime).getTime() > Date.now();
            const editUnavailableReason = listing.status !== 'ACTIVE'
              ? 'Only active auctions can be edited.'
              : 'This auction has expired and can no longer be edited.';
            return (
              <div
                key={listing.id}
                className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
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
                      <span className="text-xs text-slate-400 font-medium">
                        {listing.bidCount} bid{listing.bidCount === 1 ? '' : 's'} placed
                      </span>
                    </div>

                    <Link
                      to={`/auctions/${listing.id}`}
                      className="font-bold text-slate-900 text-base hover:text-indigo-600 transition block"
                    >
                      {listing.title}
                    </Link>

                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>Starting: {formatRupees(listing.startingPricePaise)}</span>
                      <span>•</span>
                      <span>
                        Current/Final: <strong className="text-slate-900 font-extrabold">{formatRupees(listing.currentPricePaise)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions depending on status */}
                <div className="flex flex-col items-end gap-2 self-end md:self-center">
                  {isAuctionOpen ? (
                    <Link
                      to={`/sell/edit/${listing.id}`}
                      className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Listing
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={editUnavailableReason}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed"
                    >
                      Edit Listing
                    </button>
                  )}
                  {listing.status === 'PENDING_SELLER_DECISION' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setDecisionModal({ listing, type: 'APPROVE' });
                          setDecisionNote('Meet at Student Center');
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve Sale ({formatRupees(listing.currentPricePaise)})</span>
                      </button>

                      <button
                        onClick={() => {
                          setDecisionModal({ listing, type: 'REJECT' });
                          setDecisionNote('');
                        }}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-xl text-xs font-bold transition"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {listing.status === 'RESERVED_PENDING_HANDOVER' && (
                    <Link
                      to={`/handover/${listing.id}`}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Handshake className="w-4 h-4" />
                      <span>Open Handover Room →</span>
                    </Link>
                  )}

                  <Link
                    to={`/auctions/${listing.id}`}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                  >
                    View Listing
                  </Link>
                  {isAuctionOpen && listing.bidCount > 0 && (
                    <p className="text-[11px] text-amber-700 text-right max-w-64">
                    Bids are active; only title and description can be corrected.
                    </p>
                  )}
                  {!isAuctionOpen && (
                    <p className="text-[11px] text-slate-500 text-right max-w-64">
                      {editUnavailableReason}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decision Confirmation Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">
              {decisionModal.type === 'APPROVE' ? 'Approve Winning Price' : 'Reject Winning Price'}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              {decisionModal.type === 'APPROVE'
                ? `You are accepting the winning bid of ${formatRupees(decisionModal.listing.currentPricePaise)} on "${decisionModal.listing.title}". This will reserve the item and generate a secure 6-digit handover OTP.`
                : `Are you sure you want to reject the winning price of ${formatRupees(decisionModal.listing.currentPricePaise)}? This will mark the auction as cancelled.`}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {decisionModal.type === 'APPROVE' ? 'Handover Note / Location' : 'Rejection Reason'}
              </label>
              <input
                type="text"
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder={decisionModal.type === 'APPROVE' ? 'e.g. Meet outside Hostel 4 at 5 PM' : 'e.g. Price too low'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={decisionLoading}
                onClick={handleDecisionSubmit}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 ${
                  decisionModal.type === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {decisionLoading ? 'Processing...' : decisionModal.type === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
