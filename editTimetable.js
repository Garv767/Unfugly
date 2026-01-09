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
    classroomSpan.style.fontSize = '0.6em';
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
            if(!slotId) {
                console.log("Empty slotId found in storage, skipping.");
            } else {
                console.log("Loading edit for slotId:", slotId, editedSlots[slotId].title);
            }
            const slot = timetable.querySelector(`td[title^="Slot: ${slotId}"]`);
            if (slot) {
                const titleSpan = document.createElement('span');
                titleSpan.textContent = editedSlots[slotId].title;

                const classroomSpan = document.createElement('span');
                classroomSpan.textContent = editedSlots[slotId].classroom ? `Room: ${editedSlots[slotId].classroom}` : '';
                titleSpan.style.fontWeight = '600';
                titleSpan.style.color = '#334';
                titleSpan.style.display = 'block';
                titleSpan.style.fontSize = '11px';
                classroomSpan.style.fontWeight = 'semi-bold'; // Changed to normal for distinction
                classroomSpan.style.color = '#555';
                classroomSpan.style.fontSize = '0.6em';
                classroomSpan.style.display = 'block';
                slot.classList.add('edited-slot', 'replaced-slot');
                slot.style.backgroundColor = '#FBC02D';
                slot.appendChild(titleSpan);
                slot.appendChild(classroomSpan);
            }
        });
    });
}

function initializeEdits() {
    const editMenu = document.createElement('div');
    editMenu.id = 'editMenu';
    editMenu.style.display = 'inline-flex';
    editMenu.classList.add = 'flex items-center space-x-1 p-1 bg-gray-200 rounded-full shadow-inner';
    /*editMenu.innerHTML=`
        <button
      matButton
      class="check"
      id="hideEditsButton"
      [ngClass]="choice === 'accept' ? ['check-on'] : ['check-off']"
      type="button"
      (click)="choice = 'accept'"
    >Hide
    </button>
    <button
      matButton
      class="na"
      id="editTimetableButton"
      [ngClass]="choice?.length > 0 ? ['na-off'] : ['na-on']"
      (click)="choice = ''"
    >
      <fa-icon [icon]="faBan" *ngIf="choice?.length > 0; else blank"></fa-icon>
     Show
    </button>
    <button
      matButton
      class="deny"
      [ngClass]="choice === 'deny' ? ['deny-on'] : ['deny-off']"
      (click)="choice = 'deny'"
    >Modify
    </button>
        
    `;*/
    hideButton = document.getElementById('hideEditsButton') || document.createElement('button');
        hideButton.id = 'hideEditsButton';
        hideButton.innerHTML = '';
        hideButton.textContent = ' Hide ';
        hideButton.style.cssText = `
            background-color: #fbc02d;
            border-radius: 13px;
            border: none;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
            
            justify-content: center;
            align-items: center;
            display: inline-flex;
        `;
        //hideButton.onmouseover = () => hideButton.style.opacity = '0.8';
        //hideButton.onmouseout = () => editButton.style.opacity = '1';
        hideButton.title = 'Hide Edits';
        hideButton.onclick = () => {
            //editTimetable();
            hideButton.style.opacity = '0.6';
            showButton.style.opacity = '1';
            editButton.style.opacity = '1';
            //saveEdits();
        }
        editMenu.appendChild(hideButton);

        showButton = document.getElementById('showEditsButton') || document.createElement('button');
        showButton.id = 'showEditsButton';
        /*const editImage = document.createElement('img');
        const extensionId = chrome.runtime.id; // Get extension ID dynamically
        editImage.src = `chrome-extension://${extensionId}/images/edit.png`; // Path to your download icon
        editImage.alt = 'Edit Timetable';
        editImage.style.width = '24px';
        editImage.style.height = '24px';
        editImage.style.verticalAlign = 'middle';*/
        //editButton.appendChild(editImage);
        showButton.innerHTML = '';
        showButton.textContent = ' Show ';
        showButton.style.cssText = `
            background-color: green;
            border-radius: 13px;
            border: none;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
            
            justify-content: center;
            align-items: center;
            display: inline-flex;
        `;
        //showButton.onmouseover = () => editButton.style.opacity = '0.8';
        //showButton.onmouseout = () => editButton.style.opacity = '1';
        showButton.title = 'Show Edited Timetable';
        showButton.onclick = () => {
            //editTimetable();
            showButton.style.opacity = '0.6';
            hideButton.style.opacity = '1';
            editButton.style.opacity = '1';
            saveEdits();
            loadEdits();
        }
        editMenu.appendChild(showButton);

        editButton = document.getElementById('editTimetableButton') || document.createElement('button');
        editButton.id = 'editTimetableButton';
        /*const editImage = document.createElement('img');
        const extensionId = chrome.runtime.id; // Get extension ID dynamically
        editImage.src = `chrome-extension://${extensionId}/images/edit.png`; // Path to your download icon
        editImage.alt = 'Edit Timetable';
        editImage.style.width = '24px';
        editImage.style.height = '24px';
        editImage.style.verticalAlign = 'middle';*/
        //editButton.appendChild(editImage);
        editButton.innerHTML = '';
        editButton.textContent = ' Modify ';
        editButton.style.cssText = `
            background-color: green;
            border-radius: 13px;
            border: none;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
            
            justify-content: center;
            align-items: center;
            display: inline-flex;
        `;
        //editButton.onmouseover = () => editButton.style.opacity = '0.8';
        //editButton.onmouseout = () => editButton.style.opacity = '1';
        editButton.title = 'Edit Timetable';
        editButton.onclick = () => {
            editTimetable();
            editButton.style.opacity = '0.6';
            showButton.style.opacity = '1';
            hideButton.style.opacity = '1';
            //saveEdits();
        }
        editMenu.appendChild(editButton);        

        //timetablePanel = document.getElementById('timetable-content-container');
        //timetablePanel.querySelector('h3').appendChild(editButton);
        document.querySelector('#unfuglyAppWrapper > div.unfugly-accordion-wrapper > div:nth-child(1) > h3').appendChild(editMenu);
}