import { Router } from 'express';
import {
  handlePlaceBid,
  configureAutoBid,
  revokeAutoBid,
  getMyAutoBid,
} from '../controllers/bidController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/:id/bid', authenticate, handlePlaceBid);
router.post('/:id/auto-bid', authenticate, configureAutoBid);
router.delete('/:id/auto-bid', authenticate, revokeAutoBid);
router.get('/:id/auto-bid', authenticate, getMyAutoBid);

export default router;
