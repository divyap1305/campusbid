import { Router } from 'express';
import {
  handleApproveBid,
  handleRejectBid,
  handleConfirmHandover,
  handleRecordFailedPickup,
  getHandoverDetails,
} from '../controllers/sellerDecisionController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/:id/seller/approve', authenticate, handleApproveBid);
router.post('/:id/seller/reject', authenticate, handleRejectBid);
router.post('/:id/handover/confirm', authenticate, handleConfirmHandover);
router.post('/:id/handover/failed', authenticate, handleRecordFailedPickup);
router.get('/:id/handover', authenticate, getHandoverDetails);

export default router;
