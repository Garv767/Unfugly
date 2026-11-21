'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TimetableView from '@/components/TimetableView';
import AttendancePredict from '@/components/AttendancePredict';
import AttendanceView from '@/components/AttendanceView';
import MarksView from '@/components/MarksView';
import BottomNav from '@/components/BottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import { CalendarRange, LogOut, Rocket, ShieldCheck, RefreshCw, X, Eye, EyeOff, KeyRound, User, Award, BookOpen } from 'lucide-react';
import { authFetch } from '@/utils/apiClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getISTString() {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const day   = ist.getDate();
    const month = ist.toLocaleString('en-US', { month: 'short' });
    const year  = ist.getFullYear();
    let   hours = ist.getHours();
    const mins  = String(ist.getMinutes()).padStart(2, '0');
    const ampm  = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${hours}:${mins} ${ampm}`;
}

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
  const [showUpdatePasswordModal, setShowUpdatePasswordModal] = useState(false);
  const [newSpPassword, setNewSpPassword] = useState('');
  const [showNewSpPassword, setShowNewSpPassword] = useState(false);
  const [updatePasswordLoading, setUpdatePasswordLoading] = useState(false);
  const [updatePasswordError, setUpdatePasswordError] = useState('');
  const [updatePasswordSuccess, setUpdatePasswordSuccess] = useState('');
  const [requiresPasswordUpdate, setRequiresPasswordUpdate] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
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
    authFetch(`${API_URL}/api/v2/user/data`)
    .then(res => {
      if (res.status === 401 || res.status === 403) { 
        if (typeof window !== 'undefined') {
          localStorage.removeItem('unfugly_token');
          localStorage.removeItem('unfugly_refresh_token');
        }
        router.push('/login'); 
        return null; 
      }
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

      if (cachedData.requiresSpPasswordUpdate) {
        setRequiresPasswordUpdate(true);
        setPasswordErrorMessage(cachedData.spError || 'Invalid login credentials. The user ID or password entered is invalid.');
      }
      
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
    authFetch(`${API_URL}/api/v2/calendar${calendarParams}`)
      .then(res => res.ok ? res.json() : null)
      .then(calData => { if (calData && !calData.error) setCalendarData(calData.calendarJson || calData.calendar_json || calData); })
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
      const eventSource = new EventSource(`${API_URL}/api/v2/sync/progress/${net_id}`);
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

    authFetch(`${API_URL}/api/v2/sync/all`, {
      method:      'POST',
    })
    .then(res => {
        if (res.status === 401 || res.status === 403) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('unfugly_token');
              localStorage.removeItem('unfugly_refresh_token');
            }
            router.push('/login');
            return null;
        }
        return res.json();
    })
    .then(scrapedData => {
      if (!scrapedData) return;
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

      if (scrapedData.requires_sp_password_update || scrapedData.is_invalid_credentials) {
        setRequiresPasswordUpdate(true);
        setPasswordErrorMessage(scrapedData.sp_error || 'Invalid login credentials. The user ID or password entered is invalid.');
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

          const newCourseMap = scrapedData.courseData;
          let cachedCourse = prev?.courseData || {};
          // Flatten legacy slotToCourse structure if it exists
          if (cachedCourse.slotToCourse) {
              cachedCourse = { ...cachedCourse.slotToCourse, ...cachedCourse };
              delete cachedCourse.slotToCourse;
          }
          const mergedCourse = newCourseMap && Object.keys(newCourseMap).length > 0
              ? newCourseMap
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
            authFetch(`${API_URL}/api/v1/user/save`, {
              method:      'POST',
              headers: { 'Content-Type': 'application/json' },
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
                lastUpdated:    getISTString()
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

  const handleUpdateSpPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpPassword) {
      setUpdatePasswordError('Please enter your Student Portal password');
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('unfugly_token') : null;
    let netId = (data?.netId || '').toLowerCase().trim();
    if (!netId && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload?.net_id) netId = payload.net_id.toLowerCase().trim();
        else if (payload?.user_metadata?.user_net_id) netId = payload.user_metadata.user_net_id.toLowerCase().trim();
      } catch {}
    }

    setUpdatePasswordLoading(true);
    setUpdatePasswordError('');
    try {
      const res = await authFetch(`${API_URL}/api/v2/auth/connect-sp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sp_password: newSpPassword
        })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to update password');
      }
      setUpdatePasswordSuccess('Portal password verified and updated! Syncing fresh academic data...');
      setRequiresPasswordUpdate(false);
      setTimeout(() => {
        setShowUpdatePasswordModal(false);
        setUpdatePasswordSuccess('');
        setNewSpPassword('');
        scrapingStarted.current = false;
        startScraping(false, netId);
      }, 1000);
    } catch (err: any) {
      setUpdatePasswordError(err.message);
    } finally {
      setUpdatePasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/v2/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('unfugly_token');
        localStorage.removeItem('unfugly_refresh_token');
        localStorage.clear();
        sessionStorage.clear();
      }
      router.push('/login');
    }
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
          {Object.values(partialErrors).map((msg, i) => {
            const text = typeof msg === 'string' 
              ? msg 
              : (msg && typeof msg === 'object' && ((msg as any).error || (msg as any).message))
                ? ((msg as any).error || (msg as any).message)
                : JSON.stringify(msg);
            return (
              <div key={i} className="flex items-start gap-3 bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 shadow-2xl animate-pulse">
                <svg className="w-5 h-5 text-[#e57373] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-[#e57373] text-sm">{text}</p>
              </div>
            );
          })}
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

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} calendarData={calendarData} />

      {/* Main Layout Area */}
            {/* Desktop Sidebar */}
            <DesktopSidebar
              profileData={uiData.profileData}
              calendarData={calendarData}
              netId={uiData.netId}
              activePage="dashboard"
            />

            {/* Main Content */}
            <main className="flex-1 p-4 lg:p-8 lg:m-4 lg:ml-2 lg:bg-[#2a2a2a] lg:rounded-2xl h-[calc(100vh-140px)] lg:h-[calc(100vh-32px)] overflow-y-auto w-full relative custom-scrollbar">
               
               
               <div className="max-w-[1400px] mx-auto space-y-12 pb-4 lg:pb-0">
                   {/* Student Portal Password Update Banner only when credentials explicitly invalid */}
                   {requiresPasswordUpdate && (
                      <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-xs animate-in fade-in">
                        <div className="flex items-center gap-2 text-red-300">
                          <span className="text-base">⚠️</span>
                          <span>{passwordErrorMessage || 'Invalid login credentials. The user ID or password entered is invalid. Please re-enter your password.'}</span>
                        </div>
                        <button
                          onClick={() => setShowUpdatePasswordModal(true)}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors cursor-pointer shrink-0 ml-3"
                        >
                          Re-enter Password
                        </button>
                      </div>
                   )}

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

       {/* Portal Password Update Modal */}
       {showUpdatePasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-left">
                <button
                   onClick={() => setShowUpdatePasswordModal(false)}
                   className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                   <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#333]">
                   <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <KeyRound className="w-5 h-5" />
                   </div>
                   <div>
                      <h3 className="text-sm font-bold text-white">Update Student Portal Password</h3>
                      <p className="text-xs text-gray-400">Save your new portal password to resume automatic background sync</p>
                   </div>
                </div>

                <form onSubmit={handleUpdateSpPassword} className="space-y-4">
                   <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                         Student Portal Password
                      </label>
                      <div className="relative">
                         <input
                            type={showNewSpPassword ? 'text' : 'password'}
                            placeholder="Enter your Student Portal password"
                            value={newSpPassword}
                            onChange={(e) => setNewSpPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2 pr-10 bg-[#121212] border border-[#333] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                         />
                         <button
                            type="button"
                            onClick={() => setShowNewSpPassword(!showNewSpPassword)}
                            tabIndex={-1}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"
                         >
                            {showNewSpPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                         </button>
                      </div>
                   </div>

                   {updatePasswordError && (
                      <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                         {updatePasswordError}
                      </div>
                   )}

                   {updatePasswordSuccess && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                         {updatePasswordSuccess}
                      </div>
                   )}

                   <button
                      type="submit"
                      disabled={updatePasswordLoading || !newSpPassword}
                      className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                   >
                      {updatePasswordLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Save & Sync'}
                   </button>
                </form>
             </div>
          </div>
       )}
    </div>
  );
}
