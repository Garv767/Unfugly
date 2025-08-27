/*function formatMarksTable(marksData, container) {
    if (!marksData || marksData.length === 0) {
        container.innerHTML = '<p style="color: #ccc;">No marks data found.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'unfugly-marks-table';
    table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        font-size: 0.95em;
        border-radius: 8px;
        overflow: hidden;
        background: #1e1e1e;
    `;
    table.innerHTML = `
        <thead style="position: sticky; top: 0; background: linear-gradient(90deg, #292929, #1f1f1f); color: #fff;>
            <tr>
                <th style="padding: 10px; text-align: left;">Course Code</th>
                <th style="padding: 10px; text-align: left;">Course Type</th>
                <th style="padding: 10px; text-align: center;">Total Marks</th>
                <th style="padding: 10px; text-align: center;">Total Obtained</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    marksData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.style.cssText = `
            border-bottom: 1px solid #333;
            transition: background 0.2s ease;
        `;

        row.onmouseenter = () => row.style.background = 'rgba(255,255,255,0.05)';
        row.onmouseleave = () => row.style.background = 'transparent';

        row.innerHTML = `
            <td style="padding: 10px; border: 1px solid #555;">${item.CourseCode}</td>
            <td style="padding: 10px; border: 1px solid #555;">${item.CourseType}</td>
            <td style="padding: 10px; text-align: center; border: 1px solid #555;">${item.TotalMaxMarks}</td>
            <td style="padding: 10px; text-align: center; border: 1px solid #555;">${item.TotalObtainedMarks}</td>
        `;
        tbody.appendChild(row);

        // Add a sub-row for components if available (for UI display, not live page)
        if (item.Components && item.Components.length > 0) {
            const componentRow = document.createElement('tr');
            componentRow.style.cssText = `
                background-color: #383838; 
                font-size: 0.9em;
                color: #ddd;
            `;
            const componentCellsHTML = item.Components.map(comp =>
                `<span>${comp.ComponentName}: ${comp.ObtainedMarks.toFixed(2)}/${comp.MaxMarks.toFixed(2)}</span>`
            ).join(', ');

            componentRow.innerHTML = `
                <td colspan="4" style="padding: 4px 8px; border: 1px solid #555;">
                    <strong style="color: #fff;">Components:</strong> ${componentCellsHTML}
                </td>
            `;
            tbody.appendChild(componentRow);
        }
    });

    container.innerHTML = '';
    container.appendChild(table);
}*/

/*function formatMarksTable(marksData, container) {
    if (!marksData || marksData.length === 0) {
        container.innerHTML = '<p style="color: #fff;">No marks data found.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'srm-marks-table';
    table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        color: #fff;
    `;
    table.innerHTML = `
        <thead>
            <tr style="background-color: #444;">
                <th style="padding: 8px; text-align: left; border: 1px solid #555;">Course Code</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #555;">Course Type</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #555;">Total Marks</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #555;">Total Obtained</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    marksData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #555';
        
        row.innerHTML = `
            <td style="padding: 8px; border: 1px solid #555;">${item.CourseCode}</td>
            <td style="padding: 8px; border: 1px solid #555;">${item.CourseType}</td>
            <td style="padding: 8px; text-align: center; border: 1px solid #555;">${item.TotalMaxMarks}</td>
            <td style="padding: 8px; text-align: center; border: 1px solid #555;">${item.TotalObtainedMarks}</td>
        `;
        tbody.appendChild(row);

        // Add a sub-row for components if available (for UI display, not live page)
        if (item.Components && item.Components.length > 0) {
            const componentRow = document.createElement('tr');
            componentRow.style.cssText = `
                background-color: #383838; 
                font-size: 0.9em;
                color: #ddd;
            `;
            const componentCellsHTML = item.Components.map(comp => 
                `<span>${comp.ComponentName}: ${comp.ObtainedMarks.toFixed(2)}/${comp.MaxMarks.toFixed(2)}</span>`
            ).join(', ');

            componentRow.innerHTML = `
                <td colspan="4" style="padding: 4px 8px; border: 1px solid #555;">
                    <strong style="color: #fff;">Components:</strong> ${componentCellsHTML}
                </td>
            `;
            tbody.appendChild(componentRow);
        }
    });

    container.innerHTML = '';
    container.appendChild(table);
}*/

/*function formatMarksTable(marksData, container) {
    if (!marksData || marksData.length === 0) {
        container.innerHTML = '<p style="color: #fff; text-align: center; font-size: 1.1em;">No marks data found.</p>';
        return;
    }

    container.innerHTML = ''; // Clear old content
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
    container.style.gap = '1rem';

    marksData.forEach(item => {
        const card = document.createElement('div');
        card.style.cssText = `
            background: linear-gradient(145deg, #2b2b2b, #1c1c1c);
            border-radius: 12px;
            padding: 16px;
            color: #fff;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;
        card.onmouseenter = () => {
            card.style.transform = 'translateY(-3px)';
            card.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
        };
        card.onmouseleave = () => {
            card.style.transform = '';
            card.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
        };

        // Header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '8px';
        header.innerHTML = `
            <h2 style="font-size: 1.1em; font-weight: 600; margin: 0;">${item.CourseCode}</h2>
            <span style="
                background: #444; 
                padding: 4px 8px; 
                border-radius: 6px; 
                font-size: 0.85em;
                opacity: 0.8;
            ">${item.CourseType}</span>
        `;

        // Marks summary
        const marksSection = document.createElement('div');
        marksSection.style.marginBottom = '8px';
        marksSection.innerHTML = `
            <p style="margin: 4px 0;"><strong>Total Marks:</strong> ${item.TotalMaxMarks}</p>
            <p style="margin: 4px 0;">
                <strong>Obtained:</strong> 
                <span style="color: ${item.TotalObtainedMarks >= item.TotalMaxMarks * 0.75 ? '#4CAF50' : '#F44336'};">
                    ${item.TotalObtainedMarks}
                </span>
            </p>
        `;

        // Component breakdown
        if (item.Components && item.Components.length > 0) {
            const compSection = document.createElement('div');
            compSection.style.marginTop = '8px';
            compSection.style.borderTop = '1px dashed #555';
            compSection.style.paddingTop = '8px';
            compSection.innerHTML = `<strong style="font-size: 0.9em;">Components:</strong>`;
            
            item.Components.forEach(comp => {
                const compRow = document.createElement('div');
                compRow.style.display = 'flex';
                compRow.style.justifyContent = 'space-between';
                compRow.style.fontSize = '0.85em';
                compRow.style.opacity = '0.85';
                compRow.innerHTML = `
                    <span>${comp.ComponentName}</span>
                    <span>${comp.ObtainedMarks.toFixed(2)}/${comp.MaxMarks.toFixed(2)}</span>
                `;
                compSection.appendChild(compRow);
            });

            card.appendChild(compSection);
        }

        card.appendChild(header);
        card.appendChild(marksSection);
        container.appendChild(card);
    });
}*/
