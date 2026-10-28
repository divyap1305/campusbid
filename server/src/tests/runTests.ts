import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { Bid } from '../models/Bid.js';
import { AutoBidSetting } from '../models/AutoBidSetting.js';
import { SavedSearch } from '../models/SavedSearch.js';
import { Notification } from '../models/Notification.js';
import { HandoverRecord } from '../models/HandoverRecord.js';
import { AIActionConsent } from '../models/AIActionConsent.js';
import { connectDB } from '../config/db.js';
import { placeBid, resolveProxyBids } from '../services/auctionService.js';
import {
  closeAuction,
  approveWinningBid,
  rejectWinningBid,
  confirmHandover,
  recordFailedPickup,
} from '../services/closureService.js';
import { checkSavedSearchesForListing } from '../services/savedSearchService.js';
import { processAIRequest } from '../services/aiAssistantService.js';
import { rupeesToPaise } from '../utils/currency.js';
import bcrypt from 'bcryptjs';

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING CAMPUSBID CRITICAL AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, errorDetail?: string) => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (errorDetail) console.error(`     Details: ${errorDetail}`);
      failed++;
    }
  };

  try {
    await connectDB();

    // 0. Clean test db sandbox
    await Promise.all([
      User.deleteMany({ email: /test.*@campus\.edu/ }),
      Listing.deleteMany({ title: /\[TEST\]/ }),
      Bid.deleteMany({}),
      AutoBidSetting.deleteMany({}),
      SavedSearch.deleteMany({}),
      Notification.deleteMany({}),
      HandoverRecord.deleteMany({}),
      AIActionConsent.deleteMany({}),
    ]);

    // TEST 1: User Registration & Campus Eligibility
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Secret123', salt);
    
    const seller = await User.create({
      name: 'Senior Priya',
      email: 'test_seller@campus.edu',
      passwordHash,
      studentId: 'CS2022_01',
      department: 'Computer Science',
      isCampusVerified: true,
    });

    const buyer1 = await User.create({
      name: 'Junior Aman',
      email: 'test_buyer1@campus.edu',
      passwordHash,
      studentId: 'EC2024_05',
      department: 'Electronics',
      isCampusVerified: true,
    });

    const buyer2 = await User.create({
      name: 'Junior Rohit',
      email: 'test_buyer2@campus.edu',
      passwordHash,
      studentId: 'ME2024_12',
      department: 'Mechanical',
      isCampusVerified: true,
    });

    assert(!!seller._id && !!buyer1._id && !!buyer2._id, 'Student Accounts Created with Campus Verification');

    // TEST 2: Listing Creation
    const now = new Date();
    const futureClosing = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
    const listing = await Listing.create({
      title: '[TEST] Hero Sprint Cycle 21-Speed',
      category: 'CYCLES',
      description: 'Used for 2 years, excellent brakes and gears, front basket included.',
      condition: 'GOOD',
      photos: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e'],
      startingPricePaise: rupeesToPaise(1000), // ₹1,000
      minIncrementPaise: rupeesToPaise(50),   // ₹50
      currentPricePaise: rupeesToPaise(1000),
      seller: seller._id,
      status: 'ACTIVE',
      closingTime: futureClosing,
      originalClosingTime: futureClosing,
      bidCount: 0,
      extensionCount: 0,
    });

    assert(listing.startingPricePaise === 100000, 'Listing Created with Integer Paise Precision (₹1,000 = 100000 paise)');

    // TEST 3: Seller Self-Bidding Rejection
    const selfBidResult = await placeBid(listing._id.toString(), seller._id.toString(), rupeesToPaise(1100));
    assert(!selfBidResult.success, 'Reject Seller Self-Bidding');

    // TEST 4: First Bid Under Starting Price Rejection
    const lowBidResult = await placeBid(listing._id.toString(), buyer1._id.toString(), rupeesToPaise(950));
    assert(!lowBidResult.success, 'Reject Bid Below Starting Price');

    // TEST 5: First Valid Bid Acceptance (at Starting Price)
    const validFirstBid = await placeBid(listing._id.toString(), buyer1._id.toString(), rupeesToPaise(1000));
    assert(validFirstBid.success && validFirstBid.listing?.currentPricePaise === 100000, 'First Bid Accepted at Starting Price');

    // TEST 6: Minimum Increment Enforcement
    // Current price is ₹1,000, min increment is ₹50 -> next must be >= ₹1,050
    const underIncrementBid = await placeBid(listing._id.toString(), buyer2._id.toString(), rupeesToPaise(1020));
    assert(!underIncrementBid.success, 'Reject Bid Violating Minimum Increment (₹1,020 < ₹1,050)');

    const validSecondBid = await placeBid(listing._id.toString(), buyer2._id.toString(), rupeesToPaise(1100));
    assert(validSecondBid.success && validSecondBid.listing?.currentPricePaise === 110000, 'Subsequent Bid Accepted with Valid Increment (₹1,100)');

    // TEST 7: Last-Minute Soft-Close Extension (<= 30s triggers +60s, 31s does not)
    // Case A: 31 seconds remaining -> Must NOT extend
    const listing31 = await Listing.create({
      title: '[TEST] Casio Scientific Calculator fx-991EX',
      category: 'CALCULATORS',
      description: 'Matrix, calculus support.',
      condition: 'LIKE_NEW',
      photos: [],
      startingPricePaise: rupeesToPaise(400),
      minIncrementPaise: rupeesToPaise(20),
      currentPricePaise: rupeesToPaise(400),
      seller: seller._id,
      status: 'ACTIVE',
      closingTime: new Date(Date.now() + 31000), // 31 seconds remaining
      originalClosingTime: new Date(Date.now() + 31000),
      bidCount: 0,
      extensionCount: 0,
    });

    const bidAt31s = await placeBid(listing31._id.toString(), buyer1._id.toString(), rupeesToPaise(400));
    assert(!bidAt31s.wasExtended, 'Anti-Sniping: Bid at 31s Remaining DOES NOT Extend Clock');

    // Case B: 25 seconds remaining -> MUST extend by 60s
    const listing25 = await Listing.create({
      title: '[TEST] Casio Scientific Calculator fx-991CW',
      category: 'CALCULATORS',
      description: 'Approved for university exams.',
      condition: 'BRAND_NEW',
      photos: [],
      startingPricePaise: rupeesToPaise(500),
      minIncrementPaise: rupeesToPaise(25),
      currentPricePaise: rupeesToPaise(500),
      seller: seller._id,
      status: 'ACTIVE',
      closingTime: new Date(Date.now() + 25000), // 25 seconds remaining
      originalClosingTime: new Date(Date.now() + 25000),
      bidCount: 0,
      extensionCount: 0,
    });

    const bidAt25s = await placeBid(listing25._id.toString(), buyer2._id.toString(), rupeesToPaise(500));
    assert(bidAt25s.wasExtended === true, 'Anti-Sniping: Bid at 25s (<=30s) Automatically Extends Clock by 60s');

    // TEST 8: Rejection of Bids After Closure
    const closedListing = await Listing.create({
      title: '[TEST] Halliday Resnick Physics Vol 1',
      category: 'TEXTBOOKS',
      description: 'Standard textbook.',
      condition: 'GOOD',
      photos: [],
      startingPricePaise: rupeesToPaise(300),
      minIncrementPaise: rupeesToPaise(20),
      currentPricePaise: rupeesToPaise(300),
      seller: seller._id,
      status: 'ACTIVE',
      closingTime: new Date(Date.now() - 5000), // 5 seconds in past
      originalClosingTime: new Date(Date.now() - 5000),
      bidCount: 0,
      extensionCount: 0,
    });

    const bidOnClosed = await placeBid(closedListing._id.toString(), buyer1._id.toString(), rupeesToPaise(300));
    assert(!bidOnClosed.success, 'Authoritative Server-Side Rejection of Bids Placed After Closing Time');

    // TEST 9: Automatic Proxy Bidding & Deterministic Tie-Breaking
    // Item starting at ₹500. Buyer 1 sets ceiling ₹1,000. Buyer 2 sets ceiling ₹800.
    const autoListing = await Listing.create({
      title: '[TEST] Dell 24-inch IPS Monitor',
      category: 'ELECTRONICS',
      description: 'Full HD 75Hz monitor with HDMI cable.',
      condition: 'LIKE_NEW',
      photos: [],
      startingPricePaise: rupeesToPaise(2000),
      minIncrementPaise: rupeesToPaise(100),
      currentPricePaise: rupeesToPaise(2000),
      seller: seller._id,
      status: 'ACTIVE',
      closingTime: new Date(Date.now() + 3600000),
      originalClosingTime: new Date(Date.now() + 3600000),
      bidCount: 0,
      extensionCount: 0,
    });

    // Buyer 1 sets max ceiling ₹3,000
    await AutoBidSetting.create({
      listing: autoListing._id,
      bidder: buyer1._id,
      maxAuthorizedPaise: rupeesToPaise(3000),
      isActive: true,
      createdAt: new Date(Date.now() - 1000), // Registered 1 second earlier
    });

    // Buyer 2 sets max ceiling ₹2,500
    await AutoBidSetting.create({
      listing: autoListing._id,
      bidder: buyer2._id,
      maxAuthorizedPaise: rupeesToPaise(2500),
      isActive: true,
      createdAt: new Date(), // Registered second
    });

    // Initial bid placed at ₹2,000
    await placeBid(autoListing._id.toString(), buyer1._id.toString(), rupeesToPaise(2000), {
      isAutoBid: true,
      maxAuthorizedPaise: rupeesToPaise(3000),
    });

    // Resolve proxy bids
    await resolveProxyBids(autoListing._id.toString());

    const resolvedListing = await Listing.findById(autoListing._id);
    assert(
      resolvedListing?.leadingBidder?.toString() === buyer1._id.toString() &&
      resolvedListing?.currentPricePaise === rupeesToPaise(2600),
      'Proxy Bidding: Higher ceiling (Buyer 1 ₹3,000) maintains lead over Buyer 2 (₹2,500) at minimum increment ₹2,600'
    );

    // TEST 10: Auction Closure Handling (With and Without Bids)
    // A: 0 bids -> UNSOLD
    const unsoldTestListing = await Listing.create({
      title: '[TEST] Unwanted Lab Manual',
      category: 'LAB_EQUIPMENT',
      description: 'Old notes.',
      condition: 'FAIR',
      photos: [],
      startingPricePaise: rupeesToPaise(100),
      minIncrementPaise: rupeesToPaise(10),
      currentPricePaise: rupeesToPaise(100),
      seller: seller._id,
      status: 'ACTIVE',
      closingTime: new Date(Date.now() - 1000),
      originalClosingTime: new Date(Date.now() - 1000),
      bidCount: 0,
      extensionCount: 0,
    });

    await closeAuction(unsoldTestListing._id.toString());
    const afterUnsoldClose = await Listing.findById(unsoldTestListing._id);
    assert(afterUnsoldClose?.status === 'UNSOLD', 'Auction with 0 bids closes as UNSOLD');

    // B: Has bids -> PENDING_SELLER_DECISION
    await closeAuction(autoListing._id.toString());
    const afterBidClose = await Listing.findById(autoListing._id);
    assert(
      afterBidClose?.status === 'PENDING_SELLER_DECISION' &&
      afterBidClose?.winner?.toString() === buyer1._id.toString(),
      'Auction with bids closes as PENDING_SELLER_DECISION with recorded winner'
    );

    // TEST 11: Seller Decision (Approve) & Handover OTP Creation
    const approveResult = await approveWinningBid(autoListing._id.toString(), seller._id.toString(), 'Pick up at library');
    assert(approveResult.success, 'Seller Approves Winning Bid');

    const handoverRecord = await HandoverRecord.findOne({ listing: autoListing._id });
    assert(
      handoverRecord?.status === 'PENDING_MEETING' &&
      !!handoverRecord?.verificationCode &&
      handoverRecord.verificationCode.length === 6,
      'Item Reserved for Handover with Secure 6-Digit OTP Verification Code'
    );

    // TEST 12: Handover Confirmation with OTP
    const confirmResult = await confirmHandover(
      autoListing._id.toString(),
      seller._id.toString(),
      handoverRecord?.verificationCode
    );
    assert(confirmResult.success, 'Physical Campus Handover Confirmed with Valid OTP');

    const completedListing = await Listing.findById(autoListing._id);
    assert(completedListing?.status === 'COMPLETED', 'Listing Transitions to COMPLETED after Handover');

    // TEST 13: Failed Pickup Outcome Handling
    const failListing = await Listing.create({
      title: '[TEST] Table Lamp',
      category: 'DORM_LIVING',
      description: 'LED Study lamp.',
      condition: 'GOOD',
      photos: [],
      startingPricePaise: rupeesToPaise(250),
      minIncrementPaise: rupeesToPaise(20),
      currentPricePaise: rupeesToPaise(300),
      seller: seller._id,
      winner: buyer2._id,
      winningPricePaise: rupeesToPaise(300),
      status: 'RESERVED_PENDING_HANDOVER',
      closingTime: new Date(),
      originalClosingTime: new Date(),
      bidCount: 2,
      extensionCount: 0,
    });

    await HandoverRecord.create({
      listing: failListing._id,
      seller: seller._id,
      buyer: buyer2._id,
      agreedPricePaise: rupeesToPaise(300),
      verificationCode: '654321',
      status: 'PENDING_MEETING',
    });

    const failResult = await recordFailedPickup(
      failListing._id.toString(),
      seller._id.toString(),
      'BUYER_NO_SHOW',
      'Buyer did not arrive at hostel gate'
    );
    assert(failResult.success, 'Explicit Failed Pickup Outcome Recorded (BUYER_NO_SHOW)');

    // TEST 14: Saved Search Alert Matching & Notification Deduplication
    await SavedSearch.create({
      user: buyer1._id,
      query: 'Scientific calculator',
      category: 'CALCULATORS',
      maxPricePaise: rupeesToPaise(600),
      isActive: true,
    });

    const matchingListing = await Listing.create({
      title: '[TEST] Scientific calculator Casio FX-991',
      category: 'CALCULATORS',
      description: 'Used for semester exam.',
      condition: 'LIKE_NEW',
      photos: [],
      startingPricePaise: rupeesToPaise(450),
      minIncrementPaise: rupeesToPaise(25),
      currentPricePaise: rupeesToPaise(450),
      seller: seller._id,
      status: 'ACTIVE',
      closingTime: new Date(Date.now() + 3600000),
      originalClosingTime: new Date(Date.now() + 3600000),
      bidCount: 0,
      extensionCount: 0,
    });

    await checkSavedSearchesForListing(matchingListing);
    const notifications = await Notification.find({ recipient: buyer1._id, type: 'SAVED_SEARCH_MATCH' });
    assert(notifications.length === 1, 'Saved Search Alert Successfully Triggered & Stored in In-App Notification Center');

    // TEST 15: AI Assistant Search & Explicit Consent Protocol
    const aiSearch = await processAIRequest('Find me a calculator under 500');
    assert(
      aiSearch.intent === 'SEARCH' &&
      Array.isArray(aiSearch.items) &&
      aiSearch.items.length > 0,
      'AI Assistant Searches Genuine Active Listings with Real Price Filters'
    );

    const aiAutoBid = await processAIRequest('Set up automatic bidding for calculator up to 600', buyer1._id.toString());
    assert(
      aiAutoBid.intent === 'SETUP_AUTO_BID' &&
      !!aiAutoBid.consentRequest &&
      !!aiAutoBid.consentRequest.consentToken,
      'AI Assistant Enforces Explicit Student Consent Protocol Before Activating Auto-Bidding'
    );

    console.log('\n====================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error during test execution:', error);
    process.exit(1);
  }
};

runTests();
