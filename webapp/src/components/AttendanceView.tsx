'use client';

import AttendancePredict from './AttendancePredict';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export default function AttendanceView({ data, isBgScraping }: { data: any, isBgScraping: boolean }) {
  const [isMobile, setIsMobile] = useState(false);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
     setIsMobile(window.innerWidth < 1024);
     const handleResize = () => setIsMobile(window.innerWidth < 1024);
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // No isMobile guard — watch for the portal node as soon as component mounts
    const tryFind = () => {
      const el = document.getElementById('mobile-header-actions-Attendance');
      if (el) { setPortalNode(el); return true; }
      return false;
    };
    if (!tryFind()) {
      const observer = new MutationObserver(() => { if (tryFind()) observer.disconnect(); });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
  }, []); // mount-only

  const safeData = data || { attendanceData: [], courseData: {}, marksData: [] };
  const predictComponent = <AttendancePredict attendanceData={safeData.attendanceData} courseData={safeData.courseData} />;
  

  return (
    <>
      <div className="hidden lg:flex items-center mb-6">
         <h2 className="text-2xl font-bold text-white">Attendance</h2>
         {predictComponent}
      </div>
      
      {portalNode ? createPortal(predictComponent, portalNode) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(!safeData.attendanceData || safeData.attendanceData.length === 0) && isBgScraping ? (
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
        ) : safeData.attendanceData?.map((item: any, i: number) => {
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
                 
                 {(hoursConducted !== undefined && hoursConducted !== 'N/A') && (
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
    </>
  );
}
