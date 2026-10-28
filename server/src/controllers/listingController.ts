import { Request, Response } from 'express';
import { Listing, IListing } from '../models/Listing.js';
import { Bid } from '../models/Bid.js';
import { AuditLog } from '../models/AuditLog.js';
import { AutoBidSetting } from '../models/AutoBidSetting.js';
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
    if (
      photos !== undefined &&
      (!Array.isArray(photos) ||
        photos.length > 10 ||
        photos.some((photo) => {
          if (typeof photo !== 'string' || photo.length > 2048) return true;
          if (photo.startsWith('/uploads/')) return false;
          try {
            const parsed = new URL(photo);
            return parsed.protocol !== 'http:' && parsed.protocol !== 'https:';
          } catch {
            return true;
          }
        }))
    ) {
      res.status(400).json({ success: false, message: 'Photos must contain up to 10 valid image URLs.' });
      return;
    }
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

export const relistListing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    if (!/^[a-f\d]{24}$/i.test(id)) {
      res.status(400).json({ success: false, message: 'Invalid listing ID.' });
      return;
    }

    const source = await Listing.findById(id);
    if (!source) {
      res.status(404).json({ success: false, message: 'Listing not found.' });
      return;
    }
    if (source.seller.toString() !== req.user._id.toString()) {
      res.status(403).json({ success: false, message: 'You do not have permission to relist this auction.' });
      return;
    }

    if (
      source.status !== 'UNSOLD' ||
      source.bidCount !== 0 ||
      source.closingTime.getTime() > Date.now() ||
      await Bid.exists({ listing: source._id })
    ) {
      res.status(409).json({
        success: false,
        message: 'Only ended auctions with no bids can be relisted.',
      });
      return;
    }

    const closingTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const relisted = await Listing.create({
      title: source.title,
      category: source.category,
      description: source.description,
      condition: source.condition,
      photos: source.photos,
      startingPricePaise: source.startingPricePaise,
      minIncrementPaise: source.minIncrementPaise,
      currentPricePaise: source.startingPricePaise,
      seller: source.seller,
      status: 'ACTIVE',
      closingTime,
      originalClosingTime: closingTime,
      bidCount: 0,
      extensionCount: 0,
      relistedFrom: source._id,
    });

    try {
      await AuditLog.create({
        event: 'LISTING_RELISTED',
        entityType: 'LISTING',
        entityId: source._id,
        actorId: req.user._id,
        details: { relistedListingId: relisted._id },
        ipAddress: req.ip,
      });
    } catch (auditError) {
      console.error('[Listing Audit Log Error] Listing relisted but audit record failed:', auditError);
    }

    if (io) {
      io.emit('new_listing_published', {
        id: relisted._id,
        title: relisted.title,
        category: relisted.category,
        currentPricePaise: relisted.currentPricePaise,
        closingTime: relisted.closingTime,
      });
    }

    setImmediate(() => {
      checkSavedSearchesForListing(relisted).catch((err) =>
        console.error('[SavedSearch Check Error]', err)
      );
    });

    res.status(201).json({
      success: true,
      message: 'Auction relisted successfully for 24 hours.',
      listing: relisted,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({
        success: false,
        message: 'This auction has already been relisted.',
      });
      return;
    }
    console.error('[RelistListing Error]', error);
    res.status(500).json({ success: false, message: 'Failed to relist auction.' });
  }
};

export const updateListing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    if (!/^[a-f\d]{24}$/i.test(id)) {
      res.status(400).json({ success: false, message: 'Invalid listing ID.' });
      return;
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      res.status(400).json({ success: false, message: 'A valid listing update is required.' });
      return;
    }

    const editableFields = [
      'title',
      'description',
      'category',
      'condition',
      'photos',
      'startingPrice',
      'minIncrement',
      'closingTime',
    ];
    const prohibitedFields = Object.keys(req.body).filter((field) => !editableFields.includes(field));
    if (prohibitedFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Unsupported listing fields: ${prohibitedFields.join(', ')}.`,
      });
      return;
    }
    if (Object.keys(req.body).length === 0) {
      res.status(400).json({ success: false, message: 'At least one listing field must be provided.' });
      return;
    }

    const listing = await Listing.findById(id);

    if (!listing) {
      res.status(404).json({ success: false, message: 'Listing not found.' });
      return;
    }

    if (listing.seller.toString() !== req.user._id.toString()) {
      res.status(403).json({ success: false, message: 'Only the seller can edit this listing.' });
      return;
    }

    if (listing.status !== 'ACTIVE') {
      res.status(400).json({
        success: false,
        message: `Listings with status ${listing.status} cannot be edited.`,
      });
      return;
    }
    if (listing.closingTime.getTime() <= Date.now()) {
      res.status(400).json({ success: false, message: 'Expired auctions cannot be edited.' });
      return;
    }

    const hasBids = listing.bidCount > 0;
    const lockedFields = ['category', 'condition', 'photos', 'startingPrice', 'minIncrement', 'closingTime'];
    if (hasBids && Object.keys(req.body).some((field) => lockedFields.includes(field))) {
      res.status(400).json({
        success: false,
        message: 'After bidding begins, only the title and description may be corrected.',
      });
      return;
    }

    const updates: Record<string, unknown> = {};
    const { title, description, category, condition, photos, startingPrice, minIncrement, closingTime } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120) {
        res.status(400).json({ success: false, message: 'Title must be between 3 and 120 characters.' });
        return;
      }
      updates.title = title.trim();
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 2000) {
        res.status(400).json({ success: false, message: 'Description must be between 10 and 2000 characters.' });
        return;
      }
      updates.description = description.trim();
    }

    const categories = ['CYCLES', 'CALCULATORS', 'TEXTBOOKS', 'ELECTRONICS', 'DORM_LIVING', 'LAB_EQUIPMENT', 'OTHER'];
    const conditions = ['BRAND_NEW', 'LIKE_NEW', 'GOOD', 'FAIR'];
    if (category !== undefined) {
      if (typeof category !== 'string' || !categories.includes(category)) {
        res.status(400).json({ success: false, message: 'A valid listing category is required.' });
        return;
      }
      updates.category = category;
    }
    if (condition !== undefined) {
      if (typeof condition !== 'string' || !conditions.includes(condition)) {
        res.status(400).json({ success: false, message: 'A valid listing condition is required.' });
        return;
      }
      updates.condition = condition;
    }
    if (photos !== undefined) {
      if (
        !Array.isArray(photos) ||
        photos.length > 10 ||
        photos.some((photo) => {
          if (typeof photo !== 'string' || photo.length > 2048) return true;
          if (photo.startsWith('/uploads/')) return false;
          try {
            const parsed = new URL(photo);
            return parsed.protocol !== 'http:' && parsed.protocol !== 'https:';
          } catch {
            return true;
          }
        })
      ) {
        res.status(400).json({ success: false, message: 'Photos must contain up to 10 valid image URLs.' });
        return;
      }
      updates.photos = photos;
    }

    if (listing.bidCount > 0) {
      // Text corrections are the only permitted changes after the first bid.
    } else {
      if (startingPrice !== undefined) {
        const priceRupees = Number(startingPrice);
        const pricePaise = rupeesToPaise(priceRupees);
        if (!Number.isFinite(priceRupees) || !Number.isSafeInteger(pricePaise) || pricePaise < 100) {
          res.status(400).json({ success: false, message: 'Starting price must be at least ₹1.00.' });
          return;
        }
        updates.startingPricePaise = pricePaise;
        updates.currentPricePaise = pricePaise;
      }
      if (minIncrement !== undefined) {
        const incrementRupees = Number(minIncrement);
        const incrementPaise = rupeesToPaise(incrementRupees);
        if (!Number.isFinite(incrementRupees) || !Number.isSafeInteger(incrementPaise) || incrementPaise <= 0) {
          res.status(400).json({ success: false, message: 'Minimum bid increment must be at least one paise.' });
          return;
        }
        updates.minIncrementPaise = incrementPaise;
      }

      if (startingPrice !== undefined || minIncrement !== undefined) {
        const activeAutoBids = await AutoBidSetting.find({
          listing: listing._id,
          isActive: true,
        }).select('maxAuthorizedPaise');
        const resultingStartingPrice = (updates.startingPricePaise as number | undefined) ?? listing.startingPricePaise;
        if (activeAutoBids.some((setting) => setting.maxAuthorizedPaise < resultingStartingPrice)) {
          res.status(400).json({
            success: false,
            message: 'Price changes cannot exceed an active automatic bidder’s authorized maximum.',
          });
          return;
        }
      }

      if (closingTime !== undefined) {
        const newClosingTime = new Date(closingTime);
        if (
          typeof closingTime !== 'string' ||
          Number.isNaN(newClosingTime.getTime()) ||
          newClosingTime.getTime() <= Date.now()
        ) {
          res.status(400).json({ success: false, message: 'Closing time must be a valid future date and time.' });
          return;
        }
        updates.closingTime = newClosingTime;
        updates.originalClosingTime = newClosingTime;
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: 'No editable listing changes were provided.' });
      return;
    }

    const updatedListing = await Listing.findOneAndUpdate(
      {
        _id: listing._id,
        seller: req.user._id,
        status: 'ACTIVE',
        bidCount: listing.bidCount,
        closingTime: { $gt: new Date() },
      },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updatedListing) {
      res.status(409).json({
        success: false,
        message: 'The auction changed while you were editing it. Reload and try again.',
      });
      return;
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const field of Object.keys(updates)) {
      before[field] = field in listing ? (listing as any)[field] : undefined;
      after[field] = (updatedListing as any)[field];
    }
    try {
      await AuditLog.create({
        event: 'LISTING_UPDATED',
        entityType: 'LISTING',
        entityId: updatedListing._id,
        actorId: req.user._id,
        details: { before, after },
        ipAddress: req.ip,
      });
    } catch (auditError) {
      console.error('[Listing Audit Log Error] Listing updated but audit record failed:', auditError);
    }

    res.json({
      success: true,
      message: 'Listing updated successfully.',
      listing: updatedListing,
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

    const categories = ['CYCLES', 'CALCULATORS', 'TEXTBOOKS', 'ELECTRONICS', 'DORM_LIVING', 'LAB_EQUIPMENT', 'OTHER'];
    const conditions = ['BRAND_NEW', 'LIKE_NEW', 'GOOD', 'FAIR'];
    const parseFilterPrice = (value: unknown): number | undefined | null => {
      if (value === undefined || value === '') return undefined;
      if (typeof value !== 'string') return null;
      if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value.trim())) return null;
      const rupees = Number(value);
      const paise = rupeesToPaise(rupees);
      return Number.isFinite(rupees) && rupees >= 0 && Number.isSafeInteger(paise) ? paise : null;
    };
    const minPricePaise = parseFilterPrice(minPrice);
    const maxPricePaise = parseFilterPrice(maxPrice);
    const pageNumber = Number(page);
    const pageSize = Number(limit);
    if (
      minPricePaise === null ||
      maxPricePaise === null ||
      (minPricePaise !== undefined && maxPricePaise !== undefined && minPricePaise > maxPricePaise) ||
      (category !== undefined && (typeof category !== 'string' || (category !== 'ALL' && !categories.includes(category)))) ||
      (condition !== undefined && (typeof condition !== 'string' || (condition !== 'ALL' && !conditions.includes(condition)))) ||
      (search !== undefined && (typeof search !== 'string' || search.length > 100)) ||
      (closingSoon !== undefined && closingSoon !== 'true' && closingSoon !== 'false') ||
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      res.status(400).json({ success: false, message: 'Invalid auction search filters.' });
      return;
    }

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
    if (minPricePaise !== undefined || maxPricePaise !== undefined) {
      filter.currentPricePaise = {};
      if (minPricePaise !== undefined) filter.currentPricePaise.$gte = minPricePaise;
      if (maxPricePaise !== undefined) filter.currentPricePaise.$lte = maxPricePaise;
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

    const skip = (pageNumber - 1) * pageSize;

    const [listings, totalCount] = await Promise.all([
      Listing.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize)
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
        page: pageNumber,
        limit: pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
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
