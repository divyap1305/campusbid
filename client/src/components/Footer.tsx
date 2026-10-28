import React from 'react';
import { Gavel, ShieldCheck, Clock, Zap, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto bg-white border-t border-slate-200">
      {/* Trust Highlights */}
      <div className="border-b border-slate-100 bg-slate-50/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-slate-800 text-xs">Campus Verified</h5>
              <p className="text-[11px] text-slate-500">Only enrolled students bid & sell</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-slate-800 text-xs">Soft-Close Anti-Sniping</h5>
              <p className="text-[11px] text-slate-500">Bids at &le;30s extend by 60s</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-slate-800 text-xs">Automated Proxy Bids</h5>
              <p className="text-[11px] text-slate-500">Set maximum ceiling securely</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-slate-800 text-xs">Integer Paise Precision</h5>
              <p className="text-[11px] text-slate-500">Zero floating-point currency errors</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-slate-500">
        <div className="flex flex-col items-center md:items-start space-y-1">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 text-white p-1 rounded-md">
              <Gavel className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm text-slate-900">CampusBid</span>
          </div>
          <p className="text-[11px] text-slate-400">Give every campus item its next owner.</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 font-medium text-slate-600">
          <Link to="/auctions" className="hover:text-indigo-600">Browse Auctions</Link>
          <Link to="/sell" className="hover:text-indigo-600">Sell Item</Link>
          <Link to="/assistant" className="hover:text-indigo-600">AI Assistant</Link>
          <Link to="/saved-searches" className="hover:text-indigo-600">Saved Searches</Link>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <span>Engineered for Campus Hackathon with</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
        </div>
      </div>
    </footer>
  );
};
