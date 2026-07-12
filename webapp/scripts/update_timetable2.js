const fs = require('fs');

let page = fs.readFileSync('webapp/src/components/TimetableView.tsx', 'utf8');

// 1. Add portalNode state and swipe state
page = page.replace(
  "const [mobileDayIndex, setMobileDayIndex] = useState<number>(0);",
  "const [mobileDayIndex, setMobileDayIndex] = useState<number>(0);\n  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);\n  const [touchStart, setTouchStart] = useState<number | null>(null);"
);

// 2. Add useEffect to set portalNode
page = page.replace(
  "const [parsedData, setParsedData] = useState<any>(null);",
  "useEffect(() => {\n    if (isMobile) {\n      const el = document.getElementById('mobile-header-actions-Timetable');\n      if (el) setPortalNode(el);\n    }\n  }, [isMobile]);\n\n  const [parsedData, setParsedData] = useState<any>(null);"
);

// 3. Add touch handlers to renderMobileTable
const touchHandlers = `
    const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
    const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStart) return;
      const touchEnd = e.changedTouches[0].clientX;
      const dist = touchStart - touchEnd;
      if (dist > 50) setMobileDayIndex(prev => prev === parsedData.days.length - 1 ? 0 : prev + 1);
      if (dist < -50) setMobileDayIndex(prev => prev === 0 ? parsedData.days.length - 1 : prev - 1);
      setTouchStart(null);
    };
`;

page = page.replace(
  "const isActiveDay = String(mobileDayIndex + 1) === currentDayOrderObj;",
  "const isActiveDay = String(mobileDayIndex + 1) === currentDayOrderObj;\n\n" + touchHandlers
);

page = page.replace(
  '<div className="lg:hidden">',
  '<div className="lg:hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>'
);

// 4. Update the portal to use portalNode
page = page.replace(
  "document.getElementById('mobile-header-actions-Timetable')!",
  "portalNode!"
);
page = page.replace(
  "typeof document !== 'undefined' && document.getElementById('mobile-header-actions-Timetable')",
  "portalNode"
);

fs.writeFileSync('webapp/src/components/TimetableView.tsx', page);
console.log('Successfully updated TimetableView.tsx!');
