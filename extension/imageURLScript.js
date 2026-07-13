/**
 * Fetches URL of profile image from a document
 * @param {Document} doc The document context to extract from.
 * @returns {Promise<string|null>} Promise resolving to the URL of the profile photo or null
 **/
async function extractImageUrl(doc) {
    'use strict';

    /**
     * Helper function to pause execution for a specified duration.
     * @param {number} ms - Milliseconds to sleep.
     */
    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    //console.log("Starting Student Profile Photo Extraction ");

    try {
        // 1. WAIT FOR MAIN CONTAINER AND EYE ICON
        // Ensuring the report interface is fully loaded before interacting
        await waitForElement(doc, '#listReportMainContainer .ht_clone_top th.zcReport_HeaderEditColumn', 5000);
        
        const imgSelector = '#listReportMainContainer > div.ht_master.handsontable > div > div > div > table > tbody > tr > td.zcReport_Image.zc-mapping-field > a > img';
        const existingImg = doc.querySelector(imgSelector);
        if (existingImg && existingImg.src) {
            console.log("[Unfugly] Image already visible! Extracted URL immediately.");
            return existingImg.src;
        }

        const eyeTh = doc.querySelector('#listReportMainContainer .ht_clone_top th.zcReport_HeaderEditColumn');
        if (eyeTh) {
            //console.log("[Unfugly] Eye icon found. Triggering column selector...");
            eyeTh.click();
        } else {
            console.error("[Unfugly] Critical Error: Eye icon selector failed.");
            return null;
        }

        await sleep(2000); // Latency buffer for the popup overlay to render

        // 2. TOGGLE 'SELECT ALL' COLUMNS
        // This ensures the photo column is visible in the handsontable report
        const allCheckbox = doc.getElementById('show-hide-col-all');
        if (allCheckbox) {
            //console.log("[Unfugly] Select All checkbox identified. Updating selection...");
            // Standard .click() used to trigger internal Zoho event listeners
            allCheckbox.click();
        } else {
            console.warn("[Unfugly] Warning: 'Select All' checkbox not found in DOM.");
        }

        await sleep(2000); // Latency buffer between UI interactions

        // 3. COMMIT CHANGES VIA DONE BUTTON
        // Finalizing the column visibility update to refresh the table view
        const doneBtn = doc.querySelector('#zcShowHideColCont > div.zc-show-hide-done > span > input');
        if (doneBtn) {
            //console.log("[Unfugly] Done button identified. Committing selection...");
            doneBtn.click();
            
            // Wait for the table to refresh with the new columns
            await sleep(3000);
            
            // 4. EXTRACT IMAGE URL
            // Using the specific selector provided for the profile image
            const imgSelector = '#listReportMainContainer > div.ht_master.handsontable > div > div > div > table > tbody > tr > td.zcReport_Image.zc-mapping-field > a > img';
            const profileImg = doc.querySelector(imgSelector);
            
            if (profileImg && profileImg.src) {
                console.log("[Unfugly] Success! Extracted Image URL:");
                return profileImg.src;
            } else {
                console.log("[Unfugly] Image element not found after refresh. Selector check failed.");
            }

        } else {
            console.error("[Unfugly] Error: Done button selector failed.");
        }

    } catch (error) {
        console.error("[Unfugly] Extraction process encountered an error:", error.message);
    }

    return null;
}
