// extension/api/attendance.js

/**
 * Fetches the My_Attendance page Zoho payload natively.
 * @returns {Promise<string>} The raw text response.
 */
async function fetchAttendanceRaw() {
    const url = "https://academia.srmist.edu.in/srm_university/academia-academic-services/page/My_Attendance";
    const response = await fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch My_Attendance: ${response.status}`);
    }
    return await response.text();
}

/**
 * Extracts and sanitizes the Zoho pageSanitizer HTML string.
 * @param {string} rawText The raw JavaScript/HTML Zoho payload.
 * @returns {Promise<Document|null>} A parsed HTML Document, or null.
 */
async function parseAttendanceHTML(rawText) {
    const matches = [...rawText.matchAll(/pageSanitizer\.sanitize\(['"](.*?)['"]\);/sg)];
    let bestHtml = null;

    if (matches.length > 0 && matches[0][1]) {
        bestHtml = matches[0][1];
    } else {
        // Fallback if not wrapped in pageSanitizer (e.g., direct HTML)
        bestHtml = rawText;
    }

    if (bestHtml) {
        let cleanHtml = bestHtml
            .replace(/\\x22/g, '"')
            .replace(/\\x27/g, "'")
            .replace(/\\\//g, '/')
            .replace(/\\n/g, '')
            .replace(/\\r/g, '')
            .replace(/\\t/g, '')
            .replace(/\\'/g, "'")
            .replace(/\\"/g, '"')
            .replace(/\\-/g, '-')
            .replace(/\\\\/g, '');
            
        const parser = new DOMParser();
        return parser.parseFromString(cleanHtml, 'text/html');
    }
    return null;
}

function extractAttendanceDataFromDocument(doc, previousAttendanceData = []) {
    const attendanceData = [];
    const table = doc.querySelector('#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(4)') || doc.querySelector('table[border="1"][align="center"]');

    if (!table) {
        console.warn("extractAttendanceDataFromDocument: Attendance table not found.");
        return attendanceData;
    }

    const header = table.querySelector('tbody tr:first-child');
    let marginHeaderAdded = false;
    const rows = table.querySelectorAll('tbody tr:not(:first-child)');

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let classesToSkip = 0;
        let classesToAttend = 0;
        const targetPercentage = 75;

        if (cells.length > 7) {
            // Only add margin header once
            if (!marginHeaderAdded && header) {
                let headcell = document.createElement('th');
                headcell.innerHTML = '<strong>Margin</strong>';
                if (doc === document) header.append(headcell);
                marginHeaderAdded = true;
            }
            const courseCodeRaw = cells[0].textContent.trim();
            const courseCodeTrail = cells[0].querySelector('font') ? cells[0].querySelector('font').textContent.trim() : '';
            const courseCodeMatch = courseCodeRaw.replace(courseCodeTrail, '');
            const courseCode = courseCodeMatch;

            const courseTitle = cells[1].textContent.trim();
            const courseType = cells[2].textContent.trim(); // "Theory" or "Practical"
            const hoursConductedText = cells[6].textContent.trim();
            const absentHoursText = cells[7].textContent.trim();
            const percentageText = cells[8].textContent.trim();

            const totalClasses = parseInt(hoursConductedText);
            const absentClasses = parseInt(absentHoursText);
            const attendedClasses = totalClasses - absentClasses;
            const rawPercentageMatch = percentageText.match(/\d+(\.\d+)?/);
            const currentPercentage = rawPercentageMatch ? parseFloat(rawPercentageMatch[0]) : 0;

            const marginCell = document.createElement('td');
            marginCell.style.textAlign = 'center';
            marginCell.style.backgroundColor = "#E6E6FA";
            marginCell.style.fontWeight = 'bold';

            if (!isNaN(totalClasses) && !isNaN(attendedClasses) && totalClasses > 0) {
                if (currentPercentage >= targetPercentage) {
                    classesToSkip = Math.floor((attendedClasses / 0.75) - totalClasses);
                    if (classesToSkip < 0) classesToSkip = 0; // Cannot skip negative classes
                    marginCell.textContent = `${classesToSkip}`;
                    marginCell.style.color = "green";
                    marginCell.title = `Can skip ${classesToSkip} class(es) to maintain >= ${targetPercentage}% attendance.`;
                } else {
                    classesToAttend = Math.ceil((0.75 * totalClasses - attendedClasses) / 0.25);
                    if (classesToAttend < 0) classesToAttend = 0; 
                    marginCell.textContent = `-${classesToAttend}`;
                    marginCell.title = `Needs to attend ${classesToAttend} class(es) to reach >= ${targetPercentage}% attendance.`;
                    marginCell.style.color = "red";
                }
            } else {
                marginCell.textContent = "N/A";
                marginCell.title = "Could not calculate due to missing or invalid class data.";
            }

            attendanceData.push({
                courseCode: courseCode,
                courseTitle: courseTitle,
                courseType: courseType,
                hoursConducted: totalClasses,
                absentHours: absentClasses,
                attendedClasses: attendedClasses,
                percentage: currentPercentage,
                classesToSkip: classesToSkip,
                classesToAttend: classesToAttend
            });

            // Append margin cell if processing the live page, not for background fetch
            if (doc === document) { 
                row.append(marginCell);
            }
        } else if (cells.length === 7) {
            console.log("extractAttendanceDataFromDocument: Processing 'Attendance locked at sem end' row.");
            const courseCodeRaw = cells[0].textContent.trim();
            const courseCodeTrail = cells[0].querySelector('font') ? cells[0].querySelector('font').textContent.trim() : '';
            const courseCodeMatch = courseCodeRaw.replace(courseCodeTrail, '');
            const courseCode = courseCodeMatch;
            const courseTitle = cells[1].textContent.trim();
            const courseType = cells[2].textContent.trim(); 
            const percentageText = cells[6].textContent.trim();
            const rawPercentageMatch = percentageText.match(/\d+(\.\d+)?/);
            const currentPercentage = rawPercentageMatch ? parseFloat(rawPercentageMatch[0]) : 0;

            const prevCourse = (previousAttendanceData || []).find(p => p.courseCode === courseCode);
            const hoursConductedVal = prevCourse && prevCourse.hoursConducted !== undefined ? prevCourse.hoursConducted : 'N/A';
            const absentHoursVal = prevCourse && prevCourse.absentHours !== undefined ? prevCourse.absentHours : 'N/A';
            const attendedClassesVal = prevCourse && prevCourse.attendedClasses !== undefined ? prevCourse.attendedClasses : 'N/A';

            attendanceData.push({
                courseCode: courseCode,
                courseTitle: courseTitle,
                courseType: courseType,
                percentage: currentPercentage,
                hoursConducted: hoursConductedVal,
                absentHours: absentHoursVal,
                attendedClasses: attendedClassesVal,
                classesToSkip: 0,
                classesToAttend: 0,
                isLocked: true
            });
            // If on live page and it's a locked row, add an N/A margin cell
            if (doc === document) {
                const marginCell = document.createElement('td');
                marginCell.textContent = "Locked";
                marginCell.style.textAlign = 'center';
                marginCell.style.backgroundColor = "rgba(128, 128, 128, 0.3)";
                marginCell.title = "Attendance locked for this course.";
                row.append(marginCell);
            }
        }
    });

    return attendanceData;
}

function extractMarksDataFromDocument(doc) {
    const marksData = [];
    const table = doc.querySelector('#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(7)') || doc.querySelectorAll('table[border="1"][align="center"]')[1] || doc.querySelector('div > div.cntdDiv > div > table:nth-child(7)');
    const courseTable = doc.querySelector('#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(4)') || doc.querySelector('table[border="1"][align="center"]');
    
    if (!table) {
        console.warn("extractMarksDataFromDocument: Marks table not found.");
        return marksData;
    }

    const rows = table.querySelectorAll('tbody tr:not(:first-child)');
    const courseRows = courseTable ? courseTable.querySelectorAll('tbody tr:not(:first-child)') : [];
    const courseMap = {};
    courseRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 0) return;
        const courseCodeRaw = cells[0].textContent.trim();
        const fontElement = cells[0].querySelector('font');
        const courseCodeTrail = fontElement ? fontElement.textContent.trim() : '';
        const courseCodeMatch = courseCodeRaw.replace(courseCodeTrail, '');
        const courseCode = courseCodeMatch;
        let courseTitle = cells[1] ? cells[1].textContent.trim() : '';
        courseTitle = courseTitle.slice(0, 47) + (courseTitle.length > 47 ? '...' : ''); 
        courseMap[courseCode] = { courseTitle: courseTitle };
    });

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
            const courseCode = cells[0].textContent.trim();
            const courseTitle = courseMap[courseCode]?.courseTitle;
            if (doc === document) {
                cells[0].textContent = courseCode in courseMap ? `${courseCode} -${courseTitle}` : courseCode;
            }
            const courseType = cells[1].textContent.trim();
            const componentMarksCell = cells[2];
            const components = [];
            let totalMaxMarks = 0;
            let totalObtainedMarks = 0;
            const innerMarksTableRows = componentMarksCell.querySelectorAll('table tbody tr');

            if (doc === document) {
                componentMarksCell.querySelector('table').style.cssText = `width:100%`;
            }
            
            const totalRow = document.createElement('tr');
            totalRow.style.backgroundColor = '#E6E6FA';
            
            if (doc === document) {
                const totalPerSub = componentMarksCell.querySelector('table > tbody');
                if (totalPerSub) totalPerSub.appendChild(totalRow);
            }

            if (innerMarksTableRows.length > 0) {
                const componentCells = innerMarksTableRows[0].querySelectorAll('td');
                componentCells.forEach(compCell => {
                    const strongTag = compCell.querySelector('strong');
                    const fontTag = compCell.querySelector('font > br');

                    if (strongTag && fontTag) {
                        const compInfo = strongTag.textContent.trim();
                        const obtainedVal = fontTag.nextSibling ? fontTag.nextSibling.textContent.trim() : '';
                        const infoMatch = compInfo.match(/(.+)\/([\d.]+)/);

                        if (infoMatch) {
                            const componentName = infoMatch[1];
                            const maxM = parseFloat(infoMatch[2]);

                            const isAbsent = obtainedVal.toLowerCase() === 'abs';
                            const obtainedM = isAbsent ? 0 : parseFloat(obtainedVal);

                            components.push({
                                ComponentName: componentName,
                                MaxMarks: maxM,
                                ObtainedMarks: isAbsent ? 'Absent' : obtainedM
                            });

                            totalMaxMarks += maxM;
                            totalObtainedMarks += obtainedM;
                        }
                    }
                });
                
                if (doc === document) {
                    totalRow.innerHTML = `<td colspan="10"><strong>Total:<font color=green>${totalObtainedMarks.toFixed(2)}</font> /${totalMaxMarks.toFixed(2)}</strong></td>`;
                    if (totalObtainedMarks / totalMaxMarks < 0.5) {
                        totalRow.innerHTML = `<td colspan="10"><strong>Total:<font color=red>${totalObtainedMarks.toFixed(2)}</font> / ${totalMaxMarks.toFixed(2)}</strong></td>`;
                    }
                }
            }

            marksData.push({
                CourseCode: courseCode,
                CourseTitle: courseMap[courseCode] ? courseMap[courseCode].courseTitle : 'Unknown Course',
                CourseType: courseType,
                Components: components,
                TotalMaxMarks: parseFloat(totalMaxMarks.toFixed(2)),
                TotalObtainedMarks: parseFloat(totalObtainedMarks.toFixed(2))
            });
        }
    }
    return marksData;
}

/**
 * Fetches and parses the entire My_Attendance page data natively.
 * @returns {Promise<object>} The parsed attendance and marks data.
 */
async function fetchAttendanceData(previousAttendanceData) {
    const rawText = await fetchAttendanceRaw();
    const doc = await parseAttendanceHTML(rawText);
    if (!doc) {
        throw new Error("Could not parse My_Attendance Zoho payload.");
    }
    
    return {
        attendanceData: extractAttendanceDataFromDocument(doc, previousAttendanceData),
        marksData: extractMarksDataFromDocument(doc)
    };
}
