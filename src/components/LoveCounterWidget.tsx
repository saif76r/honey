import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, Calendar, ChevronRight } from 'lucide-react';
import { Contact } from '../types/chat';

interface LoveCounterWidgetProps {
  contact: Contact;
  onOpenCustomizer: () => void;
  onSendHeartBurst: () => void;
}

export const LoveCounterWidget: React.FC<LoveCounterWidgetProps> = ({
  contact,
  onOpenCustomizer,
  onSendHeartBurst,
}) => {
  const [stats, setStats] = useState({ days: 0, hours: 0, mins: 0, milestoneDaysLeft: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(contact.relationshipStartDate).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, now - start);

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      // Calculate days to next yearly anniversary
      const startDate = new Date(contact.relationshipStartDate);
      const currentYear = new Date().getFullYear();
      let nextAnniv = new Date(currentYear, startDate.getMonth(), startDate.getDate());
      if (nextAnniv.getTime() < now) {
        nextAnniv = new Date(currentYear + 1, startDate.getMonth(), startDate.getDate());
      }
      const daysLeft = Math.ceil((nextAnniv.getTime() - now) / (1000 * 60 * 60 * 24));

      setStats({ days, hours, mins, milestoneDaysLeft: daysLeft });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [contact.relationshipStartDate]);

  return (
    <div className="p-3.5 rounded-2xl neu-flat-sm flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onSendHeartBurst}
          className="w-10 h-10 rounded-2xl neu-button flex items-center justify-center text-[var(--neu-accent)] hover:scale-105 active:scale-95 transition-transform"
          title="Send heart burst to partner"
        >
          <Heart className="w-5 h-5 fill-current animate-pulse" />
        </button>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[var(--neu-text-primary)]">
              {stats.days} Days in Love
            </span>
            <span className="text-[10px] text-[var(--neu-accent)] font-semibold">
              · {stats.hours}h {stats.mins}m
            </span>
          </div>
          <div className="text-[11px] text-[var(--neu-text-secondary)] line-clamp-1">
            {contact.anniversaryMilestone || 'Our Love Story'} (in {stats.milestoneDaysLeft} days)
          </div>
        </div>
      </div>

      <button
        onClick={onOpenCustomizer}
        className="w-7 h-7 rounded-full neu-button flex items-center justify-center text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)]"
        title="Customize anniversary & theme"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
