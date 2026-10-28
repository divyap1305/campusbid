import { Request, Response } from 'express';
import { Listing, IListing } from '../models/Listing.js';
import { Bid } from '../models/Bid.js';
import { AuthRequest } from '../middleware/auth.js';
import { checkSavedSearchesForListing } from '../services/savedSearchService.js';
import { rupeesToPaise } from '../utils/currency.js';
import { io } from '../index.js';
import { maskStudentName } from '../services/auctionService.js';

export const createListing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const {
      title,
      category,
      description,
      condition,
      startingPrice,
      minIncrement,
      durationHours,
      photos,
    } = req.body;

    if (!title || !category || !description || !condition || !startingPrice) {
      res.status(400).json({ success: false, message: 'Title, category, description, condition, and starting price are required.' });
      return;
    }

    const startingPricePaise = rupeesToPaise(Number(startingPrice));
    const minIncrementPaise = minIncrement === undefined || minIncrement === null || minIncrement === ''
      ? 2000
      : rupeesToPaise(Number(minIncrement)); // default ₹20

    if (!Number.isSafeInteger(startingPricePaise) || startingPricePaise <= 0) {
      res.status(400).json({ success: false, message: 'Starting price must be greater than ₹0.' });
      return;
    }

    if (!Number.isSafeInteger(minIncrementPaise) || minIncrementPaise <= 0) {
      res.status(400).json({ success: false, message: 'Minimum bid increment must be a positive amount.' });
      return;
    }

    const hours = durationHours === undefined || durationHours === null || durationHours === ''
      ? 24
      : Number(durationHours); // default 24 hours
    if (!Number.isFinite(hours) || hours <= 0) {
      res.status(400).json({ success: false, message: 'Auction duration must be greater than zero.' });
      return;
    }
    const now = new Date();
    const closingTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    // Photos: array of image URLs
    const photoUrls: string[] = Array.isArray(photos) ? photos : [];

    const listing = await Listing.create({
      title: title.trim(),
      category,
      description: description.trim(),
      condition,
      photos: photoUrls,
      startingPricePaise,
      minIncrementPaise,
      currentPricePaise: startingPricePaise,
      seller: req.user._id,
      status: 'ACTIVE',
      closingTime,
      originalClosingTime: closingTime,
      bidCount: 0,
      extensionCount: 0,
    });

    // Broadcast new listing to live marketplace
    if (io) {
      io.emit('new_listing_published', {
        id: listing._id,
        title: listing.title,
        category: listing.category,
        currentPricePaise: listing.currentPricePaise,
        closingTime: listing.closingTime,
      });
    }

    // Check saved searches in background
    setImmediate(() => {
      checkSavedSearchesForListing(listing).catch((err) =>
        console.error('[SavedSearch Check Error]', err)
      );
    });

    res.status(201).json({
      success: true,
      message: 'Auction listing published successfully!',
      listing,
    });
  } catch (error: any) {
    console.error('[CreateListing Error]', error);
    res.status(500).json({ success: false, message: 'Failed to create auction listing.' });
  }
};

export const updateListing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
      res.status(404).json({ success: false, message: 'Listing not found.' });
      return;
    }

    if (listing.seller.toString() !== req.user._id.toString()) {
      res.status(403).json({ success: false, message: 'Only the seller can edit this listing.' });
      return;
    }

    const { title, description, category, condition, startingPrice, minIncrement, photos } = req.body;

    // RULE: Prevent unsafe changes to price-sensitive fields once bidding begins!
    if (listing.bidCount > 0) {
      if (startingPrice !== undefined || minIncrement !== undefined) {
        res.status(400).json({
          success: false,
          message: 'Price-sensitive fields (starting price, minimum increment) cannot be modified after bidding has begun.',
        });
        return;
      }
    } else {
      if (startingPrice !== undefined) {
        const newStartPaise = rupeesToPaise(Number(startingPrice));
        if (!Number.isSafeInteger(newStartPaise) || newStartPaise <= 0) {
          res.status(400).json({ success: false, message: 'Starting price must be a positive amount.' });
          return;
        }
        listing.startingPricePaise = newStartPaise;
        listing.currentPricePaise = newStartPaise;
      }
      if (minIncrement !== undefined) {
        const newIncrementPaise = rupeesToPaise(Number(minIncrement));
        if (!Number.isSafeInteger(newIncrementPaise) || newIncrementPaise <= 0) {
          res.status(400).json({ success: false, message: 'Minimum bid increment must be a positive amount.' });
          return;
        }
        listing.minIncrementPaise = newIncrementPaise;
      }
    }

    if (title) listing.title = title.trim();
    if (description) listing.description = description.trim();
    if (category) listing.category = category;
    if (condition) listing.condition = condition;
    if (photos && Array.isArray(photos)) listing.photos = photos;

    await listing.save();

    res.json({
      success: true,
      message: 'Listing updated successfully.',
      listing,
    });
  } catch (error: any) {
    console.error('[UpdateListing Error]', error);
    res.status(500).json({ success: false, message: 'Failed to update listing.' });
  }
};

export const cancelListing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;

    const listing = await Listing.findById(id);
    if (!listing) {
      res.status(404).json({ success: false, message: 'Listing not found.' });
      return;
    }

    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'You do not have permission to cancel this listing.' });
      return;
    }

    if (['COMPLETED', 'CANCELLED', 'UNSOLD'].includes(listing.status)) {
      res.status(400).json({ success: false, message: `Listing is already ${listing.status}.` });
      return;
    }

    listing.status = 'CANCELLED';
    listing.cancellationReason = reason?.trim() || 'Cancelled by seller';
    await listing.save();

    if (io) {
      io.to(`auction:${id}`).emit('auction_status_changed', {
        listingId: id,
        status: 'CANCELLED',
        cancellationReason: listing.cancellationReason,
      });
    }

    res.json({
      success: true,
      message: 'Listing successfully cancelled.',
      listing,
    });
  } catch (error: any) {
    console.error('[CancelListing Error]', error);
    res.status(500).json({ success: false, message: 'Failed to cancel listing.' });
  }
};

export const getListings = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      category,
      condition,
      minPrice,
      maxPrice,
      closingSoon,
      status,
      sortBy,
      page = 1,
      limit = 12,
    } = req.query;

    const filter: any = {};

    // Default status: ACTIVE unless specified
    if (status) {
      filter.status = status;
    } else {
      filter.status = 'ACTIVE';
    }

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (condition && condition !== 'ALL') {
      filter.condition = condition;
    }

    // Price filter (stored in paise)
    if (minPrice || maxPrice) {
      filter.currentPricePaise = {};
      if (minPrice) filter.currentPricePaise.$gte = rupeesToPaise(Number(minPrice));
      if (maxPrice) filter.currentPricePaise.$lte = rupeesToPaise(Number(maxPrice));
    }

    // Closing soon filter (e.g. within next 2 hours)
    if (closingSoon === 'true') {
      const now = new Date();
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      filter.closingTime = { $gte: now, $lte: twoHoursLater };
    }

    // Search query
    if (search && typeof search === 'string' && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    // Sorting
    let sortOptions: any = { createdAt: -1 };
    if (sortBy === 'closing_soon') {
      sortOptions = { closingTime: 1 };
    } else if (sortBy === 'price_asc') {
      sortOptions = { currentPricePaise: 1 };
    } else if (sortBy === 'price_desc') {
      sortOptions = { currentPricePaise: -1 };
    } else if (sortBy === 'most_bids') {
      sortOptions = { bidCount: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [listings, totalCount] = await Promise.all([
      Listing.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .populate('seller', 'name department avatarUrl isCampusVerified')
        .populate('leadingBidder', 'name'),
      Listing.countDocuments(filter),
    ]);

    // Format output with public safe seller and leading bidder names
    const sanitizedListings = listings.map((l) => ({
      id: l._id,
      title: l.title,
      category: l.category,
      description: l.description,
      condition: l.condition,
      photos: l.photos,
      startingPricePaise: l.startingPricePaise,
      minIncrementPaise: l.minIncrementPaise,
      currentPricePaise: l.currentPricePaise,
      status: l.status,
      closingTime: l.closingTime,
      bidCount: l.bidCount,
      extensionCount: l.extensionCount,
      seller: l.seller
        ? {
            id: (l.seller as any)._id,
            name: maskStudentName((l.seller as any).name || 'Student'),
            department: (l.seller as any).department,
            avatarUrl: (l.seller as any).avatarUrl,
            isCampusVerified: (l.seller as any).isCampusVerified,
          }
        : null,
      leadingBidderName: l.leadingBidder
        ? maskStudentName((l.leadingBidder as any).name || 'Student')
        : null,
    }));

    res.json({
      success: true,
      listings: sanitizedListings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('[GetListings Error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve listings.' });
  }
};

export const getListingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!/^[a-f\d]{24}$/i.test(id)) {
      res.status(400).json({ success: false, message: 'Invalid listing ID.' });
      return;
    }

    const listing = await Listing.findById(id)
      .populate('seller', 'name email department phoneNumber avatarUrl isCampusVerified')
      .populate('leadingBidder', 'name');

    if (!listing) {
      res.status(404).json({ success: false, message: 'Listing not found.' });
      return;
    }

    // Fetch bid history (public: amount, timestamp, masked name, public maximum bids)
    const bids = await Bid.find({ listing: id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('bidder', 'name');

    const formattedBids = bids.map((b) => ({
      id: b._id,
      amountPaise: b.amountPaise,
      serverTimestamp: b.serverTimestamp,
      isAutoBid: b.isAutoBid,
      maxAuthorizedPaise: b.maxAuthorizedPaise,
      status: b.status,
      bidderDisplayName: b.bidder ? maskStudentName((b.bidder as any).name || 'Student') : 'Student',
    }));

    res.json({
      success: true,
      listing: {
        id: listing._id,
        title: listing.title,
        category: listing.category,
        description: listing.description,
        condition: listing.condition,
        photos: listing.photos,
        startingPricePaise: listing.startingPricePaise,
        minIncrementPaise: listing.minIncrementPaise,
        currentPricePaise: listing.currentPricePaise,
        status: listing.status,
        closingTime: listing.closingTime,
        originalClosingTime: listing.originalClosingTime,
        bidCount: listing.bidCount,
        extensionCount: listing.extensionCount,
        cancellationReason: listing.cancellationReason,
        winner: listing.winner,
        winningPricePaise: listing.winningPricePaise,
        seller: {
          id: (listing.seller as any)._id,
          name: (listing.seller as any).name,
          department: (listing.seller as any).department,
          avatarUrl: (listing.seller as any).avatarUrl,
          isCampusVerified: (listing.seller as any).isCampusVerified,
        },
        leadingBidderName: listing.leadingBidder
          ? maskStudentName((listing.leadingBidder as any).name || 'Student')
          : null,
      },
      bids: formattedBids,
    });
  } catch (error: any) {
    console.error('[GetListingById Error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve listing details.' });
  }
};

export const getMyListings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const listings = await Listing.find({ seller: req.user._id })
      .sort({ createdAt: -1 })
      .populate('leadingBidder', 'name email department');

    res.json({
      success: true,
      listings: listings.map((listing) => ({
        ...listing.toObject(),
        id: listing._id.toString(),
      })),
    });
  } catch (error: any) {
    console.error('[GetMyListings Error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve your listings.' });
  }
};

export const getMyBids = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const bids = await Bid.find({ bidder: req.user._id })
      .sort({ createdAt: -1 })
      .populate('listing');

    // Group by listing to see latest status
    const listingMap = new Map<string, any>();
    for (const b of bids) {
      const listing = b.listing as any;
      if (!listing) continue;
      const key = listing._id.toString();
      if (!listingMap.has(key)) {
        listingMap.set(key, {
          listing,
          myHighestBidPaise: b.amountPaise,
          isWinning: listing.leadingBidder?.toString() === req.user._id.toString(),
          myLatestBidStatus: b.status,
          bidsCount: 1,
        });
      } else {
        const item = listingMap.get(key);
        item.bidsCount += 1;
        if (b.amountPaise > item.myHighestBidPaise) {
          item.myHighestBidPaise = b.amountPaise;
        }
      }
    }

    res.json({
      success: true,
      myBids: Array.from(listingMap.values()),
    });
  } catch (error: any) {
    console.error('[GetMyBids Error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve your bids.' });
  }
};
