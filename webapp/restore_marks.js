const fs = require('fs');

const path = 'src/app/dashboard/page.tsx';
const content = fs.readFileSync(path, 'utf8');

const targetStr = `                           <h3 className="font-bold text-white text-[15px]">
                              {item.CourseCode} - {item.CourseTitle}
                           </h3>`;

const endTargetStr = `                                                   <th className="pb-2 font-semibold">Grade</th>`;

const startIdx = content.indexOf(targetStr);
const endIdx = content.indexOf(endTargetStr);

if (startIdx !== -1 && endIdx !== -1) {
    const missingBlock = `
                           <h3 className="font-bold text-white text-[15px]">
                              {item.CourseCode} - {item.CourseTitle}
                           </h3>
                           <p className="text-[12px] text-gray-400">
                              {item.CourseType}{isInternal && <span className="text-[#FBC02D] ml-1">(Internal)</span>}
                           </p>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                           {item.TotalMaxMarks > 0 && (
                              <div>
                                 <span className={\`font-bold text-lg \${colorClass}\`}>
                                    {item.TotalObtainedMarks}
                                 </span>
                                 <span className="text-gray-400 font-bold text-sm"> / {item.TotalMaxMarks}</span>
                              </div>
                           )}
                           <div className="text-gray-500 hover:text-white focus:text-white focus:outline-none cursor-help group relative" tabIndex={0}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                 <circle cx="12" cy="12" r="10"></circle>
                                 <line x1="12" y1="16" x2="12" y2="12"></line>
                                 <line x1="12" y1="8" x2="12.01" y2="8"></line>
                              </svg>
                              
                              {/* Tooltip Popup */}
                              {(() => {
                                 const slotVal = data.courseData ? Object.values(data.courseData).find((s: any) => s['Course Code'] === item.CourseCode || s['courseCode'] === item.CourseCode) as any : null;
                                 const faculty = slotVal ? (slotVal['Faculty Name'] || slotVal['facultyName']) : 'N/A';
                                 const credit = slotVal ? (slotVal['Credit'] || slotVal['credit']) : 'N/A';
                                 const internalObtained = Math.min(item.TotalObtainedMarks, 60);

                                 const GRADES = [
                                    { grade: 'O', min: 91 },
                                    { grade: 'A+', min: 81 },
                                    { grade: 'A', min: 71 },
                                    { grade: 'B+', min: 61 },
                                    { grade: 'B', min: 56 },
                                    { grade: 'C', min: 50 }
                                 ];

                                 return (
                                    <div className="absolute right-0 top-6 bg-[#13131a] border border-[#2a2a35] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,1)] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all z-50 p-4 min-w-[300px] text-left cursor-default pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                                       <h4 className="text-[15px] font-bold text-white mb-2">Course Info</h4>
                                       <div className="text-[13px] text-gray-300 space-y-1 mb-4 leading-relaxed">
                                          <div>Credit: <span className="font-bold text-white">{credit}</span></div>
                                          <div>Faculty: <span className="text-[#64b5f6] hover:underline cursor-pointer">{faculty}</span></div>
                                          <div className="flex items-center gap-1 text-gray-400">
                                             <span>Type:</span>
                                             <span className="text-white ml-1">📄 {item.CourseType} {isInternal ? '(Internal)' : '(60+40)'}</span>
                                          </div>
                                       </div>

                                       {!isInternal && item.TotalMaxMarks > 0 ? (
                                          <table className="w-full text-[13px] text-left mt-2 border-collapse">
                                             <thead>
                                                <tr className="border-b border-[#333] text-gray-400">
                                                   <th className="pb-2 font-semibold">Grade</th>`;

    const newContent = content.substring(0, startIdx) + missingBlock + content.substring(endIdx + endTargetStr.length);
    fs.writeFileSync(path, newContent, 'utf8');
    console.log("Restored missing marks block!");
} else {
    console.log("Could not find start/end markers");
}
