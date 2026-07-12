const fs = require('fs');

let page = fs.readFileSync('webapp/src/components/TimetableView.tsx', 'utf8');

// 1. Fix mobile timetable hiding logic. When viewState === 'hide', it should hide EDITS and return to original timetable text, NOT hide everything.
// Currently it does this:
// if (viewState !== 'hide') { ... use edited or mapped ... }
// This leaves it to display the raw slot ID if viewState is 'hide', but the raw title from scraped data might just be the slot ID.
// Wait, the logic is:
// if (viewState !== 'hide') { ... } 
// Below that:
// let isGrey = false; ... if (!displayTitle || displayTitle === rawSlotId) { isGrey = true; }
// So when hidden, it just shows raw text. But wait, what was the raw text originally?

// Let's modify the mobile render logic to exactly match the desktop render logic regarding viewState:
// Desktop logic:
// const edit = editedSlots[slotId];
// ...
// {isGrey ? (cleanSlotText || rawSlotText) : displayTitle}
// Actually, if we look at desktop:
// if (edit && viewState !== 'hide') { displayTitle = edit.title; displayRoom = edit.classroom; displayBg = '#FBC02D'; }
// else if (mappedCourse) { displayTitle = ... }

page = page.replace(
  `                      if (viewState !== 'hide') {
                          if (editedSlots[rawSlotId]) {
                              displayTitle = editedSlots[rawSlotId].title;
                              displayRoom = editedSlots[rawSlotId].classroom;
                              displayBg = '#FBC02D';
                          } else {
                              const actualCourseData: Record<string, any> = courseData?.slotToCourse || courseData;
                              let mappedCourse = actualCourseData && actualCourseData[rawSlotId];
                              if (!mappedCourse && rawSlotId.includes('-')) {
                                 const parts = rawSlotId.split('-');
                                 for (const p of parts) {
                                    if (actualCourseData && actualCourseData[p]) {
                                       mappedCourse = actualCourseData[p];
                                       break;
                                    }
                                 }
                              }
                              if (mappedCourse) {
                                  const anyMappedCourse = mappedCourse as any;
                                  displayTitle = anyMappedCourse['Course Title'] || anyMappedCourse.title || displayTitle;
                                  displayRoom = anyMappedCourse['Room No.'] || anyMappedCourse.classroom || anyMappedCourse.classRoom || displayRoom;
                              }
                          }
                      }`,
  `                      const actualCourseData: Record<string, any> = courseData?.slotToCourse || courseData;
                      let mappedCourse = actualCourseData && actualCourseData[rawSlotId];
                      if (!mappedCourse && rawSlotId.includes('-')) {
                         const parts = rawSlotId.split('-');
                         for (const p of parts) {
                            if (actualCourseData && actualCourseData[p]) {
                               mappedCourse = actualCourseData[p];
                               break;
                            }
                         }
                      }

                      // Set baseline from mapped course
                      if (mappedCourse) {
                          const anyMappedCourse = mappedCourse as any;
                          displayTitle = anyMappedCourse['Course Title'] || anyMappedCourse.title || displayTitle;
                          displayRoom = anyMappedCourse['Room No.'] || anyMappedCourse.classroom || anyMappedCourse.classRoom || displayRoom;
                      }

                      // Apply edits only if viewState is not 'hide'
                      if (editedSlots[rawSlotId] && viewState !== 'hide') {
                          displayTitle = editedSlots[rawSlotId].title;
                          displayRoom = editedSlots[rawSlotId].classroom;
                          displayBg = '#FBC02D';
                      }`
);

// 2. Fix the HTML2Canvas rendering issue. 
// When downloading the timetable on mobile, it uses the dom, but on mobile, the desktop table is hidden via "lg:block hidden", so it attempts to force it to show, which messes up layout.
// The fix is to ensure that when taking the snapshot, we force the container to be an absolutely positioned wide div that renders exactly like desktop.
page = page.replace(
  `      if (isMobileHidden) {
          containerRef.current.classList.remove('hidden', 'lg:block');
          containerRef.current.style.display = 'block';
          containerRef.current.style.position = 'absolute';
          containerRef.current.style.top = '-9999px';
      }`,
  `      if (isMobileHidden) {
          containerRef.current.classList.remove('hidden', 'lg:block');
          containerRef.current.style.display = 'block';
          containerRef.current.style.position = 'absolute';
          containerRef.current.style.top = '-9999px';
          containerRef.current.style.width = '1200px'; // Force desktop width for snapshot
          containerRef.current.style.padding = '20px';
          containerRef.current.style.backgroundColor = '#121212';
      }`
);

page = page.replace(
  `      if (isMobileHidden) {
          containerRef.current.classList.add('hidden', 'lg:block');
          containerRef.current.style.display = '';
          containerRef.current.style.position = '';
          containerRef.current.style.top = '';
      }`,
  `      if (isMobileHidden) {
          containerRef.current.classList.add('hidden', 'lg:block');
          containerRef.current.style.display = '';
          containerRef.current.style.position = '';
          containerRef.current.style.top = '';
          containerRef.current.style.width = '';
          containerRef.current.style.padding = '';
          containerRef.current.style.backgroundColor = '';
      }`
);

fs.writeFileSync('webapp/src/components/TimetableView.tsx', page);
console.log('Successfully fixed Timetable bugs!');
