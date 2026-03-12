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
// MAIN LISTENER — fires on every chrome.storage.local change
// ─────────────────────────────────────────────────────────────
chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;

    for (const [key, { newValue }] of Object.entries(changes)) {

        if (
            key.startsWith('unfuglyData_') &&
            newValue?.profileData
        ) {
            const netId = key.replace('unfuglyData_', '');

            // 1. Sync full user data to backend
            await syncUserData(netId, newValue);

        }
    }
});