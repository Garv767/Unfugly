'use client';

import { useRouter, usePathname } from 'next/navigation';
import { CalendarDays, CheckSquare, BarChart2, CalendarRange, Rocket } from 'lucide-react';

interface BottomNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const tabs = [
  { id: 'Timetable',  icon: CalendarDays,  route: null },
  { id: 'Attendance', icon: CheckSquare,   route: null },
  { id: 'Marks',      icon: BarChart2,     route: null },
  { id: 'Calendar',   icon: CalendarRange, route: '/calendar' },
  { id: 'Feedback',   icon: Rocket,        route: '/feedback' },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab from route if not passed explicitly
  const resolvedActive = activeTab ||
    (pathname === '/calendar' ? 'Calendar' :
     pathname === '/feedback' ? 'Feedback' : 'Timetable');

  const handleClick = (tab: typeof tabs[0]) => {
    if (tab.route) {
      router.push(tab.route);
    } else if (onTabChange) {
      onTabChange(tab.id);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-1"
         style={{ background: 'linear-gradient(to top, rgba(18,18,18,0.98) 70%, transparent)' }}>
      <div className="flex items-center justify-around bg-[#1c1c1e]/90 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-[0_-4px_30px_rgba(0,0,0,0.6)] px-1 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = resolvedActive === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleClick(tab)}
              className="flex flex-col items-center justify-center flex-1 gap-1 py-1 transition-all duration-200"
            >
              <span className={`flex items-center justify-center rounded-full transition-all duration-200 ${
                isActive
                  ? 'bg-[#1E88E5] text-white px-4 py-1.5 shadow-[0_2px_12px_rgba(30,136,229,0.5)]'
                  : 'text-gray-500 px-2 py-1.5'
              }`}>
                <Icon size={isActive ? 18 : 20} strokeWidth={isActive ? 2.5 : 1.8} />
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                isActive ? 'text-[#1E88E5]' : 'text-gray-600'
              }`}>
                {tab.id}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
