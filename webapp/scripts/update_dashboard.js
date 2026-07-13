const fs = require('fs');

let page = fs.readFileSync('webapp/src/app/dashboard/page.tsx', 'utf8');

// 1. Add imports for MarksView and AttendanceView
page = page.replace(
  "import AttendancePredict from '@/components/AttendancePredict';",
  "import AttendancePredict from '@/components/AttendancePredict';\nimport AttendanceView from '@/components/AttendanceView';\nimport MarksView from '@/components/MarksView';"
);

// 2. Remove hoveredCardIndex state
page = page.replace(
  "const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);\n",
  ""
);

// 3. Remove timetableViewState
page = page.replace(
  "const [timetableViewState, setTimetableViewState] = useState<'show' | 'hide'>('show');\n",
  ""
);

// 4. Update Mobile Header
const oldMobileHeaderRegex = /\{\/\* Top Navigation Bar \(Mobile Only\) \*\/\}.*?(?=\s*<BottomNav)/s;
const newMobileHeader = `{/* Top Navigation Bar (Mobile Only) */}
      <header className="lg:hidden sticky top-0 z-50 bg-[#1e1e1e]/95 backdrop-blur-md border-b border-[#333] shadow-md px-5 py-4 w-full flex flex-col gap-3">
         <div className="flex justify-between items-center w-full">
            <h2 className="text-2xl font-bold text-white tracking-tight">{activeTab}</h2>
            
            {/* Profile Avatar as Dropdown Trigger */}
            <div className="relative">
               <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="focus:outline-none select-none">
                  <img 
                     src={\`\${API_URL}/api/v1/user/photo\`} 
                     alt="Profile" 
                     onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }} 
                     className="w-10 h-10 rounded-full border-2 border-[#1E88E5] object-cover shadow-lg" 
                  />
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E88E5] to-[#1565C0] flex items-center justify-center text-white font-bold text-base shadow-lg hidden">
                     {data?.profileData?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
               </button>
               
               {/* Dropdown Menu */}
               {isMobileMenuOpen && (
                  <div className="absolute right-0 top-12 bg-[#2a2a2a] border border-[#444] rounded-xl shadow-2xl transition-all w-[250px] p-4 text-left z-50">
                     <h3 className="text-white text-lg font-bold mb-3 border-b border-[#555] pb-2">Profile</h3>
                     <div className="space-y-2 text-[13px] text-gray-300 mb-4">
                       <div><span className="font-bold text-white">Name:</span> {data?.profileData?.name}</div>
                       <div><span className="font-bold text-white">Reg No:</span> {data?.profileData?.registrationNo}</div>
                       <div><span className="font-bold text-white">Program:</span> {data?.profileData?.programmeBranch}</div>
                       <div><span className="font-bold text-white">Section:</span> {data?.profileData?.section}</div>
                       <div><span className="font-bold text-white mt-2 block">Department:</span> {data?.profileData?.schoolDepartment}</div>
                     </div>
                     <div className="mb-4 flex flex-col gap-1">
                        <button
                          onClick={() => router.push('/feedback')}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-[#333] hover:text-white rounded-lg transition-colors flex items-center gap-3"
                        >
                          <Rocket className="w-4 h-4 text-purple-400" /> Feedback Fastrack
                        </button>
                     </div>
                     <button onClick={handleLogout} className="w-full py-2 bg-[#ff5252]/10 text-[#ff5252] rounded hover:bg-[#ff5252]/20 hover:scale-[1.02] active:scale-[0.98] font-bold transition-all duration-200 text-sm">Logout</button>
                  </div>
               )}
            </div>
         </div>
         <div id="mobile-header-actions" className="empty:hidden w-full overflow-x-auto custom-scrollbar hide-scrollbar"></div>
      </header>`;

page = page.replace(oldMobileHeaderRegex, newMobileHeader + '\n\n      ');

// 5. Update main container pb-[120px] and main layout area wrapper
page = page.replace(
    'className="flex-1 p-4 lg:p-8 lg:m-4 lg:ml-2 lg:bg-[#2a2a2a] lg:rounded-2xl h-[calc(100vh-32px)] overflow-y-auto w-full relative custom-scrollbar"',
    'className="flex-1 p-4 pb-[120px] lg:p-8 lg:m-4 lg:ml-2 lg:bg-[#2a2a2a] lg:rounded-2xl h-[calc(100vh-32px)] overflow-y-auto w-full relative custom-scrollbar"'
);

// 6. Replace Attendance section
const attendanceSectionRegex = /\{\/\* Attendance Section \*\/\}.*?(?=\{\/\* Marks Section \*\/\})/s;
page = page.replace(attendanceSectionRegex, `
             {/* Attendance Section */}
             <div className={\`lg:min-w-[700px] \${activeTab === 'Attendance' ? 'block' : 'hidden lg:block'}\`}>
                <AttendanceView data={data} isBgScraping={isBgScraping} />
             </div>\n\n             `);

// 7. Replace Marks section
const marksSectionRegex = /\{\/\* Marks Section \*\/\}.*?(?=<\/div>\s*<\/main>)/s;
page = page.replace(marksSectionRegex, `
             {/* Marks Section */}
             <div className={\`lg:min-w-[700px] \${activeTab === 'Marks' ? 'block' : 'hidden lg:block'}\`}>
                <h2 className="text-2xl font-bold text-white mb-6 hidden lg:block">Marks</h2>
                <MarksView data={data} isBgScraping={isBgScraping} />
             </div>\n\n         `);

fs.writeFileSync('webapp/src/app/dashboard/page.tsx', page);
console.log('Done modifying dashboard/page.tsx');
