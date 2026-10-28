import { Router } from 'express';
import {
  getQuestions,
  askQuestion,
  answerQuestion,
} from '../controllers/questionController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/:id/questions', getQuestions);
router.post('/:id/questions', authenticate, askQuestion);
router.put('/questions/:questionId/answer', authenticate, answerQuestion);

export default router;
