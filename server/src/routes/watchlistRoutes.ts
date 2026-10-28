import { Router } from 'express';
import {
  addToWatchlist,
  getMyWatchlist,
  getWatchStatus,
  removeFromWatchlist,
} from '../controllers/watchlistController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', getMyWatchlist);
router.get('/:listingId', getWatchStatus);
router.post('/:listingId', addToWatchlist);
router.delete('/:listingId', removeFromWatchlist);

export default router;
