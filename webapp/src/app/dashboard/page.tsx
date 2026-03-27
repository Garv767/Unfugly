'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TimetableView from '@/components/TimetableView';
import AttendancePredict from '@/components/AttendancePredict';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isBgScraping, setIsBgScraping] = useState(false);
  const [progressMsg, setProgressMsg] = useState('Initializing...');
  const [data, setData] = useState<any>(null);
  const [calendarData, setCalendarData] = useState<any>(null);
  const scrapingStarted = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('unfugly_token');
    const net_id = localStorage.getItem('unfugly_net_id');

    if (!token || !net_id) {
      router.push('/login');
      return;
    }

    // Try to fetch cached data first
    fetch('http://localhost:3000/api/v1/user/data', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(cachedData => {
      if (cachedData.profileData && cachedData.attendanceData) {
        // We have cached data, show immediately!
        setData(cachedData);
        setLoading(false);
        // Start background scrape anyway (auto-refresh)
        startScraping(token, net_id, true);
      } else {
        // No cached data, hard scrape
        startScraping(token, net_id, false);
      }
    })
    .catch(err => {
      console.error(err);
      startScraping(token, net_id, false);
    });

    // Optionally fetch calendar data here to pass to Timetable/Predict
    fetch('http://localhost:3000/api/v1/calendar')
      .then(res => res.json())
      .then(calData => setCalendarData(calData))
      .catch(e => console.log('Calendar not available or endpoint missing yet', e));
  }, [router]);

  const startScraping = (token: string, net_id: string, isBackground: boolean) => {
    if (scrapingStarted.current) return;
    scrapingStarted.current = true;
    
    if (isBackground) setIsBgScraping(true);
    else setLoading(true);

    const eventSource = new EventSource(`http://localhost:3000/api/v1/scrape/progress/${net_id}`);
    
    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      setProgressMsg(parsed.message);
      if (parsed.step === 'complete' || parsed.step === 'error') {
        eventSource.close();
      }
    };

    fetch('http://localhost:3000/api/v1/scrape/all', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(scrapedData => {
      if (scrapedData.error) {
        if (!isBackground) {
           alert(scrapedData.error);
           router.push('/login');
        } else {
           setIsBgScraping(false);
           scrapingStarted.current = false;
        }
        return;
      }
      
      setData(scrapedData);
      setLoading(false);
      setIsBgScraping(false);
      scrapingStarted.current = false; // Reset for future scrapes if needed
      
      // Save it back to DB
      fetch('http://localhost:3000/api/v1/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          net_id,
          profile_data: scrapedData.profileData,
          attendance_json: scrapedData.attendanceData,
          marks_json: scrapedData.marksData,
          timetable_html: scrapedData.timetableHTML,
          course_slot_map_json: scrapedData.courseSlotMap,
          source: 'webapp',
          last_updated_ist: new Date().toISOString()
        })
      });

    })
    .catch(err => {
      console.error(err);
      if (!isBackground) {
        setLoading(false);
        alert('Failed to scrape data. Please login again.');
        router.push('/login');
      } else {
        setIsBgScraping(false);
        scrapingStarted.current = false;
      }
    });
  };

  const handleLogout = () => {
     localStorage.removeItem('unfugly_token');
     localStorage.removeItem('unfugly_net_id');
     router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F1F2E] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xl font-medium text-accent2 animate-pulse">{progressMsg}</p>
        <p className="text-sm text-muted">This usually takes 15-30 seconds depending on Academia speeds.</p>
      </div>
    );
  }

  if (!data || !data.profileData) return null;

  return (
    <div className="min-h-screen bg-[#2e2e2e] text-white flex overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-[280px] bg-[#363636] border-r border-[#444] p-6 flex flex-col justify-between h-screen sticky top-0 shrink-0">
        <div>
           <div className="flex items-start mb-6 gap-3">
              <div className="flex items-center gap-2">
                 <div className="bg-[#bbdefb] text-black font-bold px-2 py-1 rounded text-sm tracking-wider">SRM</div>
                 <div className="text-lg font-semibold tracking-wide flex items-center gap-2">
                    <span className="bg-black text-white px-2 py-1 rounded text-sm">Unfuglied</span>
                 </div>
              </div>
           </div>
           
           <h3 className="text-white text-lg font-bold mb-4 border-b border-[#555] pb-2">Profile</h3>
           <div className="space-y-4 text-[13px] relative z-10">
             <div><span className="font-bold">Name:</span> {data.profileData.name}</div>
             <div><span className="font-bold">Reg No:</span> {data.profileData.registrationNo}</div>
             <div><span className="font-bold">Program:</span> {data.profileData.programmeBranch}</div>
             <div><span className="font-bold">Section:</span> {data.profileData.section}</div>
             <div><span className="font-bold">Semester:</span> {data.profileData.semester}</div>
             <div><span className="font-bold mt-4 block">Department:</span> {data.profileData.schoolDepartment}</div>
           </div>
        </div>
        
        <div>
           <button onClick={handleLogout} className="w-full py-2 bg-[#ff5252]/10 text-[#ff5252] rounded hover:bg-[#ff5252]/20 font-bold transition">Logout</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 h-screen overflow-y-auto w-full relative">
         {isBgScraping && (
            <div className="absolute top-4 right-6 bg-[#333] px-3 py-1.5 rounded-full text-xs text-white flex items-center shadow border border-[#444] z-50">
               <div className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin mr-2"></div> 
               Syncing latest data...
               <span className="ml-2 text-muted truncate max-w-[150px] italic">({progressMsg})</span>
            </div>
         )}
         
         {/* Timetable Section */}
         <div className="mb-10 w-full overflow-x-auto min-w-[700px]">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold flex items-center">Timetable</h2>
             </div>
             {data.timetableHTML && (
               <TimetableView 
                 htmlContent={data.timetableHTML} 
                 courseSlotMap={data.courseSlotMap} 
                 netId={data.profileData.registrationNo} 
                 calendarData={calendarData}
               />
             )}
         </div>

         {/* Attendance Section */}
         <div className="mb-10 min-w-[700px]">
            <h2 className="text-2xl font-bold mb-4 flex items-center">Attendance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.attendanceData?.map((item: any, i: number) => {
                 let bgColor = '#1e1e1e';
                 let borderColor = '#333';
                 let marginText = '';
                 let marginColor = '';

                 if (item.totalClasses !== 'N/A') {
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
                          <div className="flex-1">
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
                                <span>Hours Conducted: <b className="text-white">{item.hoursConducted}</b></span>
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
            <AttendancePredict attendanceData={data.attendanceData} courseSlotMap={data.courseSlotMap} />
         </div>

         {/* Marks Section */}
         <div className="mb-10 min-w-[700px]">
            <h2 className="text-2xl font-bold mb-4">Marks</h2>
            <div className="space-y-4">
              {data.marksData?.map((item: any, i: number) => {
                 const pct = item.TotalMaxMarks > 0 ? (item.TotalObtainedMarks / item.TotalMaxMarks) * 100 : 0;
                 return (
                 <div key={i} className="bg-[#1e1e1e] border border-[#333] rounded-xl p-5 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                       <div className="flex-1">
                          <h3 className="font-bold text-white text-[15px]">
                             {item.CourseCode} - {item.CourseTitle}
                          </h3>
                          <p className="text-[12px] text-gray-400">{item.CourseType}</p>
                       </div>
                       {item.TotalMaxMarks > 0 && (
                          <div className="text-right">
                             <span className={`font-bold text-lg ${pct >= 50 ? 'text-[#ffb74d]' : 'text-[#e57373]'}`}>
                                {item.TotalObtainedMarks}
                             </span>
                             <span className="text-gray-400 font-bold text-sm"> / {item.TotalMaxMarks}</span>
                          </div>
                       )}
                    </div>

                    {item.TotalMaxMarks > 0 && (
                       <div className="w-full bg-[#333] h-[3px] rounded-full mb-4 relative z-10">
                          <div 
                             className={`h-full rounded-full ${pct >= 50 ? 'bg-[#ffb74d]' : 'bg-[#e57373]'}`} 
                             style={{ width: `${Math.min(100, pct)}%` }}
                          ></div>
                       </div>
                    )}

                    {item.Components && item.Components.length > 0 && (
                       <div className="flex flex-wrap gap-2 relative z-10">
                          {item.Components.map((comp: any, j: number) => {
                             const compPct = comp.MaxMarks > 0 && comp.ObtainedMarks !== 'Absent' ? (comp.ObtainedMarks / comp.MaxMarks) : 0;
                             const isAbsent = comp.ObtainedMarks === 'Absent';
                             return (
                                <div key={j} className={`px-2 py-1 rounded-full text-[11px] font-bold ${!isAbsent && compPct >= 0.5 ? 'bg-[#ffb74d]/20 text-[#ffb74d]' : 'bg-[#e57373]/20 text-[#e57373]'}`}>
                                   {comp.ComponentName}: {isAbsent ? 'Absent' : comp.ObtainedMarks}/{comp.MaxMarks}
                                </div>
                             );
                          })}
                       </div>
                    )}
                 </div>
                 );
              })}
            </div>
         </div>
      </main>
    </div>
  );
}
