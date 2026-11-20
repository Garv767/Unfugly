'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, BookOpen, Calendar, Clock, MapPin, Hash, Sparkles, RefreshCw } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { authFetch } from '@/utils/apiClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ExamItem {
  semester?: string;
  courseCode?: string;
  courseTitle?: string;
  dateSession?: string;
  hallNo?: string;
  seatNo?: string;
  // Aliases
  course_code?: string;
  course_title?: string;
  date_session?: string;
  hall_no?: string;
  seat_no?: string;
}

export default function ExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadExamsFromCache = () => {
    const netIdKey = Object.keys(localStorage).find(key => key.startsWith('unfuglyData_') && key !== 'unfuglyData_calendar');
    if (netIdKey) {
      const cachedStr = localStorage.getItem(netIdKey);
      if (cachedStr) {
        try {
          const parsed = JSON.parse(cachedStr);
          const list = parsed?.examTimetable || parsed?.exam_timetable || [];
          if (Array.isArray(list) && list.length > 0) {
            setExams(list);
            setLoading(false);
          }
        } catch (e) {}
      }
    }
  };

  const fetchFreshExams = async () => {
    try {
      setRefreshing(true);
      const res = await authFetch(`${API_URL}/api/v2/user/data`);
      const data = await res.json();
      if (data.success) {
        const list = data.examTimetable || data.exam_timetable || [];
        setExams(list);
      }
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExamsFromCache();
    fetchFreshExams();
  }, []);

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
          <BookOpen className="w-4 h-4 text-[#1E88E5]" /> Exam Timetable
        </h1>
        <button
          onClick={fetchFreshExams}
          disabled={refreshing}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#2a2a2a] transition-colors cursor-pointer"
          title="Refresh exams"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#1E88E5]' : ''}`} />
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto px-4 mt-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">University Examinations</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Official schedule published by Controller of Examinations (SRMIST)
            </p>
          </div>
          {exams.length > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#1E88E5]/20 text-[#64B5F6] border border-[#1E88E5]/30">
              {exams.length} Papers Scheduled
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-xl bg-[#1e1e1e] border border-[#333] animate-pulse"></div>
            ))}
          </div>
        ) : exams.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {exams.map((exam, idx) => {
              const code = exam.courseCode || exam.course_code || 'COURSE';
              const title = exam.courseTitle || exam.course_title || 'University Course';
              const dateSession = exam.dateSession || exam.date_session || 'To be announced';
              const hall = exam.hallNo || exam.hall_no || 'TBA';
              const seat = exam.seatNo || exam.seat_no || 'TBA';
              const sem = exam.semester || '';

              return (
                <div
                  key={idx}
                  className="bg-[#1e1e1e] border border-[#333] hover:border-[#444] rounded-xl p-5 shadow-lg transition-all duration-200 relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2d2d2d] pb-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#64B5F6] font-mono">{code}</span>
                        {sem && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#2a2a2a] text-gray-300 border border-[#3a3a3a]">
                            Sem {sem}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-white mt-1">{title}</h3>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#252525] border border-[#3a3a3a]">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-semibold text-white">{dateSession}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 block">Hall No.</span>
                      <span className="font-bold text-white text-sm flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#1E88E5]" /> {hall}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Seat No.</span>
                      <span className="font-bold text-white text-sm flex items-center gap-1 mt-0.5">
                        <Hash className="w-3.5 h-3.5 text-purple-400" /> {seat}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Reporting Time</span>
                      <span className="font-semibold text-gray-200 mt-0.5 block">
                        {dateSession.includes('AN') ? '01:00 PM' : '09:00 AM'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Status</span>
                      <span className="font-semibold text-emerald-400 mt-0.5 block">
                        Hall Ticket Issued
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-10 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-[#2a2a2a] border border-[#444] mx-auto flex items-center justify-center text-gray-400">
              <Sparkles className="w-8 h-8 text-[#1E88E5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No Upcoming Exams Scheduled</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                No end-semester or mid-term examination timetable has been published on Student Portal by the Controller of Examinations for this cycle yet.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-5 py-2.5 bg-[#1E88E5] hover:bg-[#1976D2] text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
