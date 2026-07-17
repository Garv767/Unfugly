'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TimetableView from '@/components/TimetableView';
import AttendancePredict from '@/components/AttendancePredict';
import AttendanceView from '@/components/AttendanceView';
import MarksView from '@/components/MarksView';
import BottomNav from '@/components/BottomNav';
import { CalendarRange, LogOut, Rocket } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Timetable');

  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) {
          setActiveTab(tab);
      } else {
          const saved = localStorage.getItem('dashboard_active_tab');
          if (saved) setActiveTab(saved);
      }
  }, []);

  useEffect(() => {
      localStorage.setItem('dashboard_active_tab', activeTab);
  }, [activeTab]);
  const [loading, setLoading] = useState(true);
  const [isBgScraping, setIsBgScraping] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [cookieTsv, setCookieTsv] = useState('');
  const [cookieLoading, setCookieLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('Initializing...');
  const [data, setData] = useState<any>(null);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [timetableViewState, setTimetableViewState] = useState<'show' | 'hide'>('show');
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [partialErrors, setPartialErrors] = useState<Record<string,string>>({});
  const [showErrorToast, setShowErrorToast] = useState(false);
  const scrapingStarted = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // 1. Instantly load from localStorage for UI caching using the self-cleaning key strategy
    const netIdKey = Object.keys(localStorage).find(key => key.startsWith('unfuglyData_') && key !== 'unfuglyData_calendar');
    if (netIdKey) {
      const cachedStr = localStorage.getItem(netIdKey);
      if (cachedStr) {
        try {
          setData(JSON.parse(cachedStr));
          setLoading(false);
        } catch(e) {}
      }
    }

    // 2. Auth check via cookie — verify and fetch fresh DB cache data
    fetch(`${API_URL}/api/v1/user/data`, { credentials: 'include', headers: { ...((typeof window !== 'undefined' && localStorage.getItem('unfugly_token')) ? { Authorization: 'Bearer ' + localStorage.getItem('unfugly_token') } : {}) } })
    .then(res => {
      if (res.status === 401) { router.push('/login'); return null; }
      return res.json();
    })
    .then(cachedData => {
      if (!cachedData) return;
      if (cachedData.error) {
        setLoading(false);
        startScraping(true);
        return;
      }
      // Set data even if profileData is null (for graceful degradation)
      setData(cachedData);
      setLoading(false);
      
      // Only save to localStorage if we have any data
      if (cachedData.profileData || cachedData.attendanceData || cachedData.marksData || cachedData.timetableHTML) {
        const targetKey = `unfuglyData_${cachedData.netId}`;
        const dataToSave = { ...cachedData };
        delete dataToSave.netId;
        delete dataToSave.timetableHTML;
        localStorage.setItem(targetKey, JSON.stringify(dataToSave));
      }
      
      // Always background-scrape for fresh data regardless of cached data state
      startScraping(true, cachedData.netId);
    })
    .catch(() => {
      setLoading(false);
      startScraping(true);
    });

    // Fetch calendar data — must include the current semester param
    // Semester is derived from the cached profile data or defaults to the current academic year.
    const currentSemester = (() => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth(); // 0-11
      
      if (currentYear === 2025) {
          if (currentMonth >= 6) return '2025_26_ODD';
          return '2024_25_EVEN';
      } else if (currentYear === 2026) {
          if (currentMonth < 6) return '2025_26_EVEN';
          return '2026_27_ODD';
      }
      return '2026_27_ODD'; // default fallback
    })();
    const calendarParams = `?semester=${encodeURIComponent(currentSemester)}`;
    fetch(`${API_URL}/api/v1/calendar${calendarParams}`, {
      credentials: 'include',
      headers: { ...((typeof window !== 'undefined' && localStorage.getItem('unfugly_token')) ? { Authorization: 'Bearer ' + localStorage.getItem('unfugly_token') } : {}) }
    })
      .then(res => res.ok ? res.json() : null)
      .then(calData => { if (calData && !calData.error) setCalendarData(calData.calendar_json || calData); })
      .catch(() => {});

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const startScraping = (isBackground = false, forcedNetId?: string) => {
    if (scrapingStarted.current) return;
    scrapingStarted.current = true;

    if (isBackground) setIsBgScraping(true);
    else setLoading(true);

    // net_id: prefer server-verified value, then decode from JWT token in localStorage,
    // then fall back to the netId already in state.
    let net_id = (forcedNetId || data?.netId || '').toLowerCase();
    if (!net_id) {
      // Try to decode from localStorage JWT (for new users where /user/data returned 404)
      try {
        const token = localStorage.getItem('unfugly_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload?.net_id) net_id = payload.net_id.toLowerCase();
        }
      } catch {}
    }

    if (net_id) {
      const eventSource = new EventSource(`${API_URL}/api/v1/scrape/progress/${net_id}`);
      eventSourceRef.current = eventSource;
      eventSource.onmessage = (event) => {
        const parsed = JSON.parse(event.data);
        if (parsed.step === 'connected') return;
        setProgressMsg(parsed.message);
        if (parsed.step === 'complete' || parsed.step === 'error') {
          eventSource.close();
          eventSourceRef.current = null;
        }
      };
    }

    fetch(`${API_URL}/api/v1/scrape/all`, {
      method:      'POST',
      credentials: 'include',
      headers:     { ...((typeof window !== 'undefined' && localStorage.getItem('unfugly_token')) ? { Authorization: 'Bearer ' + localStorage.getItem('unfugly_token') } : {}) }
    })
    .then(res => res.json())
    .then(scrapedData => {
      if (scrapedData.error) {
        // Reset guard so user can retry without a full reload
        scrapingStarted.current = false;
        setLoading(false);
        setIsBgScraping(false);
        if (isBackground) {
          setPartialErrors({ scrape: scrapedData.error });
          setShowErrorToast(true);
          setTimeout(() => setShowErrorToast(false), 6000);
        } else {
          setError(scrapedData.error + (scrapedData.error.includes('Too many') ? '' : ' — Please log in again.'));
        }
        return;
      }

      if (scrapedData.errors && Object.keys(scrapedData.errors).length > 0) {
        setPartialErrors(scrapedData.errors);
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 6000);
      }

      setData((prev: any) => {
          // Helper: use new value if it's truthy/non-empty, else keep cached
          const pick = (newVal: any, cachedVal: any) => {
              if (Array.isArray(newVal)) return newVal.length > 0 ? newVal : cachedVal;
              if (newVal && typeof newVal === 'object') return Object.keys(newVal).length > 0 ? newVal : cachedVal;
              return newVal || cachedVal;
          };

          const newCourseMap = scrapedData.courseSlotMap;
          const cachedCourse = prev?.courseData;
          const mergedCourse = newCourseMap && Object.keys(newCourseMap).length > 0
              ? { ...(cachedCourse || {}), ...newCourseMap }
              : cachedCourse;

          const mergedData = {
              ...prev,
              profileData: {
                  ...(prev?.profileData || {}),
                  ...(scrapedData.profileData || {})
              },
              attendanceData: pick(scrapedData.attendanceData, prev?.attendanceData),
              marksData:      pick(scrapedData.marksData, prev?.marksData),
              timetableHTML:  pick(scrapedData.timetableHTML, prev?.timetableHTML),
              timetableJSON:  pick(scrapedData.timetableJSON, prev?.timetableJSON),
              courseData:     mergedCourse,
              editedSlots:    prev?.editedSlots || {}
          };

          setLoading(false);
          setIsBgScraping(false);
          sessionStorage.setItem('unfugly_bg_scraped', '1');

          // Save back to DB only if we got useful new data and have a valid netId
          const saveNetId = mergedData.netId || net_id;
          if (saveNetId && mergedData.profileData?.name) {
            fetch(`${API_URL}/api/v1/user/save`, {
              method:      'POST',
              headers: { 'Content-Type': 'application/json', ...((typeof window !== 'undefined' && localStorage.getItem('unfugly_token')) ? { Authorization: 'Bearer ' + localStorage.getItem('unfugly_token') } : {}) },
              credentials: 'include',
              body: JSON.stringify({
                netId:          saveNetId,
                profileData:    mergedData.profileData,
                attendanceData: mergedData.attendanceData,
                marksData:      mergedData.marksData,
                timetable_html: mergedData.timetableHTML,
                timetableJSON:  mergedData.timetableJSON,
                courseData:     mergedData.courseData,
                editedSlots:    mergedData.editedSlots,
                source:         'webapp',
                lastUpdated:    new Date().toISOString()
              })
            }).catch(() => {});
          }
          return mergedData;
      });
    })
    .catch(() => {
      setLoading(false);
      setIsBgScraping(false);
      // Background scrape crash — silently stay on cached data, don't show error
      if (!isBackground) {
        setError('Failed to connect. Please try logging in again.');
      }
    });

  };

  const handleLogout = async () => {
    await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    router.push('/login');
  };

  const [error, setError] = useState('');

  if (loading) {
      // Skeleton loader for initial cold load when no data exists yet
      return (
         <div className="min-h-screen bg-[#121212] flex flex-col lg:flex-row font-sans overflow-hidden">
            {/* Mobile Header Skeleton */}
            <header className="lg:hidden sticky top-0 z-50 bg-[#1e1e1e] border-b border-[#333] px-6 py-4 flex justify-between items-center w-full">
               <div className="w-24 h-8 bg-gray-800 rounded-md animate-pulse"></div>
               <div className="w-10 h-10 bg-gray-800 rounded-full animate-pulse"></div>
            </header>

            {/* Desktop Sidebar Skeleton */}
            <aside className="hidden lg:flex w-[260px] xl:w-[300px] bg-[#2a2a2a] m-4 mr-2 rounded-2xl p-6 flex-col h-[calc(100vh-32px)]">
               <div className="w-32 h-8 bg-gray-800 rounded mb-6 animate-pulse"></div>
               <div className="space-y-4 mb-10">
                 {[1,2,3,4,5,6].map(i => <div key={i} className="w-full h-5 bg-gray-800 rounded animate-pulse"></div>)}
               </div>
               <div className="w-[100px] h-[100px] mx-auto rounded-full bg-gray-800 animate-pulse mt-4"></div>
               <div className="mt-auto w-12 h-12 bg-gray-800 rounded-xl animate-pulse"></div>
            </aside>

            {/* Main Area Skeleton */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 lg:pl-4">
               <div className="bg-[#1e1e1e] rounded-3xl p-6 lg:p-8 min-h-[calc(100vh-48px)] border border-[#333]">
                  <div className="flex justify-between items-center mb-8">
                     <div className="w-48 h-10 bg-gray-800 rounded-xl animate-pulse"></div>
                  </div>
                  <div className="space-y-4">
                     {[1,2,3,4,5].map(i => (
                        <div key={i} className="w-full h-24 bg-gray-800 rounded-2xl animate-pulse"></div>
                     ))}
                  </div>
               </div>
            </main>
         </div>
      );
  }

  // Create robust uiData fallback mapping to prevent client-side TypeError crashes when data is null/empty
  const uiData = data || {
      profileData: null,
      attendanceData: [],
      marksData: [],
      timetableHTML: null,
      timetableJSON: null,
      courseData: {},
      editedSlots: {},
      netId: ''
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col lg:flex-row font-sans overflow-hidden">

      {/* Partial scrape error toast */}
      {showErrorToast && Object.keys(partialErrors).length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90%] max-w-md">
          {Object.values(partialErrors).map((msg, i) => (
            <div key={i} className="flex items-start gap-3 bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 shadow-2xl animate-pulse">
              <svg className="w-5 h-5 text-[#e57373] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-[#e57373] text-sm">{msg}</p>
            </div>
          ))}
        </div>
      )}

      {/* Full-page error state */}
      {error && (
        <div className="fixed inset-0 bg-[#121212] z-[200] flex items-center justify-center p-6">
          <div className="bg-[#2a1a1a] border border-[#e57373]/40 rounded-2xl p-8 max-w-md text-center">
            <svg className="w-12 h-12 text-[#e57373] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[#e57373] font-bold text-lg mb-2">Something went wrong</p>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <button onClick={handleLogout} className="px-6 py-2 bg-[#1E88E5] text-white rounded-lg font-bold hover:bg-[#1565C0] transition">
              Logout & Back to Login
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation Bar (Mobile Only) */}
      <header className="lg:hidden sticky top-0 z-50 bg-[#1e1e1e]/95 backdrop-blur-md shadow-md px-5 py-4 w-full flex items-center justify-between">
         <div className="flex justify-between items-center w-full">
            <h2 className="text-2xl font-bold text-white tracking-tight mr-4">{activeTab}</h2>
            
            <div id="mobile-header-actions-Timetable" className={`${activeTab === 'Timetable' ? 'flex' : 'hidden'} items-center justify-end overflow-x-auto custom-scrollbar hide-scrollbar ml-auto`}></div>
            <div id="mobile-header-actions-Attendance" className={`${activeTab === 'Attendance' ? 'flex' : 'hidden'} items-center justify-end overflow-x-auto custom-scrollbar hide-scrollbar ml-auto`}></div>
            <div id="mobile-header-actions-Marks" className={`${activeTab === 'Marks' ? 'flex' : 'hidden'} items-center justify-end overflow-x-auto custom-scrollbar hide-scrollbar ml-auto`}></div>
         </div>
      </header>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Layout Area */}
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-[260px] xl:w-[300px] bg-[#2a2a2a] m-4 mr-2 rounded-2xl p-6 flex-col flex-shrink-0 h-[calc(100vh-32px)] overflow-y-auto custom-scrollbar">
               <h2 className="text-white text-2xl font-bold mb-6">Profile</h2>
               <div className="space-y-4 text-[14px] text-gray-300 font-medium">
                 {uiData.profileData ? (
                   <>
                     <div><span className="font-bold text-white">Name:</span> {uiData.profileData.name}</div>
                     <div><span className="font-bold text-white">Reg No:</span> {uiData.profileData.registrationNo}</div>
                     <div><span className="font-bold text-white">Program:</span> {uiData.profileData.programmeBranch}</div>
                     <div><span className="font-bold text-white">Section:</span> {uiData.profileData.section}</div>
                     <div><span className="font-bold text-white">Semester:</span> {uiData.profileData.semester || '4'}</div>
                     <div><span className="font-bold text-white">Day Order:</span> {uiData.profileData.dayOrder || 'No Day Order'}</div>
                     <div><span className="font-bold text-white mt-2 block">Department:</span> {uiData.profileData.schoolDepartment}</div>
                   </>
                 ) : (
                   <div className="text-red-400 font-medium">
                     Profile page currently unavailable. Please try again later.
                   </div>
                 )}
               </div>
               <div className="flex justify-center mt-10 mb-4">
                  <img 
                     src={`${API_URL}/api/v1/user/photo?token=${typeof window !== 'undefined' ? localStorage.getItem('unfugly_token') || '' : ''}`} 
                     alt="Profile" 
                     onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }} 
                     className="w-[100px] h-[100px] rounded-full border-4 border-[#1E88E5] object-cover shadow-lg" 
                  />
                  <div className="hidden w-[100px] h-[100px] rounded-full border-4 border-[#1E88E5] bg-gradient-to-br from-[#1E88E5]/30 to-[#1E88E5]/10 flex items-center justify-center text-3xl font-bold text-[#1E88E5] shadow-lg tracking-wide select-none">
                     {uiData.profileData?.name ? uiData.profileData.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
                  </div>
               </div>
               
               <div className="mt-auto relative">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex flex-col gap-1.5 p-3 w-12 h-12 justify-center items-center bg-[#2a2a2a] rounded-xl border border-[#444] hover:bg-[#333] transition ml-0 cursor-pointer">
                     <span className="w-5 h-0.5 bg-white"></span>
                     <span className="w-5 h-0.5 bg-white"></span>
                     <span className="w-5 h-0.5 bg-white"></span>
                  </button>
                  
                  {isMenuOpen && (
                     <div className="absolute left-0 bottom-[calc(100%+8px)] bg-[#1e1e1e] border border-[#444] rounded-xl shadow-[0_-5px_20px_rgba(0,0,0,0.5)] transition-all w-[240px] p-2 text-left z-50 flex flex-col gap-1">
                        <button onClick={() => router.push('/feedback')} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-[#2a2a2a] hover:text-white rounded-lg transition-colors flex items-center gap-3">
                           <Rocket className="w-4 h-4 text-purple-400" /> Feedback Fastrack
                        </button>
                        
                        <button onClick={() => router.push('/calendar')} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-[#2a2a2a] hover:text-white rounded-lg transition-colors flex items-center gap-3">
                           <CalendarRange className="w-4 h-4 text-[#1E88E5]" /> Calendar
                        </button>
                        
                        <div className="flex gap-2 px-4 py-1 mt-0.5">
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
                        
                        <div className="px-4 py-2 mt-1 border-t border-[#333] text-sm text-gray-300 font-bold truncate">
                           {uiData.profileData?.name || 'Profile Unavailable'}
                        </div>
                        
                        <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-bold text-[#ff5252] hover:bg-[#ff5252]/10 hover:translate-x-1 active:scale-[0.98] rounded-lg transition-all duration-200 flex items-center gap-3">
                           <LogOut className="w-4 h-4" /> Logout
                        </button>
                     </div>
                  )}
               </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 lg:p-8 lg:m-4 lg:ml-2 lg:bg-[#2a2a2a] lg:rounded-2xl h-[calc(100vh-140px)] lg:h-[calc(100vh-32px)] overflow-y-auto w-full relative custom-scrollbar">
               
               
               <div className="max-w-[1400px] mx-auto space-y-12 pb-4 lg:pb-0">
                   {/* Timetable Section */}
                   <div className={`w-full overflow-x-auto lg:min-w-[700px] ${activeTab === 'Timetable' ? 'block pb-16' : 'hidden lg:block'}`}>
                       {(uiData.timetableHTML || (uiData.timetableJSON && uiData.timetableJSON.days)) ? (
                           <TimetableView 
                             htmlContent={uiData.timetableHTML || ''} 
                             courseData={uiData.courseData} 
                             netId={uiData.netId} 
                             calendarData={calendarData}
                             timetableJSON={uiData.timetableJSON}
                             profileData={uiData.profileData}
                             dbEditedSlots={uiData.editedSlots}
                           />
                       ) : (isBgScraping && (
                           <div className="w-full h-[300px] rounded-xl bg-[#1e1e1e] border border-[#333] animate-pulse flex items-center justify-center">
                               <div className="text-gray-400 font-medium">Syncing Timetable...</div>
                           </div>
                       ))}
                   </div>

             
             {/* Attendance Section */}
             <div className={`lg:min-w-[700px] ${activeTab === 'Attendance' ? 'block pb-16' : 'hidden lg:block'}`}>
                <AttendanceView data={uiData} isBgScraping={isBgScraping} />
             </div>

             
             {/* Marks Section */}
             <div className={`lg:min-w-[700px] ${activeTab === 'Marks' ? 'block pb-32' : 'hidden lg:block'}`}>
                <h2 className="text-2xl font-bold text-white mb-6 hidden lg:block">Marks</h2>
                <MarksView data={uiData} isBgScraping={isBgScraping} />
             </div>

         </div>
      </main>
    </div>
  );
}
