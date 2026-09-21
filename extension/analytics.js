const BACKEND = 'https://unfugly-backend.onrender.com';

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
// Debounce map — keyed by netId, ensures only one save fires
// per 5-second window even if storage.onChanged fires 3+ times
// during a background scrape cycle (MED-05 fix)
// ─────────────────────────────────────────────────────────────
const _syncTimers = {};

// ─────────────────────────────────────────────────────────────
// Syncs ALL user data (profile + attendance + marks + timetable)
// ─────────────────────────────────────────────────────────────
async function syncUserData(netId, data) {
    // Pass through last_edited meta-key from editedSlots to backend
    const editedSlots = data.editedSlots ? { ...data.editedSlots } : null;

    const payload = {
        netId:          netId,
        profileData:    data.profileData,
        attendanceData: data.attendanceData   ?? null,
        marksData:      data.marksData        ?? null,
        editedSlots:    editedSlots           ?? null,
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
// MAIN LISTENER — fires on every chrome.storage.local change
// ─────────────────────────────────────────────────────────────
chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;

    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {

        if (key === 'unfuglyData_calendar') {
            // DEPRECATED: Calendar syncing is now handled per-semester by api/calendar.js
            continue;
        } else if (
            key.startsWith('unfuglyData_') &&
            key !== 'unfuglyData_calendar' &&
            newValue?.profileData
        ) {
            const netId = key.replace('unfuglyData_', '');

            // MED-05: Debounce — collapse multiple rapid storage writes into one save call
            if (_syncTimers[netId]) clearTimeout(_syncTimers[netId]);
            _syncTimers[netId] = setTimeout(async () => {
                delete _syncTimers[netId];
                // Re-read the very latest value at fire time (not the stale closure value)
                const latest = await chrome.storage.local.get(key).catch(() => ({}));
                const latestData = latest[key];
                if (latestData?.profileData) {
                    await syncUserData(netId, latestData);
                }
            }, 5000); // 5-second debounce window
        }
    }
});