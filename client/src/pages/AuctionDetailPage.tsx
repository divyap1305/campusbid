import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Listing, Bid, AuctionQuestion } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { CountdownTimer } from '../components/CountdownTimer.js';
import { 
  formatRupees, 
  getCategoryLabel, 
  getConditionBadge, 
  getStatusBadge 
} from '../utils/formatters.js';
import { 
  Gavel, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  MessageSquare, 
  Zap, 
  Flame, 
  User as UserIcon, 
  Share2, 
  Send,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AuctionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinAuction, leaveAuction, socket } = useSocket();
  const { showToast } = useNotification();

  const [listing, setListing] = useState<Listing | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [questions, setQuestions] = useState<AuctionQuestion[]>([]);
  const [myAutoBid, setMyAutoBid] = useState<{ maxAuthorizedPaise: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [manualBidRupees, setManualBidRupees] = useState<string>('');
  const [biddingLoading, setBiddingLoading] = useState<boolean>(false);
  const [autoBidRupees, setAutoBidRupees] = useState<string>('');
  const [autoBidLoading, setAutoBidLoading] = useState<boolean>(false);
  const [showAutoBidModal, setShowAutoBidModal] = useState<boolean>(false);

  // Q&A states
  const [newQuestionText, setNewQuestionText] = useState<string>('');
  const [questionLoading, setQuestionLoading] = useState<boolean>(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [answerSaving, setAnswerSaving] = useState<boolean>(false);

  // Selected photo
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);

  // 1. Initial Data Fetching
  const fetchListingDetails = async () => {
    if (!id) {
      setError('Invalid auction listing ID.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setListing(null);
    setBids([]);
    setQuestions([]);
    setMyAutoBid(null);

    let loadedListing: Listing;
    try {
      const res = await api.get<{
        success: boolean;
        listing: Listing;
        bids: Bid[];
      }>(`/auctions/${id}`);

      if (!res.success || !res.listing) {
        throw new Error('Listing not found.');
      }

      loadedListing = res.listing;
      setListing(loadedListing);
      setBids(res.bids);

      const minReqPaise = loadedListing.bidCount === 0
        ? loadedListing.startingPricePaise
        : loadedListing.currentPricePaise + loadedListing.minIncrementPaise;
      setManualBidRupees(Math.round(minReqPaise / 100).toString());
    } catch (err: any) {
      setError(err.message || 'Failed to load auction listing.');
      return;
    } finally {
      setLoading(false);
    }

    try {
      const qRes = await api.get<{ success: boolean; questions: AuctionQuestion[] }>(
        `/auctions/${id}/questions`
      );
      if (qRes.success) {
        setQuestions(qRes.questions);
      }
    } catch (err) {
      console.error('[Auction Detail] Failed to load auction questions:', err);
    }

    if (user) {
      try {
        const autoRes = await api.get<{ success: boolean; autoBid: any }>(
          `/auctions/${id}/auto-bid`
        );
        if (autoRes.success && autoRes.autoBid) {
          setMyAutoBid(autoRes.autoBid);
        }
      } catch (err) {
        console.error('[Auction Detail] Failed to load automatic bid settings:', err);
      }
    }
  };

  useEffect(() => {
    fetchListingDetails();
  }, [id, user]);

  // 2. Real-Time Socket Connection & Event Handling
  useEffect(() => {
    if (!id) return;

    joinAuction(id);

    if (socket) {
      // Live bid event
      const handleBidPlaced = (data: any) => {
        setListing((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            currentPricePaise: data.currentPricePaise,
            closingTime: data.closingTime,
            bidCount: data.bidCount,
            leadingBidderName: data.leadingBidder.displayName,
            extensionCount: data.wasExtended ? prev.extensionCount + 1 : prev.extensionCount,
          };
        });

        // Add new bid to history
        setBids((prev) => [
          {
            id: data.bid.id,
            amountPaise: data.bid.amountPaise,
            serverTimestamp: data.bid.serverTimestamp,
            isAutoBid: data.bid.isAutoBid,
            maxAuthorizedPaise: data.bid.maxAuthorizedPaise,
            status: 'ACCEPTED',
            bidderDisplayName: data.bid.displayName,
          },
          ...prev,
        ]);

        if (data.wasExtended) {
          showToast('Soft-Close Triggered! Auction extended by 60s.', 'warning', 'Clock Extended');
        } else {
          showToast(`New leading bid: ${formatRupees(data.currentPricePaise)}`, 'info');
        }
      };

      // Auction closed event
      const handleAuctionClosed = (data: any) => {
        setListing((prev) => (prev ? { ...prev, status: data.status } : prev));
        showToast(`Auction has ended (${data.status.replace(/_/g, ' ')})`, 'info');
      };

      // Auction status changed
      const handleStatusChanged = (data: any) => {
        setListing((prev) => (prev ? { ...prev, status: data.status } : prev));
      };

      // Question events
      const handleNewQuestion = (data: any) => {
        setQuestions((prev) => [data, ...prev]);
      };

      const handleQuestionAnswered = (data: any) => {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === data.id
            ? {
                ...q,
                answer: data.answer,
                answeredByName: data.answeredByName,
                answeredAt: data.answeredAt,
                answerEditedAt: data.answerEditedAt,
              }
            : q
          )
        );
      };

      socket.on('bid_placed', handleBidPlaced);
      socket.on('auction_closed', handleAuctionClosed);
      socket.on('auction_status_changed', handleStatusChanged);
      socket.on('new_question', handleNewQuestion);
      socket.on('question_answered', handleQuestionAnswered);

      return () => {
        socket.off('bid_placed', handleBidPlaced);
        socket.off('auction_closed', handleAuctionClosed);
        socket.off('auction_status_changed', handleStatusChanged);
        socket.off('new_question', handleNewQuestion);
        socket.off('question_answered', handleQuestionAnswered);
        leaveAuction(id);
      };
    }
  }, [id, socket]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-slate-200 rounded-2xl" />
            <div className="space-y-4">
              <div className="h-6 bg-slate-200 rounded w-1/2" />
              <div className="h-10 bg-slate-200 rounded w-3/4" />
              <div className="h-32 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    const isNotFound = /not found|invalid listing id/i.test(error || '');
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">
          {isNotFound ? 'Auction Listing Not Found' : 'Unable to Load Auction Listing'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">{error || 'This listing might have been removed.'}</p>
        <Link
          to="/auctions"
          className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Browse Other Auctions
        </Link>
      </div>
    );
  }

  const isSeller = user && listing.seller && user.id === listing.seller.id;
  const isLeading = user && listing.leadingBidderName && user.name.startsWith(listing.leadingBidderName.split(' ')[0]);
  const status = getStatusBadge(listing.status);
  const condition = getConditionBadge(listing.condition);
  const minRequiredPaise = listing.bidCount === 0
    ? listing.startingPricePaise
    : listing.currentPricePaise + listing.minIncrementPaise;
  const minRequiredRupees = Math.round(minRequiredPaise / 100);

  // Quick increment helper
  const addIncrement = (rupeesToAdd: number) => {
    const current = parseInt(manualBidRupees, 10) || minRequiredRupees;
    setManualBidRupees((current + rupeesToAdd).toString());
  };

  // Place Manual Bid
  const handleManualBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to place a bid.', 'warning');
      navigate('/login');
      return;
    }

    const bidVal = parseInt(manualBidRupees, 10);
    if (isNaN(bidVal) || bidVal < minRequiredRupees) {
      showToast(`Minimum valid bid is ₹${minRequiredRupees}`, 'error');
      return;
    }

    setBiddingLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        `/auctions/${listing.id}/bid`,
        { amountRupees: bidVal }
      );

      if (res.success) {
        showToast(res.message, 'success');
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Bid rejected.', 'error');
    } finally {
      setBiddingLoading(false);
    }
  };

  // Configure Auto-Bid
  const handleAutoBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    const ceiling = parseInt(autoBidRupees, 10);
    if (isNaN(ceiling) || ceiling < minRequiredRupees) {
      showToast(`Ceiling must be at least ₹${minRequiredRupees}`, 'error');
      return;
    }

    setAutoBidLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string; autoBid: any }>(
        `/auctions/${listing.id}/auto-bid`,
        { maxRupees: ceiling }
      );

      if (res.success) {
        setMyAutoBid(res.autoBid);
        setShowAutoBidModal(false);
        showToast(res.message, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to configure auto-bid.', 'error');
    } finally {
      setAutoBidLoading(false);
    }
  };

  // Revoke Auto-Bid
  const handleRevokeAutoBid = async () => {
    try {
      await api.del(`/auctions/${listing.id}/auto-bid`);
      setMyAutoBid(null);
      showToast('Automatic bidding authorization revoked.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke auto-bid.', 'error');
    }
  };

  // Ask Question
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!newQuestionText.trim() || newQuestionText.trim().length > 500) return;

    setQuestionLoading(true);
    try {
      const res = await api.post<{ success: boolean; question: AuctionQuestion }>(
        `/auctions/${listing.id}/questions`,
        { question: newQuestionText }
      );
      if (res.success) {
        setNewQuestionText('');
        showToast('Question posted publicly!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to post question.', 'error');
    } finally {
      setQuestionLoading(false);
    }
  };

  // Answer Question (Seller only)
  const handleAnswerSubmit = async (questionId: string) => {
    if (!replyText.trim() || replyText.trim().length > 500) return;
    setAnswerSaving(true);
    try {
      const res = await api.put<{ success: boolean; message: string }>(`/questions/${questionId}/answer`, {
        answer: replyText,
      });
      if (res.success) {
        setReplyingToId(null);
        setReplyText('');
        showToast(res.message, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit answer.', 'error');
    } finally {
      setAnswerSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <Link to="/auctions" className="hover:text-indigo-600">Auctions</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{getCategoryLabel(listing.category)}</span>
        <span>/</span>
        <span className="text-slate-900 font-bold truncate max-w-[200px]">{listing.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Photos Gallery & Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Photo Gallery */}
          <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm">
            <div className="relative h-80 sm:h-96 w-full bg-slate-100 flex items-center justify-center overflow-hidden">
              {listing.photos && listing.photos.length > 0 ? (
                <img
                  src={listing.photos[selectedPhotoIndex] || listing.photos[0]}
                  alt={listing.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center text-slate-300">
                  <Gavel className="w-16 h-16 stroke-[1.5]" />
                  <span className="text-xs font-semibold mt-2">No Photo Provided</span>
                </div>
              )}

              {/* Status and Extension Badges */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-xs backdrop-blur-md ${status.color}`}>
                  {status.label}
                </span>
                {listing.extensionCount > 0 && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-600 text-white flex items-center gap-1 shadow-xs">
                    <Flame className="w-3.5 h-3.5" />
                    Soft Close Extended +{listing.extensionCount}m
                  </span>
                )}
              </div>

              {/* Condition Tag */}
              <div className="absolute top-4 right-4">
                <span className={`text-xs font-bold px-3 py-1 rounded-lg border shadow-xs ${condition.color}`}>
                  {condition.label}
                </span>
              </div>
            </div>

            {/* Thumbnails row if multiple photos */}
            {listing.photos && listing.photos.length > 1 && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto">
                {listing.photos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden shrink-0 ${
                      selectedPhotoIndex === idx ? 'border-indigo-600' : 'border-slate-200'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description & Item Specs */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                {getCategoryLabel(listing.category)}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                {listing.title}
              </h1>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">Item Description</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Condition</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5">{condition.label}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Starting Price</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5">{formatRupees(listing.startingPricePaise)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Min Increment</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5">+{formatRupees(listing.minIncrementPaise)}</span>
              </div>
            </div>

            {/* Seller Card */}
            {listing.seller && (
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
                    {listing.seller.name ? listing.seller.name[0] : 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                      <span>{listing.seller.name}</span>
                      {listing.seller.isCampusVerified && (
                        <span className="inline-flex" title="Verified Campus Student" role="img" aria-label="Verified Campus Student">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{listing.seller.department || 'Enrolled Student'}</span>
                  </div>
                </div>

                {isSeller && (
                  <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold">
                    You are the Seller
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Public Questions & Answers Thread */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Public Questions & Answers</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {questions.length} discussion{questions.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Ask Question Box */}
            {!isSeller && (
              <form onSubmit={handleAskQuestion} className="space-y-2">
                <div className="relative">
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="Ask the seller about wear, accessories, campus meetup..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-indigo-600 transition resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <span className="mr-auto self-center text-[10px] text-slate-400">
                    {newQuestionText.length}/500
                  </span>
                  <button
                    type="submit"
                    disabled={questionLoading || !newQuestionText.trim() || newQuestionText.trim().length > 500}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post Public Question</span>
                  </button>
                </div>
              </form>
            )}

            {/* Questions Thread */}
            <div className="space-y-4 pt-2">
              {questions.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No questions yet. Ask about pickup spots or item condition!
                </div>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{q.askerName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium">{q.question}</p>

                    {/* Seller Answer */}
                    {q.answer ? (
                      <div className="mt-3 pl-3.5 py-1 border-l-2 border-indigo-500 bg-indigo-50/50 rounded-r-xl p-2.5 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-[11px]">
                          <span>Seller Answer ({q.answeredByName})</span>
                          {q.answerEditedAt && (
                            <span className="font-normal text-indigo-500">(edited)</span>
                          )}
                        </div>
                        <p className="text-slate-700 leading-relaxed">{q.answer}</p>
                        {isSeller && replyingToId !== q.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToId(q.id);
                              setReplyText(q.answer || '');
                            }}
                            className="pt-1 text-indigo-600 font-bold hover:underline"
                          >
                            Edit answer
                          </button>
                        )}
                        {isSeller && replyingToId === q.id && (
                          <div className="space-y-2 pt-2">
                            <textarea
                              rows={3}
                              maxLength={500}
                              value={replyText}
                              onChange={(event) => setReplyText(event.target.value)}
                              aria-label="Edit seller answer"
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs resize-y"
                            />
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400">{replyText.length}/500</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingToId(null);
                                    setReplyText('');
                                  }}
                                  className="px-2.5 py-1 text-slate-500 text-xs"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={answerSaving || !replyText.trim()}
                                  onClick={() => handleAnswerSubmit(q.id)}
                                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold disabled:opacity-40"
                                >
                                  {answerSaving ? 'Saving...' : 'Save answer'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : isSeller ? (
                      <div className="mt-2 pt-2 border-t border-slate-200/60">
                        {replyingToId === q.id ? (
                          <div className="space-y-2">
                            <textarea
                              rows={3}
                              maxLength={500}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type your public answer..."
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs resize-y"
                            />
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400">{replyText.length}/500</span>
                              <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setReplyingToId(null)}
                                className="px-2.5 py-1 text-slate-500 text-xs"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={answerSaving || !replyText.trim()}
                                onClick={() => handleAnswerSubmit(q.id)}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold disabled:opacity-40"
                              >
                                {answerSaving ? 'Saving...' : 'Reply'}
                              </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setReplyingToId(q.id);
                              setReplyText('');
                            }}
                            className="text-indigo-600 font-bold hover:underline"
                          >
                            Answer this question →
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Bidding Engine & Live History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Bidding Terminal Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-lg shadow-indigo-50/50 space-y-6 sticky top-24">
            {/* Live Countdown Banner */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Auction Closing Time
                </span>
                <div className="mt-0.5">
                  <CountdownTimer closingTime={listing.closingTime} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Bids
                </span>
                <span className="font-extrabold text-base text-white">{listing.bidCount}</span>
              </div>
            </div>

            {/* Current Leading Price Display */}
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                {listing.bidCount === 0 ? 'Starting Minimum' : 'Current Leading Bid'}
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 flex items-baseline gap-2">
                <span>{formatRupees(listing.currentPricePaise)}</span>
                {listing.leadingBidderName && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Leader: {listing.leadingBidderName}
                  </span>
                )}
              </div>
            </div>

            {/* Soft-Close Anti-Sniping Alert Box */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
              <Flame className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Anti-Sniping Rule:</strong> Bids placed with &le;30s left automatically extend the auction clock by 60s for fair student discovery.
              </p>
            </div>

            {/* Active User Proxy Bid Status (If configured) */}
            {myAutoBid && (
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-indigo-900 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Auto-Bid Active</span>
                  </div>
                  <span className="text-[11px] text-indigo-700">
                    Ceiling: {formatRupees(myAutoBid.maxAuthorizedPaise)}
                  </span>
                </div>
                <button
                  onClick={handleRevokeAutoBid}
                  className="px-2.5 py-1 bg-white border border-indigo-300 text-indigo-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 rounded-lg text-xs font-semibold transition"
                >
                  Revoke
                </button>
              </div>
            )}

            {/* Live Bid Form */}
            {listing.status === 'ACTIVE' ? (
              isSeller ? (
                <div className="p-4 rounded-xl bg-slate-100 text-slate-600 text-xs text-center font-medium">
                  You are the seller of this auction. Seller self-bidding is strictly disallowed by university policy.
                </div>
              ) : (
                <form onSubmit={handleManualBidSubmit} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <label className="font-bold text-slate-700 uppercase tracking-wider">
                        Place Bid Amount (₹)
                      </label>
                      <span className="text-slate-500">
                        Min next bid: <strong className="text-indigo-600">₹{minRequiredRupees}</strong>
                      </span>
                    </div>

                    <div className="relative">
                      <span className="text-lg font-bold text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                        ₹
                      </span>
                      <input
                        type="number"
                        min={minRequiredRupees}
                        value={manualBidRupees}
                        onChange={(e) => setManualBidRupees(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-lg font-extrabold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                      />
                    </div>
                  </div>

                  {/* Quick Increment Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => addIncrement(50)}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition"
                    >
                      +₹50
                    </button>
                    <button
                      type="button"
                      onClick={() => addIncrement(100)}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition"
                    >
                      +₹100
                    </button>
                    <button
                      type="button"
                      onClick={() => addIncrement(200)}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition"
                    >
                      +₹200
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={biddingLoading}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Gavel className="w-4 h-4" />
                    <span>{biddingLoading ? 'Submitting Bid...' : `Submit Bid of ₹${manualBidRupees || minRequiredRupees}`}</span>
                  </button>

                  {/* Proxy Auto-Bid Trigger Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAutoBidModal(true)}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Configure Automatic Proxy Bidding</span>
                    </button>
                  </div>
                </form>
              )
            ) : (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <span className="font-bold text-slate-800 text-sm block">
                  Bidding is Closed for this Item
                </span>
                <p className="text-xs text-slate-500">
                  Status: <strong>{status.label}</strong>
                </p>
                {listing.status === 'RESERVED_PENDING_HANDOVER' && (
                  <Link
                    to={`/handover/${listing.id}`}
                    className="inline-block mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                  >
                    Go to Handover Room →
                  </Link>
                )}
              </div>
            )}

            {/* Public Bid History Table */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Public Bid History ({bids.length})
                </h4>
                <span className="text-[11px] text-slate-400">Masked for privacy</span>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {bids.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No bids yet. First bid starts at {formatRupees(listing.startingPricePaise)}.
                  </div>
                ) : (
                  bids.map((b, idx) => (
                    <div
                      key={b.id || idx}
                      className={`p-3 flex items-center justify-between text-xs ${
                        idx === 0 ? 'bg-emerald-50/50 font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono w-4">#{bids.length - idx}</span>
                        <div>
                          <div className="text-slate-800 flex items-center gap-1.5">
                            <span>{b.bidderDisplayName}</span>
                            {b.isAutoBid && (
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-indigo-100 text-indigo-700">
                                AUTO
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            {new Date(b.serverTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-slate-900">{formatRupees(b.amountPaise)}</div>
                        {b.maxAuthorizedPaise && (
                          <span className="text-[10px] text-slate-400 block">
                            Ceiling: {formatRupees(b.maxAuthorizedPaise)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Bid Setup Modal */}
      {showAutoBidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Automated Proxy Bidding</h3>
                  <span className="text-xs text-slate-500">Campus Fair Auction Protocol</span>
                </div>
              </div>
              <button
                onClick={() => setShowAutoBidModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Set your absolute maximum student ceiling. Our backend submits only the minimum increment necessary (+{formatRupees(listing.minIncrementPaise)}) to maintain the lead, without exceeding your ceiling.
            </p>

            <form onSubmit={handleAutoBidSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Your Maximum Ceiling (₹)
                </label>
                <div className="relative">
                  <span className="text-lg font-bold text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={minRequiredRupees}
                    required
                    value={autoBidRupees}
                    onChange={(e) => setAutoBidRupees(e.target.value)}
                    placeholder={`e.g. ${minRequiredRupees + 200}`}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Must be at least the next required bid (₹{minRequiredRupees})
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 space-y-1">
                <div>• Maximum bids are publicly visible for transparency</div>
                <div>• Ties broken deterministically by earliest registration</div>
                <div>• You can revoke authorization at any time</div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAutoBidModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={autoBidLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 disabled:opacity-50"
                >
                  {autoBidLoading ? 'Authorizing...' : 'Authorize Ceiling'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
