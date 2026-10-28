import http from 'http';
import { AddressInfo } from 'net';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { ENV } from '../config/env.js';
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
    await connectDB('campusbid_test');

    // All cleanup is confined to the dedicated campusbid_test database.
    await Promise.all([
      User.deleteMany({}),
      Listing.deleteMany({}),
      Bid.deleteMany({}),
      AutoBidSetting.deleteMany({}),
      SavedSearch.deleteMany({}),
      Notification.deleteMany({}),
      HandoverRecord.deleteMany({}),
      AIActionConsent.deleteMany({}),
    ]);

    // Verify registration, login, listing API access, and public seller-data sanitization.
    const apiServer = http.createServer(createApp());
    await new Promise<void>((resolve, reject) => {
      apiServer.once('error', reject);
      apiServer.listen(0, '127.0.0.1', resolve);
    });
    const apiAddress = apiServer.address() as AddressInfo;
    const apiBase = `http://127.0.0.1:${apiAddress.port}/api`;
    interface ApiResult {
      success?: boolean;
      token?: string;
      user?: { id: string; email?: string };
      listing?: {
        _id?: string;
        id?: string;
        currentPricePaise?: number;
        seller?: { email?: string; phoneNumber?: string };
      };
      listings?: Array<{ _id?: string; id?: string }>;
      consentRequest?: { consentToken: string };
    }
    const apiRequest = async (
      endpoint: string,
      method = 'GET',
      payload?: Record<string, unknown>,
      token?: string
    ) => {
      const headers: Record<string, string> = {};
      if (payload) headers['Content-Type'] = 'application/json';
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${apiBase}${endpoint}`, {
        method,
        headers,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      return { status: response.status, body: await response.json() as ApiResult };
    };

    const testDomain = ENV.ALLOWED_EMAIL_DOMAINS[0];
    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const sellerEmail = `test_seller_${uniqueSuffix}@${testDomain}`;
    const buyerEmail = `test_buyer_${uniqueSuffix}@${testDomain}`;
    const password = 'DemoPassword123!';
    const sellerRegistration = await apiRequest('/auth/register', 'POST', {
      name: 'API Test Seller',
      email: sellerEmail,
      password,
      studentId: `SELLER_${uniqueSuffix}`,
      department: 'Engineering',
      phoneNumber: '1111111111',
    });
    const buyerRegistration = await apiRequest('/auth/register', 'POST', {
      name: 'API Test Buyer',
      email: buyerEmail,
      password,
      studentId: `BUYER_${uniqueSuffix}`,
      department: 'Science',
      phoneNumber: '2222222222',
    });
    const sellerLogin = await apiRequest('/auth/login', 'POST', { email: sellerEmail, password });
    const buyerLogin = await apiRequest('/auth/login', 'POST', { email: buyerEmail, password });
    assert(
      sellerRegistration.status === 201 &&
      buyerRegistration.status === 201 &&
      !!sellerLogin.body.token &&
      !!buyerLogin.body.token &&
      sellerLogin.body.user?.id !== buyerLogin.body.user?.id,
      'Register and log in as two distinct users through the API'
    );

    const invalidIncrementListing = await apiRequest('/auctions', 'POST', {
      title: 'Invalid increment test',
      category: 'CYCLES',
      description: 'Must not create a listing with a negative minimum increment.',
      condition: 'GOOD',
      startingPrice: 1000,
      minIncrement: -1,
      durationHours: 2,
    }, sellerLogin.body.token);
    const createdListing = await apiRequest('/auctions', 'POST', {
      title: '[TEST] API Demo Cycle',
      category: 'CYCLES',
      description: 'API workflow listing for end-to-end readiness tests.',
      condition: 'GOOD',
      startingPrice: 1000,
      minIncrement: 50,
      durationHours: 2,
      photos: [],
    }, sellerLogin.body.token);
    const createdListingId = createdListing.body.listing?._id;
    const publicListing = createdListingId
      ? await apiRequest(`/auctions/${createdListingId}`, 'GET', undefined, buyerLogin.body.token)
      : { status: 0, body: {} as ApiResult };
    const sellerListings = await apiRequest('/auctions/my/listings', 'GET', undefined, sellerLogin.body.token);
    const sellerListing = sellerListings.body.listings?.find((item) => item.id === createdListingId);
    const detailFromSellerListing = sellerListing?.id
      ? await apiRequest(`/auctions/${sellerListing.id}`, 'GET', undefined, sellerLogin.body.token)
      : { status: 0, body: {} as ApiResult };
    const invalidListingId = await apiRequest('/auctions/not-a-mongo-id');
    const missingListingId = new mongoose.Types.ObjectId().toString();
    const missingListing = await apiRequest(`/auctions/${missingListingId}`);
    assert(
      invalidIncrementListing.status === 400 &&
      createdListing.status === 201 &&
      publicListing.status === 200 &&
      sellerListings.status === 200 &&
      sellerListing?.id === createdListingId &&
      detailFromSellerListing.status === 200 &&
      detailFromSellerListing.body.listing?.id === createdListingId &&
      invalidListingId.status === 400 &&
      missingListing.status === 404 &&
      publicListing.body.listing?.currentPricePaise === rupeesToPaise(1000) &&
      !publicListing.body.listing?.seller?.email &&
      !publicListing.body.listing?.seller?.phoneNumber,
      'Seller listing exposes a usable ID, detail lookup succeeds, and invalid or missing IDs are handled'
    );

    const sellerBid = createdListingId
      ? await apiRequest(`/auctions/${createdListingId}/bid`, 'POST', { amountRupees: 1000 }, sellerLogin.body.token)
      : { status: 0, body: {} as ApiResult };
    const validBid = createdListingId
      ? await apiRequest(`/auctions/${createdListingId}/bid`, 'POST', { amountRupees: 1000 }, buyerLogin.body.token)
      : { status: 0, body: {} as ApiResult };
    const invalidIncrementBid = createdListingId
      ? await apiRequest(`/auctions/${createdListingId}/bid`, 'POST', { amountRupees: 1020 }, buyerLogin.body.token)
      : { status: 0, body: {} as ApiResult };
    const updatedPublicListing = createdListingId
      ? await apiRequest(`/auctions/${createdListingId}`, 'GET', undefined, buyerLogin.body.token)
      : { status: 0, body: {} as ApiResult };
    assert(
      sellerBid.status === 400 &&
      validBid.status === 200 &&
      invalidIncrementBid.status === 400 &&
      updatedPublicListing.body.listing?.currentPricePaise === rupeesToPaise(1000),
      'API rejects seller and below-increment bids and publishes the accepted highest bid'
    );
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

    const invalidBidResult = await placeBid(listing._id.toString(), buyer1._id.toString(), Number.NaN);
    assert(!invalidBidResult.success, 'Reject invalid non-integer bid amounts');

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
    assert(
      bidAt25s.wasExtended === true &&
      !!bidAt25s.bid &&
      !!bidAt25s.listing &&
      bidAt25s.listing.closingTime.getTime() - bidAt25s.bid.serverTimestamp.getTime() === 60000,
      'Anti-Sniping: Bid at 25s (<=30s) Extends Clock to 60s After the Accepted Bid'
    );

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

    const concurrentListing = await Listing.create({
      title: '[TEST] Concurrent Bid Validation',
      category: 'ELECTRONICS',
      description: 'Concurrency test listing.',
      condition: 'GOOD',
      photos: [],
      startingPricePaise: rupeesToPaise(1000),
      minIncrementPaise: rupeesToPaise(50),
      currentPricePaise: rupeesToPaise(1000),
      seller: seller._id,
      status: 'ACTIVE',
      closingTime: new Date(Date.now() + 3600000),
      originalClosingTime: new Date(Date.now() + 3600000),
      bidCount: 0,
      extensionCount: 0,
    });
    const concurrentResults = await Promise.all([
      placeBid(concurrentListing._id.toString(), buyer1._id.toString(), rupeesToPaise(1000)),
      placeBid(concurrentListing._id.toString(), buyer2._id.toString(), rupeesToPaise(1000)),
    ]);
    const concurrentListingAfterBids = await Listing.findById(concurrentListing._id);
    const concurrentBidCount = await Bid.countDocuments({ listing: concurrentListing._id });
    assert(
      concurrentResults.filter((result) => result.success).length === 1 &&
      concurrentListingAfterBids?.bidCount === 1 &&
      concurrentBidCount === 1,
      'Concurrent bids at the same price accept exactly one bid'
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

    const missingOtpResult = await confirmHandover(autoListing._id.toString(), buyer1._id.toString());
    const wrongOtpResult = await confirmHandover(autoListing._id.toString(), buyer1._id.toString(), '000000');
    const handoverBeforeValidOtp = await HandoverRecord.findOne({ listing: autoListing._id });
    assert(
      !missingOtpResult.success &&
      !wrongOtpResult.success &&
      handoverBeforeValidOtp?.status === 'PENDING_MEETING',
      'Handover confirmation rejects missing and invalid OTPs'
    );

    // TEST 12: Handover Confirmation with OTP
    const confirmResult = await confirmHandover(
      autoListing._id.toString(),
      seller._id.toString(),
      handoverRecord?.verificationCode
    );
    assert(confirmResult.success, 'Physical Campus Handover Confirmed with Valid OTP');

    const completedListing = await Listing.findById(autoListing._id);
    const completedHandover = await HandoverRecord.findOne({ listing: autoListing._id });
    assert(
      completedListing?.status === 'COMPLETED' &&
      completedHandover?.status === 'CONFIRMED' &&
      !!completedHandover.confirmedAt,
      'Valid OTP completes the matching listing and handover record'
    );

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

    const aiConsentRequest = await apiRequest('/ai/query', 'POST', {
      prompt: 'Set up auto bid on cycle up to 2000',
    }, buyerLogin.body.token);
    const consentToken = aiConsentRequest.body.consentRequest?.consentToken;
    const unauthorizedConsentExecution = consentToken
      ? await apiRequest('/ai/consent/execute', 'POST', { consentToken }, sellerLogin.body.token)
      : { status: 0, body: {} as ApiResult };
    const consentExecution = consentToken
      ? await apiRequest('/ai/consent/execute', 'POST', { consentToken }, buyerLogin.body.token)
      : { status: 0, body: {} as ApiResult };
    const executedConsent = consentToken
      ? await AIActionConsent.findOne({ consentToken })
      : null;
    assert(
      aiConsentRequest.body.success === true &&
      unauthorizedConsentExecution.status === 404 &&
      consentExecution.body.success === true &&
      executedConsent?.status === 'EXECUTED',
      'AI consent execution is explicit, succeeds for its owner, and rejects another user'
    );

    await new Promise<void>((resolve, reject) => {
      apiServer.close((error) => error ? reject(error) : resolve());
    });

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
