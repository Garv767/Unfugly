const fs = require('fs');

let page = fs.readFileSync('webapp/src/components/BottomNav.tsx', 'utf8');

// 1. Add API_URL and useEffect for profile data
page = page.replace(
  "import { CalendarDays, CheckSquare, BarChart2, CalendarRange, Rocket } from 'lucide-react';",
  "import { CalendarDays, CheckSquare, BarChart2, CalendarRange, Rocket } from 'lucide-react';\nimport { useEffect, useState } from 'react';\n\nconst API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';"
);

// 2. Add profile state and logic inside BottomNav
page = page.replace(
  "const router = useRouter();",
  `const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem('dashboard_data_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setProfileData(parsed.profileData);
      } catch(e) {}
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(\`\${API_URL}/api/v1/auth/logout\`, { method: 'POST', credentials: 'include' });
      localStorage.clear();
      router.push('/login');
    } catch (err) {
      console.error(err);
    }
  };`
);

// 3. Update handleClick
page = page.replace(
  "router.push('/dashboard');",
  "router.push(`/dashboard?tab=${tab.id}`);"
);

// 4. Add Avatar to the end of the nav
const avatarJSX = `
        {/* Avatar Profile */}
        <div className="relative flex-1 flex justify-center">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="flex flex-col items-center justify-center gap-1 py-0.5 outline-none transition-all duration-200"
          >
            <div className="w-7 h-7 rounded-full border-[1.5px] border-white/20 overflow-hidden shadow-sm flex items-center justify-center bg-[#1E88E5]">
              <img 
                 src={\`\${API_URL}/api/v1/user/photo\`} 
                 alt="Profile" 
                 onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }} 
                 className="w-full h-full object-cover" 
              />
              <span className="text-white font-bold text-[10px] hidden">
                 {profileData?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <span className={\`text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 \${isMenuOpen ? 'text-[#1E88E5]' : 'text-gray-600'}\`}>
              Profile
            </span>
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 bottom-16 bg-[#2a2a2a] border border-[#444] rounded-xl shadow-2xl transition-all w-[240px] p-4 text-left z-50">
               <h3 className="text-white text-lg font-bold mb-3 border-b border-[#555] pb-2">Profile</h3>
               <div className="space-y-2 text-[12px] text-gray-300 mb-4">
                 <div><span className="font-bold text-white">Name:</span> {profileData?.name}</div>
                 <div><span className="font-bold text-white">Reg No:</span> {profileData?.registrationNo}</div>
                 <div><span className="font-bold text-white">Program:</span> {profileData?.programmeBranch}</div>
                 <div><span className="font-bold text-white">Section:</span> {profileData?.section}</div>
                 <div><span className="font-bold text-white mt-2 block">Department:</span> {profileData?.schoolDepartment}</div>
               </div>
               <button onClick={handleLogout} className="w-full py-2 bg-[#ff5252]/10 text-[#ff5252] rounded-lg hover:bg-[#ff5252]/20 font-bold transition-all duration-200 text-sm">
                 Logout
               </button>
            </div>
          )}
        </div>
`;

page = page.replace(
  "        {tabs.map((tab) => {",
  "        {tabs.map((tab) => {"
);

page = page.replace(
  "            </button>\n          );\n        })}\n      </div>\n    </nav>",
  "            </button>\n          );\n        })}\n" + avatarJSX + "      </div>\n    </nav>"
);

fs.writeFileSync('webapp/src/components/BottomNav.tsx', page);
console.log('Successfully updated BottomNav!');
