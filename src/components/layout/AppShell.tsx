'use client';

import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { DesktopNavigation, MobileNavigation } from './Navigation';
import { QuickAddModal } from './QuickAddModal';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col antialiased">
      {/* Global Top Bar */}
      <TopBar onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

      {/* Main Body Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <DesktopNavigation />

        {/* Page Content View */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation />

      {/* Quick Add UI Modal */}
      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </div>
  );
};
