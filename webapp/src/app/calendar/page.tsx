'use client';

import { useRouter } from 'next/navigation';
import CalendarView from '@/components/CalendarView';
import { CalendarDays, CheckSquare, BarChart2, CalendarRange } from 'lucide-react';

export default function CalendarPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col lg:flex-row overflow-hidden font-sans relative">
      <CalendarView onBack={() => router.push('/dashboard')} />

      {/* Bottom Navigation Bar (Mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-[#1a1a1a] border-t border-[#333] flex justify-around items-center h-16 z-40 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
          {[
             { id: 'Timetable', icon: <CalendarDays size={20} /> }, 
             { id: 'Attendance', icon: <CheckSquare size={20} /> }, 
             { id: 'Marks', icon: <BarChart2 size={20} /> }, 
             { id: 'Calendar', icon: <CalendarRange size={20} /> }
          ].map((tab) => (
             <button 
                 key={tab.id}
                 onClick={() => tab.id !== 'Calendar' && router.push('/dashboard')}
                 className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${tab.id === 'Calendar' ? 'text-[#1E88E5]' : 'text-gray-500 hover:text-gray-300'}`}
             >
                 <span className="text-xl">{tab.icon}</span>
                 <span className="text-[10px] font-bold uppercase tracking-wider">{tab.id}</span>
             </button>
          ))}
      </nav>
    </div>
  );
}
