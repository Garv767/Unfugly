const fs = require('fs');

let page = fs.readFileSync('webapp/src/components/BottomNav.tsx', 'utf8');

// 1. Change container to h-14 and fully rounded, with padding only on the left
page = page.replace(
  /className="flex items-center justify-around bg-\[#1c1c1e\]\/80 backdrop-blur-xl rounded-\[30px\] border border-white\/10 shadow-\[0_10px_40px_rgba\(0,0,0,0.6\)\] px-2 py-1.5"/,
  'className="flex items-center justify-between bg-[#1c1c1e]/80 backdrop-blur-xl rounded-full border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.6)] pl-2 pr-0 py-0 h-14"'
);

// 2. Adjust avatar to be exactly h-14 w-14 rounded-full, and remove the "Profile" text below it, making it just the big avatar circle matching the edge
page = page.replace(
  /<div className="relative flex-1 flex justify-center">[\s\S]*?<\/div>\s*<\/div>\s*<\/nav>/,
  `        {/* Avatar Profile */}
        <div className="relative h-full">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="h-14 w-14 outline-none transition-transform duration-200 overflow-hidden flex items-center justify-center bg-[#1E88E5] rounded-full hover:scale-[0.98] active:scale-[0.95]"
          >
            <img 
               src={\`\${API_URL}/api/v1/user/photo\`} 
               alt="Profile" 
               onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }} 
               className="w-full h-full object-cover" 
            />
            <span className="text-white font-bold text-[14px] hidden">
               {profileData?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 bottom-20 bg-[#2a2a2a] border border-[#444] rounded-xl shadow-2xl transition-all w-[240px] p-4 text-left z-50">
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
      </div>
    </nav>`
);

fs.writeFileSync('webapp/src/components/BottomNav.tsx', page);
console.log('Successfully updated BottomNav curvature!');
