'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UnfuglyLog } from '../utils/logger';

interface CalendarViewProps {
  profileData?: any;
  onBack?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const SEMESTERS = ['2024_25_EVEN', '2025_26_ODD', '2025_26_EVEN', '2026_27_ODD'];

export default function CalendarView({ profileData, onBack }: CalendarViewProps) {
  const [currentSemesterIndex, setCurrentSemesterIndex] = useState<number>(1); // Default will be set in useEffect
  const [semesterDataCache, setSemesterDataCache] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const touchStartRef = useRef<{ x: number, y: number } | null>(null);
  const transitionDirectionRef = useRef<'next' | 'prev' | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [minimapOpen, setMinimapOpen] = useState(false);
  const [months, setMonths] = useState<string[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Determine initial semester based on current date
  const initialIndex = React.useMemo(() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11
    
    let index = 3; // Default
    if (currentYear === 2025) {
        if (currentMonth >= 6) index = 1; // 2025_26_ODD
    } else if (currentYear === 2026) {
        if (currentMonth < 6) index = 2; // 2025_26_EVEN
        else index = 3; // 2026_27_ODD
    }
    return index;
  }, []);

  useEffect(() => {
    setCurrentSemesterIndex(initialIndex);
  }, [initialIndex]);

  // Fetch data for the current semester
  useEffect(() => {
     const semKey = SEMESTERS[currentSemesterIndex];
     
     // First check state cache
     if (semesterDataCache[semKey]) {
        setLoading(false);
        return;
     }

     // Then check localStorage cache
     const cachedDataStr = localStorage.getItem('unfuglyData_calendar');
     let useCache = false;
     if (cachedDataStr) {
         try {
             const cachedRoot = JSON.parse(cachedDataStr);
             const cachedSem = cachedRoot[semKey];
             if (cachedSem && cachedSem.data) {
                 const isCurrent = currentSemesterIndex === initialIndex;
                 if (!isCurrent) {
                     useCache = true; // Always use cache for old semesters
                 } else {
                     const lastUpdateDate = new Date(cachedSem.lastUpdated);
                     if (!isNaN(lastUpdateDate.getTime())) {
                         const diffInHours = (new Date().getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60);
                         if (diffInHours < 24) {
                             useCache = true; // Use cache if <24h old
                         }
                     }
                 }
                 if (useCache) {
                     setSemesterDataCache(prev => ({ ...prev, [semKey]: cachedSem.data }));
                     setLoading(false);
                     return;
                 }
             }
         } catch(e: any) { UnfuglyLog.error('SYNC_03', `Failed to parse calendar from localStorage: ${e.message}`); }
     }
     
     setLoading(true);
     fetch(`${API_URL}/api/v1/calendar?semester=${semKey}`, { credentials: 'include' })
       .then(res => res.json())
       .then(data => {
          const calendarJson = data.calendar_json || data;
          setSemesterDataCache(prev => ({ ...prev, [semKey]: calendarJson }));
          
          // Save to localStorage under unfuglyData_calendar
          const existingCacheStr = localStorage.getItem('unfuglyData_calendar');
          let rootCache: Record<string, any> = {};
          try { if (existingCacheStr) rootCache = JSON.parse(existingCacheStr); } catch(e){}
          rootCache[semKey] = { data: calendarJson, lastUpdated: new Date().toISOString() };
          localStorage.setItem('unfuglyData_calendar', JSON.stringify(rootCache));
          
          setLoading(false);
       })
       .catch(err => {
          UnfuglyLog.error('CAL_01', `Failed to fetch calendar: ${err.message}`);
          setLoading(false);
       });
  }, [currentSemesterIndex, semesterDataCache]);

  // Process data when cache or semester index changes
  useEffect(() => {
    const semKey = SEMESTERS[currentSemesterIndex];
    const calendarData = semesterDataCache[semKey];
    if (!calendarData) return;
    
    let sortedMonths = Object.keys(calendarData).sort((a, b) => {
        const parseMonth = (str: string) => new Date(str.replace("'", "20"));
        return parseMonth(a).getTime() - parseMonth(b).getTime();
    });

    if (sortedMonths.length > 0) {
        setMonths(sortedMonths);
        
        if (transitionDirectionRef.current === 'next') {
            setSelectedMonth(sortedMonths[0]);
            transitionDirectionRef.current = null;
        } else if (transitionDirectionRef.current === 'prev') {
            setSelectedMonth(sortedMonths[sortedMonths.length - 1]);
            transitionDirectionRef.current = null;
        } else {
            const currentDate = new Date();
            const currentMonthShort = currentDate.toLocaleString('default', { month: 'short' }).toLowerCase();
            const currentYearTwoDigit = currentDate.getFullYear().toString().slice(-2);
            
            let initialMonth = sortedMonths.find(m => m.toLowerCase().includes(currentMonthShort) && m.includes(currentYearTwoDigit)) || sortedMonths[0];
            setSelectedMonth(initialMonth);
        }
    }
  }, [currentSemesterIndex, semesterDataCache]);

  useEffect(() => {
     if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
     }
  }, [selectedMonth]);

  const semKey = SEMESTERS[currentSemesterIndex];
  const calendarData = semesterDataCache[semKey];

  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const dx = touchStartRef.current.x - touchEndX;
      const dy = touchStartRef.current.y - touchEndY;
      
      // If horizontal swipe is greater than vertical and exceeds threshold
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
          const currentMonthIndex = months.indexOf(selectedMonth);
          if (dx > 0) {
              // Swiped left (Next Month)
              if (currentMonthIndex < months.length - 1) {
                  setSelectedMonth(months[currentMonthIndex + 1]);
              } else if (currentSemesterIndex < SEMESTERS.length - 1) {
                  // Switch to next semester
                  transitionDirectionRef.current = 'next';
                  setCurrentSemesterIndex(prev => prev + 1);
              }
          } else {
              // Swiped right (Previous Month)
              if (currentMonthIndex > 0) {
                  setSelectedMonth(months[currentMonthIndex - 1]);
              } else if (currentSemesterIndex > 0) {
                  // Switch to previous semester
                  transitionDirectionRef.current = 'prev';
                  setCurrentSemesterIndex(prev => prev - 1);
              }
          }
      }
      touchStartRef.current = null;
  };

  return (
      <>
          {/* Mobile Toggle Button */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-[#333] w-full">
              <h1 className="m-0 text-[#1E88E5] text-xl font-bold">{selectedMonth}</h1>
              <button 
                  className="bg-[#1E88E5] text-white border-none px-4 py-2 rounded-md font-bold cursor-pointer text-sm"
                  onClick={() => setMinimapOpen(!minimapOpen)}
              >
                  {minimapOpen ? 'Close' : 'Months'}
              </button>
          </div>

          {/* Minimap (Months List + Pagination) - matches Desktop Sidebar */}
          <aside 
              className={`
                  ${minimapOpen ? 'flex absolute top-[60px] left-0 w-[250px] shadow-[2px_0_10px_rgba(0,0,0,0.5)] z-50 h-[calc(100vh-60px)] bg-[#333]' : 'hidden'} 
                  lg:flex lg:static lg:w-[260px] xl:w-[300px] lg:bg-[#333] lg:m-4 lg:mr-2 lg:rounded-2xl lg:p-6 lg:h-[calc(100vh-32px)]
                  flex-col flex-shrink-0 overflow-y-auto custom-scrollbar border-r border-[#333] lg:border-none
              `}
          >
              <div className="flex items-center justify-between p-4 lg:p-0 lg:mb-6 lg:pb-4 lg:border-b lg:border-white border-b border-[#333]">
                  <button 
                      onClick={() => setCurrentSemesterIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentSemesterIndex === 0}
                      className={`bg-transparent border-none flex items-center justify-center p-2 rounded-full transition ${currentSemesterIndex === 0 ? 'opacity-20 cursor-not-allowed text-gray-500' : 'text-white cursor-pointer hover:bg-[#444] hover:text-[#1E88E5]'}`}
                  >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <h3 className="m-0 text-white font-semibold text-sm">
                      {semKey.replace('_', '-')}
                  </h3>
                  <button 
                      onClick={() => setCurrentSemesterIndex(prev => Math.min(SEMESTERS.length - 1, prev + 1))}
                      disabled={currentSemesterIndex === SEMESTERS.length - 1}
                      className={`bg-transparent border-none flex items-center justify-center p-2 rounded-full transition ${currentSemesterIndex === SEMESTERS.length - 1 ? 'opacity-20 cursor-not-allowed text-gray-500' : 'text-white cursor-pointer hover:bg-[#444] hover:text-[#1E88E5]'}`}
                  >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
              </div>

              {loading ? (
                  <div className="flex flex-col p-2.5 gap-2 animate-pulse">
                      {[1,2,3,4,5,6].map(i => <div key={i} className="w-full h-10 bg-gray-800 rounded-md"></div>)}
                  </div>
              ) : months.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[#aaa]">No data</div>
              ) : (
                  <div className="flex flex-col p-2.5 gap-1.5">
                      {months.map(month => {
                          const isCurrentRealWorldMonth = month.toLowerCase().includes(new Date().toLocaleString('default', { month: 'short' }).toLowerCase()) && month.includes(new Date().getFullYear().toString().slice(-2));
                          return (
                              <button 
                                  key={month}
                                  className={`
                                      w-full text-left py-3 px-4 border-none text-[1em] transition-all cursor-pointer relative rounded-t-md
                                      ${selectedMonth === month ? 'bg-[#1E88E5] text-white font-bold border-b-2 border-white' : 'bg-transparent text-[#ccc] hover:bg-[#444] border-b-2 border-transparent'}
                                  `}
                                  onClick={() => {
                                      setSelectedMonth(month);
                                      if (window.innerWidth < 768) {
                                          setMinimapOpen(false);
                                      }
                                  }}
                              >
                                  {month}
                              </button>
                          );
                      })}
                  </div>
              )}

              <div className="mt-auto pt-6 w-full hidden lg:block">
                  <button onClick={onBack} className="w-full text-center px-4 py-3 bg-[#1e1e1e] hover:bg-[#333] border border-[#444] rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer text-white">
                     ← Back to Dashboard
                  </button>
              </div>
          </aside>

          {/* Main View - matches Desktop Main Content */}
          <main 
              ref={scrollContainerRef} 
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="flex-1 p-4 lg:p-8 lg:m-4 lg:ml-2 lg:bg-[#121212] lg:rounded-2xl h-[calc(100vh-32px)] overflow-y-auto w-full relative custom-scrollbar flex flex-col"
          >
              {loading ? (
                  <div className="w-full flex-grow flex flex-col gap-4 animate-pulse mt-4">
                      <div className="hidden md:flex justify-between items-center mb-1">
                          <div className="w-48 h-10 bg-gray-800 rounded-xl"></div>
                      </div>
                      <div className="hidden md:grid grid-cols-7 gap-2.5 w-full flex-grow">
                          {Array.from({ length: 35 }).map((_, i) => (
                              <div key={i} className="bg-[#1e1e1e] rounded-xl p-3 h-[100px] border border-[#333]"></div>
                          ))}
                      </div>
                      <div className="md:hidden flex flex-col gap-3">
                          {Array.from({ length: 7 }).map((_, i) => (
                              <div key={i} className="w-full h-24 bg-[#1e1e1e] rounded-xl border border-[#333]"></div>
                          ))}
                      </div>
                  </div>
              ) : selectedMonth && calendarData && calendarData[selectedMonth] ? (
                  <>
                      <div className="hidden md:flex justify-between items-center mb-5">
                          <h1 className="m-0 text-[#1E88E5] text-3xl font-bold">{selectedMonth}</h1>
                      </div>

                      {/* Desktop Grid View */}
                      <div className="hidden md:grid grid-cols-7 gap-2.5 w-full flex-grow">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                              <div key={d} className="text-center font-bold p-2.5 bg-[#1e1e1e] rounded-lg text-[#aaa]">
                                  {d}
                              </div>
                          ))}

                          {(() => {
                              let startDayIndex = 0;
                              if (calendarData[selectedMonth]['1'] && calendarData[selectedMonth]['1'].day) {
                                  startDayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(calendarData[selectedMonth]['1'].day);
                                  if (startDayIndex === -1) startDayIndex = 0;
                              }
                              return Array.from({ length: startDayIndex }).map((_, i) => (
                                  <div key={`empty-${i}`} className="bg-transparent rounded-lg"></div>
                              ));
                          })()}

                          {Array.from({ length: 31 }).map((_, i) => {
                              const dateStr = (i + 1).toString();
                              if (!calendarData[selectedMonth][dateStr]) return null;

                              const dayInfo = calendarData[selectedMonth][dateStr];
                              const isHoliday = dayInfo.dayOrder === '-' || dayInfo.dayOrder?.toLowerCase() === 'holiday' || dayInfo.event?.toLowerCase().includes('holiday');
                              const borderColor = isHoliday ? '#d32f2f' : '#444';
                              const bg = isHoliday ? 'rgba(211, 47, 47, 0.1)' : '#1e1e1e';

                              return (
                                  <div 
                                      key={dateStr}
                                      className="flex flex-col min-h-[100px] rounded-lg p-2.5 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                                      style={{ backgroundColor: bg, border: `1px solid ${borderColor}` }}
                                  >
                                      <div className="flex justify-between items-start mb-2">
                                          <span className={`text-2xl font-bold ${isHoliday ? 'text-[#ef5350]' : 'text-white'}`}>
                                              {dateStr}
                                          </span>
                                          <span className={`w-6 h-6 flex items-center justify-center shrink-0 rounded-full text-xs font-bold text-white ${isHoliday ? 'bg-[#d32f2f]' : 'bg-[#1E88E5]'}`}>
                                              {dayInfo.dayOrder}
                                          </span>
                                      </div>
                                      <div className="text-sm text-[#bbb] flex-grow overflow-hidden text-ellipsis leading-snug">
                                          {dayInfo.event !== '-' ? dayInfo.event : ''}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>

                      {/* Mobile Mini-Grid View */}
                      <div className="md:hidden flex flex-col w-full">
                          <div className="grid grid-cols-7 gap-1 w-full mb-6">
                              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                  <div key={i} className="text-center font-bold text-xs text-[#aaa] pb-2">
                                      {d}
                                  </div>
                              ))}

                              {(() => {
                                  let startDayIndex = 0;
                                  if (calendarData[selectedMonth]['1'] && calendarData[selectedMonth]['1'].day) {
                                      startDayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(calendarData[selectedMonth]['1'].day);
                                      if (startDayIndex === -1) startDayIndex = 0;
                                  }
                                  return Array.from({ length: startDayIndex }).map((_, i) => (
                                      <div key={`empty-mob-${i}`} className=""></div>
                                  ));
                              })()}

                              {Array.from({ length: 31 }).map((_, i) => {
                                  const dateStr = (i + 1).toString();
                                  if (!calendarData[selectedMonth][dateStr]) return null;

                                  const dayInfo = calendarData[selectedMonth][dateStr];
                                  const isHoliday = dayInfo.dayOrder === '-' || dayInfo.dayOrder?.toLowerCase() === 'holiday' || dayInfo.event?.toLowerCase().includes('holiday');
                                  const hasEvent = dayInfo.event && dayInfo.event !== '-';

                                  return (
                                      <div 
                                          key={`mob-${dateStr}`} 
                                          className="flex flex-col items-center justify-center aspect-square p-1 cursor-pointer hover:scale-110 transition-transform"
                                          onClick={() => {
                                              document.getElementById(`evt-${dateStr}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          }}
                                      >
                                          <div className={`w-full h-full flex items-center justify-center rounded-full text-sm font-semibold relative ${isHoliday ? 'text-[#ef5350] bg-red-900/20' : 'text-white'}`}>
                                              {dateStr}
                                              {hasEvent && <div className="absolute bottom-0 w-1 h-1 rounded-full bg-[#1E88E5]"></div>}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>

                          {/* Event List */}
                          <div className="flex flex-col space-y-3 pb-24">
                             <h3 className="text-white font-bold mb-2">Events & Holidays</h3>
                             {Array.from({ length: 31 }).map((_, i) => {
                                 const dateStr = (i + 1).toString();
                                 if (!calendarData[selectedMonth][dateStr]) return null;
                                 const dayInfo = calendarData[selectedMonth][dateStr];
                                 const hasEvent = dayInfo.event && dayInfo.event !== '-';
                                 const isHoliday = dayInfo.dayOrder === '-' || dayInfo.dayOrder?.toLowerCase() === 'holiday' || dayInfo.event?.toLowerCase().includes('holiday');
                                 
                                 if (!hasEvent && !isHoliday && dayInfo.dayOrder === 'No Day Order') return null;

                                 return (
                                     <div id={`evt-${dateStr}`} key={`evt-${dateStr}`} className="flex items-start gap-4 p-3 bg-[#1e1e1e] rounded-lg border border-[#333]">
                                         <div className="flex flex-col items-center min-w-[40px]">
                                             <span className="text-xs text-[#aaa]">{dayInfo.day}</span>
                                             <span className={`text-xl font-bold ${isHoliday ? 'text-[#ef5350]' : 'text-white'}`}>{dateStr}</span>
                                         </div>
                                         <div className="flex flex-col flex-grow">
                                             <span className={`text-xs font-bold w-fit px-2 py-0.5 rounded-sm mb-1 ${isHoliday ? 'bg-[#d32f2f]/20 text-[#ef5350]' : 'bg-[#1E88E5]/20 text-[#1E88E5]'}`}>
                                                 {dayInfo.dayOrder}
                                             </span>
                                             {hasEvent && (
                                                <span className="text-sm text-gray-300">{dayInfo.event}</span>
                                             )}
                                         </div>
                                     </div>
                                 );
                             })}
                             {Object.keys(calendarData[selectedMonth]).every(k => {
                                 const d = calendarData[selectedMonth][k];
                                 return (!d.event || d.event === '-') && d.dayOrder !== '-';
                             }) && (
                                 <div className="text-[#aaa] text-sm italic">No special events this month.</div>
                             )}
                          </div>
                      </div>
                  </>
              ) : null}
          </main>
      </>
  );
}
