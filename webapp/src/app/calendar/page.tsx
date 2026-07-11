'use client';

import { useRouter } from 'next/navigation';
import CalendarView from '@/components/CalendarView';
import Link from 'next/link';

export default function CalendarPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col lg:flex-row overflow-hidden font-sans">
      <CalendarView onBack={() => router.push('/dashboard')} />
    </div>
  );
}
