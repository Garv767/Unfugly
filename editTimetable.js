function handleSlotClick(event) {
    const slot = event.currentTarget;
    let slotTitle = slot.title.trim();
    console.log("Clicked slot title:", slotTitle.slice(6));
    const titleSpan = document.createElement('span');
    //titleSpan.textContent = courseInfo.title;
    titleSpan.style.fontWeight = '600';
    titleSpan.style.color = '#334';
    titleSpan.style.display = 'block';
    titleSpan.style.fontSize = '11px'; // Adjust font size for better fit

    const classroomSpan = document.createElement('span');
    //classroomSpan.textContent = courseInfo.classroom ? `Room: ${courseInfo.classroom}` : '';
    classroomSpan.style.fontWeight = 'semi-bold'; // Changed to normal for distinction
    classroomSpan.style.color = '#555';
    classroomSpan.style.fontSize = '0.6em';
    classroomSpan.style.display = 'block';

    const tittle = prompt("Enter course title:" );
    const classroom = prompt("Enter classroom (optional):");
    titleSpan.textContent = tittle ? tittle : slotTitle.slice(6)       ;
    classroomSpan.textContent = classroom ? `Room: ${classroom}` : '';
    slot.classList.add('edited-slot', 'replaced-slot');
    slot.innerHTML = ''; // Clear existing content
    slot.style.backgroundColor = '#FBC02D';
    slot.appendChild(titleSpan);
    slot.appendChild(classroomSpan);
}

function editTimetable() {
    const timetable = document.querySelector('#timetable-content-container > table');
    if (!timetable) {
        displayInfoMessage("Timetable table not found.", 5000, 'error');
        return;
    }
    
    //console.log("Edit Timetable function called.");
    const editableSlots = timetable.querySelectorAll('td[style*="rgb(88, 91, 91)"], td.replaced-slot');
        editableSlots.forEach(slot => {
            if (slot.style.display !== 'none') {
                //slot.classList.add('unalloted-slot');
                slot.onclick = handleSlotClick;
            }
        });
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Edits';
    saveButton.style.margin = '10px';
    saveButton.style.padding = '5px 10px';
    saveButton.style.backgroundColor = '#4CAF50';
    saveButton.style.color = 'white';
    saveButton.style.border = 'none';
    saveButton.style.borderRadius = '4px';
    saveButton.style.cursor = 'pointer';
    //#unfuglyAppWrapper > div.unfugly-accordion-wrapper > div:nth-child(1) > h3
    document.querySelector('#unfuglyAppWrapper > div.unfugly-accordion-wrapper > div:nth-child(1) > h3').appendChild(saveButton);
    saveButton.onclick = () => {
        saveEdits();
        saveButton.remove();
    };
}

function saveEdits() {
    const timetable = document.querySelector('#timetable-content-container > table');
    const editedSlots = timetable.querySelectorAll('td.edited-slot');
    currentNetId = getNetId();
    const storageKey  = `unfuglyData_${currentNetId}`;
    
    chrome.storage.local.get(storageKey, (result) => {
        const existingData = result[storageKey] || {};
        existingData.editedSlots = existingData.editedSlots || {};
        
        editedSlots.forEach(slot => {
            const slotId = slot.title.slice(6).trim();
            const title = slot.querySelector('span:nth-child(1)') ? slot.querySelector('span:nth-child(1)').textContent : '';
            const classroom = slot.querySelector('span:nth-child(2)') ? slot.querySelector('span:nth-child(2)').textContent.replace('Room: ', '') : '';
            
            existingData.editedSlots[slotId] = { 
                title: title, 
                classroom: classroom
            };
        });

        chrome.storage.local.set({ [storageKey]: existingData }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error setting local storage:", chrome.runtime.lastError);
            } else {
                console.log('Edits saved');
            }
        });
    });

    const editableSlots = timetable.querySelectorAll('td[style*="rgb(88, 91, 91)"], td.replaced-slot');
        editableSlots.forEach(slot => {
            //if (slot.style.display !== 'none') {
                slot.onclick = null;
            
        });
    displayInfoMessage("Edits saved successfully!", 3000, 'success');
}
