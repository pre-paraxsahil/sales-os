import React from 'react';
import { LeadListClient } from '@/components/leads/LeadListClient';

export const metadata = {
  title: 'Leads | BroStartup Sales OS',
  description: 'Manage prospect pipeline, status stages, contact history, and notes.',
};

export default function LeadsPage() {
  return <LeadListClient />;
}
