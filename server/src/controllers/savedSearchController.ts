import { Response } from 'express';
import { SavedSearch } from '../models/SavedSearch.js';
import { AuthRequest } from '../middleware/auth.js';
import { rupeesToPaise } from '../utils/currency.js';

const parseOptionalPrice = (value: unknown): number | undefined | null => {
  if (value === undefined || value === null || value === '') return undefined;
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') return null;
  const priceText = String(value).trim();
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(priceText)) return null;
  const rupees = Number(priceText);
  const paise = rupeesToPaise(rupees);
  return Number.isFinite(rupees) && rupees >= 0 && Number.isSafeInteger(paise) ? paise : null;
};

export const createSavedSearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { query, category, minPriceRupees, maxPriceRupees, condition, closingSoon } = req.body;
    const validCategories = ['CYCLES', 'CALCULATORS', 'TEXTBOOKS', 'ELECTRONICS', 'DORM_LIVING', 'LAB_EQUIPMENT', 'OTHER'];
    const validConditions = ['BRAND_NEW', 'LIKE_NEW', 'GOOD', 'FAIR'];
    if (query !== undefined && (typeof query !== 'string' || query.trim().length > 100)) {
      res.status(400).json({ success: false, message: 'Search keywords must be 100 characters or fewer.' });
      return;
    }
    if (category !== undefined && category !== 'ALL' && !validCategories.includes(category)) {
      res.status(400).json({ success: false, message: 'Select a valid category.' });
      return;
    }
    if (condition !== undefined && condition !== 'ANY' && !validConditions.includes(condition)) {
      res.status(400).json({ success: false, message: 'Select a valid condition.' });
      return;
    }
    if (closingSoon !== undefined && typeof closingSoon !== 'boolean') {
      res.status(400).json({ success: false, message: 'Closing-soon filter must be a boolean.' });
      return;
    }

    const minPricePaise = parseOptionalPrice(minPriceRupees);
    const maxPricePaise = parseOptionalPrice(maxPriceRupees);
    if (minPricePaise === null || maxPricePaise === null) {
      res.status(400).json({ success: false, message: 'Price filters must be non-negative valid rupee amounts.' });
      return;
    }
    if (minPricePaise !== undefined && maxPricePaise !== undefined && minPricePaise > maxPricePaise) {
      res.status(400).json({ success: false, message: 'Minimum price cannot exceed maximum price.' });
      return;
    }

    const normalizedQuery = typeof query === 'string' ? query.trim() : '';
    const normalizedCategory = category && category !== 'ALL' ? category : undefined;
    const normalizedCondition = condition && condition !== 'ANY' ? condition : undefined;
    if (
      !normalizedQuery &&
      !normalizedCategory &&
      minPricePaise === undefined &&
      maxPricePaise === undefined &&
      !normalizedCondition &&
      !closingSoon
    ) {
      res.status(400).json({ success: false, message: 'Add at least one search filter before saving an alert.' });
      return;
    }

    const savedSearch = await SavedSearch.create({
      user: req.user._id,
      query: normalizedQuery || undefined,
      category: normalizedCategory,
      minPricePaise,
      maxPricePaise,
      condition: normalizedCondition,
      closingSoon: closingSoon === true,
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
