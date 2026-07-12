'use client';

import { useRouter, usePathname } from 'next/navigation';
import { CalendarDays, CheckSquare, BarChart2, CalendarRange, Rocket } from 'lucide-react';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
  const [profileData, setProfileData] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem('dashboard_data_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setProfileData(parsed.profileData);
      } catch(e) {}
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' });
      localStorage.clear();
      router.push('/login');
    } catch (err) {
      console.error(err);
    }
  };
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
      router.push(`/dashboard?tab=${tab.id}`);
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-sm z-40">
      <div className="flex items-center justify-around bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[30px] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.6)] px-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = resolvedActive === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleClick(tab)}
              className="flex flex-col items-center justify-center flex-1 gap-1 py-0.5 transition-all duration-200"
            >
              <span className={`flex items-center justify-center rounded-full transition-all duration-200 ${
                isActive
                  ? 'bg-[#1E88E5] text-white px-3.5 py-1 shadow-[0_2px_12px_rgba(30,136,229,0.5)]'
                  : 'text-gray-500 px-2 py-1'
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

        {/* Avatar Profile */}
        <div className="relative flex-1 flex justify-center">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="flex flex-col items-center justify-center gap-1 py-0.5 outline-none transition-all duration-200"
          >
            <div className="w-7 h-7 rounded-full border-[1.5px] border-white/20 overflow-hidden shadow-sm flex items-center justify-center bg-[#1E88E5]">
              <img 
                 src={`${API_URL}/api/v1/user/photo`} 
                 alt="Profile" 
                 onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }} 
                 className="w-full h-full object-cover" 
              />
              <span className="text-white font-bold text-[10px] hidden">
                 {profileData?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 ${isMenuOpen ? 'text-[#1E88E5]' : 'text-gray-600'}`}>
              Profile
            </span>
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 bottom-16 bg-[#2a2a2a] border border-[#444] rounded-xl shadow-2xl transition-all w-[240px] p-4 text-left z-50">
               <h3 className="text-white text-lg font-bold mb-3 border-b border-[#555] pb-2">Profile</h3>
               <div className="space-y-2 text-[12px] text-gray-300 mb-4">
                 <div><span className="font-bold text-white">Name:</span> {profileData?.name}</div>
                 <div><span className="font-bold text-white">Reg No:</span> {profileData?.registrationNo}</div>
                 <div><span className="font-bold text-white">Program:</span> {profileData?.programmeBranch}</div>
                 <div><span className="font-bold text-white">Section:</span> {profileData?.section}</div>
                 <div><span className="font-bold text-white mt-2 block">Department:</span> {profileData?.schoolDepartment}</div>
               </div>
               <button onClick={handleLogout} className="w-full py-2 bg-[#ff5252]/10 text-[#ff5252] rounded-lg hover:bg-[#ff5252]/20 font-bold transition-all duration-200 text-sm">
                 Logout
               </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
