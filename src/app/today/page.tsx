import React from 'react';
import { TodayCockpit } from '@/components/today/TodayCockpit';

export const metadata = {
  title: 'Today Cockpit | BroStartup Sales OS',
  description: 'Deterministic time scheduling, smart priority ranking, and real-time next-best-action intelligence.',
};

export default function TodayPage() {
  return <TodayCockpit />;
}
