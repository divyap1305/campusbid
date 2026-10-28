import React, { useState, useEffect } from 'react';
import { 
  Gavel, 
  Search, 
  PlusCircle, 
  Bot, 
  Bell, 
  User, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  ArrowRight,
  Bike,
  Calculator,
  BookOpen,
  Laptop,
  Home,
  Layers
} from 'lucide-react';

export default function App() {
  const [serverHealth, setServerHealth] = useState<string>('Checking...');
  const [dbStatus, setDbStatus] = useState<string>('Checking...');

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setServerHealth(data.status || 'OK');
        setDbStatus(data.database || 'Connected');
      })
      .catch(() => {
        setServerHealth('Connecting...');
        setDbStatus('Local MongoDB');
      });
  }, []);

  const categories = [
    { name: 'Bicycles & Mobility', count: '12 active', icon: Bike, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { name: 'Calculators & Math', count: '8 active', icon: Calculator, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { name: 'Textbooks & Notes', count: '24 active', icon: BookOpen, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { name: 'Laptops & Tech', count: '15 active', icon: Laptop, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { name: 'Dorm & Living', count: '19 active', icon: Home, color: 'text-rose-600 bg-rose-50 border-rose-100' },
    { name: 'Lab Gear & Misc', count: '6 active', icon: Layers, color: 'text-purple-600 bg-purple-50 border-purple-100' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Banner for System Status */}
      <header className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>CampusBid Network • Real-time Auction Protocol Active</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Backend: <strong className="text-white">{serverHealth}</strong></span>
          <span>DB: <strong className="text-emerald-400">{dbStatus}</strong></span>
        </div>
      </header>

      {/* Main Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md shadow-indigo-200">
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-1.5">
                CampusBid
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Campus Beta</span>
              </span>
              <p className="text-[11px] text-slate-500 font-medium leading-none">Give every campus item its next owner</p>
            </div>
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search cycles, calculators, books, monitors..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-transparent rounded-xl text-sm focus:outline-none focus:bg-white focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI Assistant</span>
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm shadow-indigo-200">
              <PlusCircle className="w-4 h-4" />
              <span>List Item</span>
            </button>
            <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
            <button className="flex items-center gap-2 p-1.5 pl-2 text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 text-sm font-medium">
              <User className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-white to-slate-50 border-b border-slate-200/80 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Zero informal chat chaos. 100% transparent student bidding.
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            Give Every Campus Item <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">
              Its Next Owner.
            </span>
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Graduating seniors pass on cycles, lab kits, calculators, and electronics to juniors with fair price discovery, soft-close anti-sniping, and verified physical handover.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button className="px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition flex items-center gap-2">
              <span>Browse Active Auctions</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="px-6 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold text-sm hover:bg-slate-50 transition shadow-sm">
              How Campus Bidding Works
            </button>
          </div>

          {/* Value Props Row */}
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Strict Campus Verification</h2>
                <p className="text-xs text-slate-500 mt-1">Only verified student IDs bid and sell. No external scalpers or bots.</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Anti-Sniping Soft Close</h2>
                <p className="text-xs text-slate-500 mt-1">Bids in the final 30s auto-extend the auction by 60s for true price discovery.</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Automated Proxy Bidding</h2>
                <p className="text-xs text-slate-500 mt-1">Set your student ceiling; our backend bids the minimum increment needed.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Browse by Campus Category</h2>
            <p className="text-sm text-slate-500">Popular items circulating between academic years</p>
          </div>
          <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View all categories <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div 
                key={idx}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition cursor-pointer flex flex-col items-center text-center group"
              >
                <div className={`p-3 rounded-2xl border mb-3 group-hover:scale-105 transition-transform ${cat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">{cat.name}</h3>
                <span className="text-[11px] text-slate-400 mt-0.5">{cat.count}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center space-x-2">
            <Gavel className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-800">CampusBid</span>
            <span>— The Fair Campus Auction Marketplace</span>
          </div>
          <div>
            <span>Built for the 2025 Hackathon • Integer-safe financial precision</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
