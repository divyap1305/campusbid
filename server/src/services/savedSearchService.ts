import { SavedSearch } from '../models/SavedSearch.js';
import { IListing } from '../models/Listing.js';
import { sendNotification } from './notificationService.js';
import { paiseToRupees } from '../utils/currency.js';

export const checkSavedSearchesForListing = async (listing: IListing): Promise<void> => {
  try {
    if (listing.status !== 'ACTIVE' || listing.closingTime.getTime() <= Date.now()) return;

    const activeSearches = await SavedSearch.find({
      isActive: true,
      user: { $ne: listing.seller },
    });

    for (const search of activeSearches) {
      let matches = true;

      // Category filter
      if (search.category && search.category !== 'ALL' && search.category !== listing.category) {
        matches = false;
      }

      if (matches && search.minPricePaise !== undefined && listing.currentPricePaise < search.minPricePaise) {
        matches = false;
      }

      if (matches && search.maxPricePaise !== undefined && listing.currentPricePaise > search.maxPricePaise) {
        matches = false;
      }

      // Condition filter
      if (matches && search.condition && search.condition !== 'ANY' && search.condition !== listing.condition) {
        matches = false;
      }

      if (matches && search.query && search.query.trim().length > 0) {
        const terms = search.query.trim().split(/\s+/).map((term) => term.toLocaleLowerCase());
        const listingText = `${listing.title} ${listing.description}`.toLocaleLowerCase();
        if (!terms.some((term) => listingText.includes(term))) {
          matches = false;
        }
      }

      if (matches && search.closingSoon) {
        const remainingMs = listing.closingTime.getTime() - Date.now();
        if (remainingMs <= 0 || remainingMs > 2 * 60 * 60 * 1000) matches = false;
      }

      if (matches) {
        // Send alert
        await sendNotification({
          recipientId: search.user.toString(),
          type: 'SAVED_SEARCH_MATCH',
          title: 'New Matching Campus Item! 🎯',
          message: `"${listing.title}" matches your saved search (Current price ₹${paiseToRupees(listing.currentPricePaise)}).`,
          link: `/auctions/${listing._id}`,
          metadata: { listingId: listing._id, savedSearchId: search._id },
        });

        search.lastNotifiedAt = new Date();
        await search.save();
      }
    }
  } catch (error) {
    console.error('[SavedSearch Alert Error]', error);
  }
};
