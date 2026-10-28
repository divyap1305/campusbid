import { Request, Response } from 'express';
import { placeBid, resolveProxyBids } from '../services/auctionService.js';
import { AutoBidSetting } from '../models/AutoBidSetting.js';
import { Listing } from '../models/Listing.js';
import { AuthRequest } from '../middleware/auth.js';
import { rupeesToPaise, paiseToRupees } from '../utils/currency.js';

export const handlePlaceBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required to place a bid.' });
      return;
    }

    const { id: listingId } = req.params;
    const { amountRupees, amountPaise } = req.body;

    const bidPaise = amountPaise !== undefined
      ? Number(amountPaise)
      : amountRupees !== undefined
      ? rupeesToPaise(Number(amountRupees))
      : 0;

    if (!Number.isSafeInteger(bidPaise) || bidPaise <= 0) {
      res.status(400).json({ success: false, message: 'A valid positive bid amount is required.' });
      return;
    }

    const result = await placeBid(listingId, req.user._id.toString(), bidPaise, {
      ipAddress: req.ip,
    });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('[HandlePlaceBid Error]', error);
    res.status(500).json({ success: false, message: 'Failed to process bid request.' });
  }
};

export const configureAutoBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id: listingId } = req.params;
    const { maxRupees, maxPaise } = req.body;

    const ceilingPaise = maxPaise !== undefined
      ? Number(maxPaise)
      : maxRupees !== undefined
      ? rupeesToPaise(Number(maxRupees))
      : 0;

    if (!Number.isSafeInteger(ceilingPaise) || ceilingPaise <= 0) {
      res.status(400).json({ success: false, message: 'A valid maximum authorized amount is required.' });
      return;
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      res.status(404).json({ success: false, message: 'Listing not found.' });
      return;
    }

    if (listing.status !== 'ACTIVE') {
      res.status(400).json({ success: false, message: 'Auction is not active.' });
      return;
    }

    if (listing.seller.toString() === req.user._id.toString()) {
      res.status(400).json({ success: false, message: 'Sellers cannot configure auto-bids on their own items.' });
      return;
    }

    const minimumRequired = listing.bidCount === 0
      ? listing.startingPricePaise
      : listing.currentPricePaise + listing.minIncrementPaise;

    if (ceilingPaise < minimumRequired) {
      res.status(400).json({
        success: false,
        message: `Your ceiling (₹${paiseToRupees(ceilingPaise)}) must be at least the next required bid (₹${paiseToRupees(minimumRequired)}).`,
      });
      return;
    }

    // Save or update AutoBidSetting
    const autoBid = await AutoBidSetting.findOneAndUpdate(
      { listing: listingId, bidder: req.user._id },
      { maxAuthorizedPaise: ceilingPaise, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // If user is not currently the leading bidder, place first proxy increment immediately
    if (listing.leadingBidder?.toString() !== req.user._id.toString()) {
      await placeBid(listingId, req.user._id.toString(), minimumRequired, {
        isAutoBid: true,
        maxAuthorizedPaise: ceilingPaise,
        ipAddress: req.ip,
      });
    }

    // Run resolution in case other proxy settings compete
    setImmediate(() => {
      resolveProxyBids(listingId).catch((err) =>
        console.error('[AutoBid Resolution Error]', err)
      );
    });

    res.json({
      success: true,
      message: `Automatic bidding authorized up to ₹${paiseToRupees(ceilingPaise)}.`,
      autoBid,
    });
  } catch (error: any) {
    console.error('[ConfigureAutoBid Error]', error);
    res.status(500).json({ success: false, message: 'Failed to configure automatic bidding.' });
  }
};

export const revokeAutoBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id: listingId } = req.params;
    const setting = await AutoBidSetting.findOne({ listing: listingId, bidder: req.user._id });

    if (!setting) {
      res.status(404).json({ success: false, message: 'No active automatic bid configuration found.' });
      return;
    }

    setting.isActive = false;
    await setting.save();

    res.json({
      success: true,
      message: 'Automatic bidding ceiling revoked.',
    });
  } catch (error: any) {
    console.error('[RevokeAutoBid Error]', error);
    res.status(500).json({ success: false, message: 'Failed to revoke automatic bidding.' });
  }
};

export const getMyAutoBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id: listingId } = req.params;
    const setting = await AutoBidSetting.findOne({ listing: listingId, bidder: req.user._id });

    res.json({
      success: true,
      autoBid: setting && setting.isActive ? setting : null,
    });
  } catch (error: any) {
    console.error('[GetMyAutoBid Error]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch auto-bid setting.' });
  }
};
