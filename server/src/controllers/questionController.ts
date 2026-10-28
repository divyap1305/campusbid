import { Request, Response } from 'express';
import { AuctionQuestion } from '../models/AuctionQuestion.js';
import { Listing } from '../models/Listing.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendNotification } from '../services/notificationService.js';
import { io } from '../index.js';
import { maskStudentName } from '../services/auctionService.js';

export const getQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: listingId } = req.params;
    if (!/^[a-f\d]{24}$/i.test(listingId)) {
      res.status(400).json({ success: false, message: 'Invalid listing ID.' });
      return;
    }

    const questions = await AuctionQuestion.find({ listing: listingId })
      .sort({ createdAt: -1 })
      .populate('asker', 'name department')
      .populate('answeredBy', 'name department');

    const formatted = questions.map((q) => ({
      id: q._id,
      question: q.question,
      answer: q.answer,
      createdAt: q.createdAt,
      answeredAt: q.answeredAt,
      answerEditedAt: q.answerEditedAt,
      askerName: q.asker ? maskStudentName((q.asker as any).name || 'Student') : 'Student',
      answeredByName: q.answeredBy ? maskStudentName((q.answeredBy as any).name || 'Seller') : null,
    }));

    res.json({
      success: true,
      questions: formatted,
    });
  } catch (error: any) {
    console.error('[GetQuestions Error]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch questions.' });
  }
};

export const askQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id: listingId } = req.params;
    const { question } = req.body;

    if (typeof question !== 'string' || !question.trim()) {
      res.status(400).json({ success: false, message: 'Question content cannot be empty.' });
      return;
    }

    if (question.trim().length > 500) {
      res.status(400).json({ success: false, message: 'Question cannot exceed 500 characters.' });
      return;
    }

    if (!/^[a-f\d]{24}$/i.test(listingId)) {
      res.status(400).json({ success: false, message: 'Invalid listing ID.' });
      return;
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      res.status(404).json({ success: false, message: 'Listing not found.' });
      return;
    }

    const newQuestion = await AuctionQuestion.create({
      listing: listingId,
      asker: req.user._id,
      question: question.trim(),
    });

    // Notify seller
    sendNotification({
      recipientId: listing.seller.toString(),
      type: 'QUESTION_ASKED',
      title: 'New Question on Your Auction',
      message: `A student asked: "${question.substring(0, 80)}..." on "${listing.title}".`,
      link: `/auctions/${listingId}`,
      metadata: { listingId, questionId: newQuestion._id },
    });

    // Broadcast real-time Q&A event
    if (io) {
      io.to(`auction:${listingId}`).emit('new_question', {
        id: newQuestion._id,
        listingId,
        question: newQuestion.question,
        askerName: maskStudentName(req.user.name),
        createdAt: newQuestion.createdAt,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Question posted publicly.',
      question: newQuestion,
    });
  } catch (error: any) {
    console.error('[AskQuestion Error]', error);
    res.status(500).json({ success: false, message: 'Failed to post question.' });
  }
};

export const answerQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { questionId } = req.params;
    const { answer } = req.body;

    if (typeof answer !== 'string' || !answer.trim()) {
      res.status(400).json({ success: false, message: 'Answer content cannot be empty.' });
      return;
    }

    if (answer.trim().length > 500) {
      res.status(400).json({ success: false, message: 'Answer cannot exceed 500 characters.' });
      return;
    }

    if (!/^[a-f\d]{24}$/i.test(questionId)) {
      res.status(400).json({ success: false, message: 'Invalid question ID.' });
      return;
    }

    const question = await AuctionQuestion.findById(questionId).populate('listing');
    if (!question) {
      res.status(404).json({ success: false, message: 'Question not found.' });
      return;
    }

    const listing = question.listing as any;
    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Only the seller can answer this question.' });
      return;
    }

    const isEditingAnswer = Boolean(question.answer);
    question.answer = answer.trim();
    question.answeredBy = req.user._id;
    question.answeredAt = new Date();
    question.answerEditedAt = isEditingAnswer ? question.answeredAt : undefined;
    await question.save();

    // Notify the asker for new answers and corrections.
    sendNotification({
      recipientId: question.asker.toString(),
      type: 'QUESTION_ANSWERED',
      title: isEditingAnswer ? 'Seller Updated Their Answer' : 'Seller Answered Your Question! 💬',
      message: isEditingAnswer
        ? `The seller updated their answer on "${listing.title}".`
        : `The seller replied to your question on "${listing.title}".`,
      link: `/auctions/${listing._id}`,
      metadata: { listingId: listing._id, questionId: question._id },
    });

    // Broadcast answer to auction room
    if (io) {
      io.to(`auction:${listing._id}`).emit('question_answered', {
        id: question._id,
        listingId: listing._id,
        answer: question.answer,
        answeredByName: maskStudentName(req.user.name),
        answeredAt: question.answeredAt,
        answerEditedAt: question.answerEditedAt,
      });
    }

    res.json({
      success: true,
      message: isEditingAnswer ? 'Answer updated publicly.' : 'Answer posted publicly.',
      question,
    });
  } catch (error: any) {
    console.error('[AnswerQuestion Error]', error);
    res.status(500).json({ success: false, message: 'Failed to answer question.' });
  }
};
