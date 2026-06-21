chrome.runtime.onUpdateAvailable.addListener(() => {
  chrome.runtime.reload(); // Step 4: Force apply immediately
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "trigger_update") {
    chrome.runtime.requestUpdateCheck((status) => {
      console.log("Update check status:", status);
    });
    return false;
  }
  
  if (request.action === "get_academia_cookies") {
    chrome.cookies.getAll({ domain: "academia.srmist.edu.in" }, (cookies) => {
      sendResponse({ cookies });
    });
    return true; // Keep the message channel open for the async response
  }
});
