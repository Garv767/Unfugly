function handleSlotClick(event) {
    const slot = event.currentTarget;
    if (!slot.classList.contains('editedSlot'))slot.dataset.originalBg = slot.style.backgroundColor; // Store original background color
    let slotTitle = slot.title.trim();
    console.log("Clicked slot title:", slotTitle.slice(6));
    const titleSpan = slot.getElementsByClassName('editedSlot-editedTitle')[0] || document.createElement('span');
    //titleSpan.textContent = courseInfo.title;
    titleSpan.style.fontWeight = '600';
    titleSpan.style.color = '#334';
    titleSpan.style.display = 'block';
    titleSpan.style.fontSize = '11px'; // Adjust font size for better fit
    titleSpan.classList.add('editedSlot-editedTitle');

    const classroomSpan = slot.getElementsByClassName('editedSlot-editedClassroom')[0] || document.createElement('span');
    //classroomSpan.textContent = courseInfo.classroom ? `Room: ${courseInfo.classroom}` : '';
    classroomSpan.style.fontWeight = 'semi-bold'; // Changed to normal for distinction
    classroomSpan.style.color = '#555';
    classroomSpan.style.fontSize = '9px';
    classroomSpan.style.display = 'block';
    classroomSpan.classList.add('editedSlot-editedClassroom');

    const tittle = prompt("Enter course title:" );
    const classroom = prompt("Enter classroom (optional):");
    //If user cancels both prompts, do nothing
    if(tittle === null && classroom === null) return;
    titleSpan.textContent = tittle ? tittle : slotTitle.slice(6)       ;
    classroomSpan.textContent = classroom ? `Room: ${classroom}` : '';
    slot.classList.add('edited-slot', 'replaced-slot');
    //slot.innerHTML = ''; // Clear existing content
    slot.style.backgroundColor = '#FBC02D';
    slot.appendChild(titleSpan);
    slot.appendChild(classroomSpan);

    slot.getElementsByClassName('editedSlot-originalTitle')[0].style.display = 'none'; //? slot.getElementsByClassName('editedSlot-originalTitle')[0].textContent : '';
    if(slot.getElementsByClassName('editedSlot-originalClassroom')[0]) slot.getElementsByClassName('editedSlot-originalClassroom')[0].style.display = 'none';
}

function removeEdits() {
    const timetable = document.querySelector('#timetable-content-container > table');
    const editedSlot = timetable ? timetable.querySelectorAll('.edited-slot') : [];

    editedSlot.forEach(cell => {
        cell.style.position = 'relative';

        const removeButton = cell.getElementsByClassName('removeEditButton')[0] || document.createElement('button');
        removeButton.textContent = '×';
        removeButton.style.position = 'absolute';
        removeButton.style.top = '2px';
        removeButton.style.right = '2px';
        removeButton.style.backgroundColor = '#E53935';
        removeButton.style.color = 'white';
        removeButton.style.border = 'none';
        removeButton.style.borderRadius = '50%';
        removeButton.style.width = '18px';
        removeButton.style.height = '18px';
        removeButton.style.fontSize = '12px';
        removeButton.style.cursor = 'pointer';
        removeButton.style.display = 'flex';
        removeButton.style.justifyContent = 'center';
        removeButton.style.alignItems = 'center';
        removeButton.style.zIndex = '10';
        removeButton.classList.add('removeEditButton');

        cell.prepend(removeButton);

        removeButton.onclick = (event) => {
            event.stopPropagation(); // Prevent triggering the slot click event
            cell.classList.remove('edited-slot');
            cell.style.backgroundColor = cell.dataset.originalBg;
            console.log(cell.dataset.originalBg, "Reverted slot :", cell.style.backgroundColor);
            const titleSpan = cell.getElementsByClassName('editedSlot-editedTitle')[0];
            const classroomSpan = cell.getElementsByClassName('editedSlot-editedClassroom')[0];
            if(titleSpan) titleSpan.remove();
            if(classroomSpan) classroomSpan.remove();
            cell.getElementsByClassName('editedSlot-originalTitle')[0].style.display = 'block';
            const originalClassroomSpan = cell.getElementsByClassName('editedSlot-originalClassroom')[0];
            if(originalClassroomSpan) originalClassroomSpan.style.display = 'block';
            chrome.storage.local.get(`unfuglyData_${currentNetId}`, (result) => {
                const existingData = result[`unfuglyData_${currentNetId}`] || {};
                const editedSlots = existingData.editedSlots || {};
                const slotId = cell.title.slice(6).trim();
                delete editedSlots[slotId];
                existingData.editedSlots = editedSlots;
                chrome.storage.local.set({ [`unfuglyData_${currentNetId}`]: existingData }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Error updating local storage:", chrome.runtime.lastError);
                    } else {
                        console.log('Edit removed and storage updated');
                    }
                });
            });
            removeButton.remove();
        }
    });
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
    const editedSlots = timetable.querySelectorAll('td.edited-slot');
    editedSlots.forEach(slot => {
        removeEdits();
    });      
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
            const editedTitle = slot.getElementsByClassName('editedSlot-editedTitle') ? slot.getElementsByClassName('editedSlot-editedTitle')[0].textContent : '';
            const editedClassroom = slot.getElementsByClassName('editedSlot-editedClassroom') ? slot.getElementsByClassName('editedSlot-editedClassroom')[0].textContent.replace('Room: ', '') : '';
            
            existingData.editedSlots[slotId] = { 
                originalTitle: null, 
                originalClassroom: null,
                editedTitle: editedTitle,
                editedClassroom: editedClassroom
            };
        });

        const removedFromEdits = timetable.getElementsByClassName('removeEditButton');
        Array.from(removedFromEdits).forEach(button => button.remove());

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

function loadEdits() {
    const timetable = document.querySelector('#timetable-content-container > table');
    if (!timetable) {
        displayInfoMessage("Timetable table not found.", 5000, 'error');
        return;
    }
    currentNetId = getNetId();
    const storageKey  = `unfuglyData_${currentNetId}`;
    chrome.storage.local.get(storageKey, (result) => {
        const existingData = result[storageKey] || {};
        const editedSlots = existingData.editedSlots || {};
        Object.keys(editedSlots).forEach(slotId => {
            /*if(!slotId) {
                console.log("Empty slotId found in storage, skipping.");
            } else {
                console.log("Loading edit for slotId:", slotId, editedSlots[slotId].editedTitle);
            }*/
            const slot = timetable.querySelector(`td[title^="Slot: ${slotId}"]`);
            if (slot) {
                //console.log("Applying edit to slot:", slotId, slot);
                if(!slot.dataset.originalBg) slot.dataset.originalBg = slot.style.backgroundColor; // Store original background color

                slot.getElementsByClassName('editedSlot-originalTitle')[0].style.display = 'none'; //? slot.getElementsByClassName('editedSlot-originalTitle')[0].textContent : '';
                if(slot.getElementsByClassName('editedSlot-originalClassroom')[0]) slot.getElementsByClassName('editedSlot-originalClassroom')[0].style.display = 'none';

                const titleSpan = slot.getElementsByClassName('editedSlot-editedTitle')[0] || document.createElement('span');
                titleSpan.textContent = editedSlots[slotId].editedTitle;

                const classroomSpan = slot.getElementsByClassName('editedSlot-editedClassroom')[0] || document.createElement('span');
                classroomSpan.textContent = editedSlots[slotId].editedClassroom ? `Room: ${editedSlots[slotId].editedClassroom}` : '';

                titleSpan.style.fontWeight = '600';
                titleSpan.style.color = '#334';
                titleSpan.style.display = 'block';
                titleSpan.style.fontSize = '11px';
                titleSpan.classList.add('editedSlot-editedTitle');

                classroomSpan.style.fontWeight = 'semi-bold'; // Changed to normal for distinction
                classroomSpan.style.color = '#555';
                classroomSpan.style.fontSize = '0.6em';
                classroomSpan.style.display = 'block';
                classroomSpan.classList.add('editedSlot-editedClassroom');

                slot.classList.add('edited-slot', 'replaced-slot');
                slot.style.backgroundColor = '#FBC02D';
                slot.appendChild(titleSpan);
                slot.appendChild(classroomSpan);
            }
        });
    });
}

function hideEdits() {
    //saveEdits();
    const timetable = document.querySelector('#timetable-content-container > table'); // > tbody');
    const editedSlot = timetable ? timetable.querySelectorAll('.edited-slot') : [];
    console.log("Hiding edits for slots:", editedSlot);
    editedSlot.forEach(cell => {
        const originalTitleSpan = cell.getElementsByClassName('editedSlot-originalTitle')[0];
        const originalClassroomSpan = cell.getElementsByClassName('editedSlot-originalClassroom')[0];
        originalTitleSpan.style.display = 'block';
        if(originalClassroomSpan) originalClassroomSpan.style.display = 'block';

        const editedTitleSpan = cell.getElementsByClassName('editedSlot-editedTitle')[0];
        const editedClassroomSpan = cell.getElementsByClassName('editedSlot-editedClassroom')[0];
        if(editedTitleSpan) editedTitleSpan.style.display = 'none';
        if(editedClassroomSpan) editedClassroomSpan.style.display = 'none';

        cell.classList.remove('edited-slot');
        cell.style.backgroundColor = cell.dataset.originalBg;
        console.log(cell.dataset.originalBg, "Reverted slot :", cell.style.backgroundColor);

    });
     
}
function initializeEdits() {
    loadEdits();
    let isEditMode = false;

    const editMenu = document.createElement('div');
    editMenu.id = 'editMenu';
    editMenu.style.cssText = `
        display: inline-flex;
        align-items: center;
        padding: 4px; /* Slimmer padding */
        margin-left: 20px; /* Added left padding */
        background-color: rgba(255, 255, 255, 0.1); /* Glass effect */
        backdrop-filter: blur(10px);
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        gap: 4px;
        transition: all 0.3s ease;
    `;

    function createSquircleButton(id, text, color, title) {
        const btn = document.createElement('button');
        btn.id = id;
        btn.textContent = text;
        btn.title = title;
        // Storing the theme color in a custom property for the setActive function
        btn.dataset.themeColor = color; 
        
        btn.style.cssText = `
            background-color: transparent; /* Default transparent */
            color: rgba(255, 255, 255, 0.8);
            border: none;
            border-radius: 10px;
            cursor: pointer;
            padding: 6px 14px;
            font-family: 'Inter', sans-serif;
            font-weight: 500;
            font-size: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            justify-content: center;
            align-items: center;
            min-width: 65px;
        `;
        return btn;
    }

    const hideButton = createSquircleButton('hideEditsButton', 'Hide', '#546E7A', 'Hide Edits');
    const showButton = createSquircleButton('showEditsButton', 'Show', '#43A047', 'Show/Save Edits');
    const editButton = createSquircleButton('editTimetableButton', 'Modify', '#1E88E5', 'Edit Mode');

    // Handle Active State Animation
    function setActive(activeBtn) {
        [hideButton, showButton, editButton].forEach(btn => {
            btn.style.backgroundColor = 'transparent';
            btn.style.color = 'rgba(255, 255, 255, 0.8)';
            btn.style.boxShadow = 'none';
            btn.style.transform = 'scale(1)';
        });

        // Pronounced Active State: Solid color + Scale + Shadow
        activeBtn.style.backgroundColor = activeBtn.dataset.themeColor;
        activeBtn.style.color = '#fff';
        activeBtn.style.transform = 'scale(1.05)';
        activeBtn.style.boxShadow = `0 4px 12px ${activeBtn.dataset.themeColor}66`; // 66 adds alpha to hex
    }

    // Logic Assignments
    hideButton.onclick = () => {
        setActive(hideButton);
        saveEdits();
        hideEdits();
        isEditMode = false;
        showButton.textContent = 'Show';
    };

    showButton.onclick = () => {
        setActive(showButton);
        if (isEditMode) {
            saveEdits();
            isEditMode = false;
            showButton.textContent = 'Show';
        } else {
            loadEdits();
        }
    };

    editButton.onclick = () => {
        setActive(editButton);
        isEditMode = true;
        showButton.textContent = 'Save';
        loadEdits();
        setTimeout(() => {
            editTimetable();
            displayInfoMessage("Click on any slot to edit it.", 5000, 'info');
        }, 50);
    };

    editMenu.append(hideButton, showButton, editButton);
    //document.body.appendChild(editMenu); // Or wherever you append it
    const timetableHeading = document.querySelector('#unfuglyAppWrapper > div.unfugly-accordion-wrapper > div:nth-child(1) > h3');
    timetableHeading.appendChild(editMenu);
    timetableHeading.style.marginBottom = '0px';
    setActive(showButton); // Default active button
    console.log("Edit menu initialized.");
   }