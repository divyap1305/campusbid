import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { processAIRequest } from '../services/aiAssistantService.js';
import { AIActionConsent } from '../models/AIActionConsent.js';
import { AutoBidSetting } from '../models/AutoBidSetting.js';
import { Listing } from '../models/Listing.js';
import { placeBid, resolveProxyBids } from '../services/auctionService.js';
import { paiseToRupees } from '../utils/currency.js';

export const handleAIQuery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      res.status(400).json({ success: false, message: 'Prompt query is required.' });
      return;
    }

    const response = await processAIRequest(prompt, req.user?._id?.toString());
    res.json({ success: true, ...response });
  } catch (error: any) {
    console.error('[AI Query Error]', error);
    res.status(500).json({ success: false, message: 'AI Assistant failed to process request.' });
  }
};

export const handleExecuteConsent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { consentToken } = req.body;
    if (!consentToken) {
      res.status(400).json({ success: false, message: 'Consent token is required.' });
      return;
    }

    const consent = await AIActionConsent.findOne({
      consentToken,
      user: req.user._id,
      status: 'PENDING',
    });

    if (!consent) {
      res.status(404).json({ success: false, message: 'Invalid or already executed consent request.' });
      return;
    }

    if (new Date().getTime() > consent.expiresAt.getTime()) {
      consent.status = 'REVOKED';
      await consent.save();
      res.status(400).json({ success: false, message: 'Authorization request has expired. Please try again.' });
      return;
    }

    const listing = await Listing.findById(consent.listing);
    if (!listing || listing.status !== 'ACTIVE') {
      res.status(400).json({ success: false, message: 'Auction is no longer active.' });
      return;
    }

    // Save AutoBidSetting
    await AutoBidSetting.findOneAndUpdate(
      { listing: listing._id, bidder: req.user._id },
      { maxAuthorizedPaise: consent.maxAmountPaise, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Place initial minimum bid if not already leading
    const minimumRequired = listing.bidCount === 0
      ? listing.startingPricePaise
      : listing.currentPricePaise + listing.minIncrementPaise;

    if (listing.leadingBidder?.toString() !== req.user._id.toString()) {
      await placeBid(listing._id.toString(), req.user._id.toString(), minimumRequired, {
        isAutoBid: true,
        maxAuthorizedPaise: consent.maxAmountPaise,
        ipAddress: req.ip,
      });
    }

    // Trigger proxy resolution
    setImmediate(() => {
      resolveProxyBids(listing._id.toString()).catch(console.error);
    });

    // Mark consent executed
    consent.status = 'EXECUTED';
    consent.consentGivenAt = new Date();
    await consent.save();

    res.json({
      success: true,
      message: `Automatic bidding confirmed and activated up to ₹${paiseToRupees(consent.maxAmountPaise)}.`,
      listingId: listing._id,
    });
  } catch (error: any) {
    console.error('[ExecuteConsent Error]', error);
    res.status(500).json({ success: false, message: 'Failed to activate auto-bidding authorization.' });
  }
};
