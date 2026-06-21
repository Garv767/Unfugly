'use client';

import { useState, useEffect, useRef } from 'react';

interface CalendarViewProps {
  calendarData: Record<string, Record<string, { day: string; dayOrder: string; event: string }>>;
}

export default function CalendarView({ calendarData }: CalendarViewProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [minimapOpen, setMinimapOpen] = useState(false);
  const [months, setMonths] = useState<string[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calendarData) return;
    
    let sortedMonths = Object.keys(calendarData).sort((a, b) => {
        const parseMonth = (str: string) => new Date(str.replace("'", "20"));
        return parseMonth(a).getTime() - parseMonth(b).getTime();
    });

    if (sortedMonths.length > 0) {
        setMonths(sortedMonths);
        
        const currentDate = new Date();
        const currentMonthShort = currentDate.toLocaleString('default', { month: 'short' }).toLowerCase();
        const currentYearTwoDigit = currentDate.getFullYear().toString().slice(-2);
        
        let initialMonth = sortedMonths.find(m => m.toLowerCase().includes(currentMonthShort) && m.includes(currentYearTwoDigit)) || sortedMonths[0];
        setSelectedMonth(initialMonth);
    }
  }, [calendarData]);

  useEffect(() => {
     if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
     }
  }, [selectedMonth]);

  if (!calendarData || months.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center w-full gap-4 text-[#aaa] font-sans p-10">
              <div className="w-10 h-10 border-4 border-[#333] border-t-[#1E88E5] rounded-full animate-spin"></div>
              <p className="m-0 text-sm">Syncing calendar data...</p>
          </div>
      );
  }

  const monthData = selectedMonth ? calendarData[selectedMonth] : null;

  return (
      <div className="flex flex-col md:flex-row w-full h-[calc(100vh-100px)] bg-[#121212] text-white font-sans box-border overflow-hidden relative rounded-xl border border-[#333] shadow-lg">
          
          {/* Mobile Toggle Button */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-[#333]">
              <h1 className="m-0 text-[#1E88E5] text-xl font-bold">{selectedMonth}</h1>
              <button 
                  className="bg-[#1E88E5] text-white border-none px-4 py-2 rounded-md font-bold cursor-pointer text-sm"
                  onClick={() => setMinimapOpen(!minimapOpen)}
              >
                  {minimapOpen ? 'Close Months' : 'Change Month'}
              </button>
          </div>

          {/* Minimap */}
          <div 
              className={`
                  ${minimapOpen ? 'flex absolute shadow-[2px_0_10px_rgba(0,0,0,0.5)]' : 'hidden'} 
                  md:flex md:static
                  flex-col w-[250px] min-w-[250px] h-full bg-[#1e1e1e] border-r border-[#333] overflow-y-auto transition-transform z-10
              `}
          >
              <h3 className="p-5 m-0 text-white border-b border-[#333] font-semibold">Months</h3>
              <div className="flex flex-col p-2.5 gap-1.5">
                  {months.map(month => (
                      <button 
                          key={month}
                          className={`
                              w-full text-left py-3 px-4 bg-transparent border-none rounded-md text-[1em] transition-all cursor-pointer
                              ${selectedMonth === month ? 'bg-[#1E88E5] text-white' : 'text-[#ccc] hover:bg-[#2a2a2a]'}
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
                  ))}
              </div>
          </div>

          {/* Main View */}
          <div ref={scrollContainerRef} className="flex-grow h-full bg-[#121212] flex flex-col overflow-y-auto p-5 box-border scroll-smooth">
              {selectedMonth && monthData && (
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

                          {/* Determine starting padding */}
                          {(() => {
                              let startDayIndex = 0;
                              if (monthData['1'] && monthData['1'].day) {
                                  startDayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(monthData['1'].day);
                                  if (startDayIndex === -1) startDayIndex = 0;
                              }
                              return Array.from({ length: startDayIndex }).map((_, i) => (
                                  <div key={`empty-${i}`} className="bg-transparent rounded-lg"></div>
                              ));
                          })()}

                          {/* Render Days */}
                          {Array.from({ length: 31 }).map((_, i) => {
                              const dateStr = (i + 1).toString();
                              if (!monthData[dateStr]) return null;

                              const dayInfo = monthData[dateStr];
                              const isHoliday = dayInfo.dayOrder === '-' || dayInfo.dayOrder?.toLowerCase() === 'holiday' || dayInfo.event?.toLowerCase().includes('holiday');
                              const borderColor = isHoliday ? '#d32f2f' : '#333';
                              const bg = isHoliday ? 'rgba(211, 47, 47, 0.1)' : '#2a2a2a';

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
                                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${isHoliday ? 'bg-[#d32f2f]' : 'bg-[#1E88E5]'}`}>
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

                              {/* Start padding */}
                              {(() => {
                                  let startDayIndex = 0;
                                  if (monthData['1'] && monthData['1'].day) {
                                      startDayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(monthData['1'].day);
                                      if (startDayIndex === -1) startDayIndex = 0;
                                  }
                                  return Array.from({ length: startDayIndex }).map((_, i) => (
                                      <div key={`empty-mob-${i}`} className=""></div>
                                  ));
                              })()}

                              {/* Render Mini Days */}
                              {Array.from({ length: 31 }).map((_, i) => {
                                  const dateStr = (i + 1).toString();
                                  if (!monthData[dateStr]) return null;

                                  const dayInfo = monthData[dateStr];
                                  const isHoliday = dayInfo.dayOrder === '-' || dayInfo.dayOrder?.toLowerCase() === 'holiday' || dayInfo.event?.toLowerCase().includes('holiday');
                                  const hasEvent = dayInfo.event && dayInfo.event !== '-';

                                  return (
                                      <div key={`mob-${dateStr}`} className="flex flex-col items-center justify-center aspect-square p-1">
                                          <div className={`w-full h-full flex items-center justify-center rounded-full text-sm font-semibold relative ${isHoliday ? 'text-[#ef5350] bg-red-900/20' : 'text-white'}`}>
                                              {dateStr}
                                              {hasEvent && <div className="absolute bottom-0 w-1 h-1 rounded-full bg-[#1E88E5]"></div>}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>

                          {/* Event List */}
                          <div className="flex flex-col space-y-3 pb-8">
                             <h3 className="text-white font-bold mb-2">Events & Holidays</h3>
                             {Array.from({ length: 31 }).map((_, i) => {
                                 const dateStr = (i + 1).toString();
                                 if (!monthData[dateStr]) return null;
                                 const dayInfo = monthData[dateStr];
                                 const hasEvent = dayInfo.event && dayInfo.event !== '-';
                                 const isHoliday = dayInfo.dayOrder === '-' || dayInfo.dayOrder?.toLowerCase() === 'holiday' || dayInfo.event?.toLowerCase().includes('holiday');
                                 
                                 if (!hasEvent && !isHoliday && dayInfo.dayOrder === 'No Day Order') return null; // Skip empty days

                                 return (
                                     <div key={`evt-${dateStr}`} className="flex items-start gap-4 p-3 bg-[#1e1e1e] rounded-lg border border-[#333]">
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
                             {Object.keys(monthData).every(k => {
                                 const d = monthData[k];
                                 return (!d.event || d.event === '-') && d.dayOrder !== '-';
                             }) && (
                                 <div className="text-[#aaa] text-sm italic">No special events this month.</div>
                             )}
                          </div>
                      </div>
                  </>
              )}
          </div>
      </div>
  );
}
