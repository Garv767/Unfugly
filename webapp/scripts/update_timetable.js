const fs = require('fs');

let page = fs.readFileSync('webapp/src/components/TimetableView.tsx', 'utf8');

const regex = /<div className="flex items-center mb-4 relative">[\s\S]*?<\/svg>\n\s*<\/button>\n\s*<\/div>/;

const match = page.match(regex);
if (match) {
    const originalBlock = match[0];
    
    // Extract the buttons inside `originalBlock`
    const buttonsBlockStart = originalBlock.indexOf('<div style={{');
    const buttonsBlockEnd = originalBlock.lastIndexOf('</button>') + 9;
    
    let buttonsJSX = '';
    if (buttonsBlockStart !== -1 && buttonsBlockEnd !== -1) {
        buttonsJSX = originalBlock.substring(buttonsBlockStart, buttonsBlockEnd);
    }
    
    const newHeader = `
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center mb-4 relative">
         <h2 className="text-xl font-bold text-white mr-4">Timetable</h2>
         \${buttonsJSX}
         <button
            onClick={downloadTimetable}
            className="bg-[#1e1e1e] border border-[#333] hover:bg-[#2a2a2a] text-white p-2 rounded-full shadow-lg transition-colors ml-auto flex items-center justify-center w-9 h-9"
            title="Download Timetable"
         >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
         </button>
      </div>

      {/* Mobile Portal */}
      {isMobile && typeof document !== 'undefined' && document.getElementById('mobile-header-actions') 
        ? createPortal(
            <div className="flex items-center gap-2 pb-2 pl-1 overflow-x-auto w-full hide-scrollbar">
                \${buttonsJSX.replace("marginLeft: '20px',", "marginLeft: '0px',")}
                <button
                   onClick={downloadTimetable}
                   className="bg-[#1e1e1e] border border-[#333] hover:bg-[#2a2a2a] text-white p-2 rounded-full shadow-lg transition-colors ml-auto flex flex-shrink-0 items-center justify-center w-9 h-9"
                   title="Download Timetable"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                       <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                       <polyline points="7 10 12 15 17 10"></polyline>
                       <line x1="12" y1="15" x2="12" y2="3"></line>
                   </svg>
                </button>
            </div>, 
            document.getElementById('mobile-header-actions')!
          ) 
        : null}
      `;
      
    // Because we used string templates inside a string template in our JS script, we need to substitute buttonsJSX
    const finalHeader = newHeader.replace('\\${buttonsJSX}', buttonsJSX).replace('\\${buttonsJSX.replace("marginLeft: \'20px\',", "marginLeft: \'0px\',")}', buttonsJSX.replace("marginLeft: '20px',", "marginLeft: '0px',"));
      
    page = page.replace(regex, finalHeader);
    fs.writeFileSync('webapp/src/components/TimetableView.tsx', page);
    console.log('Successfully updated TimetableView.tsx!');
} else {
    console.log('Could not find regex match in TimetableView.tsx');
}
