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
