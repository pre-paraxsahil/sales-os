import React, { Suspense } from 'react';
import { WhatsAppClient } from '@/components/whatsapp/WhatsAppClient';

export const metadata = {
  title: 'WhatsApp Sales Engine | BroStartup Sales OS',
  description: 'WhatsApp communication center, message templates, follow-up intelligence, and quick outreach.',
};

export default function WhatsAppPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-xs text-slate-400">
          Loading WhatsApp Sales Command Center...
        </div>
      }
    >
      <WhatsAppClient />
    </Suspense>
  );
}
