import React from 'react';
import { Link } from 'react-router-dom';
import { Listing } from '../types/index.js';
import { formatRupees, getCategoryLabel, getConditionBadge, getStatusBadge } from '../utils/formatters.js';
import { CountdownTimer } from './CountdownTimer.js';
import { Gavel, ShieldCheck, Flame, User } from 'lucide-react';

interface AuctionCardProps {
  listing: Listing;
}

export const AuctionCard: React.FC<AuctionCardProps> = ({ listing }) => {
  const condition = getConditionBadge(listing.condition);
  const status = getStatusBadge(listing.status);
  const hasPhoto = listing.photos && listing.photos.length > 0 && listing.photos[0];

  return (
    <Link
      to={`/auctions/${listing.id}`}
      className="group bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300 flex flex-col overflow-hidden relative"
    >
      {/* Thumbnail Area */}
      <div className="relative h-48 w-full bg-slate-100 overflow-hidden flex items-center justify-center">
        {hasPhoto ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex flex-col items-center text-slate-300">
            <Gavel className="w-12 h-12 stroke-[1.5]" />
            <span className="text-[11px] font-medium mt-1">Campus Listing</span>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-xs backdrop-blur-md ${status.color}`}>
            {status.label}
          </span>
          {listing.extensionCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 shadow-xs">
              <Flame className="w-3 h-3" />
              Extended +{listing.extensionCount}m
            </span>
          )}
        </div>

        {/* Condition Tag */}
        <div className="absolute top-3 right-3">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${condition.color}`}>
            {condition.label}
          </span>
        </div>

        {/* Floating Countdown Bar */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center pointer-events-none">
          <div className="pointer-events-auto">
            <CountdownTimer closingTime={listing.closingTime} compact />
          </div>
          {listing.bidCount > 0 && (
            <span className="bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
              <Gavel className="w-3 h-3 text-indigo-400" />
              {listing.bidCount} bid{listing.bidCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-1">
          {getCategoryLabel(listing.category)}
        </div>

        <h3 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-indigo-600 transition-colors">
          {listing.title}
        </h3>

        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
          {listing.description}
        </p>

        {/* Seller Info */}
        {listing.seller && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-bold">
              {listing.seller.name ? listing.seller.name[0] : 'S'}
            </div>
            <span className="font-medium text-slate-700 truncate">{listing.seller.name}</span>
            {listing.seller.isCampusVerified && (
              <span className="inline-flex shrink-0" title="Verified Campus Student" role="img" aria-label="Verified Campus Student">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
              </span>
            )}
          </div>
        )}

        {/* Price & Action Footer */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-end justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              {listing.bidCount === 0 ? 'Starting Price' : 'Current Leading Bid'}
            </span>
            <div className="text-lg font-extrabold text-slate-900 flex items-baseline gap-1">
              <span>{formatRupees(listing.currentPricePaise)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
            <span>View & Bid</span>
            <span>→</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
