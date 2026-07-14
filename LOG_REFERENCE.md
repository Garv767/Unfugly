# Unfugly Unified Log Reference Guide

This reference guide documents all standardized logs and error codes used across the Chrome Extension, Web Application, and Node.js Backend.

---

## Log Levels

- **`INFO`** (Green): Normal lifecycle events, database read/writes, successful sync, and speed measurements.
- **`WARN`** (Yellow): Retry triggers, stale cache fallbacks, session drops, and non-fatal network anomalies.
- **`ERROR`** (Red): Operation failures, database transaction errors, and unhandled exceptions.
- **`FATAL`** (Magenta/Red): Crucial configuration issues that prevent the service from running (e.g. startup secret validation).

---

## Error Codes Catalog

### 🔐 Authentication & Session (`AUTH`)

#### `AUTH_01` (Incomplete Session Cookies)
* **Environment:** Extension Content Script, Background Worker, Backend Server
* **Severity:** `WARN`
* **Trigger:** The extension did not find any cookies on `academia.srmist.edu.in` or is missing crucial session tokens like `JSESSIONID` and `_iamadt_client_10002227248`.
* **Fix:** The user must navigate to the SRM Academia portal, log in, and reload the page.

#### `AUTH_02` (Session Expired / Token Invalid)
* **Environment:** Extension Background Worker, Webapp Client, Backend Server
* **Severity:** `ERROR` or `WARN`
* **Trigger:** The SRM portal session validation returned a redirect to the login page, or the web application JWT verification failed.
* **Fix:** Log in again or reload the SRM portal page to force a cookie re-evaluation.

---

### 🔄 Data Synchronization (`SYNC`)

#### `SYNC_01` (Successful Sync Action)
* **Environment:** Extension Content Script, Webapp Client, Backend Server
* **Severity:** `INFO`
* **Trigger:** User data, timetable edits, or photos successfully synced to the cloud database or local storage cache.

#### `SYNC_02` (Network Database Sync Failure)
* **Environment:** Webapp Client, Backend Server
* **Severity:** `ERROR`
* **Trigger:** A database transaction failed, or the server failed to store/fetch user logs due to connectivity or query errors.

#### `SYNC_03` (Local Storage Cache Error)
* **Environment:** Extension Content Script, Webapp Client
* **Severity:** `ERROR`
* **Trigger:** Browser `chrome.storage.local` or `localStorage` failed to read/write.

---

### 🕸️ Scraper & Portal Processing (`SCRP`)

#### `SCRP_01` (Portal Scraping Fetch Failure)
* **Environment:** Extension Content Script, Backend Server Scraper
* **Severity:** `ERROR`
* **Trigger:** The scraper failed to fetch a portal page (Course Registration, Attendance) due to network timeout or portal unreachability.

#### `SCRP_02` (Document Structural Parsing Failure)
* **Environment:** Extension Content Script, Webapp Client, Backend Server Scraper
* **Severity:** `ERROR`
* **Trigger:** The portal DOM has changed, and expected elements (like `table.course_tbl` or the timetable grid) were not found.

#### `SCRP_03` (Profile Photo Scraping/Proxy Failure)
* **Environment:** Extension Content Script, Backend Server
* **Severity:** `ERROR`
* **Trigger:** Failed to extract the student image URL from the Student Profile Report, or proxy request to SRM CDN failed.

---

### 📅 Academic Calendar (`CAL`)

#### `CAL_01` (Calendar Retrieval / Cache Miss)
* **Environment:** Extension Content Script, Webapp Client, Backend Server
* **Severity:** `WARN`
* **Trigger:** Requested calendar semester data is missing from the database or mock calendar fallback is served.

#### `CAL_02` (Calendar Database Sync Failure)
* **Environment:** Extension Background, Backend Server
* **Severity:** `ERROR`
* **Trigger:** Failed to update or upload the academic calendar JSON to the database.

#### `CAL_03` (Calendar Lifecycle/Status Log)
* **Environment:** Extension Background, Webapp Client
* **Severity:** `INFO`
* **Trigger:** Informational logs detailing when cached calendar or fallbacks are used.

---

### ⚙️ System & Lifecycle (`SYS`)

#### `SYS_01` (Container Rendering Retry Failure)
* **Environment:** Extension Content Script, Webapp Client
* **Severity:** `ERROR` or `WARN`
* **Trigger:** Retrying to find the target layout wrapper reached the max limit (e.g. slow page load).

#### `SYS_02` (General Network Request Failure)
* **Environment:** Webapp Client, Backend Server
* **Severity:** `ERROR`
* **Trigger:** A standard HTTP `fetch` request was rejected or timed out.

#### `SYS_03` (Extension worker lifecycle events)
* **Environment:** Extension Background Worker
* **Severity:** `INFO`
* **Trigger:** Extension service worker update, reload, or diagnostic message.

#### `SYS_04` (Server Configuration Error)
* **Environment:** Backend Server
* **Severity:** `FATAL`
* **Trigger:** Server failed to start due to missing environment variables (`JWT_SECRET`, `SUPABASE_URL`, etc.).

---

## 🔑 Native Academia Login — How It Works & How We Fixed It

> **Last fixed:** 2026-07-14  
> **Relevant file:** `unfugly-backend/routes/v1/auth.js` → `nativeAcademiaLogin()`  
> **Commits:** `9df6a30`, `206de15`, `3297744`, `445669f`

### The 3-Step Flow

```
Step 0  →  GET  SIGNIN_LANDING         → gets iamcsr, stk, zalb_* cookies
Step 1  →  POST signin/v2/lookup/{email} → gets digest + userId (JSESSIONID may appear)
Step 2  →  POST signin/v2/primary/{userId}/password → gets redirect_url + auth cookies
             └─ follow redirect_url chain manually (up to 5 hops, followRedirect:false each)
Step 3  →  GET  redirectFromLogin      → sets JSESSIONID, cli_rgn, zalb_*, _zcsr_tmp
             └─ followRedirect:false, then manually follow Location header (hop 2)
```

### Root Causes We Debugged (and fixed)

| # | Symptom | Root Cause | Fix |
|---|---------|-----------|-----|
| 1 | Only 5 cookies captured | `followRedirect:true` on Step 3 — `got` silently drops `Set-Cookie` from 302 hops | Changed to `followRedirect:false` + manual hop chain |
| 2 | `redirect_url: NONE`, password rejected | Wrong sign-in page URL — using `p/40-ORGID/signin` instead of real browser's `p/ORGID/signin?hide_fp=true&orgtype=40&dcc=true&...` | Changed `SIGNIN_BASE/signin` → `SIGNIN_LANDING` with full query params |
| 3 | Zoho returns HTTP 200 + `"Invalid password"` JSON silently passing | `pwRes.ok` check only tests HTTP status, but Zoho uses HTTP 200 for auth failures with `status_code: 500` in JSON | Added JSON `status_code >= 400` check after parsing body |
| 4 | Content-Type mismatch | Accidentally overrode to `application/json` — real browser uses `application/x-www-form-urlencoded` even for JSON body | Reverted to `BROWSER_HEADERS` default |
| 5 | `fetch_cookies.js` showing wrong user's cookies | `.limit(1)` with no filter returned any row in DB | Added `.eq('user_net_id', 'gr2383')` |
| 6 | `redirect_url: NONE` on every login (2026-07-14) | Academia changed portal path from `/portal/` → `/app/portal/`. All `serviceurl` params mismatched Zoho's registered app URL | Updated `REDIRECT_FROM_LOGIN` constant to use `/app/portal/` |

### The SIGNIN_LANDING URL (critical)

```js
// As of 2026-07-14 — uses /app/portal/ (without /app/ = redirect_url: NONE)
const REDIRECT_FROM_LOGIN = `${ACADEMIA_BASE}/app/portal/academia-academic-services/redirectFromLogin`;
const SIGNIN_LANDING = `${ACADEMIA_BASE}/accounts/p/${ZOHO_ORG_ID}/signin?hide_fp=true&orgtype=40&service_language=en&css_url=/49910842/academia-academic-services/downloadPortalCustomCss/login&dcc=true&serviceurl=${encodeURIComponent(ACADEMIA_BASE + '/app/portal/academia-academic-services/redirectFromLogin')}`;
```

This is extracted from Chrome DevTools → Network tab → Referer header on the `/lookup/` request.  
**If login breaks again**, capture a fresh manual login's Network tab and compare the Referer on the lookup call.

> **Root cause tracked 2026-07-14**: Academia changed the portal redirect path from `/portal/` → `/app/portal/`. This caused `redirect_url: NONE` from Zoho on every password auth, as the serviceurl Zoho was given no longer matched the registered app URL.

### What cookies the full login should produce

After a successful native login, `finalJar` should contain **at minimum**:

| Cookie | Set in | Purpose |
|--------|--------|---------|
| `iamcsr` | Step 0 | Zoho CSRF token for API calls |
| `stk` | Step 0 | Zoho session tracking |
| `zalb_*` | Step 0/3 | Load balancer affinity |
| `JSESSIONID` | Step 3 | Academia Java session |
| `cli_rgn` | Step 3 | Client region |
| `zccpn` | Step 3 | Zoho session nonce |
| `_iamadt_client_*` | Step 2 redirect | Zoho identity access token |
| `_iambdt_client_*` | Step 2 redirect | Zoho identity backup token |
| `__Secure-iamsdt_client_*` | Step 2 redirect | Secure Zoho session |
| `_z_identity` | Step 2 redirect | Zoho identity flag |
| `_zcsr_tmp` | Step 2 or 3 | Academia app CSRF — **required for portal pages** |

> **If `_zcsr_tmp` is missing:** The `redirect_url` from the password response was not captured/followed. Check if Zoho returned `redirect_url` in the JSON. If `NONE`, it means concurrent sessions were active — they get terminated automatically, then the re-attempt on the next login call should get `redirect_url`.

### Debug Tools

- **`debug_login.js`** — headful Playwright that types slowly and logs all cookies at each step  
  ```bash
  node debug_login.js
  ```
- **`grab_cookies_console.js`** — paste in Chrome DevTools on academia.srmist.edu.in to POST live cookies to local backend via `/extension-session`  
- **`fetch_cookies.js`** — pulls saved cookies from Supabase and writes `import_cookies.js`  
  ```bash
  node fetch_cookies.js
  ```

### If Native Login Breaks Again — Checklist

1. Open Chrome → academia.srmist.edu.in → log in manually  
2. Open DevTools Network → find the `/lookup/` request → copy its **Referer** header  
3. Compare the Referer URL with `SIGNIN_LANDING` in `auth.js` — update if params changed  
4. Check `/password` request body format: `{"passwordauth":{"password":"..."}}` (JSON, `Content-Type: x-www-form-urlencoded`)  
5. Check `iamcsr` format: after Step 0 it should be a UUID, after lookup it may update  
6. If still stuck: use `grab_cookies_console.js` as fallback to inject live Chrome cookies

