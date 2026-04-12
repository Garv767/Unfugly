'use client';

import { useEffect, useRef, useState } from 'react';

interface TimetableViewProps {
  htmlContent: string;
  courseSlotMap: Record<string, { title: string; classRoom?: string; classroom?: string }>;
  netId: string;
  calendarData?: any;
}

// Predict.js logic helper to get day order
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

export default function TimetableView({ htmlContent, courseSlotMap, netId, calendarData }: TimetableViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editedSlots, setEditedSlots] = useState<Record<string, { title: string; classroom: string }>>({});
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    // Load edits from local storage
    const saved = localStorage.getItem(`timetable_edits_${netId}`);
    if (saved) {
      setEditedSlots(JSON.parse(saved));
    }
  }, [netId]);

  useEffect(() => {
    if (!containerRef.current) return;
    const table = containerRef.current.querySelector('table');
    if (!table) return;

    // Active day order logic
    const today = new Date();
    // Default to Day 1 so *something* lights up if we parse calendarData incorrectly
    const currentDayOrderObj = getDayOrderForDate(today, calendarData);
    const activeDayOrder = currentDayOrderObj ? currentDayOrderObj : null; 

    // Apply basic Tailwind classes to the raw table
    table.classList.add('w-full', 'text-sm', 'text-left');
    
    table.querySelectorAll('th, td').forEach(cell => {
      (cell as HTMLElement).classList.add('px-3', 'py-2', 'border', 'border-[#444]');
    });

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    rows.forEach(row => {
       const firstCell = row.querySelector('th, td');
       if (firstCell && firstCell.textContent) {
          const match = firstCell.textContent.trim().match(/Day-(\d)/i);
          if (match) {
             const rowDayOrder = match[1];
             if (activeDayOrder && rowDayOrder !== activeDayOrder) {
                // Dull non-active day row
                (row as HTMLElement).style.opacity = '0.35';
                (row as HTMLElement).style.filter = 'grayscale(80%)';
             } else {
                // Bright active day
                (row as HTMLElement).style.opacity = '1';
                (row as HTMLElement).style.filter = 'none';
             }
          }
       }
    });

    const tds = Array.from(table.querySelectorAll('td'));
    tds.forEach(td => {
      const titleSpan = td.title || '';
      const slotMatch = titleSpan.match(/Slot:\s*([A-Za-z0-9\-]+)/);
      let rawSlotId = slotMatch ? slotMatch[1].trim() : td.id;
      
      if (!rawSlotId) rawSlotId = td.id;
      if (!rawSlotId) return;

      let slotId = rawSlotId;
      let mappedCourse = courseSlotMap && courseSlotMap[rawSlotId];
      if (!mappedCourse && rawSlotId.includes('-')) {
         const parts = rawSlotId.split('-');
         for (const p of parts) {
            if (courseSlotMap && courseSlotMap[p]) {
               mappedCourse = courseSlotMap[p];
               slotId = p;
               break;
            }
         }
      }

      const bgColor = td.style.backgroundColor || '';
      const isSlotCell = 
          bgColor.includes('rgb(88, 91, 91)') || 
          bgColor.includes('230, 230, 250') || 
          bgColor === '#e6e6fa' ||
          bgColor === 'rgb(230, 230, 250)' ||
          bgColor.includes('144, 238, 144') ||
          bgColor !== '' ||
          titleSpan.includes('Slot:');

      if (!isSlotCell) return;

      td.style.position = 'relative';

      if (editedSlots[rawSlotId]) {
        td.innerHTML = `
          <div class="font-bold text-[12px] text-[#ffb74d] truncate max-w-[120px]" title="${editedSlots[rawSlotId].title}">${editedSlots[rawSlotId].title}</div>
          <div class="text-[10px] text-gray-400 mt-1">${editedSlots[rawSlotId].classroom ? 'Room: ' + editedSlots[rawSlotId].classroom : ''}</div>
        `;
        td.classList.add('bg-[#2e2e3e]');
      } else if (mappedCourse) {
         td.innerHTML = `
          <div class="font-bold text-[12px] text-[#81c784] truncate max-w-[120px]" title="${mappedCourse.title}">${mappedCourse.title}</div>
          <div class="text-[10px] text-gray-400 mt-1">${mappedCourse.classroom || mappedCourse.classRoom ? 'Room: ' + (mappedCourse.classroom || mappedCourse.classRoom) : ''}</div>
          <div class="text-[9px] text-gray-500 mt-1 opacity-60">${rawSlotId}</div>
         `;
         td.classList.add('bg-[#1e1e1e]'); // Dark background for actual courses
      }

      td.style.transition = 'all 0.2s ease-in-out';
      td.onclick = isEditMode ? () => handleSlotClick(rawSlotId, td) : null;
      if (isEditMode) {
        td.style.cursor = 'pointer';
        td.classList.add('hover:ring-2', 'hover:ring-[#ffb74d]', 'hover:z-10');
      } else {
        td.style.cursor = 'default';
        td.classList.remove('hover:ring-2', 'hover:ring-[#ffb74d]', 'hover:z-10');
      }
    });

  }, [htmlContent, courseSlotMap, editedSlots, isEditMode, calendarData]);

  const handleSlotClick = (slotId: string, cell: HTMLTableCellElement) => {
    const defaultTitle = editedSlots[slotId]?.title || courseSlotMap?.[slotId]?.title || '';
    const defaultRoom = editedSlots[slotId]?.classroom || courseSlotMap?.[slotId]?.classRoom || courseSlotMap?.[slotId]?.classroom || '';
    
    const title = window.prompt('Enter course title (leave blank to revert):', defaultTitle);
    
    if (title === null) return; 

    if (title.trim() === '') {
       const newEdits = { ...editedSlots };
       delete newEdits[slotId];
       setEditedSlots(newEdits);
       localStorage.setItem(`timetable_edits_${netId}`, JSON.stringify(newEdits));
       return;
    }

    const classroom = window.prompt('Enter classroom (optional):', defaultRoom);
    if (classroom === null) return;

    const newEdits = { ...editedSlots, [slotId]: { title, classroom } };
    setEditedSlots(newEdits);
    localStorage.setItem(`timetable_edits_${netId}`, JSON.stringify(newEdits));
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4 hidden">
        {/* We moved timetable header into dashboard to allow layout flexibility, so this h2 is hidden but the edit button is kept just below */}
      </div>
      
      <div className="flex justify-end gap-2 mb-2">
         <button 
           onClick={() => setIsEditMode(!isEditMode)} 
           className={`px-4 py-1.5 text-sm font-bold rounded shadow transition-transform active:scale-95 border ${isEditMode ? 'bg-[#ffb74d] text-[#1e1e1e] border-[#ffb74d]' : 'bg-[#1e1e1e] border-[#444] text-white hover:border-[#666]'}`}
         >
           {isEditMode ? 'Finish Editing' : 'Edit Slots'}
         </button>
      </div>
      
      {isEditMode && (
         <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400 mb-4 animate-pulse">
            Click on any active slot below to override the class name and room. Set the name to blank to revert your changes.
         </div>
      )}

      <div 
        ref={containerRef}
        className="timetable-container overflow-x-auto rounded-xl p-4 bg-[#1e1e1e] border border-[#333] shadow-lg"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
