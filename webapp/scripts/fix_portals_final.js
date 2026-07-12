const fs = require('fs');

// ============================
// TimetableView.tsx
// ============================
let tv = fs.readFileSync('webapp/src/components/TimetableView.tsx', 'utf8');

// Fix 1: Replace the simple portal useEffect with MutationObserver + run on mount
tv = tv.replace(
  /useEffect\(\(\) => \{\r?\n\s+if \(isMobile\) \{\r?\n\s+const el = document\.getElementById\('mobile-header-actions-Timetable'\);\r?\n\s+if \(el\) setPortalNode\(el\);\r?\n\s+\}\r?\n\s+\}, \[isMobile\]\);/,
  `useEffect(() => {
    // Run on mount: use MutationObserver to find portal node as soon as header is in DOM
    const tryFind = () => {
      const el = document.getElementById('mobile-header-actions-Timetable');
      if (el) { setPortalNode(el); return true; }
      return false;
    };
    if (!tryFind()) {
      const observer = new MutationObserver(() => { if (tryFind()) observer.disconnect(); });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
  }, []); // mount-only`
);

// Fix 2: Remove isMobile guard from portal render condition
// Change: {isMobile && portalNode  -> {portalNode
tv = tv.replace(
  /\{\/\* Mobile Portal \*\/\}\r?\n\s+\{isMobile && portalNode\s*\r?\n\s+\? createPortal\(/,
  `{/* Mobile Portal — header div is hidden on desktop via lg:hidden CSS */}
      {portalNode
        ? createPortal(`
);

const tvResult = tv.includes('observer.observe(document.body') && tv.includes('{portalNode');
console.log('TimetableView fixes:', tvResult ? '✓' : '✗ Something still wrong');
if (!tvResult) {
  // Try to detect what's there
  const hasObs = tv.includes('observer.observe(document.body');
  const hasPortal = tv.includes('{portalNode');
  console.log('  - MutationObserver:', hasObs ? 'OK' : 'MISSING');
  console.log('  - Portal condition:', hasPortal ? 'OK' : 'MISSING');
}

fs.writeFileSync('webapp/src/components/TimetableView.tsx', tv);

// ============================
// AttendanceView.tsx
// ============================
let av = fs.readFileSync('webapp/src/components/AttendanceView.tsx', 'utf8');

av = av.replace(
  /useEffect\(\(\) => \{\r?\n\s+if \(isMobile\) \{\r?\n\s+const el = document\.getElementById\('mobile-header-actions-Attendance'\);\r?\n\s+if \(el\) setPortalNode\(el\);\r?\n\s+\}\r?\n\s+\}, \[isMobile\]\);/,
  `useEffect(() => {
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
  }, []); // mount-only`
);

// Remove isMobile guard from attendance portal render
av = av.replace(
  /\{isMobile && portalNode \? createPortal\(predictComponent, portalNode\) : null\}/,
  `{portalNode ? createPortal(predictComponent, portalNode) : null}`
);

const avResult = av.includes('observer.observe(document.body') && av.includes('{portalNode ? createPortal');
console.log('AttendanceView fixes:', avResult ? '✓' : '✗');

fs.writeFileSync('webapp/src/components/AttendanceView.tsx', av);

console.log('\nDone! Both portal fixes applied.');
