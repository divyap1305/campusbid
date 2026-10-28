import { SavedSearch } from '../models/SavedSearch.js';
import { IListing } from '../models/Listing.js';
import { sendNotification } from './notificationService.js';
import { paiseToRupees } from '../utils/currency.js';

export const checkSavedSearchesForListing = async (listing: IListing): Promise<void> => {
  try {
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

      // Max price filter
      if (matches && search.maxPricePaise && listing.startingPricePaise > search.maxPricePaise) {
        matches = false;
      }

      // Condition filter
      if (matches && search.condition && search.condition !== 'ANY' && search.condition !== listing.condition) {
        matches = false;
      }

      // Query keyword match
      if (matches && search.query && search.query.trim().length > 0) {
        const regex = new RegExp(search.query.trim(), 'i');
        const titleMatch = regex.test(listing.title);
        const descMatch = regex.test(listing.description);
        if (!titleMatch && !descMatch) {
          matches = false;
        }
      }

      if (matches) {
        // Send alert
        await sendNotification({
          recipientId: search.user.toString(),
          type: 'SAVED_SEARCH_MATCH',
          title: 'New Matching Campus Item! 🎯',
          message: `"${listing.title}" matches your saved search (Starting at ₹${paiseToRupees(listing.startingPricePaise)}).`,
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
