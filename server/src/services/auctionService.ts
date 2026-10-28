import mongoose, { Types } from 'mongoose';
import { Listing, IListing } from '../models/Listing.js';
import { Bid, IBid } from '../models/Bid.js';
import { AutoBidSetting, IAutoBidSetting } from '../models/AutoBidSetting.js';
import { User } from '../models/User.js';
import { sendNotification } from './notificationService.js';
import { io } from '../index.js';
import { paiseToRupees } from '../utils/currency.js';

export interface PlaceBidResult {
  success: boolean;
  message: string;
  bid?: IBid;
  listing?: IListing;
  wasExtended?: boolean;
}

export const maskStudentName = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

/**
 * Places a bid with atomic concurrency protection, soft-close extension,
 * and automated proxy bidding resolution.
 */
export const placeBid = async (
  listingId: string,
  bidderId: string,
  amountPaise: number,
  options: { isAutoBid?: boolean; maxAuthorizedPaise?: number; ipAddress?: string } = {}
): Promise<PlaceBidResult> => {
  const now = new Date();

  // 1. Fetch current listing state
  const listing = await Listing.findById(listingId).populate('seller', 'name email');
  if (!listing) {
    return { success: false, message: 'Auction listing not found.' };
  }

  // 2. Validate listing status
  if (listing.status !== 'ACTIVE') {
    return { success: false, message: `Bidding is closed for this listing (status: ${listing.status}).` };
  }

  // 3. Authoritative server-side closing time check
  if (now.getTime() >= listing.closingTime.getTime()) {
    return { success: false, message: 'This auction has officially closed.' };
  }

  // 4. Reject seller self-bidding
  const sellerId = (listing.seller as any)._id || listing.seller;
  if (sellerId.toString() === bidderId.toString()) {
    return { success: false, message: 'Sellers are strictly prohibited from bidding on their own listings.' };
  }

  // 5. Calculate minimum required bid
  let minimumRequiredPaise: number;
  if (listing.bidCount === 0) {
    minimumRequiredPaise = listing.startingPricePaise;
  } else {
    minimumRequiredPaise = listing.currentPricePaise + listing.minIncrementPaise;
  }

  if (amountPaise < minimumRequiredPaise) {
    return {
      success: false,
      message: `Bid of ₹${paiseToRupees(amountPaise)} is below minimum required ₹${paiseToRupees(minimumRequiredPaise)}.`,
    };
  }

  // 6. Check last-minute soft-close anti-sniping rule
  // Rule: If accepted with <= 30 seconds remaining, set new closing time to 60 seconds after that bid's accepted timestamp.
  // 31 seconds remaining must NOT extend.
  const remainingMs = listing.closingTime.getTime() - now.getTime();
  let newClosingTime = listing.closingTime;
  let wasExtended = false;

  if (remainingMs <= 30000 && remainingMs > 0) {
    newClosingTime = new Date(now.getTime() + 60000);
    wasExtended = true;
  }

  // 7. Atomic Concurrency-Safe Update
  const previousPrice = listing.currentPricePaise;
  const previousBidCount = listing.bidCount;
  const previousLeadingBidder = listing.leadingBidder;
  const previousLeadingBidId = listing.leadingBid;

  const updateFields: any = {
    currentPricePaise: amountPaise,
    leadingBidder: bidderId,
    closingTime: newClosingTime,
    $inc: { bidCount: 1, ...(wasExtended ? { extensionCount: 1 } : {}) },
  };

  const updatedListing = await Listing.findOneAndUpdate(
    {
      _id: listingId,
      status: 'ACTIVE',
      closingTime: { $gt: now },
      currentPricePaise: previousPrice,
      bidCount: previousBidCount,
    },
    updateFields,
    { new: true }
  ).populate('leadingBidder', 'name email');

  if (!updatedListing) {
    return {
      success: false,
      message: 'Concurrent bid conflict: Another student placed a higher bid right before yours. Please review and try again.',
    };
  }

  // 8. Persist accepted bid
  const bidderDoc = await User.findById(bidderId);
  const newBid = await Bid.create({
    listing: listingId,
    bidder: bidderId,
    amountPaise,
    serverTimestamp: now,
    isAutoBid: !!options.isAutoBid,
    maxAuthorizedPaise: options.maxAuthorizedPaise || amountPaise,
    status: 'ACCEPTED',
    ipAddress: options.ipAddress,
  });

  // Update listing reference to new leading bid
  updatedListing.leadingBid = newBid._id as Types.ObjectId;
  await updatedListing.save();

  // Mark previous leading bid as OUTBID
  if (previousLeadingBidId) {
    await Bid.findByIdAndUpdate(previousLeadingBidId, { status: 'OUTBID' });
  }

  // 9. Send outbid notification to previous leader
  if (previousLeadingBidder && previousLeadingBidder.toString() !== bidderId.toString()) {
    sendNotification({
      recipientId: previousLeadingBidder.toString(),
      type: 'OUTBID',
      title: 'You were outbid!',
      message: `Someone placed a bid of ₹${paiseToRupees(amountPaise)} on "${listing.title}".`,
      link: `/auctions/${listingId}`,
      metadata: { listingId, newPricePaise: amountPaise },
    });
  }

  // 10. Broadcast real-time Socket.IO event to all viewers
  if (io) {
    io.to(`auction:${listingId}`).emit('bid_placed', {
      listingId,
      currentPricePaise: updatedListing.currentPricePaise,
      leadingBidder: {
        id: bidderId,
        displayName: bidderDoc ? maskStudentName(bidderDoc.name) : 'Student',
      },
      closingTime: updatedListing.closingTime,
      wasExtended,
      bidCount: updatedListing.bidCount,
      bid: {
        id: newBid._id,
        amountPaise: newBid.amountPaise,
        serverTimestamp: newBid.serverTimestamp,
        isAutoBid: newBid.isAutoBid,
        maxAuthorizedPaise: newBid.maxAuthorizedPaise,
        displayName: bidderDoc ? maskStudentName(bidderDoc.name) : 'Student',
      },
    });

    // Also broadcast update to marketplace list
    io.emit('marketplace_listing_updated', {
      listingId,
      currentPricePaise: updatedListing.currentPricePaise,
      bidCount: updatedListing.bidCount,
      closingTime: updatedListing.closingTime,
    });
  }

  // 11. Trigger automated proxy bidding resolution if applicable
  if (!options.isAutoBid) {
    // Run proxy resolution in background to not block current bid response
    setImmediate(() => {
      resolveProxyBids(listingId).catch((err) =>
        console.error('[Proxy Bidding Resolution Error]', err)
      );
    });
  }

  return {
    success: true,
    message: wasExtended
      ? `Bid of ₹${paiseToRupees(amountPaise)} accepted! Clock extended by 60s.`
      : `Bid of ₹${paiseToRupees(amountPaise)} accepted!`,
    bid: newBid,
    listing: updatedListing,
    wasExtended,
  };
};

/**
 * Resolves competing automatic (proxy) bids deterministically:
 * - Finds all active AutoBidSettings for this listing where maxAuthorizedPaise > currentPricePaise.
 * - Earliest registered setting wins ties.
 * - Places the minimum necessary increment to retain the lead.
 */
export const resolveProxyBids = async (listingId: string): Promise<void> => {
  const maxIterations = 20;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    const listing = await Listing.findById(listingId);
    if (!listing || listing.status !== 'ACTIVE') break;
    if (new Date().getTime() >= listing.closingTime.getTime()) break;

    const currentLeaderId = listing.leadingBidder?.toString();

    // Fetch active proxy authorizations
    // Sort by createdAt: 1 for deterministic tie breaking
    const candidateSettings = await AutoBidSetting.find({
      listing: listingId,
      isActive: true,
      maxAuthorizedPaise: { $gt: listing.currentPricePaise },
    }).sort({ createdAt: 1 });

    if (candidateSettings.length === 0) break;

    // Filter out candidates who are already the leader
    const challenger = candidateSettings.find(
      (s) => s.bidder.toString() !== currentLeaderId
    );

    if (!challenger) {
      // Leader is already the highest auto-bidder and has lead
      break;
    }

    // Determine amount needed to outbid: currentPrice + minIncrement
    let nextBidPaise = listing.currentPricePaise + listing.minIncrementPaise;

    // Check if next required bid exceeds challenger's authorized max
    if (nextBidPaise > challenger.maxAuthorizedPaise) {
      // Deactivate exhausted setting
      challenger.isActive = false;
      await challenger.save();
      continue;
    }

    // Execute automatic bid on challenger's behalf
    const result = await placeBid(listingId, challenger.bidder.toString(), nextBidPaise, {
      isAutoBid: true,
      maxAuthorizedPaise: challenger.maxAuthorizedPaise,
    });

    if (!result.success) {
      // Could not place bid (e.g. auction closed or conflict), break loop
      break;
    }
  }
};
