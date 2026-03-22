'use client';

import { useEffect, useRef, useState } from 'react';

interface TimetableViewProps {
  htmlContent: string;
  courseSlotMap: Record<string, { title: string; classRoom: string }>;
  netId: string;
}

export default function TimetableView({ htmlContent, courseSlotMap, netId }: TimetableViewProps) {
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

    // Apply basic Tailwind classes to the raw table
    table.classList.add('w-full', 'text-sm', 'text-left');
    
    table.querySelectorAll('th, td').forEach(cell => {
      (cell as HTMLElement).classList.add('px-3', 'py-2', 'border', 'border-border/50');
    });

    table.querySelectorAll('td[style*="rgb(88, 91, 91)"]').forEach(cell => {
      const td = cell as HTMLTableCellElement;
      
      const titleSpan = td.title || '';
      const slotMatch = titleSpan.match(/Slot:\s*([A-Za-z0-9\-]+)/);
      let slotId = slotMatch ? slotMatch[1].trim() : td.id;
      
      // Since Academia DOM generates ids like B1, B2...
      if (!slotId) slotId = td.id;

      // Reset content to innerText so we can append custom nodes if needed
      td.style.position = 'relative';

      const originalText = td.innerHTML;

      // Determine contents: Edit override > mapped course > raw slot
      if (editedSlots[slotId]) {
        td.innerHTML = `
          <div class="font-bold text-[11px] text-yellow-500">${editedSlots[slotId].title}</div>
          <div class="text-[9px] text-muted">${editedSlots[slotId].classroom ? 'Room: ' + editedSlots[slotId].classroom : ''}</div>
        `;
        td.classList.add('bg-surface2');
      } else if (courseSlotMap && courseSlotMap[slotId]) {
         td.innerHTML = `
          <div class="font-bold text-[11px] text-accent">${courseSlotMap[slotId].title}</div>
          <div class="text-[10px] text-muted">${courseSlotMap[slotId].classRoom ? 'Room: ' + courseSlotMap[slotId].classRoom : ''}</div>
          <div class="text-[8px] text-muted mt-1 opacity-50">${slotId}</div>
         `;
         td.classList.add('bg-surface2');
      }

      // Add click listener if in edit mode
      td.onclick = isEditMode ? () => handleSlotClick(slotId, td) : null;
      if (isEditMode) {
        td.style.cursor = 'pointer';
        td.classList.add('hover:bg-white/10');
      } else {
        td.style.cursor = 'default';
        td.classList.remove('hover:bg-white/10');
      }
    });

  }, [htmlContent, courseSlotMap, editedSlots, isEditMode]);

  const handleSlotClick = (slotId: string, cell: HTMLTableCellElement) => {
    const defaultTitle = editedSlots[slotId]?.title || courseSlotMap[slotId]?.title || '';
    const defaultRoom = editedSlots[slotId]?.classroom || courseSlotMap[slotId]?.classRoom || '';
    
    // In a real app we'd use a nice React modal, sticking to prompt for 1:1 parity with extension for now
    const title = window.prompt('Enter course title (leave blank to revert):', defaultTitle);
    
    if (title === null) return; // User cancelled

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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center"><span className="text-2xl mr-2">📅</span> Timetable</h2>
        <div className="flex gap-2">
           <button 
             onClick={() => setIsEditMode(!isEditMode)} 
             className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${isEditMode ? 'bg-accent text-white' : 'bg-surface2 hover:bg-surface2/80 text-text'}`}
           >
             {isEditMode ? 'Finish Editing' : 'Edit Slots'}
           </button>
        </div>
      </div>
      
      {isEditMode && (
         <div className="p-3 bg-accent/20 border border-accent/40 rounded-lg text-sm text-accent mb-4">
            Click on any active slot below to override the class name and room. Set the name to blank to revert your changes.
         </div>
      )}

      <div 
        ref={containerRef}
        className="timetable-container overflow-x-auto bg-surface border border-border rounded-lg p-4"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
