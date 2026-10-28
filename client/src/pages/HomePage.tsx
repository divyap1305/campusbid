import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Listing } from '../types/index.js';
import { api } from '../services/api.js';
import { AuctionCard } from '../components/AuctionCard.js';
import { CardSkeleton } from '../components/LoadingSkeleton.js';
import { 
  Gavel, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  Bike, 
  Calculator, 
  BookOpen, 
  Laptop, 
  Home, 
  Layers,
  CheckCircle2,
  Bot
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [activeListings, setActiveListings] = useState<Listing[]>([]);
  const [closingSoonListings, setClosingSoonListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activeRes, closingRes] = await Promise.all([
          api.get<{ success: boolean; listings: Listing[] }>('/auctions?limit=6&sortBy=price_asc'),
          api.get<{ success: boolean; listings: Listing[] }>('/auctions?limit=4&sortBy=closing_soon'),
        ]);

        if (activeRes.success) setActiveListings(activeRes.listings);
        if (closingRes.success) setClosingSoonListings(closingRes.listings);
      } catch (err) {
        // Handle error gracefully
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const categories = [
    { id: 'CYCLES', name: 'Bicycles & Mobility', count: 'Cycles & Scooters', icon: Bike, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { id: 'CALCULATORS', name: 'Calculators & Math', count: 'fx-991EX, CW & more', icon: Calculator, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { id: 'TEXTBOOKS', name: 'Textbooks & Notes', count: 'Engineering, Science', icon: BookOpen, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { id: 'ELECTRONICS', name: 'Laptops & Monitors', count: 'Tech accessories', icon: Laptop, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { id: 'DORM_LIVING', name: 'Dorm & Living', count: 'Lamps, Tables, Fans', icon: Home, color: 'text-rose-600 bg-rose-50 border-rose-100' },
    { id: 'LAB_EQUIPMENT', name: 'Lab Gear & Kits', count: 'Coats, Drafters, Tools', icon: Layers, color: 'text-purple-600 bg-purple-50 border-purple-100' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 border-b border-slate-200 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Zero chat group chaos. 100% fair and transparent campus bidding.</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            Give Every Campus Item <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">
              Its Next Owner.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Graduating seniors pass down cycles, scientific calculators, textbooks, and monitors to juniors through fair price discovery, soft-close anti-sniping, and verified physical handover.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              to="/auctions"
              className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition flex items-center gap-2"
            >
              <span>Explore Active Auctions</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/sell"
              className="px-6 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold text-sm hover:bg-slate-50 transition shadow-sm"
            >
              Post an Item for Auction
            </Link>
            <Link
              to="/assistant"
              className="px-4 py-3.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold text-sm hover:bg-indigo-100 transition flex items-center gap-1.5"
            >
              <Bot className="w-4 h-4" />
              <span>Ask AI Assistant</span>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-14 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-left">
            <div className="p-2 border-r border-slate-100 last:border-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Anti-Sniping</span>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">30s Soft Close</div>
              <p className="text-[11px] text-slate-500">Auto +60s extension</p>
            </div>
            <div className="p-2 border-r border-slate-100 last:border-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Precision</span>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">Integer Paise</div>
              <p className="text-[11px] text-slate-500">Zero float roundoffs</p>
            </div>
            <div className="p-2 border-r border-slate-100 last:border-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Smart Bidding</span>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">Proxy Auto-Bid</div>
              <p className="text-[11px] text-slate-500">Bids only what's needed</p>
            </div>
            <div className="p-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Campus Trust</span>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">6-Digit OTP</div>
              <p className="text-[11px] text-slate-500">Verified handover</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category Carousel / Grid */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Popular Campus Categories
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Find essential items circulating between academic years
            </p>
          </div>
          <Link
            to="/auctions"
            className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>All items</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                to={`/auctions?category=${cat.id}`}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all group flex flex-col items-center text-center"
              >
                <div className={`p-3 rounded-2xl border mb-3 group-hover:scale-110 transition-transform ${cat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-xs sm:text-sm leading-snug">{cat.name}</h3>
                <span className="text-[10px] text-slate-400 mt-1">{cat.count}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Closing Soon Section */}
      {closingSoonListings.length > 0 && (
        <section className="py-8 bg-indigo-50/40 border-y border-indigo-100/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
                  <Clock className="w-5 h-5 animate-pulse" />
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Auctions Ending Soon — Anti-Sniping Active
                  </h2>
                  <p className="text-xs text-slate-500">
                    Bids placed in the final 30 seconds automatically extend the auction by 60 seconds.
                  </p>
                </div>
              </div>
              <Link to="/auctions?closingSoon=true" className="text-xs font-semibold text-indigo-600 hover:underline">
                View all ending soon →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {closingSoonListings.map((listing) => (
                <AuctionCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Active Auctions */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Featured Active Auctions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Live transparent bids from registered campus students
            </p>
          </div>
          <Link
            to="/auctions"
            className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Browse all auctions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : activeListings.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
            <Gavel className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">No active auctions right now</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Be the first student to publish an auction for your cycle, notes, or dorm essentials!
            </p>
            <Link
              to="/sell"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
            >
              Post an Item Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeListings.map((listing) => (
              <AuctionCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {/* How Campus Bidding Works Walkthrough */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-indigo-600 text-xs font-bold uppercase tracking-wider">Simple & Transparent</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              How Campus Bidding Works
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              Designed specifically to eliminate unfair bidding, last-second bot snipes, and ghosting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-start">
              <span className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center mb-4">
                1
              </span>
              <h3 className="font-bold text-slate-900 text-sm">Post with Transparent Terms</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Sellers specify starting price, min increment, condition, and duration. Price rules are locked once bids start.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-start">
              <span className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center mb-4">
                2
              </span>
              <h3 className="font-bold text-slate-900 text-sm">Fair Real-Time Bidding</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Place bids manually or set a proxy maximum ceiling. Our backend places the minimum increment needed.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-start">
              <span className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center mb-4">
                3
              </span>
              <h3 className="font-bold text-slate-900 text-sm">Anti-Sniping Soft Close</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Any bid placed in the final 30s auto-extends the auction by 60s, giving all genuine buyers a fair chance.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-start">
              <span className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center mb-4">
                4
              </span>
              <h3 className="font-bold text-slate-900 text-sm">Verified Campus Handover</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Seller approves closing price. Buyer and seller meet in student center and verify with a secure 6-digit OTP code.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
