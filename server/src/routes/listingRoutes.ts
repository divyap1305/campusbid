import { Router } from 'express';
import {
  createListing,
  updateListing,
  cancelListing,
  getListings,
  getListingById,
  getMyListings,
  getMyBids,
} from '../controllers/listingController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', getListings);
router.get('/my/listings', authenticate, getMyListings);
router.get('/my/bids', authenticate, getMyBids);
router.get('/:id', getListingById);

router.post('/', authenticate, createListing);
router.put('/:id', authenticate, updateListing);
router.delete('/:id', authenticate, cancelListing);

export default router;
