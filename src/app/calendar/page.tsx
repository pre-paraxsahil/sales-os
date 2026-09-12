import { SalesCalendarView } from '@/components/calendar/SalesCalendarView';

export const metadata = {
  title: 'Sales Calendar | Sales OS',
  description: 'Dedicated conflict-protected sales execution calendar & booking system.',
};

export default function SalesCalendarPage() {
  return (
    <main className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <SalesCalendarView />
      </div>
    </main>
  );
}
