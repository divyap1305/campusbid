import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { Listing, ListingCategory, ListingCondition } from '../types/index.js';
import { 
  Gavel, 
  Upload, 
  Clock, 
  Tag, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Image as ImageIcon,
  Bike,
  Calculator,
  BookOpen,
  Laptop
} from 'lucide-react';

const toDateTimeLocal = (value: string | Date): string => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export const CreateListingPage: React.FC = () => {
  const { id: editId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<ListingCategory>('CYCLES');
  const [condition, setCondition] = useState<ListingCondition>('GOOD');
  const [description, setDescription] = useState<string>('');
  const [startingPriceRupees, setStartingPriceRupees] = useState<string>('');
  const [minIncrementRupees, setMinIncrementRupees] = useState<string>('50');
  const [durationHours, setDurationHours] = useState<string>('24');
  const [closingDateTime, setClosingDateTime] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(Boolean(editId));
  const [existingListing, setExistingListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(editId);
  const canEditAuctionTerms = !existingListing || existingListing.bidCount === 0;

  useEffect(() => {
    if (!editId) return;

    const fetchListingForEdit = async () => {
      try {
        const response = await api.get<{ success: boolean; listings: Listing[] }>('/auctions/my/listings');
        const listing = response.listings.find((item) => item.id === editId);
        if (!listing) {
          setError('Listing not found in your published listings.');
          return;
        }

        setExistingListing(listing);
        setTitle(listing.title);
        setDescription(listing.description);
        setCategory(listing.category);
        setCondition(listing.condition);
        setPhotos(listing.photos || []);
        setStartingPriceRupees((listing.startingPricePaise / 100).toString());
        setMinIncrementRupees((listing.minIncrementPaise / 100).toString());
        setClosingDateTime(toDateTimeLocal(listing.closingTime));
      } catch (err: any) {
        setError(err.message || 'Failed to load listing for editing.');
      } finally {
        setEditLoading(false);
      }
    };

    fetchListingForEdit();
  }, [editId]);

  const samplePhotoPresets = [
    { label: 'Mountain Cycle', url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80' },
    { label: 'Scientific Calculator', url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80' },
    { label: 'Engineering Textbooks', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80' },
    { label: 'Gaming / Tech Monitor', url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80' },
    { label: 'Study Table Lamp', url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80' },
  ];

  const handleAddPhoto = () => {
    if (photoUrl.trim() && !photos.includes(photoUrl.trim())) {
      setPhotos([...photos, photoUrl.trim()]);
      setPhotoUrl('');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    if (photos.length + selectedFiles.length > 10) {
      showToast('A listing can have up to 10 photos.', 'warning');
      return;
    }

    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];
    try {
      for (const file of selectedFiles) {
        const response = await api.upload<{ success: boolean; url: string }>('/auctions/photos', file);
        if (!response.success || !response.url) {
          throw new Error('Image upload did not return a photo URL.');
        }
        uploadedUrls.push(response.url);
      }
      setPhotos((current) => [...current, ...uploadedUrls]);
      showToast(`${uploadedUrls.length} photo${uploadedUrls.length === 1 ? '' : 's'} uploaded.`, 'success');
    } catch (err: any) {
      if (uploadedUrls.length > 0) {
        setPhotos((current) => [...current, ...uploadedUrls]);
      }
      showToast(err.message || 'Failed to upload photos.', 'error');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('Please sign in to publish an auction.', 'warning');
      navigate('/login');
      return;
    }

    if (title.trim().length < 3 || title.trim().length > 120 || description.trim().length < 10 || description.trim().length > 2000) {
      setError('Title must be 3–120 characters and description must be 10–2000 characters.');
      return;
    }

    if (!isEditing || canEditAuctionTerms) {
      const price = Number(startingPriceRupees);
      const increment = Number(minIncrementRupees);
      if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(increment) || increment <= 0) {
        setError('Starting price and minimum increment must be positive amounts.');
        return;
      }
    }

    if (isEditing && canEditAuctionTerms) {
      const closingTimestamp = new Date(closingDateTime).getTime();
      if (!Number.isFinite(closingTimestamp) || closingTimestamp <= Date.now()) {
        setError('Auction closing time must be in the future.');
        return;
      }
    }

    if (isEditing && !existingListing) {
      setError('Listing data is not available. Reload the page and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && editId) {
        const payload = canEditAuctionTerms
          ? {
              title: title.trim(),
              description: description.trim(),
              category,
              condition,
              startingPrice: Number(startingPriceRupees),
              minIncrement: Number(minIncrementRupees),
              closingTime: new Date(closingDateTime).toISOString(),
              photos,
            }
          : { title: title.trim(), description: description.trim() };
        const response = await api.put<{ success: boolean; message: string }>(`/auctions/${editId}`, payload);
        if (response.success) {
          showToast(response.message, 'success');
          navigate('/my-listings');
        }
      } else {
        const response = await api.post<{ success: boolean; listing: { _id: string }; message: string }>('/auctions', {
          title: title.trim(),
          category,
          condition,
          description: description.trim(),
          startingPrice: Number(startingPriceRupees),
          minIncrement: Number(minIncrementRupees) || 20,
          durationHours: parseInt(durationHours, 10) || 24,
          photos: photos.length > 0 ? photos : (photoUrl ? [photoUrl] : []),
        });

        if (response.success && response.listing) {
          showToast('Auction published live to campus marketplace!', 'success');
          navigate(`/auctions/${response.listing._id}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to publish auction listing.');
    } finally {
      setLoading(false);
    }
  };

  if (isEditing && editLoading) {
    return <div className="p-12 text-center text-sm text-slate-400">Loading listing for editing...</div>;
  }

  if (isEditing && !existingListing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-sm text-rose-700">{error || 'Listing could not be loaded for editing.'}</p>
        <button type="button" onClick={() => navigate('/my-listings')} className="mt-4 text-sm font-bold text-indigo-600">
          Return to My Listings
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Sell on Campus</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          {isEditing ? 'Edit Auction Listing' : 'Create an Auction Listing'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {isEditing
            ? 'Update your listing while keeping its auction and bidding history intact.'
            : 'Pass your belongings to juniors through transparent, peer-to-peer campus bidding.'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/90 shadow-sm">
        {/* Section 1: Item Details */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
            1. Item Information
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Auction Title *
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hero Sprint 21-Speed Cycle with Basket and Lock"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ListingCategory)}
                disabled={isEditing && !canEditAuctionTerms}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-indigo-600 transition font-medium"
              >
                <option value="CYCLES">Bicycles & Mobility</option>
                <option value="CALCULATORS">Calculators & Math</option>
                <option value="TEXTBOOKS">Textbooks & Academic</option>
                <option value="ELECTRONICS">Electronics & Tech</option>
                <option value="DORM_LIVING">Dorm & Living</option>
                <option value="LAB_EQUIPMENT">Lab Gear & Kits</option>
                <option value="OTHER">Other Campus Essentials</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Condition *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ListingCondition)}
                disabled={isEditing && !canEditAuctionTerms}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-indigo-600 transition font-medium"
              >
                <option value="BRAND_NEW">Brand New (Unused / In Box)</option>
                <option value="LIKE_NEW">Like New (Barely used, flawless)</option>
                <option value="GOOD">Good (Normal minor student wear)</option>
                <option value="FAIR">Fair (Noticeable cosmetic marks, fully functional)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description & Campus Pickup Location *
            </label>
            <textarea
              rows={4}
              required
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe age, functionality, accessories included, and preferred pickup spot (e.g. Student Center, Main Hostel Gate)..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-indigo-600 transition"
            />
          </div>
        </div>

        {/* Section 2: Photos */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
            2. Item Photography
          </h2>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Add Photo URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                disabled={isEditing && !canEditAuctionTerms}
                placeholder="https://example.com/item-photo.jpg"
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-indigo-600 transition"
              />
              <button
                type="button"
                onClick={handleAddPhoto}
                disabled={isEditing && !canEditAuctionTerms}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Add Photo
              </button>
            </div>

            <label className={`flex w-fit items-center gap-2 px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold cursor-pointer hover:bg-indigo-100 ${(isEditing && !canEditAuctionTerms) || uploadingPhotos || photos.length >= 10 ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="w-4 h-4" />
              {uploadingPhotos ? 'Uploading photos...' : 'Upload photos'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={(isEditing && !canEditAuctionTerms) || uploadingPhotos || photos.length >= 10}
                onChange={(event) => {
                  void handleUploadPhotos(event.target.files);
                  event.target.value = '';
                }}
                className="sr-only"
              />
            </label>
            <p className="text-[11px] text-slate-400">JPEG, PNG, or WebP. Up to 5 MB each and 10 photos per listing.</p>

            {/* Quick Presets for Demo */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                Quick Photography Presets (1-Click for Hackathon Demo):
              </span>
              <div className="flex flex-wrap gap-2">
                {samplePhotoPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isEditing && !canEditAuctionTerms}
                    onClick={() => {
                      if (!photos.includes(preset.url)) setPhotos([...photos, preset.url]);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-xs font-medium border border-slate-200 transition"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Added Photos Grid */}
            {photos.length > 0 && (
              <div className="flex gap-3 pt-3 overflow-x-auto">
                {photos.map((p, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-2xl border border-slate-200 overflow-hidden shrink-0 group">
                    <img src={p} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      disabled={isEditing && !canEditAuctionTerms}
                      className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Pricing & Duration */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
            3. Auction Pricing & Duration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Starting Price (₹) *
              </label>
              <div className="relative">
                <span className="text-base font-bold text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required={!isEditing || canEditAuctionTerms}
                  value={startingPriceRupees}
                  onChange={(e) => setStartingPriceRupees(e.target.value)}
                  disabled={isEditing && !canEditAuctionTerms}
                  placeholder="e.g. 500"
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Stored safely as integer paise</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Min Bid Increment (₹)
              </label>
              <div className="relative">
                <span className="text-base font-bold text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                  ₹
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={minIncrementRupees}
                  onChange={(e) => setMinIncrementRupees(e.target.value)}
                  disabled={isEditing && !canEditAuctionTerms}
                  placeholder="e.g. 20"
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Default: ₹50</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {isEditing ? 'Auction Closing Time' : 'Auction Duration'}
              </label>
              {isEditing ? (
                <input
                  type="datetime-local"
                  value={closingDateTime}
                  onChange={(e) => setClosingDateTime(e.target.value)}
                  disabled={!canEditAuctionTerms}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-indigo-600 transition disabled:opacity-60"
                />
              ) : (
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                >
                  <option value="1">1 Hour (Flash Auction)</option>
                  <option value="6">6 Hours</option>
                  <option value="12">12 Hours</option>
                  <option value="24">24 Hours (Recommended)</option>
                  <option value="48">2 Days</option>
                  <option value="72">3 Days</option>
                </select>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
            <strong>Campus Fair Rules:</strong>{' '}
            {isEditing && existingListing?.bidCount
              ? 'Bidding has started. Only the title and description can be corrected; item details, photos, pricing, and closing time are locked.'
              : 'Price-sensitive fields can only be modified before bidding begins. Active automatic bid authorizations cannot be exceeded. Soft-close anti-sniping (+60s) will automatically apply if bids arrive with ≤30s remaining.'}
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate(isEditing ? '/my-listings' : '/auctions')}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Gavel className="w-4 h-4" />
            <span>{loading ? (isEditing ? 'Saving...' : 'Publishing...') : (isEditing ? 'Save Listing Changes' : 'Publish Campus Auction')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
