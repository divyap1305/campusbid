import { AuctionWatch } from '../models/AuctionWatch.js';
import { Listing } from '../models/Listing.js';
import { sendNotification } from './notificationService.js';
import { paiseToRupees } from '../utils/currency.js';

export const notifyWatchersOfPriceChange = async (
  listingId: string,
  currentPricePaise: number,
  bidderId: string
): Promise<void> => {
  const listing = await Listing.findById(listingId).select('title seller');
  if (!listing) return;

  const watches = await AuctionWatch.find({
    listing: listingId,
    user: { $nin: [bidderId, listing.seller] },
  }).select('user');

  for (const watch of watches) {
    await sendNotification({
      recipientId: watch.user.toString(),
      type: 'WATCHLIST_PRICE_UPDATE',
      title: 'Price changed on an auction you watch',
      message: `The current bid on "${listing.title}" is now ₹${paiseToRupees(currentPricePaise)}.`,
      link: `/auctions/${listingId}`,
      metadata: { listingId, currentPricePaise },
    });
  }
};

export const sendClosingSoonWatchlistAlerts = async (now = new Date()): Promise<void> => {
  const soon = new Date(now.getTime() + 30 * 60 * 1000);
  const listings = await Listing.find({
    status: 'ACTIVE',
    closingTime: { $gt: now, $lte: soon },
  }).select('_id title closingTime seller');

  for (const listing of listings) {
    const watches = await AuctionWatch.find({
      listing: listing._id,
      user: { $ne: listing.seller },
      closingAlertSentAt: { $exists: false },
    }).select('_id user');

    for (const watch of watches) {
      const claimed = await AuctionWatch.findOneAndUpdate(
        { _id: watch._id, closingAlertSentAt: { $exists: false } },
        { closingAlertSentAt: now }
      );
      if (!claimed) continue;

      await sendNotification({
        recipientId: watch.user.toString(),
        type: 'AUCTION_CLOSING_SOON',
        title: 'An auction on your watchlist is closing soon',
        message: `"${listing.title}" is scheduled to close within 30 minutes.`,
        link: `/auctions/${listing._id}`,
        metadata: { listingId: listing._id.toString(), closingTime: listing.closingTime },
      });
    }
  }
};
