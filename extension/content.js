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

//Gloabl flag for extra lab slots
window.extraSlotFlag = false;

const MAX_TIMETABLE_RETRIES = 20; // Max attempts

function backgroundFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { action: "fetch_backend", url, options },
            (response) => {
                if (chrome.runtime.lastError) {
                    return reject(new Error(chrome.runtime.lastError.message));
                }
                if (!response || !response.success) {
                    return reject(new Error(response?.error || "Fetch failed"));
                }
                const { status, ok, text } = response.data;
                resolve({
                    status,
                    ok,
                    text,
                    json: () => Promise.resolve(JSON.parse(text))
                });
            }
        );
    });
}

const TIMETABLE_RETRY_DELAY = 1000; // 1 second delay between attempts



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
function waitForElement(doc, selector, timeoutMs = 10000, reloadOnTimeout = false) {
    return new Promise((resolve, reject) => {
        let observer = null;
        let pollInterval = null;

        const timeout = setTimeout(() => {
            if (observer) observer.disconnect();
            if (pollInterval) clearInterval(pollInterval);
            console.error(`waitForElement: Timeout waiting for element with selector: ${selector}.`);
            if (reloadOnTimeout) {
                console.log(`Auto-restarting in 3 seconds...`);
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            }
            reject(new Error(`waitForElement: Timeout waiting for element with selector: ${selector}`));
        }, timeoutMs);

        const checkElement = () => {
            // Check if doc and doc.querySelector are available (relevant for iframes)
            if (!doc || !doc.querySelector) return false;

            const element = doc.querySelector(selector);
            if (element) {
                clearTimeout(timeout);
                if (observer) observer.disconnect();
                if (pollInterval) clearInterval(pollInterval);
                resolve(element);
                return true;
            }
            return false;
        };

        if (checkElement()) return;

        if (typeof MutationObserver !== 'undefined' && doc.body) {
            observer = new MutationObserver(() => {
                checkElement();
            });
            observer.observe(doc.body, { childList: true, subtree: true });
        } else {
            // Fallback to polling
            pollInterval = setInterval(() => {
                checkElement();
            }, 200);
        }
    });
}


/**
 * Robustly sets the src of an image element and prevents it from being overwritten.
 * Fetches the target URL from storage based on the current Net ID.
 * @param {HTMLImageElement} imgElement The image element to secure.
 */
function secureImageSrc(imgElement) {
    if (!imgElement) return;
    
    imgElement.style.border = '3px solid #1E88E5';
    imgElement.title = "Unfugly: Profile Photo";    

    const netId = getNetId();
    if (!netId) {
        console.warn("[Unfugly] secureImageSrc: Could not determine Net ID.");
        return;
    }

    const storageKey = `unfuglyData_${netId}`;
    chrome.storage.local.get(storageKey, (data) => {
        if (data && data[storageKey] && data[storageKey].profileData && data[storageKey].profileData.profilePhotoUrl) {
            const targetUrl = data[storageKey].profileData.profilePhotoUrl;

            // Initial set
            imgElement.src = targetUrl;

            // MutationObserver to detect and revert changes to the 'src' attribute
            const observer = new MutationObserver((mutations) => {
                for (let mutation of mutations) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                        if (imgElement.src !== targetUrl) {
                            //console.log(`[Unfugly] Reverting image reset attempt from ${imgElement.src} back to ${targetUrl}`);
                            // Disconnect to avoid recursion
                            observer.disconnect();
                            imgElement.src = targetUrl;
                            // Re-observe
                            observer.observe(imgElement, { attributes: true, attributeFilter: ['src'] });
                        }
                    }
                }
            });

            observer.observe(imgElement, { attributes: true, attributeFilter: ['src'] });

            // Optional: Store observer reference to prevent garbage collection or allow manual cleanup
            imgElement._unfuglyObserver = observer;
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
async function createHiddenIframe(url, selectorsToWaitFor = ['body']) {
    return new Promise((resolve, reject) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';

        const timeoutId = setTimeout(() => {
            console.error("createHiddenIframe: Timeout loading iframe for URL:", url);
            iframe.onload = null;
            iframe.onerror = null;
            iframe.remove();
            reject(new Error("Iframe load timeout"));
        }, 15000); // 15 seconds timeout

        iframe.onload = async () => {
            clearTimeout(timeoutId);
            try {
                const iframeDoc = iframe.contentWindow.document;
                // console.log("createHiddenIframe: iframe loaded. Waiting for dynamic content inside...", url);

                for (const selector of selectorsToWaitFor) {
                    await waitForElement(iframeDoc, selector);
                }

                resolve({ iframeDoc, iframe });
            } catch (error) {
                console.error("createHiddenIframe: Error waiting for iframe content for URL:", url, error);
                reject(error);
            }
        };

        iframe.onerror = (e) => {
            clearTimeout(timeoutId);
            console.error("createHiddenIframe: Iframe failed to load.", e);
            reject(new Error("Iframe failed to load."));
        };

        iframe.src = url;
        document.body.appendChild(iframe);
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
async function checkVersion() {
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
 * Parses an HTML table element into a JSON representation holding structure and style data.
 */
function parseTableToJSON(table) {
    const data = { headers: [], days: [], extraSlotFlag: window.extraSlotFlag};
    if (!table) return data;

    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return data;

    const firstRowCells = rows[0].querySelectorAll('th, td');
    firstRowCells[0].textContent = 'Time';
    firstRowCells.forEach(cell => data.headers.push(cell.textContent.trim()));

    for (let i = 1; i < rows.length; i++) {
        const tr = rows[i];
        const cells = tr.querySelectorAll('td, th');
        if (cells.length === 0) continue;

        const dayName = cells[0].textContent.trim();
        if (dayName === 'Time' || dayName.includes('Hour/Day Order') || dayName === 'TO') {
            continue;
        }

        const dayObj = { 
            dayName: dayName, 
            slots: [] 
        };
        
        for (let j = 1; j < cells.length; j++) {
            const cell = cells[j];
            const titleEl = cell.querySelector('.editedSlot-originalTitle');
            const classroomEl = cell.querySelector('.editedSlot-originalClassroom');
            let slotTitle = '';
            let slotClassroom = '';

            if (titleEl) {
                slotTitle = titleEl.textContent.trim();
            } else {
                slotTitle = cell.textContent.trim();
            }

            if (classroomEl) {
                slotClassroom = classroomEl.textContent.trim();
            }

            dayObj.slots.push({
                title: slotTitle,
                classroom: slotClassroom,
                bgColor: cell.getAttribute('bgcolor') || cell.style.backgroundColor || ''
            });
        }
        data.days.push(dayObj);
    }
    return data;
}

/**
 * Renders timetable HTML securely and responsively from JSON data.
 */
function renderTableFromJSON(jsonData) {
    if (!jsonData || !jsonData.headers || !jsonData.days) return '';
    
    const table = document.createElement('table');
    
    // FIX 1: Removed 'table-layout: fixed' to prevent the strict overflow clipping.
    // Kept the dark background, borders, and max-width.
    table.style.cssText = 'width: 100%; max-width: 1200px; margin: 0 auto; border-collapse: separate; border-spacing: 2px; background-color: #000000; font-size: 0.9em;';

    const caption = document.createElement('caption');
    caption.className = 't1';
    caption.textContent = "Your Personalized Timetable by Unfugly";
    caption.style.cssText = 'display: table-caption; margin-top: 5px; background-color: #2c2c2c; color: #ffffff; padding: 5px; font-weight: normal;';
    table.appendChild(caption);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    jsonData.headers.forEach((headerText, index) => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.style.padding = '8px 5px'; 
        th.style.backgroundColor = '#F1948A';
        th.style.fontWeight = 'normal';
        th.style.fontSize = "10px";
        
        if (index === 0) {
            // Force the first column to hug the text tightly
            th.style.width = '1%';
            th.style.whiteSpace = 'nowrap';
        } else {
            // FIX 2: Force all other 12 columns to take exactly the same width (100% / 12 slots ≈ 8.25%)
            // This guarantees the uniform rectangular look without locking the table rigidly.
            th.style.width = '8.25%';
            th.style.whiteSpace = 'normal';
        }
        
        headerRow.appendChild(th);
    });

    if(!jsonData.extraSlotFlag){
        const thCells = headerRow.querySelectorAll('th');
        thCells[thCells.length-2].style.display = "none";
        thCells[thCells.length-1].style.display = "none";
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let slotId = 1;
    jsonData.days.forEach(day => {
        const tr = document.createElement('tr');
        const thDay = document.createElement('td'); 
        thDay.innerHTML = `${day.dayName}`;
        thDay.style.padding = '8px 5px';
        
        // Keep the first column rows tight
        thDay.style.width = '1%';
        thDay.style.whiteSpace = 'nowrap';
        thDay.style.backgroundColor = '#F8C471'; 
        thDay.style.fontSize = '10px';
        tr.appendChild(thDay);

        day.slots.forEach(slot => {
            const td = document.createElement('td');
            if (slot.bgColor) td.style.backgroundColor = slot.bgColor;
            if (slot.title) td.title = `Slot: ${slot.title}`;
            td.id = `slot-${slotId++}`;
            
            td.style.padding = '8px 5px'; 
            td.style.overflowWrap = 'anywhere';
            td.style.wordBreak = 'normal';
            td.style.whiteSpace = 'normal';

            const titleSpan = document.createElement('span');
            titleSpan.textContent = slot.title;
            titleSpan.style.display = 'block';

            if (slot.title && slot.title !== '') {
                if (slot.classroom && slot.classroom !== '') {
                    td.classList.add('replaced-slot');
                    titleSpan.style.fontWeight = '600';
                    titleSpan.style.color = '#334';
                    titleSpan.style.fontSize = '11px';
                    titleSpan.classList.add('editedSlot-originalTitle');

                    const classroomSpan = document.createElement('span');
                    classroomSpan.textContent = slot.classroom;
                    classroomSpan.style.fontWeight = 'semi-bold';
                    classroomSpan.style.color = '#555';
                    classroomSpan.style.fontSize = '9px';
                    classroomSpan.style.display = 'block';
                    classroomSpan.classList.add('editedSlot-originalClassroom');

                    td.appendChild(titleSpan);
                    td.appendChild(classroomSpan);
                } else {
                    const isDarkGrey = slot.bgColor.includes('88') || slot.bgColor.includes('58') || slot.bgColor.toLowerCase().includes('585b5b');
                    if (isDarkGrey) {
                        titleSpan.style.fontWeight = '400';
                        titleSpan.style.color = 'rgb(170,170,170)';
                        titleSpan.classList.add('editedSlot-originalTitle');
                        td.appendChild(titleSpan);
                    } else {
                        td.classList.add('replaced-slot');
                        titleSpan.style.fontWeight = '600';
                        titleSpan.style.color = '#334';
                        titleSpan.style.fontSize = '11px';
                        titleSpan.classList.add('editedSlot-originalTitle');
                        td.appendChild(titleSpan);
                    }
                }
            } else {
                td.classList.add('empty-slot-mask', 'empty-slot');
            }

            tr.appendChild(td);
        });

        if(!jsonData.extraSlotFlag){
            const cells = tr.querySelectorAll('td');
            if (cells.length >= 2) {
                cells[cells.length-2].style.display = "none";
                cells[cells.length-1].style.display = "none";
            }
        }

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    return table.outerHTML;
}





//Fallback function to display total marks
/**
 * Wraps faculty name cells in the live table with hyperlinks.
 * @param {HTMLElement} tableEl The table element to process.
 * @param {number} facultyColIndex The column index (0-based) of the faculty name cell.
 */
function injectFacultyLinksInTable(tableEl, facultyColIndex) {
    if (!tableEl) return;
    const rows = tableEl.querySelectorAll('tbody tr');
    rows.forEach(row => {
        // Skip header rows (rows that contain <th> elements)
        if (row.querySelector('th')) return;
        const cells = row.querySelectorAll('td');
        if (cells.length > facultyColIndex) {
            const cell = cells[facultyColIndex];
            const facultyName = cell.textContent.trim();
            // Skip if it's a header label, empty, or already linked
            if (!facultyName || cell.querySelector('a')) return;
            if (facultyName.toLowerCase().includes('faculty')) return; // skip header cells
            const url = convertFacultyNameToUrl(facultyName);
            if (url) {
                cell.innerHTML = `<a href="${url}" target="_blank" style="color:#64b5f6;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${facultyName}</a>`;
            }
        }
    });
}

async function inlineMarksTotal() {
    try {

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
            const courseCodeMatch = courseCodeRaw.replace(courseCodeTrail, '');
            const courseCode = /*courseCodeRaw;*/courseCodeMatch;
            //const courseCodeMatch = cellText.match(/^([A-Z0-9]+)/);
            //const courseCode = courseCodeMatch ? courseCodeMatch[1] : cellText;
            let courseTitle = cells[courseCodeIndexHeader + 1].textContent.trim();
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
                    if (totalObtainedMarks / totalMaxMarks < 0.5) {
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
        // Inject faculty hyperlinks into attendance table rows using cached courseData
        try {
            const netId = (await chrome.storage.local.get('unfuglyCurrentNetId'))?.unfuglyCurrentNetId
                || document.querySelector('[data-netid]')?.dataset?.netid
                || '';
            // Try to find any cached unfuglyData_* key by scanning for the attendance data
            const allStorage = await chrome.storage.local.get(null);
            let cachedCourseData = null;
            for (const [key, val] of Object.entries(allStorage)) {
                if (key.startsWith('unfuglyData_') && key !== 'unfuglyData_calendar' && val?.courseData) {
                    cachedCourseData = val.courseData;
                    break;
                }
            }
            if (cachedCourseData) {
                // Build courseCode → faculty map
                const codeToFaculty = {};
                Object.values(cachedCourseData).forEach(cd => {
                    const cc = (cd['Course Code'] || '').trim();
                    const fn = (cd['Faculty Name'] || '').trim();
                    if (cc && fn) codeToFaculty[cc] = fn;
                });

                // Add a Faculty header to the attendance table if not already present
                const attHeader = courseTable.querySelector('tbody tr:first-child');
                if (attHeader && !attHeader.querySelector('.unfugly-faculty-header')) {
                    const th = document.createElement('th');
                    th.textContent = 'Faculty';
                    th.className = 'unfugly-faculty-header';
                    th.style.cssText = 'background:#E6E6FA;font-weight:bold;padding:4px 8px;';
                    attHeader.appendChild(th);
                }

                const attRows = courseTable.querySelectorAll('tbody tr:not(:first-child)');
                attRows.forEach(row => {
                    if (row.querySelector('.unfugly-faculty-cell')) return;
                    const cells = row.querySelectorAll('td');
                    if (cells.length === 0) return;
                    // Get courseCode from first cell
                    const fontEl = cells[0].querySelector('font');
                    const raw = cells[0].textContent.trim();
                    const trail = fontEl ? fontEl.textContent.trim() : '';
                    const courseCode = raw.replace(trail, '').trim();
                    const facultyName = codeToFaculty[courseCode] || '';
                    const td = document.createElement('td');
                    td.className = 'unfugly-faculty-cell';
                    td.style.cssText = 'text-align:center;padding:4px 8px;';
                    if (facultyName) {
                        const url = convertFacultyNameToUrl(facultyName);
                        td.innerHTML = `<a href="${url}" target="_blank" style="color:#64b5f6;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${facultyName}</a>`;
                    } else {
                        td.textContent = '—';
                        td.style.color = '#888';
                    }
                    row.appendChild(td);
                });
            }
        } catch(e) {
            console.warn('inlineMarksTotal: Faculty injection failed:', e);
        }
    } catch (error) {
        console.error("inlineMarksTotal: Error processing attendance/marks page:", error);
        displayInfoMessage("An error occurred while enhancing attendance/marks.", 5000, 'error');
    }
    //return marksData;
}


//Function to show total marks of students in Student Academic Status page
async function marksTotalReport() {
    try {

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
            const courseCodeMatch = courseCodeRaw.replace(courseCodeTrail, '');
            const courseCode = /*courseCodeRaw;*/courseCodeMatch;
            //console.log("marksTotalReport: Processed course code:", courseCode);
            //const courseCodeMatch = cellText.match(/^([A-Z0-9]+)/);
            //const courseCode = courseCodeMatch ? courseCodeMatch[1] : cellText;
            let courseTitle = cells[courseCodeIndexHeader + 1].textContent.trim();
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
                    if (totalObtainedMarks / totalMaxMarks < 0.5) {
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
        // Inject faculty hyperlinks into the course table (col index 7 = faculty)
        injectFacultyLinksInTable(courseTable, 7);
    } catch (error) {
        console.error("marksTotalReport: Error processing attendance/marks page:", error);
        displayInfoMessage("An error occurred while enhancing attendance/marks.", 5000, 'error');
    }
    //return marksData;
}

async function checkAndSyncCalendar() {
    const result = await chrome.storage.local.get('unfuglyData_calendar');
    const calendarRoot = result.unfuglyData_calendar || {};
    
    // Check if we need to sync based on the CURRENT semester's last updated time
    const currentSem = getCurrentSemesterKey();
    const currentCalendar = calendarRoot[currentSem];

    if (currentCalendar && currentCalendar.lastUpdated) {
        const lastUpdateDate = new Date(currentCalendar.lastUpdated);
        if (!isNaN(lastUpdateDate)) {
            const now = new Date();
            const diffInHours = (now - lastUpdateDate) / (1000 * 60 * 60);

            // Only fetch if data is older than 24 hours
            if (diffInHours < 24) {
                return;
            }
        }
    }

    // Use native API interception to fetch and sync all calendars instantly
    await syncAllCalendars();
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
            // console.warn(`processWelcomeContent: Welcome container not found yet. Retry ${retryCount + 1}/${maxRetries}.`);
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
            // console.log("handleWelcomePage: Extracted Day Order:", dayOrderInfo);
        } else {
            // console.warn("handleWelcomePage: Day Order element not found.");
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
            // console.warn("handleWelcomePage: Could not determine current Net ID. Using fallback 'anonymous_user'.");
            // If Net ID can't be found, we can't do user-specific caching
            backgroundFetchAllData('anonymous_user', titleElement, [], appWrapper, dayOrderInfo); // Fetch fresh data
            //console.log("dayorderInfo passed to backgorundfetchalldata:", dayOrderInfo);
            return true; // Indicate that processing has started
        }
        // console.log("handleWelcomePage: Determined current Net ID:", currentNetId);

        let cachedData = null;
        let previousAttendanceData = [];

        try {
            const storageKey = `unfuglyData_${currentNetId}`;
            cachedData = await chrome.storage.local.get(storageKey);
            cachedData = cachedData[storageKey] || {};

            if (cachedData.attendanceData) {
                previousAttendanceData = JSON.parse(JSON.stringify(cachedData.attendanceData)); // Deep copy
            }

            if (cachedData.profileData && cachedData.timetableJSON && cachedData.attendanceData && cachedData.marksData) {
                //console.log("handleWelcomePage: Complete cached data found. Displaying immediately.");
                renderProfilePanel(cachedData.profileData, appWrapper, dayOrderInfo);
                renderAccordionPanels(cachedData, previousAttendanceData, appWrapper, currentNetId);
                if (titleElement) {
                    titleElement.textContent = "Unfugly: Data loaded from cache!";
                }
                // Then, start background refresh for old users
                backgroundFetchAllData(currentNetId, titleElement, previousAttendanceData, appWrapper, dayOrderInfo);
                //loadingAnimetion.style.display = 'none';
            } else {
                console.log("handleWelcomePage: No complete cached data found locally. Attempting to fetch from DB first...");
                if (titleElement) {
                    titleElement.textContent = "Unfugly: Fetching data from Database...";
                }

                let fetchedFromDb = false;
                try {
                    const BACKEND = 'http://localhost:3000';
                    const dbRes = await backgroundFetch(`${BACKEND}/api/v1/user/get/${currentNetId}`);
                    if (dbRes.ok) {
                        const dbData = await dbRes.json();
                        if (dbData.profileData && dbData.timetableJSON && dbData.attendanceData && dbData.marksData) {
                            window.UnfuglyLog.info('SYNC_01', "handleWelcomePage: Fetched initial data from DB. Displaying...");
                            
                            const constructedCache = {
                                profileData: dbData.profileData,
                                timetableJSON: dbData.timetableJSON,
                                attendanceData: dbData.attendanceData,
                                marksData: dbData.marksData,
                                editedSlots: dbData.editedSlots,
                                courseData: dbData.courseData || dbData.courseSlotMap || {}
                            };

                            await chrome.storage.local.set({ [storageKey]: constructedCache });
                            
                            try {
                                const calRes = await backgroundFetch(`${BACKEND}/calendar`);
                                if (calRes.ok) {
                                    const calData = await calRes.json();
                                    await chrome.storage.local.set({
                                        unfuglyData_calendar: {
                                            data: calData.calendar_json,
                                            lastUpdated: calData.updated_at
                                        }
                                    });
                                }
                            } catch(e) { window.UnfuglyLog.warn('CAL_01', `Failed fetching universal calendar on init: ${e.message}`); }

                            renderProfilePanel(constructedCache.profileData, appWrapper, dayOrderInfo);
                            renderAccordionPanels(constructedCache, previousAttendanceData, appWrapper, currentNetId);
                            if (titleElement) {
                                titleElement.textContent = "Unfugly: Data loaded from cloud!";
                            }
                            fetchedFromDb = true;
                        }
                    }
                } catch (dbErr) {
                    window.UnfuglyLog.info('SYNC_02', `handleWelcomePage: DB fetch failed or empty: ${dbErr.message}`);
                }

                if (!fetchedFromDb) {
                    window.UnfuglyLog.info('SYNC_01', "handleWelcomePage: No complete data found in cloud. Initiating background fetch.");
                    if (titleElement) {
                        titleElement.textContent = "Unfugly: Fetching new data...";
                    }
                }

                backgroundFetchAllData(currentNetId, titleElement, previousAttendanceData, appWrapper, dayOrderInfo); 
                loaded = document.getElementsByClassName('unfugly-panel profile-panel');

            }
        } catch (error) {
            window.UnfuglyLog.error('SYS_01', `handleWelcomePage: Error accessing cached data or rendering UI: ${error.message}`);
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
            window.UnfuglyLog.error('SYS_01', "handleWelcomePage: Max retries reached for Welcome page container. Aborting.");
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
    window.UnfuglyLog.info('SYS_01', "handleTimetablePage: Starting process for My_Time_Table_2023_24 page.");
    window.timetableRetryCount = 0; // Reset retry counter for this page
    tryToProcessTimetablePage();
}

async function tryToProcessTimetablePage() {
    window.UnfuglyLog.info('SYS_01', `tryToProcessTimetablePage: Attempt ${window.timetableRetryCount + 1}/${MAX_TIMETABLE_RETRIES}`);

    const timetableContainer = document.getElementById('zc-viewcontainer_My_Time_Table_2023_24');
    if (!timetableContainer) {
        window.UnfuglyLog.warn('SYS_01', "tryToProcessTimetablePage: Timetable container not found. Retrying...");
        if (window.timetableRetryCount < MAX_TIMETABLE_RETRIES) {
            window.timetableRetryCount++;
            setTimeout(tryToProcessTimetablePage, TIMETABLE_RETRY_DELAY);
        } else {
            window.UnfuglyLog.error('SYS_01', "tryToProcessTimetablePage: Max retries reached for timetable container. Aborting.");
            displayInfoMessage("Failed to load timetable page. Please refresh.", 5000, 'error');
        }
        return;
    }

    try {
        await waitForElement(document, 'table.course_tbl'); // Wait for the specific course table
        const { courses, batch } = extractCourseDataFromDocument(document);
        const netId = getNetId();

        // Save extracted data to the main unfuglyData storage key
        if (netId && courses) {
            const storageKey = `unfuglyData_${netId}`;
            chrome.storage.local.get(storageKey, (result) => {
                const existingData = result[storageKey] || {};
                existingData.courseData = courses;
                existingData.lastUpdated = new Date().toISOString();
                chrome.storage.local.set({ [storageKey]: existingData }, () => {
                    if (chrome.runtime.lastError) {
                        window.UnfuglyLog.error('SYNC_03', `handleTimetablePage: Error saving timetable data to unfuglyData: ${chrome.runtime.lastError.message}`);
                    } else {
                        window.UnfuglyLog.info('SYNC_01', `handleTimetablePage: Course data for ${netId} saved to unfuglyData storage.`);
                    }
                });
            });
        }

        const timetableTable = document.querySelector('table[align="center"][border="5"]');
        if (timetableTable) {
            // Apply enhancements directly to this page
            replaceSlotsWithCourseTitles(courses, timetableTable);
            addDownloadTimetableButton(timetableTable);
            displayInfoMessage("Timetable enhanced successfully!", 3000, 'success');
        } else {
            window.UnfuglyLog.error('SCRP_02', "handleTimetablePage: Timetable table not found after data extraction.");
            displayInfoMessage("Error: Timetable table not found on page.", 5000, 'error');
        }

    } catch (error) {
        window.UnfuglyLog.error('SYS_01', `handleTimetablePage: Error processing timetable page: ${error.message}`);
        displayInfoMessage("An error occurred while enhancing the timetable.", 5000, 'error');
    }
}

/**
 * Handles the logic specific to the My_Attendance page.
 * Adds margin column and total marks sub-row directly to the page.
 */
async function handleAttendancePage() {
    window.UnfuglyLog.info('SYS_01', "handleAttendancePage: Starting process for My_Attendance page.");
    try {
        await waitForElement(document, '#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(4)');

        let previousAttendanceData = [];
        try {
            const currentNetId = getNetId();
            if (currentNetId) {
                const storageKey = `unfuglyData_${currentNetId}`;
                const data = await chrome.storage.local.get(storageKey);
                if (data && data[storageKey] && data[storageKey].attendanceData) {
                    previousAttendanceData = data[storageKey].attendanceData;
                }
            }
        } catch (e) {
            console.warn("Could not retrieve previous attendance data for lock row preservation:", e);
        }

        // This will modify the live DOM to add margin column
        const attendanceData = extractAttendanceDataFromDocument(document, previousAttendanceData);

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

// Stop flag — set to true to halt automation mid-fill
const unfuglyFill = { stopped: false };

const FEEDBACK_BATCH_SIZE = 10; // Number of subject rows to process concurrently

const FEEDBACK_FIELDS = [
    'zc-Enter_Your_Feedback_Here_Theory-Punctuality',                                                       //T01
    'zc-Enter_Your_Feedback_Here_Theory-Sincerity',                                                         //T02
    'zc-Enter_Your_Feedback_Here_Theory-Subject_Knowledge',                                                 //T03
    'zc-Enter_Your_Feedback_Here_Theory-Lecture_Preparation',                                               //T04
    'zc-Enter_Your_Feedback_Here_Theory-Communication_Presentation_Skills',                                 //T05
    'zc-Enter_Your_Feedback_Here_Theory-Coverage_of_Syllabus_as_per_Schedule',                              //T06
    'zc-Enter_Your_Feedback_Here_Theory-Controlling_of_the_Classes',                                        //T07
    'zc-Enter_Your_Feedback_Here_Theory-Standard_of_Test_Questions',                                        //T08
    'zc-Enter_Your_Feedback_Here_Theory-Discussion_of_Test_Questions',                                      //T09
    'zc-Enter_Your_Feedback_Here_Theory-Fairness_in_valuation',                                             //T10
    'zc-Enter_Your_Feedback_Here_Theory-Interaction_Approachability',                                       //T11
    'zc-Enter_Your_Feedback_Here_Theory-Helping_for_Clarification_of_Doubts',                               //T12
    'zc-Enter_Your_Feedback_Here_Theory-Knowledge_Gained_at_Present_on_the_Subject',                        //T13
    'zc-Enter_Your_Feedback_Here_Theory-Overall_Rating_of_the_Teacher',                                     //T14

    'zc-Enter_Your_Feedback_Here_Practical-Punctuality',                                                    //P01
    'zc-Enter_Your_Feedback_Here_Practical-Sincerity',                                                      //P02
    'zc-Enter_Your_Feedback_Here_Practical-Knowledge_on_Laboratory_Course',                                 //P03
    'zc-Enter_Your_Feedback_Here_Practical-Skills_for_Explanation_Demonstration_of_the_Experiments',        //P04
    'zc-Enter_Your_Feedback_Here_Practical-Coverage_of_Experiments_as_per_Schedule',                        //P05
    'zc-Enter_Your_Feedback_Here_Practical-Controlling_of_the_Classes',                                     //P06
    'zc-Enter_Your_Feedback_Here_Practical-Discussion_on_Experiments_Procedure_Results_Analysis',           //P07
    'zc-Enter_Your_Feedback_Here_Practical-Fairness_in_Evaluation_of_Observation_Record',                   //P08
    'zc-Enter_Your_Feedback_Here_Practical-Interaction_Approachability',                                    //P09
    'zc-Enter_Your_Feedback_Here_Practical-Helping_for_Clarification_of_Doubts',                            //P10
    'zc-Enter_Your_Feedback_Here_Practical-Availability_During_Practical_Periods',                          //P11
    'zc-Enter_Your_Feedback_Here_Practical-Knowledge_Gained_at_Present_on_the_Laboratory_Course',           //P12
    'zc-Enter_Your_Feedback_Here_Practical-Overall_Rating_of_the_Teacher',                                  //P13
];

const COMMENT_FIELDS = [
    'zc-Enter_Your_Feedback_Here_Theory-Comments',
    'zc-Enter_Your_Feedback_Here_Practical-Comments'
];

async function fillSelect2Dropdown(sub, fieldIdentifier, targetValue) {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    if (unfuglyFill.stopped) return;

    const container = sub.querySelector(`.select2-container.${fieldIdentifier}`);
    if (!container) return;

    const opener = container.querySelector('a.select2-choice');
    if (!opener) return;

    // Read the select2 numeric ID from the already-rendered span BEFORE opening.
    // This avoids any risk of the span disappearing after mousedown.
    const chosenSpan = opener.querySelector('span.select2-chosen');
    if (!chosenSpan) return;
    const select2Id = chosenSpan.id.replace('select2-chosen-', '');

    // Open the dropdown
    opener.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

    // Poll until Select2 renders the results list AND populates it with options.
    // Fixed delays are unreliable on slow machines — polling is the correct approach.
    let resultsList = null;
    let options = [];
    for (let attempt = 0; attempt < 30; attempt++) {
        if (unfuglyFill.stopped) {
            opener.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); // close
            return;
        }
        resultsList = document.getElementById(`select2-results-${select2Id}`);
        if (resultsList) {
            options = resultsList.querySelectorAll('li.select2-results-dept-0');
            if (options.length > 0) break;
        }
        await delay(100); // check every 100ms, up to 3s total
    }

    if (!resultsList || options.length === 0) {
        console.warn(`fillSelect2Dropdown: results never loaded for ${fieldIdentifier}`);
        opener.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); // close
        return;
    }

    let matched = false;
    for (const opt of options) {
        if (opt.textContent.trim() === targetValue) {
            opt.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, view: window }));
            opt.click();
            matched = true;
            break;
        }
    }

    if (!matched) {
        console.warn(`fillSelect2Dropdown: "${targetValue}" not in options for ${fieldIdentifier}`);
        opener.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); // close
    }

    await delay(150); // brief settle time after selection
}

// Fill all fields for a single subject block (called in parallel across subjects)
async function fillSubjectBlock(sub, targetValue, onFieldDone) {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (const field of FEEDBACK_FIELDS) {
        if (unfuglyFill.stopped) return;
        await fillSelect2Dropdown(sub, field, targetValue);
        // Wait for Select2 selection to be reflected in DOM before counting
        await delay(100);
        if (onFieldDone) onFieldDone();
        await delay(200);
    }
}

async function fillCommentsBlock(sub, commentText, onFieldDone) {
    if (unfuglyFill.stopped || !commentText) return;

    for (const field of COMMENT_FIELDS) {
        if (unfuglyFill.stopped) return;
        const textarea = sub.querySelector(`textarea.${field}`);
        if (textarea) {
            textarea.value = commentText;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            if (onFieldDone) onFieldDone();
        }
    }
}

async function fillSubject(targetValue, commentText, batchSize, onProgress) {
    const subs = [...document.querySelectorAll('div.subformRow.clearfix > div.mono-column.column-block > div.formColumn.first-column')];
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Phase 1: Select2 Dropdowns
    for (let i = 0; i < subs.length; i += batchSize) {
        if (unfuglyFill.stopped) break;
        const batch = subs.slice(i, i + batchSize);
        await Promise.all(batch.map(sub => fillSubjectBlock(sub, targetValue, onProgress)));
        if (!unfuglyFill.stopped) await delay(400);
    }

    // Phase 2: Comments (after all dropdowns in previous batches are likely done)
    if (!unfuglyFill.stopped && commentText) {
        for (let i = 0; i < subs.length; i += batchSize) {
            if (unfuglyFill.stopped) break;
            const batch = subs.slice(i, i + batchSize);
            await Promise.all(batch.map(sub => fillCommentsBlock(sub, commentText, onProgress)));
            if (!unfuglyFill.stopped) await delay(200);
        }
    }
}

function removeUnfuglyFeedbackPanel() {
    const panel = document.getElementById('unfugly-feedback-panel');
    if (panel) panel.remove();
}

/**Handles the feedback page */
async function handleFeedbackPage() {
    if (document.getElementById('unfugly-feedback-panel')) return;
    try {
        await waitForElement(document, 'div.row > form > div.formContainer > div > div.mono-column.column-block > div.formColumn.first-column > div.form-group.clearfix.zc-Registration_Number-group');
        // Give Zoho a moment to initialize all Select2 dropdowns across the rows
        await new Promise(r => setTimeout(r, 1000));

        const COLORS = {
            bg: '#1a1a2e',
            accent: '#337ab7',
            yellow: '#FBC02D',
            red: '#E57373',
            green: '#81C784',
            text: '#e0e0e0',
            muted: '#aaa'
        };

        const panel = document.createElement('div');
        panel.id = 'unfugly-feedback-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483647;
            background-color: ${COLORS.bg};
            color: ${COLORS.text};
            padding: 18px;
            border-radius: 10px;
            border-left: 5px solid ${COLORS.accent};
            width: 360px;
            font-family: sans-serif;
            display: flex;
            flex-direction: column;
            gap: 14px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        `;

        // HEADER
        const header = document.createElement('div');
        header.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
        header.innerHTML = `<span style="font-weight:bold; font-size:15px; letter-spacing:0.5px;">FEEDBACK FAST-TRACK</span>`;

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'cursor:pointer; padding:4px; opacity:0.7; transition:opacity 0.2s;';
        closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseout = () => closeBtn.style.opacity = '0.7';
        closeBtn.onclick = () => removeUnfuglyFeedbackPanel();
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // CONFIG SECTION
        const configGrid = document.createElement('div');
        configGrid.style.cssText = 'display:grid; grid-template-columns: 1fr 1fr; gap:12px;';

        // Rating
        const ratingCol = document.createElement('div');
        ratingCol.style.cssText = 'display:flex; flex-direction:column; gap:4px;';
        ratingCol.innerHTML = `<label style="font-size:11px; color:${COLORS.muted}; font-weight:bold; text-transform:uppercase;">Rating</label>`;
        const ratingSelect = document.createElement('select');
        ratingSelect.style.cssText = `background:#2d2d44; color:white; border:1px solid #444; border-radius:4px; padding:6px; font-size:12px; outline:none;`;
        ['Excellent', 'Very Good', 'Good', 'Average', 'Poor'].forEach(v => {
            const o = document.createElement('option');
            o.value = o.textContent = v;
            ratingSelect.appendChild(o);
        });
        ratingCol.appendChild(ratingSelect);
        configGrid.appendChild(ratingCol);

        panel.appendChild(configGrid);

        // Comment
        const commentBox = document.createElement('div');
        commentBox.style.cssText = 'display:flex; flex-direction:column; gap:4px;';
        commentBox.innerHTML = `<label style="font-size:11px; color:${COLORS.muted}; font-weight:bold; text-transform:uppercase;">Comments</label>`;
        const commentInput = document.createElement('textarea');
        commentInput.placeholder = 'Automated feedback comments...';
        commentInput.rows = 2;
        commentInput.style.cssText = `background:#2d2d44; color:white; border:1px solid #444; border-radius:4px; padding:8px; font-size:12px; resize:none; outline:none;`;
        commentBox.appendChild(commentInput);
        panel.appendChild(commentBox);

        // STATUS SECTION
        const statusRow = document.createElement('div');
        statusRow.style.cssText = 'display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid #333; padding-top:12px;';

        const progContainer = document.createElement('div');
        progContainer.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
        const progLabel = document.createElement('span');
        progLabel.textContent = 'Ready';
        progLabel.style.cssText = `font-size:12px; font-weight:bold; color:${COLORS.muted};`;
        progContainer.appendChild(progLabel);
        statusRow.appendChild(progContainer);
        panel.appendChild(statusRow);

        // ACTION BUTTONS
        const actionRow = document.createElement('div');
        actionRow.style.cssText = 'display:flex; gap:8px;';

        const createBtn = (text, bg, textColor = '#1a1a2e') => {
            const b = document.createElement('button');
            b.textContent = text;
            b.style.cssText = `background:${bg}; color:${textColor}; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:13px; flex:1; transition:filter 0.2s;`;
            b.onmouseover = () => b.style.filter = 'brightness(1.1)';
            b.onmouseout = () => b.style.filter = 'brightness(1)';
            return b;
        };

        const startBtn = createBtn('Start Autofill', '#d1d1e0');
        startBtn.style.color = '#1a1a2e';
        const stopBtn = createBtn('Stop', COLORS.red);
        const resetBtn = createBtn('Reset', COLORS.red);

        stopBtn.style.display = 'none';
        resetBtn.style.display = 'none';

        actionRow.appendChild(startBtn);
        actionRow.appendChild(stopBtn);
        actionRow.appendChild(resetBtn);
        panel.appendChild(actionRow);

        // STATE LOGIC
        let currentSubjectIndex = 0;
        let isCommentPhase = false;

        const setUIState = (state) => {
            switch (state) {
                case 'idle':
                    startBtn.style.display = 'block';
                    startBtn.textContent = 'Start Autofill';
                    startBtn.style.background = '#d1d1e0';
                    startBtn.style.color = '#1a1a2e';
                    stopBtn.style.display = 'none';
                    resetBtn.style.display = 'none';
                    panel.style.borderLeftColor = COLORS.accent;
                    progLabel.textContent = 'Ready';
                    progLabel.style.color = COLORS.muted;
                    break;
                case 'running':
                    startBtn.style.display = 'none';
                    stopBtn.style.display = 'block';
                    resetBtn.style.display = 'none';
                    panel.style.borderLeftColor = COLORS.yellow;
                    progLabel.textContent = 'Running';
                    progLabel.style.color = COLORS.yellow;
                    break;
                case 'stopped':
                    startBtn.style.display = 'block';
                    startBtn.textContent = 'Resume';
                    startBtn.style.background = COLORS.yellow;
                    startBtn.style.color = '#1a1a2e';
                    stopBtn.style.display = 'none';
                    resetBtn.style.display = 'block';
                    panel.style.borderLeftColor = COLORS.yellow;
                    progLabel.textContent = 'Paused';
                    progLabel.style.color = COLORS.yellow;
                    break;
                case 'finished':
                    startBtn.style.display = 'none';
                    stopBtn.style.display = 'none';
                    resetBtn.style.display = 'block';
                    panel.style.borderLeftColor = COLORS.green;
                    progLabel.textContent = 'Finished';
                    progLabel.style.color = COLORS.green;
                    break;
            }
        };

        const generateTaskList = () => {
            const tasks = [];
            const allSubs = document.querySelectorAll('div.subformRow');

            allSubs.forEach(sub => {
                // Dropdowns
                FEEDBACK_FIELDS.forEach(f => {
                    const container = sub.querySelector(`.select2-container.${f}`);
                    if (container) {
                        const chosenSpan = container.querySelector('.select2-chosen');
                        const isFilled = chosenSpan && chosenSpan.textContent.trim() !== 'Select' && chosenSpan.textContent.trim() !== '';
                        if (!isFilled) {
                            tasks.push({ sub, field: f, type: 'dropdown' });
                        }
                    }
                });

                // Comments
                COMMENT_FIELDS.forEach(f => {
                    const textarea = sub.querySelector(`textarea.${f}`);
                    if (textarea && textarea.value.trim() === '') {
                        tasks.push({ sub, field: f, type: 'comment' });
                    }
                });
            });
            return tasks;
        };

        stopBtn.onclick = (e) => {
            e.preventDefault();
            unfuglyFill.stopped = true;
            setUIState('stopped');
        };

        resetBtn.onclick = (e) => {
            e.preventDefault();
            unfuglyFill.stopped = false;
            setUIState('idle');
        };

        startBtn.onclick = async (e) => {
            e.preventDefault();
            unfuglyFill.stopped = false;
            setUIState('running');

            const ratingValue = ratingSelect.value;
            const commentValue = commentInput.value;
            const batchSize = 16;
            const delay = (ms) => new Promise(res => setTimeout(res, ms));

            try {
                // SUBJECT-BASED BATCHING (Stable)
                let allSubs = Array.from(document.querySelectorAll('div.subformRow'));

                // Resume logic: Only process subjects that have at least one empty field
                allSubs = allSubs.filter(sub => {
                    const hasEmptyDropdown = FEEDBACK_FIELDS.some(f => {
                        const c = sub.querySelector(`.select2-container.${f}`);
                        const chosen = c?.querySelector('.select2-chosen')?.textContent.trim();
                        return !chosen || chosen === 'Select' || chosen === '';
                    });
                    const hasEmptyComment = commentValue && COMMENT_FIELDS.some(f => {
                        const t = sub.querySelector(`textarea.${f}`);
                        return t && t.value.trim() === '';
                    });
                    return hasEmptyDropdown || hasEmptyComment;
                });

                for (let i = 0; i < allSubs.length; i += batchSize) {
                    if (unfuglyFill.stopped) break;
                    const batch = allSubs.slice(i, i + batchSize);

                    // Process a batch of subjects in parallel
                    await Promise.all(batch.map(async (sub) => {
                        // Start comments filling in parallel with dropdowns (Comments don't use Select2)
                        const commentsPromise = commentValue ? fillCommentsBlock(sub, commentValue) : Promise.resolve();

                        // Dropdowns must be sequential within a single row to avoid Select2 conflicts
                        await fillSubjectBlock(sub, ratingValue);
                        await commentsPromise;
                    }));

                    if (!unfuglyFill.stopped && i + batchSize < allSubs.length) {
                        await delay(400);
                    }
                }

                if (!unfuglyFill.stopped) {
                    setUIState('finished');
                }
            } catch (err) {
                console.error('Autofill Error:', err);
                setUIState('stopped');
                progLabel.textContent = 'Error Occurred';
                progLabel.style.color = COLORS.red;
            }
        };

        document.body.appendChild(panel);
    } catch (error) {
        console.error('handleFeedbackPage init error:', error);
    }
}



/*Handles academic planner page*/
async function handleAcademicPlannerPage() {
    console.log("handleAcademicPlannerPage: Triggering background sync only (UI injection disabled).");
    if (typeof syncAllCalendars === 'function') {
        syncAllCalendars().catch(e => console.error("Calendar sync failed:", e));
    }
}

function renderCalendarUI(container, calendarData, pageName) {


    // Sort months chronologically by temporarily replacing the apostrophe year format (e.g. Jul '25 -> Jul 2025)
    let months = Object.keys(calendarData).sort((a, b) => {
        const parseMonth = (str) => new Date(str.replace("'", "20"));
        return parseMonth(a) - parseMonth(b);
    });

    // Filter months based on the current planner page name (e.g. Academic_Planner_2025_26_EVEN)
    if (pageName) {
        const pageMatch = pageName.match(/Academic_Planner_(\d{4})_(\d{2})_(ODD|EVEN)/i);
        if (pageMatch) {
            const startYearStr = pageMatch[1]; // "2025" or "2026"
            const endYearTwoDigit = pageMatch[2]; // "26" or "27"
            const startYearTwoDigit = startYearStr.slice(-2); // "25" or "26"
            const isEven = pageMatch[3].toUpperCase() === 'EVEN';
            
            months = months.filter(m => {
                const parts = m.split(" '");
                if (parts.length === 2) {
                    const mName = parts[0].toLowerCase(); // e.g. "jul" or "july"
                    const mYear = parts[1]; // e.g. "25" or "26"
                    
                    if (isEven) {
                        // EVEN semester: Jan to Jun of the end year (e.g. Jan '26 to Jun '26)
                        const evenMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun'];
                        return mYear === endYearTwoDigit && evenMonths.some(em => mName.startsWith(em));
                    } else {
                        // ODD semester: Jul to Dec of the start year (e.g. Jul '25 to Dec '25)
                        const oddMonths = ['jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                        return mYear === startYearTwoDigit && oddMonths.some(em => mName.startsWith(em));
                    }
                }
                return true;
            });
        }
    }

    if (months.length === 0) {
        container.innerHTML = '<div style="padding: 20px;"><h2>Failed to load calendar data. Data is still syncing or unavailable.</h2></div>';
        return;
    }

    // Default to the first month or current month
    const currentDate = new Date();
    const currentMonthShort = currentDate.toLocaleString('default', { month: 'short' }).toLowerCase();
    const currentYearTwoDigit = currentDate.getFullYear().toString().slice(-2);
    
    // Try to find current month, fallback to first
    let selectedMonth = months.find(m => m.toLowerCase().includes(currentMonthShort) && m.includes(currentYearTwoDigit)) || months[0];

    // Build minimap container
    const minimap = document.createElement('div');
    minimap.id = 'unfugly-calendar-minimap';
    minimap.style.cssText = `
        width: 250px;
        min-width: 250px;
        height: 100%;
        background-color: #1e1e1e;
        border-right: 1px solid #333;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        transition: transform 0.3s ease;
        z-index: 10;
    `;

    // Build main view container
    const mainView = document.createElement('div');
    mainView.id = 'unfugly-calendar-main';
    mainView.style.cssText = `
        flex-grow: 1;
        height: 100%;
        background-color: #121212;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        padding: 20px;
        box-sizing: border-box;
    `;

    container.appendChild(minimap);
    container.appendChild(mainView);

    // Responsive toggle for mobile
    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = '☰ Months';
    toggleBtn.style.cssText = `
        display: none;
        background: #1E88E5;
        color: white;
        border: none;
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 15px;
        cursor: pointer;
        font-weight: bold;
    `;
    mainView.appendChild(toggleBtn);
    
    // Add toggle logic
    let minimapOpen = false;
    toggleBtn.addEventListener('click', () => {
        minimapOpen = !minimapOpen;
        minimap.style.display = minimapOpen ? 'flex' : 'none';
        minimap.style.position = minimapOpen ? 'absolute' : 'static';
        if(minimapOpen) minimap.style.boxShadow = "2px 0 10px rgba(0,0,0,0.5)";
    });

    const checkResponsive = () => {
        if (window.innerWidth < 768) {
            minimap.style.display = 'none';
            toggleBtn.style.display = 'block';
            minimapOpen = false;
        } else {
            minimap.style.display = 'flex';
            minimap.style.position = 'static';
            minimap.style.boxShadow = 'none';
            toggleBtn.style.display = 'none';
        }
    };
    window.addEventListener('resize', checkResponsive);
    checkResponsive();

    // Render Minimap List
    const minimapTitle = document.createElement('h3');
    minimapTitle.textContent = 'Months';
    minimapTitle.style.cssText = `
        padding: 20px;
        margin: 0;
        color: #fff;
        border-bottom: 1px solid #333;
        font-weight: 600;
    `;
    minimap.appendChild(minimapTitle);

    const monthList = document.createElement('div');
    monthList.style.cssText = `
        display: flex;
        flex-direction: column;
        padding: 10px;
        gap: 5px;
    `;
    minimap.appendChild(monthList);

    const renderMainView = (month) => {
        // Clear main view except toggle button
        Array.from(mainView.children).forEach(child => {
            if (child !== toggleBtn) mainView.removeChild(child);
        });

        // Scroll main view back to the top when switching months
        mainView.scrollTop = 0;

        const monthData = calendarData[month];
        
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        `;
        
        const title = document.createElement('h1');
        title.textContent = month;
        title.style.margin = '0';
        title.style.color = '#1E88E5';
        header.appendChild(title);
        mainView.appendChild(header);

        // Day of week headers
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 10px;
            width: 100%;
            flex-grow: 1;
        `;
        
        const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        daysOfWeek.forEach(d => {
            const dayHeader = document.createElement('div');
            dayHeader.textContent = d;
            dayHeader.style.cssText = `
                text-align: center;
                font-weight: bold;
                padding: 10px;
                background-color: #1e1e1e;
                border-radius: 8px;
                color: #aaa;
            `;
            grid.appendChild(dayHeader);
        });

        // Determine starting day padding based on date '1'
        let startDayIndex = 0;
        if (monthData['1'] && monthData['1'].day) {
            startDayIndex = daysOfWeek.indexOf(monthData['1'].day);
            if (startDayIndex === -1) startDayIndex = 0;
        }

        for(let i = 0; i < startDayIndex; i++) {
            const emptySlot = document.createElement('div');
            emptySlot.style.cssText = `
                background-color: transparent;
                border-radius: 8px;
            `;
            grid.appendChild(emptySlot);
        }

        for (let i = 1; i <= 31; i++) {
            const dateStr = i.toString();
            if (monthData[dateStr]) {
                const dayInfo = monthData[dateStr];
                const dayCard = document.createElement('div');
                
                const isHoliday = dayInfo.dayOrder === '-' || dayInfo.dayOrder.toLowerCase() === 'holiday' || dayInfo.event.toLowerCase().includes('holiday');
                const borderColor = isHoliday ? '#d32f2f' : '#333';
                const bg = isHoliday ? 'rgba(211, 47, 47, 0.1)' : '#2a2a2a';
                
                dayCard.style.cssText = `
                    background-color: ${bg};
                    border: 1px solid ${borderColor};
                    border-radius: 8px;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    min-height: 100px;
                    transition: transform 0.2s, box-shadow 0.2s;
                `;
                dayCard.onmouseover = () => {
                    dayCard.style.transform = 'translateY(-2px)';
                    dayCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
                };
                dayCard.onmouseout = () => {
                    dayCard.style.transform = 'none';
                    dayCard.style.boxShadow = 'none';
                };

                // Top row: Date and Day Order
                const topRow = document.createElement('div');
                topRow.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 8px;
                `;
                
                const dateNum = document.createElement('span');
                dateNum.textContent = dateStr;
                dateNum.style.cssText = `
                    font-size: 1.5em;
                    font-weight: bold;
                    color: ${isHoliday ? '#ef5350' : '#fff'};
                `;
                
                const doBadge = document.createElement('span');
                doBadge.textContent = dayInfo.dayOrder;
                doBadge.style.cssText = `
                    background-color: ${isHoliday ? '#d32f2f' : '#1E88E5'};
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.8em;
                    font-weight: bold;
                `;
                
                topRow.appendChild(dateNum);
                topRow.appendChild(doBadge);
                dayCard.appendChild(topRow);

                // Event text
                const eventText = document.createElement('div');
                eventText.textContent = dayInfo.event !== '-' ? dayInfo.event : '';
                eventText.style.cssText = `
                    font-size: 0.85em;
                    color: #bbb;
                    flex-grow: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                `;
                dayCard.appendChild(eventText);

                grid.appendChild(dayCard);
            }
        }
        
        mainView.appendChild(grid);
    };

    const updateActiveMonth = (selected) => {
        Array.from(monthList.children).forEach(btn => {
            if (btn.dataset.month === selected) {
                btn.style.backgroundColor = '#1E88E5';
                btn.style.color = '#fff';
            } else {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = '#ccc';
            }
        });
    };

    months.forEach(month => {
        const monthBtn = document.createElement('button');
        monthBtn.textContent = month;
        monthBtn.dataset.month = month;
        monthBtn.style.cssText = `
            width: 100%;
            text-align: left;
            padding: 12px 15px;
            background: transparent;
            border: none;
            color: #ccc;
            cursor: pointer;
            border-radius: 6px;
            font-size: 1em;
            transition: all 0.2s;
        `;
        monthBtn.onmouseover = () => {
            if(selectedMonth !== month) monthBtn.style.backgroundColor = '#2a2a2a';
        };
        monthBtn.onmouseout = () => {
            if(selectedMonth !== month) monthBtn.style.backgroundColor = 'transparent';
        };
        
        monthBtn.addEventListener('click', () => {
            selectedMonth = month;
            updateActiveMonth(month);
            renderMainView(month);
            if(window.innerWidth < 768 && minimapOpen) {
                toggleBtn.click(); // auto close on mobile
            }
        });
        
        monthList.appendChild(monthBtn);
    });

    updateActiveMonth(selectedMonth);
    renderMainView(selectedMonth);
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
        //console.log("renderProfilePanel: dayOrderSpan:", dayOnUpdate);
    }

    const dayOrderToday = dayOrder; //|| dayOnUpdate; // Default to 'N/A' if not provided\
    //console.log("renderProfilePanel: dayOrderToday:", dayOrderToday);
    // Check if a profile panel already exists to avoid duplication during refreshes
    let profilePanel = container.querySelector('.profile-panel');
    if (!profilePanel) {
        profilePanel = document.createElement('div');
        profilePanel.className = 'unfugly-panel profile-panel';
        profilePanel.style.cssText = `
            flex: 0 0 25%;
            min-width: 240px;
            max-width: 300px;
            display: flex;
            flex-direction: column;
            position: relative;
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
        <p><strong>Department:</strong> ${profileData.schoolDepartment || 'N/A'}</p>
        <div class="profile-photo-container" style="margin-top: 15px; text-align: center;">
            <img id="unfugly-profile-photo" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #1E88E5; box-shadow: 0 4px 8px rgba(0,0,0,0.3); object-fit: cover; background-color: #444;" />
        </div>
        <div id="unfugly-profile-details-wrapper"></div>
    `;
    
    // Move existing details into a wrapper so we can easily hide/show them
    const detailsWrapper = profilePanel.querySelector('#unfugly-profile-details-wrapper');
    detailsWrapper.style.paddingBottom = '60px'; // Prevent overlap with pinned menu
    const existingChildren = Array.from(profilePanel.childNodes);
    existingChildren.forEach(child => {
        if (child.id !== 'unfugly-profile-details-wrapper') {
            detailsWrapper.appendChild(child);
        }
    });

    // Add Hamburger menu with exact screenshot styling
    const menuContainer = document.createElement('div');
    menuContainer.id = 'unfugly-profile-menu-container';
    menuContainer.style.cssText = 'position: absolute; bottom: 20px; left: 20px; display: flex; justify-content: flex-start;';
    menuContainer.innerHTML = `
        <button id="unfugly-hamburger-btn" style="
            background: #222; 
            border: 1px solid #444; 
            border-radius: 8px; 
            color: white; 
            width: 40px; 
            height: 40px; 
            cursor: pointer; 
            display: flex; 
            flex-direction: column; 
            justify-content: center; 
            align-items: center; 
            gap: 4px;
            transition: background 0.2s;
        ">
            <span style="display: block; width: 18px; height: 2px; background: white; border-radius: 2px;"></span>
            <span style="display: block; width: 18px; height: 2px; background: white; border-radius: 2px;"></span>
            <span style="display: block; width: 18px; height: 2px; background: white; border-radius: 2px;"></span>
        </button>
        
        <div id="unfugly-hamburger-popup" style="
            display: none; 
            position: absolute; 
            bottom: 100%; 
            left: 0; 
            width: 220px; 
            background: #1e1e1e; 
            border: 1px solid #333; 
            border-radius: 12px; 
            margin-bottom: 10px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.6); 
            z-index: 100; 
            flex-direction: column;
            padding: 8px 0;
        ">
            <button id="unfugly-menu-calendar-btn" style="
                width: 100%; 
                background: transparent; 
                border: none; 
                color: white; 
                padding: 12px 16px; 
                cursor: pointer; 
                text-align: left; 
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 12px;
                transition: background 0.2s;
            ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E88E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Calendar
            </button>
        </div>
    `;
    detailsWrapper.appendChild(menuContainer);

    const hamburgerBtn = profilePanel.querySelector('#unfugly-hamburger-btn');
    const popup = profilePanel.querySelector('#unfugly-hamburger-popup');
    
    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.style.display = popup.style.display === 'none' ? 'flex' : 'none';
        hamburgerBtn.style.background = popup.style.display === 'none' ? '#222' : '#333';
    });
    
    document.addEventListener('click', () => {
        if (popup) {
            popup.style.display = 'none';
            hamburgerBtn.style.background = '#222';
        }
    });

    const calendarBtn = profilePanel.querySelector('#unfugly-menu-calendar-btn');
    
    calendarBtn.addEventListener('mouseover', () => calendarBtn.style.background = '#2a2a2a');
    calendarBtn.addEventListener('mouseout', () => calendarBtn.style.background = 'transparent');
    
    calendarBtn.addEventListener('click', () => {
        popup.style.display = 'none';
        hamburgerBtn.style.background = '#222';
        if (typeof showCalendarViewFull === 'function') {
            showCalendarViewFull(container);
        }
    });

    const profileImgElement = profilePanel.querySelector('#unfugly-profile-photo');
    if (profileImgElement) {
        secureImageSrc(profileImgElement);
    }
}

//${dayOrderToday || 'N/A'}
/**
 * Renders accordion panels for timetable, attendance, and marks on the welcome page.
 * @param {object} cachedData The data to display.
 * @param {Array} previousAttendanceData Previous attendance data for change highlighting.
 * @param {HTMLElement} container The container to append the panels to.
 */
function renderAccordionPanels(cachedData, previousAttendanceData, container, netId) {
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
    if (cachedData.timetableJSON) {
        if (cachedData.timetableJSON.extraSlotFlag !== undefined) {
            window.extraSlotFlag = !!cachedData.timetableJSON.extraSlotFlag;
        }
        timetableContentContainer.innerHTML = renderTableFromJSON(cachedData.timetableJSON);
        if (cachedData.courseData) {
            replaceSlotsWithCourseTitles(cachedData.courseData, timetableContentContainer.querySelector('table'), true);
        }
        addDownloadTimetableButton(timetableContentContainer.querySelector('table')); 
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
    injectPredictButton(attendancePanel, netId); // ← predict button beside "Attendance" heading

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
    formatMarksTable(cachedData.marksData, marksPanel.querySelector('#marks-content-container'), previousAttendanceData, cachedData.courseData);

    // Calendar Panel removed as it is now in the hamburger menu
    
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

    // Pre-compute combined attendance by base course code (strip trailing T or P)
    const combinedMap = {};
    attendanceData.forEach(item => {
        const base = item.courseCode.replace(/[TP]$/, '');
        if (!combinedMap[base]) combinedMap[base] = { conducted: 0, attended: 0, codes: [] };
        if (!item.isLocked && typeof item.hoursConducted === 'number' && typeof item.absentHours === 'number') {
            combinedMap[base].conducted += item.hoursConducted;
            combinedMap[base].attended += (item.hoursConducted - item.absentHours);
        }
        combinedMap[base].codes.push(item.courseCode);
    });

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

        if (item.isLocked) {
            if (item.percentage >= 75) {
                statusColor = '#81C784';
                bgColor = 'rgba(76,175,80,0.15)';
                statusText = `Attendance Locked`;
            } else {
                statusColor = '#E57373';
                bgColor = 'rgba(244,67,54,0.15)';
                statusText = `Attendance Locked`;
            }
        } else if (item.classesToSkip === 0 && item.classesToAttend === 0) {
            statusColor = '#FBC02D';
            bgColor = 'rgba(251,192,45,0.15)';
            statusText = `Can skip: ${item.classesToSkip}`;
        } else if (item.percentage >= 75) {
            statusColor = '#81C784';
            bgColor = 'rgba(76,175,80,0.15)';
            statusText = `Can skip: ${item.classesToSkip}`;
        } else {
            statusColor = '#E57373';
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
            position: relative;
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
                <div style="display:flex;align-items:center;gap:0.4rem;">
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

        // ⓘ button for combined attendance (only for non-locked courses that share a base code)
        const base = item.courseCode.replace(/[TP]$/, '');
        const group = combinedMap[base];
        const hasSibling = group && group.codes.length > 1 && !item.isLocked;

        if (hasSibling) {
            const combinedPct = group.conducted > 0 ? (group.attended / group.conducted * 100) : 0;
            const combinedColor = combinedPct >= 75 ? '#81C784' : '#E57373';

            const infoBtn = document.createElement('button');
            infoBtn.textContent = 'ⓘ';
            infoBtn.title = 'Combined attendance info';
            infoBtn.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(255,255,255,0.1);
                color: #aaa;
                border: none;
                border-radius: 50%;
                width: 22px;
                height: 22px;
                font-size: 0.85em;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
            `;

            const popup = document.createElement('div');
            popup.style.cssText = `
                display: none;
                position: absolute;
                top: 34px;
                right: 10px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 10px;
                padding: 12px 14px;
                font-size: 0.85em;
                color: #eee;
                z-index: 100;
                width: 200px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.5);
                line-height: 1.6;
            `;
            popup.innerHTML = `
                <b style="color:#fff;">Combined Attendance</b><br>
                Codes: <span style="color:#aaa;">${group.codes.join(', ')}</span><br>
                Combined %: <b style="color:${combinedColor};">${combinedPct.toFixed(2)}%</b><br>
                Total Conducted: <b style="color:#fff;">${group.conducted}</b><br>
                Total Attended: <b style="color:#fff;">${group.attended}</b>
            `;

            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = popup.style.display !== 'none';
                // Close all other popups
                document.querySelectorAll('.unfugly-att-popup').forEach(p => p.style.display = 'none');
                popup.style.display = isVisible ? 'none' : 'block';
            });
            popup.className = 'unfugly-att-popup';

            card.appendChild(infoBtn);
            card.appendChild(popup);
        }

        wrapper.appendChild(card);
    });

    // Close popups on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.unfugly-att-popup').forEach(p => p.style.display = 'none');
    }, { once: false, capture: false });

    container.innerHTML = '';
    container.appendChild(wrapper);
}


/**
 * Converts a faculty name into the corresponding faculty page URL.
 * @param {string} facultyName
 * @returns {string|null}
 */
function convertFacultyNameToUrl(facultyName) {
    if (!facultyName) return null;

    // 1. Remove trailing IDs and brackets (e.g. "Name (12345)")
    let cleaned = facultyName.replace(/\s*\(?\d+\)?.*$/, "").trim();

    // 2. Separate camelCase names (e.g. "Manoj KumarRana" -> "Manoj Kumar Rana")
    cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2');

    // 3. Remove common titles at the beginning (case-insensitive)
    cleaned = cleaned.replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "").trim();

    return `https://www.srmist.edu.in/staff-finder/?unfugly_faculty=${encodeURIComponent(cleaned)}`;
}

/**
 * Formats and displays the marks data in a table.
 * @param {Array} marksData The marks data array.
 * @param {HTMLElement} container The container to render the table into.
 * @param {Array} attendanceData Previous attendance data for course title lookup.
 * @param {Object} courseData Course slot map for credit & faculty info.
 */
function formatMarksTable(marksData, container, attendanceData, courseData) {
    if (!marksData || marksData.length === 0) {
        container.innerHTML = '<p style="color: #ccc; text-align: center;">No marks data found.</p>';
        return;
    }

    // Standard color helper (% of total marks)
    const getColor = (pct) => {
        if (pct > 85) return '#81C784';
        if (pct > 50) return '#FBC02D';
        return '#E57373';
    };

    // Internal-course color (higher bar: must be >91 for green)
    const getInternalColor = (pct) => {
        if (pct > 91) return '#81C784';
        if (pct > 50) return '#FBC02D';
        return '#E57373';
    };

    // Detect fully internal: code ends in 'P' OR max marks > 60
    const isFullyInternal = (item) =>
        item.CourseCode.trim().toUpperCase().endsWith('P') || item.TotalMaxMarks > 60;

    // Build a courseCode → {credit, faculty} lookup from slot-keyed courseData
    const courseInfoMap = {};
    if (courseData && typeof courseData === 'object') {
        Object.values(courseData).forEach(cd => {
            const cc = (cd['Course Code'] || '').trim();
            if (cc) {
                courseInfoMap[cc] = {
                    credit: cd['Credit'] || '',
                    faculty: cd['Faculty Name'] || ''
                };
            }
        });
    }

    const GRADES = [
        { grade: 'O',  min: 91 },
        { grade: 'A+', min: 81 },
        { grade: 'A',  min: 71 },
        { grade: 'B+', min: 61 },
        { grade: 'B',  min: 56 },
        { grade: 'C',  min: 50 }
    ];

    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '1rem';

    marksData.forEach(item => {
        const internal = isFullyInternal(item);
        const percentage = item.TotalMaxMarks > 0 ? (item.TotalObtainedMarks / item.TotalMaxMarks) * 100 : 0;
        const colorFn = internal ? getInternalColor : getColor;
        const scoreColor = colorFn(percentage);

        // Find course title from attendanceData
        let courseTitle = '';
        if (attendanceData && attendanceData.length > 0) {
            const match = attendanceData.find(a => a.courseCode === item.CourseCode);
            if (match && match.courseTitle) courseTitle = match.courseTitle;
        }

        // Find credit & faculty from courseInfoMap
        const info = courseInfoMap[item.CourseCode] || {};
        const facultyUrl = convertFacultyNameToUrl(info.faculty);
        const facultyLink = info.faculty
            ? `<a href="${facultyUrl}" target="_blank" style="color:#64b5f6;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${info.faculty}</a>`
            : '<span style="color:#888;">N/A</span>';

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
            position: relative;
        `;
        card.onmouseenter = () => card.style.background = 'rgba(255,255,255,0.05)';
        card.onmouseleave = () => card.style.background = '#1e1e1e';

        // ⓘ Info button
        const infoBtn = document.createElement('button');
        infoBtn.textContent = 'ⓘ';
        infoBtn.title = 'Course info & grade projection';
        infoBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255,255,255,0.1);
            color: #aaa;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            font-size: 0.85em;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            line-height: 1;
        `;

        // Build grade table HTML for external courses
        let gradeHtml = '';
        if (internal) {
            gradeHtml = '<div style="color:#aaa;font-size:0.85em;margin-top:6px;">Fully Internal – no external exam</div>';
        } else {
            // internal component = obtained out of 60 (max internal = 60)
            const internalObtained = Math.min(item.TotalObtainedMarks, 60);
            const totalMax = 100; // 60 internal + 40 converted external
            gradeHtml = `
                <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:0.82em;">
                    <thead>
                        <tr style="color:#aaa;border-bottom:1px solid #444;">
                            <th style="text-align:left;padding:3px 6px;">Grade</th>
                            <th style="text-align:left;padding:3px 6px;">Min Total</th>
                            <th style="text-align:left;padding:3px 6px;">Need /75</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            GRADES.forEach(g => {
                // Required total marks out of 100 for this grade
                const reqTotal = g.min;
                // External portion needed = reqTotal - internalObtained (capped at 40)
                const extNeeded40 = Math.max(0, reqTotal - internalObtained);
                // Convert from /40 to /75 scale
                const extNeeded75 = extNeeded40 > 40
                    ? '—' // impossible even with 75/75
                    : Math.ceil(extNeeded40 * 75 / 40);
                const impossible = extNeeded75 === '—' || (typeof extNeeded75 === 'number' && extNeeded75 > 75);
                const rowColor = impossible ? '#E57373' : (extNeeded75 <= 37 ? '#81C784' : '#FBC02D');
                const displayNeeded = impossible ? '✗' : `${extNeeded75}/75`;
                gradeHtml += `
                    <tr style="border-bottom:1px solid #2a2a2a;">
                        <td style="padding:3px 6px;font-weight:bold;color:#fff;">${g.grade}</td>
                        <td style="padding:3px 6px;color:#ccc;">${reqTotal}</td>
                        <td style="padding:3px 6px;color:${rowColor};font-weight:bold;">${displayNeeded}</td>
                    </tr>
                `;
            });
            gradeHtml += `</tbody></table>`;
        }

        const popup = document.createElement('div');
        popup.className = 'unfugly-marks-popup';
        popup.style.cssText = `
            display: none;
            position: absolute;
            top: 38px;
            right: 10px;
            background: #1a1a2e;
            border: 1px solid #333;
            border-radius: 10px;
            padding: 14px 16px;
            font-size: 0.85em;
            color: #eee;
            z-index: 200;
            width: 260px;
            box-shadow: 0 6px 24px rgba(0,0,0,0.6);
            line-height: 1.7;
        `;
        popup.innerHTML = `
            <b style="color:#fff;font-size:1em;">Course Info</b><br>
            Credit: <b style="color:#fff;">${info.credit || 'N/A'}</b><br>
            Faculty: ${facultyLink}<br>
            <div style="margin-top:4px;color:#aaa;font-size:0.82em;">Type: ${internal ? '🔒 Fully Internal' : '📄 Theory (60+40)'}</div>
            ${gradeHtml}
        `;

        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = popup.style.display !== 'none';
            document.querySelectorAll('.unfugly-marks-popup').forEach(p => p.style.display = 'none');
            popup.style.display = isVisible ? 'none' : 'block';
        });

        card.appendChild(infoBtn);
        card.appendChild(popup);

        // Top Section: Course Info
        const courseInfo = document.createElement('div');
        courseInfo.style.display = 'flex';
        courseInfo.style.justifyContent = 'space-between';
        courseInfo.style.alignItems = 'center';
        courseInfo.innerHTML = `
            <div style="max-width:75%;">
                <h2 style="margin: 0; font-size: 1.1em; font-weight: 600;">
                    ${item.CourseCode}${courseTitle ? ` - ${courseTitle}` : ''}
                </h2>
                <p style="margin: 2px 0; opacity: 0.8; font-size: 0.9em;">${item.CourseType}${internal ? ' <span style="font-size:0.8em;color:#FBC02D;">(Internal)</span>' : ''}</p>
            </div>
            <div style="text-align: right; font-size: 1em; font-weight: bold; color: ${scoreColor}; padding-right:30px;">
                ${item.TotalObtainedMarks} / ${item.TotalMaxMarks}
            </div>
        `;

        // Progress Bar
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
            width: ${Math.min(100, percentage)}%;
            background: ${scoreColor};
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
                const isAbsent = comp.ObtainedMarks === 'Absent';
                const compPct = !isAbsent && comp.MaxMarks > 0 ? (comp.ObtainedMarks / comp.MaxMarks) * 100 : 0;
                const chip = document.createElement('span');
                chip.style.cssText = `
                    background: ${isAbsent ? '#4a2020' : colorFn(compPct)};
                    color: ${isAbsent ? '#e57373' : '#000'};
                    padding: 6px 10px;
                    border-radius: 16px;
                    font-size: 0.85em;
                    font-weight: 500;
                `;
                chip.innerHTML = `${comp.ComponentName}: ${isAbsent ? 'Absent' : comp.ObtainedMarks}/${comp.MaxMarks}`;
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

    // Close popups on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.unfugly-marks-popup').forEach(p => p.style.display = 'none');
        document.querySelectorAll('.unfugly-att-popup').forEach(p => p.style.display = 'none');
    });
}




//Timetable UI Functions

/**
 * Replaces slots with course titles and classrooms in a given timetable table.
 * @param {object} courseData Object mapping slots to course information.
 * @param {HTMLElement} timetableTable The HTML table element to modify.
 */
function replaceSlotsWithCourseTitles(courseData, timetableTable, isGeneratedTable = false) {
    if (!timetableTable) {
        console.warn("replaceSlotsWithCourseTitles: Timetable table not provided.");
        return;
    }
    if (!isGeneratedTable) {
        timetableTable.align = '';
        timetableTable.border = '5px';
        timetableTable.style.border = '10px';
        timetableTable.style.maxWidth = '100%'; // Ensure full width for better visibility
        timetableTable.cellPadding = '10'; // Add some padding for better readability

        // Apply background color if not already applied (for the welcome page rendered table)
        if (timetableTable.style.backgroundColor === '') {
            timetableTable.style.backgroundColor = 'rgba(0, 0, 0, 1)';
        }
    }


    const initialRows = timetableTable.querySelectorAll('tbody tr');

    if (!isGeneratedTable) {
        if (initialRows[0]) {
            const row = initialRows[0];
            const cells = row.querySelectorAll('td, th');
            cells[0].textContent = 'Time'; // Ensure first cell is labeled "Time"
            for (let colIndex = 0; colIndex < cells.length; colIndex++) {
                const cell = cells[colIndex];
                cell.style.width = '120px'; // Set a fixed width for header cells
                cell.style.fontSize = '10px';
                cell.style.maxHeight = '40px'; // Make header text bold
                cell.rowSpan = '1'; // Ensure header cells are not merged
            }
        }

        // Remove the 3rd row (index 2) if it exists
        if (initialRows.length > 2) {
            if (initialRows[2].cells.length > 0 && initialRows[2].cells[0].textContent.includes('Hour/Day Order')) { // More robust check
                initialRows[2].remove();
            }
            initialRows[1].remove(); // Remove the second row (index 1) as well
        }
    }

    // Now query the active rows that actually exist in the DOM
    const allTableRows = timetableTable.querySelectorAll('tbody tr');

    // Remove last two columns if 'L' slots not required
    if (!window.extraSlotFlag) {
        allTableRows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length >= 2) { // Ensure there are at least two columns to potentially remove
                const secondToLast = cells[cells.length - 2];
                const last = cells[cells.length - 1];
                if (secondToLast) secondToLast.style.display = 'none';
                if (last) last.style.display = 'none';
            }
        });
    }

    // Replace slots with course titles
    let slotId = 1;

    // Slot map: built while iterating so it stays in sync with whatever
    // timetable the user's registration page actually returns.
    // dayOrder keys "1"–"5" match the calendar's dayOrder values.
    const dayOrderSlotMap = { '1': [], '2': [], '3': [], '4': [], '5': [] };
    // slotToCourse: slot letter → { title, courseType }
    // courseType derived from slot name: P# and L# are Practical, letter slots are Theory
    const slotToCourse = {};

    const startIndex = isGeneratedTable ? 0 : 1;

    for (let rowIndex = startIndex; rowIndex < allTableRows.length; rowIndex++) { // Iterate all rows after initial removals
        const row = allTableRows[rowIndex];
        if (!row) continue;

        const currentDayOrder = isGeneratedTable ? String(rowIndex + 1) : String(rowIndex);

        const firstCell = row.querySelector('td, th');
        if (firstCell.textContent.trim() === 'TO') {
            firstCell.remove(); // Remove the "TO" cell if it exists
        }
        if (firstCell) {
            if (!isGeneratedTable) {
                firstCell.style.width = '120px'; // Set a fixed width for header cells
                firstCell.style.fontSize = '10px';
            }
        }

        const cells = row.querySelectorAll('td, th');
        for (let colIndex = 1; colIndex < cells.length; colIndex++) {
            const cell = cells[colIndex];
            
            if (!isGeneratedTable) {
                cell.style.width = '120px'; // Reset width to auto for better fit
                cell.style.minWidth = '90px'; // Ensure minimum width for better fit
            }

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

                // ── Build slot map entry ──
                if (dayOrderSlotMap[currentDayOrder]) {
                    dayOrderSlotMap[currentDayOrder].push(cleanCellText);
                }
                // P# or L# slots are Practical; single letter slots (A–G, X) are Theory
                const isLabSlot = /^[PL]\d+/.test(cleanCellText);
                const courseTitle = courseInfo["Course Title"] || courseInfo.title || '';
                const courseClassroom = courseInfo["Room No."] || courseInfo.classroom || '';

                slotToCourse[cleanCellText] = {
                    title: courseTitle,
                    courseType: isLabSlot ? 'Practical' : 'Theory'
                };

                cell.title = `Slot: ${cellText}`;
                cell.innerHTML = ''; // Clear original content
                const titleSpan = document.createElement('span');
                titleSpan.textContent = courseTitle;
                titleSpan.style.fontWeight = '600';
                titleSpan.style.color = '#334';
                titleSpan.style.display = 'block';
                titleSpan.style.fontSize = '11px'; // Adjust font size for better fit
                titleSpan.classList.add('editedSlot-originalTitle');

                const classroomSpan = document.createElement('span');
                classroomSpan.textContent = courseClassroom ? `Room: ${courseClassroom}` : '';
                classroomSpan.style.fontWeight = 'semi-bold'; // Changed to normal for distinction
                classroomSpan.style.color = '#555';
                classroomSpan.style.fontSize = '9px';
                classroomSpan.style.display = 'block';
                classroomSpan.classList.add('editedSlot-originalClassroom');

                cell.appendChild(titleSpan);
                if (courseClassroom) cell.appendChild(classroomSpan);
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

    // Return the slot map so backgroundFetchAllData can persist it
    return { dayOrder: dayOrderSlotMap, slotToCourse };
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

    const timetablePanel = timetableTable.closest('.unfugly-panel');
    const captionElement = timetableTable.querySelector('caption.t1');

    // Find an existing button to prevent duplicates
    let downloadButton = (timetablePanel || captionElement)?.querySelector('#downloadTimetableButton');
    const buttonContainer = timetablePanel || captionElement || timetableTable.parentNode;

    if (!downloadButton) {
        downloadButton = document.createElement('button');
        downloadButton.id = 'downloadTimetableButton';
        downloadButton.title = 'Download Timetable';
        downloadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
        downloadButton.style.cssText = `
            position: absolute;
            top: 14px;
            right: 14px;
            z-index: 2;
            background-color: #1e1e1e;
            border: 1px solid #333;
            color: white;
            padding: 0;
            border-radius: 9999px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.25);
            transition: background-color 0.2s ease, transform 0.2s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            cursor: pointer;
        `;
        downloadButton.onmouseover = () => {
            downloadButton.style.backgroundColor = '#2a2a2a';
            downloadButton.style.transform = 'scale(1.03)';
        };
        downloadButton.onmouseout = () => {
            downloadButton.style.backgroundColor = '#1e1e1e';
            downloadButton.style.transform = 'scale(1)';
        };

        if (timetablePanel) {
            if (!timetablePanel.style.position || timetablePanel.style.position === 'static') {
                timetablePanel.style.position = 'relative';
            }
            timetablePanel.appendChild(downloadButton);
        } else if (captionElement) {
            captionElement.style.position = 'relative';
            captionElement.appendChild(downloadButton);
        } else {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `position: relative; width: 100%;`;
            timetableTable.parentNode.insertBefore(wrapper, timetableTable);
            wrapper.appendChild(downloadButton);
            wrapper.appendChild(timetableTable);
        }
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
        window.UnfuglyLog.warn('SCRP_01', "backgroundFetchAllData: A fetch is already in progress. Aborting new request.");
        return;
    }
    window.isFetchingInBackground = true;
    displayInfoMessage("Fetching latest data from SRM portal...", 5000);

    const storageKey = `unfuglyData_${currentNetId}`;
    const existingData = await chrome.storage.local.get(storageKey);
    const cachedProfileData = existingData?.[storageKey]?.profileData;

    const fetchedData = {
        profileData: cachedProfileData ?? null,
        editedSlots: null,
        timetableJSON: existingData?.[storageKey]?.timetableJSON ?? null,
        attendanceData: existingData?.[storageKey]?.attendanceData ?? null,
        marksData: existingData?.[storageKey]?.marksData ?? null,
        courseData: existingData?.[storageKey]?.courseData ?? null,
    };
    
    let batch = null;
    let courseRegResult = null;

    // Step 1: Course Registration (independent)
    try {
        window.UnfuglyLog.info('SCRP_01', "backgroundFetchAllData: Fetching Course Registration data natively...");
        const regStartTime = performance.now();
        courseRegResult = await fetchCourseRegistrationData();
        batch = courseRegResult.batch;
        fetchedData.courseData = courseRegResult.courses;
        fetchedData.profileData = courseRegResult.profileData;
        if (courseRegResult.registrationNo && !fetchedData.profileData?.registrationNo) {
            fetchedData.profileData.registrationNo = courseRegResult.registrationNo;
        }
        window.UnfuglyLog.info('SCRP_01', `[Unfugly Speed] Fetching and parsing Course Registration took ${(performance.now() - regStartTime).toFixed(2)} ms.`);
    } catch (regError) {
        window.UnfuglyLog.error('SCRP_01', `backgroundFetchAllData: Course Registration failed (will use cache): ${regError.message}`);
        // Fall back to cached course/profile data
        const cachedEntry = existingData?.[storageKey];
        if (cachedEntry) {
            fetchedData.courseData = cachedEntry.courseData ?? fetchedData.courseData;
            fetchedData.profileData = cachedEntry.profileData ?? fetchedData.profileData;
        }
    }

    // Step 2: Unified Timetable (independent)
    try {
        if (batch && (batch === '1' || batch === '2')) {
            window.UnfuglyLog.info('SCRP_01', `backgroundFetchAllData: Fetching Unified Timetable for Batch ${batch} natively...`);
            const ttStartTime = performance.now();
            const rawUnifiedTimetableHTML = await fetchUnifiedTimetableData(batch);
            if (rawUnifiedTimetableHTML) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = rawUnifiedTimetableHTML;
                const tempTable = tempDiv.querySelector('table[align="center"][border="5"][cellpadding="18"][cellspacing="2"][width="400"]');
                if (tempTable && fetchedData.courseData) {
                    fetchedData.timetableJSON = parseTableToJSON(tempTable);
                }
            }
            window.UnfuglyLog.info('SCRP_01', `[Unfugly Speed] Fetching Unified Timetable took ${(performance.now() - ttStartTime).toFixed(2)} ms.`);
        } else if (courseRegResult?.doc) {
            const regPageTtTable = courseRegResult.doc.querySelector('table[align="center"][border="5"]');
            if (regPageTtTable && fetchedData.courseData) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = regPageTtTable.outerHTML;
                fetchedData.timetableJSON = parseTableToJSON(tempDiv.querySelector('table'));
                window.UnfuglyLog.info('SCRP_01', "backgroundFetchAllData: Used Course Registration page timetable as fallback.");
            }
        } else {
            // Use cached timetable
            fetchedData.timetableJSON = existingData?.[storageKey]?.timetableJSON ?? null;
        }
    } catch (ttError) {
        window.UnfuglyLog.error('SCRP_02', `backgroundFetchAllData: Timetable fetch failed (will use cache): ${ttError.message}`);
        fetchedData.timetableJSON = existingData?.[storageKey]?.timetableJSON ?? null;
    }

    // Step 3: Attendance & Marks (independent)
    try {
        window.UnfuglyLog.info('SCRP_01', "backgroundFetchAllData: Fetching Attendance and Marks data natively...");
        const attStartTime = performance.now();
        const attendanceDataResult = await fetchAttendanceData(previousAttendanceData);
        fetchedData.attendanceData = attendanceDataResult.attendanceData;
        fetchedData.marksData = attendanceDataResult.marksData;
        window.UnfuglyLog.info('SCRP_01', `[Unfugly Speed] Fetching Attendance and Marks natively took ${(performance.now() - attStartTime).toFixed(2)} ms.`);
    } catch (attError) {
        window.UnfuglyLog.error('SCRP_01', `backgroundFetchAllData: Attendance/Marks fetch failed (will use cache): ${attError.message}`);
        fetchedData.attendanceData = existingData?.[storageKey]?.attendanceData ?? null;
        fetchedData.marksData = existingData?.[storageKey]?.marksData ?? null;
    }

    // Step 4: Profile photo & Edited Slots sync
    let dbEditedSlots = existingData?.[storageKey]?.editedSlots ?? {};
    let dbPhotoUrl = null;
    try {
        window.UnfuglyLog.info('SYNC_01', "backgroundFetchAllData: Checking DB for latest edits and photo...");
        const BACKEND = 'http://localhost:3000';
        const dbRes = await backgroundFetch(`${BACKEND}/api/v1/user/get/${currentNetId}`);
        if (dbRes.ok) {
            const dbData = await dbRes.json();
            dbPhotoUrl = dbData.profileData?.profile_image_url || dbData.profileData?.profilePhotoUrl;
            if (dbData.editedSlots !== undefined && dbData.editedSlots !== null) {
                dbEditedSlots = dbData.editedSlots;
            }
        }
    } catch (e) {
        window.UnfuglyLog.error('SYNC_02', `Failed to check DB for photo/edits: ${e.message}`);
    }

    try {
        const cachedPhotoUrl = cachedProfileData?.profilePhotoUrl;
        if (cachedPhotoUrl) {
            window.UnfuglyLog.info('SCRP_03', "backgroundFetchAllData: Profile photo URL found in cache. Skipping refetch.");
            if (fetchedData.profileData) fetchedData.profileData.profilePhotoUrl = cachedPhotoUrl;
        } else if (dbPhotoUrl) {
            window.UnfuglyLog.info('SCRP_03', "backgroundFetchAllData: Profile photo URL found in DB. Skipping scrape.");
            if (fetchedData.profileData) fetchedData.profileData.profilePhotoUrl = dbPhotoUrl;
        } else {
            window.UnfuglyLog.info('SCRP_03', "backgroundFetchAllData: Profile photo URL not in cache or DB. Scraping...");
            const photoStartTime = performance.now();
            const { iframeDoc: profilePhotoIframeDoc, iframe: profilePhotoIframe } = await createHiddenIframe(
                "https://academia.srmist.edu.in/#Report:Student_Profile_Report",
                ['#listReportMainContainer .ht_clone_top th.zcReport_HeaderEditColumn']
            );
            const profilePhotoUrl = await extractImageUrl(profilePhotoIframeDoc);
            if (fetchedData.profileData) fetchedData.profileData.profilePhotoUrl = profilePhotoUrl;
            profilePhotoIframe.remove();
            window.UnfuglyLog.info('SCRP_03', `[Unfugly Speed] Loading Student Profile Report took ${(performance.now() - photoStartTime).toFixed(2)} ms.`);
        }
    } catch (photoError) {
        window.UnfuglyLog.error('SCRP_03', `backgroundFetchAllData: Profile photo fetch failed: ${photoError.message}`);
    }

    // Step 5: Save whatever we managed to get to cache
    try {
        // Fetch the absolute latest local cache to prevent overwriting edits made during the background scrape
        const latestLocal = await chrome.storage.local.get(storageKey);
        const currentLocalEdits = latestLocal?.[storageKey]?.editedSlots ?? {};

        // Merge DB edits and local edits using only editedTitle and editedClassroom
        const mergedEdits = {};

        // Start with DB edits
        Object.keys(dbEditedSlots).forEach(slotId => {
            const entry = dbEditedSlots[slotId];
            if (entry) {
                const titleVal = entry.editedTitle ?? entry.title ?? '';
                const roomVal = entry.editedClassroom ?? entry.classroom ?? '';
                mergedEdits[slotId] = {
                    editedTitle: titleVal,
                    editedClassroom: roomVal
                };
            }
        });

        // Overwrite with local edits (which take priority)
        Object.keys(currentLocalEdits).forEach(slotId => {
            const entry = currentLocalEdits[slotId];
            if (entry) {
                const titleVal = entry.editedTitle ?? entry.title ?? '';
                const roomVal = entry.editedClassroom ?? entry.classroom ?? '';
                mergedEdits[slotId] = {
                    editedTitle: titleVal,
                    editedClassroom: roomVal
                };
            }
        });

        const dataToCache = {
            profileData: fetchedData.profileData,
            timetableJSON: fetchedData.timetableJSON,
            editedSlots: mergedEdits,
            attendanceData: fetchedData.attendanceData,
            marksData: fetchedData.marksData,
            courseData: fetchedData.courseData ?? null,
            lastUpdated: new Date().toISOString()
        };
        await chrome.storage.local.set({ [storageKey]: dataToCache });
        window.UnfuglyLog.info('SYNC_01', "backgroundFetchAllData: All data saved to cache (merged edits).");
    } catch (cacheError) {
        window.UnfuglyLog.error('SYNC_03', `backgroundFetchAllData: Failed to save data to cache: ${cacheError.message}`);
    }

    // Step 6: Update UI and sync calendar (independent)
    if (titleElement) titleElement.textContent = "Unfugly: Data updated!";

    try {
        await checkAndSyncCalendar();
    } catch (calError) {
        window.UnfuglyLog.error('CAL_03', `backgroundFetchAllData: Calendar sync failed: ${calError.message}`);
    }

    try {
        renderProfilePanel(fetchedData.profileData, appWrapper, dayOrder);
        renderAccordionPanels(fetchedData, previousAttendanceData, appWrapper, currentNetId);
        if (typeof loadEdits === 'function') { loadEdits(); }
        displayInfoMessage("All new data fetched and displayed!", 3000, 'success');
    } catch (renderError) {
        window.UnfuglyLog.error('SYS_01', `backgroundFetchAllData: Render failed: ${renderError.message}`);
        displayInfoMessage("Some data could not be loaded. Showing cached data.", 4000, 'error');
    }

    window.isFetchingInBackground = false;
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
        // console.warn("highlightCurrentDayOrder: Could not determine current Day Order. No rows will be highlighted.");
    } else {
        // console.log(`highlightCurrentDayOrder: Dulling out rows other than Day Order ${currentDayOrder}.`);
    }
}

//Page Router

/**
 * Determines the current page based on the URL hash and calls the appropriate handler.
 */
function handleCurrentPage() {
    const hash = window.location.hash;
    removeUnfuglyFeedbackPanel();
    console.log(`handleCurrentPage: Current hash is: ${hash}`);
    if (!window.location.href.includes('creatorapp.zoho.com/srm_university/')) {
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

            const navProfileSelector = '#zc-account-settings > a > img';
            waitForElement(document, navProfileSelector, 5000)
                .then(profileImg => {
                    secureImageSrc(profileImg);
                    const popoverImg = document.querySelector('#zc-account-dropdown > div.zc-user-details > span.zc-user-img > img');
                    secureImageSrc(popoverImg);
                    //console.log("Navbar profile photo secured.");
                })
                .catch(err => console.warn("Navbar profile photo not found within timeout."));
        }
    }

    if (hash.includes('#WELCOME')) {
        handleWelcomePage();
    } else if (hash.includes('#Page:My_Time_Table_2023_24')) {
        // Inject faculty hyperlinks into the course registration table on the live page
        waitForElement(document, 'table.course_tbl').then(tbl => {
            injectFacultyLinksInTable(tbl, 7);
        }).catch(() => {});
    } else if (hash.includes('#Page:My_Attendance')) {
        try {
            // Attempt to run the main function
            handleAttendancePage();
        } catch (error) {
            // If it crashes, log the error and run the fallback
            //console.warn("handleAttendancePage crashed. Running inlineMarksTotal instead.", error);
            inlineMarksTotal();
        }
        const attendanceProfileImgSelector = '#zc-viewcontainer_My_Attendance > div > div.cntdDiv > div > table:nth-child(2) > tbody > tr:nth-child(8) > td:nth-child(2) > img';
        waitForElement(document, attendanceProfileImgSelector, 10000)
            .then(profileImg => {
                secureImageSrc(profileImg);
                profileImg.style.border = '3px solid #1E88E5';
                //console.log("Attendance profile photo secured.");
            })
            .catch(err => console.warn("Attendance profile photo not found within timeout."));
    } else if (hash.includes('#Page:Academic_Status')) {
        marksTotalReport();
    } else if (hash.includes('#Course_Feedback')) {
        handleFeedbackPage();
    } else if (hash.includes('#Page:Academic_Planner_2025_26_EVEN') || hash.includes('#Page:Academic_Planner_2025_26_ODD') || hash.includes('#Page:Academic_Planner_2026_27_ODD')) {
        handleAcademicPlannerPage();
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
                    node.id.startsWith('zc-viewcontainer_WELCOME') || //zc-viewcontainer_WELCOME
                    node.id.startsWith('WELCOME_ZC_DCMHKR') ||
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

// --- NEW CALENDAR VIEW FULL LOGIC ---
function showCalendarViewFull(appWrapper) {
    const accordionWrapper = appWrapper.querySelector(".unfugly-accordion-wrapper");
    const profilePanel = appWrapper.querySelector(".profile-panel");
    if (accordionWrapper) accordionWrapper.style.display = "none";
    
    const detailsWrapper = profilePanel.querySelector("#unfugly-profile-details-wrapper");
    if (detailsWrapper) detailsWrapper.style.display = "none";

    let calendarMinimapContainer = profilePanel.querySelector("#unfugly-calendar-minimap-wrapper");
    if (!calendarMinimapContainer) {
        calendarMinimapContainer = document.createElement("div");
        calendarMinimapContainer.id = "unfugly-calendar-minimap-wrapper";
        calendarMinimapContainer.style.cssText = "display: flex; flex-direction: column; flex: 1; overflow-y: auto; margin-top: 15px;";
        profilePanel.appendChild(calendarMinimapContainer);
    }
    calendarMinimapContainer.style.display = "flex";
    calendarMinimapContainer.innerHTML = "";

    let calendarMainWrapper = appWrapper.querySelector("#unfugly-calendar-main-wrapper");
    if (!calendarMainWrapper) {
        calendarMainWrapper = document.createElement("div");
        calendarMainWrapper.id = "unfugly-calendar-main-wrapper";
        calendarMainWrapper.style.cssText = "flex: 3; background-color: #121212; border-radius: 8px; overflow-y: auto; box-shadow: 0 4px 8px rgba(0,0,0,0.2); padding: 20px;";
        appWrapper.appendChild(calendarMainWrapper);
    }
    calendarMainWrapper.style.display = "flex";
    calendarMainWrapper.style.flexDirection = "column";

    const backBtnContainer = document.createElement("div");
    backBtnContainer.style.cssText = "margin-top: auto; padding-top: 20px; width: 100%; display: flex; justify-content: center;";
    
    const backBtn = document.createElement("button");
    backBtn.innerHTML = "← Back to Dashboard";
    backBtn.style.cssText = "background: #1e1e1e; border: 1px solid #444; color: #fff; cursor: pointer; padding: 12px 20px; font-weight: bold; text-align: center; width: 100%; border-radius: 8px; font-size: 13px; transition: background 0.2s;";
    backBtn.onmouseover = () => backBtn.style.background = "#333";
    backBtn.onmouseout = () => backBtn.style.background = "#1e1e1e";
    backBtn.onclick = () => {
        calendarMinimapContainer.style.display = "none";
        calendarMainWrapper.style.display = "none";
        if (detailsWrapper) detailsWrapper.style.display = "block";
        if (accordionWrapper) accordionWrapper.style.display = "block";
    };
    backBtnContainer.appendChild(backBtn);

    const semesterHeader = document.createElement("div");
    semesterHeader.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 5px 0 16px 0; border-bottom: 1px solid #fff;";
    
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"15 18 9 12 15 6\"></polyline></svg>";
    prevBtn.style.cssText = "background: transparent; border: none; color: #fff; cursor: pointer;";
    
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"9 18 15 12 9 6\"></polyline></svg>";
    nextBtn.style.cssText = "background: transparent; border: none; color: #fff; cursor: pointer;";
    
    const semesterTitle = document.createElement("h4");
    semesterTitle.style.cssText = "margin: 0; color: #fff; text-align: center; font-size: 14px; font-weight: 600;";

    semesterHeader.appendChild(prevBtn);
    semesterHeader.appendChild(semesterTitle);
    semesterHeader.appendChild(nextBtn);
    calendarMinimapContainer.appendChild(semesterHeader);

    const monthListContainer = document.createElement("div");
    monthListContainer.style.cssText = "display: flex; flex-direction: column; gap: 5px;";
    calendarMinimapContainer.appendChild(monthListContainer);
    
    // Add the back button at the very bottom
    calendarMinimapContainer.appendChild(backBtnContainer);

    let currentSemesterKey = getCurrentSemesterKey();
    const semesters = ["2024_25_EVEN", "2025_26_ODD", "2025_26_EVEN", "2026_27_ODD"];
    let currentIndex = semesters.indexOf(currentSemesterKey);
    if (currentIndex === -1) currentIndex = 0;

    const loadSemester = (index) => {
        const semKey = semesters[index];
        semesterTitle.textContent = semKey.replace("_", "-");
        calendarMainWrapper.innerHTML = "<div style=\"color: #ccc; text-align: center; width: 100%; margin-top: 50px;\">Loading " + semKey + "...</div>";
        
        prevBtn.style.opacity = index === 0 ? "0.2" : "1";
        prevBtn.style.cursor = index === 0 ? "not-allowed" : "pointer";
        nextBtn.style.opacity = index === semesters.length - 1 ? "0.2" : "1";
        nextBtn.style.cursor = index === semesters.length - 1 ? "not-allowed" : "pointer";
        
        // Wait briefly just to ensure the UI updates before fetching
        setTimeout(() => {
            chrome.storage.local.get('unfuglyData_calendar', (res) => {
                const data = res.unfuglyData_calendar?.[semKey]?.data;
                if (data && Object.keys(data).length > 0) {
                    renderCalendarGridFull(calendarMainWrapper, monthListContainer, data);
                } else {
                    calendarMainWrapper.innerHTML = "<div style=\"color: #ccc; text-align: center; width: 100%; margin-top: 50px;\">Calendar data not available. Syncing...</div>";
                    monthListContainer.innerHTML = "";
                    syncCalendarForSemester(semKey).then(() => {
                        chrome.storage.local.get('unfuglyData_calendar', (res2) => {
                            const data2 = res2.unfuglyData_calendar?.[semKey]?.data;
                            if (data2 && Object.keys(data2).length > 0) {
                                renderCalendarGridFull(calendarMainWrapper, monthListContainer, data2);
                            } else {
                                calendarMainWrapper.innerHTML = "<div style=\"color: #ccc; text-align: center; width: 100%; margin-top: 50px;\">Failed to load calendar data.</div>";
                            }
                        });
                    });
                }
            });
        }, 50);
    };

    prevBtn.onclick = () => {
        if (currentIndex > 0) {
            currentIndex--;
            loadSemester(currentIndex);
        }
    };
    nextBtn.onclick = () => {
        if (currentIndex < semesters.length - 1) {
            currentIndex++;
            loadSemester(currentIndex);
        }
    };

    loadSemester(currentIndex);
}

function renderCalendarGridFull(mainView, monthListContainer, calendarData) {
    monthListContainer.innerHTML = "";
    mainView.innerHTML = "";

    let months = Object.keys(calendarData).sort((a, b) => {
        const parseMonth = (str) => new Date(str.replace("'", "20"));
        return parseMonth(a) - parseMonth(b);
    });

    if (months.length === 0) return;

    let selectedMonth = months[0];

    months.forEach(month => {
        const btn = document.createElement("button");
        btn.textContent = month;
        btn.style.cssText = "width: 100%; text-align: left; padding: 10px; background: transparent; border: none; border-radius: 5px; color: #ccc; cursor: pointer; transition: all 0.2s; position: relative;";
        if (month === selectedMonth) {
            btn.style.color = "white";
            btn.style.background = "#1E88E5";
        }
        btn.onclick = () => {
            Array.from(monthListContainer.children).forEach(c => {
                c.style.color = "#ccc";
                c.style.background = "transparent";
                c.style.borderBottom = "none";
            });
            btn.style.color = "white";
            btn.style.background = "#1E88E5";
            renderMonthGrid(mainView, month, calendarData[month]);
        };
        monthListContainer.appendChild(btn);
    });

    renderMonthGrid(mainView, selectedMonth, calendarData[selectedMonth]);
}

function renderMonthGrid(mainView, monthName, monthData) {
    mainView.innerHTML = "";
    mainView.scrollTop = 0;

    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;";
    
    const title = document.createElement("h1");
    title.textContent = monthName;
    title.style.margin = "0";
    title.style.color = "#1E88E5";
    header.appendChild(title);
    mainView.appendChild(header);

    const grid = document.createElement("div");
    grid.style.cssText = "display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; width: 100%;";
    
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    daysOfWeek.forEach(d => {
        const dayHeader = document.createElement("div");
        dayHeader.textContent = d;
        dayHeader.style.cssText = "text-align: center; font-weight: bold; padding: 10px; background-color: #1e1e1e; border-radius: 8px; color: #aaa;";
        grid.appendChild(dayHeader);
    });

    let startDayIndex = 0;
    if (monthData["1"] && monthData["1"].day) {
        startDayIndex = daysOfWeek.indexOf(monthData["1"].day);
        if (startDayIndex === -1) startDayIndex = 0;
    }

    for(let i = 0; i < startDayIndex; i++) {
        const emptySlot = document.createElement("div");
        grid.appendChild(emptySlot);
    }

    for (let i = 1; i <= 31; i++) {
        const dateStr = i.toString();
        if (monthData[dateStr]) {
            const dayInfo = monthData[dateStr];
            const dayCard = document.createElement("div");
            
            const isHoliday = dayInfo.dayOrder === "-" || dayInfo.dayOrder.toLowerCase() === "holiday" || dayInfo.event.toLowerCase().includes("holiday");
            const borderColor = isHoliday ? "#d32f2f" : "#444";
            const bg = isHoliday ? "rgba(211, 47, 47, 0.1)" : "#1e1e1e";
            
            dayCard.style.cssText = `background-color: ${bg}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; min-height: 100px; transition: all 0.2s;`;
            dayCard.onmouseover = () => {
                dayCard.style.transform = "translateY(-2px)";
                dayCard.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
            };
            dayCard.onmouseout = () => {
                dayCard.style.transform = "none";
                dayCard.style.boxShadow = "none";
            };

            const topRow = document.createElement("div");
            topRow.style.cssText = "display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;";
            
            const dateNum = document.createElement("span");
            dateNum.textContent = dateStr;
            dateNum.style.cssText = `font-size: 1.5em; font-weight: bold; color: ${isHoliday ? "#ef5350" : "#fff"};`;
            
            const doBadge = document.createElement("span");
            doBadge.textContent = dayInfo.dayOrder;
            doBadge.style.cssText = `background-color: ${isHoliday ? "#d32f2f" : "#1E88E5"}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold;`;
            
            topRow.appendChild(dateNum);
            topRow.appendChild(doBadge);
            dayCard.appendChild(topRow);

            const eventText = document.createElement("div");
            eventText.textContent = dayInfo.event !== "-" ? dayInfo.event : "";
            eventText.style.cssText = "color: #bbb; font-size: 0.9em; overflow-wrap: break-word;";
            dayCard.appendChild(eventText);

            grid.appendChild(dayCard);
        }
    }
    mainView.appendChild(grid);
}

