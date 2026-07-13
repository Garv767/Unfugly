const fs = require('fs');

let page = fs.readFileSync('webapp/src/app/dashboard/page.tsx', 'utf8');

// 1. Remove the Profile Avatar from the top navigation bar completely
page = page.replace(
  /<div className="relative">\s*<button onClick=\{\(\) => setIsMobileMenuOpen\(!isMobileMenuOpen\)\} className="focus:outline-none select-none">[\s\S]*?<\/div>\s*<\/div>/,
  ""
);

// 2. Change the mobile-header-actions ID to be tab-specific
page = page.replace(
  /<div id="mobile-header-actions" className="empty:hidden w-full overflow-x-auto custom-scrollbar hide-scrollbar"><\/div>/,
  '<div id={`mobile-header-actions-${activeTab}`} className="empty:hidden w-full flex items-center overflow-x-auto custom-scrollbar hide-scrollbar"></div>'
);

// 3. Adjust bottom padding from pb-20 (or pb-24) to pb-6
page = page.replace(
  /className="flex-1 p-4 pb-(24|20) lg:p-8/,
  'className="flex-1 p-4 pb-6 lg:p-8'
);

// 4. Remove the redundant "Initializing..." toast and top syncing pill on mobile
page = page.replace(
  /\{\/\* Background scraping toast \*\/\}[\s\S]*?\{\/\* Full-page error state \*\/\}/,
  "{/* Full-page error state */}"
);

// Remove the top syncing pill
page = page.replace(
  /\{isBgScraping && \(\s*<div className="absolute top-4 right-6 bg-\[#333\][\s\S]*?<\/div>\s*\)\}/,
  ""
);

// 5. Fix the error toast theme to match dark theme better
page = page.replace(
  /bg-\[#2a1a1a\] border border-\[#e57373\]\/40/,
  "bg-[#2a2a2a] border border-[#333]"
);

fs.writeFileSync('webapp/src/app/dashboard/page.tsx', page);
console.log('Successfully fixed dashboard page!');
