// extension/api/calendar.js

/**
 * Fetches the Academic Planner page Zoho payload natively.
 * @param {string} url The calendar URL to fetch.
 * @returns {Promise<string>} The raw text response.
 */
async function fetchCalendarRaw(url) {
    const response = await fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch calendar from ${url}: ${response.status}`);
    }
    return await response.text();
}

async function parseCalendarHTML(rawText) {
    //console.log(`parseCalendarHTML: Received raw payload of length ${rawText.length}`);
    const parser = new DOMParser();
    let doc;
    
    // 1. Check for pageSanitizer wrapping (preserves your original fallback logic)
    const matches = [...rawText.matchAll(/pageSanitizer\.sanitize\(['"](.*?)['"]\);/sg)];
    //console.log(`parseCalendarHTML: Found ${matches.length} pageSanitizer matches`);
    
    if (matches.length > 0) {
        let cleanHtml = "";
        for (const match of matches) {
            cleanHtml += match[1]; 
        }
        
        cleanHtml = cleanHtml
            .replace(/\\x22/g, '"').replace(/\\x27/g, "'").replace(/\\\//g, '/')
            .replace(/\\n/g, '').replace(/\\r/g, '').replace(/\\t/g, '')
            .replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\-/g, '-')
            .replace(/\\\\/g, '');
            
        cleanHtml = cleanHtml
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            
        doc = parser.parseFromString(cleanHtml, 'text/html');
    } else {
        // 2. Parse the raw HTML safely first
        doc = parser.parseFromString(rawText, 'text/html');
        
        // 3. Look for Zoho's embedded zmlvalue attribute
        const placeholder = doc.querySelector('.zc-pb-embed-placeholder-content[zmlvalue]');
        
        if (placeholder) {
            //console.log("parseCalendarHTML: Found embedded 'zmlvalue' payload. Extracting...");
            
            // getAttribute naturally decodes &lt;, &#34;, etc. perfectly without regex
            const embeddedHtml = placeholder.getAttribute('zmlvalue');
            
            // 4. Re-parse the cleanly extracted string into our final working DOM
            doc = parser.parseFromString(embeddedHtml, 'text/html');
        }
    }
    
    //console.log("parseCalendarHTML: Parsed DOM body snippet:", doc.body.innerHTML.substring(0, 500));
    //console.log("parseCalendarHTML: Parsed DOM has tables:", doc.querySelectorAll('table').length);
    
    return doc;
}

/**
 * Extracts calendar data from the parsed document.
 * @param {Document} doc The parsed HTML document.
 * @param {string} url The URL to extract the academic year from.
 * @returns {Object} The scraped calendar data object.
 */
function extractCalendarData(doc, url) {
    let startYear = 0;
    let semesterType = '';
    const match = url.match(/Academic_Planner_(\d{4})_(\d{2})_(ODD|EVEN)/i);
    if (match) {
        startYear = parseInt(match[1]);
        semesterType = match[3].toUpperCase();
    }

    const tables = doc.querySelectorAll('table');
    let targetTable = null;
    let headerRowIndex = -1;

    //console.log(`extractCalendarData: Found ${tables.length} tables for ${url}`);

    for (let tIndex = 0; tIndex < tables.length; tIndex++) {
        const table = tables[tIndex];
        const rows = table.querySelectorAll('tr');
        //console.log(`  Table ${tIndex}: ${rows.length} rows`);
        
        // Search the first few rows for the month headers
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
            const cells = rows[i].querySelectorAll('th, td');
            //console.log(`    Row ${i}: ${cells.length} cells`);
            if (cells.length > 15) { // 6 months * 5 columns = 30 cells
                targetTable = table;
                headerRowIndex = i;
                break;
            }
        }
        if (targetTable) {
            //console.log(`  -> Selected Table ${tIndex} as target (Header at Row ${headerRowIndex})`);
            break;
        }
    }

    if (!targetTable) {
        console.warn(`extractCalendarData: Calendar table not found for ${url}.`);
        return {};
    }

    const currentUrlCalendar = {};
    const rows = targetTable.querySelectorAll('tbody tr, tr');
    const monthHeaderMap = {};
    
    // Process headers using the identified header row
    const headerRow = rows[headerRowIndex];
    let headers = headerRow.querySelectorAll('th');
    if (headers.length === 0) {
        headers = headerRow.querySelectorAll('td');
    }

    headers.forEach((cell, cellIndex) => {
        if (cellIndex % 5 === 2) {
            let monthName = cell.textContent.trim();
            if (monthName && monthName !== '-') {
                if (!monthName.includes("'") && startYear) {
                    let year = "";
                    if (semesterType === 'ODD') {
                        const isNextYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].some(m => monthName.startsWith(m));
                        year = isNextYear ? (startYear + 1).toString() : startYear.toString();
                    } else {
                        const isPrevYear = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].some(m => monthName.startsWith(m));
                        year = isPrevYear ? startYear.toString() : (startYear + 1).toString();
                    }
                    monthName = `${monthName} '${year.slice(-2)}`;
                }
                currentUrlCalendar[monthName] = {};
                monthHeaderMap[cellIndex - 2] = monthName;
            }
        }
    });

    // Process data rows (everything after the header row)
    for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const cols = row.querySelectorAll('td');
        for (let i = 0; i < cols.length; i += 5) {
            const dateValue = cols[i]?.textContent.trim();
            if (dateValue && dateValue !== '-' && !isNaN(parseInt(dateValue))) {
                const monthName = monthHeaderMap[i];
                if (monthName && currentUrlCalendar[monthName]) {
                    currentUrlCalendar[monthName][dateValue] = {
                        day: cols[i + 1]?.textContent.trim() || '',
                        dayOrder: cols[i + 3]?.textContent.trim() || '',
                        event: cols[i + 2]?.textContent.trim() || ''
                    };
                }
            }
        }
    }

    return currentUrlCalendar;
}

/**
 * Helper to get current semester key based on date
 */
function getCurrentSemesterKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    if (month <= 6) {
        return `${year - 1}_${year.toString().slice(-2)}_EVEN`;
    } else {
        return `${year}_${(year + 1).toString().slice(-2)}_ODD`;
    }
}

/**
 * Syncs a specific calendar semester.
 * @param {string} semesterKey - e.g., '2025_26_ODD'
 */
async function syncCalendarForSemester(semesterKey) {
    const BACKEND = 'https://unfugly-backend.onrender.com';
    const isCurrent = semesterKey === getCurrentSemesterKey();

    if (isCurrent) {
        const url = `https://academia.srmist.edu.in/srm_university/academia-academic-services/page/Academic_Planner_${semesterKey}`;
        try {
            console.log(`syncCalendarForSemester: Fetching ${url} via scraping (Current Sem)`);
            const rawText = await fetchCalendarRaw(url);
            const doc = await parseCalendarHTML(rawText);
            if (doc) {
                const calendarData = extractCalendarData(doc, url);
                if (Object.keys(calendarData).length > 0) {
                    const now = new Date();
                    const day = now.toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric" });
                    const month = now.toLocaleString("en-GB", { timeZone: "Asia/Kolkata", month: "short" });
                    const year = now.toLocaleString("en-GB", { timeZone: "Asia/Kolkata", year: "numeric" });
                    const time = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
                    const istTime = `${day} ${month} ${year}, ${time}`;

                    const updatedCalendarWrap = {
                        data: calendarData,
                        lastUpdated: istTime
                    };
                    
                    // POST scraped data to backend to update DB
                    fetch(`${BACKEND}/api/v1/calendar`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            calendar_json: calendarData,
                            semester: semesterKey,
                            last_updated_ist: istTime
                        })
                    }).catch(e => console.error("Failed to POST scraped calendar to backend", e));
                    
                    return new Promise((resolve) => {
                        chrome.storage.local.get(['unfuglyData_calendar'], (result) => {
                            let rootCalendar = result.unfuglyData_calendar || {};
                            rootCalendar[semesterKey] = updatedCalendarWrap;
                            chrome.storage.local.set({ 'unfuglyData_calendar': rootCalendar }, () => {
                                console.log(`syncCalendarForSemester: ${semesterKey} scraped and saved`);
                                resolve(updatedCalendarWrap);
                            });
                        });
                    });
                }
            }
        } catch (error) {
            console.error(`syncCalendarForSemester: Failed to scrape ${url}`, error);
            // Optionally, we could fallback to DB here, but we'll stick to user instructions.
        }
    } else {
        // Fetch from DB for older/other semesters
        const apiUrl = `${BACKEND}/api/v1/calendar?semester=${semesterKey}`;
        try {
            console.log(`syncCalendarForSemester: Fetching ${semesterKey} from backend API (Old Sem)`);
            const res = await fetch(apiUrl);
            if (res.ok) {
                const json = await res.json();
                if (json && json.calendar_json) {
                    const updatedCalendarWrap = {
                        data: json.calendar_json,
                        lastUpdated: "Fetched from DB"
                    };
                    return new Promise((resolve) => {
                        chrome.storage.local.get(['unfuglyData_calendar'], (result) => {
                            let rootCalendar = result.unfuglyData_calendar || {};
                            rootCalendar[semesterKey] = updatedCalendarWrap;
                            chrome.storage.local.set({ 'unfuglyData_calendar': rootCalendar }, () => {
                                console.log(`syncCalendarForSemester: ${semesterKey} fetched from DB and saved`);
                                resolve(updatedCalendarWrap);
                            });
                        });
                    });
                }
            }
        } catch (error) {
            console.error(`syncCalendarForSemester: Failed to fetch from DB for ${semesterKey}`, error);
        }
    }
    return null;
}

/**
 * Fetches all predefined calendar URLs natively, parses them, and stores the data per semester.
 */
async function syncAllCalendars() {
    console.log("syncAllCalendars: Starting native calendar sync.");
    const semestersToSync = [
        "2025_26_ODD",
        "2025_26_EVEN",
        "2026_27_ODD"
    ];

    for (const sem of semestersToSync) {
        await syncCalendarForSemester(sem);
    }
}
