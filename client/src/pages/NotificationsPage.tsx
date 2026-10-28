import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext.js';
import { Bell, Check, Volume2, ShieldCheck, ArrowRight } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    requestBrowserNotifications, 
    browserNotificationsEnabled 
  } = useNotification();
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const visibleNotifications = useMemo(
    () => unreadOnly ? notifications.filter((notification) => !notification.isRead) : notifications,
    [notifications, unreadOnly]
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Activity & Alerts</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Notifications Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Stay updated on outbids, ending auctions, seller approvals, and saved search matches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={!unreadOnly}
            onClick={() => setUnreadOnly(false)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
              !unreadOnly ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly(true)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
              unreadOnly ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
          {!browserNotificationsEnabled && (
            <button
              onClick={requestBrowserNotifications}
              className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold border border-indigo-200 transition flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Enable Web Push</span>
            </button>
          )}

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden divide-y divide-slate-100">
        {visibleNotifications.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <Bell className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">
              {unreadOnly && notifications.length > 0 ? 'You are all caught up' : 'No notifications yet'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {unreadOnly && notifications.length > 0
                ? 'There are no unread notifications.'
                : "When someone outbids you or an auction you're watching closes, you'll see instant alerts here."}
            </p>
          </div>
        ) : (
          visibleNotifications.map((n) => (
            <div
              key={n._id}
              onClick={() => {
                markAsRead(n._id);
                if (n.link) navigate(n.link);
              }}
              className={`p-5 sm:p-6 hover:bg-slate-50 transition cursor-pointer flex items-start justify-between gap-4 ${
                !n.isRead ? 'bg-indigo-50/30' : ''
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                  {n.message}
                </p>
                <span className="text-[10px] text-slate-400 block pt-1">
                  {new Date(n.createdAt).toLocaleDateString()} at{' '}
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="text-slate-400 self-center">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
