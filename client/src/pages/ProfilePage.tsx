import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { User, ShieldCheck, Mail, BookOpen, Phone, CheckCircle2, Save } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useNotification();

  const [name, setName] = useState<string>(user?.name || '');
  const [department, setDepartment] = useState<string>(user?.department || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(user?.phoneNumber || '');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ name, department, phoneNumber });
      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-12 text-center text-sm text-slate-400">Please sign in to view your profile.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Account Settings</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          Student Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your verified campus details used during peer auctions and handovers.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-6">
        {/* Verification Status Card */}
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block">Verified Student Account</span>
              <span className="text-xs text-slate-500">Student Roll No: <strong>{user.studentId}</strong></span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 text-xs font-extrabold uppercase tracking-wider">
            Verified
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Campus Email (Permanent)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Campus email cannot be changed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Department
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
