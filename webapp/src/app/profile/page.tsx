'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, User, Award, BookOpen, Calendar, Layers, LogOut } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import { authFetch } from '@/utils/apiClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [netId, setNetId] = useState<string>('');

  useEffect(() => {
    // 1. Instant load from localStorage
    const netIdKey = Object.keys(localStorage).find(key => key.startsWith('unfuglyData_') && key !== 'unfuglyData_calendar');
    if (netIdKey) {
      const cachedStr = localStorage.getItem(netIdKey);
      if (cachedStr) {
        try {
          const parsed = JSON.parse(cachedStr);
          setProfileData(parsed?.profileData || null);
          setNetId(parsed?.netId || '');
        } catch (e) {}
      }
    }

    const cachedCal = localStorage.getItem('unfuglyData_calendar');
    if (cachedCal) {
      try {
        setCalendarData(JSON.parse(cachedCal));
      } catch (e) {}
    }

    // 2. Fetch fresh user data
    authFetch(`${API_URL}/api/v2/user/data`)
      .then(res => res.json())
      .then(d => {
        if (d.success && d.profileData) {
          setProfileData(d.profileData);
          if (d.netId) setNetId(d.netId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getDayOrderForDate = (date: Date, calData: any) => {
    if (!calData) return null;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = String(date.getFullYear()).slice(2);
    const monthKey = `${months[date.getMonth()]} '${year}`;
    const dayKey = String(date.getDate());
    const dayData = calData[monthKey]?.[dayKey];
    if (!dayData || dayData.dayOrder === '-') return null;
    return dayData.dayOrder;
  };

  const rawDayOrder = getDayOrderForDate(new Date(), calendarData) || profileData?.dayOrder;
  const dayOrder = (rawDayOrder && rawDayOrder !== '-' && rawDayOrder !== 'N/A' && rawDayOrder !== 'NA')
    ? (String(rawDayOrder).toLowerCase().startsWith('day') ? rawDayOrder : `Day ${rawDayOrder}`)
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

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col lg:flex-row font-sans overflow-hidden">
      {/* Desktop Sidebar on Laptop/Desktop View */}
      <DesktopSidebar
        profileData={profileData}
        calendarData={calendarData}
        netId={netId}
        activePage="profile"
      />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto custom-scrollbar pb-24 lg:pb-12">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-[#1e1e1e]/80 backdrop-blur-xl border-b border-[#333] px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors bg-[#2a2a2a] px-3 py-1.5 rounded-lg border border-[#444] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-[#1E88E5]" /> Student Profile
          </h1>
          <div className="w-20"></div>
        </header>

        {/* Main Container */}
        <main className="max-w-3xl w-full mx-auto px-4 mt-6 space-y-6">
          {/* Profile Card Header */}
          <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#1E88E5]/20 to-transparent pointer-events-none rounded-bl-full"></div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
              {/* Student Photo */}
              <div className="relative shrink-0">
                <img
                  src={`${API_URL}/api/v2/user/photo?token=${typeof window !== 'undefined' ? localStorage.getItem('unfugly_token') || '' : ''}`}
                  alt="Profile"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden');
                  }}
                  className="w-28 h-28 rounded-2xl border-4 border-[#1E88E5] object-cover object-top shadow-xl"
                />
                <div className="hidden w-28 h-28 rounded-2xl border-4 border-[#1E88E5] bg-gradient-to-br from-[#1E88E5]/30 to-[#1E88E5]/10 flex items-center justify-center text-4xl font-bold text-[#1E88E5] shadow-xl select-none">
                  {profileData?.name ? profileData.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : (netId.slice(0, 2).toUpperCase() || 'U')}
                </div>
              </div>

              {/* Basic Info */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {profileData?.name || netId.toUpperCase() || 'Student'}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {profileData?.registrationNo || profileData?.registration_no ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#2a2a2a] text-gray-200 border border-[#444]">
                      Reg No: <span className="text-white font-mono">{profileData?.registrationNo || profileData?.registration_no}</span>
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-gray-300 pt-1 font-medium">
                  {profileData?.programmeBranch || profileData?.programme_branch || 'Undergraduate Engineering & Technology'}
                </p>
              </div>
            </div>
          </div>

          {/* The 3 Core Academic Metadata Cards: Semester, Section, Day Order */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4 flex items-start gap-3.5 shadow-lg">
              <div className="p-2.5 rounded-lg bg-[#2a2a2a] text-purple-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Semester</div>
                <div className="text-lg font-bold text-white mt-0.5">
                  {profileData?.semester ? `Semester ${profileData.semester}` : 'Semester 5'}
                </div>
              </div>
            </div>

            <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4 flex items-start gap-3.5 shadow-lg">
              <div className="p-2.5 rounded-lg bg-[#2a2a2a] text-[#1E88E5]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Section</div>
                <div className="text-lg font-bold text-white mt-0.5">
                  {profileData?.section || 'L1'}
                </div>
              </div>
            </div>

            <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4 flex items-start gap-3.5 shadow-lg">
              <div className="p-2.5 rounded-lg bg-[#2a2a2a] text-emerald-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Today's Day Order</div>
                <div className="text-lg font-bold text-white mt-0.5">
                  {dayOrder}
                </div>
              </div>
            </div>
          </div>

        {/* Account Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push('/gpa')}
            className="flex-1 py-3 px-4 bg-[#2a2a2a] hover:bg-[#333] border border-[#444] text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>SGPA & CGPA Calculator</span>
          </button>
          <button
            onClick={() => router.push('/exams')}
            className="flex-1 py-3 px-4 bg-[#2a2a2a] hover:bg-[#333] border border-[#444] text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-[#1E88E5]" />
            <span>Exam Schedule</span>
          </button>
          <button
            onClick={handleLogout}
            className="py-3 px-5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </main>

      <BottomNav />
      </div>
    </div>
  );
}
