// sp_content.js
// Content script for Student Portal (sp.srmist.edu.in) to add inline attendance margin

function injectAttendanceMargin() {
    // Find the COURSE WISE ATTENDANCE table more strictly
    const cardHeaders = document.querySelectorAll('.card-header');
    let targetTable = null;
    
    for (const header of cardHeaders) {
        if (header.textContent.includes('COURSE WISE ATTENDANCE')) {
            const card = header.closest('.card');
            if (card) {
                targetTable = card.querySelector('table');
                break;
            }
        }
    }

    if (!targetTable) return;

    // Check if we've already injected
    if (targetTable.dataset.unfuglyMarginInjected) return;
    targetTable.dataset.unfuglyMarginInjected = 'true';

    // Inject header
    const theadTr = targetTable.querySelector('thead tr');
    if (theadTr) {
        const marginTh = document.createElement('th');
        marginTh.scope = 'col';
        marginTh.textContent = 'Margin';
        marginTh.style.cssText = 'width: 15%;';
        theadTr.appendChild(marginTh);
    }

    // Inject body rows
    const tbodyTrs = targetTable.querySelectorAll('tbody tr');
    tbodyTrs.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 6) {
            // Columns: 0:Code, 1:Description, 2:Max. hours, 3:Att. hours, 4:Absent hours, 5:Total Percentage
            const maxHoursRaw = tds[2].textContent.trim();
            const attHoursRaw = tds[3].textContent.trim();
            const percentageRaw = tds[5].textContent.trim();

            const totalClasses = parseInt(maxHoursRaw);
            const attendedClasses = parseInt(attHoursRaw);
            const currentPercentage = parseFloat(percentageRaw);

            let marginHtml = '<span style="color:#888;">N/A</span>';

            if (!isNaN(totalClasses) && !isNaN(attendedClasses) && totalClasses > 0) {
                if (currentPercentage >= 75) {
                    let classesToSkip = Math.floor((attendedClasses / 0.75) - totalClasses);
                    if (classesToSkip < 0) classesToSkip = 0;
                    marginHtml = `<span style="color:#4caf50; font-weight:600;">Can skip ${classesToSkip}</span>`;
                } else {
                    let classesToAttend = Math.ceil((0.75 * totalClasses - attendedClasses) / 0.25);
                    if (classesToAttend < 0) classesToAttend = 0;
                    marginHtml = `<span style="color:#f44336; font-weight:600;">Need ${classesToAttend}</span>`;
                }
            }

            const marginTd = document.createElement('td');
            marginTd.innerHTML = marginHtml;
            tr.appendChild(marginTd);
        }
    });
}

// Observe DOM for dynamic rendering (SP might use AJAX to load the table)
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            injectAttendanceMargin();
        }
    }
});

// Run once and also observe
injectAttendanceMargin();
observer.observe(document.body, { childList: true, subtree: true });

// =====================================================================
// Sidebar Scroll Preservation
// Fixes portal bug where clicking any navigation link reloads HRDSystem.jsp
// and resets .sidenav-menu scrollTop to 0.
// =====================================================================
function setupSidebarScrollPreservation() {
    const SIDEBAR_SELECTOR = '.sidenav-menu';

    function restoreScroll() {
        const menu = document.querySelector(SIDEBAR_SELECTOR);
        const savedScroll = sessionStorage.getItem('unfugly_sp_sidebar_scroll');
        if (menu && savedScroll !== null) {
            menu.scrollTop = parseInt(savedScroll, 10);
        }
    }

    function saveScroll() {
        const menu = document.querySelector(SIDEBAR_SELECTOR);
        if (menu) {
            sessionStorage.setItem('unfugly_sp_sidebar_scroll', menu.scrollTop.toString());
        }
    }

    // Save scroll before page reload or navigation clicks
    window.addEventListener('beforeunload', saveScroll);
    document.addEventListener('click', (e) => {
        if (e.target.closest('.navmenu') || e.target.closest('#accordionSidenav a')) {
            saveScroll();
        }
    }, true);

    // Save on scroll
    let scrollTimeout;
    document.addEventListener('scroll', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('sidenav-menu')) {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(saveScroll, 100);
        }
    }, true);

    // Restore immediately and after layout paint
    restoreScroll();
    requestAnimationFrame(restoreScroll);
    setTimeout(restoreScroll, 100);
    setTimeout(restoreScroll, 300);
}

setupSidebarScrollPreservation();

// =====================================================================
// Automated ONNX Captcha Solver for Student Portal (SP)
// Automatically solves and fills the captcha on login page load,
// reflects the solved value on the UI for quick verification,
// applies Unfugly signature border styling, and shows hover tooltip.
// =====================================================================
function setupSpCaptchaSolver() {
  const CAPTCHA_INPUT_SELECTORS = [
    '#captcha',
    'input[name="captcha"]',
    'input[placeholder*="captcha" i]'
  ];
  const CAPTCHA_IMG_SELECTORS = [
    '#secure_captcha',
    '#captchaImg',
    'img[data-src*="SCaptchaServlet"]',
    'img[src*="SCaptchaServlet"]'
  ];

  let isSolving = false;
  let lastSolvedSrc = '';

  function findCaptchaElements() {
    let input = null;
    let img = null;

    for (const sel of CAPTCHA_INPUT_SELECTORS) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        input = el;
        break;
      }
    }

    for (const sel of CAPTCHA_IMG_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) {
        img = el;
        break;
      }
    }

    return { input, img };
  }

  function injectUnfuglyStyles() {
    if (document.getElementById('unfugly-sp-captcha-styles')) return;
    const style = document.createElement('style');
    style.id = 'unfugly-sp-captcha-styles';
    style.textContent = `
      .unfugly-solved-input {
        border: 2px solid #00E676 !important;
        box-shadow: 0 0 0 3px rgba(0, 230, 118, 0.22) !important;
        outline: none !important;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
      .unfugly-solving-input {
        border: 2px solid rgba(0, 230, 118, 0.5) !important;
        box-shadow: 0 0 0 3px rgba(0, 230, 118, 0.12) !important;
        animation: unfuglyPulseGlow 1.4s infinite alternate ease-in-out !important;
      }
      @keyframes unfuglyPulseGlow {
        from { box-shadow: 0 0 0 2px rgba(0, 230, 118, 0.1); }
        to { box-shadow: 0 0 0 4px rgba(0, 230, 118, 0.35); }
      }
      .unfugly-captcha-badge-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 6px;
        margin-bottom: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif;
      }
      .unfugly-captcha-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(0, 230, 118, 0.08);
        border: 1px solid rgba(0, 230, 118, 0.38);
        border-radius: 7px;
        padding: 4px 9px;
        font-size: 11.5px;
        color: #00E676;
        cursor: default;
        user-select: none;
        backdrop-filter: blur(6px);
        transition: all 0.2s ease;
      }
      .unfugly-captcha-badge:hover {
        background: rgba(0, 230, 118, 0.15);
        border-color: #00E676;
      }
      .unfugly-badge-value {
        font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
        font-weight: 700;
        font-size: 13px;
        letter-spacing: 2px;
        color: #ffffff;
        background: rgba(0, 0, 0, 0.45);
        padding: 1px 7px;
        border-radius: 4px;
        border: 1px solid rgba(0, 230, 118, 0.25);
      }
      .unfugly-retry-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 3px 5px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        transition: all 0.2s ease;
      }
      .unfugly-retry-btn:hover {
        color: #00E676;
        background: rgba(0, 230, 118, 0.1);
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function renderUiReflection(input, solvedText, duration) {
    let container = document.getElementById('unfugly-captcha-reflection');
    if (!container) {
      container = document.createElement('div');
      container.id = 'unfugly-captcha-reflection';
      container.className = 'unfugly-captcha-badge-container';

      const parentFormGroup = input.closest('.form-group') || input.parentElement;
      if (parentFormGroup) {
        parentFormGroup.appendChild(container);
      } else {
        input.insertAdjacentElement('afterend', container);
      }
    }

    container.innerHTML = `
      <div class="unfugly-captcha-badge" title="Solved with by Unfugly (${duration || '<20ms'})">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Solved with by Unfugly:</span>
        <span class="unfugly-badge-value">${solvedText}</span>
      </div>
      <button type="button" class="unfugly-retry-btn" id="unfugly-captcha-re-solve" title="Click to re-solve">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
        </svg>
      </button>
    `;

    const retryBtn = document.getElementById('unfugly-captcha-re-solve');
    if (retryBtn) {
      retryBtn.onclick = (e) => {
        e.preventDefault();
        lastSolvedSrc = '';
        triggerSolve(true);
      };
    }
  }

  async function extractImageBase64(img) {
    return new Promise((resolve, reject) => {
      const runExtract = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 200;
          canvas.height = img.naturalHeight || img.height || 60;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          if (dataUrl && dataUrl.length > 200) {
            resolve(dataUrl);
          } else {
            reject(new Error('Canvas generated empty image data'));
          }
        } catch (err) {
          reject(err);
        }
      };

      if (img.complete && img.naturalWidth > 0) {
        runExtract();
      } else {
        const onLoad = () => {
          img.removeEventListener('load', onLoad);
          runExtract();
        };
        img.addEventListener('load', onLoad);
        setTimeout(() => {
          img.removeEventListener('load', onLoad);
          if (img.naturalWidth > 0) runExtract();
          else reject(new Error('Captcha image load timed out'));
        }, 3000);
      }
    });
  }

  function setNativeInputValue(input, val) {
    input.focus();
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(input, val);
    } else {
      input.value = val;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: val.slice(-1) }));
  }

  async function triggerSolve(force = false) {
    if (isSolving) return;
    const { input, img } = findCaptchaElements();
    if (!input || !img) return;

    const currentSrc = img.src || img.getAttribute('data-src') || '';
    if (!currentSrc || (!force && currentSrc === lastSolvedSrc)) return;

    isSolving = true;
    injectUnfuglyStyles();

    input.classList.add('unfugly-solving-input');
    input.title = 'Solving captcha via ONNX…';

    try {
      const imageBase64 = await extractImageBase64(img);
      lastSolvedSrc = img.src || currentSrc;

      chrome.runtime.sendMessage(
        { action: 'solve_sp_captcha', imageBase64 },
        (response) => {
          isSolving = false;
          input.classList.remove('unfugly-solving-input');

          if (response && response.success && response.text) {
            const cleanText = response.text.trim();
            setNativeInputValue(input, cleanText);

            // Unfugly signature colour border
            input.classList.add('unfugly-solved-input');

            // On hover tooltip: "Solved with by Unfugly"
            input.title = 'Solved with by Unfugly';

            // Reflect on UI so user can verify against image
            renderUiReflection(input, cleanText, response.duration);
          } else {
            input.classList.remove('unfugly-solved-input');
            input.title = 'Captcha solver failed — please enter manually';
          }
        }
      );
    } catch (err) {
      isSolving = false;
      input.classList.remove('unfugly-solving-input');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => triggerSolve());
  } else {
    triggerSolve();
  }

  // Also listen for image load or attribute updates (e.g. guardlogin.js populating src from data-src)
  const captchaImg = document.querySelector(CAPTCHA_IMG_SELECTORS.join(','));
  if (captchaImg) {
    captchaImg.addEventListener('load', () => triggerSolve());
    const imgObserver = new MutationObserver(() => triggerSolve());
    imgObserver.observe(captchaImg, { attributes: true, attributeFilter: ['src', 'data-src'] });
  }

  // Global observer for dynamic login container rendering
  const pageObserver = new MutationObserver(() => {
    const { input, img } = findCaptchaElements();
    if (input && img && (!lastSolvedSrc || img.src !== lastSolvedSrc)) {
      triggerSolve();
    }
  });
  pageObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
}

setupSpCaptchaSolver();

