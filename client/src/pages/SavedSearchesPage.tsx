import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SavedSearch } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { formatRupees, getCategoryLabel } from '../utils/formatters.js';
import { Bookmark, Plus, Trash2, Bell, Sparkles, CheckCircle2 } from 'lucide-react';

export const SavedSearchesPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [searchParams] = useSearchParams();

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form states
  const [query, setQuery] = useState<string>(searchParams.get('query') || '');
  const [category, setCategory] = useState<string>(searchParams.get('category') || 'ALL');
  const [minPriceRupees, setMinPriceRupees] = useState<string>(searchParams.get('minPrice') || '');
  const [maxPriceRupees, setMaxPriceRupees] = useState<string>(searchParams.get('maxPrice') || '');
  const [condition, setCondition] = useState<string>(() => {
    const initialCondition = searchParams.get('condition');
    return !initialCondition || initialCondition === 'ALL' ? 'ANY' : initialCondition;
  });
  const [closingSoon, setClosingSoon] = useState<boolean>(searchParams.get('closingSoon') === 'true');
  const [formLoading, setFormLoading] = useState<boolean>(false);

  const fetchSavedSearches = async () => {
    try {
      const res = await api.get<{ success: boolean; savedSearches: SavedSearch[] }>('/saved-searches');
      if (res.success) {
        setSavedSearches(res.savedSearches);
      }
    } catch (err) {
      // error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSavedSearches();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleCreateSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to save searches.', 'warning');
      return;
    }

    const minPrice = minPriceRupees === '' ? undefined : Number(minPriceRupees);
    const maxPrice = maxPriceRupees === '' ? undefined : Number(maxPriceRupees);
    if (
      [minPrice, maxPrice].some((price) => price !== undefined && (!Number.isFinite(price) || price < 0)) ||
      (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)
    ) {
      showToast('Enter a valid price range with minimum no greater than maximum.', 'error');
      return;
    }

    if (!query.trim() && category === 'ALL' && minPrice === undefined && maxPrice === undefined && condition === 'ANY' && !closingSoon) {
      showToast('Add at least one filter before saving an alert.', 'error');
      return;
    }

    setFormLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string; savedSearch: SavedSearch }>(
        '/saved-searches',
        {
          query: query.trim() || undefined,
          category: category !== 'ALL' ? category : undefined,
          minPriceRupees: minPrice,
          maxPriceRupees: maxPrice,
          condition: condition !== 'ANY' ? condition : undefined,
          closingSoon,
        }
      );

      if (res.success) {
        showToast(res.message, 'success');
        setQuery('');
        setMinPriceRupees('');
        setMaxPriceRupees('');
        setCategory('ALL');
        setCondition('ANY');
        setClosingSoon(false);
        fetchSavedSearches();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save search.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.del(`/saved-searches/${id}`);
      setSavedSearches(savedSearches.filter((s) => s._id !== id));
      showToast('Saved search alert removed.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete.', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Smart Alerts</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          Saved Search Triggers
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Specify items you want (e.g. "Scientific calculator under ₹400"). We notify you the moment a senior lists it.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Create Form (5 cols) */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleCreateSearch}
            className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4 sticky top-24"
          >
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-indigo-600" />
              <span>Create New Saved Search Alert</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Item Keywords
              </label>
              <input
                type="text"
                maxLength={100}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Casio fx-991EX, Hero Cycle..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-indigo-600"
              >
                <option value="ALL">Any Category</option>
                <option value="CYCLES">Bicycles & Mobility</option>
                <option value="CALCULATORS">Calculators & Math</option>
                <option value="TEXTBOOKS">Textbooks & Academic</option>
                <option value="ELECTRONICS">Electronics & Tech</option>
                <option value="DORM_LIVING">Dorm & Living</option>
                <option value="LAB_EQUIPMENT">Lab Gear & Kits</option>
                <option value="OTHER">Other Campus Essentials</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Minimum Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                  value={minPriceRupees}
                  onChange={(e) => setMinPriceRupees(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Maximum Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                  value={maxPriceRupees}
                  onChange={(e) => setMaxPriceRupees(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-indigo-600"
              >
                <option value="ANY">Any Condition</option>
                <option value="BRAND_NEW">Brand New</option>
                <option value="LIKE_NEW">Like New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={closingSoon}
                onChange={(event) => setClosingSoon(event.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Only alert when the auction closes within 2 hours
            </label>

            <button
              type="submit"
              disabled={formLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{formLoading ? 'Saving...' : 'Save Search Alert'}</span>
            </button>
          </form>
        </div>

        {/* Saved Searches List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
            <span>Your Active Alerts ({savedSearches.length})</span>
            <span className="text-xs text-slate-400 font-normal">Push & In-App notifications</span>
          </h3>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading active alerts...</div>
          ) : savedSearches.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center space-y-2">
              <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">No saved search alerts yet</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Save searches for items you're waiting for so you never miss a newly published auction.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedSearches.map((s) => (
                <div
                  key={s._id}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {s.query ? `"${s.query}"` : 'Any Keyword'}
                      </span>
                      {s.category && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {getCategoryLabel(s.category)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {s.minPricePaise !== undefined && (
                        <span>From <strong>{formatRupees(s.minPricePaise)}</strong></span>
                      )}
                      {s.maxPricePaise !== undefined && (
                        <span>Up to <strong>{formatRupees(s.maxPricePaise)}</strong></span>
                      )}
                      {s.condition && (
                        <span>• Condition: <strong>{s.condition.replace(/_/g, ' ')}</strong></span>
                      )}
                      {s.closingSoon && <span>• Closes within 2h</span>}
                      <span>• Created {new Date(s.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(s._id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete alert"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
