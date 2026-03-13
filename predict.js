// predict.js — Attendance prediction logic + UI for Unfugly
// Depends on:
//   unfuglyData_<netId>.attendanceData  (with courseType field)
//   unfuglyData_<netId>.slotMap         (built by replaceSlotsWithCourseTitles)
//   unfuglyData_calendar.data           (calendar day orders per date)


// ─────────────────────────────────────────────────────────────
// CALENDAR HELPERS
// ─────────────────────────────────────────────────────────────

function formatMonthKey(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = String(date.getFullYear()).slice(2);
    return `${months[date.getMonth()]} '${year}`;
}

function getDayOrderForDate(date, calendarData) {
    const monthKey = formatMonthKey(date);
    const dayKey   = String(date.getDate());
    const dayData  = calendarData?.[monthKey]?.[dayKey];
    if (!dayData || dayData.dayOrder === '-') return null;
    return dayData.dayOrder;
}


// ─────────────────────────────────────────────────────────────
// SLOT COUNTING
// ─────────────────────────────────────────────────────────────

function countSlotsInRange(fromDate, toDate, dayOrderSlotMap, calendarData) {
    const slotCounts = {};
    const current = new Date(fromDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
        const dayOrder = getDayOrderForDate(current, calendarData);
        if (dayOrder && dayOrderSlotMap[dayOrder]) {
            for (const slot of dayOrderSlotMap[dayOrder]) {
                slotCounts[slot] = (slotCounts[slot] || 0) + 1;
            }
        }
        current.setDate(current.getDate() + 1);
    }
    return slotCounts;
}


// ─────────────────────────────────────────────────────────────
// CORE PREDICTION
// ─────────────────────────────────────────────────────────────

function predictAttendance(attendanceData, slotMap, calendarData, startDateStr, endDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    endDate.setHours(0, 0, 0, 0);

    const { dayOrder: dayOrderSlotMap, slotToCourse } = slotMap;

    // Gap: today → day before startDate (assume user attends everything)
    const gapEnd = new Date(startDate);
    gapEnd.setDate(gapEnd.getDate() - 1);
    const gapSlotCounts = (today <= gapEnd)
        ? countSlotsInRange(today, gapEnd, dayOrderSlotMap, calendarData)
        : {};

    // Skip range: startDate → endDate (assume user absent)
    const rangeSlotCounts = countSlotsInRange(startDate, endDate, dayOrderSlotMap, calendarData);

    // Map slot counts → per-course counts, keyed by title::courseType
    const courseCounts = {};
    for (const [slot, courseInfo] of Object.entries(slotToCourse)) {
        const key = `${courseInfo.title}::${courseInfo.courseType}`;
        if (!courseCounts[key]) courseCounts[key] = { gap: 0, skipped: 0 };
        courseCounts[key].gap     += gapSlotCounts[slot]   || 0;
        courseCounts[key].skipped += rangeSlotCounts[slot] || 0;
    }

    return attendanceData.map(course => {
        const key    = `${course.courseTitle}::${course.courseType}`;
        const counts = courseCounts[key] || { gap: 0, skipped: 0 };

        const projectedConducted = course.hoursConducted  + counts.gap;
        const projectedAttended  = course.attendedClasses + counts.gap;
        const finalConducted     = projectedConducted + counts.skipped;
        const finalAttended      = projectedAttended; // absent in range, unchanged

        const predictedPct = finalConducted > 0
            ? parseFloat(((finalAttended / finalConducted) * 100).toFixed(2))
            : 0;

        let canSkip      = 0;
        let needToAttend = 0;
        if (predictedPct >= 75) {
            canSkip = Math.max(0, Math.floor((finalAttended / 0.75) - finalConducted));
        } else {
            needToAttend = Math.max(0, Math.ceil((0.75 * finalConducted - finalAttended) / 0.25));
        }

        return {
            courseCode:      course.courseCode,
            courseTitle:     course.courseTitle,
            courseType:      course.courseType,
            currentPct:      course.percentage,
            gapClassesAdded: counts.gap,
            classesSkipped:  counts.skipped,
            finalConducted,
            finalAttended,
            predictedPct,
            canSkip,
            needToAttend
        };
    });
}


// ─────────────────────────────────────────────────────────────
// STORAGE ENTRY POINT
// ─────────────────────────────────────────────────────────────

function runPrediction(netId, startDateStr, endDateStr, callback) {
    chrome.storage.local.get([`unfuglyData_${netId}`, 'unfuglyData_calendar'], (result) => {
        const userData     = result[`unfuglyData_${netId}`];
        const calendarWrap = result['unfuglyData_calendar'];

        if (!userData?.attendanceData || !userData?.slotMap) {
            callback(null, 'Missing attendance or slot map data. Please refresh your data first.');
            return;
        }
        if (!calendarWrap?.data || Object.keys(calendarWrap.data).length === 0) {
            callback(null, 'Calendar data not available. Please visit the Academic Planner page first.');
            return;
        }

        const predictions = predictAttendance(
            userData.attendanceData,
            userData.slotMap,
            calendarWrap.data,
            startDateStr,
            endDateStr
        );
        callback(predictions, null);
    });
}


// ─────────────────────────────────────────────────────────────
// UI — PREDICT BUTTON (injected beside Attendance heading)
// ─────────────────────────────────────────────────────────────

/**
 * Injects the Predict button inside the attendance panel header.
 * Call this after the attendance panel is created in renderAccordionPanels.
 * @param {HTMLElement} attendancePanel  — the .unfugly-panel div for attendance
 * @param {string}      netId
 */
function injectPredictButton(attendancePanel, netId) {
    const heading = attendancePanel.querySelector('h3');
    if (!heading) return;

    heading.style.cssText = `
        color: #fff;
        display: flex;
        align-items: center;
        margin: 1.0rem 0 0.5rem 0;
    `;

    const btn = document.createElement('button');
    btn.id = 'unfugly-predict-btn';
    btn.textContent = '✦ Predict';
    btn.style.cssText = `
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.15);
        color: #a8d8ff;
        font-size: 0.78em;
        margin-left: 20px;
        font-weight: 600;
        letter-spacing: 0.05em;
        padding: 4px 12px;
        border-radius: 20px;
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s, transform 0.15s;
        backdrop-filter: blur(4px);
    `;
    btn.onmouseenter = () => {
        btn.style.background  = 'rgba(168,216,255,0.12)';
        btn.style.borderColor = 'rgba(168,216,255,0.45)';
        btn.style.transform   = 'translateY(-1px)';
    };
    btn.onmouseleave = () => {
        btn.style.background  = 'rgba(255,255,255,0.06)';
        btn.style.borderColor = 'rgba(255,255,255,0.15)';
        btn.style.transform   = 'translateY(0)';
    };
    btn.addEventListener('click', () => openPredictModal(netId));
    heading.appendChild(btn);
}


// ─────────────────────────────────────────────────────────────
// UI — MODAL
// ─────────────────────────────────────────────────────────────

async function openPredictModal(netId) {
    if (document.getElementById('unfugly-predict-modal')) return;

    // Fetch Calendar data to determine the maximum available date
    const storageResult = await chrome.storage.local.get('unfuglyData_calendar');
    const calendarData = storageResult.unfuglyData_calendar?.data || {};

    let maxDateStr = null;
    let maxDate = new Date(0);

    // Calculate max date from calendar data keys
    for (const monthKey in calendarData) {
        const cleanMonthKey = monthKey.replace(/['\-]/g, ' 20'); // Convert "Jul'25" to "Jul 2025"
        for (const dayKey in calendarData[monthKey]) {
            const d = new Date(`${dayKey} ${cleanMonthKey}`);
            if (!isNaN(d) && d > maxDate) {
                maxDate = d;
            }
        }
    }

    if (maxDate.getTime() > 0) {
        // Format to YYYY-MM-DD cleanly using local time
        const yyyy = maxDate.getFullYear();
        const mm = String(maxDate.getMonth() + 1).padStart(2, '0');
        const dd = String(maxDate.getDate()).padStart(2, '0');
        maxDateStr = `${yyyy}-${mm}-${dd}`;
    }

    // Keyframe styles — injected once
    if (!document.getElementById('unfugly-predict-styles')) {
        const style = document.createElement('style');
        style.id = 'unfugly-predict-styles';
        style.textContent = `
            @keyframes unfuglyFadeIn  { from { opacity:0 } to { opacity:1 } }
            @keyframes unfuglySlideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
            @keyframes unfuglyCardIn  { from { opacity:0; transform:translateY(8px)  } to { opacity:1; transform:translateY(0) } }
            #unfugly-predict-modal ::-webkit-scrollbar { width:4px }
            #unfugly-predict-modal ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px }
            #unfugly-predict-modal input[type="date"]::-webkit-calendar-picker-indicator { filter:invert(0.7); cursor:pointer }
        `;
        document.head.appendChild(style);
    }

    // ── Backdrop ──
    const backdrop = document.createElement('div');
    backdrop.id = 'unfugly-predict-modal';
    backdrop.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.65);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        animation: unfuglyFadeIn 0.2s ease;
    `;
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closePredictModal(); });

    // ── Modal box ──
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: rgba(22,22,30,0.97);
        border: 1px solid rgba(255,255,255,0.09);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 16px;
        padding: 1.5rem;
        width: 100%;
        max-width: 560px;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 24px 64px rgba(0,0,0,0.7);
        animation: unfuglySlideUp 0.25s ease;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.1) transparent;
    `;

    // ── Header ──
    const header = document.createElement('div');
    header.style.cssText = `display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem;`;

    const title = document.createElement('div');
    title.style.cssText = `color:#fff; font-size:1.05em; font-weight:700; letter-spacing:0.02em;`;
    title.textContent = '✦ Predict Attendance';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `background:transparent; border:none; color:#666; font-size:1.1em; cursor:pointer; padding:2px 6px; border-radius:6px; transition:color 0.2s;`;
    closeBtn.onmouseenter = () => closeBtn.style.color = '#fff';
    closeBtn.onmouseleave = () => closeBtn.style.color = '#666';
    closeBtn.addEventListener('click', closePredictModal);
    header.appendChild(title);
    header.appendChild(closeBtn);

    // ── Date pickers ──
    // Create 'today' formatted properly in local timezone to avoid weird UTC offset jumps
    const todayObj = new Date();
    const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    const dateRow = document.createElement('div');
    dateRow.style.cssText = `display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1rem;`;

    function makeField(labelText, inputId, defaultVal, maxVal) {
        const wrap = document.createElement('div');
        wrap.style.cssText = `display:flex; flex-direction:column; gap:0.3rem;`;

        const lbl = document.createElement('label');
        lbl.setAttribute('for', inputId);
        lbl.textContent = labelText;
        lbl.style.cssText = `color:#888; font-size:0.75em; letter-spacing:0.05em; text-transform:uppercase;`;

        const inp = document.createElement('input');
        inp.type  = 'date';
        inp.id    = inputId;
        inp.value = defaultVal;
        
        // Setup safety rails: Min is today, Max is the last day scraped from calendar
        inp.min = today; 
        if (maxVal) {
            inp.max = maxVal;
            // Edge case: If the calendar data is completely out of date and ends before "today"
            if (today > maxVal) inp.min = maxVal; 
        }

        inp.style.cssText = `
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            color: #fff;
            padding: 8px 10px;
            font-size: 0.9em;
            width: 100%;
            box-sizing: border-box;
            cursor: pointer;
            outline: none;
            transition: border-color 0.2s;
            color-scheme: dark;
        `;
        inp.onfocus = () => inp.style.borderColor = 'rgba(168,216,255,0.45)';
        inp.onblur  = () => inp.style.borderColor = 'rgba(255,255,255,0.1)';

        wrap.appendChild(lbl);
        wrap.appendChild(inp);
        return wrap;
    }

    dateRow.appendChild(makeField('From', 'predict-start-date', today, maxDateStr));
    dateRow.appendChild(makeField('To',   'predict-end-date',   today, maxDateStr));

    // ── Run button ──
    const runBtn = document.createElement('button');
    runBtn.id = 'predict-run-btn';
    runBtn.textContent = 'Run Prediction';
    runBtn.style.cssText = `
        width: 100%;
        padding: 10px;
        background: rgba(168,216,255,0.1);
        border: 1px solid rgba(168,216,255,0.25);
        border-radius: 10px;
        color: #a8d8ff;
        font-size: 0.92em;
        font-weight: 600;
        cursor: pointer;
        letter-spacing: 0.04em;
        transition: background 0.2s, transform 0.15s;
        margin-bottom: 1.2rem;
    `;
    runBtn.onmouseenter = () => { runBtn.style.background = 'rgba(168,216,255,0.18)'; runBtn.style.transform = 'translateY(-1px)'; };
    runBtn.onmouseleave = () => { runBtn.style.background = 'rgba(168,216,255,0.1)';  runBtn.style.transform = 'translateY(0)'; };

    // ── Results container ──
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'predict-results';

    // ── Wire up run button ──
    runBtn.addEventListener('click', () => {
        const startVal = document.getElementById('predict-start-date').value;
        const endVal   = document.getElementById('predict-end-date').value;

        if (!startVal || !endVal) {
            showPredictError(resultsContainer, 'Please select both dates.');
            return;
        }
        if (endVal < startVal) {
            showPredictError(resultsContainer, '"To" date cannot be before "From" date.');
            return;
        }

        runBtn.textContent = 'Calculating...';
        runBtn.disabled    = true;

        runPrediction(netId, startVal, endVal, (results, err) => {
            runBtn.textContent = 'Run Prediction';
            runBtn.disabled    = false;

            if (err) { showPredictError(resultsContainer, err); return; }
            renderPredictResults(resultsContainer, results, startVal, endVal);
        });
    });

    modal.appendChild(header);
    modal.appendChild(dateRow);
    modal.appendChild(runBtn);
    modal.appendChild(resultsContainer);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
}

function closePredictModal() {
    const modal = document.getElementById('unfugly-predict-modal');
    if (modal) modal.remove();
}


// ─────────────────────────────────────────────────────────────
// UI — RESULTS RENDERING
// ─────────────────────────────────────────────────────────────

function showPredictError(container, msg) {
    container.innerHTML = `
        <div style="
            background: rgba(244,67,54,0.08);
            border: 1px solid rgba(244,67,54,0.25);
            border-radius: 10px;
            padding: 12px 16px;
            color: #E57373;
            font-size: 0.88em;
            text-align: center;
        ">${msg}</div>
    `;
}

function renderPredictResults(container, results, startDateStr, endDateStr) {
    container.innerHTML = '';

    // ── Summary banner ──
    const fmt = d => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
    const totalSkipped = results.reduce((s, r) => s + r.classesSkipped, 0);

    const banner = document.createElement('div');
    banner.style.cssText = `
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 10px;
        padding: 9px 14px;
        margin-bottom: 0.9rem;
        color: #888;
        font-size: 0.81em;
        text-align: center;
        letter-spacing: 0.02em;
    `;
    banner.innerHTML = `Absent for <b style="color:#fff;">${totalSkipped}</b> class${totalSkipped !== 1 ? 'es' : ''} &nbsp;·&nbsp; <b style="color:#fff;">${fmt(startDateStr)}</b> → <b style="color:#fff;">${fmt(endDateStr)}</b>`;
    container.appendChild(banner);

    // ── Cards grid ──
    const grid = document.createElement('div');
    grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 0.7rem;
    `;

    results.forEach((item, i) => {
        const delta       = parseFloat((item.predictedPct - item.currentPct).toFixed(2));
        const isOk        = item.predictedPct >= 75;
        const accentColor = isOk ? '#81C784' : '#E57373';
        const bgColor     = isOk ? 'rgba(76,175,80,0.08)'   : 'rgba(244,67,54,0.08)';
        const borderColor = isOk ? 'rgba(76,175,80,0.22)'   : 'rgba(244,67,54,0.22)';
        const deltaColor  = delta < 0 ? '#E57373' : delta > 0 ? '#81C784' : '#555';
        const deltaLabel  = delta === 0 ? '—' : delta > 0 ? `▲ +${delta}%` : `▼ ${delta}%`;
        const marginLine  = isOk
            ? `Can still skip &nbsp;<b style="color:#81C784;">${item.canSkip}</b>`
            : `Need &nbsp;<b style="color:#E57373;">${item.needToAttend}</b>&nbsp; more to reach 75%`;

        const card = document.createElement('div');
        card.style.cssText = `
            background: #191921;
            border: 1px solid ${borderColor};
            border-radius: 12px;
            padding: 0.9rem 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
            box-shadow: 0 2px 12px rgba(0,0,0,0.3);
            animation: unfuglyCardIn 0.3s ease both;
            animation-delay: ${i * 0.045}s;
            transition: transform 0.2s, box-shadow 0.2s;
        `;
        card.onmouseenter = () => { card.style.transform = 'translateY(-3px)'; card.style.boxShadow = '0 6px 20px rgba(0,0,0,0.45)'; };
        card.onmouseleave = () => { card.style.transform = 'translateY(0)';    card.style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)'; };

        card.innerHTML = `
            <!-- Course name + predicted % badge -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
                <div style="flex:1; min-width:0;">
                    <div style="font-size:0.7em; color:#555; margin-bottom:2px;">
                        ${item.courseCode} &nbsp;·&nbsp; ${item.courseType}
                    </div>
                    <div style="font-size:0.93em; font-weight:700; color:#dde; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"
                         title="${item.courseTitle}">${item.courseTitle}</div>
                </div>
                <div style="
                    background:${bgColor};
                    border:1px solid ${borderColor};
                    color:${accentColor};
                    border-radius:8px;
                    padding:3px 9px;
                    font-size:0.88em;
                    font-weight:700;
                    white-space:nowrap;
                    flex-shrink:0;
                ">${item.predictedPct.toFixed(2)}%</div>
            </div>

            <!-- Arrow row: current → predicted + delta -->
            <div style="display:flex; align-items:center; gap:0.45rem; font-size:0.8em; color:#666;">
                <span>${item.currentPct.toFixed(2)}%</span>
                <span style="color:#444;">→</span>
                <span style="color:${accentColor}; font-weight:600;">${item.predictedPct.toFixed(2)}%</span>
                <span style="margin-left:auto; color:${deltaColor}; font-weight:600; font-size:0.95em;">${deltaLabel}</span>
            </div>

            <!-- Stats row -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.35rem; font-size:0.78em; color:#666;">
                <div>Skipped: <b style="color:#aaa;">${item.classesSkipped}</b></div>
                <div>Gap attended: <b style="color:#aaa;">${item.gapClassesAdded}</b></div>
            </div>

            <!-- Margin line -->
            <div style="
                font-size:0.8em;
                color:#777;
                border-top:1px solid rgba(255,255,255,0.05);
                padding-top:0.45rem;
            ">${marginLine}</div>
        `;

        grid.appendChild(card);
    });

    container.appendChild(grid);
}