const fs = require('fs');
const path = 'src/app/dashboard/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Marks tooltip fix
content = content.replace(
  'className="relative group cursor-pointer text-[#64B5F6] hover:text-white transition-colors"',
  'className="relative group cursor-pointer text-[#64B5F6] hover:text-white focus:text-white focus:outline-none transition-colors" tabIndex={0}'
);

content = content.replace(
  'className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-black text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg border border-[#444]"',
  'className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-black text-white text-xs rounded p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all pointer-events-none z-10 shadow-lg border border-[#444]"'
);

// Add Top Right Profile Icon / Hamburger
const searchHeader = '<div className="flex items-center gap-4 ml-auto lg:ml-0">';
const profileBtn = `
              <div className="flex items-center gap-4 ml-auto lg:ml-0">
                 {/* Mobile Profile / Hamburger */}
                 <button 
                    className="lg:hidden w-8 h-8 rounded-full overflow-hidden border border-[#444] bg-[#333] flex items-center justify-center focus:outline-none"
                    onClick={() => {
                        const sidebar = document.getElementById('mobile-sidebar');
                        if (sidebar) sidebar.classList.toggle('-translate-x-full');
                    }}
                 >
                    {data?.profileData?.photoUrl ? (
                       <img src={data.profileData.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    )}
                 </button>`;

if (content.includes(searchHeader)) {
    content = content.replace(searchHeader, profileBtn);
}

// Ensure Sidebar has ID for the hamburger toggle and can be hidden
const sidebarTarget = '<aside className="w-[280px] bg-[#363636] border-r border-[#444] p-6 flex flex-col justify-between h-screen sticky top-0 shrink-0">';
const sidebarReplacement = '<aside id="mobile-sidebar" className="fixed lg:sticky top-0 left-0 z-50 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 w-[280px] bg-[#363636] border-r border-[#444] p-6 flex flex-col justify-between h-screen shrink-0 shadow-2xl lg:shadow-none">';
content = content.replace(sidebarTarget, sidebarReplacement);

fs.writeFileSync(path, content, 'utf8');
console.log("FIXED TOOLTIP AND HAMBURGER");
