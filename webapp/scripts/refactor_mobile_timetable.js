const fs = require('fs');

// ======================= TimetableView.tsx =======================
let tv = fs.readFileSync('webapp/src/components/TimetableView.tsx', 'utf8');

// Let's replace the renderMobileTable function completely
// Find const renderMobileTable = () => { up to the next };
const startToken = '  const renderMobileTable = () => {';
const endToken = '  };';

const startIndex = tv.indexOf(startToken);
// Find the closing }; of the renderMobileTable block (which ends before return)
// Since we know the approximate length or structure, let's locate the return block and find the closing };
const returnIndex = tv.indexOf('  return (', startIndex);
const endIndex = tv.lastIndexOf('  };', returnIndex) + 4; // Include the '  };'

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not locate renderMobileTable boundary!');
  process.exit(1);
}

const mobileTableContent = `  const renderMobileTable = () => {
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
                        Day Order {String(parsedData.days[mobileDayIndex]?.dayName || (mobileDayIndex + 1)).replace(/day\\s*/i, '')}
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

              <div className={\`bg-[#121212] border border-t-0 border-[#333] rounded-b-xl p-4 space-y-3 shadow-lg transition-opacity duration-300 \${!isActiveDay ? 'opacity-50 grayscale-[0.3]' : 'opacity-100'}\`}>
                  {parsedData.days[mobileDayIndex]?.slots?.map((slot: any, idx: number) => {
                      const timeHeader = parsedData.headers[idx + 1] || ''; 
                      
                      const totalSlotsBefore = parsedData.days.slice(0, mobileDayIndex).reduce((acc: number, d: any) => acc + d.slots.length, 0);
                      const slotId = \`slot-\${totalSlotsBefore + idx + 1}\`;

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

                      const isEmpty = !displayTitle || displayTitle.trim() === '';
                      if (isEmpty) return null;

                      const isPrac = cleanSlotText.startsWith('P');

                      return (
                          <div 
                             key={idx} 
                             className={\`bg-[#1e1e1e] border border-[#333] rounded-lg p-3 flex flex-col relative overflow-hidden \${isEditMode ? 'cursor-pointer ring-1 ring-[#1E88E5] hover:bg-[#2a2a2a]' : ''}\`}
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
                                 <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: \`\${displayBg}22\`, color: displayBg }}>
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
  };`;

tv = tv.substring(0, startIndex) + mobileTableContent + tv.substring(endIndex);

// Also remove the download button from the mobile portal
tv = tv.replace(
  `                 <button
                    onClick={downloadTimetable}
                    className="bg-[#1e1e1e] border border-[#333] hover:bg-[#2a2a2a] text-white p-2 rounded-full shadow-lg transition-colors ml-auto flex flex-shrink-0 items-center justify-center w-9 h-9"
                    title="Download Timetable"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                 </button>`,
  ''
);

fs.writeFileSync('webapp/src/components/TimetableView.tsx', tv);
console.log('TimetableView mobile render refactored successfully.');

// ======================= dashboard/page.tsx - fix padding/height =======================
let dp = fs.readFileSync('webapp/src/app/dashboard/page.tsx', 'utf8');

// 1. Update height on main to end above bottom nav on mobile
dp = dp.replace(
  'className="flex-1 p-4 lg:p-8 lg:m-4 lg:ml-2 lg:bg-[#2a2a2a] lg:rounded-2xl h-[calc(100vh-32px)] overflow-y-auto w-full relative custom-scrollbar"',
  'className="flex-1 p-4 lg:p-8 lg:m-4 lg:ml-2 lg:bg-[#2a2a2a] lg:rounded-2xl h-[calc(100vh-140px)] lg:h-[calc(100vh-32px)] overflow-y-auto w-full relative custom-scrollbar"'
);

// 2. Reduce the extra bottom padding on the inner container on mobile since the scrollbar now ends perfectly above the bottom nav
dp = dp.replace(
  'pb-24 lg:pb-0',
  'pb-4 lg:pb-0'
);

fs.writeFileSync('webapp/src/app/dashboard/page.tsx', dp);
console.log('dashboard/page.tsx layout height and padding updated successfully.');
