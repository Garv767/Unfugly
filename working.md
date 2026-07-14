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

### Fix Applied (2026-07-14 Update)
1. **Protected Calendar Endpoints:** Added `verifyJWT` middleware to the `GET /api/v1/calendar` and `POST /api/v1/calendar` routes in the backend to ensure auth.
2. **Fixed Frontend Fetches:** Updated `fetch` calls in the Next.js webapp (`Dashboard`, `CalendarView`, `AttendancePredict`) to use `credentials: 'include'` so that they don't fail with 401 Unauthorized after protecting the route.
3. **Appended `net_id` from Extension:** Modified `extension/api/calendar.js` to dynamically look up `getNetId()` and append `net_id=${netId}` to the backend requests. This ensures the backend correctly registers the action against `user_net_id` rather than defaulting to `extension_user`.

### Files Modified
- `extension/manifest.json` — Added root domain permissions (`zoho.in`, `zoho.com`, `srmist.edu.in`)
- `extension/background.js` — Added WARN-level cookie logging in `handleFetchBackend`
- `unfugly-backend/utils/auth.js` — Relaxed session token presence check
- `unfugly-backend/routes/v1/auth.js` — Updated validation URL (done earlier)
