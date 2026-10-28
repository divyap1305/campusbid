import { Router } from 'express';
import {
  createSavedSearch,
  getMySavedSearches,
  deleteSavedSearch,
} from '../controllers/savedSearchController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getMySavedSearches);
router.post('/', authenticate, createSavedSearch);
router.delete('/:id', authenticate, deleteSavedSearch);

export default router;
