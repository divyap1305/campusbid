import { Response } from 'express';
import { SavedSearch } from '../models/SavedSearch.js';
import { AuthRequest } from '../middleware/auth.js';
import { rupeesToPaise } from '../utils/currency.js';

export const createSavedSearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { query, category, maxPriceRupees, condition } = req.body;

    const maxPricePaise = maxPriceRupees ? rupeesToPaise(Number(maxPriceRupees)) : undefined;

    const savedSearch = await SavedSearch.create({
      user: req.user._id,
      query: query?.trim(),
      category: category && category !== 'ALL' ? category : undefined,
      maxPricePaise,
      condition: condition && condition !== 'ANY' ? condition : undefined,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Saved search created! You will receive instant notifications when matching items appear.',
      savedSearch,
    });
  } catch (error: any) {
    console.error('[CreateSavedSearch Error]', error);
    res.status(500).json({ success: false, message: 'Failed to create saved search.' });
  }
};

export const getMySavedSearches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const savedSearches = await SavedSearch.find({ user: req.user._id, isActive: true }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      savedSearches,
    });
  } catch (error: any) {
    console.error('[GetMySavedSearches Error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve saved searches.' });
  }
};

export const deleteSavedSearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const deleted = await SavedSearch.findOneAndDelete({ _id: id, user: req.user._id });

    if (!deleted) {
      res.status(404).json({ success: false, message: 'Saved search not found.' });
      return;
    }

    res.json({
      success: true,
      message: 'Saved search alert removed.',
    });
  } catch (error: any) {
    console.error('[DeleteSavedSearch Error]', error);
    res.status(500).json({ success: false, message: 'Failed to delete saved search.' });
  }
};
