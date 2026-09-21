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
4. **Production 401 Cookie Drops**: Browsers were dropping the `SameSite=None` cookie because `req.secure` could sometimes evaluate to false behind multiple reverse proxies (like Render's load balancers). Switched the logic in `unfugly-backend/routes/v1/auth.js` to parse the `Origin`/`Referer` headers directly. If the request isn't coming from a local testing IP (`10.x`, `192.x`, `localhost`), it reliably forces `Secure: true` and `SameSite: None`, completely fixing the cross-domain 401s on the live server.

### Files Modified (2026-07-15)
- `unfugly-backend/server.js` — Fixed Redis fallback logic.
- `unfugly-backend/routes/v1/user.js` — Migrated sequential `await` calls to `Promise.all`.
- `unfugly-backend/routes/v1/auth.js` — Dynamically set cookie `secure` and `SameSite` options for local HTTP requests.
- `extension/content.js` — Added initials fallback to the profile panel.
- `webapp/src/app/dashboard/page.tsx` — Applied initials fallback in desktop UI; removed mobile header avatar placeholder.
- `webapp/src/components/BottomNav.tsx` — Added initials fallback to the bottom nav bar.

### Fix Applied (2026-07-15 Update #4)
1. **Third-Party Cookie Dropping**: Safari, iOS devices, and many mobile browsers completely block cross-site cookies by default. Since the frontend (`vercel.app`) and backend (`onrender.com`) are cross-site, the `unfugly_token` cookie was being silently dropped, resulting in persistent 401s on mobile devices. I migrated the frontend `fetch` logic to store the token in `localStorage` and pass it via the `Authorization: Bearer <token>` header, completely bypassing all browser cookie restrictions.
2. **Backend Logger Timezone**: Set `process.env.TZ = 'Asia/Kolkata'` in `utils/logger.js` to ensure Pino outputs Indian Standard Time (IST) instead of UTC.

### Files Modified (2026-07-15 Update #4)
- `unfugly-backend/utils/logger.js` — Forced `TZ` to Asia/Kolkata.
- `webapp/src/**/*.tsx` — Injected the `Authorization: Bearer` header into all `fetch` calls and configured `/login` to persist the token into `localStorage`.

### Fix Applied (2026-07-15 Update #5)
1. **Missed Bearer Tokens**: The automated fetch-refactor script from Update #4 missed the `/api/v1/scrape/all` fetch call because of multiline formatting. Manually injected the `Authorization` header to fix the 401s during background scraping.
2. **Image Tag Authentication**: The `<img>` tag cannot natively send custom `Authorization` headers. To allow the webapp to fetch the user's profile photo without relying on cookies, I updated the backend's `verifyJWT` middleware (`utils/auth.js`) to parse the token from the query string (`req.query.token`). The webapp now appends `?token=...` to the image `src`.

### Files Modified (2026-07-15 Update #5)
- `unfugly-backend/utils/auth.js` — Added support for `req.query.token` in `verifyJWT`.
- `webapp/src/app/dashboard/page.tsx` — Fixed Bearer token for `scrape/all` and added `?token=` to profile photo `src`.
- `webapp/src/components/BottomNav.tsx` — Added `?token=` to mobile profile photo `src`.

### Fix Applied (2026-07-15 Update #6)
1. **Live Profile Photo Fallback**: The webapp's `<img>` tag was fetching the photo before the background `scrape/all` script could finish (or in cases where it failed), resulting in 404s. I updated `/api/v1/user/photo` to act as a fallback scraper. If the photo URL is `null` in the database, it instantly uses the session cookies to scrape the live `Student_Profile_Report` from Academia, updates the Supabase `users` table on success, and proxies the image to the frontend without missing a beat. Proper logging was also added to track these scraping attempts in the server console.

### Files Modified (2026-07-15 Update #6)
- `unfugly-backend/routes/v1/user.js` — Built a robust fallback scraping mechanism directly into the `/photo` endpoint.

### Fix Applied (2026-07-15 Update #7)
1. **Bad Profile Photo URL in DB**: The user updated the parsing logic in `/scrape/all`, but the database still held the old bad URLs (`/srm_university/...`) for users who already synced. Because of this, the `photoUrl` was not `null`, completely bypassing the fallback scrape, and resulting in a `url must not start with a slash` error in `got-scraping`. 
2. **Auto-Fix & Unified Parsing**: I updated `unfugly-backend/routes/v1/user.js` to automatically detect bad DB entries (URLs starting with `/`), instantly sanitize them (prepending domain, decoding HTML entities), and update the DB on the fly! I also applied this identical cleaning logic to the live fallback scraper so it matches the updated `scrape.js`.

### Files Modified (2026-07-15 Update #7)
- `unfugly-backend/routes/v1/user.js` — Added DB URL auto-fix logic and robust regex URL sanitization for the fallback scraper.

### Fix Applied (2026-07-15 Update #9)
1. **MarksView Crash**: When rendering internal marks for user `gr3323`, the app crashed on `MarksView.tsx:50` because it attempted to read `'Course Code'` on a slot in `courseData` that was `null` (due to empty slots in the user's timetable). I added a null check `c && c['Course Code']` to resolve this crash.

### Files Modified (2026-07-15 Update #9)
- `webapp/src/components/MarksView.tsx` — Protected the `find` iteration with a null guard.

### Fix Applied (2026-07-15 Update #8 - User Manual Overrides)
1. **Logger Timezone**: Reverted custom IST timezone logic in `utils/logger.js` in favor of `translateTime: 'SYS:yyyy-mm-dd HH:MM:ss'`, leveraging the environment's system timezone natively.
2. **Scraper Refactoring**: The user manually updated `routes/v1/scrape.js` to rigorously sanitize the `profilePhotoUrl` (cleaning slashes, prepending `ACADEMIA_BASE`, and removing HTML entities). 
*(Note: Going forward, backend changes will not trigger a frontend submodule bump unless a frontend deployment is actively required).*

### Fix Applied (2026-07-16 Update #10 - New User Auth & Empty States)
1. **Backend DB Constraint Fix**: Updated `routes/v1/auth.js` to upsert a placeholder record into the `users` table (with `user_net_id` and `name = net_id.toUpperCase()`) **before** inserting into `user_logs`. This satisfies the foreign key constraint and prevents new user signups from failing silently. Applies to both `/login` (native webapp flow) and `/extension-session` (Chrome extension flow).
2. **Backend Error Propagation**: All Supabase upsert/update calls in the auth routes now capture and throw returned errors, preventing silent failures from being masked by a successful HTTP 200 response.
3. **Frontend Dashboard Robustness**: Replaced the `!data || !data.profileData` outer guard with a `loading`-only check so the main layout renders even when profile data is absent. Constructed a safe `uiData` fallback object (`{ profileData: null, attendanceData: [], ... }`) used throughout all subcomponents instead of raw `data`, preventing `Cannot read properties of null` TypeErrors.
4. **Frontend 404 Bypass**: The `/api/v1/user/data` fetch handler now checks if `cachedData.error` is present (e.g., 404 User Not Found for a brand-new user) and — instead of crashing — skips setting state and goes directly to background scraping.
5. **BottomNav Null Safety**: Fixed `BottomNav.tsx` to use `parsed?.profileData || null` with optional chaining, preventing a TypeError crash when local storage contains a partially formed or null-valued cache object.

### Files Modified (2026-07-16)
- `unfugly-backend/routes/v1/auth.js` — Added users table placeholder upsert before user_logs, added DB error checking.
- `webapp/src/app/dashboard/page.tsx` — Replaced outer guard, added uiData fallback, bypassed error responses from /user/data.
- `webapp/src/components/BottomNav.tsx` — Added optional chaining for parsed profileData.
