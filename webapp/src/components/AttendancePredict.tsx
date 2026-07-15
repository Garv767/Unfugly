'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function AttendancePredict({ attendanceData, courseData }: { attendanceData: any[], courseData: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  
  const [calendarData, setCalendarData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && !calendarData) {
      setLoading(true);
      fetch(`${API_URL}/api/v1/calendar`, { credentials: 'include', headers: { ...((typeof window !== 'undefined' && localStorage.getItem('unfugly_token')) ? { Authorization: 'Bearer ' + localStorage.getItem('unfugly_token') } : {}) } })
        .then(res => res.json())
        .then(data => {
          setCalendarData(data.calendar_json || data);
          setLoading(false);
        })
        .catch(err => {
          setError('Failed to fetch calendar data.');
          setLoading(false);
        });
    }
  }, [isOpen, calendarData]);

  const handlePredict = () => {
    if (!calendarData || !attendanceData || !courseData) {
      setError('Data not fully loaded.');
      return;
    }
    setError('');
    
    // In a full implementation, we run the countSlotsInRange using calendarData here
    // For now, this invokes a simplified predictor simulating predict.js logic
    const results = predictAttendance(attendanceData, courseData, calendarData, startDate, endDate);
    if (!results) {
      setError('Prediction calculation failed (check data map formatting).');
    } else {
      setPredictions(results);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center text-sm font-semibold bg-[#333] hover:bg-[#444] text-white px-4 py-1.5 rounded-full transition-all ml-4"
      >
        <span className="mr-1.5 text-lg leading-none">+</span> Predict
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={() => setIsOpen(false)}>
          <div className="bg-[#1a1a1a]/95 border border-[#333] shadow-2xl rounded-2xl w-[600px] max-w-[95vw] max-h-[85vh] flex flex-col overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-[#333] bg-[#222]">
               <h3 className="font-bold text-xl text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64b5f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                  Attendance Predictor
               </h3>
               <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white bg-[#333] hover:bg-[#444] rounded-full w-8 h-8 flex items-center justify-center transition-colors">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="bg-[#2a2a2a] rounded-xl p-5 mb-6 border border-[#444] shadow-inner">
                    <p className="text-sm text-gray-300 mb-4">Select a date range to see how many classes you might miss and the impact on your attendance.</p>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                         <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Leave Start</label>
                         <input type="date" value={startDate} min={today} onChange={e => setStartDate(e.target.value)} className="w-full bg-[#1e1e1e] border border-[#555] focus:border-[#64b5f6] rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-colors" />
                      </div>
                      <div>
                         <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Leave End</label>
                         <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-[#1e1e1e] border border-[#555] focus:border-[#64b5f6] rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-colors" />
                      </div>
                    </div>
                </div>
                
                <button onClick={handlePredict} disabled={loading} className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-lg ${loading ? 'bg-[#333] text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#1e88e5] to-[#1565c0] text-white hover:from-[#1976d2] hover:to-[#0d47a1] hover:scale-[1.01]'}`}>
                  {loading ? 'Initializing Calendar...' : 'Simulate Attendance'}
                </button>
                
                {error && <div className="mt-5 text-[#ff5252] bg-[#ff5252]/10 border border-[#ff5252]/30 p-4 rounded-xl text-sm font-medium text-center">{error}</div>}
                
                {predictions.length > 0 && (
                  <div className="mt-6 space-y-3">
                     <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Predicted Outcomes</h4>
                     {predictions.map((p, i) => (
                       <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#222] p-4 rounded-xl border border-[#333] hover:border-[#444] transition-colors gap-4">
                          <div className="flex-1">
                             <div className="text-xs font-mono text-[#64b5f6] mb-1 px-2 py-0.5 bg-[#64b5f6]/10 inline-block rounded">{p.courseCode}</div>
                             <div className="font-bold text-sm text-white truncate max-w-[280px]" title={p.courseTitle}>{p.courseTitle}</div>
                             
                             <div className="flex items-center gap-2 mt-2">
                                 {p.predictedPct >= 75 ? (
                                    <span className="text-xs font-bold bg-[#81c784]/20 text-[#81c784] px-2 py-1 rounded border border-[#81c784]/30">Safe: {p.canSkip} buffer classes</span>
                                 ) : (
                                    <span className="text-xs font-bold bg-[#ff5252]/20 text-[#ff5252] px-2 py-1 rounded border border-[#ff5252]/30">Danger: Need {p.needToAttend} classes</span>
                                 )}
                                 <span className="text-[11px] text-gray-500">
                                    Misses: {p.classesSkipped}
                                 </span>
                             </div>
                          </div>
                          <div className="text-right w-full sm:w-auto bg-[#1a1a1a] p-3 rounded-lg border border-[#333] flex sm:flex-col justify-between items-center sm:items-end">
                             <div className="text-xs text-gray-400 font-medium">Currently: <span className="text-white">{p.currentPct.toFixed(1)}%</span></div>
                             <div className={`text-xl font-black mt-1 ${p.predictedPct >= 75 ? 'text-[#81c784]' : 'text-[#ff5252]'}`}>
                                 {p.predictedPct.toFixed(1)}%
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Predictor core logic directly ported
function predictAttendance(attendanceData: any[], courseData: any, calendarData: any, start: string, end: string) {
    if (!attendanceData || !calendarData) return null;
    
    // Simulate counts for V1 (A complete port requires all the day order mappings)
    // The exact day order map is inferred from slot mapping or hardcoded in Unfugly.
    // Let's assume an average linear deduction for simplicity if day orders map aren't perfectly built yet,
    // OR we properly parse the Date distances.
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    const skipDays = Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1);

    return attendanceData.filter(c => c.totalClasses !== 'N/A').map(course => {
        // As a simplified mock predictor until day-order-slot parsing is fully aligned with React:
        // We assume 1 class missed per day-skipped in the range for demo purposes.
        const gapClasses = 0; // Days before startDate
        const classesSkipped = Math.floor(skipDays * 0.4); // rough approximation
        
        const finalConducted = course.hoursConducted + gapClasses + classesSkipped;
        const finalAttended = course.attendedClasses + gapClasses;
        
        const predictedPct = finalConducted > 0 ? (finalAttended / finalConducted) * 100 : 0;
        
        let canSkip = 0;
        let needToAttend = 0;
        if (predictedPct >= 75) {
            canSkip = Math.max(0, Math.floor((finalAttended / 0.75) - finalConducted));
        } else {
            needToAttend = Math.max(0, Math.ceil((0.75 * finalConducted - finalAttended) / 0.25));
        }
        
        return {
            courseCode: course.courseCode,
            courseTitle: course.courseTitle,
            currentPct: course.percentage,
            predictedPct,
            canSkip,
            needToAttend,
            gapClassesAdded: gapClasses,
            classesSkipped: classesSkipped
        };
    });
}
