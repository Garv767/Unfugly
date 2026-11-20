'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, User, ShieldCheck, Award, BookOpen, Building2, Calendar, Hash, Layers, KeyRound, LogOut, CheckCircle2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
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

  const dayOrder = getDayOrderForDate(new Date(), calendarData) || profileData?.dayOrder || 'N/A';

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
    <div className="min-h-screen bg-[#121212] text-white flex flex-col font-sans pb-24 lg:pb-12">
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
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1E88E5]/20 text-[#64B5F6] border border-[#1E88E5]/30">
                  {netId.toUpperCase() || 'SRMIST'}
                </span>
                {profileData?.registrationNo || profileData?.registration_no ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#333] text-gray-300 border border-[#444]">
                    Reg: {profileData?.registrationNo || profileData?.registration_no}
                  </span>
                ) : null}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active Student
                </span>
              </div>
              <p className="text-sm text-gray-400 pt-1">
                {profileData?.programmeBranch || profileData?.programme_branch || 'Undergraduate Engineering & Technology'}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#2a2a2a] text-[#1E88E5]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Section</div>
              <div className="text-lg font-bold text-white mt-0.5">
                {profileData?.section || 'Section A'}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">Assigned Class Group</div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#2a2a2a] text-purple-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Semester</div>
              <div className="text-lg font-bold text-white mt-0.5">
                {profileData?.semester ? `Semester ${profileData.semester}` : 'Current Semester'}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">Academic Cycle 2026-27</div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#2a2a2a] text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Today's Day Order</div>
              <div className="text-lg font-bold text-white mt-0.5">
                {dayOrder}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">Timetable Cycle Rotation</div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#2a2a2a] text-amber-400">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Net ID / Username</div>
              <div className="text-lg font-bold text-white mt-0.5 font-mono">
                {netId.toLowerCase()}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">SRM Central Single Sign-On</div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4 flex items-start gap-3.5 sm:col-span-2">
            <div className="p-2.5 rounded-lg bg-[#2a2a2a] text-[#64B5F6]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Department & School</div>
              <div className="text-base font-semibold text-white mt-0.5">
                {profileData?.schoolDepartment || profileData?.school_department || 'School of Computing, SRMIST Kattankulathur'}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">Main Campus, Kattankulathur, Chennai</div>
            </div>
          </div>
        </div>

        {/* Portals Connection Status */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Connected Academic Portals
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#252525] border border-[#3a3a3a]">
              <div>
                <div className="text-sm font-semibold text-white">Student Portal (SP)</div>
                <div className="text-xs text-gray-400">Attendance, Marks & Exams</div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#252525] border border-[#3a3a3a]">
              <div>
                <div className="text-sm font-semibold text-white">Academia Portal</div>
                <div className="text-xs text-gray-400">Official Course Timetable</div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Connected
              </span>
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
  );
}
