// extension/ktretecurricula.js
// Unfugly SRM KTR E-Curricula 2FA Authenticator Companion Content Script
// Automatically generates and refreshes Google Authenticator TOTP codes on ktretecurricula portal.

(function () {
  'use strict';

  // Prevent multiple injections
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
    miniPosition: 'unfuglyKtreteMiniPosition'
  };

  // State
  let currentSecret = null;
  let currentAccount = 'KTRETE Curricula';
  let currentDigits = 6;
  let currentPeriod = 30;
  let currentTotpCode = '------';
  let isMinimized = false;
  let isSetupModalOpen = false;
  let timerInterval = null;
  let lastStep = -1;
  let savedPosition = null;
  let savedMiniPosition = null;

  // Camera stream state
  let activeCameraStream = null;
  let cameraScanInterval = null;

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

        if (wireType === 2 && fieldNumber === 1) { // otp_parameters
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

    // Check for Google Authenticator Export URL (otpauth-migration://offline?data=...)
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

    // Check if it's a standard otpauth URI
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

    // Check if it's a raw base32 secret (letters A-Z and digits 2-7, >= 8 chars)
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
  // 5. Autofill Helper for OTP Inputs
  // =========================================================================
  function findOtpInput() {
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
      'input[name*="code" i]',
      'input[id*="code" i]',
      'input[autocomplete="one-time-code"]',
      'input[maxlength="6"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null && !el.disabled && !el.readOnly) {
        return el;
      }
    }
    return null;
  }

  function autofillOtp(code) {
    const input = findOtpInput();
    if (!input) return false;
    input.focus();
    input.value = code;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  // =========================================================================
  // 6. Camera / Webcam Live QR Scanner
  // =========================================================================
  async function startCameraScanner() {
    if (!shadowRoot) return;
    const cameraWrap = shadowRoot.getElementById('unfugly-camera-wrap');
    const video = shadowRoot.getElementById('unfugly-camera-video');
    const dropzone = shadowRoot.getElementById('unfugly-dropzone');
    const cameraBtn = shadowRoot.getElementById('unfugly-camera-scan-btn');

    if (!cameraWrap || !video) return;

    try {
      if (activeCameraStream) {
        stopCameraScanner();
      }

      showModalAlert('Accessing laptop camera...', 'success');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      activeCameraStream = stream;
      video.srcObject = stream;
      await video.play();

      cameraWrap.style.display = 'flex';
      if (dropzone) dropzone.style.display = 'none';
      if (cameraBtn) cameraBtn.style.display = 'none';

      clearModalAlert();
      showModalAlert('Hold phone screen with Google Authenticator Export QR code in front of camera', 'success');

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
      showModalAlert('Camera access denied or unavailable. You can upload/paste a photo instead.', 'error');
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
      const cameraWrap = shadowRoot.getElementById('unfugly-camera-wrap');
      const dropzone = shadowRoot.getElementById('unfugly-dropzone');
      const cameraBtn = shadowRoot.getElementById('unfugly-camera-scan-btn');
      if (cameraWrap) cameraWrap.style.display = 'none';
      if (dropzone) dropzone.style.display = 'flex';
      if (cameraBtn) cameraBtn.style.display = 'inline-flex';
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
      if (e.target.closest('button, input, select, textarea, .unfugly-code-box, .unfugly-timer-wrap')) return;

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
      const maxX = Math.max(0, window.innerWidth - rect.width - 10);
      const maxY = Math.max(0, window.innerHeight - rect.height - 10);

      const newLeft = Math.max(10, Math.min(maxX, startLeft + dx));
      const newTop = Math.max(10, Math.min(maxY, startTop + dy));

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
  // 8. Shadow DOM UI Injection
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
      const clampLeft = Math.max(10, Math.min(window.innerWidth - 300, savedPosition.left));
      const clampTop = Math.max(10, Math.min(window.innerHeight - 60, savedPosition.top));
      return `left: ${clampLeft}px; top: ${clampTop}px; transform: none; right: auto;`;
    }
    return `left: 50%; top: 14px; transform: translateX(-50%);`;
  }

  function getMiniPositionStyle() {
    if (savedMiniPosition && typeof savedMiniPosition.left === 'number' && typeof savedMiniPosition.top === 'number') {
      const clampLeft = Math.max(10, Math.min(window.innerWidth - 180, savedMiniPosition.left));
      const clampTop = Math.max(10, Math.min(window.innerHeight - 50, savedMiniPosition.top));
      return `left: ${clampLeft}px; top: ${clampTop}px; right: auto;`;
    }
    return `top: 14px; right: 20px;`;
  }

  function renderWidget() {
    if (!shadowRoot) return;

    const CIRCLE_CIRCUMFERENCE = 81.68;

    shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          box-sizing: border-box;
          color: #f8fafc;
          user-select: none;
          z-index: 2147483647;
          position: relative;
        }
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* Movable Top Bar Container */
        .unfugly-top-bar {
          position: fixed;
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 9999px;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 7px 14px 7px 12px;
          z-index: 2147483647;
          cursor: default;
          touch-action: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .unfugly-top-bar:hover {
          border-color: rgba(56, 189, 248, 0.4);
          box-shadow: 0 14px 36px -4px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.15);
        }

        /* Drag Handle Grip */
        .unfugly-drag-handle {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          color: #64748b;
          padding: 3px 2px;
          border-radius: 4px;
          transition: color 0.15s ease, background 0.15s ease;
        }

        .unfugly-drag-handle:hover {
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.12);
        }

        .unfugly-drag-handle.dragging {
          cursor: grabbing !important;
          color: #38bdf8;
        }

        /* Movable Minimized Pill */
        .unfugly-minimized-pill {
          position: fixed;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 9999px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 6px 14px 6px 10px;
          cursor: grab;
          z-index: 2147483647;
          touch-action: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .unfugly-minimized-pill:hover {
          border-color: rgba(56, 189, 248, 0.5);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55), 0 0 12px rgba(56, 189, 248, 0.2);
        }

        .unfugly-brand {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          font-size: 12.5px;
          letter-spacing: 0.3px;
          color: #94a3b8;
          cursor: grab;
        }

        .unfugly-shield-icon {
          width: 17px;
          height: 17px;
          flex-shrink: 0;
          color: #38bdf8;
        }

        .unfugly-brand-text {
          white-space: nowrap;
          max-width: 125px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .unfugly-divider {
          width: 1px;
          height: 20px;
          background: rgba(255, 255, 255, 0.14);
        }

        .unfugly-code-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(30, 41, 59, 0.7);
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .unfugly-code-box:hover {
          background: rgba(30, 41, 59, 0.95);
          border-color: rgba(56, 189, 248, 0.4);
          transform: scale(1.02);
        }

        .unfugly-code-text {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: 2.5px;
          color: #f8fafc;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .unfugly-timer-wrap {
          position: relative;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .unfugly-timer-svg {
          width: 30px;
          height: 30px;
          transform: rotate(-90deg);
        }

        .unfugly-timer-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.12);
          stroke-width: 3;
        }

        .unfugly-timer-circle {
          fill: none;
          stroke: #38bdf8;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-dasharray: ${CIRCLE_CIRCUMFERENCE};
          stroke-dashoffset: 0;
          transition: stroke-dashoffset 0.25s linear, stroke 0.3s ease;
        }

        .unfugly-timer-circle.warning {
          stroke: #f43f5e;
          filter: drop-shadow(0 0 4px rgba(244, 63, 94, 0.6));
        }

        .unfugly-timer-seconds {
          position: absolute;
          font-size: 10px;
          font-weight: 700;
          color: #cbd5e1;
          font-family: ui-monospace, SFMono-Regular, monospace;
        }

        .unfugly-timer-seconds.warning {
          color: #f43f5e;
        }

        .unfugly-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: linear-gradient(135deg, #0284c7, #2563eb);
          color: #ffffff;
          border: none;
          border-radius: 9999px;
          padding: 6px 13px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
        }

        .unfugly-btn:hover {
          background: linear-gradient(135deg, #0369a1, #1d4ed8);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);
        }

        .unfugly-btn:active {
          transform: translateY(0);
        }

        .unfugly-btn-copied {
          background: linear-gradient(135deg, #059669, #10b981) !important;
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.4) !important;
        }

        .unfugly-btn-secondary {
          background: rgba(51, 65, 85, 0.6);
          color: #cbd5e1;
          box-shadow: none;
          padding: 6px 11px;
        }

        .unfugly-btn-secondary:hover {
          background: rgba(71, 85, 105, 0.85);
          color: #f8fafc;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .unfugly-icon-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          border-radius: 50%;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .unfugly-icon-btn:hover {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.1);
        }

        /* Modal Overlay */
        .unfugly-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(3, 7, 18, 0.78);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }

        .unfugly-modal-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }

        .unfugly-modal-card {
          width: 90%;
          max-width: 500px;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 30px rgba(56, 189, 248, 0.1);
          padding: 24px;
          color: #f8fafc;
          transform: scale(0.95);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .unfugly-modal-overlay.open .unfugly-modal-card {
          transform: scale(1);
        }

        .unfugly-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .unfugly-modal-title {
          font-size: 18px;
          font-weight: 700;
          color: #f8fafc;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .unfugly-modal-subtitle {
          font-size: 12.5px;
          color: #94a3b8;
          margin-top: 4px;
          line-height: 1.45;
        }

        .unfugly-help-box {
          background: rgba(56, 189, 248, 0.08);
          border: 1px solid rgba(56, 189, 248, 0.2);
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 14px;
          font-size: 12px;
          color: #bae6fd;
          line-height: 1.45;
        }

        .unfugly-help-box strong {
          color: #38bdf8;
        }

        .unfugly-dropzone {
          border: 2px dashed rgba(56, 189, 248, 0.4);
          background: rgba(30, 41, 59, 0.5);
          border-radius: 14px;
          padding: 20px 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .unfugly-dropzone:hover, .unfugly-dropzone.dragover {
          border-color: #38bdf8;
          background: rgba(56, 189, 248, 0.08);
          transform: translateY(-1px);
        }

        .unfugly-dropzone-icon {
          width: 38px;
          height: 38px;
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.12);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .unfugly-dropzone-title {
          font-size: 13.5px;
          font-weight: 600;
          color: #f8fafc;
        }

        .unfugly-dropzone-hint {
          font-size: 11.5px;
          color: #94a3b8;
          line-height: 1.4;
        }

        .unfugly-dropzone-hint kbd {
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: inherit;
          color: #38bdf8;
        }

        .unfugly-camera-wrap {
          display: none;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          background: #020617;
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 14px;
          padding: 10px;
          position: relative;
          overflow: hidden;
        }

        .unfugly-camera-video {
          width: 100%;
          max-height: 220px;
          border-radius: 10px;
          object-fit: cover;
          background: #000;
        }

        .unfugly-camera-reticle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -60%);
          width: 130px;
          height: 130px;
          border: 2px solid #38bdf8;
          border-radius: 12px;
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
          pointer-events: none;
        }

        .unfugly-modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
        }

        .unfugly-or-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 16px 0;
          color: #64748b;
          font-size: 11.5px;
        }

        .unfugly-or-divider::before, .unfugly-or-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .unfugly-or-divider:not(:empty)::before {
          margin-right: .75em;
        }

        .unfugly-or-divider:not(:empty)::after {
          margin-left: .75em;
        }

        .unfugly-input-group {
          display: flex;
          gap: 8px;
        }

        .unfugly-input {
          flex: 1;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 8px 12px;
          color: #f8fafc;
          font-size: 13px;
          font-family: ui-monospace, monospace;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .unfugly-input:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
        }

        .unfugly-alert {
          margin-top: 12px;
          padding: 9px 13px;
          border-radius: 8px;
          font-size: 12px;
          display: none;
        }

        .unfugly-alert.error {
          display: block;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }

        .unfugly-alert.success {
          display: block;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #6ee7b7;
        }

        .unfugly-toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(20px);
          background: #0f172a;
          border: 1px solid #10b981;
          color: #6ee7b7;
          padding: 8px 18px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(16, 185, 129, 0.3);
          opacity: 0;
          pointer-events: none;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 2147483647;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .unfugly-toast.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      </style>

      ${
        isMinimized && currentSecret
          ? `
        <div class="unfugly-minimized-pill" id="unfugly-minimized-bar" style="${getMiniPositionStyle()}" title="Drag anywhere or click to expand">
          <div class="unfugly-drag-handle" id="unfugly-mini-drag-handle" title="Drag to move">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="8" cy="6" r="2"></circle>
              <circle cx="16" cy="6" r="2"></circle>
              <circle cx="8" cy="12" r="2"></circle>
              <circle cx="16" cy="12" r="2"></circle>
              <circle cx="8" cy="18" r="2"></circle>
              <circle cx="16" cy="18" r="2"></circle>
            </svg>
          </div>
          <svg class="unfugly-shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span id="unfugly-min-expand-btn" style="font-family: ui-monospace, monospace; font-size: 14.5px; font-weight: 700; letter-spacing: 1px; cursor: pointer;">
            ${formatCode(currentTotpCode)}
          </span>
          <div class="unfugly-timer-wrap">
            <svg class="unfugly-timer-svg" viewBox="0 0 30 30">
              <circle class="unfugly-timer-bg" cx="15" cy="15" r="13"></circle>
              <circle class="unfugly-timer-circle" id="unfugly-mini-circle" cx="15" cy="15" r="13"></circle>
            </svg>
            <span class="unfugly-timer-seconds" id="unfugly-mini-seconds">30</span>
          </div>
        </div>
      `
          : `
        <div class="unfugly-top-bar" id="unfugly-top-bar" style="${getBarPositionStyle()}">
          <!-- Drag Handle Grip -->
          <div class="unfugly-drag-handle" id="unfugly-drag-handle" title="Drag to move anywhere on screen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="8" cy="5" r="2"></circle>
              <circle cx="16" cy="5" r="2"></circle>
              <circle cx="8" cy="12" r="2"></circle>
              <circle cx="16" cy="12" r="2"></circle>
              <circle cx="8" cy="19" r="2"></circle>
              <circle cx="16" cy="19" r="2"></circle>
            </svg>
          </div>

          <div class="unfugly-brand" id="unfugly-brand-drag" title="Drag to move">
            <svg class="unfugly-shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span class="unfugly-brand-text" title="${escapeHtml(currentAccount)}">
              ${escapeHtml(currentAccount || 'KTRETE 2FA')}
            </span>
          </div>

          <div class="unfugly-divider"></div>

          ${
            currentSecret
              ? `
            <div class="unfugly-code-box" id="unfugly-code-click" title="Click to copy code">
              <span class="unfugly-code-text" id="unfugly-code-text">${formatCode(currentTotpCode)}</span>
            </div>

            <div class="unfugly-timer-wrap" title="Time remaining before code refresh">
              <svg class="unfugly-timer-svg" viewBox="0 0 30 30">
                <circle class="unfugly-timer-bg" cx="15" cy="15" r="13"></circle>
                <circle class="unfugly-timer-circle" id="unfugly-timer-circle" cx="15" cy="15" r="13"></circle>
              </svg>
              <span class="unfugly-timer-seconds" id="unfugly-timer-seconds">30</span>
            </div>

            <button class="unfugly-btn" id="unfugly-copy-btn" title="Copy code to clipboard">
              <svg id="unfugly-copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span id="unfugly-copy-label">Copy</span>
            </button>

            <button class="unfugly-btn unfugly-btn-secondary" id="unfugly-autofill-btn" title="Paste directly into page OTP field">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>Autofill</span>
            </button>

            <button class="unfugly-icon-btn" id="unfugly-settings-btn" title="Settings / Reset QR / Center position">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>

            <button class="unfugly-icon-btn" id="unfugly-minimize-btn" title="Minimize to small floating badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          `
              : `
            <button class="unfugly-btn" id="unfugly-open-setup-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Set Up 2FA Authenticator</span>
            </button>
          `
          }
        </div>
      `
      }

      <!-- Setup Modal -->
      <div class="unfugly-modal-overlay ${isSetupModalOpen ? 'open' : ''}" id="unfugly-setup-modal">
        <div class="unfugly-modal-card">
          <div class="unfugly-modal-header">
            <div>
              <div class="unfugly-modal-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>KTRETE 2FA Setup</span>
              </div>
              <div class="unfugly-modal-subtitle">
                Import your 2FA code once to auto-generate and auto-fill OTPs on this portal.
              </div>
            </div>
            <button class="unfugly-icon-btn" id="unfugly-close-modal-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Google Authenticator Export Guidance Box -->
          <div class="unfugly-help-box">
            💡 <strong>Exporting from Google Authenticator:</strong><br/>
            Open Authenticator app → Tap <strong>Menu (top right)</strong> → <strong>Transfer accounts</strong> → <strong>Export accounts</strong>.
            Then click <strong>"Scan with Laptop Camera"</strong> below and hold your phone up to the screen!
          </div>

          <!-- Camera Live Scanner -->
          <div class="unfugly-camera-wrap" id="unfugly-camera-wrap">
            <video class="unfugly-camera-video" id="unfugly-camera-video" playsinline autoplay muted></video>
            <div class="unfugly-camera-reticle"></div>
            <button class="unfugly-btn unfugly-btn-secondary" id="unfugly-stop-camera-btn" style="margin-top: 6px;">
              <span>Cancel Camera</span>
            </button>
          </div>

          <!-- Drag and drop QR zone -->
          <div class="unfugly-dropzone" id="unfugly-dropzone">
            <div class="unfugly-dropzone-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </div>
            <div class="unfugly-dropzone-title">Upload QR Image / Photo</div>
            <div class="unfugly-dropzone-hint">
              Drop screenshot or press <kbd>Ctrl+V</kbd> to paste
            </div>
            <input type="file" id="unfugly-file-input" accept="image/*" style="display: none;" />
          </div>

          <!-- Primary Actions: Camera & DOM detect -->
          <div class="unfugly-modal-actions">
            <button class="unfugly-btn" id="unfugly-camera-scan-btn" style="flex: 1.2;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span>Scan with Laptop Camera</span>
            </button>
            <button class="unfugly-btn unfugly-btn-secondary" id="unfugly-scan-page-btn" style="flex: 1;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Detect on Page</span>
            </button>
          </div>

          <div class="unfugly-or-divider">OR ENTER SECRET MANUALLY</div>

          <!-- Manual Secret Input -->
          <div class="unfugly-input-group">
            <input
              type="text"
              class="unfugly-input"
              id="unfugly-manual-secret-input"
              placeholder="Base32 Key or otpauth:// URI"
              autocomplete="off"
              spellcheck="false"
            />
            <button class="unfugly-btn" id="unfugly-manual-save-btn">
              <span>Save</span>
            </button>
          </div>

          <div class="unfugly-alert" id="unfugly-modal-alert"></div>
        </div>
      </div>

      <!-- Toast Feedback -->
      <div class="unfugly-toast" id="unfugly-toast">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span id="unfugly-toast-text">Copied to clipboard!</span>
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
    }, 2200);
  }

  function showModalAlert(message, type = 'error') {
    if (!shadowRoot) return;
    const alertBox = shadowRoot.getElementById('unfugly-modal-alert');
    if (!alertBox) return;

    alertBox.textContent = message;
    alertBox.className = `unfugly-alert ${type}`;
    alertBox.style.display = 'block';
  }

  function clearModalAlert() {
    if (!shadowRoot) return;
    const alertBox = shadowRoot.getElementById('unfugly-modal-alert');
    if (alertBox) alertBox.style.display = 'none';
  }

  // =========================================================================
  // 9. Action Handlers & Event Listeners
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
    const miniDragHandle = shadowRoot.getElementById('unfugly-mini-drag-handle');
    if (miniBar && miniDragHandle) {
      makeElementDraggable(miniBar, miniDragHandle, (newPos) => {
        savedMiniPosition = newPos;
        setStorageData({ [STORAGE_KEYS.miniPosition]: newPos });
      });
    }

    // Open Setup Modal
    const openSetupBtn = shadowRoot.getElementById('unfugly-open-setup-btn');
    if (openSetupBtn) {
      openSetupBtn.onclick = () => {
        isSetupModalOpen = true;
        renderWidget();
      };
    }

    // Close Setup Modal
    const closeModalBtn = shadowRoot.getElementById('unfugly-close-modal-btn');
    if (closeModalBtn) {
      closeModalBtn.onclick = () => {
        stopCameraScanner();
        isSetupModalOpen = false;
        renderWidget();
      };
    }

    const modalOverlay = shadowRoot.getElementById('unfugly-setup-modal');
    if (modalOverlay) {
      modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
          stopCameraScanner();
          isSetupModalOpen = false;
          renderWidget();
        }
      };
    }

    // Camera Scan Trigger
    const cameraScanBtn = shadowRoot.getElementById('unfugly-camera-scan-btn');
    if (cameraScanBtn) {
      cameraScanBtn.onclick = () => startCameraScanner();
    }

    const stopCameraBtn = shadowRoot.getElementById('unfugly-stop-camera-btn');
    if (stopCameraBtn) {
      stopCameraBtn.onclick = () => stopCameraScanner();
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
        scanPageBtn.textContent = 'Scanning page images...';
        const parsed = await scanDomForQrCode();
        scanPageBtn.disabled = false;
        scanPageBtn.textContent = 'Detect on Page';

        if (parsed) {
          await saveNewSecret(parsed);
        } else {
          showModalAlert('No QR code detected on current page. Try scanning your phone screen with camera or upload a photo.', 'error');
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
          showModalAlert('Invalid secret. Please provide a valid Base32 key or otpauth:// URI.', 'error');
        }
      };

      manualInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          manualSaveBtn.click();
        }
      };
    }

    // Copy Code Actions
    const copyBtn = shadowRoot.getElementById('unfugly-copy-btn');
    const codeBox = shadowRoot.getElementById('unfugly-code-click');

    const handleCopy = () => {
      if (!currentTotpCode || currentTotpCode === '------') return;
      const cleanCode = currentTotpCode.replace(/\s+/g, '');
      navigator.clipboard.writeText(cleanCode).then(() => {
        showToast(`Copied ${cleanCode}!`);
        if (copyBtn) {
          copyBtn.classList.add('unfugly-btn-copied');
          const label = shadowRoot.getElementById('unfugly-copy-label');
          if (label) label.textContent = 'Copied!';
          setTimeout(() => {
            if (copyBtn) copyBtn.classList.remove('unfugly-btn-copied');
            if (label) label.textContent = 'Copy';
          }, 1800);
        }
      });
    };

    if (copyBtn) copyBtn.onclick = handleCopy;
    if (codeBox) codeBox.onclick = handleCopy;

    // Autofill Action
    const autofillBtn = shadowRoot.getElementById('unfugly-autofill-btn');
    if (autofillBtn) {
      autofillBtn.onclick = () => {
        if (!currentTotpCode || currentTotpCode === '------') return;
        const cleanCode = currentTotpCode.replace(/\s+/g, '');
        const filled = autofillOtp(cleanCode);
        if (filled) {
          showToast(`Autofilled ${cleanCode}!`);
        } else {
          showToast(`Copied ${cleanCode} (No OTP field found)`);
          navigator.clipboard.writeText(cleanCode);
        }
      };
    }

    // Settings Action (Reset QR or Reset Position)
    const settingsBtn = shadowRoot.getElementById('unfugly-settings-btn');
    if (settingsBtn) {
      settingsBtn.onclick = () => {
        const action = window.prompt(
          'KTRETE 2FA Authenticator Options:\n1: Re-scan / Change QR Code\n2: Reset bar position to Top Center\n\nEnter 1 or 2:',
          '1'
        );
        if (action === '1') {
          isSetupModalOpen = true;
          renderWidget();
        } else if (action === '2') {
          savedPosition = null;
          savedMiniPosition = null;
          setStorageData({
            [STORAGE_KEYS.position]: null,
            [STORAGE_KEYS.miniPosition]: null
          });
          renderWidget();
          showToast('Position reset to Top Center');
        }
      };
    }

    // Minimize & Restore
    const minimizeBtn = shadowRoot.getElementById('unfugly-minimize-btn');
    if (minimizeBtn) {
      minimizeBtn.onclick = () => {
        isMinimized = true;
        setStorageData({ [STORAGE_KEYS.minimized]: true });
        renderWidget();
      };
    }

    const minExpandBtn = shadowRoot.getElementById('unfugly-min-expand-btn');
    if (minExpandBtn) {
      minExpandBtn.onclick = () => {
        isMinimized = false;
        setStorageData({ [STORAGE_KEYS.minimized]: false });
        renderWidget();
      };
    }
  }

  // Handle global paste (Ctrl+V)
  window.addEventListener('paste', async (e) => {
    const items = (e.clipboardData || window.clipboardData).items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          if (!isSetupModalOpen && currentSecret) {
            const ok = window.confirm('Pasted QR image detected. Update 2FA Authenticator secret?');
            if (!ok) return;
          }
          isSetupModalOpen = true;
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
    showModalAlert('Scanning QR code image...', 'success');
    const rawCode = await scanFileBlob(file);
    if (!rawCode) {
      showModalAlert('No QR code found in this image. Please ensure the QR code is clearly visible.', 'error');
      return;
    }
    const parsed = parseTotpInput(rawCode);
    if (!parsed) {
      showModalAlert('Detected QR code does not contain a valid 2FA TOTP secret.', 'error');
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
    showToast('Authenticator connected successfully!');
    await updateTotpCode(true);
    renderWidget();
  }

  // =========================================================================
  // 10. Dynamic Radial Timer & TOTP Update Loop
  // =========================================================================
  const CIRCLE_CIRCUMFERENCE = 81.68;

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
        if (codeText) {
          codeText.textContent = formatCode(currentTotpCode);
          codeText.style.transition = 'none';
          codeText.style.color = '#38bdf8';
          setTimeout(() => {
            codeText.style.transition = 'color 0.4s ease';
            codeText.style.color = '#f8fafc';
          }, 300);
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
    const isWarning = remainingSec <= 5;

    if (shadowRoot) {
      const circle = shadowRoot.getElementById('unfugly-timer-circle');
      const secLabel = shadowRoot.getElementById('unfugly-timer-seconds');
      if (circle) {
        circle.style.strokeDashoffset = offset;
        if (isWarning) circle.classList.add('warning');
        else circle.classList.remove('warning');
      }
      if (secLabel) {
        secLabel.textContent = remainingSec;
        if (isWarning) secLabel.classList.add('warning');
        else secLabel.classList.remove('warning');
      }

      const miniCircle = shadowRoot.getElementById('unfugly-mini-circle');
      const miniSec = shadowRoot.getElementById('unfugly-mini-seconds');
      if (miniCircle) {
        miniCircle.style.strokeDashoffset = offset;
        if (isWarning) miniCircle.classList.add('warning');
        else miniCircle.classList.remove('warning');
      }
      if (miniSec) {
        miniSec.textContent = remainingSec;
        if (isWarning) miniSec.classList.add('warning');
        else miniSec.classList.remove('warning');
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
        if (shouldRerender) {
          updateTotpCode(true).then(() => renderWidget());
        }
      }
    });
  }

  // =========================================================================
  // 11. Bootstrap
  // =========================================================================
  async function init() {
    const stored = await getStorageData([
      STORAGE_KEYS.secret,
      STORAGE_KEYS.account,
      STORAGE_KEYS.digits,
      STORAGE_KEYS.period,
      STORAGE_KEYS.minimized,
      STORAGE_KEYS.position,
      STORAGE_KEYS.miniPosition
    ]);

    currentSecret = stored[STORAGE_KEYS.secret] || null;
    currentAccount = stored[STORAGE_KEYS.account] || 'KTRETE Curricula';
    currentDigits = stored[STORAGE_KEYS.digits] || 6;
    currentPeriod = stored[STORAGE_KEYS.period] || 30;
    isMinimized = !!stored[STORAGE_KEYS.minimized];
    savedPosition = stored[STORAGE_KEYS.position] || null;
    savedMiniPosition = stored[STORAGE_KEYS.miniPosition] || null;

    if (currentSecret) {
      await updateTotpCode(true);
    }

    if (document.body) {
      initUi();
    } else {
      document.addEventListener('DOMContentLoaded', initUi);
    }

    startTimerLoop();
  }

  init();
})();
