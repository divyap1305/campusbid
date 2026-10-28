import { Router } from 'express';
import {
  createListing,
  relistListing,
  updateListing,
  cancelListing,
  getListings,
  getListingById,
  getMyListings,
  getMyBids,
} from '../controllers/listingController.js';
import { authenticate } from '../middleware/auth.js';
import { parsePhotoUpload } from '../middleware/photoUpload.js';
import { uploadPhoto } from '../controllers/photoController.js';

const router = Router();

router.get('/', getListings);
router.get('/my/listings', authenticate, getMyListings);
router.get('/my/bids', authenticate, getMyBids);
router.post('/photos', authenticate, parsePhotoUpload, uploadPhoto);
router.get('/:id', getListingById);

router.post('/', authenticate, createListing);
router.post('/:id/relist', authenticate, relistListing);
router.put('/:id', authenticate, updateListing);
router.delete('/:id', authenticate, cancelListing);

export default router;
