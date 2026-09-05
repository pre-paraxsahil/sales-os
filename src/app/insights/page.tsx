import React from 'react';
import { InsightsClient } from '@/components/insights/InsightsClient';

export const metadata = {
  title: 'Insights & Sales Intelligence | BroStartup Sales OS',
  description: 'Real-time sales performance metrics, two-hour sales pulse, conversion funnels, daily reports, and AI sales coach.',
};

export default function InsightsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <InsightsClient />
    </div>
  );
}
