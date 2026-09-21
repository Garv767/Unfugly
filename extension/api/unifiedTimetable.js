// extension/api/unifiedTimetable.js

const UNIFIED_TIMETABLE_NATIVE_URLS = {
    '1': "https://academia.srmist.edu.in/srm_university/academia-academic-services/page/Unified_Time_Table_2025_Batch_1",
    '2': "https://academia.srmist.edu.in/srm_university/academia-academic-services/page/Unified_Time_Table_2025_batch_2"
};

/**
 * Fetches the Unified Timetable page Zoho payload natively.
 * @param {string} batch The student's batch ('1' or '2').
 * @returns {Promise<string>} The raw text response.
 */
async function fetchUnifiedTimetableRaw(batch) {
    const url = UNIFIED_TIMETABLE_NATIVE_URLS[batch];
    if (!url) {
        throw new Error(`Unsupported batch for unified timetable: ${batch}`);
    }
    const response = await fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch unified timetable: ${response.status}`);
    }
    return await response.text();
}

/**
 * Extracts and sanitizes the Zoho pageSanitizer HTML string.
 * @param {string} rawText The raw JavaScript/HTML Zoho payload.
 * @returns {Promise<Document|null>} A parsed HTML Document, or null.
 */
async function parseUnifiedTimetableHTML(rawText) {
    const matches = [...rawText.matchAll(/pageSanitizer\.sanitize\(['"](.*?)['"]\);/sg)];
    let bestHtml = null;

    // Search for a match that contains the table signature.
    for (const match of matches) {
        if (match[1] && match[1].includes('table') && match[1].includes('width=\\x22400\\x22')) {
            bestHtml = match[1];
            break;
        }
    }

    if (!bestHtml && matches.length > 0 && matches[0][1]) {
        bestHtml = matches[0][1];
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

/**
 * Extracts timetable HTML from the unified timetable document.
 * @param {Document} doc_context The parsed HTML document.
 * @returns {string|null} The outerHTML of the timetable table, or null if not found.
 */
function extractUnifiedTimetableHTML(doc_context) {
    if (!doc_context) return null;
    
    // In native HTML payload, the structure might be slightly different than iframe.
    // Try to find the exact table signature.
    let timetableTable = doc_context.querySelector('table[align="center"][border="5"][cellpadding="18"][cellspacing="2"][width="400"]');
    
    // Fallback: previous selector from content.js
    if (!timetableTable) {
        timetableTable = doc_context.querySelector('div > table:nth-child(5)');
    }

    if (timetableTable) {
        const captionElement = timetableTable.querySelector('caption.t1');
        if (captionElement) {
            // Apply table-caption to the caption to align its content and the new button
            captionElement.style.display = 'table-caption'; // Ensure it behaves like a caption
            captionElement.textContent = "Your Personalized Timetable by Unfugly";
            captionElement.style.marginTop = '5px';
        }

        return timetableTable.outerHTML;
    }
    return null;
}

/**
 * Fetches and parses the entire Unified Timetable page data natively.
 * @param {string} batch The student's batch.
 * @returns {Promise<string|null>} The raw unified timetable HTML string.
 */
async function fetchUnifiedTimetableData(batch) {
    const rawText = await fetchUnifiedTimetableRaw(batch);
    const doc = await parseUnifiedTimetableHTML(rawText);
    if (!doc) {
        throw new Error("Could not parse unified timetable Zoho payload.");
    }
    return extractUnifiedTimetableHTML(doc);
}
