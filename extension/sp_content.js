// sp_content.js
// Content script for Student Portal (sp.srmist.edu.in) to add inline attendance margin

function injectAttendanceMargin() {
    // Find the COURSE WISE ATTENDANCE table more strictly
    const cardHeaders = document.querySelectorAll('.card-header');
    let targetTable = null;
    
    for (const header of cardHeaders) {
        if (header.textContent.includes('COURSE WISE ATTENDANCE')) {
            const card = header.closest('.card');
            if (card) {
                targetTable = card.querySelector('table');
                break;
            }
        }
    }

    if (!targetTable) return;

    // Check if we've already injected
    if (targetTable.dataset.unfuglyMarginInjected) return;
    targetTable.dataset.unfuglyMarginInjected = 'true';

    // Inject header
    const theadTr = targetTable.querySelector('thead tr');
    if (theadTr) {
        const marginTh = document.createElement('th');
        marginTh.scope = 'col';
        marginTh.textContent = 'Margin';
        marginTh.style.cssText = 'width: 15%;';
        theadTr.appendChild(marginTh);
    }

    // Inject body rows
    const tbodyTrs = targetTable.querySelectorAll('tbody tr');
    tbodyTrs.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 6) {
            // Columns: 0:Code, 1:Description, 2:Max. hours, 3:Att. hours, 4:Absent hours, 5:Total Percentage
            const maxHoursRaw = tds[2].textContent.trim();
            const attHoursRaw = tds[3].textContent.trim();
            const percentageRaw = tds[5].textContent.trim();

            const totalClasses = parseInt(maxHoursRaw);
            const attendedClasses = parseInt(attHoursRaw);
            const currentPercentage = parseFloat(percentageRaw);

            let marginHtml = '<span style="color:#888;">N/A</span>';

            if (!isNaN(totalClasses) && !isNaN(attendedClasses) && totalClasses > 0) {
                if (currentPercentage >= 75) {
                    let classesToSkip = Math.floor((attendedClasses / 0.75) - totalClasses);
                    if (classesToSkip < 0) classesToSkip = 0;
                    marginHtml = `<span style="color:#4caf50; font-weight:600;">Can skip ${classesToSkip}</span>`;
                } else {
                    let classesToAttend = Math.ceil((0.75 * totalClasses - attendedClasses) / 0.25);
                    if (classesToAttend < 0) classesToAttend = 0;
                    marginHtml = `<span style="color:#f44336; font-weight:600;">Need ${classesToAttend}</span>`;
                }
            }

            const marginTd = document.createElement('td');
            marginTd.innerHTML = marginHtml;
            tr.appendChild(marginTd);
        }
    });
}

// Observe DOM for dynamic rendering (SP might use AJAX to load the table)
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            injectAttendanceMargin();
        }
    }
});

// Run once and also observe
injectAttendanceMargin();
observer.observe(document.body, { childList: true, subtree: true });
