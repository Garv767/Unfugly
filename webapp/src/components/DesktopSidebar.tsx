'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Award, BookOpen, CalendarRange, Rocket, LogOut, CheckSquare, CalendarDays, BarChart2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface DesktopSidebarProps {
  profileData?: any;
  calendarData?: any;
  netId?: string;
  activePage?: string;
}

export default function DesktopSidebar({ profileData, calendarData, netId, activePage }: DesktopSidebarProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getDayOrderForDate = (date: Date, cal: any) => {
    if (!cal) return null;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = String(date.getFullYear()).slice(2);
    const monthKey = `${months[date.getMonth()]} '${year}`;
    const dayKey = String(date.getDate());
    const dayData = cal[monthKey]?.[dayKey];
    if (!dayData || dayData.dayOrder === '-') return null;
    return dayData.dayOrder;
  };

  const today = new Date();
  const activeDayOrder = getDayOrderForDate(today, calendarData) || profileData?.dayOrder;
  const displayDayOrder = (activeDayOrder && activeDayOrder !== '-' && activeDayOrder !== 'N/A' && activeDayOrder !== 'NA')
    ? (String(activeDayOrder).toLowerCase().startsWith('day') ? activeDayOrder : `Day ${activeDayOrder}`)
    : 'Weekend';

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/v2/auth/logout`, { method: 'POST', credentials: 'include' });
      localStorage.clear();
      router.push('/login');
    } catch {
      localStorage.clear();
      router.push('/login');
    }
  };

  const regNo = profileData?.registrationNo || profileData?.registration_no;
  const program = profileData?.programmeBranch || profileData?.programme_branch;
  const section = profileData?.section;
  const semester = profileData?.semester;

  return (
    <aside className="hidden lg:flex w-[260px] xl:w-[300px] bg-[#2a2a2a] m-4 mr-2 rounded-2xl p-6 flex-col flex-shrink-0 h-[calc(100vh-32px)] overflow-y-auto custom-scrollbar select-none">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-2xl font-bold tracking-tight">Profile</h2>
        {activePage && activePage !== 'dashboard' && (
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs text-[#64B5F6] hover:text-white transition-colors px-2 py-1 rounded bg-[#333] border border-[#444]"
          >
            Dashboard
          </button>
        )}
      </div>

      <div className="space-y-4 text-[14px] text-gray-300 font-medium">
        {profileData ? (
          <>
            <div><span className="font-bold text-white">Name:</span> {profileData.name}</div>
            {regNo && <div><span className="font-bold text-white">Reg No:</span> {regNo}</div>}
            {program && <div><span className="font-bold text-white">Program:</span> {program}</div>}
            <div><span className="font-bold text-white">Section:</span> {section || 'L1'}</div>
            <div><span className="font-bold text-white">Semester:</span> {semester ? `Semester ${semester}` : 'Semester 5'}</div>
            <div>
              <span className="font-bold text-white">Day Order:</span>{' '}
              <span className={displayDayOrder === 'Weekend' ? 'text-gray-400' : 'text-emerald-400 font-semibold'}>
                {displayDayOrder}
              </span>
            </div>
          </>
        ) : (
          <div className="text-gray-400 font-medium animate-pulse">
            Loading student profile...
          </div>
        )}
      </div>

      {/* Student Avatar */}
      <div className="flex justify-center mt-10 mb-4">
        <img
          src={`${API_URL}/api/v2/user/photo?token=${typeof window !== 'undefined' ? localStorage.getItem('unfugly_token') || '' : ''}`}
          alt="Profile"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden');
          }}
          className="w-[100px] h-[100px] rounded-full border-4 border-[#1E88E5] object-cover object-top shadow-lg"
        />
        <div className="hidden w-[100px] h-[100px] rounded-full border-4 border-[#1E88E5] bg-gradient-to-br from-[#1E88E5]/30 to-[#1E88E5]/10 flex items-center justify-center text-3xl font-bold text-[#1E88E5] shadow-lg tracking-wide select-none">
          {profileData?.name ? profileData.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : (netId ? netId.slice(0, 2).toUpperCase() : 'U')}
        </div>
      </div>

      {/* Bottom Actions Menu */}
      <div className="mt-auto relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex flex-col gap-1.5 p-3 w-12 h-12 justify-center items-center bg-[#2a2a2a] rounded-xl border border-[#444] hover:bg-[#333] transition ml-0 cursor-pointer"
          title="Menu"
        >
          <span className="w-5 h-0.5 bg-white"></span>
          <span className="w-5 h-0.5 bg-white"></span>
          <span className="w-5 h-0.5 bg-white"></span>
        </button>

        {isMenuOpen && (
          <div className="absolute left-0 bottom-[calc(100%+8px)] bg-[#1e1e1e] border border-[#444] rounded-xl shadow-[0_-5px_20px_rgba(0,0,0,0.5)] transition-all w-[240px] p-2 text-left z-50 flex flex-col gap-1">
            <button
              onClick={() => { setIsMenuOpen(false); router.push('/dashboard'); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-3 ${activePage === 'dashboard' ? 'bg-[#1E88E5] text-white' : 'text-gray-200 hover:bg-[#2a2a2a] hover:text-white'}`}
            >
              <CalendarDays className="w-4 h-4 text-emerald-400" /> Dashboard
            </button>

            <button
              onClick={() => { setIsMenuOpen(false); router.push('/profile'); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-3 ${activePage === 'profile' ? 'bg-[#1E88E5] text-white' : 'text-gray-200 hover:bg-[#2a2a2a] hover:text-white'}`}
            >
              <User className="w-4 h-4 text-[#1E88E5]" /> Profile
            </button>

            <button
              onClick={() => { setIsMenuOpen(false); router.push('/gpa'); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-3 ${activePage === 'gpa' ? 'bg-[#1E88E5] text-white' : 'text-gray-200 hover:bg-[#2a2a2a] hover:text-white'}`}
            >
              <Award className="w-4 h-4 text-amber-400" /> SGPA & CGPA
            </button>

            <button
              onClick={() => { setIsMenuOpen(false); router.push('/exams'); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-3 ${activePage === 'exams' ? 'bg-[#1E88E5] text-white' : 'text-gray-200 hover:bg-[#2a2a2a] hover:text-white'}`}
            >
              <BookOpen className="w-4 h-4 text-purple-400" /> Exam Timetable
            </button>

            <button
              onClick={() => { setIsMenuOpen(false); router.push('/calendar'); }}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-[#2a2a2a] hover:text-white rounded-lg transition-colors flex items-center gap-3"
            >
              <CalendarRange className="w-4 h-4 text-[#81C784]" /> Academic Calendar
            </button>

            <button
              onClick={() => { setIsMenuOpen(false); router.push('/feedback'); }}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-[#2a2a2a] hover:text-white rounded-lg transition-colors flex items-center gap-3"
            >
              <Rocket className="w-4 h-4 text-rose-400" /> Feedback
            </button>

            <div className="h-[1px] bg-[#333] my-1"></div>

            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-3"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
