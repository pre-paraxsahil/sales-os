'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/push/clientPush';

export function PwaRegistrar() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
