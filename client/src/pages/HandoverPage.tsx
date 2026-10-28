import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { formatRupees, getStatusBadge } from '../utils/formatters.js';
import { 
  Handshake, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Phone, 
  Mail, 
  Key, 
  ArrowLeft,
  XCircle,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const HandoverPage: React.FC = () => {
  const { id: listingId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [handoverData, setHandoverData] = useState<any | null>(null);
  const [role, setRole] = useState<'SELLER' | 'BUYER'>('BUYER');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Seller verification code input
  const [otpInput, setOtpInput] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);

  // Failed pickup modal
  const [showFailModal, setShowFailModal] = useState<boolean>(false);
  const [failReason, setFailReason] = useState<'BUYER_NO_SHOW' | 'SELLER_NO_SHOW' | 'ITEM_MISMATCH'>('BUYER_NO_SHOW');
  const [failNotes, setFailNotes] = useState<string>('');
  const [failLoading, setFailLoading] = useState<boolean>(false);

  const fetchHandover = async () => {
    if (!listingId) return;
    try {
      const res = await api.get<{ success: boolean; handover: any; role: 'SELLER' | 'BUYER' }>(
        `/auctions/${listingId}/handover`
      );
      if (res.success && res.handover) {
        setHandoverData(res.handover);
        setRole(res.role);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve handover details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandover();
  }, [listingId, user]);

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) return;

    setVerifying(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        `/auctions/${listingId}/handover/confirm`,
        { verificationCode: otpInput.trim() }
      );

      if (res.success) {
        showToast(res.message, 'success');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        fetchHandover();
      }
    } catch (err: any) {
      showToast(err.message || 'Code verification failed.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleReportFailed = async (e: React.FormEvent) => {
    e.preventDefault();
    setFailLoading(true);

    try {
      const res = await api.post<{ success: boolean; message: string }>(
        `/auctions/${listingId}/handover/failed`,
        { reason: failReason, notes: failNotes }
      );

      if (res.success) {
        showToast(res.message, 'info');
        setShowFailModal(false);
        fetchHandover();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to record outcome.', 'error');
    } finally {
      setFailLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-sm text-slate-400">Loading campus handover room...</div>;
  }

  if (error || !handoverData) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">No Handover Record Available</h2>
        <p className="text-xs text-slate-500 mt-1">{error || 'This item may not be reserved yet.'}</p>
        <Link to="/auctions" className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
          Return to Auctions
        </Link>
      </div>
    );
  }

  const { listing, seller, buyer, agreedPricePaise, verificationCode, status } = handoverData;
  const isCompleted = status === 'CONFIRMED';
  const isFailed = status.startsWith('FAILED');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <Link to="/auctions" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Marketplace</span>
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className={`p-6 sm:p-8 text-white ${
          isCompleted
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
            : isFailed
            ? 'bg-gradient-to-r from-rose-600 to-red-700'
            : 'bg-gradient-to-r from-indigo-600 to-blue-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md">
              <Handshake className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                Verified Campus Handover Room
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold mt-0.5">
                {isCompleted ? 'Handover Completed Successfully 🎉' : isFailed ? 'Handover Failed / Disputed' : 'Item Reserved — Pending Campus Handover'}
              </h1>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Item & Price Overview */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Reserved Item
              </span>
              <h2 className="text-lg font-bold text-slate-900">{listing?.title}</h2>
              <span className="text-xs text-slate-500">
                Agreed Closing Price: <strong className="text-slate-900 text-sm">{formatRupees(agreedPricePaise)}</strong>
              </span>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Preferred Handover Location
              </span>
              <div className="text-xs font-bold text-slate-800 flex items-center sm:justify-end gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>{handoverData.handoverLocation || 'Campus Student Center'}</span>
              </div>
            </div>
          </div>

          {/* Secure 6-Digit OTP Verification Section */}
          {!isCompleted && !isFailed && (
            <div className="p-6 rounded-3xl bg-indigo-50/60 border border-indigo-200 space-y-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-indigo-950 text-base">
                  Physical Handover Verification Protocol
                </h3>
              </div>

              {role === 'BUYER' ? (
                /* BUYER VIEW: Displays the OTP to show to the seller */
                <div className="bg-white p-6 rounded-2xl border border-indigo-100 text-center space-y-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Your 6-Digit Verification Code (Show to Seller at Pickup)
                  </span>
                  <div className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-indigo-600 select-all">
                    {verificationCode}
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Inspect the item physically. When you are satisfied, show this 6-digit code to the seller to confirm and finalize the transaction.
                  </p>
                </div>
              ) : (
                /* SELLER VIEW: Input the OTP provided by the buyer */
                <div className="bg-white p-6 rounded-2xl border border-indigo-100 space-y-4">
                  <div className="text-xs text-slate-600">
                    Meet the buyer on campus. Once they inspect the item and provide you with their <strong>6-digit verification code</strong>, enter it below to complete the sale:
                  </div>

                  <form onSubmit={handleConfirmCode} className="flex gap-3 max-w-sm">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit code"
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-mono text-xl font-bold tracking-widest focus:bg-white focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      disabled={verifying || otpInput.length < 6}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {verifying ? 'Verifying...' : 'Verify & Complete'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Party Details (Buyer & Seller) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            {/* Seller Info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                Seller Information
              </span>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>{seller?.name}</span>
                {seller?.isCampusVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
              </div>
              <div className="text-slate-500 space-y-1">
                <div>Dept: {seller?.department}</div>
                {seller?.phoneNumber && <div>Phone: {seller.phoneNumber}</div>}
              </div>
            </div>

            {/* Buyer Info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                Winning Buyer Information
              </span>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>{buyer?.name}</span>
                {buyer?.isCampusVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
              </div>
              <div className="text-slate-500 space-y-1">
                <div>Dept: {buyer?.department}</div>
                {buyer?.phoneNumber && <div>Phone: {buyer.phoneNumber}</div>}
              </div>
            </div>
          </div>

          {/* Report Issue / Failed Pickup Link */}
          {!isCompleted && !isFailed && (
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFailModal(true)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" />
                <span>Report Failed Pickup / No-Show</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Failed Pickup Modal */}
      {showFailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base text-rose-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              <span>Record Failed Campus Pickup</span>
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              If the other party did not show up or the item condition failed inspection, record the exact outcome below:
            </p>

            <form onSubmit={handleReportFailed} className="space-y-4 pt-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Failure
                </label>
                <select
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="BUYER_NO_SHOW">Buyer Did Not Show Up</option>
                  <option value="SELLER_NO_SHOW">Seller Did Not Show Up</option>
                  <option value="ITEM_MISMATCH">Item Condition Did Not Match Description</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={failNotes}
                  onChange={(e) => setFailNotes(e.target.value)}
                  placeholder="Additional context on the pickup attempt..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFailModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={failLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md disabled:opacity-50"
                >
                  {failLoading ? 'Recording...' : 'Record Outcome'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
