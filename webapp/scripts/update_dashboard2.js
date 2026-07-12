const fs = require('fs');

let page = fs.readFileSync('webapp/src/app/dashboard/page.tsx', 'utf8');

// 1. Remove profile avatar trigger and menu from mobile header
page = page.replace(
  /{[\s\S]*?\/\* Profile Avatar as Dropdown Trigger \*\/[\s\S]*?<\/div>(\s*<div id={`mobile-header-actions-\${activeTab}`})/m,
  "$1"
);

// 2. Reduce pb-24 to pb-20
page = page.replace(
  'className="flex-1 p-4 pb-24 lg:p-8',
  'className="flex-1 p-4 pb-20 lg:p-8'
);

// 3. Add activeTab memory
const originalTabState = "const [activeTab, setActiveTab] = useState('Timetable');";
const newTabState = `const [activeTab, setActiveTab] = useState('Timetable');

  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) {
          setActiveTab(tab);
      } else {
          const saved = localStorage.getItem('dashboard_active_tab');
          if (saved) setActiveTab(saved);
      }
  }, []);

  useEffect(() => {
      localStorage.setItem('dashboard_active_tab', activeTab);
  }, [activeTab]);`;
page = page.replace(originalTabState, newTabState);

fs.writeFileSync('webapp/src/app/dashboard/page.tsx', page);
console.log('Successfully updated dashboard page!');
