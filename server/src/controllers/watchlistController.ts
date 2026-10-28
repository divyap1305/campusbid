import { Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth.js';
import { AuctionWatch } from '../models/AuctionWatch.js';
import { IListing, Listing } from '../models/Listing.js';

type PopulatedWatchListing = Pick<
  IListing,
  | 'title'
  | 'category'
  | 'description'
  | 'condition'
  | 'photos'
  | 'currentPricePaise'
  | 'startingPricePaise'
  | 'status'
  | 'closingTime'
  | 'bidCount'
> & {
  _id: Types.ObjectId;
  seller: { _id: Types.ObjectId; name: string; department?: string } | null;
};

export const getMyWatchlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const watches = await AuctionWatch.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate<{ listing: PopulatedWatchListing | null }>({
        path: 'listing',
        select: 'title category description condition photos currentPricePaise startingPricePaise status closingTime bidCount seller',
        populate: { path: 'seller', select: 'name department' },
      });

    res.json({
      success: true,
      watchlist: watches.map((watch) => {
        const listing = watch.listing;
        return {
          id: watch._id.toString(),
          createdAt: watch.createdAt,
          listing: listing ? {
            id: listing._id.toString(),
            title: listing.title,
            category: listing.category,
            description: listing.description,
            condition: listing.condition,
            photos: listing.photos,
            currentPricePaise: listing.currentPricePaise,
            startingPricePaise: listing.startingPricePaise,
            status: listing.status,
            closingTime: listing.closingTime,
            bidCount: listing.bidCount,
            seller: listing.seller ? {
              id: listing.seller._id.toString(),
              name: listing.seller.name,
              department: listing.seller.department,
            } : undefined,
          } : null,
        };
      }),
    });
  } catch (error) {
    console.error('[GetWatchlist Error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve your auction watchlist.' });
  }
};

export const getWatchStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { listingId } = req.params;
    if (!mongoose.isValidObjectId(listingId)) {
      res.status(400).json({ success: false, message: 'Invalid auction listing ID.' });
      return;
    }

    const watch = await AuctionWatch.exists({ user: req.user._id, listing: listingId });
    res.json({ success: true, isWatching: Boolean(watch) });
  } catch (error) {
    console.error('[GetWatchStatus Error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve auction watch status.' });
  }
};

export const addToWatchlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { listingId } = req.params;
    if (!mongoose.isValidObjectId(listingId)) {
      res.status(400).json({ success: false, message: 'Invalid auction listing ID.' });
      return;
    }

    const listing = await Listing.findOne({
      _id: listingId,
      status: 'ACTIVE',
      closingTime: { $gt: new Date() },
    });
    if (!listing) {
      res.status(404).json({ success: false, message: 'Active auction listing not found.' });
      return;
    }

    const existing = await AuctionWatch.findOne({ user: req.user._id, listing: listingId });
    if (existing) {
      res.json({ success: true, message: 'Auction is already in your watchlist.', isWatching: true });
      return;
    }

    try {
      await AuctionWatch.create({ user: req.user._id, listing: listingId });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }

    res.status(201).json({ success: true, message: 'Auction added to your watchlist.', isWatching: true });
  } catch (error) {
    console.error('[AddToWatchlist Error]', error);
    res.status(500).json({ success: false, message: 'Failed to add auction to your watchlist.' });
  }
};

export const removeFromWatchlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { listingId } = req.params;
    if (!mongoose.isValidObjectId(listingId)) {
      res.status(400).json({ success: false, message: 'Invalid auction listing ID.' });
      return;
    }

    const removed = await AuctionWatch.findOneAndDelete({ user: req.user._id, listing: listingId });
    if (!removed) {
      res.status(404).json({ success: false, message: 'Auction is not in your watchlist.' });
      return;
    }

    res.json({ success: true, message: 'Auction removed from your watchlist.', isWatching: false });
  } catch (error) {
    console.error('[RemoveFromWatchlist Error]', error);
    res.status(500).json({ success: false, message: 'Failed to remove auction from your watchlist.' });
  }
};
