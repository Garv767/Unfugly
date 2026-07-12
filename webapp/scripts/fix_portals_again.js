const fs = require('fs');

let page = fs.readFileSync('webapp/src/app/dashboard/page.tsx', 'utf8');

page = page.replace(
  /<div id=\{\`mobile-header-actions-\$\{activeTab\}\`\} className="empty:hidden flex items-center justify-end overflow-x-auto custom-scrollbar hide-scrollbar ml-auto"><\/div>/,
  `
            <div id="mobile-header-actions-Timetable" className={\`\${activeTab === 'Timetable' ? 'flex' : 'hidden'} items-center justify-end overflow-x-auto custom-scrollbar hide-scrollbar ml-auto\`}></div>
            <div id="mobile-header-actions-Attendance" className={\`\${activeTab === 'Attendance' ? 'flex' : 'hidden'} items-center justify-end overflow-x-auto custom-scrollbar hide-scrollbar ml-auto\`}></div>
            <div id="mobile-header-actions-Marks" className={\`\${activeTab === 'Marks' ? 'flex' : 'hidden'} items-center justify-end overflow-x-auto custom-scrollbar hide-scrollbar ml-auto\`}></div>
  `
);

fs.writeFileSync('webapp/src/app/dashboard/page.tsx', page);
console.log('Successfully fixed portal targets!');
