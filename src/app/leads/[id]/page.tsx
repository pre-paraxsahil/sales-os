import React from 'react';
import { LeadProfileClient } from '@/components/leads/LeadProfileClient';

export const metadata = {
  title: 'Lead Profile | BroStartup Sales OS',
  description: 'Lead profile view, overview, activity timeline, calls, demos, notes, and sales actions.',
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LeadProfileClient id={id} />;
}
