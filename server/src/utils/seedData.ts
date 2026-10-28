import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { Bid } from '../models/Bid.js';
import { connectDB } from '../config/db.js';
import { rupeesToPaise } from './currency.js';
import bcrypt from 'bcryptjs';

export const seedDatabase = async () => {
  try {
    await connectDB();

    const count = await Listing.countDocuments();
    if (count > 0) {
      console.log(`[Seed] Database already contains ${count} listings. Skipping seed.`);
      return;
    }

    console.log('[Seed] Populating initial campus marketplace seed data...');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Secret123', salt);

    // 1. Create Verified Campus Students
    const priya = await User.create({
      name: 'Priya Sharma',
      email: 'test_seller@campus.edu',
      passwordHash,
      studentId: '2021CSB1045',
      department: 'Computer Science & Engineering',
      phoneNumber: '+91 98765 43210',
      isCampusVerified: true,
    });

    const aman = await User.create({
      name: 'Aman Verma',
      email: 'test_buyer1@campus.edu',
      passwordHash,
      studentId: '2023EEB1012',
      department: 'Electrical Engineering',
      phoneNumber: '+91 98111 22334',
      isCampusVerified: true,
    });

    const rohit = await User.create({
      name: 'Rohit K.',
      email: 'test_buyer2@campus.edu',
      passwordHash,
      studentId: '2024MEB1089',
      department: 'Mechanical Engineering',
      phoneNumber: '+91 98222 33445',
      isCampusVerified: true,
    });

    const now = Date.now();

    // 2. Sample Realistic Campus Auctions
    const sampleListings = [
      {
        title: 'Hero Sprint Pro 21-Speed Mountain Cycle',
        category: 'CYCLES' as const,
        description: 'Used for 2 years across north and south campus. Front suspension, Shimano gears, disc brakes. Free steel cable lock and front basket included. Pick up at Hostel 4.',
        condition: 'GOOD' as const,
        photos: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80'],
        startingPricePaise: rupeesToPaise(1200),
        minIncrementPaise: rupeesToPaise(50),
        currentPricePaise: rupeesToPaise(1450),
        seller: priya._id,
        status: 'ACTIVE' as const,
        closingTime: new Date(now + 3 * 3600 * 1000), // 3 hours
        originalClosingTime: new Date(now + 3 * 3600 * 1000),
        bidCount: 4,
        extensionCount: 0,
      },
      {
        title: 'Casio fx-991CW ClassWiz Scientific Calculator',
        category: 'CALCULATORS' as const,
        description: 'Purchased last semester for Engineering Math and Calculus. Authentic Casio QR verification intact. New battery installed. Hard protective slide case included.',
        condition: 'LIKE_NEW' as const,
        photos: ['https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80'],
        startingPricePaise: rupeesToPaise(400),
        minIncrementPaise: rupeesToPaise(25),
        currentPricePaise: rupeesToPaise(550),
        seller: priya._id,
        status: 'ACTIVE' as const,
        closingTime: new Date(now + 45 * 60 * 1000), // 45 minutes
        originalClosingTime: new Date(now + 45 * 60 * 1000),
        bidCount: 6,
        extensionCount: 0,
      },
      {
        title: 'Engineering Mechanics by Timoshenko & Young (5th Ed)',
        category: 'TEXTBOOKS' as const,
        description: 'Standard textbook for 1st/2nd year mechanics. No missing pages, minimal pencil markings in statics section. Pick up near Central Library.',
        condition: 'GOOD' as const,
        photos: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'],
        startingPricePaise: rupeesToPaise(250),
        minIncrementPaise: rupeesToPaise(20),
        currentPricePaise: rupeesToPaise(310),
        seller: priya._id,
        status: 'ACTIVE' as const,
        closingTime: new Date(now + 12 * 3600 * 1000), // 12 hours
        originalClosingTime: new Date(now + 12 * 3600 * 1000),
        bidCount: 3,
        extensionCount: 0,
      },
      {
        title: 'Dell 24-inch Full HD IPS Borderless Monitor',
        category: 'ELECTRONICS' as const,
        description: '75Hz refresh rate with AMD FreeSync. HDMI and power cable included. Zero dead pixels, used for coding and project demos. Comes in original box.',
        condition: 'LIKE_NEW' as const,
        photos: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80'],
        startingPricePaise: rupeesToPaise(3500),
        minIncrementPaise: rupeesToPaise(100),
        currentPricePaise: rupeesToPaise(4200),
        seller: priya._id,
        status: 'ACTIVE' as const,
        closingTime: new Date(now + 24 * 3600 * 1000), // 24 hours
        originalClosingTime: new Date(now + 24 * 3600 * 1000),
        bidCount: 5,
        extensionCount: 0,
      },
      {
        title: 'Rechargeable LED Study Table Lamp with Warm Light',
        category: 'DORM_LIVING' as const,
        description: '3 brightness levels, flexible 360-degree neck, USB-C fast charging. Perfect for late night hostel studying without disturbing roomies.',
        condition: 'BRAND_NEW' as const,
        photos: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80'],
        startingPricePaise: rupeesToPaise(200),
        minIncrementPaise: rupeesToPaise(10),
        currentPricePaise: rupeesToPaise(240),
        seller: priya._id,
        status: 'ACTIVE' as const,
        closingTime: new Date(now + 18 * 60 * 1000), // 18 minutes (Closing soon!)
        originalClosingTime: new Date(now + 18 * 60 * 1000),
        bidCount: 4,
        extensionCount: 0,
      },
    ];

    for (const data of sampleListings) {
      const listing = await Listing.create({
        ...data,
        leadingBidder: aman._id,
      });

      // Create initial bids
      await Bid.create({
        listing: listing._id,
        bidder: aman._id,
        amountPaise: listing.currentPricePaise,
        serverTimestamp: new Date(),
        status: 'ACCEPTED',
      });
    }

    console.log('[Seed] Successfully populated realistic campus auction listings!');
  } catch (err) {
    console.error('[Seed Error]', err);
  }
};
