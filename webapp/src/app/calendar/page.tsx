'use client';

import { useRouter } from 'next/navigation';
import CalendarView from '@/components/CalendarView';
import BottomNav from '@/components/BottomNav';

export default function CalendarPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col lg:flex-row overflow-hidden font-sans relative">
      <CalendarView onBack={() => router.push('/dashboard')} />
      <BottomNav />
    </div>
  );
}
