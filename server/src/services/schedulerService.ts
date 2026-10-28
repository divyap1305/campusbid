import { Listing } from '../models/Listing.js';
import { closeAuction } from './closureService.js';
import { sendClosingSoonWatchlistAlerts } from './watchlistService.js';

let isRunning = false;

export const processExpiredAuctions = async (): Promise<void> => {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = new Date();
    // Find active auctions whose closing time has passed
    const expiredListings = await Listing.find({
      status: 'ACTIVE',
      closingTime: { $lte: now },
    }).limit(20);

    for (const listing of expiredListings) {
      try {
        await closeAuction(listing._id.toString());
        console.log(`[Scheduler] Closed expired auction: ${listing._id} ("${listing.title}")`);
      } catch (err) {
        console.error(`[Scheduler Error] Failed to close auction ${listing._id}:`, err);
      }
    }

    await sendClosingSoonWatchlistAlerts(now);
  } catch (error) {
    console.error('[Scheduler Error] Expired auction scan failed:', error);
  } finally {
    isRunning = false;
  }
};

/**
 * Starts the persistent background timer
 */
export const startScheduler = (intervalMs = 5000) => {
  console.log(`[Scheduler] Auction lifecycle background worker started (interval: ${intervalMs}ms)`);
  
  // Run immediate catchup on startup (recovers safely after restarts)
  processExpiredAuctions();

  // Periodic recurring check
  const timer = setInterval(() => {
    processExpiredAuctions();
  }, intervalMs);

  return timer;
};
