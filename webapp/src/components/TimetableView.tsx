'use client';

import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';

interface TimetableViewProps {
  htmlContent: string;
  courseData: Record<string, { title: string; classRoom?: string; classroom?: string }>;
  netId: string;
  calendarData?: any;
  timetableJSON?: any;
  profileData?: any;
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

function renderTableFromJSON(jsonData: any) {
    if (!jsonData || !jsonData.headers || !jsonData.days) return '';
    
    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; max-width: 1200px; margin: 0 auto; border-collapse: separate; border-spacing: 2px; background-color: #000000; font-size: 0.9em;';

    const caption = document.createElement('caption');
    caption.className = 't1';
    caption.textContent = "Your Personalized Timetable by Unfugly";
    caption.style.cssText = 'display: table-caption; margin-top: 5px; background-color: #2c2c2c; color: #ffffff; padding: 5px; font-weight: normal;';
    table.appendChild(caption);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    jsonData.headers.forEach((headerText: string, index: number) => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.style.padding = '8px 5px'; 
        th.style.backgroundColor = '#F1948A';
        th.style.color = '#000000';
        th.style.fontWeight = 'normal';
        th.style.fontSize = "10px";
        th.style.borderRadius = '3px';
        
        if (index === 0) {
            th.style.width = '1%';
            th.style.whiteSpace = 'nowrap';
        } else {
            th.style.width = '8.25%';
            th.style.whiteSpace = 'normal';
        }
        
        headerRow.appendChild(th);
    });

    let hasExtraSlots = jsonData.extraSlotFlag;
    if (!hasExtraSlots && jsonData.days) {
        hasExtraSlots = jsonData.days.some((day: any) => 
            day.slots?.slice(-2).some((slot: any) => slot.title && slot.title.trim() !== '')
        ) || false;
    }

    if(!hasExtraSlots){
        const thCells = headerRow.querySelectorAll('th');
        if (thCells.length >= 2) {
            thCells[thCells.length-2].style.display = "none";
            thCells[thCells.length-1].style.display = "none";
        }
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let slotId = 1;
    jsonData.days.forEach((day: any) => {
        const tr = document.createElement('tr');
        const thDay = document.createElement('td'); 
        thDay.innerHTML = `${day.dayName}`;
        thDay.style.padding = '8px 5px';
        thDay.style.width = '1%';
        thDay.style.whiteSpace = 'nowrap';
        thDay.style.backgroundColor = '#F8C471'; 
        thDay.style.color = '#000000';
        thDay.style.fontWeight = 'normal';
        thDay.style.fontSize = '10px';
        thDay.style.borderRadius = '3px';
        tr.appendChild(thDay);

        day.slots.forEach((slot: any) => {
            const td = document.createElement('td');
            if (slot.bgColor) td.style.backgroundColor = slot.bgColor;
            if (slot.title) td.title = `Slot: ${slot.title}`;
            td.id = `slot-${slotId++}`;
            
            td.style.padding = '8px 5px'; 
            td.style.overflowWrap = 'anywhere';
            td.style.wordBreak = 'normal';
            td.style.whiteSpace = 'normal';
            td.style.borderRadius = '3px';

            const titleSpan = document.createElement('span');
            titleSpan.textContent = slot.title;
            titleSpan.style.display = 'block';

            if (slot.title && slot.title !== '') {
                if (slot.classroom && slot.classroom !== '') {
                    td.classList.add('replaced-slot');
                    titleSpan.style.fontWeight = '600';
                    titleSpan.style.color = '#334';
                    titleSpan.style.fontSize = '11px';
                    titleSpan.classList.add('editedSlot-originalTitle');

                    const classroomSpan = document.createElement('span');
                    classroomSpan.textContent = slot.classroom;
                    classroomSpan.style.fontWeight = '600'; // semi-bold
                    classroomSpan.style.color = '#555';
                    classroomSpan.style.fontSize = '9px';
                    classroomSpan.style.display = 'block';
                    classroomSpan.classList.add('editedSlot-originalClassroom');

                    td.appendChild(titleSpan);
                    td.appendChild(classroomSpan);
                } else {
                    const isDarkGrey = slot.bgColor.includes('88') || slot.bgColor.includes('58') || slot.bgColor.toLowerCase().includes('585b5b');
                    if (isDarkGrey) {
                        titleSpan.style.fontWeight = '400';
                        titleSpan.style.color = 'rgb(170,170,170)';
                        titleSpan.classList.add('editedSlot-originalTitle');
                        td.appendChild(titleSpan);
                    } else {
                        td.classList.add('replaced-slot');
                        titleSpan.style.fontWeight = '600';
                        titleSpan.style.color = '#334';
                        titleSpan.style.fontSize = '11px';
                        titleSpan.classList.add('editedSlot-originalTitle');
                        td.appendChild(titleSpan);
                    }
                }
            } else {
                td.classList.add('empty-slot-mask', 'empty-slot');
            }

            tr.appendChild(td);
        });

        if(!hasExtraSlots){
            const cells = tr.querySelectorAll('td');
            if (cells.length >= 2) {
                cells[cells.length-2].style.display = "none";
                cells[cells.length-1].style.display = "none";
            }
        }

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    return table.outerHTML;
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

export default function TimetableView({ htmlContent, courseData, netId, calendarData, timetableJSON, profileData }: TimetableViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editedSlots, setEditedSlots] = useState<Record<string, { title: string; classroom: string }>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [viewState, setViewState] = useState<'hide' | 'show' | 'modify'>('show');
  const [parsedData, setParsedData] = useState<any>(null);
  const [mobileDayIndex, setMobileDayIndex] = useState<number>(0);

  useEffect(() => {
    // Load edits from local storage
    const saved = localStorage.getItem(`timetable_edits_${netId}`);
    if (saved) {
      setEditedSlots(JSON.parse(saved));
    }
  }, [netId]);

  useEffect(() => {
    if (timetableJSON && timetableJSON.days && timetableJSON.days.length > 0) {
        try {
            setParsedData(timetableJSON);
            const newHtml = renderTableFromJSON(timetableJSON);
            setRenderedHtml(newHtml);
        } catch (e) {
            console.error("Failed to render timetableJSON:", e);
            setRenderedHtml(htmlContent);
        }
        return;
    }

    // Parse and render HTML
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent || '', 'text/html');
        const table = doc.querySelector('table');
        if (table) {
            const parsed = parseTableToJSON(table);
            setParsedData(parsed);
            const newHtml = renderTableFromJSON(parsed);
            setRenderedHtml(newHtml);
        } else {
            setRenderedHtml(htmlContent || '');
        }
    } catch (e) {
        console.error("Failed to parse and render timetable:", e);
        setRenderedHtml(htmlContent || '');
    }
  }, [htmlContent, timetableJSON]);

  useEffect(() => {
    if (!containerRef.current) return;
    const table = containerRef.current.querySelector('table');
    if (!table) return;

    // Active day order logic
    const today = new Date();
    // Default to Day 1 so *something* lights up if we parse calendarData incorrectly
    const currentDayOrderObj = getDayOrderForDate(today, calendarData);
    const activeDayOrder = currentDayOrderObj ? currentDayOrderObj : null; 
    
    if (activeDayOrder && !isNaN(parseInt(activeDayOrder))) {
        // Set initial mobile view to today's day order
        setMobileDayIndex(Math.max(0, parseInt(activeDayOrder) - 1));
    }

    // Removed tailwind classes injection to exactly match extension styling
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    rows.forEach(row => {
       const firstCell = row.querySelector('th, td');
       if (firstCell && firstCell.textContent) {
           const match = firstCell.textContent.trim().match(/^(?:Day[\s\-]*)?(\d+)/i);
          if (match) {
             const rowDayOrder = match[1];
             if (!activeDayOrder || rowDayOrder !== activeDayOrder) {
                // Dull non-active day row
                (row as HTMLElement).style.opacity = '0.65';
                (row as HTMLElement).style.filter = 'grayscale(30%)';
             } else {
                // Bright active day
                (row as HTMLElement).style.opacity = '1';
                (row as HTMLElement).style.filter = 'none';
                (row as HTMLElement).style.boxShadow = 'none';
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
      let mappedCourse = courseData && courseData[rawSlotId];
      if (!mappedCourse && rawSlotId.includes('-')) {
         const parts = rawSlotId.split('-');
         for (const p of parts) {
            if (courseData && courseData[p]) {
               mappedCourse = courseData[p];
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

      if (viewState === 'hide') {
          // If hidden, we don't apply the Unfugly styling overrides, leaving it as the raw extension output.
          return;
      }

      if (editedSlots[rawSlotId]) {
        // Original titles should be hidden
        const originalTitles = Array.from(td.querySelectorAll('.editedSlot-originalTitle, .editedSlot-originalClassroom'));
        originalTitles.forEach(el => (el as HTMLElement).style.display = 'none');

        // Check if we already injected our edited spans
        let titleSpan = td.querySelector('.editedSlot-editedTitle') as HTMLElement;
        let classroomSpan = td.querySelector('.editedSlot-editedClassroom') as HTMLElement;

        if (!titleSpan) {
            titleSpan = document.createElement('span');
            titleSpan.className = 'editedSlot-editedTitle';
            titleSpan.style.fontWeight = '600';
            titleSpan.style.color = '#334';
            titleSpan.style.display = 'block';
            titleSpan.style.fontSize = '11px';
            td.appendChild(titleSpan);
        }
        if (!classroomSpan) {
            classroomSpan = document.createElement('span');
            classroomSpan.className = 'editedSlot-editedClassroom';
            classroomSpan.style.fontWeight = '600';
            classroomSpan.style.color = '#555';
            classroomSpan.style.fontSize = '9px';
            classroomSpan.style.display = 'block';
            td.appendChild(classroomSpan);
        }

        titleSpan.textContent = editedSlots[rawSlotId].title;
        classroomSpan.textContent = editedSlots[rawSlotId].classroom ? 'Room: ' + editedSlots[rawSlotId].classroom : '';

        td.classList.add('edited-slot', 'replaced-slot');
        td.style.backgroundColor = '#FBC02D';

        // Replication of removeEditButton from extension
        let removeBtn = td.querySelector('.removeEditButton') as HTMLElement;
        if (isEditMode) {
            if (!removeBtn) {
                removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.style.position = 'absolute';
                removeBtn.style.top = '2px';
                removeBtn.style.right = '2px';
                removeBtn.style.backgroundColor = '#E53935';
                removeBtn.style.color = 'white';
                removeBtn.style.border = 'none';
                removeBtn.style.borderRadius = '50%';
                removeBtn.style.width = '18px';
                removeBtn.style.height = '18px';
                removeBtn.style.fontSize = '12px';
                removeBtn.style.cursor = 'pointer';
                removeBtn.style.display = 'flex';
                removeBtn.style.justifyContent = 'center';
                removeBtn.style.alignItems = 'center';
                removeBtn.style.zIndex = '10';
                removeBtn.className = 'removeEditButton';
                
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    const newEdits = { ...editedSlots };
                    delete newEdits[rawSlotId];
                    setEditedSlots(newEdits);
                    localStorage.setItem(`timetable_edits_${netId}`, JSON.stringify(newEdits));
                };
                td.prepend(removeBtn);
            }
        } else {
            if (removeBtn) removeBtn.remove();
        }

      } else {
        // Ensure original titles are visible if there's no edit
        const originalTitles = Array.from(td.querySelectorAll('.editedSlot-originalTitle, .editedSlot-originalClassroom'));
        originalTitles.forEach(el => (el as HTMLElement).style.display = 'block');

        // Remove edited spans if they exist
        const editedSpans = Array.from(td.querySelectorAll('.editedSlot-editedTitle, .editedSlot-editedClassroom'));
        editedSpans.forEach(el => el.remove());

        td.classList.remove('edited-slot');
        // Restore original background if possible. It's stored in data-original-bg or inline style.
        // The render logic sets the background color based on the slot object.
        // We do not override mappedCourse here, just leave the default rendering.
      }

      td.style.transition = 'all 0.2s ease-in-out';
      td.onclick = isEditMode ? () => handleSlotClick(rawSlotId, td) : null;
      if (isEditMode) {
        td.style.cursor = 'pointer';
      } else {
        td.style.cursor = 'default';
      }
    });

  }, [renderedHtml, courseData, editedSlots, isEditMode, viewState, calendarData]);

  const handleSlotClick = (slotId: string, cell: HTMLTableCellElement) => {
    // Prevent prompt if clicking remove button
    const defaultTitle = editedSlots[slotId]?.title || courseData?.[slotId]?.title || '';
    const defaultRoom = editedSlots[slotId]?.classroom || courseData?.[slotId]?.classRoom || courseData?.[slotId]?.classroom || '';
    
    const title = window.prompt('Enter course title:', defaultTitle);
    if (title === null) return; 

    const classroom = window.prompt('Enter classroom (optional):', defaultRoom);
    if (classroom === null) return;

    const newEdits = { ...editedSlots, [slotId]: { title: title || slotId, classroom } };
    setEditedSlots(newEdits);
    localStorage.setItem(`timetable_edits_${netId}`, JSON.stringify(newEdits));
  };

  const downloadTimetable = async () => {
    if (!containerRef.current) return;
    const tableEl = containerRef.current.querySelector('table');
    if (!tableEl) return;

    try {
      const isMobileHidden = window.getComputedStyle(containerRef.current).display === 'none';
      if (isMobileHidden) {
          containerRef.current.classList.remove('hidden', 'lg:block');
          containerRef.current.style.display = 'block';
          containerRef.current.style.position = 'absolute';
          containerRef.current.style.top = '-9999px';
      }

      // Temporarily revert any view modifications for clean screenshot
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

      // wait a tick for layout if we unhid it
      if (isMobileHidden) {
          await new Promise(res => setTimeout(res, 50));
      }

      const canvas = await html2canvas(tableEl, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true
      });

      // Restore modifications
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


  return (
    <div className="space-y-4">
      <div className="flex items-center mb-4 relative">
        <h2 className="text-xl font-bold text-white mr-4">Timetable</h2>
        
        {/* Exact Edit Menu from Extension */}
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px',
            marginLeft: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            gap: '4px',
            transition: 'all 0.3s ease'
        }}>
           <button 
             onClick={() => { setViewState('hide'); setIsEditMode(false); }}
             style={{
                backgroundColor: viewState === 'hide' ? '#546E7A' : 'transparent',
                color: viewState === 'hide' ? '#fff' : 'rgba(255, 255, 255, 0.8)',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                padding: '6px 14px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: '12px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minWidth: '65px',
                transform: viewState === 'hide' ? 'scale(1.05)' : 'scale(1)',
                boxShadow: viewState === 'hide' ? '0 4px 12px #546E7A66' : 'none'
             }}
             title="Hide Edits"
           >
             Hide
           </button>
           <button 
             onClick={() => { setViewState('show'); setIsEditMode(false); }}
             style={{
                backgroundColor: viewState === 'show' ? '#43A047' : 'transparent',
                color: viewState === 'show' ? '#fff' : 'rgba(255, 255, 255, 0.8)',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                padding: '6px 14px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: '12px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minWidth: '65px',
                transform: viewState === 'show' ? 'scale(1.05)' : 'scale(1)',
                boxShadow: viewState === 'show' ? '0 4px 12px #43A04766' : 'none'
             }}
             title="Show/Save Edits"
           >
             {isEditMode ? 'Save' : 'Show'}
           </button>
           <button 
             onClick={() => { setViewState('modify'); setIsEditMode(true); }}
             style={{
                backgroundColor: viewState === 'modify' ? '#1E88E5' : 'transparent',
                color: viewState === 'modify' ? '#fff' : 'rgba(255, 255, 255, 0.8)',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                padding: '6px 14px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: '12px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minWidth: '65px',
                transform: viewState === 'modify' ? 'scale(1.05)' : 'scale(1)',
                boxShadow: viewState === 'modify' ? '0 4px 12px #1E88E566' : 'none'
             }}
             title="Edit Mode"
           >
             Modify
           </button>
        </div>
        
        {/* Download Button */}
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
      
      {viewState === 'modify' && (
         <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400 mb-4 animate-pulse">
            Click on any active slot below to override the class name and room. Set the name to blank to revert your changes.
         </div>
      )}

      <div 
        key={`timetable-container-${viewState}`}
        ref={containerRef}
        className={`timetable-container overflow-x-auto rounded-xl bg-[#1e1e1e] border border-[#333] shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 hidden lg:block`}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />

      {/* Mobile Vertical View */}
      {parsedData && parsedData.days && parsedData.days.length > 0 && (
          <div className="lg:hidden">
              <div className="flex items-center justify-between bg-[#1e1e1e] border border-[#333] rounded-t-xl p-3 shadow-lg">
                 <button 
                    onClick={() => setMobileDayIndex(prev => prev === 0 ? parsedData.days.length - 1 : prev - 1)}
                    className="p-2 rounded-full bg-[#333] text-white transition-opacity hover:bg-[#444]"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                 </button>
                 <div className="text-center">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Day Order</div>
                    <div className="text-2xl font-black text-white">{parsedData.days[mobileDayIndex]?.dayName || (mobileDayIndex + 1)}</div>
                 </div>
                 <button 
                    onClick={() => setMobileDayIndex(prev => prev === parsedData.days.length - 1 ? 0 : prev + 1)}
                    className="p-2 rounded-full bg-[#333] text-white transition-opacity hover:bg-[#444]"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                 </button>
              </div>

              {/* Vertical Slots */}
              <div className={`bg-[#121212] border border-t-0 border-[#333] rounded-b-xl p-4 space-y-3 shadow-lg transition-opacity duration-300 ${
                  String(mobileDayIndex + 1) !== getDayOrderForDate(new Date(), calendarData) ? 'opacity-50 grayscale-[0.3]' : 'opacity-100'
              }`}>
                  {parsedData.days[mobileDayIndex]?.slots?.map((slot: any, idx: number) => {
                      const timeHeader = parsedData.headers[idx + 1] || ''; 
                      
                      const totalSlotsBefore = parsedData.days.slice(0, mobileDayIndex).reduce((acc: number, d: any) => acc + d.slots.length, 0);
                      let rawSlotId = `slot-${totalSlotsBefore + idx + 1}`;
                      if (slot.slot) {
                          rawSlotId = slot.slot;
                      } else {
                          const slotMatch = slot.title?.match(/Slot:\s*([A-Za-z0-9\-]+)/);
                          if (slotMatch) rawSlotId = slotMatch[1].trim();
                      }

                      let displayTitle = slot.title;
                      let displayRoom = slot.classroom;
                      let displayBg = slot.bgColor !== 'transparent' && slot.bgColor ? slot.bgColor : '#333';
                      
                      if (viewState !== 'hide' && editedSlots[rawSlotId]) {
                          displayTitle = editedSlots[rawSlotId].title;
                          displayRoom = editedSlots[rawSlotId].classroom;
                          displayBg = '#FBC02D';
                      }

                      const isEmpty = !displayTitle || displayTitle.trim() === '';
                      if (isEmpty) return null; 

                      return (
                          <div 
                             key={idx} 
                             className={`bg-[#1e1e1e] border border-[#333] rounded-lg p-3 flex flex-col relative overflow-hidden ${isEditMode ? 'cursor-pointer ring-1 ring-[#1E88E5] hover:bg-[#2a2a2a]' : ''}`}
                             style={{ borderLeftColor: displayBg, borderLeftWidth: '4px' }}
                             onClick={() => {
                                 if (isEditMode) {
                                     handleSlotClick(rawSlotId, document.createElement('td') as HTMLTableCellElement);
                                 }
                             }}
                          >
                             <div className="text-[11px] font-bold text-gray-500 mb-1">{timeHeader}</div>
                             <div className={`text-[14px] font-bold mb-1 leading-tight ${viewState !== 'hide' && editedSlots[rawSlotId] ? 'text-[#FBC02D]' : 'text-white'}`}>{displayTitle}</div>
                             {displayRoom && (
                                <div className="text-[11px] font-semibold text-gray-400">Room: {displayRoom}</div>
                             )}
                             {isEditMode && editedSlots[rawSlotId] && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newEdits = { ...editedSlots };
                                        delete newEdits[rawSlotId];
                                        setEditedSlots(newEdits);
                                        localStorage.setItem(`timetable_edits_${netId}`, JSON.stringify(newEdits));
                                    }}
                                    className="absolute top-2 right-2 bg-[#E53935] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md"
                                >
                                    ×
                                </button>
                             )}
                          </div>
                      );
                  })}
                  
                  {(!parsedData.days[mobileDayIndex]?.slots || parsedData.days[mobileDayIndex].slots.every((s: any) => !s.title || s.title.trim() === '')) && (
                      <div className="text-center py-6 text-gray-500 italic">No classes scheduled for this day.</div>
                  )}
              </div>
          </div>
      )}

    </div>
  );
}
