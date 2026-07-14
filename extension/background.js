const getTimestamp = () => {
  const now = new Date();
  return now.toTimeString().split(' ')[0]; // HH:MM:SS
};

const LOG_COLORS = {
  INFO: '#00E676',   // Neon Green
  WARN: '#FFD600',   // Amber Yellow
  ERROR: '#FF1744'   // Vibrant Red
};

const log = (level, code, message, ...args) => {
  if (level === 'INFO') return; // Suppress INFO logs entirely in console
  
  const time = getTimestamp();
  const color = LOG_COLORS[level] || '#fff';
  const formattedPrefix = `%c[UNFUGLY BG] ${time} ${level} | ${code}:`;
  const style = `background: #222; color: ${color}; font-weight: bold; padding: 1px 3px; border-radius: 2px;`;
  
  if (level === 'ERROR') {
    console.error(formattedPrefix, style);
  } else if (level === 'WARN') {
    console.warn(formattedPrefix, style);
  }
};

const UnfuglyLog = {
  info: (code, message, ...args) => log('INFO', code, message, ...args),
  warn: (code, message, ...args) => log('WARN', code, message, ...args),
  error: (code, message, ...args) => log('ERROR', code, message, ...args)
};

chrome.runtime.onUpdateAvailable.addListener(() => {
  chrome.runtime.reload();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "trigger_update") {
    chrome.runtime.requestUpdateCheck((status) => {
      UnfuglyLog.info('SYS_01', `Update check status: ${status}`);
    });
    return false;
  }

  if (request.action === "get_academia_cookies") {
    chrome.cookies.getAll({ domain: "academia.srmist.edu.in" })
      .then(cookies => sendResponse({ cookies }))
      .catch(err => sendResponse({ cookies: [], error: err.message }));
    return true;
  }

  if (request.action === "fetch_backend") {
    handleFetchBackend(request, sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function handleFetchBackend(request, sendResponse) {
  try {
    // Query all cookies matching the host permissions in one call to get parent domains and all regions
    const combined = await chrome.cookies.getAll({});

    if (combined.length === 0) {
      UnfuglyLog.warn('AUTH_01', 'No cookies found! Auth will fail. Are you logged into Academia?');
    }

    const options = request.options || {};
    options.headers = options.headers || {};
    options.headers['x-academia-cookies'] = JSON.stringify(combined);

    const res = await fetch(request.url, options);
    const text = await res.text();
    
    const data = {
      status: res.status,
      ok: res.ok,
      text: text
    };

    if (!data.ok) {
      const errCode = data.status === 401 ? 'AUTH_02' : 'SYS_01';
      UnfuglyLog.error(errCode, `Backend returned ${data.status} for ${request.url}: ${data.text.slice(0, 300)}`);
    }
    
    sendResponse({ success: true, data });
  } catch (err) {
    UnfuglyLog.error('SYS_02', `fetch failed for ${request.url}: ${err.message}`);
    sendResponse({ success: false, error: err.message });
  }
}
