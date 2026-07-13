'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface TimetableViewProps {
  htmlContent: string;
  courseData: Record<string, { title: string; classRoom?: string; classroom?: string }>;
  netId: string;
  calendarData?: any;
  timetableJSON?: any;
  profileData?: any;
  dbEditedSlots?: any;
}

function parseTableToJSON(table: HTMLTableElement) {
    const data: any = { headers: [], days: [], extraSlotFlag: false };
    if (!table) return data;

    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return data;

    const firstRowCells = rows[0].querySelectorAll('th, td');
    if (firstRowCells.length > 0) {
        firstRowCells[0].textContent = 'Time';
    }
    firstRowCells.forEach(cell => data.headers.push(cell.textContent?.trim() || ''));
    data.extraSlotFlag = firstRowCells.length > 11;

    for (let i = 1; i < rows.length; i++) {
        const tr = rows[i];
        const cells = tr.querySelectorAll('td, th');
        if (cells.length === 0) continue;

        const dayName = cells[0].textContent?.trim() || '';
        if (dayName === 'Time' || dayName.includes('Hour/Day Order') || dayName === 'TO') {
            continue;
        }

        const dayObj: any = { 
            dayName: dayName, 
            slots: [] 
        };
        
        for (let j = 1; j < cells.length; j++) {
            const cell = cells[j] as HTMLElement;
            const titleEl = cell.querySelector('.editedSlot-originalTitle');
            const classroomEl = cell.querySelector('.editedSlot-originalClassroom');
            let slotTitle = '';
            let slotClassroom = '';

            if (titleEl) {
                slotTitle = titleEl.textContent?.trim() || '';
            } else {
                slotTitle = cell.textContent?.trim() || '';
            }

            if (classroomEl) {
                slotClassroom = classroomEl.textContent?.trim() || '';
            }

            dayObj.slots.push({
                title: slotTitle,
                classroom: slotClassroom,
                bgColor: cell.getAttribute('bgcolor') || cell.style.backgroundColor || ''
            });
        }
        data.days.push(dayObj);
    }
    return data;
}

function getDayOrderForDate(date: Date, calendarData: any) {
    if (!calendarData) return null;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = String(date.getFullYear()).slice(2);
    const monthKey = `${months[date.getMonth()]} '${year}`;
    const dayKey = String(date.getDate());
    const dayData = calendarData[monthKey]?.[dayKey];
    if (!dayData || dayData.dayOrder === '-') return null;
    return dayData.dayOrder;
}

export default function TimetableView({ htmlContent, courseData, netId, calendarData, timetableJSON, profileData, dbEditedSlots }: TimetableViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewState, setViewState] = useState<'hide' | 'show' | 'modify'>('show');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
     setIsMobile(window.innerWidth < 1024);
     const handleResize = () => setIsMobile(window.innerWidth < 1024);
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
  }, []);
  useEffect(() => {
    // Run on mount: use MutationObserver to find portal node as soon as header is in DOM
    const tryFind = () => {
      const el = document.getElementById('mobile-header-actions-Timetable');
      if (el) { setPortalNode(el); return true; }
      return false;
    };
    if (!tryFind()) {
      const observer = new MutationObserver(() => { if (tryFind()) observer.disconnect(); });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
  }, []); // mount-only

  const [parsedData, setParsedData] = useState<any>(null);
  const [mobileDayIndex, setMobileDayIndex] = useState<number>(0);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  
  const [editedSlots, setEditedSlots] = useState<Record<string, { title: string; classroom: string }>>(() => {
    let initialEdits: Record<string, { title: string; classroom: string }> = {};
    if (dbEditedSlots && Object.keys(dbEditedSlots).length > 0) {
      try {
        const raw = typeof dbEditedSlots === 'string' ? JSON.parse(dbEditedSlots) : dbEditedSlots;
        Object.keys(raw).forEach(slotKey => {
          const entry = raw[slotKey];
          initialEdits[slotKey] = {
            title: entry.title ?? entry.editedTitle ?? '',
            classroom: entry.classroom ?? entry.editedClassroom ?? ''
          };
        });
      } catch (e) {
        console.error("Failed to parse DB dbEditedSlots:", e);
      }
    }
    return initialEdits;
  });

  useEffect(() => {
    if (dbEditedSlots && Object.keys(dbEditedSlots).length > 0) {
      try {
        const raw = typeof dbEditedSlots === 'string' ? JSON.parse(dbEditedSlots) : dbEditedSlots;
        const newEdits: Record<string, { title: string; classroom: string }> = {};
        Object.keys(raw).forEach(slotKey => {
          const entry = raw[slotKey];
          newEdits[slotKey] = {
            title: entry.title ?? entry.editedTitle ?? '',
            classroom: entry.classroom ?? entry.editedClassroom ?? ''
          };
        });
        setEditedSlots(newEdits);
      } catch(e) {}
    }
  }, [dbEditedSlots, netId]);

  useEffect(() => {
    if (timetableJSON && timetableJSON.days && timetableJSON.days.length > 0) {
        setParsedData(timetableJSON);
        return;
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent || '', 'text/html');
        const table = doc.querySelector('table');
        if (table) {
            const parsed = parseTableToJSON(table);
            setParsedData(parsed);
        }
    } catch (e) {
        console.error("Failed to parse timetable:", e);
    }
  }, [htmlContent, timetableJSON]);

  useEffect(() => {
      const today = new Date();
      const currentDayOrderObj = getDayOrderForDate(today, calendarData);
      const activeDayOrder = currentDayOrderObj ? currentDayOrderObj : null; 
      if (activeDayOrder && !isNaN(parseInt(activeDayOrder))) {
          setMobileDayIndex(Math.max(0, parseInt(activeDayOrder) - 1));
      }
  }, [calendarData]);

  const updateCache = (newEdits: any) => {
    const netIdKey = Object.keys(localStorage).find(key => key.startsWith('unfuglyData_') && key !== 'unfuglyData_calendar');
    if (netIdKey) {
        try {
            const cacheStr = localStorage.getItem(netIdKey);
            if (cacheStr) {
                const cache = JSON.parse(cacheStr);
                cache.editedSlots = newEdits;
                localStorage.setItem(netIdKey, JSON.stringify(cache));
            }
        } catch(e) {}
    }
  };

  const handleSlotClick = (slotId: string, defaultTitle: string, defaultRoom: string) => {
    const title = window.prompt('Enter course title:', defaultTitle);
    if (title === null) return; 

    const classroom = window.prompt('Enter classroom (optional):', defaultRoom);
    if (classroom === null) return;

    const newEdits = { ...editedSlots, [slotId]: { title: title || slotId, classroom } };
    setEditedSlots(newEdits);
    updateCache(newEdits);

    const dbFormat: Record<string, { title: string; classroom: string; editedTitle: string; editedClassroom: string }> = {};
    Object.keys(newEdits).forEach(key => {
      dbFormat[key] = {
        title: newEdits[key].title,
        classroom: newEdits[key].classroom,
        editedTitle: newEdits[key].title,
        editedClassroom: newEdits[key].classroom
      };
    });
    fetch(`${API_URL}/api/v1/user/slots`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ edited_slots_json: dbFormat })
    }).catch(err => console.error('Failed to save edited slots to backend:', err));
  };

  const removeEdit = (e: any, slotId: string) => {
      e.stopPropagation();
      const newEdits = { ...editedSlots };
      delete newEdits[slotId];
      setEditedSlots(newEdits);
      updateCache(newEdits);

      const dbFormat: Record<string, { title: string; classroom: string; editedTitle: string; editedClassroom: string }> = {};
      Object.keys(newEdits).forEach(key => {
        dbFormat[key] = {
          title: newEdits[key].title,
          classroom: newEdits[key].classroom,
          editedTitle: newEdits[key].title,
          editedClassroom: newEdits[key].classroom
        };
      });
      fetch(`${API_URL}/api/v1/user/slots`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ edited_slots_json: dbFormat })
      }).catch(err => console.error('Failed to save edited slots to backend after removal:', err));
  };

  const downloadTimetable = async () => {
    if (!containerRef.current) return;
    const tableEl = containerRef.current.querySelector('table');
    if (!tableEl) return;

    try {
      const isMobileHidden = window.getComputedStyle(containerRef.current).display === 'none';
      const originalWidth = containerRef.current.style.width;
      const originalMinWidth = tableEl.style.minWidth;
      const originalPadding = containerRef.current.style.padding;
      const originalBgColor = containerRef.current.style.backgroundColor;

      if (isMobileHidden) {
          containerRef.current.classList.remove('hidden', 'lg:block');
          containerRef.current.style.display = 'block';
          containerRef.current.style.position = 'absolute';
          containerRef.current.style.top = '-9999px';
          containerRef.current.style.width = '1200px'; 
          tableEl.style.minWidth = '1200px';
          containerRef.current.style.padding = '20px';
          containerRef.current.style.backgroundColor = '#121212';
      }

      const originalFilters: string[] = [];
      const originalOpacities: string[] = [];
      const rows = Array.from(tableEl.querySelectorAll('tbody tr'));
      rows.forEach(row => {
        const el = row as HTMLElement;
        originalFilters.push(el.style.filter);
        originalOpacities.push(el.style.opacity);
        el.style.filter = 'none';
        el.style.opacity = '1';
      });

      if (isMobileHidden) {
          await new Promise(res => setTimeout(res, 50));
      }

      const canvas = await html2canvas(tableEl, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true,
        windowWidth: 1200
      });

      rows.forEach((row, i) => {
        const el = row as HTMLElement;
        el.style.filter = originalFilters[i];
        el.style.opacity = originalOpacities[i];
      });

      if (isMobileHidden) {
          containerRef.current.classList.add('hidden', 'lg:block');
          containerRef.current.style.display = '';
          containerRef.current.style.position = '';
          containerRef.current.style.top = '';
          containerRef.current.style.width = originalWidth;
          tableEl.style.minWidth = originalMinWidth;
          containerRef.current.style.padding = originalPadding;
          containerRef.current.style.backgroundColor = originalBgColor;
      }

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      const section = profileData?.section || 'unknown';
      const semester = profileData?.semester || 'unknown';
      link.download = `${section}_${semester}_timetable.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating timetable image:', err);
    }
  };

  const renderEditToolbar = (isMobileView = false) => {
    const buttons = [
      { id: 'hide', label: 'Hide', themeColor: '#546E7A', title: 'Hide Edits' },
      { id: 'show', label: 'Show', themeColor: '#43A047', title: 'Show/Save Edits' },
      { id: 'modify', label: 'Modify', themeColor: '#1E88E5', title: 'Edit Mode' }
    ];

    return (
      <div 
        id="editMenu" 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px',
          marginLeft: isMobileView ? '0px' : '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          gap: '4px',
          transition: 'all 0.3s ease'
        }}
      >
        {buttons.map(btn => {
          const active = viewState === btn.id;
          const onClick = () => {
            setViewState(btn.id as any);
            setIsEditMode(btn.id === 'modify');
          };

          return (
            <button
              key={btn.id}
              id={`${btn.id}EditsButton`}
              title={btn.title}
              onClick={onClick}
              style={{
                backgroundColor: active ? btn.themeColor : 'transparent',
                color: active ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.8)',
                borderWidth: 'medium',
                borderStyle: 'none',
                borderColor: 'currentcolor',
                borderImage: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                padding: '6px 14px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                fontSize: '12px',
                transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minWidth: '65px',
                boxShadow: active ? `${btn.themeColor}66 0px 4px 12px` : 'none',
                transform: active ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              {btn.label}
            </button>
          );
        })}
      </div>
    );
  };

  const renderDesktopTable = () => {
    if (!parsedData || !parsedData.headers || !parsedData.days) return null;
    
    let hasExtraSlots = parsedData.extraSlotFlag;
    if (!hasExtraSlots && parsedData.days) {
        hasExtraSlots = parsedData.days.some((day: any) => 
            day.slots?.slice(-2).some((slot: any) => slot.title && slot.title.trim() !== '')
        ) || false;
    }

    const today = new Date();
    const currentDayOrderObj = getDayOrderForDate(today, calendarData);
    const activeDayOrder = currentDayOrderObj ? currentDayOrderObj : null; 

    return (
      <table style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', borderCollapse: 'separate', borderSpacing: '2px', backgroundColor: '#000', fontSize: '0.9em' }}>
        <caption className="t1" style={{ display: 'table-caption', marginTop: '5px', backgroundColor: '#2c2c2c', color: '#fff', padding: '5px', fontWeight: 'normal' }}>
          Your Personalized Timetable by Unfugly
        </caption>
        <thead>
          <tr>
            {parsedData.headers.map((headerText: string, index: number) => {
              if (!hasExtraSlots && index >= parsedData.headers.length - 2) return null;
              return (
                <th key={index} style={{
                  padding: '8px 5px',
                  backgroundColor: '#F1948A',
                  color: '#000',
                  fontWeight: 'normal',
                  fontSize: '10px',
                  borderRadius: '3px',
                  width: index === 0 ? '1%' : '8.25%',
                  whiteSpace: index === 0 ? 'nowrap' : 'normal'
                }}>
                  {headerText}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {parsedData.days.map((day: any, dIndex: number) => {
             const rowDayOrderMatch = day.dayName.trim().match(/^(?:Day[\s\-]*)?(\d+)/i);
             const rowDayOrder = rowDayOrderMatch ? rowDayOrderMatch[1] : null;
             const isActive = !activeDayOrder || String(rowDayOrder) === String(activeDayOrder);
             const isDull = activeDayOrder && String(rowDayOrder) !== String(activeDayOrder);

             return (
               <tr key={dIndex} style={{
                 opacity: isDull ? 0.65 : 1,
                 filter: isDull ? 'grayscale(30%)' : 'none',
                 transition: 'all 0.3s ease'
               }}>
                 <td style={{ padding: '8px 5px', width: '1%', whiteSpace: 'nowrap', backgroundColor: '#F8C471', color: '#000', fontSize: '10px', borderRadius: '3px' }}>
                   {day.dayName}
                 </td>
                 {day.slots.map((slot: any, sIndex: number) => {
                    if (!hasExtraSlots && sIndex >= day.slots.length - 2) return null;
                    
                    const slotId = `slot-${dIndex * day.slots.length + sIndex + 1}`;
                    const rawSlotText: string = slot.title ? String(slot.title).replace('Slot:', '').trim() : '';
                    const cleanSlotText: string = rawSlotText.split('/')[0].trim().toUpperCase();

                    const actualCourseData: Record<string, any> = courseData?.slotToCourse || courseData;
                    const mappedCourse = actualCourseData && (actualCourseData[cleanSlotText] || actualCourseData[rawSlotText]);

                    let displayBg = slot.bgColor;
                    let displayTitle = slot.title;
                    let displayRoom = slot.classroom;
                    let isReplaced = false;
                    let isGrey = false;

                    const edit = editedSlots[slotId];

                    if (edit && viewState !== 'hide') {
                        displayTitle = edit.title;
                        displayRoom = edit.classroom;
                        displayBg = '#FBC02D';
                        isReplaced = true;
                    } else if (mappedCourse && cleanSlotText !== '') {
                        displayTitle = mappedCourse['Course Title'] || mappedCourse.title || displayTitle;
                        displayRoom = mappedCourse['Room No.'] || mappedCourse.classroom || mappedCourse.classRoom || displayRoom;
                        isReplaced = true;
                    } else if (cleanSlotText !== '') {
                        displayBg = '#585b5b';
                        isGrey = true;
                    }

                    if (!displayTitle && cleanSlotText === '') {
                        return <td key={sIndex} className="empty-slot-mask empty-slot" style={{ padding: '8px 5px', borderRadius: '3px' }}></td>;
                    }

                    return (
                        <td 
                           key={sIndex}
                           id={slotId}
                           title={`Slot: ${rawSlotText}`}
                           className={isReplaced ? 'replaced-slot' : ''}
                           onClick={() => isEditMode ? handleSlotClick(slotId, displayTitle, displayRoom) : null}
                           style={{
                              backgroundColor: displayBg,
                              padding: '8px 5px',
                              overflowWrap: 'anywhere',
                              wordBreak: 'normal',
                              whiteSpace: 'normal',
                              borderRadius: '3px',
                              position: 'relative',
                              cursor: isEditMode ? 'pointer' : 'default',
                              transition: 'all 0.2s ease-in-out',
                              color: isGrey ? 'rgb(170,170,170)' : 'inherit'
                           }}
                        >
                           {isEditMode && edit && viewState !== 'hide' && (
                               <button 
                                 className="removeEditButton"
                                 onClick={(e) => removeEdit(e, slotId)}
                                 style={{ position:'absolute', top:'2px', right:'2px', background:'#E53935', color:'white', border:'none', borderRadius:'50%', width:'18px', height:'18px', fontSize:'12px', cursor:'pointer', display:'flex', justifyContent:'center', alignItems:'center', zIndex:10 }}
                               >
                                 ×
                               </button>
                           )}
                           
                           <span style={{ 
                               display: 'block', 
                               fontWeight: isGrey ? '400' : '600',
                               fontSize: '11px',
                               color: isGrey ? 'rgb(170,170,170)' : '#334'
                           }}>
                               {isGrey ? (cleanSlotText || rawSlotText) : displayTitle}
                           </span>
                           
                           {!isGrey && displayRoom && (
                               <span style={{
                                   display: 'block',
                                   fontWeight: '600',
                                   fontSize: '9px',
                                   color: '#555'
                               }}>
                                   {displayRoom.startsWith('Room:') ? displayRoom : `Room: ${displayRoom}`}
                               </span>
                           )}
                        </td>
                    );
                 })}
               </tr>
             );
          })}
        </tbody>
      </table>
    );
  };

  const renderMobileTable = () => {
     if (!parsedData || !parsedData.days || parsedData.days.length === 0) return null;
     
     const currentDayOrderObj = getDayOrderForDate(new Date(), calendarData);
     const isActiveDay = String(mobileDayIndex + 1) === currentDayOrderObj;

     const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
     const handleTouchEnd = (e: React.TouchEvent) => {
       if (!touchStart) return;
       const touchEnd = e.changedTouches[0].clientX;
       const dist = touchStart - touchEnd;
       if (dist > 50) setMobileDayIndex(prev => prev === parsedData.days.length - 1 ? 0 : prev + 1);
       if (dist < -50) setMobileDayIndex(prev => prev === 0 ? parsedData.days.length - 1 : prev - 1);
       setTouchStart(null);
     };

     return (
          <div className="lg:hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <div className="flex items-center justify-between bg-[#1e1e1e] border border-[#333] rounded-t-xl p-3 shadow-lg">
                  <button 
                     onClick={() => setMobileDayIndex(prev => prev === 0 ? parsedData.days.length - 1 : prev - 1)}
                     className="p-2 rounded-full bg-[#333] text-white transition-opacity hover:bg-[#444]"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <div className="text-center flex items-center justify-center gap-3">
                     <div className="text-xl font-black text-white uppercase tracking-widest">
                        Day Order {String(parsedData.days[mobileDayIndex]?.dayName || (mobileDayIndex + 1)).replace(/day\s*/i, '')}
                     </div>
                     <button
                        onClick={downloadTimetable}
                        className="bg-[#333] hover:bg-[#444] text-white p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer select-none"
                        title="Download Timetable"
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                     </button>
                  </div>
                  <button 
                     onClick={() => setMobileDayIndex(prev => prev === parsedData.days.length - 1 ? 0 : prev + 1)}
                     className="p-2 rounded-full bg-[#333] text-white transition-opacity hover:bg-[#444]"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
              </div>

              <div className={`bg-[#121212] border border-t-0 border-[#333] rounded-b-xl p-4 space-y-3 shadow-lg transition-opacity duration-300 ${!isActiveDay ? 'opacity-50 grayscale-[0.3]' : 'opacity-100'}`}>
                  {parsedData.days[mobileDayIndex]?.slots?.map((slot: any, idx: number) => {
                      const timeHeader = parsedData.headers[idx + 1] || ''; 
                      
                      const totalSlotsBefore = parsedData.days.slice(0, mobileDayIndex).reduce((acc: number, d: any) => acc + d.slots.length, 0);
                      const slotId = `slot-${totalSlotsBefore + idx + 1}`;

                      const rawSlotText = slot.title ? String(slot.title).replace('Slot:', '').trim() : '';
                      const cleanSlotText = rawSlotText.split('/')[0].trim().toUpperCase();

                      const actualCourseData: Record<string, any> = courseData?.slotToCourse || courseData;
                      const mappedCourse = actualCourseData && (actualCourseData[cleanSlotText] || actualCourseData[rawSlotText]);

                      let displayTitle = slot.title;
                      let displayRoom = slot.classroom;
                      let displayBg = slot.bgColor !== 'transparent' && slot.bgColor ? slot.bgColor : '#333';
                      let isReplaced = false;
                      let isGrey = false;

                      const edit = editedSlots[slotId];

                      if (edit && viewState !== 'hide') {
                          displayTitle = edit.title;
                          displayRoom = edit.classroom;
                          displayBg = '#FBC02D';
                          isReplaced = true;
                      } else if (mappedCourse && cleanSlotText !== '') {
                          displayTitle = mappedCourse['Course Title'] || mappedCourse.title || displayTitle;
                          displayRoom = mappedCourse['Room No.'] || mappedCourse.classroom || mappedCourse.classRoom || displayRoom;
                          isReplaced = true;
                      } else if (cleanSlotText !== '') {
                          displayBg = '#585b5b';
                          isGrey = true;
                      }

                      if (!displayTitle && cleanSlotText === '') {
                          return null;
                      }

                      // Type-based colors for mobile card sidebar
                      if (!isReplaced || displayBg === '#333' || displayBg === 'transparent') {
                          const isPrac = cleanSlotText.startsWith('P');
                          const isExtra = cleanSlotText.startsWith('L');
                          const isTheory = cleanSlotText.match(/^[A-G]/);

                          if (isPrac || (mappedCourse && (mappedCourse as any)['Course Type']?.toLowerCase().includes('practical'))) {
                              displayBg = '#81c784';
                          } else if (isExtra) {
                              displayBg = '#42a5f5';
                          } else if (isTheory || mappedCourse) {
                              displayBg = '#ffd54f';
                          } else {
                              displayBg = '#555555';
                          }
                      }

                      return (
                          <div 
                             key={idx} 
                             className={`bg-[#1e1e1e] border border-[#333] rounded-lg p-3 flex flex-col relative overflow-hidden ${isEditMode ? 'cursor-pointer ring-1 ring-[#1E88E5] hover:bg-[#2a2a2a]' : ''}`}
                             style={{ borderLeftColor: displayBg, borderLeftWidth: '4px' }}
                             onClick={() => {
                                 if (isEditMode) {
                                     handleSlotClick(slotId, displayTitle, displayRoom);
                                 }
                             }}
                          >
                             {isEditMode && edit && viewState !== 'hide' && (
                                 <button 
                                     onClick={(e) => removeEdit(e, slotId)}
                                     className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition"
                                 >
                                     ×
                                 </button>
                             )}
                             <div className="flex justify-between items-start mb-1">
                                 <div className="font-bold text-white text-[0.95em] pr-6">{displayTitle}</div>
                                 <div className="text-xs font-medium px-2 py-1 bg-[#333] rounded text-gray-300 shrink-0">{timeHeader}</div>
                             </div>
                             
                             <div className="flex items-center gap-2 mt-auto pt-2">
                                 <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${displayBg}22`, color: displayBg }}>
                                     {cleanSlotText || rawSlotText || slotId}
                                 </span>
                                 {displayRoom && (
                                     <span className="text-xs text-gray-400 flex items-center gap-1">
                                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                         {String(displayRoom).replace('Room:', '').trim()}
                                     </span>
                                 )}
                             </div>
                          </div>
                      );
                  })}
              </div>
          </div>
     );
  };

  return (
    <div className="space-y-4">
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center mb-4 relative">
        <h2 className="text-xl font-bold text-white mr-4">Timetable</h2>
        {renderEditToolbar(false)}
        
        <button
           onClick={downloadTimetable}
           className="bg-[#1e1e1e] border border-[#333] hover:bg-[#2a2a2a] text-white p-2 rounded-full shadow-lg transition-colors ml-auto flex items-center justify-center w-9 h-9"
           title="Download Timetable"
        >
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
               <polyline points="7 10 12 15 17 10"></polyline>
               <line x1="12" y1="15" x2="12" y2="3"></line>
           </svg>
        </button>
      </div>

      {/* Mobile Portal — header div is hidden on desktop via lg:hidden CSS */}
      {portalNode
        ? createPortal(
            <div className="flex items-center gap-2 pb-2 overflow-x-auto w-full hide-scrollbar">
                {renderEditToolbar(true)}
            </div>, 
            portalNode!
          ) 
        : null}
      
      {viewState === 'modify' && (
         <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400 mb-4 animate-pulse">
            Click on any active slot below to override the class name and room. Set the name to blank to revert your changes.
         </div>
      )}

      <div 
        ref={containerRef}
        className="timetable-container overflow-x-auto rounded-xl bg-[#1e1e1e] border border-[#333] shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 hidden lg:block"
      >
         {renderDesktopTable()}
      </div>

      {renderMobileTable()}
    </div>
  );
}
