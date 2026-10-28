import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ENV } from '../config/env.js';
import { AuthRequest } from '../middleware/auth.js';

const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, ENV.JWT_SECRET, { expiresIn: '7d' });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, studentId, department, phoneNumber } = req.body;

    if (!name || !email || !password || !studentId) {
      res.status(400).json({ success: false, message: 'Name, email, password, and Student ID are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check campus eligibility policy
    const domain = normalizedEmail.split('@')[1];
    const isDomainAllowed = ENV.ALLOWED_EMAIL_DOMAINS.some(allowed => 
      domain === allowed || domain.endsWith(`.${allowed}`)
    );

    if (!isDomainAllowed) {
      res.status(400).json({
        success: false,
        message: `Only eligible campus students can register. Allowed domains: ${ENV.ALLOWED_EMAIL_DOMAINS.join(', ')}`,
      });
      return;
    }

    // Check existing email
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(400).json({ success: false, message: 'An account with this campus email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      studentId: studentId.trim(),
      department: department?.trim() || 'General Studies',
      phoneNumber: phoneNumber?.trim(),
      isCampusVerified: true,
      role: 'STUDENT',
    });

    const token = generateToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: 'Student account registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        department: user.department,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isCampusVerified: user.isCampusVerified,
      },
    });
  } catch (error: any) {
    console.error('[Register Error]', error);
    res.status(500).json({ success: false, message: 'Failed to create student account.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials. Please verify your email and password.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials. Please verify your email and password.' });
      return;
    }

    const token = generateToken(user._id.toString());

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        department: user.department,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isCampusVerified: user.isCampusVerified,
      },
    });
  } catch (error: any) {
    console.error('[Login Error]', error);
    res.status(500).json({ success: false, message: 'Authentication failed.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      studentId: req.user.studentId,
      department: req.user.department,
      phoneNumber: req.user.phoneNumber,
      role: req.user.role,
      isCampusVerified: req.user.isCampusVerified,
    },
  });
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { name, department, phoneNumber } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (name) user.name = name.trim();
    if (department) user.department = department.trim();
    if (phoneNumber) user.phoneNumber = phoneNumber.trim();

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        department: user.department,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isCampusVerified: user.isCampusVerified,
      },
    });
  } catch (error: any) {
    console.error('[UpdateProfile Error]', error);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
};
