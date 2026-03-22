'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TimetableView from '@/components/TimetableView';
import AttendancePredict from '@/components/AttendancePredict';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [progressMsg, setProgressMsg] = useState('Initializing...');
  const [data, setData] = useState<any>(null);
  const scrapingStarted = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('unfugly_token');
    const net_id = localStorage.getItem('unfugly_net_id');

    if (!token || !net_id) {
      router.push('/login');
      return;
    }

    // Try to fetch cached data first
    fetch('http://localhost:3000/v2/get-data', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(cachedData => {
      if (cachedData.profileData && cachedData.attendanceData) {
        // We have cached data
        setData(cachedData);
        setLoading(false);
      } else {
        // No cached data, start a fresh scrape
        startScraping(token, net_id);
      }
    })
    .catch(err => {
      console.error(err);
      startScraping(token, net_id);
    });
  }, [router]);

  const startScraping = (token: string, net_id: string) => {
    if (scrapingStarted.current) return;
    scrapingStarted.current = true;
    
    setLoading(true);
    // Connect to SSE for progress
    const eventSource = new EventSource(`http://localhost:3000/scrape/progress/${net_id}`);
    
    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      setProgressMsg(parsed.message);
      if (parsed.step === 'complete' || parsed.step === 'error') {
        eventSource.close();
      }
    };

    // Trigger scrape
    fetch('http://localhost:3000/scrape/all', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(scrapedData => {
      if (scrapedData.error) {
        alert(scrapedData.error);
        router.push('/login');
        return;
      }
      setData(scrapedData);
      setLoading(false);
      
      // Save it back to DB
      fetch('http://localhost:3000/v2/save-data', {
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
      setLoading(false);
      alert('Failed to scrape data. Please login again.');
      router.push('/login');
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xl font-medium text-accent2 animate-pulse">{progressMsg}</p>
        <p className="text-sm text-muted">This usually takes 15-30 seconds depending on Academia speeds.</p>
      </div>
    );
  }

  if (!data || !data.profileData) return null;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex justify-between items-center bg-surface p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">{data.profileData.name}</h1>
          <p className="text-muted">{data.profileData.registrationNo} • {data.profileData.programmeBranch}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-accent">{data.profileData.schoolDepartment}</p>
          <p className="text-sm text-muted">Sem {data.profileData.semester} • Section {data.profileData.section}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Summary */}
        <div className="card space-y-4 max-h-[600px] overflow-y-auto">
          <div className="sticky top-0 bg-surface z-10 pb-2 border-b border-border/50">
             <h2 className="text-xl font-bold flex items-center"><span className="text-2xl mr-2">📊</span> Attendance</h2>
          </div>
          
          <div className="space-y-4">
            {data.attendanceData?.map((item: any, i: number) => (
              <div key={i} className="bg-surface2 rounded-xl p-4 border border-border/40 hover:border-accent/40 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-text text-sm leading-tight truncate max-w-[220px]" title={item.courseTitle}>
                       {item.courseTitle}
                    </h3>
                    <p className="text-xs text-muted font-mono mt-1">{item.courseCode} • {item.courseType}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${item.percentage >= 75 ? 'text-green' : 'text-red'}`}>
                      {item.percentage}%
                    </div>
                  </div>
                </div>
                
                {item.totalClasses !== 'N/A' && (
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                     <div className="bg-surface rounded-lg p-2 border border-border/50">
                        <div className="text-muted mb-1">Total</div>
                        <div className="font-semibold">{item.hoursConducted}</div>
                     </div>
                     <div className="bg-surface rounded-lg p-2 border border-border/50">
                        <div className="text-muted mb-1">Attended</div>
                        <div className="font-semibold">{item.attendedClasses}</div>
                     </div>
                     <div className="bg-surface rounded-lg p-2 border border-border/50">
                        <div className="text-muted mb-1">Margin</div>
                        <div className="font-semibold">
                          {item.classesToSkip > 0 ? (
                            <span className="text-green">+{item.classesToSkip}</span>
                          ) : (
                            <span className="text-red">-{item.classesToAttend}</span>
                          )}
                        </div>
                     </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <AttendancePredict attendanceData={data.attendanceData} courseSlotMap={data.courseSlotMap} />
        </div>

        {/* Marks Summary */}
        <div className="card space-y-4 max-h-[600px] overflow-y-auto">
          <div className="sticky top-0 bg-surface z-10 pb-2 border-b border-border/50">
             <h2 className="text-xl font-bold flex items-center"><span className="text-2xl mr-2">📝</span> Internal Marks</h2>
          </div>

          <div className="space-y-4">
            {data.marksData?.map((item: any, i: number) => (
              <div key={i} className="bg-surface2 rounded-xl p-4 border border-border/40 hover:border-accent/40 transition-colors">
                 <div className="flex justify-between items-start mb-4 pb-3 border-b border-border/40">
                    <div>
                        <h3 className="font-semibold text-text text-sm leading-tight break-words max-w-[200px]" title={item.CourseCode}>
                          {item.CourseCode}
                        </h3>
                        <p className="text-xs text-muted font-mono mt-1">{item.CourseType}</p>
                    </div>
                    <div className="text-right">
                       <div className="text-xs text-muted mb-1">Total</div>
                       {item.TotalMaxMarks > 0 ? (
                         <div className="font-bold text-lg">
                           <span className={item.TotalObtainedMarks / item.TotalMaxMarks >= 0.5 ? 'text-green' : 'text-red'}>
                             {item.TotalObtainedMarks.toFixed(1)}
                           </span>
                           <span className="text-muted text-sm font-normal"> / {item.TotalMaxMarks}</span>
                         </div>
                       ) : (
                         <div className="text-muted italic text-sm">N/A</div>
                       )}
                    </div>
                 </div>

                 {item.Components && item.Components.length > 0 && (
                   <div className="space-y-2">
                      {item.Components.map((comp: any, j: number) => (
                         <div key={j} className="flex justify-between items-center text-xs bg-surface p-2 rounded-md border border-border/30">
                            <span className="text-muted font-medium truncate max-w-[120px]" title={comp.ComponentName}>{comp.ComponentName}</span>
                            <span className="font-medium">
                               <span className={comp.ObtainedMarks / comp.MaxMarks >= 0.5 ? 'text-green' : 'text-red'}>
                                 {comp.ObtainedMarks.toFixed(1)}
                               </span>
                               <span className="text-muted"> / {comp.MaxMarks}</span>
                            </span>
                         </div>
                      ))}
                   </div>
                 )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Timetable View Component */}
      <TimetableView 
         htmlContent={data.timetableHTML || '<p>No timetable found</p>'} 
         courseSlotMap={data.courseSlotMap} 
         netId={data.profileData.registrationNo} 
      />
    </div>
  );
}
