const fs = require('fs');
const path = 'src/app/dashboard/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove courseSlotMap (in case it wasn't removed) and add courseData
const ttStr = `               <TimetableView 
                 htmlContent={data.timetableHTML} 
                 courseSlotMap={data.courseSlotMap} 
                 netId={data.profileData.registrationNo} 
                 calendarData={calendarData}
               />`;

const ttReplacement = `               <TimetableView 
                 htmlContent={data.timetableHTML} 
                 courseData={data.courseData} 
                 netId={data.profileData.registrationNo} 
                 calendarData={calendarData}
               />`;

if (content.includes(ttStr)) {
    content = content.replace(ttStr, ttReplacement);
} else {
    // If already modified by previous run
    content = content.replace(/courseSlotMap=\{data\.courseSlotMap\}/g, 'courseData={data.courseData}');
}

// 2. Add Mobile Nav
const targetNav = '</main>';
const idxNav = content.lastIndexOf(targetNav);
if (idxNav !== -1 && !content.includes('Bottom Navigation Bar (Mobile)')) {
    const replacementNav = `       </main>

       {/* Floating Squircle Calendar Button (Desktop Only) */}
       <div className="hidden lg:block">
          <Link 
            href="/calendar"
            className="fixed bottom-6 right-6 bg-[#2a2a2a] text-white w-[50px] h-[50px] rounded-[16px] shadow-2xl flex items-center justify-center transition-transform hover:scale-110 hover:bg-[#333] z-50 border border-[#444]"
            title="Open Calendar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </Link>
       </div>

       {/* Bottom Navigation Bar (Mobile) */}
       <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-[#1a1a1a] border-t border-[#333] flex justify-around items-center h-16 z-40 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
           {[
              { id: 'Timetable', icon: '📅' }, 
              { id: 'Attendance', icon: '✅' }, 
              { id: 'Marks', icon: '📊' }, 
              { id: 'Calendar', icon: '📆' }
           ].map((tab) => (
              <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={\`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors \${activeTab === tab.id ? 'text-[#1E88E5]' : 'text-gray-500 hover:text-gray-300'}\`}
              >
                  <span className="text-xl">{tab.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{tab.id}</span>
              </button>
           ))}
       </nav>`;
    content = content.substring(0, idxNav) + replacementNav + content.substring(idxNav + targetNav.length);
}

// 3. Update top layout
const t2 = '<main className="flex-1 p-6 overflow-y-auto w-full relative custom-scrollbar">';
const r2 = '<main className="flex-1 px-4 lg:px-6 h-[calc(100vh-64px)] lg:h-[calc(100vh-2rem)] overflow-y-auto w-full relative custom-scrollbar pb-24 lg:pb-0 pt-4 lg:pt-0">';
if (content.includes(t2)) content = content.replace(t2, r2);

const t3 = '<div className="flex items-center gap-4">';
const r3 = '<div className="flex items-center gap-4 ml-auto lg:ml-0">';
if (content.includes(t3)) content = content.replace(t3, r3);

const t4 = '<div className="flex items-center justify-between mb-8">';
const r4 = '<div className="flex items-center justify-between mb-4 lg:mb-8 bg-[#1a1a1a] lg:bg-transparent -mx-4 px-4 py-3 lg:mx-0 lg:p-0 sticky top-0 z-40 border-b border-[#333] lg:border-none">';
if (content.includes(t4)) content = content.replace(t4, r4);

const t5 = '<h1 className="text-3xl font-bold">Dashboard</h1>';
const r5 = '<h1 className="text-xl lg:text-3xl font-bold">Dashboard</h1>';
if (content.includes(t5)) content = content.replace(t5, r5);

fs.writeFileSync(path, content, 'utf8');
console.log("FIXED ALL");
