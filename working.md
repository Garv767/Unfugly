# Unfugly — Working Notes

## Current Issue: Extension sending partial cookies (2026-07-14)

### Problem
The extension is sending cookies via `chrome.cookies.getAll({})` in `handleFetchBackend`, but the resulting set is **missing** `_iamadt_client_10002227248` and `_iamtt`.

The backend middleware at `utils/auth.js:102` requires:
```
JSESSIONID && (_iamadt_client_10002227248 || _iamtt)
```

This causes 401 rejections even though `JSESSIONID` is present and the session may actually be valid.

### Cookies being sent (20 total)
`_zxor`, `zccpn`, `LS_CSRF_TOKEN`, `ZohoMarkRef`, `ZohoMarkSrc`, `zabUserId`, `zalb_e188bc05fe`, `iamcsr`, `zabBotScore`, `siq1.zohocares-_zldp`, `siq1.zohocares-_zldt`, `cookie-uid`, `zps-tgr-dts`, `zalb_74c3a1eecc`, `zalb_f0e8db9d3d`, `stk`, `zalb_3309580ed5`, `CT_CSRF_TOKEN`, `wms-tkp-token_client_10002227248`, `JSESSIONID`

### Missing
- `_iamadt_client_10002227248` — Zoho IAM token (may no longer be issued)
- `_iamtt` — Zoho IAM Transfer Token (replacement for above)

### Root Cause
Zoho may have stopped issuing `_iamadt_client_*` tokens in the browser session. The `_iamtt` is a transient cookie used during login redirect, not persisted.

### Fix Applied
1. **Relaxed middleware check** — Skip the `_iamadt_client`/`_iamtt` presence check. Instead rely on the live WELCOME page validation to determine session validity.
2. **Added background worker logging** — Cookie names + domains are now logged at WARN level so they appear in service worker console.
3. **Changed session validation URL** — Using `/page/WELCOME` instead of `/widgetData/getStudentDetails`.
4. **Added Root Domains to Manifest** — Added `https://zoho.in/*`, `https://zoho.com/*`, and `https://srmist.edu.in/*` to `manifest.json` host_permissions, enabling the background script's `chrome.cookies.getAll` API to access root-domain cookies (like `_iamadt_client_*` or `__Secure-iamsdt_client_*` set on `.zoho.in`/`.zoho.com` directly).

### Files Modified
- `extension/manifest.json` — Added root domain permissions (`zoho.in`, `zoho.com`, `srmist.edu.in`)
- `extension/background.js` — Added WARN-level cookie logging in `handleFetchBackend`
- `unfugly-backend/utils/auth.js` — Relaxed session token presence check
- `unfugly-backend/routes/v1/auth.js` — Updated validation URL (done earlier)
