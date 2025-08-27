/*function formatAttendanceTable(attendanceData, previousData = [], container) {
    if (!attendanceData || attendanceData.length === 0) {
        container.innerHTML = '<p style="color: #fff;">No attendance data found.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'srm-attendance-table';
    table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        color: #fff;
    `;
    table.innerHTML = `
        <thead>
            <tr style="background-color: #444;">
                <th style="padding: 8px; text-align: left; border: 1px solid #555;">Course Code</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #555;">Course Title</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #555;">Hours Conducted</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #555;">Hours Absent</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #555;">Percentage</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #555;">Margin</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    attendanceData.forEach(item => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #555';
        
        const status = item.percentage >= 75 ? item.classesToSkip : `-${item.classesToAttend}`;
        const statusColor = item.percentage >= 75 ? '#8BC34A' : '#F44336';
        
        let statusText = status;
        let changeText = '';
        const previousItem = previousData.find(prev => prev.courseCode === item.courseCode);
        if (previousItem) {
            const percentageChange = item.percentage - previousItem.percentage;
            if (percentageChange > 0) {
                changeText = ` (+${percentageChange.toFixed(2)}%)`;
            } else if (percentageChange < 0) {
                changeText = ` (-${percentageChange.toFixed(2)}%)`;
            }
            if (changeText !== '') {
                row.style.backgroundColor = percentageChange > 0 ? 'rgba(139, 195, 74, 0.1)' : 'rgba(244, 67, 54, 0.1)';
            }
        }

        row.innerHTML = `
            <td style="padding: 8px; border: 1px solid #555;">${item.courseCode}</td>
            <td style="padding: 8px; border: 1px solid #555;">${item.courseTitle}</td>
            <td style="padding: 8px; border: 1px solid #555;">${item.hoursConducted}</td>
            <td style="padding: 8px; border: 1px solid #555;">${item.absentHours}</td>
            <td style="padding: 8px; text-align: center; border: 1px solid #555;">${item.percentage.toFixed(2)}%<br><span style="font-size: 0.8em; color: #aaa;">${changeText}</span></td>
            <td style="padding: 8px; text-align: center; border: 1px solid #555; color: ${statusColor}; font-weight: bold;">${statusText}</td>
        `;
        tbody.appendChild(row);
    });

    container.innerHTML = '';
    container.appendChild(table);
}*/

/*function formatAttendanceTable(attendanceData, previousData = [], container) {
    if (!attendanceData || attendanceData.length === 0) {
        container.innerHTML = '<p style="color: #ccc; text-align: center;">No attendance data found.</p>';
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
        padding: 0.5rem;
    `;

    attendanceData.forEach(item => {
        const card = document.createElement('div');
        card.style.cssText = `
            background: #1e1e1e;
            padding: 1rem;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;
        card.onmouseenter = () => {
            card.style.transform = 'translateY(-4px)';
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        };
        card.onmouseleave = () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
        };

        const status = item.percentage >= 75 ? item.classesToSkip : `${item.classesToAttend}`;
        const statusColor = item.percentage >= 75 ? '#81C784' : '#E57373';

        // Trend indicator
        let trendIcon = '';
        const previousItem = previousData.find(prev => prev.courseCode === item.courseCode);
        if (previousItem) {
            const change = item.percentage - previousItem.percentage;
            if (change > 0) trendIcon = `🔼 <span style="color:#8BC34A;">+${change.toFixed(2)}%</span>`;
            else if (change < 0) trendIcon = `🔽 <span style="color:#F44336;">${change.toFixed(2)}%</span>`;
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-size:0.9em; color:#aaa;">${item.courseCode}</div>
                    <div style="font-size:1.1em; font-weight:bold; color:#fff;">${item.courseTitle}</div>
                </div>
                <div style="
                    padding: 0.4rem 0.8rem;
                    background: ${item.percentage >= 75 ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)'};
                    color: ${statusColor};
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 0.95em;
                ">
                    ${item.percentage.toFixed(2)}%
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; color:#ccc; font-size:0.9em;">
                <div>Hours Conducted: <b style="color:#fff;">${item.hoursConducted}</b></div>
                <div>Hours Absent: <b style="color:#fff;">${item.absentHours}</b></div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="color:${statusColor}; font-weight:bold;">
                    ${item.percentage >= 75 ? 'Can skip' : 'Require'}: ${status}
                </div>
                <div style="font-size:0.85em; color:#bbb;">${trendIcon}</div>
            </div>
        `;

        wrapper.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(wrapper);
}*/


/*function formatAttendanceTable(attendanceData, previousData = [], container) {
    if (!attendanceData || attendanceData.length === 0) {
        container.innerHTML = '<p style="color: #ccc; text-align: center;">No attendance data found.</p>';
        return;
    }

    const getColor = (pct) => {
        if (pct >= 75) return '#4caf50'; // green
        return '#f44336'; // red
    };

    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '0.6rem';

    attendanceData.forEach(item => {
        const prev = previousData.find(p => p.courseCode === item.courseCode);
        const change = prev ? (item.percentage - prev.percentage).toFixed(2) : 0;
        const trend = change > 0 ? `🔼 ${change}%` : (change < 0 ? `🔽 ${Math.abs(change)}%` : '');

        let percentageColor = getColor(item.percentage);
        let statusText = '';
        if (item.classesToSkip === 0 && item.classesToAttend === 0) {
            percentageColor = '#fbc02d';
            statusText = `Can Skip: ${item.classesToSkip}`;
        } else if (item.percentage >= 75) {
            statusText = `Can Skip ${item.classesToSkip}`;
        } else {
            statusText = `Require ${item.classesToAttend}`;
        }

        const card = document.createElement('div');
        card.style.cssText = `
            background: #1e1e1e;
            border-radius: 8px;
            padding: 10px 12px;
            color: #fff;
            display: flex;
            flex-direction: column;
            gap: 6px;
            box-shadow: 0 1px 6px rgba(0,0,0,0.3);
            transition: background 0.2s ease;
            font-size: 0.9em;
        `;
        card.onmouseenter = () => card.style.background = 'rgba(255,255,255,0.05)';
        card.onmouseleave = () => card.style.background = '#1e1e1e';

        // Row 1: Course Info + Status
        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.justifyContent = 'space-between';
        topRow.style.alignItems = 'center';
        topRow.innerHTML = `
            <div>
                <strong>${item.courseCode}</strong>
                <span style="opacity:0.7; font-size:0.85em;"> • ${item.courseTitle}</span>
            </div>
            <div style="color:${percentageColor}; font-weight:bold;">${statusText}</div>
        `;

        // Row 2: Hours info
        const hoursRow = document.createElement('div');
        hoursRow.style.opacity = '0.8';
        hoursRow.innerHTML = `
            Hrs: <strong>${item.hoursConducted}</strong> | Absent: <strong>${item.absentHours}</strong>
        `;

        // Row 3: Percentage + Bar (inline)
        const percentRow = document.createElement('div');
        percentRow.style.display = 'flex';
        percentRow.style.alignItems = 'center';
        percentRow.style.gap = '8px';

        const percentText = document.createElement('span');
        percentText.style.color = percentageColor;
        percentText.style.fontWeight = 'bold';
        percentText.textContent = `${item.percentage.toFixed(2)}%`;

        const progressWrapper = document.createElement('div');
        progressWrapper.style.cssText = `
            flex:1;
            height: 6px;
            background: #333;
            border-radius: 3px;
            overflow: hidden;
        `;

        const progressFill = document.createElement('div');
        progressFill.style.cssText = `
            height: 100%;
            width: ${item.percentage}%;
            background: ${percentageColor};
        `;

        progressWrapper.appendChild(progressFill);
        percentRow.appendChild(percentText);
        percentRow.appendChild(progressWrapper);

        if (trend) {
            const trendSpan = document.createElement('span');
            trendSpan.style.fontSize = '0.8em';
            trendSpan.style.color = '#888';
            trendSpan.textContent = trend;
            percentRow.appendChild(trendSpan);
        }

        card.appendChild(topRow);
        card.appendChild(hoursRow);
        card.appendChild(percentRow);

        container.appendChild(card);
    });
}*/





/*function formatAttendanceTable(attendanceData, previousData = [], container) {
    if (!attendanceData || attendanceData.length === 0) {
        container.innerHTML = '<p style="color: #fff;">No attendance data found.</p>';
        return;
    }

    // Create grid container
    const grid = document.createElement('div');
    grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
        padding: 10px;
    `;

    attendanceData.forEach(item => {
        // Find previous data for percentage change
        const previousItem = previousData.find(prev => prev.courseCode === item.courseCode);
        let changeText = '';
        let percentageChange = 0;
        if (previousItem) {
            percentageChange = item.percentage - previousItem.percentage;
            if (percentageChange > 0) {
                changeText = `+${percentageChange.toFixed(1)}%`;
            } else if (percentageChange < 0) {
                changeText = `${percentageChange.toFixed(1)}%`;
            }
        }

        // Determine heatmap color
        let bgColor = '#f44336'; // default red (danger)
        if (item.percentage >= 90) bgColor = '#4caf50'; // green
        else if (item.percentage >= 75) bgColor = '#ff9800'; // yellow

        // Determine text for status
        let statusLabel = '';
        if (item.percentage >= 90) statusLabel = 'Excellent';
        else if (item.percentage >= 75) statusLabel = 'At Risk';
        else statusLabel = 'Danger';

        // Create tile
        const tile = document.createElement('div');
        tile.style.cssText = `
            background: ${bgColor};
            color: white;
            border-radius: 16px;
            padding: 16px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;
        tile.onmouseenter = () => {
            tile.style.transform = 'translateY(-4px)';
            tile.style.boxShadow = '0 6px 16px rgba(0,0,0,0.25)';
        };
        tile.onmouseleave = () => {
            tile.style.transform = 'translateY(0)';
            tile.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        };

        // Fill tile content
        tile.innerHTML = `
            <div style="font-size: 0.9em; font-weight: 600; margin-bottom: 6px;">
                ${item.courseCode}
            </div>
            <div style="font-size: 2em; font-weight: bold; margin: 6px 0;">
                ${item.percentage.toFixed(1)}%
            </div>
            <div style="font-size: 0.8em; opacity: 0.9; margin-bottom: 4px;">
                ${statusLabel}
            </div>
            <div style="font-size: 0.75em; opacity: 0.8;">
                ${changeText}
            </div>
        `;

        // Append tile to grid
        grid.appendChild(tile);
    });

    // Render grid in container
    container.innerHTML = '';
    container.appendChild(grid);
}*/

/*function formatAttendanceTable(attendanceData, previousData = [], container) {
    if (!attendanceData || attendanceData.length === 0) {
        container.innerHTML = '<p style="color: #fff;">No attendance data found.</p>';
        return;
    }

    const grid = document.createElement('div');
    grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 14px;
        padding: 10px;
    `;

    attendanceData.forEach(item => {
        // Previous data comparison
        const previousItem = previousData.find(prev => prev.courseCode === item.courseCode);
        let changeText = '';
        if (previousItem) {
            const percentageChange = item.percentage - previousItem.percentage;
            if (percentageChange > 0) changeText = `↑ ${percentageChange.toFixed(1)}%`;
            else if (percentageChange < 0) changeText = `↓ ${Math.abs(percentageChange).toFixed(1)}%`;
        }

        // Margin logic
        const margin = item.percentage >= 75 ? item.classesToSkip : -item.classesToAttend;
        const isSafe = margin >= 0;

        // Color based on margin
        let bgColor = '#f44336'; // red (danger)
        if (margin >= 1) bgColor = '#4caf50'; // green
        else if (margin >= 0) bgColor = '#ff9800'; // yellow

        const card = document.createElement('div');
        card.style.cssText = `
            background: ${bgColor};
            color: white;
            border-radius: 16px;
            padding: 18px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;
        card.onmouseenter = () => {
            card.style.transform = 'translateY(-4px)';
            card.style.boxShadow = '0 6px 16px rgba(0,0,0,0.25)';
        };
        card.onmouseleave = () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        };

        // Card content
        card.innerHTML = `
            <div style="font-size: 0.85em; opacity: 0.85; margin-bottom: 6px;">
                ${item.courseTitle}
            </div>
            <div style="font-size: 2.8em; font-weight: bold;">
                ${margin >= 0 ? '+' : ''}${margin}
            </div>
            <div style="font-size: 0.8em; opacity: 0.9; margin-top: 2px;">
                ${margin >= 0 ? 'Can Skip' : 'Need to Attend'}
            </div>
            <div style="margin-top: 10px; font-size: 1em; font-weight: 500;">
                ${item.percentage.toFixed(1)}%
            </div>
            <div style="font-size: 0.75em; opacity: 0.85;">
                ${changeText}
            </div>
        `;

        grid.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(grid);
}*/
