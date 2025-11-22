// ==UserScript==
// @name         Website Photo Scraper
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Automates checking a box and saving a photo URL.
// @author       You
// @match        *://academia.srmist.edu.in/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --------------------------------------------------------
    // Step 1: Define your specific parameters here
    // --------------------------------------------------------
    // **IMPORTANT:** Replace `www.your-website.com` and `targetPageHash` below.
    const targetPageHash = '#Report:Student_Profile_Report'; // e.g., '#report/Student_Profile_Report'
    const checkboxSelector = '#show-hide-col-all1';
    const doneButton = document.querySelector('#zcShowHideColCont > div > span > input');
    const imageSelector = 'img.zc-image-view';
    const localStorageKey = 'studentProfilePhotoUrl';

    // --------------------------------------------------------
    // Step 2: Function to perform the actions on the page
    // --------------------------------------------------------
    function processPage() {
        // Use a delay to ensure the page has loaded, especially for dynamic content.
        setTimeout(() => {
            console.log("Starting to process the page...");

            // Find and tick the checkbox
            const checkbox = document.getElementById(checkboxSelector);
            if (checkbox) {
                checkbox.checked = true;
                console.log('Checkbox "Show/Hide Columns" has been ticked.');
                if(checkbox.checked && doneButton) {
                    doneButton.click();
                    console.log('Done button clicked.');
                }
            } else {
                console.error('Checkbox not found with selector:', checkboxSelector);
            }

            // Find the image and save its URL to local storage
            const image = document.querySelector(imageSelector);
            if (image && image.src) {
                const imageUrl = image.src;
                localStorage.setItem(localStorageKey, imageUrl);
                console.log(`Image URL saved to local storage: ${localStorageKey}: ${imageUrl}`);
            } else {
                console.error('Image or image source not found with selector:', imageSelector);
            }
        }, 2000); // Waits 2 seconds before running to give the page time to load
    }

    // --------------------------------------------------------
    // Step 3: Logic to handle navigation and execution
    // --------------------------------------------------------
    if (window.location.hash.includes(targetPageHash)) {
        // If we are already on the target page, run the function immediately.
        processPage();
    } else {
        // If not on the page, wait for the hash to change and then execute.
        window.addEventListener('hashchange', function onHashChange() {
            if (window.location.hash.includes(targetPageHash)) {
                processPage();
                window.removeEventListener('hashchange', onHashChange);
            }
        });
        // Navigate to the target page by updating the hash.
        window.location.hash = targetPageHash;
    }
})();
