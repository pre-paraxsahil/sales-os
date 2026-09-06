import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { PwaRegistrar } from '@/components/layout/PwaRegistrar';

export const metadata: Metadata = {
  title: 'BroStartup Sales OS | Personal Sales Operating System',
  description: 'Single-user personal sales operating system for lead management, daily action cockpit, call logs, scheduling, and insights.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sales OS',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0f19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="bg-slate-50 text-slate-900 selection:bg-indigo-600 selection:text-white font-sans antialiased min-h-screen">
        <PwaRegistrar />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
