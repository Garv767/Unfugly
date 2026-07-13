// extension/api/courseRegistration.js

/**
 * Fetches the Course Registration page Zoho payload natively.
 * Since the request is made from the academia domain, cookies are automatically attached.
 * @returns {Promise<string>} The raw text response.
 */
async function fetchCourseRegistrationRaw() {
    const response = await fetch('https://academia.srmist.edu.in/srm_university/academia-academic-services/page/My_Time_Table_2023_24', {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch course registration: ${response.status}`);
    }
    return await response.text();
}

/**
 * Extracts and sanitizes the Zoho pageSanitizer HTML string using robust regex.
 * @param {string} rawText The raw JavaScript/HTML Zoho payload.
 * @returns {Promise<Document|null>} A parsed HTML Document, or null.
 */
async function parseCourseRegistrationHTML(rawText) {
    const matches = [...rawText.matchAll(/pageSanitizer\.sanitize\(['"](.*?)['"]\);/sg)];
    for (const match of matches) {
        if (match[1] && match[1].includes('course_tbl')) {
            let cleanHtml = match[1]
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
    }
    if (matches.length > 0 && matches[0][1]) {
        let cleanHtml = matches[0][1]
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

/**
 * Extracts profile data container-agnostically from the parsed Zoho payload.
 * @param {Document} doc The parsed HTML document.
 * @returns {object} Profile data.
 */
function extractProfileDataFromDocument(doc) {
    const profileData = {};
    if (!doc) return profileData;

    // Extract Name
    const nameElement = doc.querySelector('div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(1) > td:nth-child(4) > strong') || 
                        doc.querySelector('table:nth-child(1) > tbody > tr:nth-child(1) > td:nth-child(4) > strong');
    if (nameElement) profileData.name = nameElement.textContent.trim();

    // Extract Registration Number
    const regNoElement = doc.querySelector('div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(1) > td:nth-child(2)') || 
                         doc.querySelector('table:nth-child(1) > tbody > tr:nth-child(1) > td:nth-child(2)');
    if (regNoElement) profileData.registrationNo = regNoElement.textContent.trim();

    // Extract Programme and Branch
    const progBranchElement = doc.querySelector('div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(2) > strong') || 
                              doc.querySelector('table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(2) > strong');
    if (progBranchElement) profileData.programmeBranch = progBranchElement.textContent.trim();

    // Extract Semester
    const semElement = doc.querySelector('div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(4) > td:nth-child(2) > strong') || 
                       doc.querySelector('table:nth-child(1) > tbody > tr:nth-child(4) > td:nth-child(2) > strong');
    if (semElement) profileData.semester = semElement.textContent.trim();

    // Extract Section and Department
    const schoolDeptElement = doc.querySelector('div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(4) > strong') || 
                              doc.querySelector('table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(4) > strong');
    if (schoolDeptElement) {
        const str = schoolDeptElement.textContent.trim();
        const lastOpenParenIndex = str.lastIndexOf('(');

        if (lastOpenParenIndex === -1) {
            profileData.schoolDepartment = str;
        } else {
            let schoolDepartmentStr = str.substring(0, lastOpenParenIndex);
            if (schoolDepartmentStr.endsWith('-')) {
                schoolDepartmentStr = schoolDepartmentStr.slice(0, -1);
            }
            profileData.schoolDepartment = schoolDepartmentStr.trim();

            let sectionStr = str.substring(lastOpenParenIndex);
            sectionStr = sectionStr.replace(/[\(\)]/g, '');
            if (sectionStr.toLowerCase().endsWith('section')) {
                sectionStr = sectionStr.slice(0, -7);
            }
            profileData.section = sectionStr.trim();
        }
    }
    return profileData;
}

/**
 * Extracts course data container-agnostically from the parsed Zoho payload.
 * @param {Document} doc_context The parsed HTML document.
 * @returns {object} Course mapping details.
 */
function extractCourseDataFromDocument(doc_context) {
    const courseData = {};
    if (!doc_context) return { courses: courseData, batch: null };

    let studentBatch = null;

    const infoTable = doc_context.querySelector('div.cntdDiv table:not(.course_tbl)') || doc_context.querySelector('table:nth-child(1)');
    if (infoTable) {
        const batchCell = doc_context.querySelector('div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(2) > td:nth-child(2) > strong > font') || 
                          infoTable.querySelector('tbody tr:nth-child(2) td:nth-child(2) strong font');
        if (batchCell) {
            const batchText = batchCell.textContent.trim();
            if (batchText) {
                studentBatch = batchText;
            }
        }
    }

    const tableElement = doc_context.querySelector('table.course_tbl');
    if (tableElement) {
        const tableRows = tableElement.querySelectorAll('tbody tr');
        const startIndex = 1; // Skip header row
        //console.log(`[Unfugly API] Parsing course table (.course_tbl). Total rows including header: ${tableRows.length}`);
        for (let i = startIndex; i < tableRows.length; i++) {
            const row = tableRows[i];
            if (!row) continue;
            const cells = row.querySelectorAll('td');
            if (cells.length === 0) {
                console.log(`[Unfugly API] Row ${i} has 0 td cells, skipping.`);
                continue;
            }

            //console.log(`[Unfugly API] Row ${i}: cells count = ${cells.length}, Code: ${cells[1] ? cells[1].textContent.trim() : 'N/A'}, Title: ${cells[2] ? cells[2].textContent.trim() : 'N/A'}, Slot Cell Index 8: ${cells[8] ? cells[8].textContent.trim() : 'N/A'}`);

            if (cells.length > 8) {
                const slotCell = cells[8];
                const courseTitleCell = cells[2];
                const clsRoomCell = cells.length > 9 ? cells[9] : null;

                if (!slotCell || !courseTitleCell) {
                    console.warn(`[Unfugly API] Row ${i} skipped: slotCell or courseTitleCell is missing.`);
                    continue;
                }

                const slot = slotCell.textContent.trim();
                if (slot.includes('L')) {
                    //console.log(`[Unfugly API] Row ${i} is a lab/practical slot: "${slot}"`);
                    if (typeof window !== 'undefined') {
                        window.extraSlotFlag = true;
                    }
                }
                const rawTitle = courseTitleCell.textContent.trim();
                let truncatedTitle = rawTitle.length > 38 ? rawTitle.slice(0, 38) + '...' : rawTitle;
                const courseTitle = truncatedTitle;
                const clsRoom = clsRoomCell ? clsRoomCell.textContent.trim() : '';

                const courseCode = cells[1] ? cells[1].textContent.trim() : '';
                const courseCredit = cells[3] ? cells[3].textContent.trim() : '';
                const courseFaculty = cells[7] ? cells[7].textContent.trim() : '';

                if (slot && courseTitle) {
                    const slots = slot.split(/[-+,/]/).map(s => s.trim()).filter(s => s !== '');
                    //console.log(`[Unfugly API] Row ${i} - Splitting slot "${slot}" into:`, slots);
                    slots.forEach(s => {
                        const trimmedSlot = s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                        if (trimmedSlot) {
                            //console.log(`[Unfugly API] Row ${i} - Mapping Slot key "${trimmedSlot}" -> "${courseTitle}"`);
                            courseData[trimmedSlot] = {
                                "Course Code": courseCode,
                                "Course Title": courseTitle,
                                "Credit": courseCredit,
                                "Faculty Name": courseFaculty,
                                "Room No.": clsRoom
                            };
                        }
                    });
                } else {
                    console.warn(`[Unfugly API] Row ${i} - Skipped mapping: slot="${slot}", courseTitle="${courseTitle}"`);
                }
            } else {
                console.warn(`[Unfugly API] Row ${i} skipped: cells.length (${cells.length}) is <= 8`);
            }
        }
    } else {
        console.warn("[Unfugly API] Course table (.course_tbl) not found in doc_context.");
    }

    return { courses: courseData, batch: studentBatch };
}

/**
 * Fetches and parses the entire course registration page data natively.
 * @returns {Promise<object>} The parsed course and profile data.
 */
async function fetchCourseRegistrationData() {
    const rawText = await fetchCourseRegistrationRaw();
    const doc = await parseCourseRegistrationHTML(rawText);
    if (!doc) {
        throw new Error("Could not parse course registration Zoho payload.");
    }
    const courseDataResults = extractCourseDataFromDocument(doc);
    //console.log("courseDataResults", courseDataResults)
    const profileData = extractProfileDataFromDocument(doc);
    return {
        doc,
        profileData,
        courses: courseDataResults.courses,
        batch: courseDataResults.batch,
        registrationNo: profileData.registrationNo
    };
}
