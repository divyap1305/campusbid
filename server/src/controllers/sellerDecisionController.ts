import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import {
  approveWinningBid,
  rejectWinningBid,
  confirmHandover,
  recordFailedPickup,
} from '../services/closureService.js';
import { HandoverRecord } from '../models/HandoverRecord.js';
import { Listing } from '../models/Listing.js';

export const handleApproveBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id: listingId } = req.params;
    const { decisionNote } = req.body;

    const result = await approveWinningBid(listingId, req.user._id.toString(), decisionNote);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('[HandleApproveBid Error]', error);
    res.status(500).json({ success: false, message: 'Failed to approve winning bid.' });
  }
};

export const handleRejectBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id: listingId } = req.params;
    const { reason } = req.body;

    const result = await rejectWinningBid(listingId, req.user._id.toString(), reason);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('[HandleRejectBid Error]', error);
    res.status(500).json({ success: false, message: 'Failed to reject winning bid.' });
  }
};

export const handleConfirmHandover = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id: listingId } = req.params;
    const { verificationCode } = req.body;

    const result = await confirmHandover(listingId, req.user._id.toString(), verificationCode);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('[HandleConfirmHandover Error]', error);
    res.status(500).json({ success: false, message: 'Failed to confirm physical handover.' });
  }
};

export const handleRecordFailedPickup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id: listingId } = req.params;
    const { reason, notes } = req.body;

    if (!['BUYER_NO_SHOW', 'SELLER_NO_SHOW', 'ITEM_MISMATCH'].includes(reason)) {
      res.status(400).json({ success: false, message: 'Valid failure reason is required.' });
      return;
    }

    const result = await recordFailedPickup(listingId, req.user._id.toString(), reason, notes);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('[HandleRecordFailedPickup Error]', error);
    res.status(500).json({ success: false, message: 'Failed to record failed pickup outcome.' });
  }
};

export const getHandoverDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id: listingId } = req.params;
    const handover = await HandoverRecord.findOne({ listing: listingId })
      .populate('seller', 'name email department phoneNumber')
      .populate('buyer', 'name email department phoneNumber')
      .populate('listing');

    if (!handover) {
      res.status(404).json({ success: false, message: 'Handover record not found.' });
      return;
    }

    const isSeller = (handover.seller as any)._id.toString() === req.user._id.toString();
    const isBuyer = (handover.buyer as any)._id.toString() === req.user._id.toString();

    if (!isSeller && !isBuyer && req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    res.json({
      success: true,
      handover,
      role: isSeller ? 'SELLER' : 'BUYER',
    });
  } catch (error: any) {
    console.error('[GetHandoverDetails Error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve handover details.' });
  }
};
