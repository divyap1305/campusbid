import crypto from 'crypto';
import { Listing, IListing } from '../models/Listing.js';
import { Bid } from '../models/Bid.js';
import { HandoverRecord } from '../models/HandoverRecord.js';
import { sendNotification } from './notificationService.js';
import { io } from '../index.js';
import { paiseToRupees } from '../utils/currency.js';

/**
 * Closes an active auction safely:
 * - If 0 bids -> UNSOLD
 * - If bids exist -> PENDING_SELLER_DECISION
 */
export const closeAuction = async (listingId: string): Promise<IListing | null> => {
  const listing = await Listing.findById(listingId).populate('seller leadingBidder');
  if (!listing || listing.status !== 'ACTIVE') return null;

  if (listing.bidCount === 0 || !listing.leadingBidder) {
    listing.status = 'UNSOLD';
    await listing.save();

    // Notify seller
    const sellerId = (listing.seller as any)._id || listing.seller;
    sendNotification({
      recipientId: sellerId.toString(),
      type: 'SELLER_DECISION_NEEDED',
      title: 'Auction Ended with No Bids',
      message: `Your listing "${listing.title}" ended without bids. You may re-list it anytime.`,
      link: `/my-listings`,
      metadata: { listingId: listing._id, status: 'UNSOLD' },
    });

    if (io) {
      io.to(`auction:${listingId}`).emit('auction_closed', {
        listingId,
        status: 'UNSOLD',
      });
    }

    return listing;
  }

  // Winning bid exists
  listing.status = 'PENDING_SELLER_DECISION';
  listing.winner = listing.leadingBidder;
  listing.winningPricePaise = listing.currentPricePaise;
  await listing.save();

  const sellerId = (listing.seller as any)._id || listing.seller;
  const winnerId = (listing.leadingBidder as any)._id || listing.leadingBidder;

  // Notify Seller
  sendNotification({
    recipientId: sellerId.toString(),
    type: 'SELLER_DECISION_NEEDED',
    title: 'Auction Ended — Action Required',
    message: `Winning bid of ₹${paiseToRupees(listing.currentPricePaise)} placed on "${listing.title}". Please approve or reject.`,
    link: `/my-listings`,
    metadata: { listingId: listing._id, winningPricePaise: listing.currentPricePaise },
  });

  // Notify Winner
  sendNotification({
    recipientId: winnerId.toString(),
    type: 'AUCTION_WON',
    title: 'You Won the Auction!',
    message: `You placed the leading bid of ₹${paiseToRupees(listing.currentPricePaise)} for "${listing.title}". Awaiting seller approval.`,
    link: `/auctions/${listing._id}`,
    metadata: { listingId: listing._id, winningPricePaise: listing.currentPricePaise },
  });

  if (io) {
    io.to(`auction:${listingId}`).emit('auction_closed', {
      listingId,
      status: 'PENDING_SELLER_DECISION',
      winningPricePaise: listing.currentPricePaise,
      winner: winnerId,
    });
  }

  return listing;
};

/**
 * Seller approves the winning bid -> item reserved for physical campus pickup
 */
export const approveWinningBid = async (
  listingId: string,
  sellerId: string,
  decisionNote?: string
): Promise<{ success: boolean; message: string; handover?: any }> => {
  const listing = await Listing.findById(listingId);
  if (!listing) return { success: false, message: 'Listing not found.' };

  if (listing.seller.toString() !== sellerId.toString()) {
    return { success: false, message: 'Only the seller can approve this sale.' };
  }

  if (listing.status !== 'PENDING_SELLER_DECISION') {
    return { success: false, message: `Cannot approve listing with status: ${listing.status}.` };
  }

  if (!listing.winner || !listing.winningPricePaise) {
    return { success: false, message: 'No valid winner recorded on this auction.' };
  }

  // Generate 6-digit physical handover verification OTP
  const verificationCode = crypto.randomInt(100000, 999999).toString();

  listing.status = 'RESERVED_PENDING_HANDOVER';
  if (decisionNote) listing.sellerDecisionNote = decisionNote;
  await listing.save();

  // Create HandoverRecord
  const handover = await HandoverRecord.findOneAndUpdate(
    { listing: listing._id },
    {
      listing: listing._id,
      seller: listing.seller,
      buyer: listing.winner,
      agreedPricePaise: listing.winningPricePaise,
      verificationCode,
      status: 'PENDING_MEETING',
    },
    { upsert: true, new: true }
  );

  // Notify Buyer
  sendNotification({
    recipientId: listing.winner.toString(),
    type: 'SELLER_APPROVED',
    title: 'Seller Approved Your Bid! 🎉',
    message: `The seller approved your purchase of "${listing.title}" for ₹${paiseToRupees(listing.winningPricePaise)}. Meet on campus for handover.`,
    link: `/handover/${listing._id}`,
    metadata: { listingId: listing._id, verificationCode },
  });

  // Notify Seller
  sendNotification({
    recipientId: sellerId,
    type: 'ITEM_RESERVED',
    title: 'Item Reserved for Buyer',
    message: `"${listing.title}" is reserved. View handover instructions and confirm pickup.`,
    link: `/handover/${listing._id}`,
    metadata: { listingId: listing._id },
  });

  if (io) {
    io.to(`auction:${listingId}`).emit('auction_status_changed', {
      listingId,
      status: 'RESERVED_PENDING_HANDOVER',
    });
  }

  return { success: true, message: 'Winning bid approved. Item is reserved for campus handover.', handover };
};

/**
 * Seller rejects the winning bid
 */
export const rejectWinningBid = async (
  listingId: string,
  sellerId: string,
  rejectionReason: string
): Promise<{ success: boolean; message: string }> => {
  const listing = await Listing.findById(listingId);
  if (!listing) return { success: false, message: 'Listing not found.' };

  if (listing.seller.toString() !== sellerId.toString()) {
    return { success: false, message: 'Only the seller can reject this sale.' };
  }

  if (listing.status !== 'PENDING_SELLER_DECISION') {
    return { success: false, message: `Cannot reject listing with status: ${listing.status}.` };
  }

  listing.status = 'CANCELLED';
  listing.cancellationReason = rejectionReason || 'Seller rejected the closing price';
  await listing.save();

  if (listing.winner) {
    sendNotification({
      recipientId: listing.winner.toString(),
      type: 'SELLER_REJECTED',
      title: 'Seller Declined Closing Bid',
      message: `The seller declined the winning price for "${listing.title}". Reason: ${listing.cancellationReason}`,
      link: `/auctions/${listing._id}`,
      metadata: { listingId: listing._id },
    });
  }

  if (io) {
    io.to(`auction:${listingId}`).emit('auction_status_changed', {
      listingId,
      status: 'CANCELLED',
      cancellationReason: listing.cancellationReason,
    });
  }

  return { success: true, message: 'Winning bid rejected. Listing marked as cancelled.' };
};

/**
 * Confirms successful physical campus handover
 */
export const confirmHandover = async (
  listingId: string,
  actorId: string,
  verificationCodeProvided?: string
): Promise<{ success: boolean; message: string; record?: any }> => {
  const listing = await Listing.findById(listingId);
  if (!listing) return { success: false, message: 'Listing not found.' };

  const handover = await HandoverRecord.findOne({ listing: listingId });
  if (!handover) return { success: false, message: 'Handover record not found.' };

  const isSeller = handover.seller.toString() === actorId.toString();
  const isBuyer = handover.buyer.toString() === actorId.toString();

  if (!isSeller && !isBuyer) {
    return { success: false, message: 'Only buyer or seller can confirm handover.' };
  }

  const providedCode = typeof verificationCodeProvided === 'string'
    ? verificationCodeProvided.trim()
    : '';
  if (!providedCode || !/^\d{6}$/.test(providedCode)) {
    return { success: false, message: 'A valid 6-digit campus handover verification code is required.' };
  }

  if (providedCode !== handover.verificationCode) {
    return { success: false, message: 'Invalid 6-digit campus handover verification code.' };
  }

  handover.status = 'CONFIRMED';
  handover.confirmedAt = new Date();
  await handover.save();

  listing.status = 'COMPLETED';
  await listing.save();

  // Notify both parties
  const otherPartyId = isSeller ? handover.buyer.toString() : handover.seller.toString();
  sendNotification({
    recipientId: otherPartyId,
    type: 'HANDOVER_CONFIRMED',
    title: 'Campus Handover Complete! 🤝',
    message: `Physical handover for "${listing.title}" was successfully completed and verified.`,
    link: `/handover/${listingId}`,
    metadata: { listingId },
  });

  if (io) {
    io.to(`auction:${listingId}`).emit('auction_status_changed', {
      listingId,
      status: 'COMPLETED',
    });
  }

  return { success: true, message: 'Campus handover confirmed successfully!', record: handover };
};

/**
 * Records failed pickup / no show
 */
export const recordFailedPickup = async (
  listingId: string,
  actorId: string,
  reason: 'BUYER_NO_SHOW' | 'SELLER_NO_SHOW' | 'ITEM_MISMATCH',
  notes?: string
): Promise<{ success: boolean; message: string }> => {
  const listing = await Listing.findById(listingId);
  if (!listing) return { success: false, message: 'Listing not found.' };

  const handover = await HandoverRecord.findOne({ listing: listingId });
  if (!handover) return { success: false, message: 'Handover record not found.' };

  const isSeller = handover.seller.toString() === actorId.toString();
  const isBuyer = handover.buyer.toString() === actorId.toString();

  if (!isSeller && !isBuyer) {
    return { success: false, message: 'Only buyer or seller can report pickup outcome.' };
  }

  const statusMap = {
    BUYER_NO_SHOW: 'FAILED_BUYER_NO_SHOW' as const,
    SELLER_NO_SHOW: 'FAILED_SELLER_NO_SHOW' as const,
    ITEM_MISMATCH: 'FAILED_ITEM_MISMATCH' as const,
  };

  handover.status = statusMap[reason];
  handover.notes = notes;
  await handover.save();

  listing.status = 'FAILED_PICKUP';
  await listing.save();

  const otherPartyId = isSeller ? handover.buyer.toString() : handover.seller.toString();
  sendNotification({
    recipientId: otherPartyId,
    type: 'HANDOVER_FAILED',
    title: 'Handover Recorded as Failed',
    message: `Handover for "${listing.title}" was marked as failed (${reason.replace(/_/g, ' ')}).`,
    link: `/handover/${listingId}`,
    metadata: { listingId, reason },
  });

  if (io) {
    io.to(`auction:${listingId}`).emit('auction_status_changed', {
      listingId,
      status: 'FAILED_PICKUP',
      reason,
    });
  }

  return { success: true, message: 'Failed pickup outcome recorded.' };
};
