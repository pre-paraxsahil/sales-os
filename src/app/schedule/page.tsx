import React from 'react';
import { ScheduleClient } from '@/components/schedule/ScheduleClient';

export const metadata = {
  title: 'Schedule | BroStartup Sales OS',
  description: 'Calendar view for call slots, demo appointments, targets, and sales planner.',
};

export default function SchedulePage() {
  return <ScheduleClient />;
}
