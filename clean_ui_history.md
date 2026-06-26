

# STEP 37 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"


# STEP 46 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"
```tsx
// TARGET
    // Apply basic Tailwind classes to the raw table
    table.classList.add('w-full', 'text-sm', 'text-left');
    
    table.querySelectorAll('th, td').forEach(cell => {
      (cell as HTMLElement).classList.add('px-3', 'py-2', 'border', 'border-[#444]');
    });

// REPLACEMENT
    // Removed tailwind classes injection to exactly match extension styling
```


# STEP 49 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"


# STEP 107 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"


# STEP 110 | TOOL: replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\app\\dashboard\\page.tsx"
```tsx
// TARGET
"               <TimetableView \n                 htmlContent={data.timetableHTML || ''} \n                 timetableJSON={data.timetableJSON}\n                 courseData={data.courseData} \n                 netId={data.profileData.registrationNo} \n                 calendarData={calendarData}\n               />"
// REPLACEMENT
"               <TimetableView \n                 htmlContent={data.timetableHTML || ''} \n                 timetableJSON={data.timetableJSON}\n                 courseData={data.courseData} \n                 netId={data.profileData.registrationNo} \n                 calendarData={calendarData}\n                 profileData={data.profileData}\n               />"
```


# STEP 134 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"
```tsx
// TARGET
        th.style.color = '#000000';
        th.style.fontWeight = 'normal';
        th.style.fontSize = "10px";
        
        if (index === 0) {
// REPLACEMENT
        th.style.color = '#000000';
        th.style.fontWeight = 'normal';
        th.style.fontSize = "10px";
        th.style.borderRadius = '6px';
        
        if (index === 0) {
```
```tsx
// TARGET
            td.style.backgroundColor = slot.bgColor;
        } else {
            td.style.backgroundColor = 'transparent';
        }
        td.style.color = '#ffffff'; 
        td.style.padding = '8px 5px'; 
        td.style.overflowWrap = 'anywhere';
        td.style.wordBreak = 'normal';
        td.style.whiteSpace = 'normal';
        td.setAttribute('data-day', dayData.dayName);
        td.setAttribute('data-col', j.toString());
// REPLACEMENT
            td.style.backgroundColor = slot.bgColor;
        } else {
            td.style.backgroundColor = 'transparent';
        }
        td.style.color = '#ffffff'; 
        td.style.padding = '8px 5px'; 
        td.style.overflowWrap = 'anywhere';
        td.style.wordBreak = 'normal';
        td.style.whiteSpace = 'normal';
        td.style.borderRadius = '6px';
        td.setAttribute('data-day', dayData.dayName);
        td.setAttribute('data-col', j.toString());
```


# STEP 169 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"
```tsx
// TARGET
        th.style.borderRadius = '6px';
// REPLACEMENT
        th.style.borderRadius = '3px';
```
```tsx
// TARGET
        thDay.style.borderRadius = '6px';
// REPLACEMENT
        thDay.style.borderRadius = '3px';
```
```tsx
// TARGET
            td.style.borderRadius = '6px';
// REPLACEMENT
            td.style.borderRadius = '3px';
```


# STEP 210 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"


# STEP 219 | TOOL: replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"
```tsx
// TARGET
"           const match = firstCell.textContent.trim().match(/Day[\\s\\-]*(\\d)/i);"
// REPLACEMENT
"           const match = firstCell.textContent.trim().match(/^(?:Day[\\s\\-]*)?(\\d+)/i);"
```


# STEP 222 | TOOL: replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"
```tsx
// TARGET
"                (row as HTMLElement).style.boxShadow = 'inset 0 0 15px rgba(30,136,229,0.3)';"
// REPLACEMENT
"                (row as HTMLElement).style.boxShadow = 'none';"
```


# STEP 234 | TOOL: replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"
```tsx
// TARGET
"  }, [renderedHtml, courseData, editedSlots, isEditMode, viewState, calendarData]);"
// REPLACEMENT
"  }, [renderedHtml, courseData, editedSlots, isEditMode, viewState, calendarData, testDayOrder]);"
```


# STEP 240 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"


# STEP 285 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\app\\dashboard\\page.tsx"


# STEP 291 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\app\\dashboard\\page.tsx"


# STEP 306 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"


# STEP 321 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\app\\dashboard\\page.tsx"
```tsx
// TARGET
import { ArrowLeft, RefreshCw, BarChart2, Calendar as CalendarIcon, Clock, CheckCircle } from 'lucide-react';

const mockData = {
// REPLACEMENT
import { ArrowLeft, RefreshCw, BarChart2, Calendar as CalendarIcon, Clock, CheckCircle } from 'lucide-react';
import CalendarView from '@/components/CalendarView';

const mockData = {
```
```tsx
// TARGET
         {/* Calendar Section */}
         <div className={`mb-10 w-full ${activeTab === 'Calendar' ? 'block' : 'hidden lg:block'}`}>
            <h2 className="text-2xl font-bold mb-4">Calendar</h2>
            {/* Calendar Component will go here */}
            {activeTab === 'Calendar' && <div className="text-gray-400 italic">Calendar coming soon...</div>}
         </div>
      </main>
// REPLACEMENT
         {/* Calendar Section */}
         <div className={`mb-10 w-full ${activeTab === 'Calendar' ? 'block' : 'hidden lg:block'}`}>
            <h2 className="text-2xl font-bold mb-4">Calendar</h2>
            {activeTab === 'Calendar' && calendarData && <CalendarView calendarData={calendarData} />}
            {activeTab === 'Calendar' && !calendarData && <div className="text-gray-400 italic">Syncing Calendar data...</div>}
         </div>
      </main>
```


# STEP 354 | TOOL: replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\app\\dashboard\\page.tsx"
```tsx
// TARGET
"                        </div>\n{/* Main Content */}\n      <main className=\"flex-1 px-4 lg:px-6 h-[calc(100vh-64px)] lg:h-[calc(100vh-2rem)] overflow-y-auto w-full relative custom-scrollbar pb-24 lg:pb-0 pt-4 lg:pt-0\">\n         {isBgScraping && (\n            <div className=\"absolute top-4 right-6 bg-[#333] px-3 py-1.5 rounded-full text-xs text-white flex items-center shadow border border-[#444] z-50\">\n               <div className=\"w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin mr-2\"></div> \n               Syncing latest data...\n               <span className=\"ml-2 text-muted truncate max-w-[150px] italic\">({progressMsg})</span>\n            </div>\n         )}\n         \n         {/* Timetable Section */}\n         <div className={`mb-10 w-full ${activeTab === 'Timetable' ? 'block' : 'hidden lg:block'}`}>\n             {(data.timetableHTML || data.timetableJSON) && (\n               <TimetableView \n                 htmlContent={data.timetableHTML || ''} \n                 timetableJSON={data.timetableJSON}\n                 courseData={data.courseData} \n                 netId={data.profileData.registrationNo} \n                 calendarData={calendarData}\n                 profileData={data.profileData}\n               />\n             )}\n         </div>\n\n         {/* Attendance Section */}\n         <div className={`mb-10 w-full ${activeTab === 'Attendance' ? 'block' : 'hidden lg:block'}`}>\n            <h2 className=\"text-2xl font-bold mb-4 flex items-center gap-4\">\n               Attendance\n               <AttendancePredict attendanceData={data.attendanceData} courseData={data.courseData} />\n            </h2>\n             <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4\">\n              {data.attendanceData?.map((item: any, i: number) => (\n                  <AttendanceCard key={i} item={item} courseData={data.courseData} />\n              ))}\n            </div>\n         </div>\n\n         {/* Marks Section */}\n         <div cl
<truncated 11113 bytes>
// REPLACEMENT
"                        </div>"
```


# STEP 365 | TOOL: replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\app\\dashboard\\page.tsx"
```tsx
// TARGET
"{/* Desktop Sidebar */}\n      <aside className=\"hidden lg:flex w-[260px] bg-[#222222] rounded-xl p-6 flex-col justify-between h-[calc(100vh-2rem)] sticky top-4 shrink-0 shadow-lg border border-[#333]\">\n        <SidebarContent />\n      </aside>\n\n      {/* Main Content */}\n      <main className=\"flex-1 px-4 lg:px-6 h-[calc(100vh-64px)] lg:h-[calc(100vh-2rem)] overflow-y-auto w-full relative custom-scrollbar pb-24 lg:pb-0 pt-4 lg:pt-0\">\n         {isBgScraping && (\n            <div className=\"absolute top-4 right-6 bg-[#333] px-3 py-1.5 rounded-full text-xs text-white flex items-center shadow border border-[#444] z-50\">\n               <div className=\"w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin mr-2\"></div> \n               Syncing latest data...\n               <span className=\"ml-2 text-muted truncate max-w-[150px] italic\">({progressMsg})</span>\n            </div>\n         )}\n         \n         {/* Timetable Section */}\n         <div className={`mb-10 w-full ${activeTab === 'Timetable' ? 'block' : 'hidden lg:block'}`}>\n             {(data.timetableHTML || data.timetableJSON) && (\n               <TimetableView \n                 htmlContent={data.timetableHTML || ''} \n                 timetableJSON={data.timetableJSON}\n                 courseData={data.courseData} \n                 netId={data.profileData.registrationNo} \n                 calendarData={calendarData}\n                 profileData={data.profileData}\n               />\n             )}\n         </div>\n\n         {/* Attendance Section */}\n         <div className={`mb-10 w-full ${activeTab === 'Attendance' ? 'block' : 'hidden lg:block'}`}>\n            <h2 className=\"text-2xl font-bold mb-4 flex items-center gap-4\">\n               Attendance\n               <AttendancePredict attendanceData={data.attendanceData} courseData={data.courseData} />\n            </h2>\n             <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4\">\n              {data.attendanceData?.
<truncated 10778 bytes>
// REPLACEMENT
""
```


# STEP 374 | TOOL: replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\app\\dashboard\\page.tsx"
```tsx
// TARGET
"                                 <div key={idx} className={`px-3 py-1 rounded-full text-[12px] font-semibold ${pillBg} ${pillText} shadow-sm border border-[rgba(255,255,255,0.1)]`}>\n\n                                 <div key={idx} className={`px-3 py-1 rounded-full text-[12px] font-semibold ${pillBg} ${pillText} shadow-sm border border-[rgba(255,255,255,0.1)]`}>"
// REPLACEMENT
"                                 <div key={idx} className={`px-3 py-1 rounded-full text-[12px] font-semibold ${pillBg} ${pillText} shadow-sm border border-[rgba(255,255,255,0.1)]`}>"
```


# STEP 396 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\app\\dashboard\\page.tsx"


# STEP 477 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"


# STEP 483 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"


# STEP 502 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\components\\TimetableView.tsx"


# STEP 505 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\app\\dashboard\\page.tsx"


# STEP 534 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\app\\dashboard\\page.tsx"


# STEP 540 | TOOL: multi_replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\app\\dashboard\\page.tsx"


# STEP 563 | TOOL: replace_file_content | FILE: "c:\\Users\\DELL\\Cooking\\Unfugly\\webapp\\src\\app\\dashboard\\page.tsx"
```tsx
// TARGET
"                           <h3 className=\"font-bold text-white text-[15px]\">\n                              {item.CourseCode} - {item.CourseTitle}\n                           </h3>\n                                                   <th className=\"pb-2 font-semibold\">Grade</th>"
// REPLACEMENT
"                           <h3 className=\"font-bold text-white text-[15px]\">\n                              {item.CourseCode} - {item.CourseTitle}\n                           </h3>\n                           <p className=\"text-[12px] text-gray-400\">\n                              {item.CourseType}{isInternal && <span className=\"text-[#FBC02D] ml-1\">(Internal)</span>}\n                           </p>\n                        </div>\n                        <div className=\"flex items-center gap-4 text-right\">\n                           {item.TotalMaxMarks > 0 && (\n                              <div>\n                                 <span className={`font-bold text-lg ${colorClass}`}>\n                                    {item.TotalObtainedMarks}\n                                 </span>\n                                 <span className=\"text-gray-400 font-bold text-sm\"> / {item.TotalMaxMarks}</span>\n                              </div>\n                           )}\n                           <div className=\"text-gray-500 hover:text-white focus:text-white focus:outline-none cursor-help group relative\" tabIndex={0}>\n                              <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\">\n                                 <circle cx=\"12\" cy=\"12\" r=\"10\"></circle>\n                                 <line x1=\"12\" y1=\"16\" x2=\"12\" y2=\"12\"></line>\n                                 <line x1=\"12\" y1=\"8\" x2=\"12.01\" y2=\"8\"></line>\n                              </svg>\n                              \n                              {/* Tooltip Popup */}\n                              {(() => {\n                                 const slotVal = data.courseData ? Object.values(data.courseData).find((s: any) => s['Course Code'] === item.CourseCode || s['courseCode'] === item.CourseCode) as any : null;\n                                 const 
<truncated 2570 bytes>
```
