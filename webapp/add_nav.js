const fs = require('fs');
const path = 'src/app/dashboard/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `       </main>
     </div>
   );
}`;

const replacement = `       </main>

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
       </nav>
     </div>
   );
}`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("SUCCESS bottom layout");
} else {
    console.log("NOT FOUND target");
}
