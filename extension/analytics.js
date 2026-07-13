const BACKEND = 'http://localhost:3000';

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

// ─────────────────────────────────────────────────────────────
// Generates an IST-formatted string: "13 Mar 2026, 1:26 am"
// ─────────────────────────────────────────────────────────────
function getISTString() {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    const day   = ist.getDate();
    const month = ist.toLocaleString('en-US', { month: 'short' });
    const year  = ist.getFullYear();
    let   hours = ist.getHours();
    const mins  = String(ist.getMinutes()).padStart(2, '0');
    const ampm  = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;

    return `${day} ${month} ${year}, ${hours}:${mins} ${ampm}`;
}



// ─────────────────────────────────────────────────────────────
// Syncs ALL user data (profile + attendance + marks + timetable)
// ─────────────────────────────────────────────────────────────
async function syncUserData(netId, data) {
    const payload = {
        netId:          netId,
        profileData:    data.profileData,
        attendanceData: data.attendanceData   ?? null,
        marksData:      data.marksData        ?? null,
        editedSlots:    data.editedSlots      ?? null,
        timetableJSON:  data.timetableJSON    ?? null,
        courseData:     data.courseData       ?? null,
        lastUpdated:    getISTString(),
        source:         'extension'
    };
    UnfuglyLog.info('SYNC_01', `Syncing user data to backend. netId: ${netId}`);
    try {
        const response = await backgroundFetch(`${BACKEND}/api/v1/user/save`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const json = await response.json();
        if (!response.ok) {
            UnfuglyLog.error('SYNC_02', `User sync failed (HTTP ${response.status}):`, json);
            return;
        }
        UnfuglyLog.info('SYNC_01', `User sync OK — count: ${json.sync_count}`);
    } catch (err) {
        UnfuglyLog.error('SYNC_02', `User sync failed: ${err.message}`);
    }
}

// ─────────────────────────────────────────────────────────────
// Universal calendar sync logic:
//
//  GET /calendar from server
//  ├─ server.updated_at < 24 hrs ago → copy server calendar locally
//  └─ server.updated_at ≥ 24 hrs ago → use local scraped calendar,
//                                       POST it to server
// ─────────────────────────────────────────────────────────────
async function syncCalendar() {
    try {
        // Fetch universal calendar from server
        const response = await backgroundFetch(`${BACKEND}/calendar`);
        if (!response.ok) throw new Error(`Calendar fetch failed: ${response.status}`);

        const serverCalendar = await response.json();

        const now             = Date.now();
        const serverUpdatedAt = serverCalendar.updated_at
            ? new Date(serverCalendar.updated_at).getTime()
            : 0;
        const hoursSinceUpdate = (now - serverUpdatedAt) / (1000 * 60 * 60);

        // ── Server calendar is fresh (updated by someone else < 24 hrs ago) ──
        if (
            serverCalendar.calendar_json &&
            Object.keys(serverCalendar.calendar_json).length > 0 &&
            hoursSinceUpdate < 24
        ) {
            // Copy server's calendar to local storage
            /* 
            await chrome.storage.local.set({
                unfuglyData_calendar: {
                    data:        serverCalendar.calendar_json,
                    lastUpdated: serverCalendar.updated_at  // ISO string for content.js 24hr check
                }
            });
            UnfuglyLog.info('CAL_03', 'Copied fresh calendar from server');
            return;
            */
            UnfuglyLog.info('CAL_03', 'Skipped copying fresh calendar from server to preserve new format');
        }

        // ── Server calendar is stale (≥ 24 hrs) — push local scraped data ──
        const stored = await chrome.storage.local.get('unfuglyData_calendar');
        const localCalendar = stored.unfuglyData_calendar;

        if (!localCalendar?.data || Object.keys(localCalendar.data).length === 0) {
            // No local calendar data to push yet; content.js will scrape it
            UnfuglyLog.info('CAL_03', 'No local calendar data available yet');
            return;
        }

        const istString = getISTString();

        // Update local lastUpdated so content.js won't re-scrape for 24hrs
        await chrome.storage.local.set({
            unfuglyData_calendar: {
                data:        localCalendar.data,
                lastUpdated: new Date().toISOString()
            }
        });

        // Push to server
        const postRes = await backgroundFetch(`${BACKEND}/calendar`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                calendar_json:    localCalendar.data,
                last_updated_ist: istString
            })
        });

        if (!postRes.ok) throw new Error(`Calendar update failed: ${postRes.status}`);
        UnfuglyLog.info('CAL_02', 'Pushed local calendar to server');

    } catch (err) {
        UnfuglyLog.error('CAL_03', `Calendar sync failed: ${err.message}`);
    }
}

// ─────────────────────────────────────────────────────────────
// MAIN LISTENER — fires on every chrome.storage.local change
// ─────────────────────────────────────────────────────────────
chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;

    for (const [key, { newValue }] of Object.entries(changes)) {

        if (key === 'unfuglyData_calendar') {
            await syncCalendar();
        } else if (
            key.startsWith('unfuglyData_') &&
            key !== 'unfuglyData_calendar' &&
            newValue?.profileData
        ) {
            const netId = key.replace('unfuglyData_', '');

            // 1. Sync full user data to backend
            await syncUserData(netId, newValue);
        }
    }
});