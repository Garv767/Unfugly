'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TimetableView from '@/components/TimetableView';
import AttendancePredict from '@/components/AttendancePredict';
import BottomNav from '@/components/BottomNav';
import { CalendarRange, LogOut, Rocket } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Timetable');
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
    // Auth check via cookie — no localStorage needed.
    // If the server returns 401, the cookie is missing or expired.
    fetch(`${API_URL}/api/v1/user/data`, { credentials: 'include' })
    .then(res => {
      if (res.status === 401) { router.push('/login'); return null; }
      return res.json();
    })
    .then(cachedData => {
      if (!cachedData) return;
      if (cachedData.profileData) {
          setData(cachedData);
          setLoading(false);
          // Always background-scrape for fresh data
          startScraping(true);
      } else {
          // No cached profile at all — foreground scrape (first time user)
          startScraping(false);
      }
    })
    .catch(() => startScraping(false));

    // Fetch calendar data
    fetch(`${API_URL}/api/v1/calendar`)
      .then(res => res.json())
      .then(calData => setCalendarData(calData))
      .catch(() => {});

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const startScraping = (isBackground = false) => {
    if (scrapingStarted.current) return;
    scrapingStarted.current = true;

    if (isBackground) setIsBgScraping(true);
    else setLoading(true);

    // net_id comes from the server via the JWT cookie — we grab it from /user/data or use a placeholder for SSE
    const net_id = (data?.netId || data?.profileData?.registrationNo || '').toLowerCase();
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
    })
    .then(res => res.json())
    .then(scrapedData => {
      if (scrapedData.error) {
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

          // Save back to DB only if we got useful new data
          fetch(`${API_URL}/api/v1/user/save`, {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              netId:          mergedData.netId || mergedData.profileData?.registrationNo?.toLowerCase(),
              profileData:    mergedData.profileData,
              attendanceData: mergedData.attendanceData,
              marksData:      mergedData.marksData,
              timetable_html: mergedData.timetableHTML,
              timetableJSON:  mergedData.timetableJSON,
              courseData:     mergedData.courseData,
              source:         'webapp',
              lastUpdated:    new Date().toISOString()
            })
          });
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

  if (!data || !data.profileData) {
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
      if (!error) return null;
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col lg:flex-row font-sans overflow-hidden">

      {/* Partial scrape error toast */}
      {showErrorToast && Object.keys(partialErrors).length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90%] max-w-md">
          {Object.values(partialErrors).map((msg, i) => (
            <div key={i} className="flex items-start gap-3 bg-[#2a1a1a] border border-[#e57373]/40 rounded-xl px-4 py-3 shadow-2xl animate-pulse">
              <svg className="w-5 h-5 text-[#e57373] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-[#e57373] text-sm">{msg}</p>
            </div>
          ))}
        </div>
      )}

      {/* Background scraping toast */}
      {isBgScraping && (
        <div className="fixed bottom-20 lg:bottom-4 right-4 z-[100] flex items-center gap-3 bg-[#2a1a1a] border border-[#1E88E5]/40 rounded-xl px-4 py-3 shadow-2xl">
          <div className="w-5 h-5 border-2 border-[#1E88E5] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#1E88E5] text-sm font-medium">{progressMsg}</p>
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
      <header className="lg:hidden sticky top-0 z-50 bg-[#1e1e1e] border-b border-[#333] shadow-md px-6 py-4 flex justify-between items-center w-full">
         <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white font-black px-2.5 py-1 rounded-md text-sm tracking-widest shadow-lg shadow-blue-900/20">SRM</div>
            <div className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">
               Unfuglied
            </div>
         </div>
         
         {/* Profile Avatar as Dropdown Trigger */}
         <div className="relative">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="focus:outline-none select-none">
               <img 
                  src={`${API_URL}/api/v1/user/photo`} 
                  alt="Profile" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }} 
                  className="w-10 h-10 rounded-full border-2 border-[#1E88E5] object-cover shadow-lg" 
               />
               <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E88E5] to-[#1565C0] flex items-center justify-center text-white font-bold text-base shadow-lg hidden">
                  {data?.profileData?.name?.charAt(0)?.toUpperCase() || '?'}
               </div>
            </button>
            
            {/* Dropdown Menu */}
            {isMobileMenuOpen && (
               <div className="absolute right-0 top-12 bg-[#2a2a2a] border border-[#444] rounded-xl shadow-2xl transition-all w-[250px] p-4 text-left z-50">
                  <h3 className="text-white text-lg font-bold mb-3 border-b border-[#555] pb-2">Profile</h3>
                  <div className="space-y-2 text-[13px] text-gray-300 mb-4">
                    <div><span className="font-bold text-white">Name:</span> {data?.profileData?.name}</div>
                    <div><span className="font-bold text-white">Reg No:</span> {data?.profileData?.registrationNo}</div>
                    <div><span className="font-bold text-white">Program:</span> {data?.profileData?.programmeBranch}</div>
                    <div><span className="font-bold text-white">Section:</span> {data?.profileData?.section}</div>
                    <div><span className="font-bold text-white mt-2 block">Department:</span> {data?.profileData?.schoolDepartment}</div>
                  </div>
                  <div className="mb-4 flex flex-col gap-1">
                     <button
                       onClick={() => router.push('/feedback')}
                       className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-[#333] hover:text-white rounded-lg transition-colors flex items-center gap-3"
                     >
                       <Rocket className="w-4 h-4 text-purple-400" /> Feedback Fastrack
                     </button>
                  </div>
                  <button onClick={handleLogout} className="w-full py-2 bg-[#ff5252]/10 text-[#ff5252] rounded hover:bg-[#ff5252]/20 hover:scale-[1.02] active:scale-[0.98] font-bold transition-all duration-200 text-sm">Logout</button>
               </div>
            )}
         </div>
      </header>
      
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Layout Area */}
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-[260px] xl:w-[300px] bg-[#2a2a2a] m-4 mr-2 rounded-2xl p-6 flex-col flex-shrink-0 h-[calc(100vh-32px)] overflow-y-auto custom-scrollbar">
               <h2 className="text-white text-2xl font-bold mb-6">Profile</h2>
               <div className="space-y-4 text-[14px] text-gray-300 font-medium">
                 <div><span className="font-bold text-white">Name:</span> {data.profileData.name}</div>
                 <div><span className="font-bold text-white">Reg No:</span> {data.profileData.registrationNo}</div>
                 <div><span className="font-bold text-white">Program:</span> {data.profileData.programmeBranch}</div>
                 <div><span className="font-bold text-white">Section:</span> {data.profileData.section}</div>
                 <div><span className="font-bold text-white">Semester:</span> {data.profileData.semester || '4'}</div>
                 <div><span className="font-bold text-white">Day Order:</span> {data.profileData.dayOrder || 'No Day Order'}</div>
                 <div><span className="font-bold text-white mt-2 block">Department:</span> {data.profileData.schoolDepartment}</div>
               </div>
               <div className="flex justify-center mt-10 mb-4">
                  <img 
                     src={`${API_URL}/api/v1/user/photo`} 
                     alt="Profile" 
                     onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }} 
                     className="w-[100px] h-[100px] rounded-full border-4 border-[#1E88E5] object-cover shadow-lg" 
                  />
                  <div className={`w-[100px] h-[100px] rounded-full border-4 border-[#1E88E5] bg-[#1E88E5]/20 flex items-center justify-center text-4xl font-bold text-[#1E88E5] shadow-lg hidden`}>
                     {data.profileData.name ? data.profileData.name.charAt(0).toUpperCase() : 'U'}
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
                        
                        <div className="px-4 py-2 mt-1 border-t border-[#333] text-sm text-gray-300 font-bold truncate">
                           {data.profileData.name}
                        </div>
                        
                        <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-bold text-[#ff5252] hover:bg-[#ff5252]/10 hover:translate-x-1 active:scale-[0.98] rounded-lg transition-all duration-200 flex items-center gap-3">
                           <LogOut className="w-4 h-4" /> Logout
                        </button>
                     </div>
                  )}
               </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 lg:p-8 lg:m-4 lg:ml-2 lg:bg-[#2a2a2a] lg:rounded-2xl h-[calc(100vh-32px)] overflow-y-auto w-full relative custom-scrollbar">
               {isBgScraping && (
                  <div className="absolute top-4 right-6 bg-[#333] px-3 py-1.5 rounded-full text-xs text-white flex items-center shadow border border-[#444] z-50">
                     <div className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin mr-2"></div> 
                     Syncing latest data...
                     <span className="ml-2 text-muted truncate max-w-[150px] italic">({progressMsg})</span>
                  </div>
               )}
               
               <div className="max-w-[1400px] mx-auto space-y-12">
                   {/* Timetable Section */}
                   <div className={`w-full overflow-x-auto lg:min-w-[700px] ${activeTab === 'Timetable' ? 'block' : 'hidden lg:block'}`}>
                       {(data.timetableHTML || (data.timetableJSON && data.timetableJSON.days)) ? (
                           <TimetableView 
                             htmlContent={data.timetableHTML || ''} 
                             courseData={data.courseData} 
                             netId={data.profileData.registrationNo} 
                             calendarData={calendarData}
                             timetableJSON={data.timetableJSON}
                             profileData={data.profileData}
                             dbEditedSlots={data.editedSlots}
                           />
                       ) : (isBgScraping && (
                           <div className="w-full h-[300px] rounded-xl bg-[#1e1e1e] border border-[#333] animate-pulse flex items-center justify-center">
                               <div className="text-gray-400 font-medium">Syncing Timetable...</div>
                           </div>
                       ))}
                   </div>

             {/* Attendance Section */}
             <div className={`lg:min-w-[700px] ${activeTab === 'Attendance' ? 'block' : 'hidden lg:block'}`}>
                <div className="flex items-center mb-6">
                   <h2 className="text-2xl font-bold text-white">Attendance</h2>
                   <AttendancePredict attendanceData={data.attendanceData} courseData={data.courseData} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(!data.attendanceData || data.attendanceData.length === 0) && isBgScraping ? (
                      Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="rounded-xl p-4 shadow-lg bg-[#1e1e1e] border border-[#333] h-[140px] animate-pulse flex flex-col justify-between">
                              <div className="flex justify-between">
                                  <div className="h-3 w-16 bg-[#333] rounded mb-2"></div>
                                  <div className="h-6 w-12 bg-[#333] rounded"></div>
                              </div>
                              <div className="h-4 w-3/4 bg-[#333] rounded mb-4"></div>
                              <div className="flex justify-between mt-auto">
                                  <div className="h-4 w-24 bg-[#333] rounded"></div>
                                  <div className="h-4 w-16 bg-[#333] rounded"></div>
                              </div>
                          </div>
                      ))
                  ) : data.attendanceData?.map((item: any, i: number) => {
                     let bgColor = '#1e1e1e';
                     let borderColor = '#333';
                     let marginText = '';
                     let marginColor = '';

                     const isLocked = item.isLocked === true;
                     const hoursConducted = item.hoursConducted !== undefined ? item.hoursConducted : item.totalClasses;

                     if (isLocked) {
                         marginText = 'Attendance Locked';
                         marginColor = '#81c784';
                     } else if (hoursConducted !== 'N/A' && !isNaN(parseInt(hoursConducted as string))) {
                        if (item.percentage >= 75) {
                           marginText = `Can skip: ${item.classesToSkip}`;
                           marginColor = '#81c784';
                        } else {
                           marginText = `Needs: ${item.classesToAttend}`;
                           marginColor = '#e57373';
                        }
                     }

                     return (
                        <div key={i} className="rounded-xl p-4 shadow-lg flex flex-col justify-between" style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}>
                           <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 pr-2">
                                 <div className="text-[11px] text-gray-400 mb-1">{item.courseCode}</div>
                                 <h3 className="font-bold text-white text-[14px] leading-tight mb-3" title={item.courseTitle}>
                                    {item.courseTitle}
                                 </h3>
                              </div>
                              <div className={`text-lg font-bold ${item.percentage >= 75 ? 'text-[#81c784]' : 'text-[#e57373]'}`}>
                                 {item.percentage > 0 ? item.percentage.toFixed(2) : 0}%
                              </div>
                           </div>
                           
                           {item.totalClasses !== 'N/A' && (
                               <div className="flex flex-col gap-2">
                                  <div className="flex justify-between text-[12px] text-gray-300">
                                     <span>Hours Conducted: <b className="text-white">{hoursConducted}</b></span>
                                     <span>Hours Absent: <b className="text-white">{item.absentHours}</b></span>
                                  </div>
                                 <div className="font-bold text-[13px]" style={{ color: marginColor }}>
                                    {marginText}
                                 </div>
                              </div>
                           )}
                        </div>
                     );
                  })}
                </div>
             </div>

             {/* Marks Section */}
             <div className={`lg:min-w-[700px] pb-10 ${activeTab === 'Marks' ? 'block' : 'hidden lg:block'}`}>
                <h2 className="text-2xl font-bold text-white mb-6">Marks</h2>
                <div className="space-y-4">
                  {(!data.marksData || data.marksData.length === 0) && isBgScraping ? (
                      Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="bg-[#1e1e1e] border border-[#333] rounded-xl p-5 h-[120px] animate-pulse flex flex-col justify-between">
                              <div className="flex justify-between">
                                  <div className="h-5 w-48 bg-[#333] rounded"></div>
                                  <div className="h-5 w-16 bg-[#333] rounded"></div>
                              </div>
                              <div className="h-3 w-24 bg-[#333] rounded mt-2"></div>
                              <div className="h-4 w-32 bg-[#333] rounded mt-auto"></div>
                          </div>
                      ))
                  ) : data.marksData?.map((item: any, i: number) => {
                     return (
                     <div 
                        key={i} 
                        className="bg-[#1e1e1e] border border-[#333] rounded-xl p-5 relative transition-all"
                        style={{ zIndex: hoveredCardIndex === i ? 50 : 1 }}
                        onMouseEnter={() => setHoveredCardIndex(i)}
                        onMouseLeave={() => setHoveredCardIndex(null)}
                     >
                         <div className="flex justify-between items-start mb-4 relative z-20">
                           <div className="max-w-[75%]">
                              <h3 className="font-bold text-[1.1em] m-0">
                                 {item.CourseCode} - {(() => {
                                     if (!data.courseData) return '';
                                     const actualCourseData = data.courseData.slotToCourse || data.courseData;
                                     const c = (Object.values(actualCourseData) as any[]).find((c: any) => c['Course Code'] === item.CourseCode);
                                     return c ? c['Course Title'] : '';
                                 })()}
                              </h3>
                              <p className="text-gray-400 text-[0.9em] mt-[2px] mb-0 opacity-80">
                                 {item.CourseType}
                                 {((item.CourseCode || '').trim().toUpperCase().endsWith('P') || item.TotalMaxMarks > 60) && (
                                     <span className="text-[0.8em] text-[#FBC02D]"> (Internal)</span>
                                 )}
                              </p>
                           </div>
                           <div className="flex flex-col items-end">
                              <div className="flex items-center gap-3">
                                  <span className="font-bold text-[1em]" style={{ color: (() => {
                                     const isInternal = (item.CourseCode || '').trim().toUpperCase().endsWith('P') || item.TotalMaxMarks > 60;
                                     const pct = item.TotalMaxMarks > 0 ? (item.TotalObtainedMarks / item.TotalMaxMarks) * 100 : 0;
                                     if (isInternal) {
                                        if (pct > 91) return '#81c784';
                                        if (pct > 50) return '#fbc02d';
                                        return '#e57373';
                                     } else {
                                        if (pct > 85) return '#81c784';
                                        if (pct > 50) return '#fbc02d';
                                        return '#e57373';
                                     }
                                  })() }}>
                                     {item.TotalObtainedMarks} <span className="text-gray-200">/ {item.TotalMaxMarks}</span>
                                  </span>
                                  
                                  <div className="text-gray-500 hover:text-white cursor-help group relative z-50">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="16" x2="12" y2="12"></line>
                                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                     </svg>
                                     
                                     <div className="absolute right-0 top-6 bg-[#1a1a2e] border border-[#333] rounded-[10px] shadow-[0_6px_24px_rgba(0,0,0,0.6)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-[14px_16px] min-w-[260px] text-left cursor-default pointer-events-auto leading-[1.7]" onClick={(e) => e.stopPropagation()}>
                                         <b className="text-[1em] text-white">Course Info</b><br/>
                                         <span className="text-[0.85em] text-[#eee]">Credit: <b className="text-white">{(() => {
                                            if (!data.courseData) return 'N/A';
                                            const actualCourseData = data.courseData.slotToCourse || data.courseData;
                                            const c = (Object.values(actualCourseData) as any[]).find((c: any) => c['Course Code'] === item.CourseCode);
                                            return c ? c.Credit : 'N/A';
                                         })()}</b></span><br/>
                                         <span className="text-[0.85em] text-[#eee]">Faculty: <span className="text-[#64b5f6] hover:underline cursor-pointer">{(() => {
                                            if (!data.courseData) return 'N/A';
                                            const actualCourseData = data.courseData.slotToCourse || data.courseData;
                                            const c = (Object.values(actualCourseData) as any[]).find((c: any) => c['Course Code'] === item.CourseCode);
                                            return c ? c['Faculty Name'] : 'N/A';
                                         })()}</span></span><br/>
                                         <div className="mt-1 text-[#aaa] text-[0.82em]">
                                            Type: {((item.CourseCode || '').trim().toUpperCase().endsWith('P') || item.TotalMaxMarks > 60) ? '🔒 Fully Internal' : '📄 Theory (60+40)'}
                                         </div>
                                         
                                         {!((item.CourseCode || '').trim().toUpperCase().endsWith('P') || item.TotalMaxMarks > 60) && (
                                            <table className="w-full mt-3 text-[0.85em] text-left border-collapse">
                                               <tbody>
                                                  {[
                                                     { grade: 'O', min: 91 },
                                                     { grade: 'A+', min: 81 },
                                                     { grade: 'A', min: 71 },
                                                     { grade: 'B+', min: 61 },
                                                     { grade: 'B', min: 56 },
                                                     { grade: 'C', min: 50 }
                                                  ].map(g => {
                                                     const internalObtained = item.Components
                                                        ? item.Components.reduce((sum: number, c: any) => sum + (parseFloat(c.ObtainedMarks) || 0), 0)
                                                        : 0;
                                                     const extNeeded40 = Math.max(0, g.min - internalObtained);
                                                     const extNeeded75 = extNeeded40 > 40 ? '—' : Math.ceil(extNeeded40 * 75 / 40);
                                                     const impossible = extNeeded75 === '—' || (typeof extNeeded75 === 'number' && extNeeded75 > 75);
                                                     const rowColor = impossible ? '#E57373' : (extNeeded75 <= 37 ? '#81C784' : '#FBC02D');
                                                     const displayNeeded = impossible ? '✗' : `${extNeeded75}/75`;
                                                     return (
                                                        <tr key={g.grade} className="border-b border-[#2a2a2a]">
                                                           <td className="py-[3px] px-[6px] font-bold text-white">{g.grade}</td>
                                                           <td className="py-[3px] px-[6px] text-[#ccc]">{g.min}</td>
                                                           <td className="py-[3px] px-[6px] font-bold" style={{ color: rowColor }}>
                                                              {displayNeeded}
                                                           </td>
                                                        </tr>
                                                     );
                                                  })}
                                               </tbody>
                                            </table>
                                         )}
                                     </div>
                                  </div>
                              </div>
                           </div>
                        </div>

                        {item.TotalMaxMarks > 0 && (
                           <div className="w-full bg-[#333] h-[8px] rounded-[4px] mb-[8px] relative z-0 overflow-hidden">
                              <div 
                                 className="h-full transition-all duration-400 ease-in-out"
                                 style={{ 
                                    width: `${Math.min(100, item.TotalMaxMarks > 0 ? (item.TotalObtainedMarks / item.TotalMaxMarks) * 100 : 0)}%`,
                                    backgroundColor: (() => {
                                       const isInternal = (item.CourseCode || '').trim().toUpperCase().endsWith('P') || item.TotalMaxMarks > 60;
                                       const pct = item.TotalMaxMarks > 0 ? (item.TotalObtainedMarks / item.TotalMaxMarks) * 100 : 0;
                                       if (isInternal) {
                                          if (pct > 91) return '#81C784';
                                          if (pct > 50) return '#FBC02D';
                                          return '#E57373';
                                       } else {
                                          if (pct > 85) return '#81C784';
                                          if (pct > 50) return '#FBC02D';
                                          return '#E57373';
                                       }
                                    })()
                                 }}
                              ></div>
                           </div>
                        )}

                        {item.Components && item.Components.length > 0 && (
                           <div className="flex flex-wrap gap-[8px] relative z-0">
                              {item.Components.map((comp: any, j: number) => {
                                 const isAbsent = comp.ObtainedMarks === 'Absent';
                                 const obtained = parseFloat(comp.ObtainedMarks);
                                 const max = parseFloat(comp.MaxMarks);
                                 const compPct = !isAbsent && max > 0 && !isNaN(obtained) ? (obtained / max) * 100 : 0;
                                 
                                 const isInternal = item.CourseCode.trim().toUpperCase().endsWith('P') || item.TotalMaxMarks > 60;
                                 const getScoreColor = (pct: number) => {
                                     if (isInternal) {
                                         if (pct > 91) return '#81C784';
                                         if (pct > 50) return '#FBC02D';
                                         return '#E57373';
                                     } else {
                                         if (pct > 85) return '#81C784';
                                         if (pct > 50) return '#FBC02D';
                                         return '#E57373';
                                     }
                                 };
                                 
                                 const chipBgColor = isAbsent ? '#4a2020' : getScoreColor(compPct);
                                 const chipTextColor = isAbsent ? '#E57373' : '#000000';
                                 
                                 return (
                                    <span 
                                       key={j}
                                       className="text-[0.8em] font-[500] px-[8px] py-[3px] rounded-[12px]"
                                       style={{ backgroundColor: chipBgColor, color: chipTextColor }}
                                    >
                                       {comp.ComponentName}: {isAbsent ? 'Absent' : `${comp.ObtainedMarks}/${comp.MaxMarks}`}
                                    </span>
                                 );
                              })}
                           </div>
                        )}
                     </div>
                     );
                  })}
                </div>
             </div>

         </div>
      </main>

       <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
