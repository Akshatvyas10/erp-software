import React from 'react';
import { StatCard } from '@/components/common/StatCard';
import { ArrowUpRight, CheckCircle2, Clock, IndianRupee } from 'lucide-react';
import type { FeeSummaryStats } from '../api/feeApi';

interface FeeSummaryCardsProps {
  stats?: FeeSummaryStats;
  isLoading: boolean;
}

export const FeeSummaryCards: React.FC<FeeSummaryCardsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg border border-border" />
        ))}
      </div>
    );
  }

  const totalBilled = Number(stats?.totals?.totalBilled || 0);
  const totalCollected = Number(stats?.totals?.totalCollected || 0);
  const totalPending = Number(stats?.totals?.totalPending || 0);
  const todayTotal = Number(stats?.today?.todayTotal || 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        title="Total Billed"
        value={`₹${totalBilled.toLocaleString('en-IN')}`}
        subtitle="All active invoices"
        icon={IndianRupee}
        variant="default"
      />

      <StatCard
        title="Total Collected"
        value={`₹${totalCollected.toLocaleString('en-IN')}`}
        subtitle={`${collectionRate}% realization`}
        icon={CheckCircle2}
        variant="success"
      />

      <StatCard
        title="Outstanding Dues"
        value={`₹${totalPending.toLocaleString('en-IN')}`}
        subtitle="Pending balances"
        icon={Clock}
        variant="warning"
      />

      <StatCard
        title="Today's Counter"
        value={`₹${todayTotal.toLocaleString('en-IN')}`}
        subtitle={`Cash: ₹${Number(stats?.today?.todayCash || 0).toLocaleString('en-IN')} • UPI: ₹${Number(stats?.today?.todayUpi || 0).toLocaleString('en-IN')}`}
        icon={ArrowUpRight}
        variant="info"
      />
    </div>
  );
};

export default FeeSummaryCards;
