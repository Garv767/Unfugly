const fs = require('fs');

let page = fs.readFileSync('webapp/src/app/dashboard/page.tsx', 'utf8');

// 1. Remove the Profile Avatar completely from the mobile header
const avatarRegex = /\{\/\* Profile Avatar as Dropdown Trigger \*\/\}[\s\S]*?\{\/\* Main Layout Area \*\/\}/;
page = page.replace(
  avatarRegex,
  `</div>
         <div id={\`mobile-header-actions-\${activeTab}\`} className="empty:hidden w-full flex items-center overflow-x-auto custom-scrollbar hide-scrollbar"></div>
      </header>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Layout Area */}`
);

// 2. Adjust bottom padding
page = page.replace(
  /className="flex-1 p-4 pb-24 lg:p-8/,
  'className="flex-1 p-4 pb-6 lg:p-8'
);
page = page.replace(
  /className="flex-1 p-4 pb-20 lg:p-8/,
  'className="flex-1 p-4 pb-6 lg:p-8'
);

// 3. Remove Background scraping toast completely
page = page.replace(
  /\{\/\* Background scraping toast \*\/\}[\s\S]*?\{\/\* Full-page error state \*\/\}/,
  "{/* Full-page error state */}"
);

// 4. Remove Top syncing pill
page = page.replace(
  /\{isBgScraping && \(\s*<div className="absolute top-4 right-6 bg-\[#333\][\s\S]*?<\/div>\s*\)\}/,
  ""
);

// 5. Fix the error toast theme
page = page.replace(
  /bg-\[#2a1a1a\] border border-\[#e57373\]\/40/,
  "bg-[#2a2a2a] border border-[#333]"
);

fs.writeFileSync('webapp/src/app/dashboard/page.tsx', page);
console.log('Successfully fixed dashboard page!');
