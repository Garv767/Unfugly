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
    minimized: 'unfuglyKtreteTotpMinimized'
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

  // =========================================================================
  // 1. Storage Helpers
  // =========================================================================
  function getStorageData(keys) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(keys, resolve);
        } else {
          // Fallback to localStorage
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
          // Fallback to localStorage
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
  // 3. Input & QR Code Parser
  // =========================================================================
  function parseTotpInput(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // Check if it's an otpauth URI
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
    // 1. Try native BarcodeDetector if available
    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const codes = await detector.detect(imgElementOrCanvas);
        if (codes && codes.length > 0 && codes[0].rawValue) {
          return codes[0].rawValue;
        }
      } catch (_) {
        // Fallback to jsQR
      }
    }

    // 2. jsQR library decoding
    if (typeof jsQR !== 'undefined') {
      try {
        let width = imgElementOrCanvas.naturalWidth || imgElementOrCanvas.width;
        let height = imgElementOrCanvas.naturalHeight || imgElementOrCanvas.height;
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
        console.warn('[Unfugly 2FA] jsQR canvas scan failed:', err);
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
  // 4. Autofill Helper for OTP Inputs
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
  // 5. Shadow DOM UI Injection
  // =========================================================================
  let shadowRoot = null;

  function initUi() {
    const host = document.createElement('div');
    host.id = 'unfugly-ktrete-authenticator-host';
    shadowRoot = host.attachShadow({ mode: 'open' });
    document.documentElement.appendChild(host);

    renderWidget();
  }

  function renderWidget() {
    if (!shadowRoot) return;

    const CIRCLE_CIRCUMFERENCE = 81.68; // 2 * pi * 13

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

        /* Top Bar Container */
        .unfugly-top-bar {
          position: fixed;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 9999px;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 7px 14px 7px 16px;
          z-index: 2147483647;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .unfugly-top-bar:hover {
          border-color: rgba(56, 189, 248, 0.4);
          box-shadow: 0 14px 36px -4px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.15);
        }

        /* Minimized Pill */
        .unfugly-minimized-pill {
          position: fixed;
          top: 14px;
          right: 20px;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 9999px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px;
          cursor: pointer;
          z-index: 2147483647;
          transition: all 0.25s ease;
        }

        .unfugly-minimized-pill:hover {
          transform: translateY(1px);
          border-color: rgba(56, 189, 248, 0.5);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55), 0 0 12px rgba(56, 189, 248, 0.2);
        }

        /* Branding Badge */
        .unfugly-brand {
          display: flex;
          align-items: center;
          gap: 7px;
          font-weight: 600;
          font-size: 12.5px;
          letter-spacing: 0.3px;
          color: #94a3b8;
        }

        .unfugly-shield-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          color: #38bdf8;
        }

        .unfugly-brand-text {
          white-space: nowrap;
          max-width: 130px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .unfugly-divider {
          width: 1px;
          height: 20px;
          background: rgba(255, 255, 255, 0.14);
        }

        /* Code Display Box */
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
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: 2.5px;
          color: #f8fafc;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        /* Circular Timer (Google Authenticator Style) */
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

        /* Buttons */
        .unfugly-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #0284c7;
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
          padding: 6px 10px;
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
          background: rgba(3, 7, 18, 0.75);
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
          max-width: 480px;
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
          margin-bottom: 16px;
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
          font-size: 13px;
          color: #94a3b8;
          margin-top: 4px;
        }

        /* Dropzone */
        .unfugly-dropzone {
          border: 2px dashed rgba(56, 189, 248, 0.4);
          background: rgba(30, 41, 59, 0.5);
          border-radius: 14px;
          padding: 24px 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .unfugly-dropzone:hover, .unfugly-dropzone.dragover {
          border-color: #38bdf8;
          background: rgba(56, 189, 248, 0.08);
          transform: translateY(-1px);
        }

        .unfugly-dropzone-icon {
          width: 42px;
          height: 42px;
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.12);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .unfugly-dropzone-title {
          font-size: 14px;
          font-weight: 600;
          color: #f8fafc;
        }

        .unfugly-dropzone-hint {
          font-size: 12px;
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

        .unfugly-modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }

        .unfugly-or-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 18px 0;
          color: #64748b;
          font-size: 12px;
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
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 12.5px;
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

        /* Toast feedback */
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
        <!-- Minimized Floating Pill -->
        <div class="unfugly-minimized-pill" id="unfugly-minimized-trigger" title="Click to expand Authenticator">
          <svg class="unfugly-shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span style="font-family: ui-monospace, monospace; font-size: 15px; font-weight: 700; letter-spacing: 1px;">
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
        <!-- Main Top Bar -->
        <div class="unfugly-top-bar" id="unfugly-top-bar">
          <div class="unfugly-brand">
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
            <!-- Live Authenticator Code Box -->
            <div class="unfugly-code-box" id="unfugly-code-click" title="Click to copy code">
              <span class="unfugly-code-text" id="unfugly-code-text">${formatCode(currentTotpCode)}</span>
            </div>

            <!-- Dynamic Radial Countdown Timer -->
            <div class="unfugly-timer-wrap" title="Time remaining before code refresh">
              <svg class="unfugly-timer-svg" viewBox="0 0 30 30">
                <circle class="unfugly-timer-bg" cx="15" cy="15" r="13"></circle>
                <circle class="unfugly-timer-circle" id="unfugly-timer-circle" cx="15" cy="15" r="13"></circle>
              </svg>
              <span class="unfugly-timer-seconds" id="unfugly-timer-seconds">30</span>
            </div>

            <!-- Copy Button -->
            <button class="unfugly-btn" id="unfugly-copy-btn">
              <svg id="unfugly-copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span id="unfugly-copy-label">Copy</span>
            </button>

            <!-- Quick Autofill Button -->
            <button class="unfugly-btn unfugly-btn-secondary" id="unfugly-autofill-btn" title="Paste directly into page OTP field">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>Autofill</span>
            </button>

            <!-- Settings / Reset Button -->
            <button class="unfugly-icon-btn" id="unfugly-settings-btn" title="Change QR Code or Reset">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>

            <!-- Minimize Button -->
            <button class="unfugly-icon-btn" id="unfugly-minimize-btn" title="Minimize">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          `
              : `
            <!-- First-Time Setup CTA -->
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
                Provide your 2FA QR code once to auto-generate codes on top of this portal.
              </div>
            </div>
            <button class="unfugly-icon-btn" id="unfugly-close-modal-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
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
            <div class="unfugly-dropzone-title">Click to upload QR code image</div>
            <div class="unfugly-dropzone-hint">
              Drag & drop a QR screenshot or press <kbd>Ctrl+V</kbd> anywhere to paste
            </div>
            <input type="file" id="unfugly-file-input" accept="image/*" style="display: none;" />
          </div>

          <!-- Scan from page action -->
          <div class="unfugly-modal-actions">
            <button class="unfugly-btn unfugly-btn-secondary" id="unfugly-scan-page-btn" style="flex: 1;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Auto-Detect QR on Page</span>
            </button>
          </div>

          <div class="unfugly-or-divider">OR ENTER SECRET MANUALLY</div>

          <!-- Manual Secret Input -->
          <div class="unfugly-input-group">
            <input
              type="text"
              class="unfugly-input"
              id="unfugly-manual-secret-input"
              placeholder="Base32 Secret or otpauth:// URI"
              autocomplete="off"
              spellcheck="false"
            />
            <button class="unfugly-btn" id="unfugly-manual-save-btn">
              <span>Save</span>
            </button>
          </div>

          <!-- Alert / Status -->
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

  // Format code with middle space for visual clarity (e.g. "123 456")
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
  // 6. Action Handlers & Event Listeners
  // =========================================================================
  function attachEventListeners() {
    if (!shadowRoot) return;

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
        isSetupModalOpen = false;
        renderWidget();
      };
    }

    const modalOverlay = shadowRoot.getElementById('unfugly-setup-modal');
    if (modalOverlay) {
      modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
          isSetupModalOpen = false;
          renderWidget();
        }
      };
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
        scanPageBtn.textContent = 'Auto-Detect QR on Page';

        if (parsed) {
          await saveNewSecret(parsed);
        } else {
          showModalAlert('No QR code detected on the current page. Please upload or paste a screenshot instead.', 'error');
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

    // Settings / Reset Action
    const settingsBtn = shadowRoot.getElementById('unfugly-settings-btn');
    if (settingsBtn) {
      settingsBtn.onclick = () => {
        const confirmReset = window.confirm(
          'Do you want to re-scan or change your KTRETE 2FA Authenticator QR code?'
        );
        if (confirmReset) {
          isSetupModalOpen = true;
          renderWidget();
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

    const minTrigger = shadowRoot.getElementById('unfugly-minimized-trigger');
    if (minTrigger) {
      minTrigger.onclick = () => {
        isMinimized = false;
        setStorageData({ [STORAGE_KEYS.minimized]: false });
        renderWidget();
      };
    }
  }

  // Handle global paste (Ctrl+V) anywhere on the page for seamless QR screenshot pasting
  window.addEventListener('paste', async (e) => {
    const items = (e.clipboardData || window.clipboardData).items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          if (!isSetupModalOpen && currentSecret) {
            // Secret already configured, ask or notify before replacing
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

    // If text was pasted while modal is open
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

    isSetupModalOpen = false;
    showToast('Authenticator connected successfully!');
    await updateTotpCode(true);
    renderWidget();
  }

  // =========================================================================
  // 7. Dynamic Radial Timer & TOTP Update Loop
  // =========================================================================
  const CIRCLE_CIRCUMFERENCE = 81.68; // 2 * pi * 13

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
          // Subtle pulse effect on code refresh
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
    const fraction = remainingMs / periodMs; // 1 down to 0

    // Stroke dashoffset: at fraction=1 offset=0 (full); at fraction=0 offset=CIRCUMFERENCE (empty)
    const offset = CIRCLE_CIRCUMFERENCE * (1 - fraction);
    const isWarning = remainingSec <= 5;

    if (shadowRoot) {
      // Main Bar Ring
      const circle = shadowRoot.getElementById('unfugly-timer-circle');
      const secLabel = shadowRoot.getElementById('unfugly-timer-seconds');
      if (circle) {
        circle.style.strokeDashoffset = offset;
        if (isWarning) {
          circle.classList.add('warning');
        } else {
          circle.classList.remove('warning');
        }
      }
      if (secLabel) {
        secLabel.textContent = remainingSec;
        if (isWarning) {
          secLabel.classList.add('warning');
        } else {
          secLabel.classList.remove('warning');
        }
      }

      // Minimized Pill Ring
      const miniCircle = shadowRoot.getElementById('unfugly-mini-circle');
      const miniSec = shadowRoot.getElementById('unfugly-mini-seconds');
      if (miniCircle) {
        miniCircle.style.strokeDashoffset = offset;
        if (isWarning) {
          miniCircle.classList.add('warning');
        } else {
          miniCircle.classList.remove('warning');
        }
      }
      if (miniSec) {
        miniSec.textContent = remainingSec;
        if (isWarning) {
          miniSec.classList.add('warning');
        } else {
          miniSec.classList.remove('warning');
        }
      }
    }

    // Refresh code when step rolls over
    updateTotpCode();
  }

  function startTimerLoop() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimerTick, 100);
  }

  // Page visibility change handler to prevent stale state when returning to tab
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateTotpCode(true);
      updateTimerTick();
    }
  });

  // Keep state synced across tabs
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
        if (shouldRerender) {
          updateTotpCode(true).then(() => renderWidget());
        }
      }
    });
  }

  // =========================================================================
  // 8. Bootstrap
  // =========================================================================
  async function init() {
    const stored = await getStorageData([
      STORAGE_KEYS.secret,
      STORAGE_KEYS.account,
      STORAGE_KEYS.digits,
      STORAGE_KEYS.period,
      STORAGE_KEYS.minimized
    ]);

    currentSecret = stored[STORAGE_KEYS.secret] || null;
    currentAccount = stored[STORAGE_KEYS.account] || 'KTRETE Curricula';
    currentDigits = stored[STORAGE_KEYS.digits] || 6;
    currentPeriod = stored[STORAGE_KEYS.period] || 30;
    isMinimized = !!stored[STORAGE_KEYS.minimized];

    if (currentSecret) {
      await updateTotpCode(true);
    }

    // Mount UI when document is ready
    if (document.body) {
      initUi();
    } else {
      document.addEventListener('DOMContentLoaded', initUi);
    }

    startTimerLoop();
  }

  init();
})();
