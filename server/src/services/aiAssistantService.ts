import crypto from 'crypto';
import { Listing } from '../models/Listing.js';
import { AIActionConsent } from '../models/AIActionConsent.js';
import { paiseToRupees, rupeesToPaise } from '../utils/currency.js';
import { ENV } from '../config/env.js';

export interface AIResponse {
  message: string;
  intent: 'SEARCH' | 'COMPARE' | 'SETUP_AUTO_BID' | 'HELP';
  engine: 'GEMINI_LLM' | 'CAMPUS_DETERMINISTIC';
  items?: any[];
  comparison?: {
    headers: string[];
    rows: any[];
  };
  consentRequest?: {
    consentToken: string;
    listingId: string;
    itemTitle: string;
    currentPriceRupees: number;
    maxAuthorizedRupees: number;
    durationExpiresAt: Date;
    terms: string;
  };
}

export const processAIRequest = async (
  prompt: string,
  userId?: string
): Promise<AIResponse> => {
  const query = prompt.toLowerCase().trim();

  // 1. Detect Intent: Auto-Bid Setup
  if (
    query.includes('auto bid') ||
    query.includes('autobid') ||
    query.includes('automatic bid') ||
    query.includes('set bid') ||
    query.includes('bid for me')
  ) {
    return handleAutoBidIntent(query, userId);
  }

  // 2. Detect Intent: Comparison
  if (query.includes('compare') || query.includes('difference between') || query.includes('which is better')) {
    return handleComparisonIntent(query);
  }

  // 3. Detect Intent: Search
  if (
    query.includes('find') ||
    query.includes('search') ||
    query.includes('looking for') ||
    query.includes('under') ||
    query.includes('cheap') ||
    query.includes('show me') ||
    query.includes('cycle') ||
    query.includes('calculator') ||
    query.includes('book') ||
    query.includes('laptop') ||
    query.includes('textbook')
  ) {
    return handleSearchIntent(query);
  }

  // 4. Default Intent: General Assistant & Rules Help
  return {
    intent: 'HELP',
    engine: 'CAMPUS_DETERMINISTIC',
    message: `Hello! I am your CampusBid AI Assistant. I can help you:
- **Search listings**: "Find me a cycle under ₹2,000" or "Find textbooks in good condition"
- **Compare items**: "Compare available calculators" or "Compare cycles"
- **Configure automatic bidding**: "Set up auto bid on scientific calculator up to ₹500"
- **Understand campus rules**: Ask about soft-close anti-sniping or physical handover verification.`,
  };
};

const handleSearchIntent = async (query: string): Promise<AIResponse> => {
  const filter: any = { status: 'ACTIVE' };

  // Category detection
  if (query.includes('cycle') || query.includes('bicycle') || query.includes('bike')) {
    filter.category = 'CYCLES';
  } else if (query.includes('calculator') || query.includes('casio')) {
    filter.category = 'CALCULATORS';
  } else if (query.includes('book') || query.includes('textbook') || query.includes('notes')) {
    filter.category = 'TEXTBOOKS';
  } else if (query.includes('laptop') || query.includes('electronics') || query.includes('monitor') || query.includes('mouse') || query.includes('keyboard')) {
    filter.category = 'ELECTRONICS';
  } else if (query.includes('dorm') || query.includes('mattress') || query.includes('chair') || query.includes('table')) {
    filter.category = 'DORM_LIVING';
  } else if (query.includes('lab') || query.includes('coat') || query.includes('kit')) {
    filter.category = 'LAB_EQUIPMENT';
  }

  // Condition detection
  if (query.includes('brand new') || query.includes('new')) {
    filter.condition = { $in: ['BRAND_NEW', 'LIKE_NEW'] };
  } else if (query.includes('good condition') || query.includes('good')) {
    filter.condition = { $in: ['BRAND_NEW', 'LIKE_NEW', 'GOOD'] };
  }

  // Price detection (e.g. under 2000 or under ₹2,000)
  const priceMatch = query.match(/(?:under|below|less than|up to|max)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)?)/i);
  if (priceMatch && priceMatch[1]) {
    const rawNum = priceMatch[1].replace(/,/g, '');
    const priceRupees = parseInt(rawNum, 10);
    if (!isNaN(priceRupees) && priceRupees > 0 && priceRupees < 100000) {
      filter.currentPricePaise = { $lte: rupeesToPaise(priceRupees) };
    }
  }

  const items = await Listing.find(filter)
    .sort({ currentPricePaise: 1 })
    .limit(6)
    .populate('seller', 'name department');

  if (items.length === 0) {
    return {
      intent: 'SEARCH',
      engine: 'CAMPUS_DETERMINISTIC',
      message: `I searched active campus auctions matching "${query}", but no items currently fit all criteria. Try broadening your price range or check back soon!`,
      items: [],
    };
  }

  const formattedItems = items.map((l) => ({
    id: l._id,
    title: l.title,
    category: l.category,
    condition: l.condition,
    currentPriceRupees: paiseToRupees(l.currentPricePaise),
    startingPriceRupees: paiseToRupees(l.startingPricePaise),
    bidCount: l.bidCount,
    closingTime: l.closingTime,
    photos: l.photos,
  }));

  return {
    intent: 'SEARCH',
    engine: 'CAMPUS_DETERMINISTIC',
    message: `Found ${items.length} active campus item${items.length > 1 ? 's' : ''} matching your criteria:`,
    items: formattedItems,
  };
};

const handleComparisonIntent = async (query: string): Promise<AIResponse> => {
  // Determine category for comparison
  let category: string = 'CALCULATORS';
  if (query.includes('cycle') || query.includes('bicycle')) category = 'CYCLES';
  if (query.includes('book') || query.includes('textbook')) category = 'TEXTBOOKS';
  if (query.includes('laptop') || query.includes('electronics')) category = 'ELECTRONICS';

  const items = await Listing.find({ category, status: 'ACTIVE' }).limit(4);

  if (items.length < 2) {
    // If fewer than 2 in category, fetch any active items
    const anyItems = await Listing.find({ status: 'ACTIVE' }).limit(3);
    if (anyItems.length === 0) {
      return {
        intent: 'COMPARE',
        engine: 'CAMPUS_DETERMINISTIC',
        message: 'No active marketplace items currently available to compare.',
      };
    }
  }

  const comparisonItems = items.length >= 2 ? items : await Listing.find({ status: 'ACTIVE' }).limit(3);

  const headers = ['Attribute', ...comparisonItems.map((i) => i.title)];
  const rows = [
    {
      label: 'Current Price',
      values: comparisonItems.map((i) => `₹${paiseToRupees(i.currentPricePaise)}`),
    },
    {
      label: 'Starting Price',
      values: comparisonItems.map((i) => `₹${paiseToRupees(i.startingPricePaise)}`),
    },
    {
      label: 'Condition',
      values: comparisonItems.map((i) => i.condition.replace(/_/g, ' ')),
    },
    {
      label: 'Active Bids',
      values: comparisonItems.map((i) => `${i.bidCount} bid${i.bidCount === 1 ? '' : 's'}`),
    },
    {
      label: 'Closes At',
      values: comparisonItems.map((i) => new Date(i.closingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    },
  ];

  return {
    intent: 'COMPARE',
    engine: 'CAMPUS_DETERMINISTIC',
    message: `Here is a side-by-side comparison of active ${category.toLowerCase().replace(/_/g, ' ')} currently on CampusBid:`,
    comparison: {
      headers,
      rows,
    },
  };
};

const handleAutoBidIntent = async (query: string, userId?: string): Promise<AIResponse> => {
  if (!userId) {
    return {
      intent: 'SETUP_AUTO_BID',
      engine: 'CAMPUS_DETERMINISTIC',
      message: 'You must be signed in with your student account before configuring automated proxy bidding.',
    };
  }

  // Look for target category or keyword
  let targetListing = null;
  if (query.includes('cycle') || query.includes('bicycle')) {
    targetListing = await Listing.findOne({ category: 'CYCLES', status: 'ACTIVE' });
  } else if (query.includes('calculator')) {
    targetListing = await Listing.findOne({ category: 'CALCULATORS', status: 'ACTIVE' });
  } else {
    // Pick the most popular active listing
    targetListing = await Listing.findOne({ status: 'ACTIVE' }).sort({ bidCount: -1 });
  }

  if (!targetListing) {
    return {
      intent: 'SETUP_AUTO_BID',
      engine: 'CAMPUS_DETERMINISTIC',
      message: 'No active listing currently found to configure automatic bidding for. Please browse auctions first.',
    };
  }

  // Extract amount
  const amountMatch = query.match(/(?:to|of|upto|up to|max)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)?)/i);
  let ceilingRupees = paiseToRupees(targetListing.currentPricePaise + targetListing.minIncrementPaise * 3);
  if (amountMatch && amountMatch[1]) {
    const parsed = parseInt(amountMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(parsed) && parsed > paiseToRupees(targetListing.currentPricePaise)) {
      ceilingRupees = parsed;
    }
  }

  // Generate explicit consent record
  const consentToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiration

  await AIActionConsent.create({
    user: userId,
    actionType: 'AUTO_BID_SETUP',
    listing: targetListing._id,
    maxAmountPaise: rupeesToPaise(ceilingRupees),
    consentToken,
    status: 'PENDING',
    expiresAt,
  });

  return {
    intent: 'SETUP_AUTO_BID',
    engine: 'CAMPUS_DETERMINISTIC',
    message: `I have prepared your automatic bidding configuration for **"${targetListing.title}"**. 
Per university fair bidding standards, please review the authorization terms and provide explicit student confirmation before activation.`,
    consentRequest: {
      consentToken,
      listingId: targetListing._id.toString(),
      itemTitle: targetListing.title,
      currentPriceRupees: paiseToRupees(targetListing.currentPricePaise),
      maxAuthorizedRupees: ceilingRupees,
      durationExpiresAt: targetListing.closingTime,
      terms: `You authorize the CampusBid engine to submit the minimum necessary increment on your behalf up to ₹${ceilingRupees}. You can revoke this ceiling anytime.`,
    },
  };
};
