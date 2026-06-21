const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
content = content.replace('                 courseSlotMap={data.courseSlotMap} \r\n', '');
content = content.replace('                 courseSlotMap={data.courseSlotMap} \n', '');
content = content.replace('                 courseSlotMap={data.courseSlotMap}\r\n', '');
content = content.replace('                 courseSlotMap={data.courseSlotMap}\n', '');
fs.writeFileSync('src/app/dashboard/page.tsx', content, 'utf8');
console.log("FIXED");
