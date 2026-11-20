'use client';

import { useState, useRef, useEffect } from 'react';
import { Lock, FileText, X } from 'lucide-react';

export default function MarksView({ data, isBgScraping }: { data: any, isBgScraping: boolean }) {
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [activeInfoIndex, setActiveInfoIndex] = useState<number | null>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  // Close info popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeInfoIndex !== null && infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setActiveInfoIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeInfoIndex]);

  return (
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
         const courseCode = String(item.courseCode || item.CourseCode || '').trim();
         const courseTitle = item.courseTitle || item.CourseTitle || '';
         const courseType = item.courseType || item.CourseType || '';
         const totalMaxMarks = Number(item.totalMaxMarks ?? item.TotalMaxMarks ?? 0);
         const totalObtainedMarks = Number(item.totalObtainedMarks ?? item.TotalObtainedMarks ?? 0);
         const isInternal = courseCode.toUpperCase().endsWith('P') || totalMaxMarks > 60;
         const components = Array.isArray(item.components) ? item.components : (Array.isArray(item.Components) ? item.Components : []);

         return (
         <div 
            key={i} 
            className="bg-[#1e1e1e] border border-[#333] rounded-xl p-5 relative transition-all"
            style={{ zIndex: hoveredCardIndex === i || activeInfoIndex === i ? 50 : 1 }}
            onMouseEnter={() => setHoveredCardIndex(i)}
            onMouseLeave={() => setHoveredCardIndex(null)}
         >
             <div className="flex justify-between items-start mb-4 relative z-20">
               <div className="max-w-[75%]">
                  <h3 className="font-bold text-[1.1em] m-0">
                     {courseCode} - {(() => {
                         if (courseTitle) return courseTitle;
                         if (!data.courseData) return '';
                         const actualCourseData = data.courseData.slotToCourse || data.courseData;
                         const c = (Object.values(actualCourseData) as any[]).find((c: any) => c && (c['Course Code'] === courseCode || c.courseCode === courseCode));
                         return c ? (c['Course Title'] || c.courseTitle || '') : '';
                     })()}
                  </h3>
                  <p className="text-gray-400 text-[0.9em] mt-[2px] mb-0 opacity-80">
                     {courseType}
                     {isInternal && (
                         <span className="text-[0.8em] text-[#F59E0B]"> (Internal)</span>
                     )}
                  </p>
               </div>
               <div className="flex flex-col items-end">
                  <div className="flex items-center gap-3">
                      <span className="font-bold text-[1em]" style={{ color: (() => {
                         const pct = totalMaxMarks > 0 ? (totalObtainedMarks / totalMaxMarks) * 100 : 0;
                         if (isInternal) {
                            if (pct >= 90) return '#81c784';
                            if (pct >= 50) return '#F59E0B';
                            return '#e57373';
                         } else {
                            if (pct >= 85) return '#81c784';
                            if (pct >= 50) return '#F59E0B';
                            return '#e57373';
                         }
                      })() }}>
                         {totalObtainedMarks} <span className="text-gray-200">/ {totalMaxMarks}</span>
                      </span>
                      
                      <div 
                         className="text-gray-500 hover:text-white cursor-pointer relative z-50"
                         onClick={(e) => {
                             e.stopPropagation();
                             setActiveInfoIndex(activeInfoIndex === i ? null : i);
                         }}
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                         </svg>
                         
                         <div 
                            ref={activeInfoIndex === i ? infoRef : null}
                            className={`absolute right-0 top-6 bg-[#1a1a2e] border border-[#333] rounded-[10px] shadow-[0_6px_24px_rgba(0,0,0,0.6)] transition-all z-50 p-[14px_16px] min-w-[260px] text-left cursor-default pointer-events-auto leading-[1.7] ${activeInfoIndex === i ? 'opacity-100 visible' : 'opacity-0 invisible hidden md:group-hover:block lg:group-hover:block'}`} 
                            onClick={(e) => e.stopPropagation()}
                         >
                             <b className="text-[1em] text-white">Course Info</b><br/>
                             <span className="text-[0.85em] text-[#eee]">Credit: <b className="text-white">{(() => {
                                if (!data.courseData) return 'N/A';
                                const actualCourseData = data.courseData.slotToCourse || data.courseData;
                                const c = (Object.values(actualCourseData) as any[]).find((c: any) => c && (c['Course Code'] === courseCode || c.courseCode === courseCode));
                                return c ? (c.Credit ?? c.credits ?? 'N/A') : 'N/A';
                             })()}</b></span><br/>
                             <span className="text-[0.85em] text-[#eee]">Faculty: <span className="text-[#64b5f6] hover:underline cursor-pointer">{(() => {
                                if (!data.courseData) return 'N/A';
                                const actualCourseData = data.courseData.slotToCourse || data.courseData;
                                const c = (Object.values(actualCourseData) as any[]).find((c: any) => c && (c['Course Code'] === courseCode || c.courseCode === courseCode));
                                return c ? (c['Faculty Name'] || c.facultyName || 'N/A') : 'N/A';
                             })()}</span></span><br/>
                             <div className="mt-1 text-[#aaa] text-[0.82em] flex items-center gap-1.5">
                                <span className="text-gray-400">Type:</span> 
                                {isInternal 
                                   ? <span className="flex items-center gap-1 text-gray-200"><Lock size={12} className="text-[#F59E0B]" /> Fully Internal</span> 
                                   : <span className="flex items-center gap-1 text-gray-200"><FileText size={12} className="text-[#64b5f6]" /> Theory (60+40)</span>
                                }
                             </div>
                             
                             {!isInternal && (
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
                                         const internalObtained = components.length > 0
                                            ? components.reduce((sum: number, c: any) => sum + (parseFloat(c.obtainedMarks || c.ObtainedMarks) || 0), 0)
                                            : 0;
                                         const extNeeded40 = Math.max(0, g.min - internalObtained);
                                         const extNeeded75 = extNeeded40 > 40 ? '—' : Math.ceil(extNeeded40 * 75 / 40);
                                         const impossible = extNeeded75 === '—' || (typeof extNeeded75 === 'number' && extNeeded75 > 75);
                                         const rowColor = impossible ? '#E57373' : (extNeeded75 > 70 ? '#F59E0B' : '#81C784');
                                         const displayNeeded = impossible ? <X size={14} className="inline-block" /> : `${extNeeded75}/75`;
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

             {totalMaxMarks > 0 && (
                <div className="w-full bg-[#333] h-[8px] rounded-[4px] mb-[8px] relative z-0 overflow-hidden">
                   <div 
                      className="h-full transition-all duration-400 ease-in-out"
                      style={{ 
                         width: `${Math.min(100, (totalObtainedMarks / totalMaxMarks) * 100)}%`,
                         backgroundColor: (() => {
                            const pct = (totalObtainedMarks / totalMaxMarks) * 100;
                            if (isInternal) {
                               if (pct >= 90) return '#81C784';
                               if (pct >= 50) return '#F59E0B';
                               return '#E57373';
                            } else {
                               if (pct >= 85) return '#81C784';
                               if (pct >= 50) return '#F59E0B';
                               return '#E57373';
                            }
                         })()
                      }}
                   ></div>
                </div>
             )}

             {components.length > 0 && (
                <div className="flex flex-wrap gap-[8px] relative z-0">
                   {components.map((comp: any, j: number) => {
                      const obtainedRaw = comp.obtainedMarks ?? comp.ObtainedMarks;
                      const maxRaw = comp.maxMarks ?? comp.MaxMarks;
                      const compName = comp.componentName || comp.ComponentName || `Component ${j + 1}`;
                      const isAbsent = obtainedRaw === 'Absent';
                      const obtained = parseFloat(obtainedRaw);
                      const max = parseFloat(maxRaw);
                      const compPct = !isAbsent && max > 0 && !isNaN(obtained) ? (obtained / max) * 100 : 0;
                      
                      const getScoreColor = (pct: number) => {
                          if (isInternal) {
                              if (pct >= 90) return '#81C784';
                              if (pct >= 50) return '#F59E0B';
                              return '#E57373';
                          } else {
                              if (pct >= 85) return '#81C784';
                              if (pct >= 50) return '#F59E0B';
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
                            {compName}: {isAbsent ? 'Absent' : `${obtainedRaw}/${maxRaw}`}
                         </span>
                      );
                   })}
                </div>
             )}
          </div>
          );
       })}
    </div>
  );
}
