const fs = require('fs');

// ======================= TimetableView.tsx =======================
let tv = fs.readFileSync('webapp/src/components/TimetableView.tsx', 'utf8');

// 1. Remove the download button from the mobile portal JSX
tv = tv.replace(
  `                 <button
                    onClick={downloadTimetable}
                    className="bg-[#1e1e1e] border border-[#333] hover:bg-[#2a2a2a] text-white p-2 rounded-full shadow-lg transition-colors ml-auto flex flex-shrink-0 items-center justify-center w-9 h-9"
                    title="Download Timetable"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                 </button>`,
  ''
);

// 2. Correct the downloadTimetable function to force width/minWidth on mobile hidden elements, and pass windowWidth to html2canvas
const downloadFunctionOld = `  const downloadTimetable = async () => {
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
          containerRef.current.style.width = '1200px'; // Force desktop width for snapshot
          containerRef.current.style.padding = '20px';
          containerRef.current.style.backgroundColor = '#121212';
      }

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

      if (isMobileHidden) {
          await new Promise(res => setTimeout(res, 50));
      }

      const canvas = await html2canvas(tableEl, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true
      });

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
          containerRef.current.style.width = '';
          containerRef.current.style.padding = '';
          containerRef.current.style.backgroundColor = '';
      }

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      const section = profileData?.section || 'unknown';
      const semester = profileData?.semester || 'unknown';
      link.download = \`\${section}_\${semester}_timetable.png\`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating timetable image:', err);
    }
  };`;

const downloadFunctionNew = `  const downloadTimetable = async () => {
    if (!containerRef.current) return;
    const tableEl = containerRef.current.querySelector('table');
    if (!tableEl) return;

    try {
      const isMobileHidden = window.getComputedStyle(containerRef.current).display === 'none';
      const originalWidth = containerRef.current.style.width;
      const originalMinWidth = tableEl.style.minWidth;
      const originalPadding = containerRef.current.style.padding;
      const originalBgColor = containerRef.current.style.backgroundColor;

      if (isMobileHidden) {
          containerRef.current.classList.remove('hidden', 'lg:block');
          containerRef.current.style.display = 'block';
          containerRef.current.style.position = 'absolute';
          containerRef.current.style.top = '-9999px';
          containerRef.current.style.width = '1200px'; 
          tableEl.style.minWidth = '1200px';
          containerRef.current.style.padding = '20px';
          containerRef.current.style.backgroundColor = '#121212';
      }

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

      if (isMobileHidden) {
          await new Promise(res => setTimeout(res, 50));
      }

      const canvas = await html2canvas(tableEl, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true,
        windowWidth: 1200
      });

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
          containerRef.current.style.width = originalWidth;
          tableEl.style.minWidth = originalMinWidth;
          containerRef.current.style.padding = originalPadding;
          containerRef.current.style.backgroundColor = originalBgColor;
      }

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      const section = profileData?.section || 'unknown';
      const semester = profileData?.semester || 'unknown';
      link.download = \`\${section}_\${semester}_timetable.png\`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating timetable image:', err);
    }
  };`;

// replace download function
const startDl = tv.indexOf('  const downloadTimetable = async () => {');
const endDl = tv.indexOf('  const renderDesktopTable = () => {');
if (startDl !== -1 && endDl !== -1) {
  tv = tv.substring(0, startDl) + downloadFunctionNew + '\n\n' + tv.substring(endDl);
}

fs.writeFileSync('webapp/src/components/TimetableView.tsx', tv);
console.log('TimetableView download logic and portal button cleanups done.');


// ======================= dashboard/page.tsx =======================
let dp = fs.readFileSync('webapp/src/app/dashboard/page.tsx', 'utf8');

// 1. Add import for unfuglyData_gr2383
if (!dp.includes("import { unfuglyData_gr2383 }")) {
  dp = dp.replace(
    "import BottomNav from '@/components/BottomNav';",
    "import BottomNav from '@/components/BottomNav';\nimport { unfuglyData_gr2383 } from '@/mockData_gr2383';"
  );
}

// 2. Remove flex flex-col gap-3 from mobile header and border-b border-[#333]
dp = dp.replace(
  '<header className="lg:hidden sticky top-0 z-50 bg-[#1e1e1e]/95 backdrop-blur-md border-b border-[#333] shadow-md px-5 py-4 w-full flex flex-col gap-3">',
  '<header className="lg:hidden sticky top-0 z-50 bg-[#1e1e1e]/95 backdrop-blur-md shadow-md px-5 py-4 w-full flex items-center justify-between">'
);

// 3. Fallback/initial mock data logic in useState and useEffect
dp = dp.replace(
  '  const [data, setData] = useState<any>(null);',
  '  const [data, setData] = useState<any>(unfuglyData_gr2383);'
);

dp = dp.replace(
  `    const cachedStr = localStorage.getItem('dashboard_data_cache');
    if (cachedStr) {
      try {
        setData(JSON.parse(cachedStr));
        setLoading(false);
      } catch(e) {}
    }`,
  `    const cachedStr = localStorage.getItem('dashboard_data_cache');
    if (cachedStr) {
      try {
        const cached = JSON.parse(cachedStr);
        // Merge with gr2383 local edits if cache has no edits
        const merged = {
          ...cached,
          editedSlots: (cached.editedSlots && Object.keys(cached.editedSlots).length > 0)
            ? cached.editedSlots
            : unfuglyData_gr2383.editedSlots
        };
        setData(merged);
        setLoading(false);
      } catch(e) {}
    } else {
      setData(unfuglyData_gr2383);
      setLoading(false);
    }`
);

// 4. Merge DB results with mockData when fetched
dp = dp.replace(
  `      if (cachedData.profileData) {
          setData(cachedData);
          setLoading(false);
          localStorage.setItem('dashboard_data_cache', JSON.stringify(cachedData));
          // Always background-scrape for fresh data
          startScraping(true);
      }`,
  `      if (cachedData.profileData) {
          const merged = {
              ...cachedData,
              editedSlots: (cachedData.editedSlots && Object.keys(cachedData.editedSlots).length > 0)
                  ? cachedData.editedSlots
                  : unfuglyData_gr2383.editedSlots
          };
          setData(merged);
          setLoading(false);
          localStorage.setItem('dashboard_data_cache', JSON.stringify(merged));
          // Always background-scrape for fresh data
          startScraping(true);
      }`
);

// 5. Section-specific mobile pb values
// Timetable section div: pb-16
dp = dp.replace(
  'className={`w-full overflow-x-auto lg:min-w-[700px] ${activeTab === \'Timetable\' ? \'block\' : \'hidden lg:block\'}`}',
  'className={`w-full overflow-x-auto lg:min-w-[700px] ${activeTab === \'Timetable\' ? \'block pb-16\' : \'hidden lg:block\'}`}'
);

// Attendance section div: pb-16
dp = dp.replace(
  'className={`lg:min-w-[700px] ${activeTab === \'Attendance\' ? \'block\' : \'hidden lg:block\'}`}',
  'className={`lg:min-w-[700px] ${activeTab === \'Attendance\' ? \'block pb-16\' : \'hidden lg:block\'}`}'
);

// Marks section div: pb-32
dp = dp.replace(
  'className={`lg:min-w-[700px] ${activeTab === \'Marks\' ? \'block\' : \'hidden lg:block\'}`}',
  'className={`lg:min-w-[700px] ${activeTab === \'Marks\' ? \'block pb-32\' : \'hidden lg:block\'}`}'
);

fs.writeFileSync('webapp/src/app/dashboard/page.tsx', dp);
console.log('dashboard/page.tsx layout, mock data and section paddings updated successfully.');
