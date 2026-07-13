chrome.runtime.onUpdateAvailable.addListener(() => {
  chrome.runtime.reload();
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
    return true;
  }

  if (request.action === "fetch_backend") {
    chrome.cookies.getAll({ domain: "academia.srmist.edu.in" }, (cookiesAcademia) => {
      chrome.cookies.getAll({ domain: "zoho.in" }, (cookiesZoho) => {
        const combined = [...(cookiesAcademia || []), ...(cookiesZoho || [])];

        // ── DIAGNOSTIC LOG ─────────────────────────────────────────────────
        console.log(
          `[BG] fetch_backend → ${request.url}`,
          `| academia cookies: ${cookiesAcademia?.length ?? 0}`,
          `| zoho cookies: ${cookiesZoho?.length ?? 0}`,
          `| combined: ${combined.length}`
        );
        if (combined.length === 0) {
          console.warn('[BG] WARNING: No cookies found! Auth will fail. Are you logged into Academia?');
        } else {
          console.log('[BG] Cookie names:', combined.map(c => c.name).join(', '));
        }
        // ──────────────────────────────────────────────────────────────────

        const options = request.options || {};
        options.headers = options.headers || {};
        options.headers['x-academia-cookies'] = JSON.stringify(combined);

        fetch(request.url, options)
          .then(res => res.text().then(text => ({
            status: res.status,
            ok: res.ok,
            text: text
          })))
          .then(data => {
            if (!data.ok) {
              console.error(`[BG] Backend returned ${data.status} for ${request.url}:`, data.text.slice(0, 300));
            }
            sendResponse({ success: true, data });
          })
          .catch(err => {
            console.error(`[BG] fetch failed for ${request.url}:`, err.message);
            sendResponse({ success: false, error: err.message });
          });
      });
    });
    return true;
  }
});
