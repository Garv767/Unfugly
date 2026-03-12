const BACKEND = 'https://unfugly-backend.onrender.com';

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
    try {
        const response = await fetch(`${BACKEND}/save-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                net_id:            netId,
                profile_data:      data.profileData,
                attendance_json:   data.attendanceData   ?? null,
                marks_json:        data.marksData        ?? null,
                edited_slots_json: data.editedSlots      ?? null,
                timetable_html:    data.replacedTimetableHTML ?? null,
                last_updated_ist:  getISTString()
            })
        });

        const result = await response.json();
        console.log('UP:01 User sync OK — count:', result.sync_count);
    } catch (err) {
        console.error('ER:01 User sync failed:', err.message);
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
        const response = await fetch(`${BACKEND}/calendar`);
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
            await chrome.storage.local.set({
                unfuglyData_calendar: {
                    data:        serverCalendar.calendar_json,
                    lastUpdated: serverCalendar.updated_at  // ISO string for content.js 24hr check
                }
            });
            console.log('CAL:01 Copied fresh calendar from server');
            return;
        }

        // ── Server calendar is stale (≥ 24 hrs) — push local scraped data ──
        const stored = await chrome.storage.local.get('unfuglyData_calendar');
        const localCalendar = stored.unfuglyData_calendar;

        if (!localCalendar?.data || Object.keys(localCalendar.data).length === 0) {
            // No local calendar data to push yet; content.js will scrape it
            console.log('CAL:02 No local calendar data available yet');
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
        const postRes = await fetch(`${BACKEND}/calendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                calendar_json:    localCalendar.data,
                last_updated_ist: istString
            })
        });

        if (!postRes.ok) throw new Error(`Calendar update failed: ${postRes.status}`);
        console.log('CAL:03 Pushed local calendar to server');

    } catch (err) {
        console.error('ER:02 Calendar sync failed:', err.message);
    }
}

// ─────────────────────────────────────────────────────────────
// MAIN LISTENER — fires on every chrome.storage.local change
// ─────────────────────────────────────────────────────────────
chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;

    for (const [key, { newValue }] of Object.entries(changes)) {

        // Only handle user data keys (not the calendar key itself)
        if (
            key.startsWith('unfuglyData_') &&
            key !== 'unfuglyData_calendar' &&
            newValue?.profileData
        ) {
            const netId = key.replace('unfuglyData_', '');

            // 1. Sync full user data to backend
            await syncUserData(netId, newValue);

            // 2. Sync universal calendar as a side-effect
            await syncCalendar();
        }
    }
});