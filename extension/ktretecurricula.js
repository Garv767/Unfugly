// extension/ktretecurricula.js
// Unfugly SRM KTR E-Curricula 2FA Authenticator Companion Content Script
// Automatically generates and refreshes Google Authenticator TOTP codes on ktretecurricula portal.

(function () {
  'use strict';

  // Strict URL guard: only execute on https://dld.srmist.edu.in/ktretecurricula/#/
  if (
    !window.location.origin.includes('dld.srmist.edu.in') ||
    !window.location.pathname.startsWith('/ktretecurricula')
  ) {
    return;
  }

  // =========================================================================
  // 0. Anti-DevTools & Disable-Devtool Lockout Shield (Runs immediately)
  // =========================================================================
  function unblockDevTools() {
    // 1. Capture phase: Stop page scripts from blocking contextmenu, copy, cut, text selection
    ['contextmenu', 'copy', 'cut', 'selectstart'].forEach((evt) => {
      window.addEventListener(
        evt,
        (e) => {
          e.stopImmediatePropagation();
        },
        true
      );
    });

    // 2. Capture phase: Stop page scripts from intercepting F12, Ctrl+Shift+I/J/C, Ctrl+U
    window.addEventListener(
      'keydown',
      (e) => {
        if (
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
          (e.ctrlKey && ['U', 'u'].includes(e.key))
        ) {
          e.stopImmediatePropagation();
        }
      },
      true
    );

    // 3. Inject script into main execution context to fully neuter 'disable-devtool' & debugger traps
    try {
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          try {
            // A. NEUTER disable-devtool VIA USER-AGENT BOT BYPASS (Instant Library Exit)
            // The disable-devtool library explicitly checks: if (d.seo && info.seoBot) return disable('disable by bot');
            // where seoBot = !mobile && /(googlebot|baiduspider|bingbot|applebot|petalbot|yandexbot|bytespider|chrome\\-lighthouse|moto g power)/i.test(navigator.userAgent.toLowerCase())
            // Appending Googlebot triggers immediate clean exit before any detector runs.
            try {
              const origUADesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent');
              const origGetter = origUADesc ? origUADesc.get : null;
              Object.defineProperty(Navigator.prototype, 'userAgent', {
                get: function() {
                  const raw = origGetter ? origGetter.call(this) : (navigator.userAgent || 'Mozilla/5.0');
                  return raw.includes('Googlebot') ? raw : raw + ' (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
                },
                configurable: true,
                enumerable: true
              });
            } catch (_) {}

            // B. GLOBAL DisableDevtool OBJECT PRE-EMPTION
            // In case any script references or initializes DisableDevtool, freeze it in permanently suspended state.
            try {
              const dummyDisableDevtool = function() {
                return { success: false, reason: 'suspended' };
              };
              dummyDisableDevtool.isSuspend = true;
              dummyDisableDevtool.isRunning = true;
              dummyDisableDevtool.stop = function() {};
              dummyDisableDevtool.close = function() {};
              dummyDisableDevtool.isDevToolOpened = function() { return false; };
              dummyDisableDevtool.DetectorType = {};
              dummyDisableDevtool.version = '0.3.9';

              Object.defineProperty(window, 'DisableDevtool', {
                get: function() { return dummyDisableDevtool; },
                set: function() {},
                configurable: true
              });
              Object.defineProperty(window, 'disableDevtool', {
                get: function() { return dummyDisableDevtool; },
                set: function() {},
                configurable: true
              });
              if (typeof globalThis !== 'undefined') {
                Object.defineProperty(globalThis, 'DisableDevtool', {
                  get: function() { return dummyDisableDevtool; },
                  set: function() {},
                  configurable: true
                });
              }
            } catch (_) {}

            // C. DEFANG console.table AND console.clear (Performance Benchmark Detector neutralization)
            // disable-devtool compares high-volume console.table execution time against console.log
            try {
              console.table = function() {};
              console.clear = function() {};
            } catch (_) {}

            // D. INTERCEPT DYNAMIC DEBUGGER EVALUATION
            try {
              const origConstructor = Function.prototype.constructor;
              Function.prototype.constructor = function(str) {
                if (typeof str === 'string' && str.includes('debugger')) {
                  return function() {};
                }
                return origConstructor.apply(this, arguments);
              };

              const origEval = window.eval;
              window.eval = function(code) {
                if (typeof code === 'string' && code.includes('debugger')) {
                  code = code.replace(/\\bdebugger\\b/g, '');
                }
                return origEval ? origEval.call(this, code) : undefined;
              };
            } catch (_) {}

            // E. INTERCEPT TAB CLOSING & LOCKOUT REDIRECT ATTEMPTS
            // disable-devtool executes window.opener=null; window.open('','_self'); window.close(); window.history.back();
            // followed by a setTimeout redirect to theajack.github.io/disable-devtool/404.html
            try {
              window.close = function() {
                console.warn('[Unfugly] Blocked anti-devtool window.close() attempt');
              };
              window.history.back = function() {
                console.warn('[Unfugly] Blocked anti-devtool history.back() attempt');
              };
              const origOpen = window.open;
              window.open = function(url, target) {
                if (url === '' && target === '_self') {
                  console.warn('[Unfugly] Blocked anti-devtool window.open("", "_self")');
                  return window;
                }
                return origOpen ? origOpen.apply(this, arguments) : null;
              };

              const origSetTimeout = window.setTimeout;
              window.setTimeout = function(fn, delay, ...args) {
                if (typeof fn === 'function') {
                  const fnStr = String(fn);
                  if (fnStr.includes('theajack') || fnStr.includes('404.html') || fnStr.includes('timeOutUrl')) {
                    console.warn('[Unfugly] Blocked disable-devtool timeout redirect function');
                    return -1;
                  }
                }
                return origSetTimeout.call(this, fn, delay, ...args);
              };
            } catch (_) {}

            // F. CLEAR EVENT TRAPS ON window & document
            try {
              window.oncontextmenu = null;
              document.oncontextmenu = null;
              window.onkeydown = null;
              document.onkeydown = null;
              window.onselectstart = null;
              document.onselectstart = null;
            } catch (_) {}
          } catch (_) {}
        })();
      `;
      (document.documentElement || document.head || document).appendChild(script);
      script.remove();
    } catch (_) {}
  }

  unblockDevTools();

  // Prevent multiple injections of content script
  if (window.unfuglyKtreteTotpLoaded) return;
  window.unfuglyKtreteTotpLoaded = true;

  // Storage Keys
  const STORAGE_KEYS = {
    secret: 'unfuglyKtreteTotpSecret',
    account: 'unfuglyKtreteTotpAccount',
    issuer: 'unfuglyKtreteTotpIssuer',
    digits: 'unfuglyKtreteTotpDigits',
    period: 'unfuglyKtreteTotpPeriod',
    minimized: 'unfuglyKtreteTotpMinimized',
    position: 'unfuglyKtretePosition',
    miniPosition: 'unfuglyKtreteMiniPosition',
    autoInject: 'unfuglyKtreteAutoInject'
  };

  // State
  let currentSecret = null;
  let currentAccount = 'KTRETE Curricula';
  let currentDigits = 6;
  let currentPeriod = 30;
  let currentTotpCode = '------';
  let isMinimized = false;
  let isSetupModalOpen = false;
  let isInspectorOpen = false;
  let isDropdownOpen = false;
  let isAutoInjectEnabled = true;
  let activeSetupTab = 'camera'; // 'camera' | 'upload' | 'manual'
  let timerInterval = null;
  let lastStep = -1;
  let savedPosition = null;
  let savedMiniPosition = null;

  // Camera stream state
  let activeCameraStream = null;
  let cameraScanInterval = null;

  // Inspector & Element Picker State
  let inspectedElement = null;
  let isPickerActive = false;
  let pickerOverlay = null;

  // Auto-inject cooldown tracking
  let autoInjectCooldown = 0;

  // =========================================================================
  // 1. Storage Helpers
  // =========================================================================
  function getStorageData(keys) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(keys, resolve);
        } else {
          const res = {};
          keys.forEach((k) => {
            const v = localStorage.getItem(k);
            if (v !== null) {
              try {
                res[k] = JSON.parse(v);
              } catch (_) {
                res[k] = v;
              }
            }
          });
          resolve(res);
        }
      } catch (err) {
        console.error('[Unfugly 2FA] Failed to read storage:', err);
        resolve({});
      }
    });
  }

  function setStorageData(items) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set(items, resolve);
        } else {
          Object.entries(items).forEach(([k, v]) => {
            localStorage.setItem(k, JSON.stringify(v));
          });
          resolve();
        }
      } catch (err) {
        console.error('[Unfugly 2FA] Failed to set storage:', err);
        resolve();
      }
    });
  }

  function removeStorageData(keys) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.remove(keys, resolve);
        } else {
          keys.forEach((k) => localStorage.removeItem(k));
          resolve();
        }
      } catch (err) {
        console.error('[Unfugly 2FA] Failed to remove storage:', err);
        resolve();
      }
    });
  }

  // =========================================================================
  // 2. Base32 & TOTP Algorithm (RFC 6238 / RFC 4226)
  // =========================================================================
  function base32ToBytes(base32) {
    const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (let i = 0; i < clean.length; i++) {
      const val = alphabet.indexOf(clean[i]);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    return new Uint8Array(bytes);
  }

  function bytesToBase32(bytes) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (let i = 0; i < bytes.length; i++) {
      bits += bytes[i].toString(2).padStart(8, '0');
    }
    let base32 = '';
    for (let i = 0; i < bits.length; i += 5) {
      const chunk = bits.substr(i, 5);
      if (chunk.length < 5) {
        base32 += alphabet[parseInt(chunk.padEnd(5, '0'), 2)];
      } else {
        base32 += alphabet[parseInt(chunk, 2)];
      }
    }
    return base32;
  }

  async function generateTotp(secret, epochSeconds = Math.floor(Date.now() / 1000), stepSeconds = 30, digits = 6) {
    try {
      const counter = Math.floor(epochSeconds / stepSeconds);
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setUint32(0, Math.floor(counter / 0x100000000));
      view.setUint32(4, counter >>> 0);

      const keyBytes = base32ToBytes(secret);
      if (!keyBytes || keyBytes.length === 0) return '------';

      const cryptoObj = window.crypto && window.crypto.subtle ? window.crypto : null;
      if (!cryptoObj) {
        console.error('[Unfugly 2FA] Web Crypto API not available');
        return '------';
      }

      const cryptoKey = await cryptoObj.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: { name: 'SHA-1' } },
        false,
        ['sign']
      );

      const signature = await cryptoObj.subtle.sign('HMAC', cryptoKey, buffer);
      const hmac = new Uint8Array(signature);
      const offset = hmac[hmac.length - 1] & 0x0f;
      const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

      const otp = binary % Math.pow(10, digits);
      return String(otp).padStart(digits, '0');
    } catch (err) {
      console.error('[Unfugly 2FA] Error computing TOTP:', err);
      return '------';
    }
  }

  // =========================================================================
  // 3. Google Authenticator Migration (otpauth-migration://) Protobuf Decoder
  // =========================================================================
  function decodeGoogleAuthMigration(dataParam) {
    try {
      const decodedStr = decodeURIComponent(dataParam);
      const binaryStr = atob(decodedStr);
      const buffer = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        buffer[i] = binaryStr.charCodeAt(i);
      }

      let pos = 0;
      const accounts = [];

      while (pos < buffer.length) {
        const key = buffer[pos++];
        const fieldNumber = key >> 3;
        const wireType = key & 0x07;

        let lenOrVal = 0, shift = 0;
        while (pos < buffer.length) {
          const b = buffer[pos++];
          lenOrVal |= (b & 0x7f) << shift;
          if ((b & 0x80) === 0) break;
          shift += 7;
        }

        if (wireType === 2 && fieldNumber === 1) {
          const otpBytes = buffer.slice(pos, pos + lenOrVal);
          pos += lenOrVal;

          let subPos = 0;
          let secretBytes = null;
          let name = '';
          let issuer = '';
          let digits = 6;
          let period = 30;

          while (subPos < otpBytes.length) {
            const subKey = otpBytes[subPos++];
            const subFieldNumber = subKey >> 3;
            const subWireType = subKey & 0x07;

            let subVal = 0, subShift = 0;
            while (subPos < otpBytes.length) {
              const sb = otpBytes[subPos++];
              subVal |= (sb & 0x7f) << subShift;
              if ((sb & 0x80) === 0) break;
              subShift += 7;
            }

            if (subWireType === 2) {
              const chunk = otpBytes.slice(subPos, subPos + subVal);
              subPos += subVal;
              if (subFieldNumber === 1) secretBytes = chunk;
              else if (subFieldNumber === 2) name = new TextDecoder().decode(chunk);
              else if (subFieldNumber === 3) issuer = new TextDecoder().decode(chunk);
            } else if (subWireType === 0) {
              if (subFieldNumber === 5) digits = subVal === 2 ? 8 : 6;
            }
          }

          if (secretBytes) {
            const base32Secret = bytesToBase32(secretBytes);
            accounts.push({
              secret: base32Secret,
              label: name || issuer || 'KTRETE Curricula',
              issuer: issuer,
              digits: digits,
              period: period
            });
          }
        } else if (wireType === 2) {
          pos += lenOrVal;
        }
      }

      return accounts;
    } catch (err) {
      console.error('[Unfugly 2FA] Failed to decode otpauth-migration:', err);
      return [];
    }
  }

  // =========================================================================
  // 4. Input & QR Code Parser
  // =========================================================================
  function parseTotpInput(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    if (trimmed.startsWith('otpauth-migration://')) {
      try {
        const url = new URL(trimmed);
        const dataParam = url.searchParams.get('data');
        if (dataParam) {
          const accounts = decodeGoogleAuthMigration(dataParam);
          if (accounts.length > 0) {
            const srmAccount = accounts.find(
              (a) =>
                /srm|ktrete|curricula|dld/i.test(a.label) ||
                /srm|ktrete|curricula|dld/i.test(a.issuer)
            );
            return srmAccount || accounts[0];
          }
        }
      } catch (err) {
        console.error('[Unfugly 2FA] Migration URL parse error:', err);
      }
    }

    if (trimmed.startsWith('otpauth://')) {
      try {
        const url = new URL(trimmed);
        const secret = url.searchParams.get('secret');
        if (!secret) return null;
        const issuer = url.searchParams.get('issuer') || '';
        let label = decodeURIComponent(url.pathname.replace(/^\/+/, '').replace(/^totp\//i, ''));
        return {
          secret: secret.replace(/\s+/g, '').toUpperCase(),
          label: label || issuer || 'KTRETE Curricula',
          issuer: issuer,
          digits: parseInt(url.searchParams.get('digits') || '6', 10),
          period: parseInt(url.searchParams.get('period') || '30', 10)
        };
      } catch (_) {
        const secretMatch = trimmed.match(/[?&]secret=([A-Za-z2-7]+)/i);
        if (secretMatch) {
          return {
            secret: secretMatch[1].toUpperCase(),
            label: 'KTRETE Curricula',
            digits: 6,
            period: 30
          };
        }
      }
    }

    const cleaned = trimmed.replace(/\s+/g, '').toUpperCase();
    if (/^[A-Z2-7]{8,}$/.test(cleaned)) {
      return {
        secret: cleaned,
        label: 'KTRETE Curricula',
        digits: 6,
        period: 30
      };
    }

    return null;
  }

  async function scanQrFromImage(imgElementOrCanvas) {
    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const codes = await detector.detect(imgElementOrCanvas);
        if (codes && codes.length > 0 && codes[0].rawValue) {
          return codes[0].rawValue;
        }
      } catch (_) {}
    }

    if (typeof jsQR !== 'undefined') {
      try {
        let width = imgElementOrCanvas.videoWidth || imgElementOrCanvas.naturalWidth || imgElementOrCanvas.width;
        let height = imgElementOrCanvas.videoHeight || imgElementOrCanvas.naturalHeight || imgElementOrCanvas.height;
        if (!width || !height) return null;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgElementOrCanvas, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const qrResult = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
        if (qrResult && qrResult.data) {
          return qrResult.data;
        }
      } catch (err) {
        console.warn('[Unfugly 2FA] jsQR scan failed:', err);
      }
    }

    return null;
  }

  function scanFileBlob(file) {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          const rawCode = await scanQrFromImage(img);
          resolve(rawCode);
        };
        img.onerror = () => resolve(null);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  async function scanDomForQrCode() {
    const images = Array.from(document.querySelectorAll('img, canvas'));
    for (const el of images) {
      try {
        const rawCode = await scanQrFromImage(el);
        if (rawCode) {
          const parsed = parseTotpInput(rawCode);
          if (parsed) return parsed;
        }
      } catch (_) {}
    }
    return null;
  }

  // =========================================================================
  // 5. Intelligent Multi-Popup Auto-Injector
  // =========================================================================
  function findActiveModal() {
    const modalSelectors = [
      '.modal.show',
      '.modal.in',
      '.modal[style*="display: block"]',
      '.modal[style*="display:block"]',
      '.swal2-container',
      '.swal-overlay',
      '.swal-modal',
      'mat-dialog-container',
      '.p-dialog',
      '[role="dialog"]:not([aria-hidden="true"])',
      '[aria-modal="true"]:not([aria-hidden="true"])',
      '.cdk-overlay-pane',
      '.dialog:not([style*="display: none"])',
      '.popup:not([style*="display: none"])',
      '.overlay:not([style*="display: none"])',
      '#otpModal',
      '#verifyModal',
      '#checkModal'
    ];
    for (const sel of modalSelectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        return el;
      }
    }
    return null;
  }

  function findActiveOtpTargets() {
    // 1. Check inside active modal/dialog (submission verification or 5-min check)
    const activeModal = findActiveModal();
    if (activeModal) {
      // Split 6-digit box inputs inside modal
      const splitInputs = Array.from(
        activeModal.querySelectorAll('input[maxlength="1"], input.otp-box, input.digit-input, input[aria-label*="digit" i]')
      ).filter((el) => el.offsetParent !== null && !el.disabled && !el.readOnly);

      if (splitInputs.length === 6) {
        return { type: 'split', inputs: splitInputs, container: activeModal };
      }

      // Explicit OTP input inside modal
      const modalOtpInput = activeModal.querySelector(
        'input[name*="otp" i], input[id*="otp" i], input[placeholder*="otp" i], input[placeholder*="code" i], input[placeholder*="authenticator" i], input[placeholder*="token" i], input[autocomplete="one-time-code"], input[maxlength="6"], input[formcontrolname*="otp" i], input[ng-model*="otp" i]'
      );
      if (modalOtpInput && modalOtpInput.offsetParent !== null && !modalOtpInput.disabled && !modalOtpInput.readOnly) {
        return { type: 'single', inputs: [modalOtpInput], container: activeModal };
      }

      // If modal has only 1 text/number input, that IS the verification input
      const visibleInputs = Array.from(
        activeModal.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])')
      ).filter((el) => el.offsetParent !== null && !el.disabled && !el.readOnly);

      if (visibleInputs.length === 1) {
        return { type: 'single', inputs: [visibleInputs[0]], container: activeModal };
      }
    }

    // 2. Global fallback
    const globalSplit = Array.from(
      document.querySelectorAll('input[maxlength="1"], input.otp-box, input.digit-input, input[aria-label*="digit" i]')
    ).filter((el) => el.offsetParent !== null && !el.disabled && !el.readOnly);
    if (globalSplit.length === 6) {
      return { type: 'split', inputs: globalSplit, container: document.body };
    }

    const globalSingle = findSingleOtpInput();
    if (globalSingle) {
      return { type: 'single', inputs: [globalSingle], container: document.body };
    }

    return null;
  }

  function findSingleOtpInput() {
    if (
      document.activeElement &&
      document.activeElement.tagName === 'INPUT' &&
      !['hidden', 'submit', 'button', 'checkbox', 'radio'].includes(document.activeElement.type)
    ) {
      return document.activeElement;
    }
    const selectors = [
      'input[name*="otp" i]',
      'input[id*="otp" i]',
      'input[placeholder*="otp" i]',
      'input[placeholder*="code" i]',
      'input[placeholder*="authenticator" i]',
      'input[placeholder*="token" i]',
      'input[placeholder*="verification" i]',
      'input[placeholder*="digit" i]',
      'input[name*="code" i]',
      'input[id*="code" i]',
      'input[autocomplete="one-time-code"]',
      'input[maxlength="6"]',
      'input[formcontrolname*="otp" i]',
      'input[ng-model*="otp" i]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null && !el.disabled && !el.readOnly) {
        return el;
      }
    }
    return null;
  }

  // =========================================================================
  // Human-Paced OTP Typing & Anti-Detection Automation
  // =========================================================================
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Emulates an individual human keystroke with native framework descriptors (React, Angular, Vue)
  function simulateKeyStroke(input, char, fullValueSoFar) {
    input.focus();
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

    // 1. Keydown event
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: char,
        code: `Digit${char}`,
        charCode: char.charCodeAt(0),
        keyCode: char.charCodeAt(0),
        which: char.charCodeAt(0),
        bubbles: true,
        cancelable: true
      })
    );

    // 2. Set native value via prototype descriptor
    if (nativeSetter) {
      nativeSetter.call(input, fullValueSoFar);
    } else {
      input.value = fullValueSoFar;
    }

    // 3. Input event with realistic inputType & data
    try {
      input.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: char
        })
      );
    } catch (_) {
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    // 4. Keypress & Change events
    input.dispatchEvent(
      new KeyboardEvent('keypress', {
        key: char,
        code: `Digit${char}`,
        charCode: char.charCodeAt(0),
        keyCode: char.charCodeAt(0),
        which: char.charCodeAt(0),
        bubbles: true,
        cancelable: true
      })
    );
    input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

    // 5. Keyup event
    input.dispatchEvent(
      new KeyboardEvent('keyup', {
        key: char,
        code: `Digit${char}`,
        charCode: char.charCodeAt(0),
        keyCode: char.charCodeAt(0),
        which: char.charCodeAt(0),
        bubbles: true,
        cancelable: true
      })
    );
  }

  // Asynchronous human-paced OTP typing with natural rhythm & jitter
  let isTypingOtp = false;
  let pendingInjectTimer = null;

  async function humanTypeOtp(targets, code, initialReactionDelay = 1400) {
    if (isTypingOtp) return false;
    isTypingOtp = true;

    try {
      const cleanCode = code.replace(/\s+/g, '');
      if (!cleanCode || cleanCode.length !== 6 || cleanCode === '------') return false;

      // 1. Realistic human reaction delay before typing starts
      if (initialReactionDelay > 0) {
        const jitter = Math.floor(Math.random() * 400 - 200); // +/- 200ms
        const reactionWait = Math.max(900, initialReactionDelay + jitter);
        await sleep(reactionWait);
      }

      // Check if target is still present in DOM and visible
      const primaryInput = targets.inputs[0];
      if (!primaryInput || !primaryInput.isConnected || primaryInput.offsetParent === null) {
        return false;
      }

      // Check if inputs are already filled
      if (targets.type === 'split') {
        const alreadyFilled = targets.inputs.every((inp) => inp.value && inp.value.trim().length > 0);
        if (alreadyFilled) return false;

        for (let i = 0; i < targets.inputs.length && i < 6; i++) {
          const inp = targets.inputs[i];
          if (!inp || !inp.isConnected) break;
          const digit = cleanCode[i];
          simulateKeyStroke(inp, digit, digit);

          // Human typing cadence: 130ms - 210ms with jitter per digit
          const cadence = 130 + Math.floor(Math.random() * 80);
          await sleep(cadence);
        }
      } else {
        if (primaryInput.value && primaryInput.value.replace(/\s+/g, '') === cleanCode) return false;

        let currentValue = '';
        for (let i = 0; i < cleanCode.length; i++) {
          const digit = cleanCode[i];
          currentValue += digit;
          simulateKeyStroke(primaryInput, digit, currentValue);

          // Human typing cadence: 120ms - 190ms with jitter per digit
          const cadence = 120 + Math.floor(Math.random() * 70);
          await sleep(cadence);
        }
      }

      // Record successful fill metadata
      const now = Date.now();
      primaryInput.dataset.unfuglyLastFilledCode = cleanCode;
      primaryInput.dataset.unfuglyLastFilledTime = String(now);
      autoInjectCooldown = now;

      showToast(`Entered OTP (${cleanCode}) ✓`);
      return true;
    } finally {
      isTypingOtp = false;
    }
  }

  function autofillOtp(code, isManualClick = false) {
    const targets = findActiveOtpTargets();
    if (!targets) return false;
    const cleanCode = code.replace(/\s+/g, '');
    if (!cleanCode || cleanCode === '------') return false;

    // For manual user clicks, use a minimal reaction pause (180ms)
    // For automated events, use full human reaction pause (1400ms)
    const initialDelay = isManualClick ? 180 : 1400;
    humanTypeOtp(targets, cleanCode, initialDelay);
    return true;
  }

  // Automatic Injection on Modal/Popup Appearance (Submissions + 5-min check)
  function checkAndAutoInject() {
    if (!currentSecret || !isAutoInjectEnabled || isTypingOtp || pendingInjectTimer) return;

    const targets = findActiveOtpTargets();
    if (!targets || targets.inputs.length === 0) return;

    const primaryInput = targets.inputs[0];
    const cleanCode = currentTotpCode.replace(/\s+/g, '');
    if (!cleanCode || cleanCode.length !== 6 || cleanCode === '------') return;

    const now = Date.now();
    const lastFilledCode = primaryInput.dataset.unfuglyLastFilledCode;
    const lastFilledTime = parseInt(primaryInput.dataset.unfuglyLastFilledTime, 10) || 0;

    // Skip if already filled recently with the same code or cooldown active
    if (lastFilledCode === cleanCode && now - lastFilledTime < 10000) return;
    if (now - autoInjectCooldown < 8000) return;

    // Skip if inputs are already filled
    if (targets.type === 'split') {
      const allFilled = targets.inputs.every((inp) => inp.value && inp.value.trim().length > 0);
      if (allFilled) return;
    } else if (primaryInput.value && primaryInput.value.replace(/\s+/g, '') === cleanCode) {
      return;
    }

    // Schedule human-paced injection with natural reaction pause
    pendingInjectTimer = setTimeout(() => {
      pendingInjectTimer = null;
      if (!isTypingOtp) {
        humanTypeOtp(targets, cleanCode, 300); // 300ms additional breathing room after timer
      }
    }, 1300 + Math.floor(Math.random() * 400)); // 1.3s - 1.7s initial pause before typing starts
  }

  // MutationObserver to catch every subsequent submission & 5-minute inactivity popup
  function setupPopupObserver() {
    const observer = new MutationObserver(() => {
      checkAndAutoInject();
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden']
    });

    // Fallback periodic check every 1.5 seconds
    setInterval(checkAndAutoInject, 1500);
  }

  // =========================================================================
  // 6. Camera / Webcam Live QR Scanner
  // =========================================================================
  async function startCameraScanner() {
    if (!shadowRoot) return;
    const video = shadowRoot.getElementById('unfugly-camera-video');
    const startBtn = shadowRoot.getElementById('unfugly-start-cam-btn');
    const stopBtn = shadowRoot.getElementById('unfugly-stop-cam-btn');
    const laser = shadowRoot.getElementById('unfugly-scan-laser');

    if (!video) return;

    try {
      if (activeCameraStream) {
        stopCameraScanner();
      }

      showModalAlert('Accessing camera...', 'info');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      activeCameraStream = stream;
      video.srcObject = stream;
      await video.play();

      if (startBtn) startBtn.style.display = 'none';
      if (stopBtn) stopBtn.style.display = 'inline-flex';
      if (laser) laser.style.display = 'block';

      clearModalAlert();
      showModalAlert('Align Google Authenticator Export QR code in frame', 'info');

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      cameraScanInterval = setInterval(async () => {
        if (!video.videoWidth || !video.videoHeight) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (typeof jsQR !== 'undefined') {
          const qrResult = jsQR(imgData.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
          if (qrResult && qrResult.data) {
            const parsed = parseTotpInput(qrResult.data);
            if (parsed) {
              stopCameraScanner();
              await saveNewSecret(parsed);
            }
          }
        }
      }, 150);
    } catch (err) {
      console.error('[Unfugly 2FA] Camera access error:', err);
      showModalAlert('Camera permission was blocked or unavailable. Try screenshot / file upload.', 'error');
      stopCameraScanner();
    }
  }

  function stopCameraScanner() {
    if (cameraScanInterval) {
      clearInterval(cameraScanInterval);
      cameraScanInterval = null;
    }
    if (activeCameraStream) {
      activeCameraStream.getTracks().forEach((track) => track.stop());
      activeCameraStream = null;
    }
    if (shadowRoot) {
      const startBtn = shadowRoot.getElementById('unfugly-start-cam-btn');
      const stopBtn = shadowRoot.getElementById('unfugly-stop-cam-btn');
      const laser = shadowRoot.getElementById('unfugly-scan-laser');
      if (startBtn) startBtn.style.display = 'inline-flex';
      if (stopBtn) stopBtn.style.display = 'none';
      if (laser) laser.style.display = 'none';
    }
  }

  // =========================================================================
  // 7. Draggable Controller
  // =========================================================================
  function makeElementDraggable(element, dragHandle, onPositionSaved) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;
    let hasMoved = false;

    const onPointerDown = (e) => {
      if (e.button !== 0 && e.type !== 'touchstart') return;
      if (e.target.closest('button, input, select, textarea, .unfugly-code-chip')) return;

      isDragging = true;
      hasMoved = false;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      startX = clientX;
      startY = clientY;

      const rect = element.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      element.style.transform = 'none';
      element.style.left = `${startLeft}px`;
      element.style.top = `${startTop}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';

      dragHandle.classList.add('dragging');
      document.body.style.userSelect = 'none';

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('touchmove', onPointerMove, { passive: false });
      document.addEventListener('touchend', onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const dx = clientX - startX;
      const dy = clientY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
      }

      if (!hasMoved) return;
      if (e.cancelable) e.preventDefault();

      const rect = element.getBoundingClientRect();
      const maxX = Math.max(0, window.innerWidth - rect.width - 12);
      const maxY = Math.max(0, window.innerHeight - rect.height - 12);

      const newLeft = Math.max(12, Math.min(maxX, startLeft + dx));
      const newTop = Math.max(12, Math.min(maxY, startTop + dy));

      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      dragHandle.classList.remove('dragging');
      document.body.style.userSelect = '';

      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('touchend', onPointerUp);

      if (hasMoved && onPositionSaved) {
        const rect = element.getBoundingClientRect();
        onPositionSaved({ left: Math.round(rect.left), top: Math.round(rect.top) });
      }
    };

    dragHandle.addEventListener('pointerdown', onPointerDown);
    dragHandle.addEventListener('touchstart', onPointerDown, { passive: true });
  }

  // =========================================================================
  // 8. Interactive Element Picker Tool
  // =========================================================================
  function startElementPicker() {
    isPickerActive = true;
    isInspectorOpen = false;
    renderWidget();

    showToast('Click any popup or element on page to inspect its HTML');

    pickerOverlay = document.createElement('div');
    pickerOverlay.id = 'unfugly-picker-overlay';
    pickerOverlay.style.cssText =
      'position: fixed; pointer-events: none; border: 2px solid #38bdf8; background: rgba(56, 189, 248, 0.15); z-index: 2147483646; transition: all 0.05s ease; border-radius: 4px; display: none;';
    document.documentElement.appendChild(pickerOverlay);

    const onMove = (e) => {
      if (!isPickerActive) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (target && !target.closest('#unfugly-ktrete-authenticator-host')) {
        const rect = target.getBoundingClientRect();
        pickerOverlay.style.display = 'block';
        pickerOverlay.style.top = `${rect.top}px`;
        pickerOverlay.style.left = `${rect.left}px`;
        pickerOverlay.style.width = `${rect.width}px`;
        pickerOverlay.style.height = `${rect.height}px`;
      }
    };

    const onClick = (e) => {
      if (!isPickerActive) return;
      e.preventDefault();
      e.stopPropagation();

      const target = document.elementFromPoint(e.clientX, e.clientY);
      stopElementPicker();

      if (target && !target.closest('#unfugly-ktrete-authenticator-host')) {
        inspectedElement = target;
        isInspectorOpen = true;
        renderWidget();
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && isPickerActive) {
        stopElementPicker();
        isInspectorOpen = true;
        renderWidget();
      }
    };

    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);

    window._unfuglyCleanPicker = () => {
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      if (pickerOverlay) {
        pickerOverlay.remove();
        pickerOverlay = null;
      }
    };
  }

  function stopElementPicker() {
    isPickerActive = false;
    if (window._unfuglyCleanPicker) {
      window._unfuglyCleanPicker();
      window._unfuglyCleanPicker = null;
    }
  }

  function generateSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return `#${el.id}`;
    let path = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).filter((c) => c && !c.startsWith('ng-'));
      if (classes.length) path += `.${classes.slice(0, 2).join('.')}`;
    }
    if (el.getAttribute('name')) path += `[name="${el.getAttribute('name')}"]`;
    if (el.getAttribute('placeholder')) path += `[placeholder*="${el.getAttribute('placeholder').slice(0, 10)}"]`;
    return path;
  }

  // =========================================================================
  // 9. Shadow DOM UI Injection (Ultra-Refined Minimalist Glass Aesthetic)
  // =========================================================================
  let shadowRoot = null;

  function initUi() {
    const host = document.createElement('div');
    host.id = 'unfugly-ktrete-authenticator-host';
    shadowRoot = host.attachShadow({ mode: 'open' });
    document.documentElement.appendChild(host);

    renderWidget();
  }

  function getBarPositionStyle() {
    if (savedPosition && typeof savedPosition.left === 'number' && typeof savedPosition.top === 'number') {
      const clampLeft = Math.max(12, Math.min(window.innerWidth - 300, savedPosition.left));
      const clampTop = Math.max(12, Math.min(window.innerHeight - 56, savedPosition.top));
      return `left: ${clampLeft}px; top: ${clampTop}px; transform: none; right: auto;`;
    }
    return `left: 50%; top: 14px; transform: translateX(-50%);`;
  }

  function getMiniPositionStyle() {
    if (savedMiniPosition && typeof savedMiniPosition.left === 'number' && typeof savedMiniPosition.top === 'number') {
      const clampLeft = Math.max(12, Math.min(window.innerWidth - 160, savedMiniPosition.left));
      const clampTop = Math.max(12, Math.min(window.innerHeight - 44, savedMiniPosition.top));
      return `left: ${clampLeft}px; top: ${clampTop}px; right: auto;`;
    }
    return `top: 14px; right: 20px;`;
  }

  const CIRCLE_RADIUS = 11;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~69.115

  function renderWidget() {
    if (!shadowRoot) return;

    // Detect active modal & inputs for inspector
    const activeModal = findActiveModal();
    const modalHtml = activeModal ? activeModal.outerHTML : '';
    const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));

    shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
          font-size: 13px;
          line-height: 1.4;
          box-sizing: border-box;
          color: #f1f5f9;
          user-select: none;
          z-index: 2147483647;
          position: relative;
          -webkit-font-smoothing: antialiased;
        }
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* Dynamic Island Floating Bar */
        .unfugly-island {
          position: fixed;
          background: rgba(13, 16, 23, 0.88);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
          box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 5px 12px 5px 10px;
          z-index: 2147483647;
          touch-action: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
        }

        .unfugly-island:hover {
          border-color: rgba(255, 255, 255, 0.18);
          box-shadow: 0 20px 40px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .unfugly-grip {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          color: #475569;
          padding: 2px 2px;
          border-radius: 4px;
          opacity: 0.6;
          transition: opacity 0.15s ease, color 0.15s ease;
        }

        .unfugly-island:hover .unfugly-grip { opacity: 1; }
        .unfugly-grip:hover { color: #94a3b8; }
        .unfugly-grip.dragging { cursor: grabbing !important; color: #38bdf8; }

        /* Minimized Capsule */
        .unfugly-capsule {
          position: fixed;
          background: rgba(13, 16, 23, 0.9);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px 4px 8px;
          cursor: default;
          z-index: 2147483647;
          touch-action: none;
          transition: border-color 0.2s ease, transform 0.15s ease;
        }

        .unfugly-capsule:hover {
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .unfugly-brand {
          display: flex;
          align-items: center;
          gap: 7px;
          cursor: grab;
        }

        .unfugly-live-dot {
          width: 6.5px;
          height: 6.5px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
          animation: unfuglyPulse 2.5s infinite;
        }

        @keyframes unfuglyPulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }

        .unfugly-title {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.2px;
          color: #94a3b8;
          max-width: 110px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .unfugly-sep {
          width: 1px;
          height: 16px;
          background: rgba(255, 255, 255, 0.1);
        }

        .unfugly-code-chip {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 3px 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          color: #f8fafc;
          transition: all 0.15s ease;
        }

        .unfugly-code-chip:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          transform: scale(1.02);
        }

        .unfugly-code-chip:active { transform: scale(0.98); }

        .unfugly-digits {
          font-family: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
          font-size: 17.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: #ffffff;
          font-feature-settings: "tnum";
          font-variant-numeric: tabular-nums;
        }

        .unfugly-copy-icon {
          color: #64748b;
          transition: color 0.15s ease;
        }

        .unfugly-code-chip:hover .unfugly-copy-icon { color: #94a3b8; }

        .unfugly-code-chip.copied {
          background: rgba(16, 185, 129, 0.15) !important;
          border-color: rgba(16, 185, 129, 0.4) !important;
        }

        .unfugly-ring-box {
          position: relative;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .unfugly-ring-svg {
          width: 26px;
          height: 26px;
          transform: rotate(-90deg);
        }

        .unfugly-ring-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.08);
          stroke-width: 2.2;
        }

        .unfugly-ring-fg {
          fill: none;
          stroke: #38bdf8;
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-dasharray: ${CIRCLE_CIRCUMFERENCE};
          stroke-dashoffset: 0;
          transition: stroke-dashoffset 0.2s linear, stroke 0.3s ease;
        }

        .unfugly-ring-fg.urgent {
          stroke: #f43f5e;
          filter: drop-shadow(0 0 4px rgba(244, 63, 94, 0.6));
        }

        .unfugly-ring-num {
          position: absolute;
          font-size: 9px;
          font-weight: 700;
          color: #94a3b8;
          font-family: ui-monospace, monospace;
        }

        .unfugly-ring-num.urgent { color: #fb7185; }

        .unfugly-nav-actions {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .unfugly-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          border-radius: 9999px;
          padding: 4px 9px;
          font-size: 11.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .unfugly-pill-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        .unfugly-icon-btn {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .unfugly-icon-btn:hover {
          color: #f1f5f9;
          background: rgba(255, 255, 255, 0.08);
        }

        .unfugly-popover {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 205px;
          background: #11141c;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
          padding: 5px;
          display: none;
          flex-direction: column;
          gap: 2px;
          z-index: 2147483647;
          animation: popoverFadeIn 0.15s ease;
        }

        @keyframes popoverFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .unfugly-popover.open { display: flex; }

        .unfugly-menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 7px;
          background: transparent;
          border: none;
          color: #cbd5e1;
          font-size: 12px;
          cursor: pointer;
          text-align: left;
          width: 100%;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .unfugly-menu-item:hover {
          background: rgba(255, 255, 255, 0.07);
          color: #ffffff;
        }

        .unfugly-menu-item.danger:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
        }

        .unfugly-popover-sep {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 3px 0;
        }

        .unfugly-setup-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          color: #ffffff;
          border: none;
          border-radius: 9999px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(14, 165, 233, 0.35);
        }

        .unfugly-setup-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.45);
        }

        .unfugly-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(4, 6, 12, 0.82);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }

        .unfugly-modal-backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }

        .unfugly-sheet {
          width: 90%;
          max-width: 480px;
          background: #0d111a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
          padding: 22px;
          color: #f1f5f9;
          transform: scale(0.96);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .unfugly-modal-backdrop.open .unfugly-sheet {
          transform: scale(1);
        }

        .unfugly-sheet-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .unfugly-sheet-title {
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.01em;
        }

        .unfugly-sheet-subtitle {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 3px;
          line-height: 1.4;
        }

        .unfugly-tabs {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          padding: 3px;
          border-radius: 10px;
          margin-bottom: 16px;
          gap: 2px;
        }

        .unfugly-tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 6px 10px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .unfugly-tab-btn:hover { color: #f1f5f9; }
        .unfugly-tab-btn.active {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          font-weight: 600;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }

        .unfugly-scanner-box {
          position: relative;
          width: 100%;
          height: 200px;
          border-radius: 12px;
          overflow: hidden;
          background: #020617;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .unfugly-scanner-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .unfugly-viewfinder-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .unfugly-target-frame {
          width: 120px;
          height: 120px;
          position: relative;
        }

        .unfugly-target-frame::before, .unfugly-target-frame::after {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          border-color: #38bdf8;
          border-style: solid;
        }
        .unfugly-target-frame::before {
          top: 0; left: 0; border-width: 2.5px 0 0 2.5px; border-top-left-radius: 4px;
        }
        .unfugly-target-frame::after {
          top: 0; right: 0; border-width: 2.5px 2.5px 0 0; border-top-right-radius: 4px;
        }
        .unfugly-frame-bottom::before, .unfugly-frame-bottom::after {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          border-color: #38bdf8;
          border-style: solid;
        }
        .unfugly-frame-bottom::before {
          bottom: 0; left: 0; border-width: 0 0 2.5px 2.5px; border-bottom-left-radius: 4px;
        }
        .unfugly-frame-bottom::after {
          bottom: 0; right: 0; border-width: 0 2.5px 2.5px 0; border-bottom-right-radius: 4px;
        }

        .unfugly-laser {
          position: absolute;
          left: 10%;
          width: 80%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #38bdf8, transparent);
          box-shadow: 0 0 8px #38bdf8;
          display: none;
          animation: scanLaser 2s ease-in-out infinite alternate;
        }

        @keyframes scanLaser {
          0% { top: 15%; opacity: 0.8; }
          100% { top: 85%; opacity: 0.8; }
        }

        .unfugly-drop-panel {
          border: 1px dashed rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          padding: 24px 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .unfugly-drop-panel:hover, .unfugly-drop-panel.dragover {
          background: rgba(56, 189, 248, 0.04);
          border-color: rgba(56, 189, 248, 0.5);
        }

        .unfugly-drop-title { font-size: 13px; font-weight: 600; color: #f1f5f9; }
        .unfugly-drop-note { font-size: 11.5px; color: #64748b; }

        .unfugly-input-row { display: flex; gap: 8px; }

        .unfugly-text-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 8px 12px;
          color: #f8fafc;
          font-size: 12.5px;
          font-family: ui-monospace, monospace;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .unfugly-text-input:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 1px #38bdf8;
        }

        .unfugly-sheet-footer {
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .unfugly-guide-text { font-size: 11.5px; color: #64748b; line-height: 1.4; }

        .unfugly-solid-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          color: #0f172a;
          border: none;
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.1s ease;
        }

        .unfugly-solid-btn:hover { opacity: 0.92; }
        .unfugly-solid-btn:active { transform: scale(0.98); }

        .unfugly-sheet-alert {
          margin-top: 12px;
          padding: 8px 12px;
          border-radius: 7px;
          font-size: 11.5px;
          display: none;
        }

        .unfugly-sheet-alert.error {
          display: block;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .unfugly-sheet-alert.info {
          display: block;
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #7dd3fc;
        }

        /* Inspector Code Block */
        .unfugly-code-view {
          background: #020617;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 10px;
          font-family: ui-monospace, "SF Mono", monospace;
          font-size: 11.5px;
          color: #38bdf8;
          max-height: 220px;
          overflow: auto;
          white-space: pre-wrap;
          word-break: break-all;
          user-select: text;
        }

        .unfugly-input-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .unfugly-chip-toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(12px);
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #f8fafc;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          opacity: 0;
          pointer-events: none;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 2147483647;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .unfugly-chip-toast.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      </style>

      ${
        isMinimized && currentSecret
          ? `
        <div class="unfugly-capsule" id="unfugly-minimized-bar" style="${getMiniPositionStyle()}">
          <div class="unfugly-grip" id="unfugly-mini-grip" title="Drag to reposition">
            <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
              <circle cx="2" cy="2" r="1.1"/>
              <circle cx="6" cy="2" r="1.1"/>
              <circle cx="2" cy="6" r="1.1"/>
              <circle cx="6" cy="6" r="1.1"/>
              <circle cx="2" cy="10" r="1.1"/>
              <circle cx="6" cy="10" r="1.1"/>
            </svg>
          </div>
          <div class="unfugly-live-dot" title="Active"></div>
          <span class="unfugly-digits" id="unfugly-mini-code-click" title="Click to copy code" style="font-size: 14.5px; cursor: pointer; padding: 2px 4px; border-radius: 4px;">
            ${formatCode(currentTotpCode)}
          </span>

          <!-- Direct Copy Button in Minimized View -->
          <button class="unfugly-icon-btn" id="unfugly-mini-copy-btn" title="Copy code" style="width: 22px; height: 22px;">
            <svg id="unfugly-mini-copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>

          <div class="unfugly-ring-box" title="Code expiration countdown">
            <svg class="unfugly-ring-svg" viewBox="0 0 28 28">
              <circle class="unfugly-ring-bg" cx="14" cy="14" r="11"></circle>
              <circle class="unfugly-ring-fg" id="unfugly-mini-circle" cx="14" cy="14" r="11"></circle>
            </svg>
            <span class="unfugly-ring-num" id="unfugly-mini-seconds">30</span>
          </div>

          <div class="unfugly-sep" style="height: 14px; margin: 0 1px;"></div>

          <!-- Expand to Full Island Bar -->
          <button class="unfugly-icon-btn" id="unfugly-mini-expand-btn" title="Expand to full bar" style="width: 22px; height: 22px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>
        </div>
      `
          : `
        <div class="unfugly-island" id="unfugly-top-bar" style="${getBarPositionStyle()}">
          <!-- Drag Handle -->
          <div class="unfugly-grip" id="unfugly-drag-handle" title="Drag to reposition">
            <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
              <circle cx="2" cy="2" r="1.2"/>
              <circle cx="8" cy="2" r="1.2"/>
              <circle cx="2" cy="7" r="1.2"/>
              <circle cx="8" cy="7" r="1.2"/>
              <circle cx="2" cy="12" r="1.2"/>
              <circle cx="8" cy="12" r="1.2"/>
            </svg>
          </div>

          <!-- Brand Status -->
          <div class="unfugly-brand" id="unfugly-brand-drag" title="Drag to reposition">
            <div class="unfugly-live-dot"></div>
            <span class="unfugly-title" title="${escapeHtml(currentAccount)}">
              ${escapeHtml(currentAccount || 'KTRETE')}
            </span>
          </div>

          <div class="unfugly-sep"></div>

          ${
            currentSecret
              ? `
            <!-- Click to Copy Hero Code Box -->
            <button class="unfugly-code-chip" id="unfugly-code-btn" title="Click to copy 6-digit code">
              <span class="unfugly-digits" id="unfugly-code-text">${formatCode(currentTotpCode)}</span>
              <svg class="unfugly-copy-icon" id="unfugly-copy-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>

            <!-- Google Authenticator Dynamic Radial Countdown -->
            <div class="unfugly-ring-box" title="Code expiration countdown">
              <svg class="unfugly-ring-svg" viewBox="0 0 28 28">
                <circle class="unfugly-ring-bg" cx="14" cy="14" r="11"></circle>
                <circle class="unfugly-ring-fg" id="unfugly-timer-circle" cx="14" cy="14" r="11"></circle>
              </svg>
              <span class="unfugly-ring-num" id="unfugly-timer-seconds">30</span>
            </div>

            <!-- Action Buttons Group -->
            <div class="unfugly-nav-actions" style="position: relative;">
              <button class="unfugly-pill-btn" id="unfugly-autofill-btn" title="Paste directly into OTP field">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <span>Fill</span>
              </button>

              <button class="unfugly-icon-btn" id="unfugly-settings-btn" title="Options">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>

              <button class="unfugly-icon-btn" id="unfugly-minimize-btn" title="Minimize">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>

              <!-- In-App Micro Menu -->
              <div class="unfugly-popover ${isDropdownOpen ? 'open' : ''}" id="unfugly-dropdown-menu">
                <button class="unfugly-menu-item" id="unfugly-menu-inspect" title="Inspect dialogs & HTML structures">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                  </svg>
                  <span>Inspect HTML & Popups</span>
                </button>
                <button class="unfugly-menu-item" id="unfugly-menu-toggle-auto">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${isAutoInjectEnabled ? '#10b981' : '#64748b'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Auto-Fill Popups: ${isAutoInjectEnabled ? 'ON' : 'OFF'}</span>
                </button>
                <button class="unfugly-menu-item" id="unfugly-menu-rescan" title="View or re-scan without losing secret">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  <span>Setup Modal (Preview)</span>
                </button>
                <button class="unfugly-menu-item" id="unfugly-menu-recenter">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <span>Reset Position</span>
                </button>
                <div class="unfugly-popover-sep"></div>
                <button class="unfugly-menu-item danger" id="unfugly-menu-disconnect">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>Remove Secret</span>
                </button>
              </div>
            </div>
          `
              : `
            <button class="unfugly-setup-cta" id="unfugly-open-setup-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Setup 2FA</span>
            </button>
          `
          }
        </div>
      `
      }

      <!-- Setup Sheet Modal -->
      <div class="unfugly-modal-backdrop ${isSetupModalOpen ? 'open' : ''}" id="unfugly-setup-modal">
        <div class="unfugly-sheet">
          <div class="unfugly-sheet-header">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="unfugly-sheet-title">KTRETE Authenticator</span>
                ${
                  currentSecret
                    ? `<span style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.28); color: #34d399; font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 9999px;">Secret Preserved</span>`
                    : ''
                }
              </div>
              <div class="unfugly-sheet-subtitle">
                ${
                  currentSecret
                    ? 'Preview / Re-scan Mode: Your existing secret remains active unless you save a new one.'
                    : 'Connect once to auto-generate and auto-fill your 2FA OTP codes.'
                }
              </div>
            </div>
            <button class="unfugly-icon-btn" id="unfugly-close-modal-btn" title="Close (Keeps existing secret)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Segmented Tab Header -->
          <div class="unfugly-tabs">
            <button class="unfugly-tab-btn ${activeSetupTab === 'camera' ? 'active' : ''}" id="unfugly-tab-camera">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              <span>Phone Camera</span>
            </button>
            <button class="unfugly-tab-btn ${activeSetupTab === 'upload' ? 'active' : ''}" id="unfugly-tab-upload">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              <span>Upload / Paste</span>
            </button>
            <button class="unfugly-tab-btn ${activeSetupTab === 'manual' ? 'active' : ''}" id="unfugly-tab-manual">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="6" y1="12" x2="18" y2="12"></line></svg>
              <span>Manual Key</span>
            </button>
          </div>

          <!-- Tab Content: Phone Camera -->
          <div id="unfugly-panel-camera" style="display: ${activeSetupTab === 'camera' ? 'block' : 'none'};">
            <div class="unfugly-scanner-box">
              <video class="unfugly-scanner-video" id="unfugly-camera-video" playsinline autoplay muted></video>
              <div class="unfugly-viewfinder-overlay">
                <div class="unfugly-target-frame">
                  <div class="unfugly-frame-bottom"></div>
                  <div class="unfugly-laser" id="unfugly-scan-laser"></div>
                </div>
              </div>
            </div>

            <div class="unfugly-sheet-footer">
              <div class="unfugly-guide-text">
                Authenticator app → Menu → <strong>Transfer accounts</strong> → <strong>Export</strong>
              </div>
              <div>
                <button class="unfugly-solid-btn" id="unfugly-start-cam-btn">
                  <span>Start Camera</span>
                </button>
                <button class="unfugly-pill-btn" id="unfugly-stop-cam-btn" style="display: none;">
                  <span>Stop</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Tab Content: Upload / Screenshot / DOM -->
          <div id="unfugly-panel-upload" style="display: ${activeSetupTab === 'upload' ? 'block' : 'none'};">
            <div class="unfugly-drop-panel" id="unfugly-dropzone">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <div class="unfugly-drop-title">Drop QR screenshot or browse</div>
              <div class="unfugly-drop-note">Or press Ctrl+V / ⌘V anywhere to paste</div>
              <input type="file" id="unfugly-file-input" accept="image/*" style="display: none;" />
            </div>

            <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
              <button class="unfugly-pill-btn" id="unfugly-scan-page-btn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span>Detect QR on Current Page</span>
              </button>
            </div>
          </div>

          <!-- Tab Content: Manual Key -->
          <div id="unfugly-panel-manual" style="display: ${activeSetupTab === 'manual' ? 'block' : 'none'};">
            <div class="unfugly-input-row">
              <input
                type="text"
                class="unfugly-text-input"
                id="unfugly-manual-secret-input"
                placeholder="Base32 key (e.g. JBSWY3DPEHPK3PXP)"
                autocomplete="off"
                spellcheck="false"
              />
              <button class="unfugly-solid-btn" id="unfugly-manual-save-btn">
                <span>Save</span>
              </button>
            </div>
            <div class="unfugly-guide-text" style="margin-top: 8px;">
              Also accepts full <code>otpauth://totp/...</code> URI strings.
            </div>
          </div>

          <div class="unfugly-sheet-alert" id="unfugly-sheet-alert"></div>
        </div>
      </div>

      <!-- DOM & Dialog HTML Inspector Sheet -->
      <div class="unfugly-modal-backdrop ${isInspectorOpen ? 'open' : ''}" id="unfugly-inspector-modal">
        <div class="unfugly-sheet" style="max-width: 580px; max-height: 85vh; display: flex; flex-direction: column;">
          <div class="unfugly-sheet-header">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="unfugly-sheet-title">HTML & Dialog Inspector</span>
                <span style="background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.28); color: #38bdf8; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 9999px;">DevTools Unblocked</span>
              </div>
              <div class="unfugly-sheet-subtitle">
                Inspect popup dialogs, submission checks, and OTP form structures.
              </div>
            </div>
            <button class="unfugly-icon-btn" id="unfugly-close-inspector-btn" title="Close (Alt+I)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Inspector Action Toolbar -->
          <div style="display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;">
            <button class="unfugly-pill-btn" id="unfugly-inspect-pick-btn" title="Click any element on page to inspect its HTML">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>
              <span>Pick Element on Page</span>
            </button>
            <button class="unfugly-pill-btn" id="unfugly-copy-modal-html-btn" title="Copy active popup outer HTML">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>Copy Modal HTML</span>
            </button>
            <button class="unfugly-pill-btn" id="unfugly-copy-page-html-btn" title="Copy entire page HTML">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
              <span>Copy Full Page HTML</span>
            </button>
          </div>

          <!-- Inspector Content -->
          <div style="flex: 1; overflow-y: auto; max-height: 380px; display: flex; flex-direction: column; gap: 10px; padding-right: 4px;">
            ${
              inspectedElement
                ? `
              <div style="font-size: 11.5px; font-weight: 600; color: #38bdf8;">Picked Element:</div>
              <div class="unfugly-input-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-family: ui-monospace, monospace; font-size: 11px; color: #f8fafc;">${escapeHtml(generateSelector(inspectedElement))}</span>
                  <button class="unfugly-pill-btn" id="unfugly-copy-picked-btn" style="padding: 2px 7px;">Copy HTML</button>
                </div>
                <div class="unfugly-code-view" style="max-height: 140px;">${escapeHtml(inspectedElement.outerHTML)}</div>
              </div>
            `
                : ''
            }

            <div style="font-size: 11.5px; font-weight: 600; color: #94a3b8; display: flex; justify-content: space-between;">
              <span>Active Dialog / Modal:</span>
              <span>${activeModal ? 'Detected' : 'No active popup detected'}</span>
            </div>

            ${
              modalHtml
                ? `
              <div class="unfugly-code-view" style="max-height: 160px;">${escapeHtml(modalHtml)}</div>
            `
                : `
              <div style="padding: 14px; text-align: center; font-size: 11.5px; color: #64748b; background: rgba(255,255,255,0.02); border-radius: 8px;">
                Trigger your submission or 5-min check popup, then press <strong>Alt + I</strong> to see its HTML here.
              </div>
            `
            }

            <div style="font-size: 11.5px; font-weight: 600; color: #94a3b8; margin-top: 4px;">
              Detected Input Fields (${allInputs.length}):
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${allInputs
                .slice(0, 8)
                .map((inp, i) => {
                  const sel = generateSelector(inp);
                  return `
                  <div class="unfugly-input-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-family: ui-monospace, monospace; font-size: 11px; color: #38bdf8;">${escapeHtml(sel)}</span>
                      <button class="unfugly-pill-btn unfugly-fill-specific-btn" data-input-idx="${i}" style="padding: 2px 7px;">Fill OTP</button>
                    </div>
                    <div style="font-size: 10.5px; color: #94a3b8;">
                      type="${escapeHtml(inp.type)}" ${inp.id ? `id="${escapeHtml(inp.id)}"` : ''} ${inp.name ? `name="${escapeHtml(inp.name)}"` : ''} ${inp.placeholder ? `placeholder="${escapeHtml(inp.placeholder)}"` : ''}
                    </div>
                  </div>
                `;
                })
                .join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Minimal Toast -->
      <div class="unfugly-chip-toast" id="unfugly-toast">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span id="unfugly-toast-text">Copied to clipboard</span>
      </div>
    `;

    attachEventListeners();
    updateTimerTick();
  }

  function formatCode(code) {
    if (!code || code === '------') return '------';
    const clean = code.replace(/\s+/g, '');
    if (clean.length === 6) {
      return `${clean.slice(0, 3)} ${clean.slice(3)}`;
    }
    return clean;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showToast(message) {
    if (!shadowRoot) return;
    const toast = shadowRoot.getElementById('unfugly-toast');
    const toastText = shadowRoot.getElementById('unfugly-toast-text');
    if (!toast || !toastText) return;

    toastText.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }

  function showModalAlert(message, type = 'error') {
    if (!shadowRoot) return;
    const alertBox = shadowRoot.getElementById('unfugly-sheet-alert');
    if (!alertBox) return;

    alertBox.textContent = message;
    alertBox.className = `unfugly-sheet-alert ${type}`;
    alertBox.style.display = 'block';
  }

  function clearModalAlert() {
    if (!shadowRoot) return;
    const alertBox = shadowRoot.getElementById('unfugly-sheet-alert');
    if (alertBox) alertBox.style.display = 'none';
  }

  // =========================================================================
  // 10. Action Handlers & Event Listeners
  // =========================================================================
  function attachEventListeners() {
    if (!shadowRoot) return;

    // Draggable controllers
    const topBar = shadowRoot.getElementById('unfugly-top-bar');
    const dragHandle = shadowRoot.getElementById('unfugly-drag-handle');
    const brandDrag = shadowRoot.getElementById('unfugly-brand-drag');

    if (topBar && dragHandle) {
      makeElementDraggable(topBar, dragHandle, (newPos) => {
        savedPosition = newPos;
        setStorageData({ [STORAGE_KEYS.position]: newPos });
      });
      if (brandDrag) {
        makeElementDraggable(topBar, brandDrag, (newPos) => {
          savedPosition = newPos;
          setStorageData({ [STORAGE_KEYS.position]: newPos });
        });
      }
    }

    const miniBar = shadowRoot.getElementById('unfugly-minimized-bar');
    const miniGrip = shadowRoot.getElementById('unfugly-mini-grip');
    if (miniBar && miniGrip) {
      makeElementDraggable(miniBar, miniGrip, (newPos) => {
        savedMiniPosition = newPos;
        setStorageData({ [STORAGE_KEYS.miniPosition]: newPos });
      });
    }

    // Modal Opening & Closing
    const openSetupBtn = shadowRoot.getElementById('unfugly-open-setup-btn');
    if (openSetupBtn) {
      openSetupBtn.onclick = () => {
        isSetupModalOpen = true;
        renderWidget();
      };
    }

    const closeModalBtn = shadowRoot.getElementById('unfugly-close-modal-btn');
    if (closeModalBtn) {
      closeModalBtn.onclick = () => {
        stopCameraScanner();
        isSetupModalOpen = false;
        renderWidget();
      };
    }

    const modalBackdrop = shadowRoot.getElementById('unfugly-setup-modal');
    if (modalBackdrop) {
      modalBackdrop.onclick = (e) => {
        if (e.target === modalBackdrop) {
          stopCameraScanner();
          isSetupModalOpen = false;
          renderWidget();
        }
      };
    }

    // Tab Switching
    const tabCam = shadowRoot.getElementById('unfugly-tab-camera');
    const tabUpload = shadowRoot.getElementById('unfugly-tab-upload');
    const tabManual = shadowRoot.getElementById('unfugly-tab-manual');

    const switchTab = (tab) => {
      activeSetupTab = tab;
      if (tab !== 'camera') stopCameraScanner();
      renderWidget();
    };

    if (tabCam) tabCam.onclick = () => switchTab('camera');
    if (tabUpload) tabUpload.onclick = () => switchTab('upload');
    if (tabManual) tabManual.onclick = () => switchTab('manual');

    // Camera Scan Trigger
    const startCamBtn = shadowRoot.getElementById('unfugly-start-cam-btn');
    if (startCamBtn) {
      startCamBtn.onclick = () => startCameraScanner();
    }

    const stopCamBtn = shadowRoot.getElementById('unfugly-stop-cam-btn');
    if (stopCamBtn) {
      stopCamBtn.onclick = () => stopCameraScanner();
    }

    // Dropzone File Upload
    const dropzone = shadowRoot.getElementById('unfugly-dropzone');
    const fileInput = shadowRoot.getElementById('unfugly-file-input');

    if (dropzone && fileInput) {
      dropzone.onclick = () => fileInput.click();

      fileInput.onchange = async () => {
        const file = fileInput.files && fileInput.files[0];
        if (file) {
          await processUploadedFile(file);
        }
      };

      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      };

      dropzone.ondragleave = () => {
        dropzone.classList.remove('dragover');
      };

      dropzone.ondrop = async (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) {
          await processUploadedFile(file);
        }
      };
    }

    // Auto-Detect QR on Page
    const scanPageBtn = shadowRoot.getElementById('unfugly-scan-page-btn');
    if (scanPageBtn) {
      scanPageBtn.onclick = async () => {
        scanPageBtn.disabled = true;
        scanPageBtn.textContent = 'Scanning...';
        const parsed = await scanDomForQrCode();
        scanPageBtn.disabled = false;
        scanPageBtn.textContent = 'Detect QR on Current Page';

        if (parsed) {
          await saveNewSecret(parsed);
        } else {
          showModalAlert('No QR code detected on current page.', 'error');
        }
      };
    }

    // Manual Secret Save
    const manualSaveBtn = shadowRoot.getElementById('unfugly-manual-save-btn');
    const manualInput = shadowRoot.getElementById('unfugly-manual-secret-input');
    if (manualSaveBtn && manualInput) {
      manualSaveBtn.onclick = async () => {
        const val = manualInput.value;
        const parsed = parseTotpInput(val);
        if (parsed) {
          await saveNewSecret(parsed);
        } else {
          showModalAlert('Invalid key. Enter a valid Base32 secret or otpauth:// URI.', 'error');
        }
      };

      manualInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          manualSaveBtn.click();
        }
      };
    }

    // Copy Helper (Shared between main bar & minimized capsule)
    const handleCopyCode = (triggerEl, iconEl) => {
      if (!currentTotpCode || currentTotpCode === '------') return;
      const cleanCode = currentTotpCode.replace(/\s+/g, '');
      navigator.clipboard.writeText(cleanCode).then(() => {
        showToast(`Copied ${cleanCode}`);
        if (triggerEl) {
          triggerEl.classList.add('copied');
          setTimeout(() => triggerEl.classList.remove('copied'), 1500);
        }
        if (iconEl) {
          const original = iconEl.innerHTML;
          iconEl.innerHTML = `<polyline points="20 6 9 17 4 12" stroke="#34d399" stroke-width="2.5"></polyline>`;
          setTimeout(() => {
            iconEl.innerHTML = original;
          }, 1500);
        }
      });
    };

    // Hero Code Copy Action
    const codeBtn = shadowRoot.getElementById('unfugly-code-btn');
    if (codeBtn) {
      codeBtn.onclick = () => handleCopyCode(codeBtn, null);
    }

    // Minimized View Direct Copy & Expand
    const miniCopyBtn = shadowRoot.getElementById('unfugly-mini-copy-btn');
    const miniCopyIcon = shadowRoot.getElementById('unfugly-mini-copy-icon');
    const miniCodeClick = shadowRoot.getElementById('unfugly-mini-code-click');

    if (miniCopyBtn) {
      miniCopyBtn.onclick = () => handleCopyCode(miniCopyBtn, miniCopyIcon);
    }
    if (miniCodeClick) {
      miniCodeClick.onclick = () => handleCopyCode(miniCodeClick, miniCopyIcon);
    }

    const miniExpandBtn = shadowRoot.getElementById('unfugly-mini-expand-btn');
    if (miniExpandBtn) {
      miniExpandBtn.onclick = () => {
        isMinimized = false;
        setStorageData({ [STORAGE_KEYS.minimized]: false });
        renderWidget();
      };
    }

    // Manual Autofill Action
    const autofillBtn = shadowRoot.getElementById('unfugly-autofill-btn');
    if (autofillBtn) {
      autofillBtn.onclick = () => {
        if (!currentTotpCode || currentTotpCode === '------') return;
        const cleanCode = currentTotpCode.replace(/\s+/g, '');
        const filled = autofillOtp(cleanCode, true);
        if (filled) {
          showToast(`Autofilled ${cleanCode}`);
        } else {
          showToast(`Copied ${cleanCode}`);
          navigator.clipboard.writeText(cleanCode);
        }
      };
    }

    // Settings Popover Toggle
    const settingsBtn = shadowRoot.getElementById('unfugly-settings-btn');
    const dropdownMenu = shadowRoot.getElementById('unfugly-dropdown-menu');

    if (settingsBtn && dropdownMenu) {
      settingsBtn.onclick = (e) => {
        e.stopPropagation();
        isDropdownOpen = !isDropdownOpen;
        dropdownMenu.classList.toggle('open', isDropdownOpen);
      };

      document.addEventListener('click', () => {
        if (isDropdownOpen) {
          isDropdownOpen = false;
          dropdownMenu.classList.remove('open');
        }
      });
    }

    // Open Inspector from Menu
    const menuInspect = shadowRoot.getElementById('unfugly-menu-inspect');
    if (menuInspect) {
      menuInspect.onclick = () => {
        isDropdownOpen = false;
        isInspectorOpen = true;
        renderWidget();
      };
    }

    // Toggle Auto-Inject from Menu
    const menuToggleAuto = shadowRoot.getElementById('unfugly-menu-toggle-auto');
    if (menuToggleAuto) {
      menuToggleAuto.onclick = () => {
        isAutoInjectEnabled = !isAutoInjectEnabled;
        setStorageData({ [STORAGE_KEYS.autoInject]: isAutoInjectEnabled });
        renderWidget();
        showToast(`Auto-Fill Popups: ${isAutoInjectEnabled ? 'ENABLED' : 'DISABLED'}`);
      };
    }

    const menuRescan = shadowRoot.getElementById('unfugly-menu-rescan');
    if (menuRescan) {
      menuRescan.onclick = () => {
        isDropdownOpen = false;
        isSetupModalOpen = true;
        renderWidget();
      };
    }

    const menuRecenter = shadowRoot.getElementById('unfugly-menu-recenter');
    if (menuRecenter) {
      menuRecenter.onclick = () => {
        isDropdownOpen = false;
        savedPosition = null;
        savedMiniPosition = null;
        setStorageData({
          [STORAGE_KEYS.position]: null,
          [STORAGE_KEYS.miniPosition]: null
        });
        renderWidget();
        showToast('Position reset to center');
      };
    }

    const menuDisconnect = shadowRoot.getElementById('unfugly-menu-disconnect');
    if (menuDisconnect) {
      menuDisconnect.onclick = async () => {
        isDropdownOpen = false;
        currentSecret = null;
        currentTotpCode = '------';
        await removeStorageData([
          STORAGE_KEYS.secret,
          STORAGE_KEYS.account,
          STORAGE_KEYS.digits,
          STORAGE_KEYS.period
        ]);
        renderWidget();
        showToast('2FA secret removed');
      };
    }

    // Inspector Action Buttons
    const closeInspectorBtn = shadowRoot.getElementById('unfugly-close-inspector-btn');
    if (closeInspectorBtn) {
      closeInspectorBtn.onclick = () => {
        isInspectorOpen = false;
        renderWidget();
      };
    }

    const inspectModal = shadowRoot.getElementById('unfugly-inspector-modal');
    if (inspectModal) {
      inspectModal.onclick = (e) => {
        if (e.target === inspectModal) {
          isInspectorOpen = false;
          renderWidget();
        }
      };
    }

    const inspectPickBtn = shadowRoot.getElementById('unfugly-inspect-pick-btn');
    if (inspectPickBtn) {
      inspectPickBtn.onclick = () => startElementPicker();
    }

    const copyModalHtmlBtn = shadowRoot.getElementById('unfugly-copy-modal-html-btn');
    if (copyModalHtmlBtn) {
      copyModalHtmlBtn.onclick = () => {
        const modal = findActiveModal();
        if (modal) {
          navigator.clipboard.writeText(modal.outerHTML);
          showToast('Copied active modal HTML');
        } else {
          showToast('No active modal found on screen');
        }
      };
    }

    const copyPageHtmlBtn = shadowRoot.getElementById('unfugly-copy-page-html-btn');
    if (copyPageHtmlBtn) {
      copyPageHtmlBtn.onclick = () => {
        navigator.clipboard.writeText(document.documentElement.outerHTML);
        showToast('Copied full page HTML');
      };
    }

    const copyPickedBtn = shadowRoot.getElementById('unfugly-copy-picked-btn');
    if (copyPickedBtn && inspectedElement) {
      copyPickedBtn.onclick = () => {
        navigator.clipboard.writeText(inspectedElement.outerHTML);
        showToast('Copied picked element HTML');
      };
    }

    // Specific input test autofill from inspector
    const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
    shadowRoot.querySelectorAll('.unfugly-fill-specific-btn').forEach((btn) => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.inputIdx, 10);
        const targetInp = allInputs[idx];
        if (targetInp && currentTotpCode && currentTotpCode !== '------') {
          const cleanCode = currentTotpCode.replace(/\s+/g, '');
          injectNativeValue(targetInp, cleanCode);
          showToast(`Injected ${cleanCode} into ${generateSelector(targetInp)}`);
        }
      };
    });

    // Minimize & Restore
    const minimizeBtn = shadowRoot.getElementById('unfugly-minimize-btn');
    if (minimizeBtn) {
      minimizeBtn.onclick = () => {
        isMinimized = true;
        setStorageData({ [STORAGE_KEYS.minimized]: true });
        renderWidget();
      };
    }
  }

  // Keyboard shortcut listener:
  // - Alt+S or Ctrl+Shift+U: Toggle Setup Modal in preview mode
  // - Alt+I: Toggle HTML & Dialog Inspector
  // - Esc: Close any open modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isPickerActive) {
        stopElementPicker();
        return;
      }
      if (isInspectorOpen) {
        isInspectorOpen = false;
        renderWidget();
        return;
      }
      if (isSetupModalOpen) {
        stopCameraScanner();
        isSetupModalOpen = false;
        renderWidget();
        return;
      }
    }

    if ((e.altKey && (e.key === 'i' || e.key === 'I'))) {
      e.preventDefault();
      isInspectorOpen = !isInspectorOpen;
      renderWidget();
      return;
    }

    if (
      (e.altKey && (e.key === 's' || e.key === 'S')) ||
      (e.ctrlKey && e.shiftKey && (e.key === 'u' || e.key === 'U'))
    ) {
      e.preventDefault();
      isSetupModalOpen = !isSetupModalOpen;
      if (!isSetupModalOpen) stopCameraScanner();
      renderWidget();
      if (isSetupModalOpen) {
        showToast('Setup modal opened in preview mode');
      }
    }
  });

  // Global console debug hooks
  window.__unfuglyOpenSetupModal = () => {
    isSetupModalOpen = true;
    renderWidget();
    console.log('[Unfugly 2FA] Setup modal opened in preview mode. Existing secret is preserved.');
  };
  window.openUnfugly2FASetup = window.__unfuglyOpenSetupModal;

  window.__unfuglyInspect = () => {
    isInspectorOpen = true;
    renderWidget();
    console.log('[Unfugly 2FA] HTML & Dialog Inspector opened.');
  };
  window.inspectUnfuglyPage = window.__unfuglyInspect;

  // Global paste handler (Ctrl+V / Cmd+V)
  window.addEventListener('paste', async (e) => {
    const items = (e.clipboardData || window.clipboardData).items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          isSetupModalOpen = true;
          activeSetupTab = 'upload';
          renderWidget();
          await processUploadedFile(file);
          return;
        }
      }
    }

    if (isSetupModalOpen) {
      const text = e.clipboardData.getData('text');
      const parsed = parseTotpInput(text);
      if (parsed) {
        await saveNewSecret(parsed);
      }
    }
  });

  async function processUploadedFile(file) {
    showModalAlert('Decoding image...', 'info');
    const rawCode = await scanFileBlob(file);
    if (!rawCode) {
      showModalAlert('No QR code detected in image. Ensure it is clearly visible.', 'error');
      return;
    }
    const parsed = parseTotpInput(rawCode);
    if (!parsed) {
      showModalAlert('Image did not contain a valid 2FA TOTP secret.', 'error');
      return;
    }
    await saveNewSecret(parsed);
  }

  async function saveNewSecret(parsed) {
    currentSecret = parsed.secret;
    currentAccount = parsed.label || 'KTRETE Curricula';
    currentDigits = parsed.digits || 6;
    currentPeriod = parsed.period || 30;

    await setStorageData({
      [STORAGE_KEYS.secret]: currentSecret,
      [STORAGE_KEYS.account]: currentAccount,
      [STORAGE_KEYS.digits]: currentDigits,
      [STORAGE_KEYS.period]: currentPeriod
    });

    stopCameraScanner();
    isSetupModalOpen = false;
    showToast('Authenticator connected');
    await updateTotpCode(true);
    renderWidget();
  }

  // =========================================================================
  // 11. Dynamic Radial Timer & TOTP Update Loop
  // =========================================================================
  async function updateTotpCode(force = false) {
    if (!currentSecret) {
      currentTotpCode = '------';
      return;
    }

    const nowEpoch = Math.floor(Date.now() / 1000);
    const step = Math.floor(nowEpoch / currentPeriod);

    if (step !== lastStep || force) {
      lastStep = step;
      currentTotpCode = await generateTotp(currentSecret, nowEpoch, currentPeriod, currentDigits);

      if (shadowRoot) {
        const codeText = shadowRoot.getElementById('unfugly-code-text');
        const miniCodeClick = shadowRoot.getElementById('unfugly-mini-code-click');
        const formatted = formatCode(currentTotpCode);

        if (codeText) {
          codeText.textContent = formatted;
          codeText.style.opacity = '0.4';
          setTimeout(() => {
            codeText.style.transition = 'opacity 0.3s ease';
            codeText.style.opacity = '1';
          }, 80);
        }

        if (miniCodeClick) {
          miniCodeClick.textContent = formatted;
          miniCodeClick.style.opacity = '0.4';
          setTimeout(() => {
            miniCodeClick.style.transition = 'opacity 0.3s ease';
            miniCodeClick.style.opacity = '1';
          }, 80);
        }
      }
    }
  }

  function updateTimerTick() {
    if (!currentSecret) return;

    const nowMs = Date.now();
    const periodMs = currentPeriod * 1000;
    const elapsedMs = nowMs % periodMs;
    const remainingMs = periodMs - elapsedMs;
    const remainingSec = Math.ceil(remainingMs / 1000);
    const fraction = remainingMs / periodMs;

    const offset = CIRCLE_CIRCUMFERENCE * (1 - fraction);
    const isUrgent = remainingSec <= 5;

    if (shadowRoot) {
      const circle = shadowRoot.getElementById('unfugly-timer-circle');
      const secLabel = shadowRoot.getElementById('unfugly-timer-seconds');
      if (circle) {
        circle.style.strokeDashoffset = offset;
        if (isUrgent) circle.classList.add('urgent');
        else circle.classList.remove('urgent');
      }
      if (secLabel) {
        secLabel.textContent = remainingSec;
        if (isUrgent) secLabel.classList.add('urgent');
        else secLabel.classList.remove('urgent');
      }

      const miniCircle = shadowRoot.getElementById('unfugly-mini-circle');
      const miniSec = shadowRoot.getElementById('unfugly-mini-seconds');
      if (miniCircle) {
        miniCircle.style.strokeDashoffset = offset;
        if (isUrgent) miniCircle.classList.add('urgent');
        else miniCircle.classList.remove('urgent');
      }
      if (miniSec) {
        miniSec.textContent = remainingSec;
        if (isUrgent) miniSec.classList.add('urgent');
        else miniSec.classList.remove('urgent');
      }
    }

    updateTotpCode();
  }

  function startTimerLoop() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimerTick, 100);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateTotpCode(true);
      updateTimerTick();
    }
  });

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        let shouldRerender = false;
        if (changes[STORAGE_KEYS.secret]) {
          currentSecret = changes[STORAGE_KEYS.secret].newValue || null;
          shouldRerender = true;
        }
        if (changes[STORAGE_KEYS.account]) {
          currentAccount = changes[STORAGE_KEYS.account].newValue || 'KTRETE Curricula';
          shouldRerender = true;
        }
        if (changes[STORAGE_KEYS.minimized]) {
          isMinimized = !!changes[STORAGE_KEYS.minimized].newValue;
          shouldRerender = true;
        }
        if (changes[STORAGE_KEYS.position]) {
          savedPosition = changes[STORAGE_KEYS.position].newValue;
          shouldRerender = true;
        }
        if (changes[STORAGE_KEYS.autoInject]) {
          isAutoInjectEnabled = !!changes[STORAGE_KEYS.autoInject].newValue;
          shouldRerender = true;
        }
        if (shouldRerender) {
          updateTotpCode(true).then(() => renderWidget());
        }
      }
    });
  }

  // =========================================================================
  // 12. Bootstrap
  // =========================================================================
  async function init() {
    const stored = await getStorageData([
      STORAGE_KEYS.secret,
      STORAGE_KEYS.account,
      STORAGE_KEYS.digits,
      STORAGE_KEYS.period,
      STORAGE_KEYS.minimized,
      STORAGE_KEYS.position,
      STORAGE_KEYS.miniPosition,
      STORAGE_KEYS.autoInject
    ]);

    currentSecret = stored[STORAGE_KEYS.secret] || null;
    currentAccount = stored[STORAGE_KEYS.account] || 'KTRETE Curricula';
    currentDigits = stored[STORAGE_KEYS.digits] || 6;
    currentPeriod = stored[STORAGE_KEYS.period] || 30;
    isMinimized = !!stored[STORAGE_KEYS.minimized];
    savedPosition = stored[STORAGE_KEYS.position] || null;
    savedMiniPosition = stored[STORAGE_KEYS.miniPosition] || null;
    isAutoInjectEnabled = stored[STORAGE_KEYS.autoInject] !== undefined ? !!stored[STORAGE_KEYS.autoInject] : true;

    if (currentSecret) {
      await updateTotpCode(true);
    }

    if (document.body) {
      initUi();
    } else {
      document.addEventListener('DOMContentLoaded', initUi);
    }

    startTimerLoop();
    setupPopupObserver();
  }

  init();
})();
