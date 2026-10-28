import { Router } from 'express';
import { handleAIQuery, handleExecuteConsent } from '../controllers/aiAssistantController.js';
import { optionalAuth, authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/query', optionalAuth, handleAIQuery);
router.post('/consent/execute', authenticate, handleExecuteConsent);

export default router;
