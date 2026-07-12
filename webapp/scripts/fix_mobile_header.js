const fs = require('fs');

let page = fs.readFileSync('webapp/src/app/dashboard/page.tsx', 'utf8');

// Move buttons next to heading instead of in a separate row
page = page.replace(
  /<div className="flex justify-between items-center w-full">\s*<h2 className="text-2xl font-bold text-white tracking-tight">\{activeTab\}<\/h2>\s*<\/div>\s*<div id=\{\`mobile-header-actions-\$\{activeTab\}\`\} className="empty:hidden w-full flex items-center overflow-x-auto custom-scrollbar hide-scrollbar"><\/div>/,
  `<div className="flex justify-between items-center w-full">
            <h2 className="text-2xl font-bold text-white tracking-tight mr-4">{activeTab}</h2>
            <div id={\`mobile-header-actions-\${activeTab}\`} className="empty:hidden flex items-center justify-end overflow-x-auto custom-scrollbar hide-scrollbar ml-auto"></div>
         </div>`
);

// Reduce padding-bottom even further, since BottomNav is floating and we want things perfectly visible
page = page.replace(
  /className="flex-1 p-4 pb-6 lg:p-8"/,
  'className="flex-1 p-4 pb-20 lg:p-8"' // Reverting padding to pb-20 so it scrolls PAST the bottom nav
);

fs.writeFileSync('webapp/src/app/dashboard/page.tsx', page);
console.log('Successfully aligned mobile header and fixed padding!');
