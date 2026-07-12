const fs = require('fs');
let page = fs.readFileSync('webapp/src/app/dashboard/page.tsx', 'utf8');

page = page.replace(
  'className="flex-1 p-4 pb-[120px] lg:p-8 lg:m-4 lg:ml-2 lg:bg-[#2a2a2a] lg:rounded-2xl h-[calc(100vh-32px)] overflow-y-auto w-full relative custom-scrollbar"',
  'className="flex-1 p-4 pb-24 lg:p-8 lg:m-4 lg:ml-2 lg:bg-[#2a2a2a] lg:rounded-2xl h-[calc(100vh-32px)] overflow-y-auto w-full relative custom-scrollbar"'
);

fs.writeFileSync('webapp/src/app/dashboard/page.tsx', page);
console.log('Padding fixed.');
