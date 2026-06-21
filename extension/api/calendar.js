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
    // Determine the year for the months based on the URL (e.g. Academic_Planner_2025_26_ODD)
    let year = "";
    const match = url.match(/Academic_Planner_(\d{4})_(\d{2})_(ODD|EVEN)/i);
    if (match) {
        const startYear = parseInt(match[1]);
        // ODD semesters are in the starting year (e.g. Jul-Dec 2025), EVEN are in the next year (e.g. Jan-May 2026)
        year = (match[3].toUpperCase() === 'ODD') ? startYear.toString() : (startYear + 1).toString();
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
                if (!monthName.includes("'") && year) {
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
 * Fetches all predefined calendar URLs natively, parses them, and stores the merged data.
 */
async function syncAllCalendars() {
    console.log("syncAllCalendars: Starting native calendar sync.");
    const urls = [
        "https://academia.srmist.edu.in/srm_university/academia-academic-services/page/Academic_Planner_2025_26_ODD",
        "https://academia.srmist.edu.in/srm_university/academia-academic-services/page/Academic_Planner_2025_26_EVEN",
        "https://academia.srmist.edu.in/srm_university/academia-academic-services/page/Academic_Planner_2026_27_ODD"
    ];

    let mergedCalendarData = {};

    for (const url of urls) {
        try {
            console.log(`syncAllCalendars: Fetching ${url}`);
            const rawText = await fetchCalendarRaw(url);
            const doc = await parseCalendarHTML(rawText);
            if (doc) {
                const calendarData = extractCalendarData(doc, url);
                for (const month in calendarData) {
                    mergedCalendarData[month] = {
                        ...(mergedCalendarData[month] || {}),
                        ...calendarData[month]
                    };
                }
            }
        } catch (error) {
            console.error(`syncAllCalendars: Failed to process ${url}`, error);
        }
    }

    if (Object.keys(mergedCalendarData).length > 0) {
        chrome.storage.local.get('unfuglyData_calendar', (result) => {
            const oldCalendarWrap = result.unfuglyData_calendar || { data: {}, lastUpdated: null };

            const now = new Date();
            const day = now.toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric" });
            const month = now.toLocaleString("en-GB", { timeZone: "Asia/Kolkata", month: "short" });
            const year = now.toLocaleString("en-GB", { timeZone: "Asia/Kolkata", year: "numeric" });
            const time = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
            const istTime = `${day} ${month} ${year}, ${time}`;

            const updatedCalendarWrap = {
                data: mergedCalendarData, // Replace completely to flush out old formatted keys
                lastUpdated: istTime
            };

            chrome.storage.local.set({ 'unfuglyData_calendar': updatedCalendarWrap }, () => {
                console.log(`syncAllCalendars: Calendar Updated at ${istTime}`);
            });
        });
    } else {
        console.warn("syncAllCalendars: No calendar data extracted from any URL.");
    }
}
