const fs = require('fs');

let page = fs.readFileSync('webapp/src/components/BottomNav.tsx', 'utf8');

// 1. Add blue border to avatar in mobile view
page = page.replace(
  'bg-[#1E88E5] rounded-full hover:scale-[0.98] active:scale-[0.95]"',
  'bg-[#1E88E5] rounded-full hover:scale-[0.98] active:scale-[0.95] border-2 border-[#1E88E5]"'
);

fs.writeFileSync('webapp/src/components/BottomNav.tsx', page);
console.log('Successfully added border to BottomNav!');
