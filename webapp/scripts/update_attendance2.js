const fs = require('fs');

let page = fs.readFileSync('webapp/src/components/AttendanceView.tsx', 'utf8');

// 1. Add portalNode state
page = page.replace(
  "const [isMobile, setIsMobile] = useState(false);",
  "const [isMobile, setIsMobile] = useState(false);\n  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);"
);

// 2. Add useEffect to set portalNode
page = page.replace(
  "const predictComponent = <AttendancePredict attendanceData={data.attendanceData} courseData={data.courseData} />;",
  "useEffect(() => {\n    if (isMobile) {\n      const el = document.getElementById('mobile-header-actions-Attendance');\n      if (el) setPortalNode(el);\n    }\n  }, [isMobile]);\n\n  const predictComponent = <AttendancePredict attendanceData={data.attendanceData} courseData={data.courseData} />;"
);

// 3. Replace mobilePortalNode with portalNode
page = page.replace(
  "const mobilePortalNode = typeof document !== 'undefined' ? document.getElementById('mobile-header-actions-Attendance') : null;",
  ""
);

page = page.replace(
  "{isMobile && mobilePortalNode ? createPortal(predictComponent, mobilePortalNode) : null}",
  "{isMobile && portalNode ? createPortal(predictComponent, portalNode) : null}"
);

fs.writeFileSync('webapp/src/components/AttendanceView.tsx', page);
console.log('Successfully updated AttendanceView.tsx!');
