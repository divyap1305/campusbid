import React, { useState, useEffect } from 'react';
import { formatTimeRemaining } from '../utils/formatters.js';
import { Clock, Flame } from 'lucide-react';

interface CountdownTimerProps {
  closingTime: string | Date;
  onExpire?: () => void;
  compact?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  closingTime,
  onExpire,
  compact = false,
}) => {
  const [remaining, setRemaining] = useState(formatTimeRemaining(closingTime));

  useEffect(() => {
    const update = () => {
      const next = formatTimeRemaining(closingTime);
      setRemaining(next);
      if (next.isExpired && onExpire) {
        onExpire();
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [closingTime, onExpire]);

  if (remaining.isExpired) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold ${compact ? 'text-[11px] py-0.5' : ''}`}>
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>Closed</span>
      </div>
    );
  }

  if (remaining.isSoftCloseZone) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-pulse ${compact ? 'text-[11px] py-0.5' : ''}`}>
        <Flame className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
        <span>{remaining.seconds}s — Soft Close Active!</span>
      </div>
    );
  }

  const isUrgent = remaining.days === 0 && remaining.hours === 0 && remaining.minutes < 15;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
        isUrgent
          ? 'bg-amber-50 text-amber-700 border border-amber-200'
          : 'bg-slate-100 text-slate-700 border border-slate-200'
      } ${compact ? 'text-[11px] py-0.5 px-2' : ''}`}
    >
      <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-amber-500' : 'text-slate-500'}`} />
      <span>{remaining.formattedText}</span>
    </div>
  );
};
