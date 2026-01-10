chrome.runtime.onUpdateAvailable.addListener(() => {
  chrome.runtime.reload(); // Step 4: Force apply immediately
});


chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "trigger_update") {
    chrome.runtime.requestUpdateCheck((status) => {
      console.log("Update check status:", status);
    });
  }
});
