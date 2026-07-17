'use client';

import { useRouter, usePathname } from 'next/navigation';
import { CalendarDays, CheckSquare, BarChart2, CalendarRange, Rocket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UnfuglyLog } from '../utils/logger';

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
    const netIdKey = Object.keys(localStorage).find(key => key.startsWith('unfuglyData_') && key !== 'unfuglyData_calendar');
    if (netIdKey) {
      const cachedStr = localStorage.getItem(netIdKey);
      if (cachedStr) {
        try {
          const parsed = JSON.parse(cachedStr);
          setProfileData(parsed?.profileData || null);
        } catch(e) {}
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' });
      localStorage.clear();
      router.push('/login');
    } catch (err: any) {
      UnfuglyLog.error('SYS_02', `Failed to log out: ${err.message}`);
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
      <div className="flex items-center justify-between bg-[#1c1c1e]/80 backdrop-blur-xl rounded-full border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.6)] pl-2 pr-0 py-0 h-14">
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
        <div className="relative h-full">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="h-14 w-14 outline-none transition-transform duration-200 overflow-hidden flex items-center justify-center bg-[#1E88E5] rounded-full hover:scale-[0.98] active:scale-[0.95] border-2 border-[#1E88E5]"
          >
            <img 
               src={`${API_URL}/api/v1/user/photo?token=${typeof window !== 'undefined' ? localStorage.getItem('unfugly_token') || '' : ''}`} 
               alt="Profile" 
               onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }} 
               className="w-full h-full object-cover" 
            />
            <span className="text-white font-bold text-[13px] tracking-wide hidden">
               {profileData?.name ? profileData.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : '?'}
            </span>
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 bottom-20 bg-[#2a2a2a] border border-[#444] rounded-xl shadow-2xl transition-all w-[240px] p-4 text-left z-50">
               <h3 className="text-white text-lg font-bold mb-3 border-b border-[#555] pb-2">Profile</h3>
               <div className="space-y-2 text-[12px] text-gray-300 mb-4">
                 <div><span className="font-bold text-white">Name:</span> {profileData?.name}</div>
                 <div><span className="font-bold text-white">Reg No:</span> {profileData?.registrationNo}</div>
                 <div><span className="font-bold text-white">Program:</span> {profileData?.programmeBranch}</div>
                 <div><span className="font-bold text-white">Section:</span> {profileData?.section}</div>
                 <div><span className="font-bold text-white">Semester:</span> {profileData?.semester || 'N/A'}</div>
                 <div><span className="font-bold text-white">Day Order:</span> {profileData?.dayOrder || 'N/A'}</div>
                 <div><span className="font-bold text-white mt-2 block">Department:</span> {profileData?.schoolDepartment}</div>
               </div>
                <div className="flex gap-2 mb-3">
                  <a 
                     href="https://chromewebstore.google.com/detail/lfjlfkbcnoioefacgcjanjdiodphnoce" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     title="Chrome Extension"
                     className="flex-1 flex items-center justify-center py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors border border-white/5"
                  >
                     <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <circle cx="12" cy="12" r="4"></circle>
                        <line x1="12" y1="2" x2="12" y2="8"></line>
                        <line x1="12" y1="16" x2="12" y2="22"></line>
                     </svg>
                  </a>
                  <a 
                     href="https://chat.whatsapp.com/GlmnZ3g0Zb8IXFTa3tOImT" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     title="WhatsApp Community"
                     className="flex-1 flex items-center justify-center py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors border border-white/5"
                  >
                     <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 2.019 14.12 1.01 11.52 1.01c-5.448 0-9.873 4.37-9.878 9.802-.002 1.743.46 3.447 1.34 4.954l-.99 3.614 3.655-.958zm12.335-5.464c-.302-.15-1.786-.882-2.07-.987-.282-.104-.489-.156-.694.15-.205.307-.795.987-.975 1.191-.18.205-.359.23-.66.08-1.597-.799-2.617-1.436-3.666-3.235-.278-.475.278-.44.795-1.474.086-.174.043-.326-.021-.475-.065-.15-.544-1.309-.745-1.792-.195-.47-.393-.406-.54-.413-.14-.007-.301-.008-.461-.008-.161 0-.422.06-.643.302-.221.241-.844.824-.844 2.01 0 1.185.864 2.33 1.025 2.502.161.171 1.7 2.593 4.12 3.633.576.248 1.025.395 1.376.507.579.183 1.106.157 1.522.095.464-.069 1.487-.607 1.695-1.191.208-.585.208-1.087.146-1.191-.063-.105-.23-.156-.53-.307z"/>
                     </svg>
                  </a>
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
