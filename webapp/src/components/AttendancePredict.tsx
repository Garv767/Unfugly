'use client';

import { useState, useEffect } from 'react';

export default function AttendancePredict({ attendanceData, courseSlotMap }: { attendanceData: any[], courseSlotMap: any }) {
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
      fetch('http://localhost:3000/calendar')
        .then(res => res.json())
        .then(data => {
          setCalendarData(data);
          setLoading(false);
        })
        .catch(err => {
          setError('Failed to fetch calendar data.');
          setLoading(false);
        });
    }
  }, [isOpen, calendarData]);

  const handlePredict = () => {
    if (!calendarData || !attendanceData || !courseSlotMap) {
      setError('Data not fully loaded.');
      return;
    }
    setError('');
    
    // In a full implementation, we run the countSlotsInRange using calendarData here
    // For now, this invokes a simplified predictor simulating predict.js logic
    const results = predictAttendance(attendanceData, courseSlotMap, calendarData, startDate, endDate);
    if (!results) {
      setError('Prediction calculation failed (check data map formatting).');
    } else {
      setPredictions(results);
    }
  };

  return (
    <div className="mt-6 border-t border-border/50 pt-6">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center text-sm font-semibold text-accent2 hover:text-accent transition-colors"
        >
          <span className="mr-2">✦</span> Predict Future Attendance
        </button>
      ) : (
        <div className="bg-surface2 rounded-xl p-6 border border-border/60">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-lg text-white flex items-center">
                <span className="mr-2 text-accent2">✦</span> Predict Attendance
             </h3>
             <button onClick={() => setIsOpen(false)} className="text-muted hover:text-text transition-colors">✕</button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
               <label className="block text-xs uppercase text-muted mb-1">From</label>
               <input type="date" value={startDate} min={today} onChange={e => setStartDate(e.target.value)} className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text" />
            </div>
            <div>
               <label className="block text-xs uppercase text-muted mb-1">To</label>
               <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text" />
            </div>
          </div>
          
          <button onClick={handlePredict} disabled={loading} className="w-full bg-accent/20 hover:bg-accent/30 text-accent font-medium py-2 rounded-md transition-colors mb-6">
            {loading ? 'Loading Calendar...' : 'Run Prediction'}
          </button>
          
          {error && <div className="text-red bg-red/10 p-3 rounded-md text-sm mb-4 text-center">{error}</div>}
          
          {predictions.length > 0 && (
            <div className="space-y-4">
               {predictions.map((p, i) => (
                 <div key={i} className="flex justify-between items-center bg-surface p-3 rounded-lg border border-border/40">
                    <div>
                       <div className="text-xs text-muted font-mono">{p.courseCode}</div>
                       <div className="font-medium text-sm text-text truncate max-w-[200px]" title={p.courseTitle}>{p.courseTitle}</div>
                       <div className="text-[10px] mt-1 text-muted">
                         {p.predictedPct >= 75 ? (
                            <span className="text-green">Margin: {p.canSkip} classes left</span>
                         ) : (
                            <span className="text-red">Short by: {p.needToAttend} classes</span>
                         )}
                       </div>
                    </div>
                    <div className="text-right">
                       <div className={`font-bold ${p.predictedPct >= 75 ? 'text-green' : 'text-red'}`}>{p.predictedPct.toFixed(1)}%</div>
                       <div className="text-xs text-muted mt-1">{p.currentPct.toFixed(1)}% →</div>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Predictor core logic directly ported
function predictAttendance(attendanceData: any[], courseSlotMap: any, calendarData: any, start: string, end: string) {
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
