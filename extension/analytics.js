const BACKEND = 'http://localhost:3000';

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
// JWT Session Token Management
// ─────────────────────────────────────────────────────────────
async function getValidSessionToken(netId) {
    const data = await chrome.storage.local.get('unfugly_session_token');
    const session = data.unfugly_session_token;

    if (session && session.token && session.netId === netId && session.expiresAt > Date.now()) {
        return session.token;
    }

    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "get_academia_cookies" }, async (response) => {
            if (!response || !response.cookies) {
                return reject(new Error("Failed to get academia cookies"));
            }

            try {
                const res = await fetch(`${BACKEND}/api/v1/auth/extension-session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ net_id: netId, cookies: response.cookies })
                });

                if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);

                const result = await res.json();
                
                await chrome.storage.local.set({
                    unfugly_session_token: {
                        token: result.token,
                        expiresAt: result.expiresAt,
                        netId: netId
                    }
                });

                resolve(result.token);
            } catch (err) {
                reject(err);
            }
        });
    });
}

// ─────────────────────────────────────────────────────────────
// Syncs ALL user data (profile + attendance + marks + timetable)
// ─────────────────────────────────────────────────────────────
async function syncUserData(netId, data) {
    try {
        const token = await getValidSessionToken(netId);
        const response = await fetch(`${BACKEND}/v3/save-data`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                netId:          netId,
                profileData:    data.profileData,
                attendanceData: data.attendanceData   ?? null,
                marksData:      data.marksData        ?? null,
                editedSlots:    data.editedSlots      ?? null,
                timetableJSON:  data.timetableJSON    ?? null,
                courseData:     data.courseData       ?? null,
                lastUpdated:    getISTString(),
                source:         'extension'
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
            /* 
            await chrome.storage.local.set({
                unfuglyData_calendar: {
                    data:        serverCalendar.calendar_json,
                    lastUpdated: serverCalendar.updated_at  // ISO string for content.js 24hr check
                }
            });
            console.log('CAL:01 Copied fresh calendar from server');
            return;
            */
            console.log('CAL:01 Skipped copying fresh calendar from server to preserve new format');
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

        // For syncCalendar, we might need a token if it's protected by JWT now.
        // Wait, syncCalendar is generic, whose netId should we use? 
        // We'll just get the token for the current user in storage.
        const allData = await chrome.storage.local.get(null);
        let currentNetId = null;
        for (const k of Object.keys(allData)) {
            if (k.startsWith('unfuglyData_') && k !== 'unfuglyData_calendar') {
                currentNetId = k.replace('unfuglyData_', '');
                break;
            }
        }
        
        if (!currentNetId) return;
        const token = await getValidSessionToken(currentNetId);

        // Push to server
        const postRes = await fetch(`${BACKEND}/calendar`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
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