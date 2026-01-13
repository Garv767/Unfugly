// content.js


// Global Variables and Constants

// Global variable to hold the persistent observer for the timetable content
window.timetableContentObserver = null;

// Global flag to prevent the persistent observer from reacting to our own changes
window.isApplyingTimetableChanges = false;

// Global variable to hold the MutationObserver for the main container
window.myMutationObserver = null; // Ensure this is initialized

// Global flag to prevent multiple background fetches being triggered for the same missing data event
window.isFetchingInBackground = false;

// Global variables for retry mechanism for timetable page loading
window.timetableRetryCount = 0;

const MAX_TIMETABLE_RETRIES = 20; // Max attempts

const TIMETABLE_RETRY_DELAY = 1000; // 1 second delay between attempts

// Unified Timetable URLs based on batch
const UNIFIED_TIMETABLE_URLS = {
    '1': "https://academia.srmist.edu.in/#Page:Unified_Time_Table_2025_Batch_1",
    '2': "https://academia.srmist.edu.in/#Page:Unified_Time_Table_2025_batch_2"
};

// Helper Functions

/**
 * Displays an informational message as a toast notification.
 * @param {string} message The message to display.
 * @param {number} duration The duration in milliseconds for the message to be displayed.
 * @param {string} type The type of message (e.g., 'info', 'success', 'error').
 */
function displayInfoMessage(message, duration = 3000, type = 'info') {
    console.log(`[Message: ${type}] ${message}`);
    const msgContainer = document.getElementById('unfugly-msg-container') || document.createElement('div');
    msgContainer.id = 'unfugly-msg-container';
    msgContainer.style.cssText = `
        position: fixed;
        display: flex;
        
        justify-content: center;
        width: auto;
        bottom: 50px;
        left: 50%;
        flex-direction: column;
        pointer-events: none;
    `;
    const infoBox = /*document.getElementById('unfugly-info-box') ||*/ document.createElement('div');
    infoBox.id = 'unfugly-info-box';
    infoBox.style.cssText = `
        
        transform: translateX(-50%);
        padding: 15px 25px;
        border-radius: 8px;
        color: white;
        font-size: 16px;
        font-family: Arial, sans-serif;
        justify-content: center;
        text-align: center; 
        pointer-events: auto;
        z-index: 1000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
        opacity: 0;
    `;

    switch (type) {
        case 'error':
            infoBox.style.backgroundColor = '#E57373';
            break;
        case 'success':
            infoBox.style.backgroundColor = '#81C784';
            break;
        case 'info':
        default:
            infoBox.style.backgroundColor = '#337ab7';
            break;
        case 'critical':
            infoBox.style.backgroundColor = '#FBC02D';
    }

    infoBox.innerHTML = message;
    document.body.appendChild(msgContainer);
    msgContainer.appendChild(infoBox);

    // Animate in and out
    setTimeout(() => {
        infoBox.style.opacity = '1';
        infoBox.style.transform = 'translate(-50%, -10px)';
    }, 10);

    setTimeout(() => {
        infoBox.style.opacity = '0';
        infoBox.style.transform = 'translate(-50%, 0)';
        setTimeout(() => {
            if (infoBox.parentNode) {
                infoBox.parentNode.removeChild(infoBox);
            }
        }, 500);
    }, duration);
}

/**
 * Utility function to wait for an element to appear in a given document.
 * Uses a MutationObserver.
 * @param {Document} doc The document context to observe.
 * @param {string} selector The CSS selector of the element to wait for.
 * @param {number} timeoutMs The maximum time to wait in milliseconds.
 * @returns {Promise<Element>} A promise that resolves with the found element, or rejects if timeout.
 */
function waitForElement(doc, selector, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        let observer = null;
        const checkElement = () => {
            const element = doc.querySelector(selector);
            if (element) {
                if (observer) observer.disconnect();
                resolve(element);
                return true;
            }
            if (Date.now() - startTime > timeoutMs) {
                if (observer) observer.disconnect();
                reject(new Error(`waitForElement: Timeout waiting for element with selector: ${selector}`));
                return false;
            }
            return false;
        };

        if (checkElement()) return;

        if (typeof MutationObserver !== 'undefined') {
            observer = new MutationObserver((mutations, obs) => {
                if (checkElement()) {
                    obs.disconnect();
                }
            });
            observer.observe(doc.body, { childList: true, subtree: true });
        } else {
            // Fallback to polling if MutationObserver is not available
            let pollInterval = setInterval(() => {
                if (checkElement()) {
                    clearInterval(pollInterval);
                }
            }, 200);
        }
    });
}


/**
 * Creates a hidden iframe and injects it into the body to load a specific URL.
 * Waits for the iframe content to be ready and specific elements to appear.
 * @param {string} url The URL to load in the iframe.
 * @param {string[]} selectorsToWaitFor An array of CSS selectors to wait for within the iframe's document.
 * @returns {Promise<{iframeDoc: Document, iframe: HTMLIFrameElement}>} A promise that resolves with the iframe's document and the iframe element.
 */
async function createHiddenIframe(url, selectorsToWaitFor = ['body']) { // Default to body, more specific selectors can be passed
    return new Promise((resolve, reject) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);

        iframe.onload = async () => {
            try {
                const iframeDoc = iframe.contentWindow.document;
                //console.log("createHiddenIframe: iframe loaded. Waiting for dynamic content inside...", url);

                // Waiting for each essential selector to appear
                for (const selector of selectorsToWaitFor) {
                    await waitForElement(iframeDoc, selector);
                    //console.log(`createHiddenIframe: Element '${selector}' found in iframe for URL: ${url}.`);
                }

                //console.log("createHiddenIframe: All required elements found in iframe. Resolving promise.");
                resolve({ iframeDoc, iframe });
            } catch (error) {
                console.error("createHiddenIframe: Error waiting for iframe content for URL:", url, error);
                reject(error);
            }
        };

        iframe.onerror = (e) => {
            console.error("createHiddenIframe: Iframe failed to load.", e);
            reject(new Error("Iframe failed to load."));
        };
    });
}


/**
 * Extracts Net ID from the main page's navbar.
 * @returns {string|null} The Net ID or null if not found.
 */
function getNetId() {
    const netIdElement = document.querySelector("#zc-account-settings > a > span.navbar_user_name");
    if (netIdElement) {
        const textContent = netIdElement.textContent.trim();
        //const match = textContent.match(/\(([^)]+)\)/); // Extract content within bracket
        return textContent;//match ? match[1] : null;
    }
    return null;
}

/**
 * Fetches the latest version number from a remote URL and compares it with the extension's current version.
 * If a new version is available, it calls a function to display a notification to the user.
 * @returns {number} Returns 1 if fetching the latest version fails, otherwise returns nothing.
 */
async function checkVersion(){
    const currentVersion = chrome.runtime.getManifest().version;
    const response = await fetch('https://raw.githubusercontent.com/Garv767/Unfugly/refs/heads/main/version.txt')
    if (!response.ok) {
        console.warn("Could not fetch latest version info.", response);
        return;
    };
    const latestVersion = (await response.text()).trim();//then(res => res.text()).then(text => text.trim());
    const currentParts = currentVersion.split('.').map(Number);
    const latestParts = latestVersion.split(".").map(Number);

    const maxLength = Math.max(currentParts.length, latestParts.length);
     for (let i = 0; i < maxLength; i++) {
        const currentPart = currentParts[i] || 0;
        const latestPart = latestParts[i] || 0;
        if (currentPart < latestPart) {
            chrome.runtime.sendMessage({ action: "trigger_update" }); // Signal background script
            //chrome.runtime.requestUpdateCheck();
            //let webStoreLink = "https://chromewebstore.google.com/detail/lfjlfkbcnoioefacgcjanjdiodphnoce?utm_source=item-share-cb"; //Placeholder
            displayInfoMessage(`A new Version is available, updating...`, 5000, 'critical');//Please update it  <a href="${webStoreLink}" target="_blank">here!!</a>
            return;
        }
     }
     
}

//Data Extraction Functions

/**
 * Extracts profile data from a given document.
 * @param {Document} doc The document to extract from (e.g., iframe's document for registration page).
 * @returns {object} Profile data including name, registration number, program, and school.
 */
function extractProfileDataFromDocument(doc) {
    const profileData = {};
    // Extract Name
    const nameElement = doc.querySelector('#zc-viewcontainer_My_Time_Table_2023_24 > div > div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(1) > td:nth-child(4) > strong');
    if (nameElement) profileData.name = nameElement.textContent.trim();
    // Extract Registration Number
    const regNoElement = doc.querySelector('#zc-viewcontainer_My_Time_Table_2023_24 > div > div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(1) > td:nth-child(2)');
    if (regNoElement) profileData.registrationNo = regNoElement.textContent.trim();
    // Extract Programme and Branch
    const progBranchElement = doc.querySelector('#zc-viewcontainer_My_Time_Table_2023_24 > div > div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(2) > strong');
    if (progBranchElement) profileData.programmeBranch = progBranchElement.textContent.trim();
    // Extract Semester
    const semElement = doc.querySelector('#zc-viewcontainer_My_Time_Table_2023_24 > div > div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(4) > td:nth-child(2) > strong');
    if (semElement) profileData.semester = semElement.textContent.trim();
    // Extract Section and Department
    const schoolDeptElement = doc.querySelector('#zc-viewcontainer_My_Time_Table_2023_24 > div > div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(4) > strong');
    if (schoolDeptElement) {
        //profileData.schoolDepartment = schoolDeptElement.textContent.trim();
        const str = schoolDeptElement.textContent.trim();
        const lastOpenParenIndex = str.lastIndexOf('(');

        if (lastOpenParenIndex === -1) {
            profileData.schoolDepartment = str; // No bracket found, use the whole string
            //return { schoolDepartment: str, sectionStr: "" }; 
        }

        // Extract the first part, excluding the last character if it's a dash
        let schoolDepartmentStr = str.substring(0, lastOpenParenIndex);
        if (schoolDepartmentStr.endsWith('-')) { // Checking if the string ends with a '-' character
            schoolDepartmentStr = schoolDepartmentStr.slice(0, -1); // Remove the trailing '-'
            profileData.schoolDepartment = schoolDepartmentStr.trim(); // Trim any extra spaces
        }

        // Extract the second part and remove the opening and closing bracket
        let sectionStr = str.substring(lastOpenParenIndex);
        sectionStr = sectionStr.replace(/[\(\)]/g, ''); // Remove both '(' and ')' globally
        sectionStr = sectionStr.slice(0, -7); // Remove "section" from the end
        profileData.section = sectionStr.trim(); // Trim any extra spaces
    }
    return profileData;
}


/**
 * Extracts course data (slot to course title/classroom mapping) and student batch from a document.
 * This is primarily for the My_Time_Table_2023_24 page (Course Registration).
 * @param {Document} doc_context The document context to extract from.
 * @returns {object} An object containing courses (slot-to-info map), batch, and registrationNo.
 */
function extractCourseDataFromDocument(doc_context) {
    const courseData = {};
    let registrationNo = null;
    let studentBatch = null;

    // Find the info table which contains student details like RA and Batch
    const infoTable = doc_context.querySelector('div.cntdDiv table:not(.course_tbl)');
    if (infoTable) {
        // Extract Registration Number
        const regNoRow = infoTable.querySelector('tbody tr:first-child');
        if (regNoRow) {
            const regNoCell = regNoRow.querySelectorAll('td')[1];
            if (regNoCell) {
                const regNoMatch = regNoCell.textContent.trim().match(/\d{9,}/);
                if (regNoMatch) {
                    registrationNo = regNoMatch[0];
                }
            }
        }

        // Extract Batch
        /*const batchRow = infoTable.querySelector('tbody tr:nth-child(2)');
        if (batchRow) {*/
            const batchCell = infoTable.querySelector('#zc-viewcontainer_My_Time_Table_2023_24 > div > div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(2) > td:nth-child(2) > strong > font');//batchRow.querySelectorAll('td')[1];
            if (batchCell) {
                const batchText = batchCell.textContent.trim();
                //const batchMatch = batchText.match(/Batch - (\d+)/);
                if (batchText) {
                    studentBatch = batchText;
                    //console.log("Batch explicitly set to 2 for testing purposes.", studentBatch);
                }
            }
        
    } else {
        console.warn("extractCourseDataFromDocument: Student info table not found in document context.");
    }

    const tableElement = doc_context.querySelector('table.course_tbl');
    if (tableElement) {
        const tableRows = tableElement.querySelectorAll('tbody tr');

        const startIndex = 1; // Skip header row
        for (let i = startIndex; i < tableRows.length; i++) {
            const row = tableRows[i];
            if (!row) continue;
            const cells = row.querySelectorAll('td');

            if (cells.length > 9) { // Ensure enough cells for slot, title, GCR code
                const slotCell = cells[8];
                const courseTitleCell = cells[2];
                const clsRoomCell = cells[9];

                if (!slotCell || !courseTitleCell || !clsRoomCell) continue;

                const slot = slotCell.textContent.trim();
                const rawTitle = courseTitleCell.textContent.trim();

                    let truncatedTitle = ''; // Declare a variable to store the truncated title

                    if (rawTitle.length > 38) {
                        truncatedTitle = rawTitle.slice(0, 38) + '...'; // If longer than 38 characters, truncate and add ellipsis
                    } else {
                        truncatedTitle = rawTitle; // Otherwise, use the original title
                    }
                const courseTitle = truncatedTitle; // Use the truncated title

                const clsRoom = clsRoomCell.textContent.trim();

                if (slot && courseTitle) {
                    const slots = slot.split('-').filter(s => s !== '');
                    slots.forEach(s => {
                        const trimmedSlot = s.trim();
                        if (trimmedSlot) {
                            courseData[trimmedSlot] = {
                                title: courseTitle,
                                classroom: clsRoom
                            };
                        }
                    });
                }
            }
        }
    } else {
        console.warn("extractCourseDataFromDocument: Course table (.course_tbl) not found.");
    }

    return { courses: courseData, batch: studentBatch, registrationNo: registrationNo };
}

/**
 * Extracts timetable HTML from the unified timetable page.
 * @param {Document} doc_context The document context (iframe's document) of the unified timetable.
 * @returns {string|null} The outerHTML of the timetable table, or null if not found.
 */
function extractUnifiedTimetableHTML(doc_context) {
    const timetableTable = doc_context.querySelector('div > table:nth-child(5)');
    if (timetableTable) {
        const captionElement = timetableTable.querySelector('caption.t1');
        if (!captionElement) {
            console.warn("addDownloadTimetableButton: Caption element with class 't1' not found.");
            return;
        }

        // Apply table-caption to the caption to align its content and the new button
        captionElement.style.display = 'table-caption'; // Ensure it behaves like a caption
        //console.log("addDownloadTimetableButton: ", captionElement.style.display);
        captionElement.textContent = "Your Personalized Timetable by Unfugly";
        captionElement.style.marginTop = '5px';

        //console.log("extractUnifiedTimetableHTML: Timetable table found in unified timetable page.");
        return timetableTable.outerHTML;
    }
    return null;
}


function extractAttendanceDataFromDocument(doc) {
    const attendanceData = [];
    const table = doc.querySelector('#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(4)');

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
                header.append(headcell);
                marginHeaderAdded = true;
            }
            //const courseCodeIndex =/* cells[0].textContent.indexOf('<br>') !== -1 ?*/ cells[0].textContent.split('"')[0] ;//: cells[0].textContent;
            //console.log("extractAttendanceDataFromDocument: Processing row with course code:", courseCodeIndex);
            const courseCodeRaw = cells[0].textContent.trim();//.indexOf('\n');
            const courseCodeTrail = cells[0].querySelector('font').textContent.trim();
            //console.log("extractAttendanceDataFromDocument: Fetched raw course code:",courseCodeTrail) ;
            //console.log("extractAttendanceDataFromDocument: Processing row with course code:", courseCodeRaw);
            const courseCodeMatch = courseCodeRaw.replace(courseCodeTrail,'');//courseCodeRaw.match(/^([A-Z0-9]+)^/);//(/^([A-Z0-9]+)/)
            const courseCode = courseCodeMatch ;//? courseCodeMatch[1] : courseCodeRaw;

            const courseTitle = cells[1].textContent.trim();
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
                    if (classesToAttend < 0) classesToAttend = 0; // Should not happen with current formula, but for safety
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
                hoursConducted: totalClasses,
                absentHours: absentClasses,
                attendedClasses: attendedClasses,
                percentage: currentPercentage,
                classesToSkip: classesToSkip,
                classesToAttend: classesToAttend
            });

            // Append margin cell if processing the live page, not for iframe
            if (doc === document) { // Check if the document is the main window's document
                row.append(marginCell);
            }
        } else if (cells.length === 7) {
            console.log("extractAttendanceDataFromDocument: Processing 'Attendance locked at sem end' row.");
            //const courseCodeIndex =/* cells[0].textContent.indexOf('<br>') !== -1 ?*/ cells[0].textContent.split('"')[0] ;//: cells[0].textContent;
            //console.log("extractAttendanceDataFromDocument: Processing row with course code:", courseCodeIndex);
            const courseCodeRaw = cells[0].textContent.trim();//.indexOf('\n');
            const courseCodeTrail = cells[0].querySelector('font').textContent.trim();
            //console.log("extractAttendanceDataFromDocument: Fetched raw course code:",courseCodeTrail) ;
            //console.log("extractAttendanceDataFromDocument: Processing row with course code:", courseCodeRaw);
            const courseCodeMatch = courseCodeRaw.replace(courseCodeTrail,'');//courseCodeRaw.match(/^([A-Z0-9]+)^/);//(/^([A-Z0-9]+)/)
            const courseCode = courseCodeMatch ;//? courseCodeMatch[1] : courseCodeRaw;
            const courseTitle = cells[1].textContent.trim();
            const percentageText = cells[6].textContent.trim();
            const rawPercentageMatch = percentageText.match(/\d+(\.\d+)?/);
            const currentPercentage = rawPercentageMatch ? parseFloat(rawPercentageMatch[0]) : 0;

            attendanceData.push({
                courseCode: courseCode,
                courseTitle: courseTitle,
                percentage: currentPercentage,
                totalClasses: 'N/A',
                attendedClasses: 'N/A',
                classesToSkip: 0,
                classesToAttend: 0
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
    const table = doc.querySelector('#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(7)');
    const courseTable = doc.querySelector('#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(4)');
    if (!table) {
        console.warn("extractMarksDataFromDocument: Marks table not found.");
        return marksData;
    }

    const rows = table.querySelectorAll('tbody tr:not(:first-child)');
    const courseRows = courseTable.querySelectorAll('tbody tr:not(:first-child)');
    const courseMap = {};
    courseRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const cellText = cells[0].textContent.trim();
        const courseCodeRaw = cells[0].textContent.trim();//.indexOf('\n');
        const courseCodeTrail = cells[0].querySelector('font').textContent.trim();
        const courseCodeMatch = courseCodeRaw.replace(courseCodeTrail,'');
        const courseCode = courseCodeMatch ;
        //const courseCodeMatch = cellText.match(/^([A-Z0-9]+)/);
        //const courseCode = courseCodeMatch ? courseCodeMatch[1] : cellText;
        let courseTitle = cells[1].textContent.trim();
        courseTitle = courseTitle.slice(0, 47) + (courseTitle.length > 47 ? '...' : ''); // Truncate if too long
        courseMap[courseCode] = { courseTitle: courseTitle };
        //console.log("extractMarksDataFromDocument: Mapped course code to title:", courseCode, courseTitle);
    });

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
            const courseCode = cells[0].textContent.trim();
            const courseTitle = courseMap[courseCode]?.courseTitle;
            cells[0].textContent = courseCode in courseMap ? `${courseCode} -${courseTitle}` : courseCode;
            const courseType = cells[1].textContent.trim();
            const componentMarksCell = cells[2];
            const components = [];
            let totalMaxMarks = 0;
            let totalObtainedMarks = 0;
            const innerMarksTableRows = componentMarksCell.querySelectorAll('table tbody tr');

            componentMarksCell.querySelector('table').style.cssText = `width:100%`;
            const totalRow = document.createElement('tr');
            totalRow.style.backgroundColor = '#E6E6FA';
            const totalPerSub = componentMarksCell.querySelector('table > tbody')
            totalPerSub.appendChild(totalRow);
            
            if (innerMarksTableRows.length > 0) {
                const componentCells = innerMarksTableRows[0].querySelectorAll('td');
                componentCells.forEach(compCell => {
                    const strongTag = compCell.querySelector('strong');
                    const fontTag = compCell.querySelector('font > br');

                    if (strongTag && fontTag) {
                        const compInfo = strongTag.textContent.trim();
                        const obtainedVal = fontTag.nextSibling ? fontTag.nextSibling.textContent.trim() : ''; // Safely access nextSibling
                        const infoMatch = compInfo.match(/(.+)\/([\d.]+)/);

                        if (infoMatch) {
                            const componentName = infoMatch[1];
                            const maxM = parseFloat(infoMatch[2]);
                            const obtainedM = parseFloat(obtainedVal);

                            components.push({
                                ComponentName: componentName,
                                MaxMarks: maxM,
                                ObtainedMarks: obtainedM
                            });

                            totalMaxMarks += maxM;
                            totalObtainedMarks += obtainedM;
                        }
                    }
                });
                totalRow.innerHTML = `<td colspan="10"><strong>Total:<font color=green>${totalObtainedMarks.toFixed(2)}</font> /${totalMaxMarks.toFixed(2)}</strong></td>`
                if(totalObtainedMarks/totalMaxMarks < 0.5) {
                    totalRow.innerHTML = `<td colspan="10"><strong>Total:<font color=red>${totalObtainedMarks.toFixed(2)}</font> / ${totalMaxMarks.toFixed(2)}</strong></td>`
                };
            }

            marksData.push({
                CourseCode: courseCode,
                CourseType: courseType,
                Components: components,
                TotalMaxMarks: parseFloat(totalMaxMarks.toFixed(2)),
                TotalObtainedMarks: parseFloat(totalObtainedMarks.toFixed(2))
            });
        }
    }
    return marksData;
}

//Fallback function to display total marks
async function inlineMarksTotal() {
    try{
    
        await waitForElement(document, 'div > div.cntdDiv > div > table:nth-child(1)');

        //const marksData = [];
        //#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(4)
        //const table = document.querySelector('div.cntdDiv > div > table:nth-child(7)');
        const table = document.querySelector('div > div.cntdDiv > div > table:nth-child(7)');
        //const table = document.querySelector('#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(7)');
        const courseTable = document.querySelector('div.cntdDiv > div > table:nth-child(4)');
        if (!table) {
            console.warn("inlineMarksTotal: Marks table not found.");
            //return marksData;
        }

        const rows = table.querySelectorAll(' tr:not(:first-child)');
        const courseRows = courseTable.querySelectorAll('tbody tr:not(:first-child)');
        const courseTableHeader = courseTable.querySelector('tbody tr:first-child');
        let courseCodeIndexHeader;
        if (courseTableHeader) {
        // Select all the cells (td or th) within that first row as an Array
        const cells = Array.from(courseTableHeader.querySelectorAll('td'));

        // Iterate through the cells to find the one containing 'Course Code'
        cells.forEach((cell, index) => {
            // Use trim() to handle leading/trailing whitespace and check inclusion
            if (cell.textContent.trim().includes('Course Code')) {
                courseCodeIndexHeader = index; // Store the 0-based index
            }
        });
        if (courseCodeIndexHeader === undefined) {
            courseCodeIndexHeader = 0; // Default to the first column
        }
    }

        const courseMap = {};
        courseRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const cellText = cells[courseCodeIndexHeader].textContent.trim();
            const courseCodeRaw = cells[courseCodeIndexHeader].textContent.trim();//.indexOf('\n');
            const courseCodeTrail = cells[courseCodeIndexHeader].querySelector('font').textContent.trim();
            const courseCodeMatch = courseCodeRaw.replace(courseCodeTrail,'');
            const courseCode = /*courseCodeRaw;*/courseCodeMatch ;
            //const courseCodeMatch = cellText.match(/^([A-Z0-9]+)/);
            //const courseCode = courseCodeMatch ? courseCodeMatch[1] : cellText;
            let courseTitle = cells[courseCodeIndexHeader+1].textContent.trim();
            courseTitle = courseTitle.slice(0, 47) + (courseTitle.length > 47 ? '...' : ''); // Truncate if too long
            courseMap[courseCode] = { courseTitle: courseTitle };
            //console.log("inlineMarksTotal: Mapped course code to title:", courseCode, courseTitle);
        });

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3) {
                const courseCode = cells[0].textContent.trim();
                const courseTitle = courseMap[courseCode]?.courseTitle;
                cells[0].textContent = courseCode in courseMap ? `${courseCode} -${courseTitle}` : courseCode;
                const courseType = cells[1].textContent.trim();
                const componentMarksCell = cells[2];
                const components = [];
                let totalMaxMarks = 0;
                let totalObtainedMarks = 0;
                const innerMarksTableRows = componentMarksCell.querySelectorAll('table tbody tr');

                componentMarksCell.querySelector('table').style.cssText = `width:100%`;
                const totalRow = document.createElement('tr');
                totalRow.style.backgroundColor = '#E6E6FA';
                const totalPerSub = componentMarksCell.querySelector('table > tbody')
                totalPerSub.appendChild(totalRow);
                
                if (innerMarksTableRows.length > 0) {
                    const componentCells = innerMarksTableRows[0].querySelectorAll('td');
                    componentCells.forEach(compCell => {
                        const strongTag = compCell.querySelector('strong');
                        const fontTag = compCell.querySelector('font > br');

                        if (strongTag && fontTag) {
                            const compInfo = strongTag.textContent.trim();
                            const obtainedVal = fontTag.nextSibling ? fontTag.nextSibling.textContent.trim() : ''; // Safely access nextSibling
                            const infoMatch = compInfo.match(/(.+)\/([\d.]+)/);

                            if (infoMatch) {
                                //const componentName = infoMatch[1];
                                const maxM = parseFloat(infoMatch[2]);
                                const obtainedM = parseFloat(obtainedVal);

                                /*components.push({
                                    ComponentName: componentName,
                                    MaxMarks: maxM,
                                    ObtainedMarks: obtainedM
                                });*/

                                totalMaxMarks += maxM;
                                totalObtainedMarks += obtainedM;
                            }
                        }
                    });
                    totalRow.innerHTML = `<td colspan="10"><strong>Total:<font color=green>${totalObtainedMarks.toFixed(2)}</font> /${totalMaxMarks.toFixed(2)}</strong></td>`
                    if(totalObtainedMarks/totalMaxMarks < 0.5) {
                        totalRow.innerHTML = `<td colspan="10"><strong>Total:<font color=red>${totalObtainedMarks.toFixed(2)}</font> / ${totalMaxMarks.toFixed(2)}</strong></td>`
                    };
                }

                /*marksData.push({
                    CourseCode: courseCode,
                    CourseType: courseType,
                    Components: components,
                    TotalMaxMarks: parseFloat(totalMaxMarks.toFixed(2)),
                    TotalObtainedMarks: parseFloat(totalObtainedMarks.toFixed(2))
                });*/
            }
        }
    } catch (error) {
        console.error("inlineMarksTotal: Error processing attendance/marks page:", error);
        displayInfoMessage("An error occurred while enhancing attendance/marks.", 5000, 'error');
    }
    //return marksData;
}


//Function to show total marks of students in Student Academic Status page
async function marksTotalReport() {
    try{
    
        await waitForElement(document, 'div > div.cntdDiv > div > table:nth-child(1)');

        //const marksData = [];
        //#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(4)
        //const table = document.querySelector('div.cntdDiv > div > table:nth-child(7)');
        const table = document.querySelector('div > div.cntdDiv > div > table:nth-child(5)');
        //const table = document.querySelector('#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(7)');
        const courseTable = document.querySelector('div.cntdDiv > div > table:nth-child(3)');
        if (!table) {
            console.warn("inlineMarksTotal: Marks table not found.");
            //return marksData;
        }

        const rows = table.querySelectorAll(' tr:not(:first-child)');
        const courseRows = courseTable.querySelectorAll('tbody tr:nth-child(n + 3)');
        const courseTableHeader = courseTable.querySelector('tbody tr:nth-child(2)');
        let courseCodeIndexHeader;
        if (courseTableHeader) {
        // Select all the cells (td or th) within that first row as an Array
        const cells = Array.from(courseTableHeader.querySelectorAll('td'));

        // Iterate through the cells to find the one containing 'Course Code'
        cells.forEach((cell, index) => {
            // Use trim() to handle leading/trailing whitespace and check inclusion
            if (cell.textContent.trim().includes('Course Code')) {
                courseCodeIndexHeader = index; // Store the 0-based index
                //console.log("marksTotalReport: Found 'Course Code' header at index:", courseCodeIndexHeader);
            }
        });
        if (courseCodeIndexHeader === undefined) {
            courseCodeIndexHeader = 0; // Default to the first column
            console.log("marksTotalReport: 'Course Code' header not found, defaulting to index 0.");
        }
    }

        const courseMap = {};
        courseRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const cellText = cells[courseCodeIndexHeader].textContent.trim();
            const courseCodeRaw = cells[courseCodeIndexHeader].textContent.trim();//.indexOf('\n');
            //console.log("marksTotalReport: Processing course code raw:", courseCodeRaw);
            const courseCodeTrail = cells[courseCodeIndexHeader].querySelector('font').textContent.trim();
            const courseCodeMatch = courseCodeRaw.replace(courseCodeTrail,'');
            const courseCode = /*courseCodeRaw;*/courseCodeMatch ;
            //console.log("marksTotalReport: Processed course code:", courseCode);
            //const courseCodeMatch = cellText.match(/^([A-Z0-9]+)/);
            //const courseCode = courseCodeMatch ? courseCodeMatch[1] : cellText;
            let courseTitle = cells[courseCodeIndexHeader+1].textContent.trim();
            courseTitle = courseTitle.slice(0, 47) + (courseTitle.length > 47 ? '...' : ''); // Truncate if too long
            courseMap[courseCode] = { courseTitle: courseTitle };
            //console.log("inlineMarksTotal: Mapped course code to title:", courseCode, courseTitle);
        });

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3) {
                const courseCode = cells[0].textContent.trim();
                //console.log("marksTotalReport: Processing course code in marks table:", courseCode);
                const courseTitle = courseMap[courseCode]?.courseTitle;
                cells[0].textContent = courseCode in courseMap ? `${courseCode} -${courseTitle}` : courseCode;
                const courseType = cells[1].textContent.trim();
                const componentMarksCell = cells[2];
                //console.log("Com:",componentMarksCell);
                const components = [];
                let totalMaxMarks = 0;
                let totalObtainedMarks = 0;
                const innerMarksTableRows = componentMarksCell.querySelectorAll('table tbody tr');

                componentMarksCell.querySelector('table').style.cssText = `width:100%`;
                const totalRow = document.createElement('tr');
                totalRow.style.backgroundColor = '#E6E6FA';
                const totalPerSub = componentMarksCell.querySelector('table > tbody')
                totalPerSub.appendChild(totalRow);
                
                if (innerMarksTableRows.length > 0) {
                    const componentCells = innerMarksTableRows[0].querySelectorAll('td');
                    componentCells.forEach(compCell => {
                        const strongTag = compCell.querySelector('strong');
                        const fontTag = compCell.querySelector('font ');

                        if (strongTag && fontTag) {
                            const compInfo = strongTag.textContent;
                            const obtainedVal = strongTag.lastChild ? strongTag.lastChild.textContent.trim() : '0'; // Safely access nextSibling
                            //console.log("Obtained Val:",obtainedVal);
                            //console.log("compInfo:",compInfo);
                            const infoMatch = compInfo.match(/(.+)\/([\d.]+)/);/*/(.+)\/([\d.]+)/*/
                            const compMarks = infoMatch[2];
                            //console.log("comp Marks:",compMarks);
                            const marksMatch = compMarks.match(/\d+\.\d{2}/);///\d+\.\d+/
                            //console.log("com InfoMatch:\n", marksMatch);

                            if (infoMatch) {
                                //const componentName = infoMatch[1];
                                const maxM = parseFloat(marksMatch[0]);
                                const obtainedM = parseFloat(obtainedVal);

                                /*components.push({
                                    ComponentName: componentName,
                                    MaxMarks: maxM,
                                    ObtainedMarks: obtainedM
                                });*/

                                totalMaxMarks += maxM;
                                totalObtainedMarks += obtainedM;
                            }
                        }
                    });
                    totalRow.innerHTML = `<td colspan="10"><strong>Total:<font color=green>${totalObtainedMarks.toFixed(2)}</font> /${totalMaxMarks.toFixed(2)}</strong></td>`
                    if(totalObtainedMarks/totalMaxMarks < 0.5) {
                        totalRow.innerHTML = `<td colspan="10"><strong>Total:<font color=red>${totalObtainedMarks.toFixed(2)}</font> / ${totalMaxMarks.toFixed(2)}</strong></td>`
                    };
                }

                /*marksData.push({
                    CourseCode: courseCode,
                    CourseType: courseType,
                    Components: components,
                    TotalMaxMarks: parseFloat(totalMaxMarks.toFixed(2)),
                    TotalObtainedMarks: parseFloat(totalObtainedMarks.toFixed(2))
                });*/
            }
        }
    } catch (error) {
        console.error("marksTotalReport: Error processing attendance/marks page:", error);
        displayInfoMessage("An error occurred while enhancing attendance/marks.", 5000, 'error');
    }
    //return marksData;
}


//Main Handlers

/**
 * Handles the logic specific to the WELCOME page.
 * Modifies the UI and fetches/displays data.
 */
async function handleWelcomePage() {
    //console.log("handleWelcomePage: Starting process for WELCOME page.");

    const maxRetries = 20;
    let retryCount = 0;
    const loadingAnimetion = document.getElementById('preloader');
    const processWelcomeContent = async () => {
        const welcomeContainer = document.getElementById('zc-viewcontainer_WELCOME');
        if (!welcomeContainer) {
            console.warn(`processWelcomeContent: Welcome container not found yet. Retry ${retryCount + 1}/${maxRetries}.`);
            retryCount++;
            return false;
        }

        //console.log("processWelcomeContent: Welcome container found. Proceeding with UI modification.");
        if (window.myMutationObserver) {
            window.myMutationObserver.disconnect();
            window.myMutationObserver = null;
            //console.log("processWelcomeContent: Disconnected MutationObserver.");
        }

        let dayOrderInfo = '';
        const dayOrderSpan = document.querySelectorAll('span.highlight strong font[color="yellow"]')[1];
        if (dayOrderSpan) {
            dayOrderInfo = dayOrderSpan.textContent.trim();
            dayOrderInfo = dayOrderInfo.replace(/Day Order:/, '');
            console.log("handleWelcomePage: Extracted Day Order:", dayOrderInfo);
        } else {
            console.warn("handleWelcomePage: Day Order element not found.");
        }

        const titleElement = welcomeContainer.querySelector('span');
        if (titleElement) {
            titleElement.textContent = "Unfugly: Loading...";
        }

        // Clear existing content and set up new structure
        loadingAnimetion.style.display = 'block';
        welcomeContainer.innerHTML = '';
        welcomeContainer.style.cssText = `
            display: flex;
            width: 100%;
            height: calc(100vh - 48px); /* Adjust height to fit page better */
            gap: 10px;
            padding: 10px;
            box-sizing: border-box;
            background-color: #121212; /* Ensure dark background */
        `;

        const appWrapper = document.createElement('div');
        appWrapper.id = 'unfuglyAppWrapper';
        appWrapper.style.cssText = `
            display: flex;
            width: 100%;
            height: 100%;
            gap: 10px;
            padding: 0; /* Already handled by parent */
            box-sizing: border-box;
        `;
        welcomeContainer.appendChild(appWrapper);

        /*<div id="preloader" class="loading-animation" style="display: none;">
            <div class="line">
                <span class="break dot1"></span> 
                <span class="break dot2"></span> 
                <span class="break dot3"></span>
                <span class=""></span> 
                <span class=""></span>
            </div>
        </div>*/
        const currentNetId = getNetId(); // Get Net ID from the main page
        if (!currentNetId) {
            displayInfoMessage("Could not determine Net ID. Data might not be personalized.", 5000, 'error');
            console.warn("handleWelcomePage: Could not determine current Net ID. Using fallback 'anonymous_user'.");
            // If Net ID can't be found, we can't do user-specific caching
            backgroundFetchAllData('anonymous_user', titleElement, [], appWrapper, dayOrderInfo); // Fetch fresh data
            //console.log("dayorderInfo passed to backgorundfetchalldata:", dayOrderInfo);
            return true; // Indicate that processing has started
        }
        console.log("handleWelcomePage: Determined current Net ID:", currentNetId);

        let cachedData = null;
        let previousAttendanceData = [];

        try {
            const storageKey = `unfuglyData_${currentNetId}`;
            cachedData = await chrome.storage.local.get(storageKey);
            cachedData = cachedData[storageKey] || {};

            if (cachedData.attendanceData) {
                previousAttendanceData = JSON.parse(JSON.stringify(cachedData.attendanceData)); // Deep copy
            }

            if (cachedData.profileData && cachedData.replacedTimetableHTML && cachedData.attendanceData && cachedData.marksData) {
                //console.log("handleWelcomePage: Complete cached data found. Displaying immediately.");
                renderProfilePanel(cachedData.profileData, appWrapper, dayOrderInfo);
                renderAccordionPanels(cachedData, previousAttendanceData, appWrapper);
                if (titleElement) {
                    titleElement.textContent = "Unfugly: Data loaded from cache!";
                }
                // Then, start background refresh for old users
                backgroundFetchAllData(currentNetId, titleElement, previousAttendanceData, appWrapper, dayOrderInfo);
                //loadingAnimetion.style.display = 'none';
            } else {
                console.log("handleWelcomePage: No complete cached data found or new user. Initiating background fetch.");
                if (titleElement) {
                    titleElement.textContent = "Unfugly: Fetching new data...";
                }
                backgroundFetchAllData(currentNetId, titleElement, [], appWrapper, dayOrderInfo); // No previous data for new user/incomplete cache
                //console.log("dayorderInfo passed to backgorundfetchalldata:", dayOrderInfo);
                loaded = document.getElementsByClassName('unfugly-panel profile-panel');

            }
        } catch (error) {
            console.error("handleWelcomePage: Error accessing cached data or rendering UI:", error);
            if (titleElement) {
                titleElement.textContent = "Unfugly: Error loading cache. Fetching new data...";
            }
            backgroundFetchAllData(currentNetId, titleElement, [], appWrapper);
            //loadingAnimetion.style.display = 'none';
        }

        return true;
    };

    const checkAndProcess = async () => {
        if (await processWelcomeContent()) {
            return;
        } else if (retryCount >= maxRetries) {
            console.error("handleWelcomePage: Max retries reached for Welcome page container. Aborting.");
            displayInfoMessage("Failed to load Welcome page content. Please refresh.", 5000, 'error');
            return;
        }
        setTimeout(checkAndProcess, 500);
    };
    checkAndProcess();
}

/**
 * Handles the logic specific to the My_Time_Table_2023_24 page.
 * Applies direct enhancements to the timetable.
 */
async function handleTimetablePage() {
    console.log("handleTimetablePage: Starting process for My_Time_Table_2023_24 page.");
    window.timetableRetryCount = 0; // Reset retry counter for this page
    tryToProcessTimetablePage();
}

async function tryToProcessTimetablePage() {
    console.log(`tryToProcessTimetablePage: Attempt ${window.timetableRetryCount + 1}/${MAX_TIMETABLE_RETRIES}`);

    const timetableContainer = document.getElementById('zc-viewcontainer_My_Time_Table_2023_24');
    if (!timetableContainer) {
        console.warn("tryToProcessTimetablePage: Timetable container not found. Retrying...");
        if (window.timetableRetryCount < MAX_TIMETABLE_RETRIES) {
            window.timetableRetryCount++;
            setTimeout(tryToProcessTimetablePage, TIMETABLE_RETRY_DELAY);
        } else {
            console.error("tryToProcessTimetablePage: Max retries reached for timetable container. Aborting.");
            displayInfoMessage("Failed to load timetable page. Please refresh.", 5000, 'error');
        }
        return;
    }

    try {
        await waitForElement(document, 'table.course_tbl'); // Wait for the specific course table
        const { courses, registrationNo, batch } = extractCourseDataFromDocument(document);

        // Save extracted data for persistence (though background fetch is now primary)
        if (registrationNo && courses) {
            const netId = getNetId() || registrationNo; // Use Net ID if available, else Reg No
            const dataToSave = {
                registrationNo,
                batch,
                courses
            };
            chrome.storage.local.set({ [`unfuglyCourseData_${netId}`]: dataToSave }, () => {
                if (chrome.runtime.lastError) {
                    console.error("handleTimetablePage: Error saving timetable data:", chrome.runtime.lastError);
                } else {
                    console.log(`handleTimetablePage: Course data for ${netId} saved to local storage.`);
                }
            });
        }

        const timetableTable = document.querySelector('table[align="center"][border="5"]');
        if (timetableTable) {
            // Apply enhancements directly to this page
            replaceSlotsWithCourseTitles(courses, timetableTable);
            addDownloadTimetableButton(timetableTable);
            displayInfoMessage("Timetable enhanced successfully!", 3000, 'success');
        } else {
            console.error("handleTimetablePage: Timetable table not found after data extraction.");
            displayInfoMessage("Error: Timetable table not found on page.", 5000, 'error');
        }

    } catch (error) {
        console.error("handleTimetablePage: Error processing timetable page:", error);
        displayInfoMessage("An error occurred while enhancing the timetable.", 5000, 'error');
    }
}

/**
 * Handles the logic specific to the My_Attendance page.
 * Adds margin column and total marks sub-row directly to the page.
 */
async function handleAttendancePage() {
    console.log("handleAttendancePage: Starting process for My_Attendance page.");
    try {
        await waitForElement(document, '#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(4)');

        // This will modify the live DOM to add margin column
        const attendanceData = extractAttendanceDataFromDocument(document);

        if (attendanceData && attendanceData.length > 0) {
            displayInfoMessage("Attendance data enhanced!", 3000, 'success');
        } else {
            displayInfoMessage("No attendance data to enhance.", 3000, 'info');
        }

        // Also process marks table if it exists on the page
        const marksTable = document.querySelector('#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(7)');
        if (marksTable) {
            // This will modify the live DOM to add total marks sub-rows
            const marksData = extractMarksDataFromDocument(document);
            if (marksData && marksData.length > 0) {
                displayInfoMessage("Marks data enhanced!", 3000, 'success');
            } else {
                displayInfoMessage("No marks data to enhance.", 3000, 'info');
            }
        } else {
            console.log("handleAttendancePage: Marks table not found on page, skipping marks enhancement.");
        }

    } catch (error) {
        console.error("handleAttendancePage: Error processing attendance/marks page:", error);
        displayInfoMessage("An error occurred while enhancing attendance/marks.", 5000, 'error');
    }
}


//Feedback functions

async function fillSelect2Dropdown(sub, fieldIdentifier, targetValue) {
    const field = sub.querySelector(`.select2-container.${fieldIdentifier} > a`);
    if (field) {
        //field.scrollIntoView({ block: 'center', behavior: 'instant' });
        field.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        // Wait for the dropdown animation to finish
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                        await delay(300);

        const resultField = field.querySelector('span.select2-chosen');              
        const select2Id = resultField.getAttribute('id').replace('select2-chosen-', '');

        const select2Result = document.getElementById(`select2-results-${select2Id}`);

        const options = select2Result.querySelectorAll('li.select2-results-dept-0');

        for( const opt of options) {
            if(opt.textContent.trim() === targetValue) {
                // Click it
                            opt.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, view: window }));
                            // Fallback click
                            opt.click();
                            break;
            }
        }
        return;
    }

    /*const searchInput = field.querySelector(`input[name*='${fieldIdentifier}']`);
    console.log("Search Input:", searchInput);
                    
                    if (searchInput) {
                        // Type the value
                        searchInput.value = targetValue;
                        console.log("Search Input after value set:", searchInput.value);
                        searchInput.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, view: window }));
                    }

    console.log("Field:", field);*/

    /*// 1. Scroll into view (helps with lazy loading)
            button.scrollIntoView({ block: 'center', behavior: 'instant' });

            // 2. Open Dropdown
            // We use mousedown as established previously
            button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    */
}

async function fillSubject(targetValue) {
    const subs = document.querySelectorAll('div.subformRow.clearfix > div.mono-column.column-block > div.formColumn.first-column');
    //zc-Enter_Your_Feedback_Here_Theory subform-custom-width
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (const sub of subs) {
        fillSelect2Dropdown(sub, 'zc-Enter_Your_Feedback_Here_Theory-Punctuality', targetValue);
        fillSelect2Dropdown(sub, 'zc-Enter_Your_Feedback_Here_Theory-Sincerity', targetValue);
        fillSelect2Dropdown(sub, 'zc-Enter_Your_Feedback_Here_Theory-Subject_Knowledge', targetValue);
        fillSelect2Dropdown(sub, 'zc-Enter_Your_Feedback_Here_Theory-Lecture_Preparation', targetValue);
        fillSelect2Dropdown(sub, 'zc-Enter_Your_Feedback_Here_Theory-Communication_Presentation_Skills', targetValue);

        await delay(5300);

        fillSelect2Dropdown(sub, 'zc-Enter_Your_Feedback_Here_Theory-Coverage_of_Syllabus_as_per_Schedule', targetValue);
        fillSelect2Dropdown(sub, 'zc-Enter_Your_Feedback_Here_Theory-Controlling_of_the_Classes', targetValue);
        fillSelect2Dropdown(sub, 'zc-Enter_Your_Feedback_Here_Theory-Standard_of_Test_Questions', targetValue);


        fillSelect2Dropdown(sub, 'zc-Enter_Your_Feedback_Here_Practical-Punctuality', targetValue);
        fillSelect2Dropdown(sub, 'zc-Enter_Your_Feedback_Here_Practical-Sincerity', targetValue);
        fillSelect2Dropdown(sub, 'zc-Enter_Your_Feedback_Here_Practical-Knowledge_on_Laboratory_Course', targetValue);
        /*zc-Enter_Your_Feedback_Here_Theory-Punctuality-group
        zc-Enter_Your_Feedback_Here_Theory-Sincerity-group

        
        */
        //console.log(subs);

    }

    
}



/**Handles the feedback page
 * to be added in next version
 */
async function handleFeedbackPage() {
    // console.log("handleFeedbackPage: Starting process for Feedback page.");

    // Helper: A simple delay function to let UI animations finish
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper: The logic to handle the specific Select2 dropdowns
    async function fillFeedback() {
        // 1. Define the unique parts of the names for the dropdowns you want to fill
        const feedbackFields = [
            "Communication_Presentation_Skills",
            "Standard_of_Test_Questions",
            "Punctuality",
            "Sincerity"
            // Add other unique identifier strings here as you find them
        ];

        // 2. The value you want to select (e.g., "5", "Excellent", "Good")
        // Adjust this string to match exactly what appears in the dropdown options.
        const targetValue = "Excellent"; 

        for (const field of feedbackFields) {
            try {
                // A. Find the "Opener" (the box you click to open the dropdown)
                // We look for a container that matches the field name but is NOT the hidden dropdown itself
                // Select2 containers usually have 'select2-container' class.
                // We try to find one that likely corresponds to our field.
                // (This selector looks for the row/group containing the field name, then finds the select2 container inside it)
                const container = document.querySelector(`div[class*='${field}'] .select2-container`) || 
                                  document.querySelector(`.select2-container[id*='${field}']`) ||
                                  // Fallback: search for the generic container if the specific class is on the parent
                                  document.evaluate(`//div[contains(@class, '${field}')]//div[contains(@class, 'select2-container')]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

                if (container) { 
                    // Click to open    
                    const choice = container.querySelector('.select2-choice') || container;
                    choice.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                    
                    // Wait for the dropdown animation to finish
                    await delay(300); 

                    // B. Find the specific input box using the pattern we analyzed
                    // We look for the input inside the now-visible dropdown
                    const searchInput = document.querySelector(`input[name*='${field}']`);
                    
                    if (searchInput) {
                        // Type the value
                        searchInput.value = targetValue;
                        searchInput.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, view: window }));
                        //searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        // Wait a tiny bit for the filter to run
                        await delay(100);

                        // Press Enter to select the top result
                        //searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                        
                        console.log(`Filled ${field} with ${targetValue}`);
                    }
                } else {
                    console.warn(`Could not find opener for field: ${field}`);
                }
                
                // Small pause between fields to look natural and prevent freezing
                await delay(200);

            } catch (err) {
                console.error(`Error filling ${field}:`, err);
            }
        }
    }

    try {
        await waitForElement(document, 'div.row > form > div.formContainer > div > div.mono-column.column-block > div.formColumn.first-column > div.form-group.clearfix.zc-Registration_Number-group');
        const targetValue = "Excellent"; // The value to autofill (temprorary hardcoded)
        const notice = document.createElement('div');
        notice.style.cssText = `
            background-color: palegreen;
            color: #000;
            padding: 10px;
            border-radius: 5px;
            width: 400px;
            margin-bottom: 15px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        // Create the text span
        const textSpan = document.createElement('span');
        textSpan.textContent = "Unfugly Feedback Fast-Track is in development. Stay tuned for updates!";
        //textSpan.textContent = "Unfugly Feedback Fast-Track (Dev Mode)";
        notice.appendChild(textSpan);

        /*
        // Create the button
        const btn = document.createElement('button');
        btn.textContent = "Autofill (beta)";
        btn.style.cssText = `
            background-color: #28a745;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-weight: normal;
        `;
        
        // Attach the click event to our new function
        btn.onclick = (e) => {
            e.preventDefault(); // Prevent form submission if inside a form tag
            btn.textContent = "Filling...";
            fillSubject(targetValue).then(() => {
                btn.textContent = "Done!";
            });
        };
        notice.appendChild(btn);
        */

        const formContainer = document.querySelector('div.row > form > div.formContainer > div > div.mono-column.column-block > div.formColumn.first-column > div.form-group.clearfix.zc-plain1-group.zc-addnote-fld');
        if (formContainer) {
            formContainer.prepend(notice);
        } else {
            console.error("handleFeedbackPage: Form container not found.");
        }
    } catch (error) {
        console.error("handleFeedbackPage: Error processing Feedback page:", error);
        displayInfoMessage("An error occurred while enhancing Feedback page.", 5000, 'error');
    }
}
/**
 * Shares a link to the extension itself using the Web Share API.
 */
/*function shareExtensionLink() {
  if (navigator.share) {
    // This is a placeholder link. Replace with your extension's actual store URL.
    const extensionUrl = 'https://chromewebstore.google.com/detail/lfjlfkbcnoioefacgcjanjdiodphnoce?utm_source=item-share-cb'; 

    navigator.share({
        title: 'Check out this awesome extension!',
        text: 'I\'m using this extension to enhance my Academia experience. You should try it!',
        url: extensionUrl
      })
      .then(() => console.log('Successful share'))
      .catch((error) => console.log('Error sharing:', error));
  } else {
    // Fallback for browsers that don't support the Web Share API
    displayInfoMessage("Your browser does not support the Web Share API.", 5000, 'error');
  }
}*/

//Rendering Functions for Welcome Page

function renderProfilePanel(profileData, container, dayOrder) {
    const dayOrderSpan = document.querySelector('#unfuglyAppWrapper > div.unfugly-panel.profile-panel > p:nth-child(7)');
    let dayOnUpdate = '';
    if (dayOrderSpan) {
        dayOnUpdate = dayOrderSpan.textContent.replace(/Day Order:/, '').trim(); // Extract day order from the span
        console.log("renderProfilePanel: dayOrderSpan:", dayOnUpdate);
    }

        const dayOrderToday = dayOrder; //|| dayOnUpdate; // Default to 'N/A' if not provided\
    console.log("renderProfilePanel: dayOrderToday:", dayOrderToday);
    // Check if a profile panel already exists to avoid duplication during refreshes
    let profilePanel = container.querySelector('.profile-panel');
    if (!profilePanel) {
        profilePanel = document.createElement('div');
        profilePanel.className = 'unfugly-panel profile-panel';
        profilePanel.style.cssText = `
            flex: 1;
            max-width: 200px;
            background-color: #333;
            color: #fff;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        `;
        container.appendChild(profilePanel);
    }

    profilePanel.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #fff;">Profile</h3>
        <p><strong>Name:</strong> ${profileData.name || 'N/A'}</p>
        <p><strong>Reg No:</strong> ${profileData.registrationNo || 'N/A'}</p>
        <p><strong>Program:</strong> ${profileData.programmeBranch || 'N/A'}</p>
        <p><strong>Section:</strong> ${profileData.section || 'N/A'}</p>
        <p><strong>Semester:</strong> ${profileData.semester || 'N/A'}</p>
        <p><strong>Day Order:</strong> ${dayOrderToday || 'N/A'}</p>
        <p><strong>Department:</strong> ${profileData.schoolDepartment || 'N/A'}</p>`;

    // Add a share button
    /*const shareButton = document.createElement('button');
    shareButton.id = 'share-button';
    shareButton.innerHTML = `<img src="${chrome.runtime.getURL('images/share.png')}" alt="Share" />`;
    shareButton.title = 'Share this extension';

    shareButton.onclick = () => {
        shareExtensionLink();
    };

    profilePanel.appendChild(shareButton);*/
}
//${dayOrderToday || 'N/A'}
/**
 * Renders accordion panels for timetable, attendance, and marks on the welcome page.
 * @param {object} cachedData The data to display.
 * @param {Array} previousAttendanceData Previous attendance data for change highlighting.
 * @param {HTMLElement} container The container to append the panels to.
 */
function renderAccordionPanels(cachedData, previousAttendanceData, container) {
    // Check if accordion wrapper exists
    let accordionWrapper = container.querySelector('.unfugly-accordion-wrapper');
    if (!accordionWrapper) {
        accordionWrapper = document.createElement('div');
        accordionWrapper.className = 'unfugly-accordion-wrapper';
        accordionWrapper.style.cssText = `
            flex: 3;
            background-color: #2c2c2c;
            border-radius: 8px;
            overflow-y: auto;
            padding: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        `;
        container.appendChild(accordionWrapper);
    }
    accordionWrapper.innerHTML = ''; // Clear existing content to refresh

    // Timetable Panel
    const timetablePanel = document.createElement('div');
    timetablePanel.className = 'unfugly-panel';
    timetablePanel.innerHTML = `
        <h3 style="color: #fff;">Timetable</h3>
        <div id="timetable-content-container"></div>
    `;
    accordionWrapper.appendChild(timetablePanel);

    // Inject timetable HTML
    const timetableContentContainer = timetablePanel.querySelector('#timetable-content-container');
    if (cachedData.replacedTimetableHTML) {
        timetableContentContainer.innerHTML = cachedData.replacedTimetableHTML;
        addDownloadTimetableButton(timetableContentContainer.querySelector('table')); // Add button to the rendered table
        highlightCurrentDayOrder(timetableContentContainer);
    } else {
        timetableContentContainer.innerHTML = '<p style="color: #fff;">Timetable data not available.</p>';
    }

        initializeEdits();

    // Attendance Panel
    const attendancePanel = document.createElement('div');
    attendancePanel.className = 'unfugly-panel';
    attendancePanel.innerHTML = `
        <h3 style="color: #fff;">Attendance</h3>
        <div id="attendance-content-container"></div>
    `;
    accordionWrapper.appendChild(attendancePanel);

    // Inject attendance data
    formatAttendanceTable(cachedData.attendanceData, previousAttendanceData, attendancePanel.querySelector('#attendance-content-container'));

    // Marks Panel
    const marksPanel = document.createElement('div');
    marksPanel.className = 'unfugly-panel';
    marksPanel.innerHTML = `
        <h3 style="color: #fff;">Marks</h3>
        <div id="marks-content-container"></div>
    `;
    accordionWrapper.appendChild(marksPanel);

    // Inject marks data
    formatMarksTable(cachedData.marksData, marksPanel.querySelector('#marks-content-container'), previousAttendanceData);
    const loadingAnimetion = document.getElementById('preloader');
    loadingAnimetion.style.display = 'none'; // Hide loading animation after rendering
}

/**
 * Formats and displays the attendance data in a table.
 * @param {Array} attendanceData The attendance data array.
 * @param {Array} previousData Optional previous attendance data for highlighting changes.
 * @param {HTMLElement} container The container to render the table into.
 */
function formatAttendanceTable(attendanceData, previousData = [], container) {
    if (!attendanceData || attendanceData.length === 0) {
        container.innerHTML = '<p style="color: #ccc; text-align: center;">No attendance data found.</p>';
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
        padding: 0.5rem;
    `;

    attendanceData.forEach(item => {
        let statusText = '';
        let statusColor = '';
        let bgColor = '';

        // Check for special yellow case
        if (item.classesToSkip === 0 && item.classesToAttend === 0) {
            statusColor = '#FBC02D'; // yellow
            bgColor = 'rgba(251,192,45,0.15)';
            statusText = `Can skip: ${item.classesToSkip}`;
        } else if (item.percentage >= 75) {
            statusColor = '#81C784'; // green
            bgColor = 'rgba(76,175,80,0.15)';
            statusText = `Can skip: ${item.classesToSkip}`;
        } else {
            statusColor = '#E57373'; // red
            bgColor = 'rgba(244,67,54,0.15)';
            statusText = `Require: ${item.classesToAttend}`;
        }

        const card = document.createElement('div');
        card.style.cssText = `
            background: #1e1e1e;
            padding: 1rem;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;
        card.onmouseenter = () => {
            card.style.transform = 'translateY(-4px)';
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        };
        card.onmouseleave = () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
        };

        // Trend indicator
        let trendIcon = '';
        const previousItem = previousData.find(prev => prev.courseCode === item.courseCode);
        if (previousItem) {
            const change = item.percentage - previousItem.percentage;
            if (change > 0) trendIcon = `🔼 <span style="color:#8BC34A;">+${change.toFixed(2)}%</span>`;
            else if (change < 0) trendIcon = `🔽 <span style="color:#F44336;">${change.toFixed(2)}%</span>`;
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-size:0.9em; color:#aaa;">${item.courseCode}</div>
                    <div style="font-size:1.1em; font-weight:bold; color:#fff;">${item.courseTitle}</div>
                </div>
                <div style="
                    padding: 0.4rem 0.8rem;
                    background: ${bgColor};
                    color: ${statusColor};
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 0.95em;
                ">
                    ${item.percentage.toFixed(2)}%
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; color:#ccc; font-size:0.9em;">
                <div>Hours Conducted: <b style="color:#fff;">${item.hoursConducted}</b></div>
                <div>Hours Absent: <b style="color:#fff;">${item.absentHours}</b></div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="color:${statusColor}; font-weight:bold;">
                    ${statusText}
                </div>
                <div style="font-size:0.85em; color:#bbb;">${trendIcon}</div>
            </div>
        `;

        wrapper.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(wrapper);
}


/**
 * Formats and displays the marks data in a table.
 * @param {Array} marksData The marks data array.
 * @param {HTMLElement} container The container to render the table into.
 */
function formatMarksTable(marksData, container, attendanceData) {
    if (!marksData || marksData.length === 0) {
        container.innerHTML = '<p style="color: #ccc; text-align: center;">No marks data found.</p>';
        return;
    }

    // Helper for colors based on %
    const getColor = (pct) => {
        if (pct < 50) return '#E57373'; // muted red
        if (pct < 85) return '#FBC02D'; // muted yellow
        return '#81C784'; // muted green
    };

    container.innerHTML = ''; // Clear old content
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '1rem';

    marksData.forEach(item => {
        const percentage = (item.TotalObtainedMarks / item.TotalMaxMarks) * 100;

        // Find matching course in attendanceData to get course title
        let courseTitle = '';
        if (attendanceData && attendanceData.length > 0) {
            const match = attendanceData.find(a => a.courseCode === item.CourseCode);
            if (match && match.courseTitle) {
                courseTitle = match.courseTitle;
            }
        }

        const card = document.createElement('div');
        card.style.cssText = `
            background: #1e1e1e;
            border-radius: 12px;
            padding: 16px;
            color: #fff;
            display: flex;
            flex-direction: column;
            gap: 12px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.4);
        `;

        card.onmouseenter = () => card.style.background = 'rgba(255,255,255,0.05)';
        card.onmouseleave = () => card.style.background = '#1e1e1e';

        // Top Section: Course Info
        const courseInfo = document.createElement('div');
        courseInfo.style.display = 'flex';
        courseInfo.style.justifyContent = 'space-between';
        courseInfo.style.alignItems = 'center';
        courseInfo.innerHTML = `
            <div>
                <h2 style="margin: 0; font-size: 1.1em; font-weight: 600;">
                    ${item.CourseCode}${courseTitle ? ` - ${courseTitle}` : ''}
                </h2>
                <p style="margin: 2px 0; opacity: 0.8; font-size: 0.9em;">${item.CourseType}</p>
            </div>
            <div style="text-align: right; font-size: 1em; font-weight: bold; color: ${getColor(percentage)};">
                ${item.TotalObtainedMarks} / ${item.TotalMaxMarks}
            </div>
        `;

        // Progress Bar for total marks
        const progressWrapper = document.createElement('div');
        progressWrapper.style.cssText = `
            width: 100%;
            height: 8px;
            background: #333;
            border-radius: 4px;
            overflow: hidden;
        `;
        const progressFill = document.createElement('div');
        progressFill.style.cssText = `
            height: 100%;
            width: ${percentage}%;
            background: ${getColor(percentage)};
            transition: width 0.4s ease-in-out;
        `;
        progressWrapper.appendChild(progressFill);

        // Component Chips
        const componentsWrapper = document.createElement('div');
        componentsWrapper.style.display = 'flex';
        componentsWrapper.style.flexWrap = 'wrap';
        componentsWrapper.style.gap = '8px';

        if (item.Components && item.Components.length > 0) {
            item.Components.forEach(comp => {
                const compPct = (comp.ObtainedMarks / comp.MaxMarks) * 100;
                const chip = document.createElement('span');
                chip.style.cssText = `
                    background: ${getColor(compPct)};
                    color: #000;
                    padding: 6px 10px;
                    border-radius: 16px;
                    font-size: 0.85em;
                    font-weight: 500;
                `;
                chip.innerHTML = `${comp.ComponentName}: ${comp.ObtainedMarks}/${comp.MaxMarks}`;
                componentsWrapper.appendChild(chip);
            });
        }

        card.appendChild(courseInfo);
        card.appendChild(progressWrapper);
        if (componentsWrapper.childNodes.length > 0) {
            card.appendChild(componentsWrapper);
        }

        container.appendChild(card);
    });
}




//Timetable UI Functions

/**
 * Replaces slots with course titles and classrooms in a given timetable table.
 * @param {object} courseData Object mapping slots to course information.
 * @param {HTMLElement} timetableTable The HTML table element to modify.
 */
function replaceSlotsWithCourseTitles(courseData, timetableTable) {
    if (!timetableTable) {
        console.warn("replaceSlotsWithCourseTitles: Timetable table not provided.");
        return;
    }
    timetableTable.align = '';
    timetableTable.border = '5px';
    timetableTable.style.border = '10px';
    timetableTable.style.maxWidth = '100%'; // Ensure full width for better visibility
    timetableTable.cellPadding = '10'; // Add some padding for better readability
    //timetableTable.style.scale = '0.85'; // Scale down the table for better fit

    // Apply background color if not already applied (for the welcome page rendered table)
    if (timetableTable.style.backgroundColor === '') {
        timetableTable.style.backgroundColor = 'rgba(0, 0, 0, 1)';
    }


    const allTableRows = timetableTable.querySelectorAll('tbody tr');

    if (allTableRows[0]) {
        const row = allTableRows[0];
        const cells = row.querySelectorAll('td, th');
        cells[0].textContent = 'Time'; // Ensure first cell is labeled "Time"
        for (let colIndex = 0; colIndex < cells.length; colIndex++) {
            const cell = cells[colIndex];
            //cell.style.backgroundColor = '#444'; // Header row background
            //cell.style.color = '#fff'; // Header text color
            cell.style.width = '120px'; // Set a fixed width for header cells
            //cell.style.minWidth = "100px" // Ensure minimum width for better fit
            cell.style.fontSize = '10px';
            cell.style.maxHeight = '40px'; // Make header text bold
            cell.rowSpan = '1'; // Ensure header cells are not merged
        }
    }

    // Remove the 3rd row (index 2) if it exists
    if (allTableRows.length > 2) {
        //const rowToRemove = allTableRows[2];
        if (allTableRows[2].cells.length > 0 && allTableRows[2].cells[0].textContent.includes('Hour/Day Order')) { // More robust check
            allTableRows[2].remove();//.deleteRow(2);//rowToRemove.remove();
            //console.log("replaceSlotsWithCourseTitles: Removed 3rd row.");
        }
        allTableRows[1].remove(); // Remove the second row (index 1) as well
        //console.log("replaceSlotsWithCourseTitles: Removed 2nd row.");
    }

    // Remove last two columns
    allTableRows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        //cells[0].style.backgroundColor = '#444'; // Ensure first column has a consistent background color
        //cells[0].style.color = '#fff'; // Ensure first column text is visible
        if (cells.length >= 2) { // Ensure there are at least two columns to potentially remove
            const secondToLast = cells[cells.length - 2];
            const last = cells[cells.length - 1];
            if (secondToLast) secondToLast.style.display = 'none';
            if (last) last.style.display = 'none';
        }
    });

    // Replace slots with course titles
    let slotId = 1;

    for (let rowIndex = 1; rowIndex < allTableRows.length; rowIndex++) { // Iterate all rows after initial removals
        const row = allTableRows[rowIndex];
        if (!row) continue;

        const firstCell = row.querySelector('td, th');
        if (firstCell.textContent.trim() === 'TO') {
            firstCell.remove(); // Remove the "TO" cell if it exists
        }
        if (firstCell) {
            //firstCell.style.backgroundColor = '#444';// Ensure first cell has a consistent background color
            //firstCell.style.backgroundColor = '#444'; // Header row background
            //firstCell.style.color = '#fff'; // Header text color
            firstCell.style.width = '120px'; // Set a fixed width for header cells
            //firstCell.style.minWidth = "100px" // Ensure minimum width for better fit
            firstCell.style.fontSize = '10px';
        }

        const cells = row.querySelectorAll('td, th');
        for (let colIndex = 1; colIndex < cells.length; colIndex++) {


            const cell = cells[colIndex];
            cell.style.width = '120px'; // Reset width to auto for better fit
            cell.style.minWidth = '90px'; // Ensure minimum width for better fit

            if (!cell) continue;

            // Skip header cells and time label cells
            if (cell.tagName === 'TH' || colIndex === 0) continue; // Assuming first column is time label

            cell.classList.remove('replaced-slot', 'empty-slot-mask', 'empty-slot');
            cell.style.color = '';
            cell.style.fontWeight = '';
            cell.style.position = '';
            cell.id = `slot-${slotId++}`; // Assign unique ID

            let cellText = cell.textContent.trim();
            // Clean cell text to get the slot (e.g., "A / B" -> "A")
            let cleanCellText = cellText.split('/')[0].trim().toUpperCase(); // Ensure uppercase for consistent lookup

            if (courseData[cleanCellText]) {
                const courseInfo = courseData[cleanCellText];
                cell.classList.add('replaced-slot');
                cell.title = `Slot: ${cellText}`;
                cell.innerHTML = ''; // Clear original content
                const titleSpan = document.createElement('span');
                titleSpan.textContent = courseInfo.title;
                titleSpan.style.fontWeight = '600';
                titleSpan.style.color = '#334';
                titleSpan.style.display = 'block';
                titleSpan.style.fontSize = '11px'; // Adjust font size for better fit
                titleSpan.classList.add('editedSlot-originalTitle');

                const classroomSpan = document.createElement('span');
                classroomSpan.textContent = courseInfo.classroom ? `Room: ${courseInfo.classroom}` : '';
                classroomSpan.style.fontWeight = 'semi-bold'; // Changed to normal for distinction
                classroomSpan.style.color = '#555';
                classroomSpan.style.fontSize = '9px';
                classroomSpan.style.display = 'block';
                classroomSpan.classList.add('editedSlot-originalClassroom');

                cell.appendChild(titleSpan);
                if (courseInfo.classroom) cell.appendChild(classroomSpan);
                //cell.style.backgroundColor = '#F9E79F'; // Light background for filled slots
            } else if (cleanCellText !== '') { // If it's not empty but also not a recognized slot
                // Keep original text but make it less prominent or grey out
                cell.style.color = '#aaa';
                //cell.style.backgroundColor = '#f0f0f0'; // Slightly different background for unknown slots
                cell.style.backgroundColor = '#585b5bff';
                cell.style.fontSize = '11px';
                cell.title = `Slot: ${cellText}`;
                
                const unknownSpan = document.createElement('span');
                unknownSpan.textContent = cellText;
                unknownSpan.style.fontWeight = '400';
                unknownSpan.style.color = 'rgb(170,170,170)';
                unknownSpan.style.display = 'block';
                unknownSpan.classList.add('editedSlot-originalTitle');

                cell.innerHTML = ''; // Clear original content
                cell.appendChild(unknownSpan);

            } else { // Empty slot
                cell.classList.add('empty-slot-mask');
                cell.classList.add('empty-slot');
                cell.style.backgroundColor = '#f8f8f8'; // Very light background for truly empty slots
            }
        }
    }
    //console.log("replaceSlotsWithCourseTitles: Timetable updated with course titles and classrooms.");
}

/**
 * Adds a download timetable button next to the timetable table.
 * @param {HTMLElement} timetableTable The HTML table element the button pertains to.
 */
function addDownloadTimetableButton(timetableTable) {
    if (!timetableTable) {
        console.warn("addDownloadTimetableButton: Timetable table not provided.");
        return;
    }
    const captionElement = timetableTable.querySelector('caption.t1');
    if (!captionElement) {
        console.warn("addDownloadTimetableButton: Caption element with class 't1' not found.");
        return;
    }

    // Apply flexbox to the caption to align its content and the new button
    //captionElement.style.cssText = `display: t and-bhat  on; margin-top: 5px; justify-content: space-between; align-items: center;`;
    captionElement.style.display = 'table-caption'; // Ensure it behaves like a caption
    captionElement.style.backgroundColor = '#2c2c2c';
    captionElement.style.color = '#fff'; // Ensure text is visible
    captionElement.textContent = "Your Timetable by Unfugly";
    captionElement.style.marginTop = '5px';
    // Find an existing button to prevent duplicates
    let downloadButton = captionElement ? captionElement.querySelector('#downloadTimetableButton') : null;

    if (!downloadButton) {
        if (!captionElement) {
            console.warn("addDownloadTimetableButton: Caption element with class 't1' not found. Appending button to parent.");
            // Fallback: create a div and append to table's parent
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: flex-end;
                padding: 5px;
                width: 100%;
            `;
            timetableTable.parentNode.insertBefore(buttonContainer, timetableTable);
            captionElement = buttonContainer; // Use this as the target for button
        } else {
            //captionElement.style.display = 'flex';
            captionElement.style.justifyContent = 'space-between';
            captionElement.style.alignItems = 'center';
        }

        downloadButton = document.createElement('button');
        downloadButton.id = 'downloadTimetableButton';
        const downloadImage = document.createElement('img');
        const extensionId = chrome.runtime.id; // Get extension ID dynamically
        downloadImage.src = `chrome-extension://${extensionId}/images/dwnld.png`; // Path to your download icon
        downloadImage.alt = 'Download Timetable';
        downloadImage.style.width = '24px';
        downloadImage.style.height = '24px';
        downloadImage.style.verticalAlign = 'middle';
        downloadButton.innerHTML = '';
        downloadButton.appendChild(downloadImage);
        downloadButton.style.cssText = `
            background-color: transparent;
            border: none;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
            
            justify-content: center;
            align-items: center;
            width: 30px;
            height: 30px;
        `;
        downloadButton.onmouseover = () => downloadButton.style.opacity = '0.8';
        downloadButton.onmouseout = () => downloadButton.style.opacity = '1';

        const qrImage = document.createElement('img');
        qrImage.src = `chrome-extension://${extensionId}/images/shareqr.png`; // Path
        //qrImage.style.width = '35px';
        //qrImage.style.height = '35px';
        //qrImage.style.verticalAlign = 'middle';
        //qrImage.style.align =  'right';
        qrImage.style.cssText = `
            background-color: transparent;
            border: none;
            align: right;
            padding: 0;
            margin-left: 10px;
            vertical-align: middle;
            justify-content: center;
            align-items: center;
            width: 30px;
            height: 30px;
        `;

        captionElement.appendChild(downloadButton);
        //captionElement.appendChild(qrImage); // Append QR code image to caption
    }

    // Re-attach event listener to ensure it works on dynamically added tables
    downloadButton.onclick = null; // Remove old listener first
    downloadButton.addEventListener('click', async () => {
        displayInfoMessage("Generating Timetable PNG...", 3000);

        const currentNetId = getNetId(); // Get the current Net ID
        let profileData = { section: 'unknown', semester: 'unknown' }; // Default values

        if (currentNetId) {
            try {
                // Retrieve profile data from local storage
                const storageKey = `unfuglyData_${currentNetId}`;
                cachedData = await chrome.storage.local.get(storageKey);
                cachedData = cachedData[storageKey] || {};
                if (cachedData && cachedData.profileData) {
                    profileData = cachedData.profileData;
                }
            } catch (error) {
                console.error("Error retrieving profile data for download name:", error);
            }
        }

        // Construct the filename using the retrieved profileData
        const fileName = `${profileData.section || 'unknown'}_${profileData.semester || 'unknown'}_timetable.png`;

        // Ensure html2canvas is available (e.g., loaded via manifest)
        if (typeof html2canvas === 'function') {
            html2canvas(timetableTable, { scale: 2, useCORS: true }).then(canvas => {
                const image = canvas.toDataURL("image/png");
                const link = document.createElement('a');
                link.href = image;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                displayInfoMessage("Timetable PNG downloaded!", 3000, 'success');
            }).catch(error => {
                console.error("Error generating timetable PNG:", error);
                displayInfoMessage("Error generating timetable PNG. Check the console.", 5000, 'error');
            });
        } else {
            console.error("html2canvas is not defined. Ensure the library is loaded.");
            displayInfoMessage("Error: Screenshot functionality not available (html2canvas missing).", 5000, 'error');
        }
    });
}


//Background Fetcher

/**
 * Fetches all necessary data in the background and updates the UI.
 * @param {string} currentNetId The user's Net ID for caching.
 * @param {HTMLElement} titleElement The title element to update messages.
 * @param {Array} previousAttendanceData Cached attendance data for change comparison.
 * @param {HTMLElement} appWrapper The main app wrapper on the welcome page.
 */
async function backgroundFetchAllData(currentNetId, titleElement, previousAttendanceData, appWrapper, dayOrder) {
    if (window.isFetchingInBackground) {
        console.log("backgroundFetchAllData: A fetch is already in progress. Aborting new request.");
        return;
    }
    window.isFetchingInBackground = true;
    displayInfoMessage("Fetching latest data from SRM portal...", 5000);

    const fetchedData = {
        profileData: null,
        editedSlots: null,
        replacedTimetableHTML: null,
        attendanceData: null,
        marksData: null,
    };

    try {
        //Fetch Course Registration data to get profile and batch
        console.log("backgroundFetchAllData: Fetching Course Registration data...");
        const registrationPageUrl = "https://academia.srmist.edu.in/#My_Time_Table_Attendance";
        const { iframeDoc: regIframeDoc, iframe: regIframe } = await createHiddenIframe(
            registrationPageUrl,
            ['div.cntdDiv table:not(.course_tbl)', 'table.course_tbl']
        );
        const { courses: courseSlotMap, batch, registrationNo } = extractCourseDataFromDocument(regIframeDoc);
        fetchedData.profileData = extractProfileDataFromDocument(regIframeDoc);
        // Prioritize registration number from here, if profile data is richer
        if (registrationNo && !fetchedData.profileData.registrationNo) {
            fetchedData.profileData.registrationNo = registrationNo;
        }

        regIframe.remove();
        console.log("backgroundFetchAllData: Course Registration data fetched.");

        //Fetch Unified Timetable HTML based on batch
        //console.log(batch, "batch");
        //let batch = 2;
        //console.log("Batch changed, explicitly set to 2 for testing purposes.", batch);
        if (batch && UNIFIED_TIMETABLE_URLS[batch]) {
            console.log(`backgroundFetchAllData: Fetching Unified Timetable for Batch ${batch}...`);
            const unifiedTimetableUrl = UNIFIED_TIMETABLE_URLS[batch];
            const { iframeDoc: unifiedTtIframeDoc, iframe: unifiedTtIframe } = await createHiddenIframe(
                unifiedTimetableUrl,
                ['table[align="center"][border="5"][cellpadding="18"][cellspacing="2"][width="400"]']
            );

            // Get the raw HTML of the unified timetable table
            const rawUnifiedTimetableHTML = extractUnifiedTimetableHTML(unifiedTtIframeDoc);
            //console.log("Raw Unified Timetable HTML fetched:", rawUnifiedTimetableHTML);

            if (rawUnifiedTimetableHTML) {
                // Create a temporary div to apply slot replacement without modifying the iframe's DOM
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = rawUnifiedTimetableHTML;
                const tempTable = tempDiv.querySelector('table[align="center"][border="5"][cellpadding="18"][cellspacing="2"][width="400"]');

                if (tempTable && courseSlotMap) {
                    replaceSlotsWithCourseTitles(courseSlotMap, tempTable);
                    fetchedData.replacedTimetableHTML = tempTable.outerHTML;
                }
            }
            unifiedTtIframe.remove();
            console.log("backgroundFetchAllData: Unified Timetable data fetched and processed.");
        } else {
            console.warn("backgroundFetchAllData: Batch not determined or unsupported for unified timetable. Skipping unified timetable fetch.");
            // If unified TT not found, try to use course registration page timetable
            const regPageTtTable = regIframeDoc.querySelector('table[align="center"][border="5"]');
            if (regPageTtTable && courseSlotMap) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = regPageTtTable.outerHTML;
                const tempTable = tempDiv.querySelector('table');
                replaceSlotsWithCourseTitles(courseSlotMap, tempTable);
                fetchedData.replacedTimetableHTML = tempTable.outerHTML;
                console.log("backgroundFetchAllData: Used Course Registration page timetable as fallback.");
            } else {
                console.warn("backgroundFetchAllData: Fallback timetable also not found.");
            }
        }

        // Step 3: Fetch attendance and marks data
        /*console.log("backgroundFetchAllData: Fetching Attendance and Marks data...");
        const attendanceUrl = "https://academia.srmist.edu.in/#Page:My_Attendance";
        const { iframeDoc: attendanceIframeDoc, iframe: attendanceIframe } = await createHiddenIframe(
            attendanceUrl,
            ['#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(4)']
        );

        // Note: These functions are called with the iframe's document, so they won't modify the main page.
        fetchedData.attendanceData = extractAttendanceDataFromDocument(attendanceIframeDoc);
        fetchedData.marksData = extractMarksDataFromDocument(attendanceIframeDoc);
        attendanceIframe.remove();
        console.log("backgroundFetchAllData: Attendance and marks data fetched and processed.");*/

        // Store the combined data
        const storageKey = `unfuglyData_${currentNetId}`;
        const existingData = await chrome.storage.local.get(storageKey);
        //console.log(existingData[storageKey].editedSlots, "edited slots before preserving");
        const dataToCache = {
            profileData: fetchedData.profileData,
            replacedTimetableHTML: fetchedData.replacedTimetableHTML,
            editedSlots: existingData?.[storageKey]?.editedSlots ?? {},
            attendanceData: fetchedData.attendanceData,
            marksData: fetchedData.marksData,
            lastUpdated: new Date().toISOString()
        };
        console.log(dataToCache.editedSlots, "edited slots preserved");
        chrome.storage.local.set({ [storageKey]: dataToCache }, () => {
            if (chrome.runtime.lastError) console.error("Error saving all data to cache:", chrome.runtime.lastError);
            else console.log("backgroundFetchAllData: All data saved to cache.");
        });

        // Update the UI with new data
        if (titleElement) {
            titleElement.textContent = "Unfugly: Data updated!";
        }
        // Re-render panels with the newly fetched data
        renderProfilePanel(fetchedData.profileData, appWrapper, dayOrder); // Pass dayOrder for profile panel
        renderAccordionPanels(fetchedData, previousAttendanceData, appWrapper); // Pass previous data for diff
        displayInfoMessage("All new data fetched and displayed!", 3000, 'success');

    } catch (error) {
        console.error("backgroundFetchAllData: An error occurred during data fetching:", error);
        if (titleElement) {
            titleElement.textContent = "Unfugly: Error fetching data!";
        }
        displayInfoMessage("An error occurred while fetching new data. Please refresh.", 5000, 'error');
    } finally {
        window.isFetchingInBackground = false;
    }
}

// Modify the existing function to dull out other days

/**
 * Dulls out rows for days other than the current Day Order using the 'empty-slot-mask' class.
 * @param {HTMLElement} container The container element holding the timetable table.
 */
function highlightCurrentDayOrder(container) {
    let currentDayOrder = -1;

    // Fetch the Day Order from the profile panel element
    const dayOrderElement = document.querySelector('#unfuglyAppWrapper > div.profile-panel > p:nth-child(7)');
    if (dayOrderElement) {
        const textContent = dayOrderElement.textContent.trim();
        const match = textContent.match(/Day Order:\s*(\d+)/);
        if (match && match[1]) {
            currentDayOrder = parseInt(match[1], 10);
        }
    }

    const timetableTable = container.querySelector('table');
    if (!timetableTable) {
        console.warn("highlightCurrentDayOrder: Timetable table not found in the container.");
        return;
    }

    const tbodyRows = timetableTable.querySelectorAll('tbody tr');

    // Day Order N corresponds to tbodyRows[N + 1] after the header and removed rows.
    // The Day Order rows are typically from index 2 to 6 in the modified tbodyRows NodeList.

    // Iterate through all the day order rows (indices 2 to 6)
    for (let i = 1; i <= 5 && i < tbodyRows.length; i++) {
        const row = tbodyRows[i];
        if (!row) continue;
        // Check if this row's index matches the current day's row index
        const isCurrentDay = (currentDayOrder !== -1 && i === currentDayOrder);

        if (isCurrentDay) {
            // Remove the mask class from the current day's row
            row.classList.remove('dull-out');
            row.style.opacity = '1'; // Ensure full visibility
        } else {
            // Add the mask class to all other day's rows
            row.classList.add('dull-out');
            //row.style.opacity = '0.5'; // A subtle way to dull the row
        }
    }

    if (currentDayOrder === -1 || isNaN(currentDayOrder)) {
        console.warn("highlightCurrentDayOrder: Could not determine current Day Order. No rows will be highlighted.");
    } else {
        console.log(`highlightCurrentDayOrder: Dulling out rows other than Day Order ${currentDayOrder}.`);
    }
}

//Page Router

/**
 * Determines the current page based on the URL hash and calls the appropriate handler.
 */
function handleCurrentPage() {
    const hash = window.location.hash;
    console.log(`handleCurrentPage: Current hash is: ${hash}`);
    if(!window.location.href.includes('creatorapp.zoho.com/srm_university/')){
        const tittle = document.querySelector('#tab_WELCOME > div > span');
        if (tittle) {
            tittle.textContent = "Unfuglied";
        }

        // --- Icon Logic ---
        const iconElement = document.getElementById('t2727643000098596129');

        if (iconElement) {
            // STEP 1: Kill the "Ghost" CSS
            // The original icon lives in the ::before of the class "holidays-gift-exchange".
            // By removing the class, we destroy the ::before pseudo-element entirely.
            iconElement.removeAttribute('class'); 
            
            // STEP 2: Clean the container
            iconElement.innerHTML = '';
            iconElement.textContent = '';

            // STEP 3: Create your new image (Replaces the CSS background-image logic)
            const newImage = document.createElement('img');
            
            // Use the proper Chrome API to get the URL (replaces __MSG_@@extension_id__)
            newImage.src = chrome.runtime.getURL('images/icon128.png');

            // STEP 4: Apply the styles you wanted (Translated from CSS to JS)
            // "width: 0px; height: 0px" in your CSS was likely to hide the old icon.
            // Since we removed the class, we can now set the REAL size we want.
            newImage.style.width = '24px'; 
            newImage.style.height = '24px';
            newImage.style.display = 'inline-block'; // Matches your "display: inline-block"
            newImage.style.verticalAlign = 'middle'; // Ensures alignment with text
            newImage.style.border = 'none';          // "background-color: transparent" equivalent
            newImage.style.marginRight = '8px';

            // STEP 5: Inject
            tittle.prepend(newImage);
            //tittle.parentNode.insertBefore(iconElement, tittle);
        }   
    }

    if (hash.includes('#WELCOME')) {
        handleWelcomePage();
    } else if (hash.includes('#My_Time_Table_Attendance')) { //'#Page:My_Time_Table_2023_24'
        //handleTimetablePage();
    } else if (hash.includes('#Page:My_Attendance')) {
        try {
            // Attempt to run the main function
            handleAttendancePage();
        } catch (error) {
            // If it crashes, log the error and run the fallback
            //console.warn("handleAttendancePage crashed. Running inlineMarksTotal instead.", error);
            inlineMarksTotal();
        }
    } else if (hash.includes('#Page:Academic_Status')) {
        marksTotalReport();
    } else if (hash.includes('#Course_Feedback')) {
        handleFeedbackPage();
    }
    
}

//Event Listeners

// Listen for hash changes (SPA navigation)
window.addEventListener('hashchange', handleCurrentPage);

// Initial call when the content script is injected
// Use DOMContentLoaded to ensure the basic page structure is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Initializing handleCurrentPage.");
    handleCurrentPage();
});

// A MutationObserver to detect major DOM changes that might indicate a page load
// in a single-page application (SPA) where the hash might not change but content does.
// This is a fallback.
window.myMutationObserver = new MutationObserver((mutationsList, observer) => {
    for (let mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if any of the main view containers have been added
            const addedContainers = Array.from(mutation.addedNodes).some(node =>
                node.id && (
                    node.id.startsWith('zc-viewcontainer_WELCOME') ||
                    node.id.startsWith('zc-viewcontainer_My_Time_Table') ||
                    node.id.startsWith('zc-viewcontainer_My_Attendance')
                )
            );
            if (addedContainers) {
                console.log("MutationObserver: Detected new view container. Re-running handleCurrentPage.");
                handleCurrentPage();
                // Disconnect to avoid re-triggering, will be re-connected by specific handlers if needed
                observer.disconnect();
                window.myMutationObserver = null;
                break;
            }
        }
    }
});

// Start observing the body for childList changes
if (document.body) {
    window.myMutationObserver.observe(document.body, { childList: true, subtree: true });
} else {
    // Fallback if document.body is not ready yet
    window.addEventListener('load', () => {
        if (document.body) {
            window.myMutationObserver.observe(document.body, { childList: true, subtree: true });
        }
    });
}

checkVersion();
handleCurrentPage(); // Initial call to set up the page correctly
