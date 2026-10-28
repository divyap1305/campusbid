import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { 
  Gavel, 
  Search, 
  PlusCircle, 
  Bot, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  Package, 
  TrendingUp, 
  Bookmark, 
  Check, 
  Volume2, 
  Menu, 
  X,
  ShieldCheck
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    requestBrowserNotifications, 
    browserNotificationsEnabled 
  } = useNotification();
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/auctions?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <Link to="/" className="flex items-center space-x-2.5 shrink-0">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
              CampusBid
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wider">
                Student
              </span>
            </span>
            <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5 hidden sm:block">
              Transparent Campus Auctions
            </p>
          </div>
        </Link>

        {/* Center: Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cycles, calculators, books, monitors..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-transparent rounded-xl text-sm focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 placeholder-slate-400"
            />
          </div>
        </form>

        {/* Right Navigation Controls */}
        <div className="hidden lg:flex items-center space-x-1">
          <Link
            to="/auctions"
            className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition"
          >
            Browse
          </Link>
          <Link
            to="/assistant"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-indigo-600 bg-indigo-50/60 hover:bg-indigo-50 transition"
          >
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>AI Assistant</span>
          </Link>
          <Link
            to="/saved-searches"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition"
          >
            <Bookmark className="w-4 h-4 text-slate-400" />
            <span>Saved Searches</span>
          </Link>
        </div>

        {/* Right CTA & Account */}
        <div className="flex items-center space-x-2.5">
          <Link
            to="/sell"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm shadow-indigo-200"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Sell Item</span>
          </Link>

          {/* Notifications Center Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl relative transition"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-fade-in">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    {!browserNotificationsEnabled && (
                      <button
                        onClick={requestBrowserNotifications}
                        className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                        title="Enable desktop notifications"
                      >
                        <Volume2 className="w-3 h-3" /> Enable Web Push
                      </button>
                    )}
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-slate-500 hover:text-slate-800 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications yet. You will receive alerts when you are outbid or item matches appear!
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <div
                        key={n._id}
                        onClick={() => {
                          markAsRead(n._id);
                          setShowNotifications(false);
                          if (n.link) navigate(n.link);
                        }}
                        className={`p-3.5 hover:bg-slate-50 transition cursor-pointer text-xs ${
                          !n.isRead ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h5 className="font-bold text-slate-900">{n.title}</h5>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1"></span>
                          )}
                        </div>
                        <p className="text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    View All Notifications →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          {user ? (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-xs font-semibold text-slate-800"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  {user.name[0]}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">{user.name}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-fade-in divide-y divide-slate-100">
                  <div className="p-3">
                    <div className="font-bold text-slate-900">{user.name}</div>
                    <div className="text-slate-400 text-[11px] truncate">{user.email}</div>
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      ID: {user.studentId}
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/my-listings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <Package className="w-4 h-4 text-slate-400" />
                      <span>My Listings (Seller)</span>
                    </Link>
                    <Link
                      to="/my-bids"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <TrendingUp className="w-4 h-4 text-slate-400" />
                      <span>My Bids (Buyer)</span>
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>Profile & Settings</span>
                    </Link>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-left font-medium"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 lg:hidden rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white p-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full mb-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campus auctions..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-xl text-sm"
            />
          </form>
          <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
            <Link
              to="/auctions"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-slate-50 text-slate-800 text-center"
            >
              Browse Auctions
            </Link>
            <Link
              to="/assistant"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-center flex items-center justify-center gap-1.5"
            >
              <Bot className="w-4 h-4" /> AI Assistant
            </Link>
            <Link
              to="/saved-searches"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-slate-50 text-slate-800 text-center"
            >
              Saved Searches
            </Link>
            <Link
              to="/my-listings"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-slate-50 text-slate-800 text-center"
            >
              My Listings
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
