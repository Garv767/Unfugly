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

### Fix Applied (2026-07-14 Update #2)
1. **Extension Image Script Robustness**: Added a safety check in `extension/imageURLScript.js` to ensure the "Select All" toggle doesn't uncheck columns if they were already selected. Softened the CSS selector to detect the image even if Handsontable hasn't fully rendered the parent wrappers.
2. **Backend Image Scraping**: Introduced a new backend step during `/api/v1/scrape/all`. The backend will now directly fetch `Student_Profile_Report` and parse the payload via Regex to locate the `image-download` URL, eliminating the need for the webapp to rely purely on the extension to fetch profile photos.

### Files Modified (2026-07-14)
- `extension/manifest.json` — Added root domain permissions (`zoho.in`, `zoho.com`, `srmist.edu.in`)
- `extension/background.js` — Added WARN-level cookie logging in `handleFetchBackend`
- `unfugly-backend/utils/auth.js` — Relaxed session token presence check
- `unfugly-backend/routes/v1/auth.js` — Updated validation URL (done earlier)

### Fix Applied (2026-07-15 Update #3)
1. **Redis Rate Limiter Crash**: Resolved `TypeError: Expected result to be array of values` thrown by `express-rate-limit` during Redis failovers. Adjusted the fallback in `server.js` to return `[1, Date.now() + windowMs]` instead of `[0, Date.now()]`, satisfying validation logic.
2. **Avatar Fallbacks**: Introduced a two-letter initials avatar (e.g., "GR") in the extension and webapp whenever the profile photo fetch fails.
3. **Endpoint Optimization**: Replaced sequential Supabase queries with concurrent `Promise.all` calls in `unfugly-backend/routes/v1/user.js` (`/data`, `/save`, and `/get/:net_id`), reducing their execution time from ~2.5s down to a single concurrent query duration.

### Files Modified (2026-07-15)
- `unfugly-backend/server.js` — Fixed Redis fallback logic.
- `unfugly-backend/routes/v1/user.js` — Migrated sequential `await` calls to `Promise.all`.
- `extension/content.js` — Added initials fallback to the profile panel.
- `webapp/src/app/dashboard/page.tsx` — Applied initials fallback in desktop UI; removed mobile header avatar placeholder.
- `webapp/src/components/BottomNav.tsx` — Added initials fallback to the bottom nav bar.
