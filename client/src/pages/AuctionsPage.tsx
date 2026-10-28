import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Listing, ListingCategory, ListingCondition } from '../types/index.js';
import { api } from '../services/api.js';
import { AuctionCard } from '../components/AuctionCard.js';
import { CardSkeleton } from '../components/LoadingSkeleton.js';
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  Clock, 
  ArrowUpDown, 
  X, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  BookmarkPlus
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AuctionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filter states
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || 'ALL';
  const condition = searchParams.get('condition') || 'ALL';
  const closingSoon = searchParams.get('closingSoon') === 'true';
  const sortBy = searchParams.get('sortBy') || 'closing_soon';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const savedSearchParams = new URLSearchParams();
  if (search) savedSearchParams.set('query', search);
  if (category !== 'ALL') savedSearchParams.set('category', category);
  if (condition !== 'ALL') savedSearchParams.set('condition', condition);
  if (minPrice) savedSearchParams.set('minPrice', minPrice);
  if (maxPrice) savedSearchParams.set('maxPrice', maxPrice);
  if (closingSoon) savedSearchParams.set('closingSoon', 'true');
  const savedSearchUrl = `/saved-searches?${savedSearchParams.toString()}`;

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (search) queryParams.set('search', search);
        if (category && category !== 'ALL') queryParams.set('category', category);
        if (condition && condition !== 'ALL') queryParams.set('condition', condition);
        if (closingSoon) queryParams.set('closingSoon', 'true');
        if (minPrice) queryParams.set('minPrice', minPrice);
        if (maxPrice) queryParams.set('maxPrice', maxPrice);
        if (sortBy) queryParams.set('sortBy', sortBy);
        queryParams.set('page', page.toString());
        queryParams.set('limit', '9');

        const res = await api.get<{
          success: boolean;
          listings: Listing[];
          pagination: { totalPages: number; totalCount: number };
        }>(`/auctions?${queryParams.toString()}`);

        if (res.success) {
          setListings(res.listings);
          setTotalPages(res.pagination.totalPages);
          setTotalCount(res.pagination.totalCount);
        }
      } catch (err) {
        // Handle error
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [searchParams]);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'ALL' || value === 'false') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.set('page', '1'); // reset page on filter change
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    setSearchParams({});
  };

  const categories = [
    { id: 'ALL', label: 'All Items' },
    { id: 'CYCLES', label: 'Bicycles' },
    { id: 'CALCULATORS', label: 'Calculators' },
    { id: 'TEXTBOOKS', label: 'Textbooks' },
    { id: 'ELECTRONICS', label: 'Electronics' },
    { id: 'DORM_LIVING', label: 'Dorm & Living' },
    { id: 'LAB_EQUIPMENT', label: 'Lab Gear' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Campus Marketplace
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {totalCount} active items currently being auctioned across campus
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Save this search button */}
          <Link
            to={savedSearchUrl}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold border border-indigo-200/80 transition"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>Save Search Alert</span>
          </Link>

          {/* Sort Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={sortBy}
              onChange={(e) => updateParam('sortBy', e.target.value)}
              className="w-full sm:w-auto pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-600 transition"
            >
              <option value="closing_soon">Closing Soonest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="most_bids">Most Bids Placed</option>
            </select>
          </div>

          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="md:hidden p-2 rounded-xl border border-slate-200 bg-white text-slate-700"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => updateParam('category', cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              category === cat.id
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-100'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
        <button
          onClick={() => updateParam('closingSoon', closingSoon ? 'false' : 'true')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
            closingSoon
              ? 'bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-100'
              : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Closing Soon &le;2h</span>
        </button>
      </div>

      {/* Main Grid + Filter Sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left Filter Sidebar */}
        <aside
          className={`${
            mobileFilterOpen ? 'block' : 'hidden'
          } md:block md:col-span-1 space-y-6 bg-white p-5 rounded-2xl border border-slate-200/90 h-fit sticky top-24`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Filter Auctions
            </span>
            <button
              onClick={clearAllFilters}
              className="text-[11px] font-semibold text-indigo-600 hover:underline"
            >
              Reset
            </button>
          </div>

          {/* Condition Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Item Condition
            </label>
            <div className="space-y-1.5">
              {[
                { id: 'ALL', label: 'Any Condition' },
                { id: 'BRAND_NEW', label: 'Brand New' },
                { id: 'LIKE_NEW', label: 'Like New' },
                { id: 'GOOD', label: 'Good' },
                { id: 'FAIR', label: 'Fair' },
              ].map((c) => (
                <label key={c.id} className="flex items-center text-xs text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    name="condition"
                    checked={condition === c.id}
                    onChange={() => updateParam('condition', c.id)}
                    className="mr-2 text-indigo-600 focus:ring-indigo-500 rounded"
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Price Range (₹)
            </label>
            <div className="flex items-center gap-2 text-xs">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => updateParam('minPrice', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => updateParam('maxPrice', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* AI Search CTA */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 text-xs">
            <span className="font-bold text-indigo-900 block mb-1">Looking for something specific?</span>
            <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
              Ask our AI Assistant to search and compare genuine items for you.
            </p>
            <Link
              to="/assistant"
              className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              Try AI Assistant →
            </Link>
          </div>
        </aside>

        {/* Listings Grid */}
        <div className="md:col-span-3">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : listings.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-base">No auctions match your filters</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try adjusting your search query, price range, or category filter.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Clear Filters
                </button>
                <Link
                  to={savedSearchUrl}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  Save As Alert
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {listings.map((listing) => (
                  <AuctionCard key={listing.id} listing={listing} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => updateParam('page', (page - 1).toString())}
                    className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-3 py-1.5 bg-white border border-slate-200 rounded-xl">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => updateParam('page', (page + 1).toString())}
                    className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
