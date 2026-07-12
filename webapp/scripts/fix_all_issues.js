const fs = require('fs');

// ======================= TimetableView.tsx =======================
let tv = fs.readFileSync('webapp/src/components/TimetableView.tsx', 'utf8');

// FIX 1: Portal retry logic
tv = tv.replace(
  `  useEffect(() => {
    if (isMobile) {
      const el = document.getElementById('mobile-header-actions-Timetable');
      if (el) setPortalNode(el);
    }
  }, [isMobile]);`,
  `  useEffect(() => {
    if (!isMobile) return;
    // Retry until the header portal node exists in the DOM
    const tryFind = () => {
      const el = document.getElementById('mobile-header-actions-Timetable');
      if (el) { setPortalNode(el); return true; }
      return false;
    };
    if (!tryFind()) {
      const iv = setInterval(() => { if (tryFind()) clearInterval(iv); }, 50);
      return () => clearInterval(iv);
    }
  }, [isMobile]);`
);

// FIX 2: Hide logic - replace entire block from displayTitle init through isEmpty check
const OLD_HIDE_BLOCK = `                      let displayTitle = slot.title;\r\n                      let displayRoom = slot.classroom;\r\n                      let displayBg = slot.bgColor !== 'transparent' && slot.bgColor ? slot.bgColor : '#333';\r\n                      \r\n                      const isPrac = rawSlotId.startsWith('P');\r\n                      const isExtra = rawSlotId.startsWith('L');\r\n                      const isTheory = rawSlotId.match(/^[A-G]/);\r\n\r\n                      if (viewState !== 'hide') {\r\n                          if (editedSlots[rawSlotId]) {\r\n                              displayTitle = editedSlots[rawSlotId].title;\r\n                              displayRoom = editedSlots[rawSlotId].classroom;\r\n                              displayBg = '#FBC02D';\r\n                          } else {\r\n                              const actualCourseData: Record<string, any> = courseData?.slotToCourse || courseData;\r\n                              let mappedCourse = actualCourseData && actualCourseData[rawSlotId];\r\n                              if (!mappedCourse && rawSlotId.includes('-')) {\r\n                                 const parts = rawSlotId.split('-');\r\n                                 for (const p of parts) {\r\n                                    if (actualCourseData && actualCourseData[p]) {\r\n                                       mappedCourse = actualCourseData[p];\r\n                                       break;\r\n                                    }\r\n                                 }\r\n                              }\r\n                              if (mappedCourse) {\r\n                                  const anyMappedCourse = mappedCourse as any;\r\n                                  displayTitle = anyMappedCourse['Course Title'] || anyMappedCourse.title || displayTitle;\r\n                                  displayRoom = anyMappedCourse['Room No.'] || anyMappedCourse.classroom || anyMappedCourse.classRoom || displayRoom;\r\n                              }\r\n                              \r\n                              if (isPrac || (mappedCourse && (mappedCourse as any)['Course Type']?.toLowerCase().includes('practical'))) {\r\n                                  displayBg = '#81c784';\r\n                              } else if (isExtra) {\r\n                                  displayBg = '#42a5f5';\r\n                              } else if (isTheory || mappedCourse) {\r\n                                  displayBg = '#ffd54f';\r\n                              } else {\r\n                                  displayBg = '#555555';\r\n                              }\r\n                          }\r\n                      }\r\n\r\n                      const isEmpty = !displayTitle || displayTitle.trim() === '';\r\n                      if (isEmpty) return null; `;

const NEW_HIDE_BLOCK = `                      const isPrac = rawSlotId.startsWith('P');
                      const isExtra = rawSlotId.startsWith('L');
                      const isTheory = rawSlotId.match(/^[A-G]/);

                      let displayTitle: string = slot.title || rawSlotId;
                      let displayRoom: string = slot.classroom || '';
                      let displayBg: string = slot.bgColor !== 'transparent' && slot.bgColor ? slot.bgColor : '#444';

                      if (viewState === 'hide') {
                          // Hide mode: strip course names, show only slot IDs
                          displayTitle = rawSlotId;
                          displayRoom = '';
                          displayBg = '#444';
                      } else {
                          // Show / Modify: apply edits then map courses
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
                              if (isPrac || (mappedCourse && (mappedCourse as any)['Course Type']?.toLowerCase().includes('practical'))) {
                                  displayBg = '#81c784';
                              } else if (isExtra) {
                                  displayBg = '#42a5f5';
                              } else if (isTheory || mappedCourse) {
                                  displayBg = '#ffd54f';
                              } else {
                                  displayBg = '#555555';
                              }
                          }
                      }

                      // In hide mode always show cards; in show/modify skip empty ones
                      const isEmpty = viewState !== 'hide' && (!displayTitle || displayTitle.trim() === '');
                      if (isEmpty) return null; `;

if (tv.includes(OLD_HIDE_BLOCK)) {
  tv = tv.replace(OLD_HIDE_BLOCK, NEW_HIDE_BLOCK);
  console.log('✓ Hide block replaced');
} else {
  console.error('✗ Could not find OLD_HIDE_BLOCK - may need CRLF normalisation');
}

fs.writeFileSync('webapp/src/components/TimetableView.tsx', tv);

// ======================= AttendanceView.tsx =======================
let av = fs.readFileSync('webapp/src/components/AttendanceView.tsx', 'utf8');

av = av.replace(
  `  useEffect(() => {
    if (isMobile) {
      const el = document.getElementById('mobile-header-actions-Attendance');
      if (el) setPortalNode(el);
    }
  }, [isMobile]);`,
  `  useEffect(() => {
    if (!isMobile) return;
    const tryFind = () => {
      const el = document.getElementById('mobile-header-actions-Attendance');
      if (el) { setPortalNode(el); return true; }
      return false;
    };
    if (!tryFind()) {
      const iv = setInterval(() => { if (tryFind()) clearInterval(iv); }, 50);
      return () => clearInterval(iv);
    }
  }, [isMobile]);`
);

fs.writeFileSync('webapp/src/components/AttendanceView.tsx', av);

// ======================= dashboard/page.tsx - fix padding =======================
let dp = fs.readFileSync('webapp/src/app/dashboard/page.tsx', 'utf8');

// The main content area has h-[calc(100vh-32px)] and the padding must be on the
// INNER scroll container, not main. Add pb-24 to the inner div that wraps content sections.
dp = dp.replace(
  '<div className="max-w-[1400px] mx-auto space-y-12">',
  '<div className="max-w-[1400px] mx-auto space-y-12 pb-24 lg:pb-0">'
);

// Remove duplicate or conflicting pb- from main element
dp = dp.replace(/pb-24 lg:p-8/, 'lg:p-8');
dp = dp.replace(/pb-20 lg:p-8/, 'lg:p-8');
dp = dp.replace(/pb-\[120px\] lg:p-8/, 'lg:p-8');

fs.writeFileSync('webapp/src/app/dashboard/page.tsx', dp);

console.log('All fixes applied successfully!');
