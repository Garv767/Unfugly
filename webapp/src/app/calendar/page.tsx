'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CalendarView from '@/components/CalendarView';
import Link from 'next/link';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/calendar`)
      .then(res => res.json())
      .then(calData => {
        setCalendarData(calData.calendar_json || calData);
        setLoading(false);
      })
      .catch(e => {
        console.log('Calendar fetch error', e);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F1F2E] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xl font-medium text-accent2 animate-pulse">Loading Calendar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2e2e2e] text-white flex overflow-hidden font-sans">
      <main className="flex-1 p-6 h-screen overflow-y-auto w-full relative">
        <div className="mb-6">
           <h2 className="text-3xl font-bold flex items-center gap-3">
              <span className="bg-[#1E88E5] text-white p-2 rounded-lg">📅</span>
              Academic Calendar
           </h2>
           <p className="text-gray-400 mt-2">View holidays, day orders, and important events synchronized from Academia.</p>
        </div>
        
        <CalendarView calendarData={calendarData} />
      </main>

      {/* Floating Pill Button to switch back to Dashboard */}
      <Link 
        href="/dashboard"
        className="fixed bottom-8 right-8 bg-[#1E88E5] text-white px-6 py-3 rounded-full shadow-2xl font-bold text-lg transition-transform hover:scale-105 hover:bg-[#1565C0] flex items-center gap-2 z-50 border-2 border-[#1565c0]/50"
      >
        <span>📊</span> Back to Dashboard
      </Link>
    </div>
  );
}
