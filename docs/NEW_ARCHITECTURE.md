# Unfugly Ecosystem V3 Architecture Specification

> **Status:** Approved Architecture Draft  
> **Applies to:** Webapp (Primary), Backend API (v2), Extension (Companion), Convoy App, Campus Marketplace  
> **Target Graduation Batches:** Legacy (<=2029) and Modern (2030+)

---

## 1. System Vision & Product Evolution

Unfugly is transitioning from a Chrome-extension-first utility into an integrated, **Webapp-first university ecosystem** powered by a single Supabase backend and identity layer.

```mermaid
graph TD
    subgraph Identity_Data_Layer["Identity and Data Layer"]
        SupabaseAuth["Supabase Native Auth (auth.users)"]
        ProfilesTable[("profiles Table: Verified NetID, Gender, Batch, Vault")]
        RedisCache[("Redis: Hot Sessions, Calendar ICS Cache")]
    end

    subgraph Client_Applications["Client Applications"]
        Webapp["Unfugly Webapp (Next.js - Primary Dashboard)"]
        Extension["Chrome Extension (Companion Sync and Content Script)"]
        Convoy["Convoy App (Campus Carpooling and Ride Sharing)"]
        Marketplace["Campus Marketplace (Verified Student Commerce)"]
    end

    subgraph External_Portals["External Portals"]
        SP["SRM Student Portal (sp.srmist.edu.in)"]
        Academia["Legacy Academia (academia.srmist.edu.in)"]
    end

    SupabaseAuth --> ProfilesTable
    Webapp --> ProfilesTable
    Convoy --> ProfilesTable
    Marketplace --> ProfilesTable
    Extension --> ProfilesTable

    Webapp -->|Decrypts In-Memory| SP
    Webapp -->|Batch pre-2030 Only| Academia
    RedisCache -.-> Webapp
```

### Key Paradigm Shifts:
1. **Webapp-First**: The Next.js web application is the core hub for student operations. The Chrome extension is now an optional companion tool.
2. **Lean Persistence**: Unfugly no longer stores heavy raw marks and attendance dumps in PostgreSQL. Live data is fetched on demand or cached in Redis; only user-added overrides (expected marks, manual OD/ML) and structured timetables are permanently stored.
3. **Cross-Product Identity**: The unified `profiles` table powers:
   - **Unfugly Webapp**: Academic schedule, attendance prediction, SGPA simulation.
   - **Convoy**: Campus carpooling with verified gender filtering (`female_only`, `male_only`, `any`) directly from portal records.
   - **Campus Marketplace**: Verified student-to-student buying and selling with zero anonymous accounts.
4. **Monetization Layer**: Premium features (Calendar `.ics` feed, PYQ analysis & question bank) gated via a dedicated `subscriptions` table.

---

## 2. Database Schema & Naming Conventions

All legacy and underlying PostgreSQL tables utilize `snake_case` column naming for relational integrity and are designed to be **strictly non-destructive**: existing `users`, `user_logs`, and `academic_calendar` tables remain intact for backward compatibility.

**Universal Naming Standard:**
All architecture interfaces, API endpoints, JSON payloads exchanged between backend and client applications (webapp, extension, convoy, marketplace), and TypeScript models strictly standardize on **`camelCase`** across all current and future implementations (e.g., `userNetId`, `feedbackCount`, `timetableJson`, `courseCode`, `courseTitle`, `attendanceData`, `classesToAttend`, `classesToSkip`). Backward-compatible `snake_case` aliases are retained on backend responses for smooth historical interop.

### 2.1 Entity Relationship Diagram

```mermaid
erDiagram
    auth_users ||--|| profiles : "references id"
    profiles ||--o{ user_academic_overrides : "logs"
    profiles ||--o{ user_timetables : "customizes"
    profiles ||--o{ user_course_registrations : "enrolls"
    profiles ||--o{ subscriptions : "owns"
    profiles ||--o{ convoy_rides : "hosts"
    profiles ||--o{ convoy_bookings : "books"
    profiles ||--o{ marketplace_listings : "posts"

    profiles {
        uuid id PK
        string user_net_id UK
        string registration_no
        string name
        string gender
        int batch_year
        string programme_branch
        string school_department
        string section
        int semester
        string profile_image_url
        text encrypted_sp_password
        text encrypted_academia_password
        boolean has_academia_access
        string calendar_feed_token UK
        timestamp last_seen_at
        timestamp created_at
        timestamp updated_at
    }

    user_academic_overrides {
        uuid id PK
        string user_net_id FK
        string subject_code
        string override_type
        date override_date
        jsonb details_json
        timestamp created_at
        timestamp updated_at
    }

    user_timetables {
        uuid id PK
        string user_net_id FK
        string semester
        jsonb timetable_json
        jsonb edited_slots_json
        string source
        timestamp last_synced_at
        timestamp updated_at
    }

    user_course_registrations {
        uuid id PK
        string user_net_id FK
        string semester
        jsonb courses_json
        string source
        timestamp updated_at
    }

    subscriptions {
        uuid id PK
        string user_net_id FK
        string plan_tier
        string billing_provider
        string provider_subscription_id
        string status
        jsonb features_enabled
        timestamp starts_at
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }

    convoy_rides {
        uuid id PK
        string driver_net_id FK
        string source
        string destination
        timestamp departure_time
        int total_seats
        int available_seats
        string gender_preference
        numeric price_per_seat
        string status
        timestamp created_at
    }

    convoy_bookings {
        uuid id PK
        uuid ride_id FK
        string passenger_net_id FK
        int seats_booked
        string passenger_gender
        string status
        timestamp created_at
    }

    marketplace_listings {
        uuid id PK
        string seller_net_id FK
        string title
        text description
        numeric price
        string category
        jsonb image_urls
        string status
        timestamp created_at
        timestamp updated_at
    }
```

### 2.2 Table Specifications

#### `profiles`
- `id`: UUID Primary Key, foreign key referencing Supabase `auth.users(id)`.
- `user_net_id`: Unique SRM NetID (e.g., `gr2383`). Email is implicitly `${user_net_id}@srmist.edu.in`.
- `registration_no`: Official SRM Registration Number (e.g., `RA2311003010...`).
- `name`: Student's full name.
- `gender`: Verified student gender (`'male'`, `'female'`, `'other'`), scraped exclusively from Student Portal Personal Details (`iden=17`).
- `batch_year`: **Year of graduation** (e.g., `2026`, `2027`, `2028`, `2029`, `2030`).
- `has_academia_access`: Boolean computed as `(batch_year < 2030)`. Students graduating in 2030+ reside entirely on Student Portal.
- `programme_branch`, `school_department`, `section`, `semester`, `profile_image_url`.
- `encrypted_sp_password`: Combined string formatted as `base64(iv):base64(auth_tag):base64(ciphertext)` for Student Portal credentials (all students).
- `encrypted_academia_password`: Formatted as `base64(iv):base64(auth_tag):base64(ciphertext)` for Academia credentials (null for batch 2030+).
- `calendar_feed_token`: Secure random hex token for external `.ics` feeds.
- `last_seen_at`: Timestamp updated on webapp/extension activity for dormant account detection.

#### `user_academic_overrides`
- Stores user-added expected marks and manual OD/ML entries without persisting raw dumps.
- `override_type`:
  - `'expected_marks'`: User's simulated scores for internal evaluation components (CLA1, CLA2, FT1, Assignments) and expected End-Sem mark.
  - `'manual_od'`: Manually recorded On-Duty.
  - `'manual_ml'`: Manually recorded Medical Leave.
- `override_date`: Specific date chosen by the user.
- `details_json`:
  - For OD/ML: **Full-day by default**. Contains `{ "all_day": true, "excluded_hours": [], "category": "OD", "reason": "Tech fest" }`. When `all_day: true`, the prediction engine automatically flags all scheduled periods on that date's Day Order as attended via OD/ML.

#### `user_timetables`
- `timetable_json`: Weekly period matrix for Day Orders 1 through 5, supporting **up to 12 periods per day** (Hours 1 to 12).
- `edited_slots_json`: Custom modifications (user-renamed courses, room adjustments, swapped faculty).

#### `user_course_registrations`
- Stores current semester enrolled subjects:
  ```json
  [
    {
      "course_code": "21CSC302J",
      "course_title": "Database Management Systems",
      "credits": 4,
      "course_type": "Theory with Practical",
      "slot": "A1+TA1",
      "faculty_name": "Dr. ...",
      "room_no": "TP402"
    }
  ]
  ```

#### `subscriptions`
- Gating for paid features (`live_calendar_sync`, `pyq_predictions`).
- Tracks plan tier (`free`, `semester_pass`, `annual_pass`), expiration, and active status.

---

## 3. Cryptography: AES-256-GCM Vault

### What are IV and Tag?
- **IV (Initialization Vector / Nonce)**: A 12-byte cryptographically secure random number generated fresh on every encryption operation. Even if two users share the same password, their ciphertexts are completely distinct, preventing pattern analysis and rainbow table matching.
- **Auth Tag**: A 16-byte cryptographic checksum computed by Galois/Counter Mode (GCM). During decryption, GCM verifies that the ciphertext has not been modified or corrupted. If even one bit is tampered with in the database, decryption immediately rejects the payload.

### Combined Storage Format:
To avoid adding 6 separate database columns for IVs and Tags, credentials are encrypted and stored in a single unified string:
```text
encrypted_sp_password = "<base64_iv>:<base64_tag>:<base64_ciphertext>"
```
- Decryption is performed strictly **in-memory** on the server when a live sync or scraping job is initiated.
- Plaintext passwords and session cookies are never written to logs, console, or client responses.

---

## 4. Student Portal Scraper & Security Handshake

### 4.1 Reverse-Engineered Security Topology & Anti-Bot Architecture
Analysis of live Student Portal (`sp.srmist.edu.in`) traffic and client-side security modules (`guardlogin.js`, `secure2.js`, `guardloginbottom.js`) reveals a multi-layered defense system:

1. **The Decoy Honeypot Trap (`captchaText`)**:
   - The JSP embeds a decoy token `window.SECURE_CONFIG.captchaText = '...'` in the HTML.
   - **Crucial Finding**: Submitting this text triggers an immediate security alert (`Invalid captcha.`). It is designed to trap naive scrapers and report them to `/api/log-phishing`.
   - The real CAPTCHA image is generated server-side by `GET /srmiststudentportal/SCaptchaServlet?ts=<timestamp>&token=<guid>`.
2. **Domain-Proof Handshake (`X-Domain-Proof`)**:
   - To acquire the real CAPTCHA binary PNG, the client must submit the header:
     $$\text{X-Domain-Proof} = \text{base64}(\text{sessionNonce} + \text{":sp.srmist.edu.in"})$$
   - Along with strict browser CORS navigation headers (`Sec-Fetch-Dest: empty`, `Sec-Fetch-Mode: cors`, `Sec-Fetch-Site: same-origin`).
3. **Form-Level Bot Traps**:
   - Dynamic hidden honeypot text input: `<input type="text" name="ph_<hash>" tabindex="-1">` (must be submitted empty).
   - Dynamic domain token: `dtoken_<hash> = base64(reverse("sp.srmist.edu.in"))`.
   - Dynamic interaction token: `cptoken_<hash> = base64(elapsedSeconds + randomDelimiter + interactionCount)`.
   - Client telemetry blob: `telemetryPayload = base64(JSON.stringify(telemetryMetadata))`.

### 4.2 Automated Sub-Second Login Pipeline:
The backend executes a seamless, zero-cloud-cost automated handshake:
1. **GET `youLogin.jsp`**: Records session start timestamp and extracts `nonce`, `domainFieldName`, `captchaFieldName`, `randomDelimiter`, `honeypotName`, and `captchaUrl`.
2. **GET `SCaptchaServlet`**: Requests the binary PNG using the computed `X-Domain-Proof` header (`base64(sessionNonce + ":sp.srmist.edu.in")`).
3. **Instant In-Process ONNX Solving (<20ms)**: Solves the 6-character captcha using pure in-process `onnxruntime-node` with `common_old.onnx` and embedded `charsets.json` (`utils/captchaSolver.js`). Bilinear resize to height 64 and CTC greedy collapse decoding achieve 100% precision on SRM's distorted font with zero Python runtime, zero child process spawning, and zero cloud API fees.
4. **Timing Heuristics & Telemetry Synthesis**:
   - Enforces a realistic human interaction delay (2.5s) before form submission to satisfy server anti-bot timing checks.
   - Calculates dynamic elapsed time: $\text{timeElapsed} = \lfloor (\text{submitTime} - \text{startTime}) / 1000 \rfloor$.
   - Generates interaction proof: $\text{cptoken} = \text{base64}(\text{timeElapsed} + \text{randomDelimiter} + \text{interactCount})$.
   - Generates domain proof: $\text{dtoken} = \text{base64}(\text{reverse}(\text{"sp.srmist.edu.in"}))$. Both client guard scripts append this field, so it is submitted twice.
   - Synthesizes realistic browser telemetry matching `secure2.js` (`canvasHash: "-eb97cee"`, matching `User-Agent`, `timezoneOffset: -330`, mouse/keystroke counts, and timing).
5. **POST `LoginServlet`**: Submits credentials, empty honeypot, solved captcha, dynamic `secureToken` CSRF token (parsed from `<input type="hidden" name="secureToken" value="..." />`), telemetry payload, and dynamic tokens.
   - If `secureToken` is absent from form submission, SRMIST's server silently redispatches to `youLogin.jsp` without executing authentication.
   - If SRMIST returns a temporary lockout alert (`"Your user ID has been temporarily locked... Please try again after 5 minutes."`), the system aborts remaining attempts immediately to avoid prolonging the lockout period.
6. **Session Verification & Extraction**:
   - Confirms entry into `students/template/HRDSystem.jsp`.
   - Automatically queries `studentPersonalDetails.jsp` (`iden=17`) to extract verified **Full Name**, **Registration Number**, **Gender** (`male`/`female`), **Program/Branch**, **Semester**, and **Graduation Batch Year**.
   - Queries `studentProfile.jsp` (`iden=1`) to extract student profile photo URL.
   - Computes `has_academia_access = (batch_year < 2030)`.
   - Encrypts student password via AES-256-GCM (AAD bound to `user_net_id`) and upserts into Supabase `public.profiles`.

### 4.3 Deployment Egress, Residential Proxy, Cloudflare Worker & Vercel Edge Relay
Cloud hosting environments (Render, AWS, GCP) reside on datacenter ASNs that are strictly flagged by Cloudflare WAF bot management rules protecting `sp.srmist.edu.in`. Furthermore, SRMIST Student Portal enforces an aggressive per-IP rate limit on its CAPTCHA generation endpoint (`SCaptchaServlet`) that throttles or blocks IPs after fewer than 10 rapid attempts. To ensure consistent, production-grade connectivity:
1. **Centralized Client Dispatcher (`utils/spClient.js`)**: All HTTP requests targeting Student Portal (`youLogin.jsp`, `SCaptchaServlet`, `LoginServlet`, attendance, marks, calendar, and profile photo proxy) pass through `spFetch`.
2. **Always-Free Edge Relay Architecture (`SP_RELAY_URL`)**:
   - **Primary: Cloudflare Worker Edge Relay (`https://unfugly-sp-relay.unfugly-auth.workers.dev`)**:
     - **Smart Placement Optimization**: Configured with `[placement] mode = "smart"` in `wrangler.toml`. This instructs Cloudflare's global network routing heuristics to execute worker instances closest to the destination host (`sp.srmist.edu.in`) rather than the caller's ingress node. Consequently, when Render backend calls in Singapore dispatch to Cloudflare, execution dynamically shifts from Singapore (`SIN`) directly to Cloudflare's **Chennai (`MAA`) edge node** in Tamil Nadu, immediately adjacent to SRMIST campus infrastructure.
     - **SRMIST Geo-Restriction Root Cause**: Empirical inspection revealed SRMIST's upstream firewall/F5 ASM silently rejects non-Indian / foreign datacenter IPs with `Invalid credentials` even on valid passwords and clean CAPTCHAs, whereas requests from Indian edge nodes (`MAA`, `BOM`) succeed immediately with HTTP 302 redirects to `HRDSystem.jsp`.
     - **100% Always Free Tier**: 100,000 requests/day forever, no credit card required, zero expiration or recurring subscription costs.
     - **Diagnostic Headers**: Returns `x-colo` (e.g. `MAA`), `x-relay-runtime`, and `x-original-status` for instant real-time telemetry into request routing and edge execution location.
     - **Preserves Multi-Set-Cookie**: Formats multiple `Set-Cookie` headers into individual response headers, preventing cookie loss for critical session identifiers (`JSESSIONID`, `TS9dec798a027`).
     - **Verified Live End-to-End**: Reliably solves CAPTCHA, submits credentials, intercepts 302 redirect, and lands directly on `HRDSystem.jsp` with full academic sync (attendance, internal marks, exam timetable, calendar).
     - Defaults automatically in `utils/spClient.js` and `render.yaml`.
   - **Secondary: Vercel Serverless Relay (`webapp/src/app/api/sp-relay/route.ts`)**:
     - Configured with `export const runtime = 'nodejs';` and `export const preferredRegion = 'bom1';` alongside `webapp/vercel.json` (`"regions": ["bom1"]`).
     - Egresses physically from **Mumbai, India (AWS `ap-south-1`)**.
     - Strips `x-forwarded-*`, `x-real-ip`, `x-vercel-*`, and `cf-*` headers before dispatching upstream to SRMIST.
   - **Standalone AWS Lambda Package (`lambda-sp-relay/`)**:
     - Zero-dependency Node.js 20/22 Lambda handler with Function URL Payload Format 2.0.
   - **Repository & CI/CD Cleanliness (Submodule De-indexing)**:
     - The private `unfugly-backend` folder is removed from the parent git tree index (`git rm --cached unfugly-backend`) and ignored in `.gitignore`, ensuring Cloudflare Pages and Workers CI/CD environments do not fail with submodule clone errors (`error occurred while updating repository submodules`).
   - **Multi-Hop Redirect Ingestion**: When `spFetch` operates in relay mode, all HTTP 301/302/303/307/308 redirects (notably `LoginServlet` -> `HRDSystem.jsp`) are intercepted manually with `followRedirect: false`. Session cookies (`JSESSIONID`, `TS9dec798a027`) from the redirect response are immediately ingested into `cookieJar`, and subsequent redirect requests are piped through the Edge Relay, ensuring that deployment server IPs (e.g., Render) never attempt direct unproxied connections to SRMIST.
   - **Header & Fingerprint Parity (`useHeaderGenerator: false`)**: Disables `got-scraping`'s internal header generator across relay and direct modes. This prevents container runtime environments (such as Render's Linux containers) from auto-injecting Linux client hints (`Sec-Ch-Ua-Platform: "Linux"`) or mismatched User-Agents that conflict with the client telemetry payload (`telemetryPayload.platform: "Win32"`), ensuring F5 ASM and SRM WAF anti-bot checks pass consistently.
   - Handles cookie synchronization: `spFetch` binds session cookies to the actual target URL path (e.g. `/srmiststudentportal/`) across both direct and relayed hops, ensuring `JSESSIONID` and `TS9dec798a027` persistence across `youLogin.jsp`, `SCaptchaServlet`, and `LoginServlet`.
3. **Residential Proxy Gateway Fallback (`SP_PROXY_URL`)**: If `SP_PROXY_URL` (or standard `HTTP_PROXY`/`PROXY_URL`) is defined, requests are routed through a residential proxy gateway (e.g., BrightData, SmartProxy, Oxylabs) with Indian egress IPs. If neither is defined, requests route directly via `got-scraping`'s browser TLS emulation.
4. **Resilient DNS Resolver (`utils/dnsResolver.js`)**: In local development environments, local router or ISP DNS resolvers frequently refuse or fail to resolve education subdomains (`sp.srmist.edu.in`, `academia.srmist.edu.in`) returning `ENOTFOUND`. A monkey-patched fallback resolver automatically intercepts queries for SRMIST domains and queries Google DNS (`8.8.8.8`) and Cloudflare DNS (`1.1.1.1`) via `dns.promises.Resolver`, ensuring local dev servers communicate directly and reliably with SRMIST.
5. **Local Direct Routing Parity**: In non-production environments (`NODE_ENV !== 'production'` without `RENDER` or `FORCE_SP_RELAY`), `spClient.js` bypasses datacenter relay hops and connects directly, utilizing native residential IP trust to avoid Cloudflare/F5 ASM IP quarantine.

### 4.4 In-Memory Session Caching & Strict Credential Failure Discrimination
1. **`spSessionStore` TTL Cache**: Successful Student Portal authentications cache the authenticated `tough-cookie` `CookieJar` in-memory for 45 minutes. Subsequent background sync calls on the dashboard reuse this active session directly, avoiding repeated login overhead and eliminating unnecessary CAPTCHA solver cycles.
2. **Autonomous Captcha Resolution**: All background and on-demand Student Portal authentications solve CAPTCHAs automatically in-process via ONNX runtime through the Chennai Edge Relay, removing all manual CAPTCHA solving popups from the frontend.
3. **Strict Credential Failure Discrimination**:
   - The backend specifically discriminates between transient scraper/network issues and genuine password rejections.
   - **Only when SRMIST specifically responds with the attempt-tracking warning**:
     `"Alert Invalid login credentials The user ID or password entered is invalid.The login attempt was unsuccessful. You have 2 out of 3 login attempts remaining."`
     does the system flag `isInvalidCredentials: true` and prompt the user to re-enter/update their Student Portal password.
   - For all other errors (transient network timeout, rare OCR misread), the scraper retries up to 5 attempts silently or reports a temporary portal sync unavailability without falsely claiming the user's password was wrong.

### 4.6 Automated 100% Offline Extension ONNX Captcha Solver (`sp_content.js`)
When a student opens Student Portal (`https://sp.srmist.edu.in/...`):
1. **Zero-Click Page Load Detection & Race-Condition Immunity**:
   - `sp_content.js` monitors `#captcha` and `#secure_captcha` / `#captchaImg`.
   - **Race-Condition Elimination**: Solves the previous race condition where uninitialized `data-src` reads and `DOMObserver` loops triggered premature extraction before `guardlogin.js` finished loading the real image. The solver strictly waits until `img.src` is a resolved `blob:` URL (`blob:https://sp.srmist.edu.in/...`) with verified positive dimensions (`img.naturalWidth > 0`).
   - A single-pass mutex (`solvedBlobUrl`) ensures each captcha blob is solved exactly once, ignoring internal DOM updates caused by badge rendering.
2. **100% Offline Local In-Extension ONNX Solver**:
   - Operates completely client-side without any cloud backend server dependencies.
   - Bundles `onnxruntime-web` (`ort.min.js`, `ort-wasm.wasm`, `ort-wasm-simd.wasm`), `common_old.onnx` (13.6MB), and `charsets.json` inside `extension/lib/onnx/`.
   - Leverages a dedicated Manifest V3 **Offscreen Document** (`extension/offscreen.html` + `extension/offscreen.js`) running under extension origin permissions (`chrome-extension://...` with `script-src 'self' 'wasm-unsafe-eval'`), executing bilinear image resize to height 64 and CTC greedy collapse decoding in sub-50ms directly on the student's hardware.
3. **UI Reflection & Signature Styling**:
   - Populates `#captcha` using native prototype descriptor setters and synthetic `input`/`change` events.
   - **Signature Unfugly Border**: Applies `#00E676` (Unfugly neon emerald) border and glowing box-shadow (`box-shadow: 0 0 0 3px rgba(0, 230, 118, 0.22)`).
   - **UI Verification Badge**: Injects a sleek glassmorphic pill badge directly beneath the captcha field displaying the exact solved text (`Solved with by Unfugly: [ABC123]`) with an instant re-solve button, allowing students to verify the solution against the image.
   - **Hover Tooltip**: Displays `"Solved with by Unfugly"` on hover across both the input and the badge.
   - **Auto-Refresh Observer**: Automatically detects when a student clicks the captcha image or the `#btnRefresh` recycle icon, resetting the solved blob lock and seamlessly re-solving the new challenge.

---

## 5. Software Features & Predictive Engines

### 5.1 Native Calendar Subscription Feed (`webcal://` / `.ics`) — *Paid Feature*

```mermaid
sequenceDiagram
    autonumber
    actor CalApp as Native Calendar (Apple/Google)
    participant Edge as Edge CDN (Vercel/Render)
    participant Redis as Redis Cache
    participant API as Unfugly Backend API (v2)
    participant DB as Supabase DB

    CalApp->>Edge: GET /api/v2/calendar/feed/:token.ics (If-None-Match: hash)
    alt CDN Cache Hit
        Edge-->>CalApp: 200 OK (Cached ICS string)
    else CDN Cache Miss
        Edge->>API: Forward request
        API->>DB: Check last_seen_at (Dormant cutoff > 30 days)
        alt Inactive User
            API-->>CalApp: 200 OK (Empty feed with "Re-activate Unfugly" event)
        else Active User
            API->>Redis: GET calendar:ics:<token>
            alt Redis Cache Hit
                Redis-->>API: Stored ICS string
                API-->>CalApp: 200 OK / 304 Not Modified
            else Redis Cache Miss
                API->>DB: Fetch user_timetables & academic_calendar
                API->>API: Generate 12-hour DO1-DO5 mapped VEVENTs
                API->>Redis: SETEX calendar:ics:<token> 604800 (7 days)
                API-->>CalApp: 200 OK with ETag
            end
        end
    end
```

#### Shift Handling via Global Invalidation:
- **Global University Calendar**: SRM's day-order shifts are stored once in `academic_calendar` (e.g. `{ "2026-11-20": "DO4", "2026-11-21": "HOLIDAY", "2026-11-24": "DO5" }`).
- When a holiday shifts the schedule, the backend updates `academic_calendar` once ($O(1)$) and issues a Redis command `DEL calendar:ics:*`.
- No massive background jobs; as client devices ping the feed over the next 12 hours, the schedule recalculates automatically on cache miss.
- **Zombie Ping Defenses & Permanent Event Retention**:
  - `ETag` + `304 Not Modified` header check (sends 0 KB body for unchanged feeds).
  - **Permanent Semester Retention (No Calendar Wipes)**: Returning `410 Gone` causes Google and Apple Calendar to delete the entire calendar feed, erasing students' past class and attendance history. Instead, when a semester concludes, the server serves the final frozen schedule with `Cache-Control: public, max-age=31536000, immutable` and a terminal `ETag`. Any future check by the client immediately hits `304 Not Modified` (0 bytes body), keeping historical dates permanently on the user's phone with zero server computation.
  - Dormant account cutoff: Accounts inactive for >30 days receive an empty calendar with a reminder event.

### 5.2 Exam Timetable & Hall Ticket
- **Timetable (`iden=126`)**: Fetches subject code, course title, date, slot, and session (`FN`: 09:30 AM–12:30 PM, `AN`: 01:30 PM–04:30 PM).
- **Hall Ticket (`iden=42`)**: Closer to the exam date, SRM populates hall and seating allocations. The parser extracts Hall Number, Seat/Row Allocation, and reporting guidelines directly into the exam card.

### 5.3 SGPA & CGPA Predictive Modeling
- **Prior Academic Record**: Extracted from `studentMarksCredits.jsp` (`iden=8`) for historical credits and CGPA.
- **Current Enrolled Courses**: From `user_course_registrations`.
- **Formulas**:
  $$\text{SGPA} = \frac{\sum (\text{Course Credits} \times \text{Grade Point})}{\sum \text{Course Credits}}$$
  $$\text{CGPA}_{\text{new}} = \frac{(\text{Prior CGPA} \times \text{Prior Credits}) + (\text{Predicted SGPA} \times \text{Current Credits})}{\text{Prior Credits} + \text{Current Credits}}$$
- Incorporates user-defined expected marks from `user_academic_overrides` for instant "what-if" grade simulation.

### 5.4 Manual & Automated OD/ML Attendance Prediction
- **Graduating Batches <=2029**: Approved OD is not displayed on portals. Users log OD dates in the webapp; the engine assumes full-day coverage (all classes for that day order) and projects adjusted attendance percentages and safe bunks.
- **Graduating Batches 2030+**: Approved OD/ML hours appear directly in the Student Portal attendance table (`iden=9`). The parser ingests official OD automatically and merges user-added pending ODs for simulation.
- **Buffer Formula**:
  $$\text{Safe Bunks} = \left\lfloor \frac{\text{Attended Hours} + \text{OD Hours} - (0.75 \times (\text{Total Hours} + \text{Planned Hours}))}{0.75} \right\rfloor$$

### 5.5 Dynamic PYQ Analysis & Question Extraction — *Paid Tab*
- **Current-Semester Scoped Filtering**: The webapp automatically joins the user's current enrolled course codes from `user_course_registrations` with `pyq_questions`. Students are presented **only** with the PYQs matching their active semester courses, organized under separate subject accordion sections inside the PYQs tab.
- **Extraction Pipeline**: Instead of displaying static PDFs, questions are extracted and structured:
  ```json
  {
    "subject_code": "21CSC302J",
    "unit": 3,
    "marks": 16,
    "question_text": "Explain B+ Tree indexing with insertion and deletion algorithms.",
    "occurrences": 4,
    "exam_source": ["End-Sem Nov 2024", "End-Sem May 2025", "Model 2024"]
  }
  ```
- **Admin Ingestion**: The admin pastes raw paper text or uploads paper images/PDFs. The backend LLM/OCR worker extracts questions, assigns Bloom taxonomy levels, and indexes them by subject code.
- **Student Experience**: In a dedicated paid tab, students view high-probability questions grouped by syllabus unit, sorted by frequency, with practice tracking.

---

## 6. Payment & Subscription Provider Recommendation

For college students in India, **Razorpay Standard Checkout & UPI Payment Links** is the optimal choice:
- **Zero Friction**: 99% of Indian university students use UPI (Google Pay, PhonePe, Paytm). International processors (Stripe, Lemon Squeezy) require credit cards with 3D Secure, leading to >80% checkout abandonment.
- **Pricing Model**: **Semester Passes** (e.g., ₹49 to ₹99 per semester) or **Annual Passes** (₹149/year).
- **Integration**:
  1. Frontend calls `POST /api/v2/subscriptions/create-order`.
  2. Backend generates a Razorpay Order ID.
  3. Student completes UPI payment.
  4. Razorpay webhook hits `POST /api/v2/subscriptions/webhook`, verifying the payment signature and updating `subscriptions.status = 'active'`.

---

## 7. Multi-App Expansion: Convoy & Marketplace

### Convoy (Campus Carpooling)
- Built on top of the same `profiles` table.
- Drivers post rides with `gender_preference` (`'female_only'`, `'male_only'`, `'any'`).
- The booking system verifies the passenger's `profiles.gender` before confirming reservations, providing authentic portal-verified safety.

### Campus Marketplace
- Peer-to-peer buying and selling for textbooks, calculators, lab coats, and electronics.
- Verified accounts tied to SRM NetID eliminate anonymous scammers.

---

## 8. API Versioning & Route Monitoring Strategy

### 8.1 Route Versioning Guarantees
To ensure zero downtime and prevent breaking existing extension versions:
- **`/api/v1/...` (Strictly Frozen)**: Preserved exactly as-is for active extension builds (`/api/v1/user/save`, `/api/v1/auth/login`, `/api/v1/feedback`, etc.). No breaking changes or route renames may touch `/api/v1`.
- **`/api/v2/...` (Modern Architecture)**: Independent namespace for all V3 capabilities:
  - `POST /api/v2/auth/sync-session`
  - `POST /api/v2/user/vault-credentials`
  - `GET  /api/v2/calendar/feed/:token.ics`
  - `GET  /api/v2/exams`
  - `POST /api/v2/predict/sgpa`
  - `POST /api/v2/predict/attendance`
  - `GET  /api/v2/pyq/:subject_code`
  - `POST /api/v2/subscriptions/create-order`
  - `POST /api/v2/subscriptions/webhook`

### 8.2 Route Usage Monitoring
All incoming requests pass through a non-blocking telemetry middleware:
- **Structured Metrics**: Logs HTTP method, sanitized path (stripped of user tokens), status code, response time in ms, and caller `user_net_id`.
- **Redis Operational Counters**: Daily hit counters maintained via `HINCRBY api:metrics:<YYYY-MM-DD> "<METHOD> <ROUTE>" 1`. Provides instant traffic visibility without database writes or third-party overhead.

---

## 9. Portal Session Concurrency & Anti-Bot Behavior

### 9.1 SRM Academia Concurrency Rules & Handshake
- **Concurrent Session Limits**: Academia allows a maximum of 2 active sessions.
  - **Second Session Warning**: Triggers a preloader warning modal: *"Max session reached. Terminate other or skip."* (`code: POST_ANNOUCEMENT_REDIRECTION`).
    - **Handshake Clearance**: Sending `GET /accounts/p/40-10002227248/announcement/sessions-reminder/next?status=1&serviceurl=...` immediately skips/clears the warning and redirects cleanly to `redirectFromLogin`.
  - **Third Session Hard Blocker**: Enforces a mandatory blocking gate (`code: SI303`, redirecting to `/preannouncement/block-sessions`).
    - **Automated Handshake Clearance**: Reverse-engineering of `block-sessions.html` reveals the exact termination API:
      1. Issue `DELETE /accounts/p/40-10002227248/webclient/v1/announcement/pre/blocksessions` with header `X-ZCSRF-TOKEN: iamcsrcoo=<iamcsr>`. Server returns `HTTP 200 {"status_code":204, "code":"SES200", "message":"Session closed success"}`.
      2. Issue `GET /accounts/p/40-10002227248/preannouncement/block-sessions/next`. Server returns `HTTP 302 Found`, redirecting immediately to `redirectFromLogin` and granting full dashboard access.
- **CAPTCHA Trigger Condition**: Academia only presents a CAPTCHA if 5 consecutive failed logins occur from the same IP/client. A single valid authentication resets the counter. The extension can assist by autofilling the field on login.

### 9.2 SRM Student Portal Concurrency
- Student Portal (`sp.srmist.edu.in`) is decoupled from Zoho single-sign-on and does not enforce the 2-session termination gate, permitting reliable parallel background fetching once authenticated.

### 9.3 Headless-Free Feedback Submission (Pure HTTP POST)
- **Eliminating Puppeteer / Chromium**: Running headless Chromium on Render consumes 300MB–400MB RAM, easily causing Out-Of-Memory (OOM) crashes on free/basic server tiers.
- **Reverse-Engineered Payload**: Network logs in `academia.srmist.edu.in.har` reveal that feedback submissions are standard `x-www-form-urlencoded` POST requests to `/srm_university/academia-academic-services/form/Student_Feedback_Form` with predefined option IDs:
  - `Excellent`: `2727643000027208389`
  - `Very Good`: `2727643000027208385`
  - `Good`: `2727643000027208377`
  - `Average`: `2727643000027208373`
  - `Poor`: `2727643000027208369`
- By submitting direct HTTP POST requests with the student's session cookies, the backend executes feedback completion in under 300ms using less than 2MB of memory, allowing Render's free tier to handle hundreds of concurrent submissions safely.

---

## 10. Modular Academic Sync Engine & Transactional Communications

### 10.1 Modular Sync Engine Architecture (`Promise.allSettled`)
The sync architecture is designed for total component isolation:
- **Resilient Parallelism**: Academic data streams run via `Promise.allSettled`:
  1. `scrapeSpAttendance`: Extracts course hours, attendance percentage, and target classes-to-skip / classes-to-attend margins.
  2. `scrapeSpInternalMarks`: Retrieves aggregate marks and recursively extracts component evaluations (FP-I, PBL-I, CLA, assignments) via inner JSP.
  3. `scrapeSpExamTimetable`: Extracts official end-sem dates, sessions (FN/AN), and seat numbers.
  4. `getOrRefreshAcademicCalendar`: Dual-source academic calendar ingestion (Academia primary, Student Portal fallback) with a global 24-hour database cache.
  5. `scrapeAcademiaTimetable`: Extracts enrolled courses, student batch (`1` vs `2`), and maps against the 12-hour unified slot matrix into `user_timetables` and `user_course_registrations`.
- **Fault-Tolerant Persistence**: A failure or delay in one portal (e.g. Academia SSO rate limit or exam timetable unreleased) never blocks or cancels the successful extraction and storage of the remaining data streams.
- **Session Cache Optimization**: Academia session cookies are cached in memory/Redis with a 10-hour TTL, preserving the strict 10–15 daily login quota on Zoho SSO.
- **SP Profile Photo Auto-Ingestion**: Ingests public CDN profile photo from `studentProfile.jsp` (`iden=1`) directly into `profiles.profile_image_url`.

### 10.2 Unified Academic Calendar Architecture & 24-Hour Cache
- **Single Canonical Day Order Format**:
  - To maintain absolute backward compatibility with the production webapp components (`CalendarView.tsx`, `TimetableView.tsx`, `BottomNav.tsx`, `dashboard/page.tsx`), every day object in `calendar_json` uses exactly one variable for day order: **`dayOrder`** (`'1'`–`'5'` for instructional days, or `'-'` for holidays/weekends):
    ```json
    { "day": "Mon", "dayOrder": "5", "event": "Commencement of Classes for Minor Degree" }
    ```
- **Dual-Source 24-Hour Refresh & Intelligent Merging**:
  - All students fetch from the static Supabase table `academic_calendar` in <2ms with zero SRM network calls when `< 24h` old.
  - When the 24-hour cache window elapses:
    - If the user requesting the sync is **SP-only** (e.g. batch $\ge$ 2030, or lacks Academia access), the backend fetches from Student Portal (`AcademicCalenderDetailsInner.jsp`) and merges it into the existing calendar.
    - **Non-destructive Event Merging**: During SP merging, if `date + dayOrder` match, the backend **does not override** event descriptions that are absent or generic in SP, preserving rich university announcements previously extracted from Academia while applying any newly scheduled holiday shifts.
    - Otherwise (students with Academia access), the backend scrapes Academia (`Academic_Planner_YYYY_YY_ODD/EVEN`) with SP fallback.
- **Dynamic Day Order Lookup**: Client and backend match `new Date()` against `calendar_json` (e.g., `calendar_json["Nov '26"]["15"]`) to obtain today's Day Order and holiday status.

### 10.3 CORS Security Boundaries
- Backend CORS policies in `server.js` strictly permit:
  - Production domains: `https://unfugly.app`, `https://www.unfugly.app`, `https://unfugly.vercel.app`, `https://api.unfugly.app`
  - Chrome Extension origins: `chrome-extension://lfjlfkbcnoioefacgcjanjdiodphnoce`
  - Localhost development environments
  - User-specific Vercel preview deployments matching regex: `/^https:\/\/[a-zA-Z0-9_-]+-garv767s-projects\.vercel\.app$/i`
- Generic wildcard `*.vercel.app` access is explicitly rejected.

### 10.4 Multi-Service Transactional Email & Magic Link Architecture
To avoid student confusion across the 3 shared services (Unfugly Webapp, Convoy Carpooling, Campus Marketplace):
- All auth requests (`/api/v2/auth/register`, `/api/v2/auth/login`, `/api/v2/auth/resend-otp`, `/api/v2/auth/forgot-password`) accept a `service` parameter (`'webapp'`, `'convoy'`, `'marketplace'`) and optional client `redirect_to` override.
- **Dynamic Email Redirect URL Resolution (`resolveRedirectUrl`)**:
  - Direct client override: If `req.body.redirect_to` or `req.body.redirect_url` is passed, that exact target URL is preserved.
  - **Convoy**: Resolves to `process.env.CONVOY_URL || 'https://convoy.unfugly.app/login'`. When launched from native app wrappers, deep links (`convoy://auth/callback` or `convoy://login`) are fully supported.
  - **Campus Marketplace**: Resolves to `process.env.MARKETPLACE_URL || 'https://marketplace.unfugly.app/login'`.
  - **Unfugly Webapp (Default)**: Dynamically resolves from `req.headers.origin` (preserving active localhost or Vercel preview environments, e.g. `https://*-garv767s-projects.vercel.app/login`), falling back to `process.env.FRONTEND_URL` and `https://unfugly.app/login`.
- **Client Magic Link & Token Detection**:
  - The login client (`login/page.tsx`) inspects both URL query parameters (`window.location.search`) and hash fragments (`window.location.hash`), extracting tokens (`token`, `access_token`, `code`, `type`).
  - Upon token detection, the client auto-authenticates via `/api/v2/auth/me` or `/api/v2/auth/verify-otp`, persists `unfugly_token` into `localStorage`, and triggers the post-login portal connection check or routes directly to the dashboard.
- Metadata is passed to Supabase Auth (`options.data: { user_net_id, service, app_name }`), allowing custom Go-template conditionals in Supabase email templates or custom SMTP routing to deliver service-branded transactional OTPs and verification links.

### 10.5 SRM KTR E-Curricula 2FA Authenticator Companion Extension Script
- **Portal Scope**: Strictly restricted to `https://dld.srmist.edu.in/ktretecurricula/*` (specifically `https://dld.srmist.edu.in/ktretecurricula/#/`) via `extension/manifest.json` content script matching, strict origin/path runtime guards in `extension/ktretecurricula.js`, and `initiatorDomains: ["dld.srmist.edu.in"]` in DNR redirect rules, ensuring zero script execution or intrusion across other university subdomains or portals.
- **First-Setup QR & Migration Decoding**:
  - Direct Google Authenticator Export support: Decodes Google Authenticator's native `otpauth-migration://offline?data=...` protobuf format (used by Authenticator's "Transfer accounts" -> "Export accounts" screen).
  - Laptop Camera Scanner: Real-time video scanner (`getUserMedia`) that scans the export QR code held up on a phone screen directly through the laptop webcam.
  - Multi-input ingestion: Drag-and-drop image upload, file browser, clipboard paste (`Ctrl+V`), automated DOM image detection (`jsQR`), or manual Base32 key input.
- **Local Persistence & Privacy**:
  - Secrets, account labels, and positions persist exclusively in `chrome.storage.local` under camelCase keys (`unfuglyKtreteTotpSecret`, `unfuglyKtreteTotpAccount`, `unfuglyKtreteTotpDigits`, `unfuglyKtreteTotpPeriod`, `unfuglyKtreteTotpMinimized`, `unfuglyKtretePosition`, `unfuglyKtreteMiniPosition`).
  - No secret or TOTP data leaves the user's local browser environment (strictly 0 backend transmissions).
- **Movable UI & Dynamic Radial Timer**:
  - Fully draggable / movable top bar with dedicated grip handle, boundary clamping to screen dimensions, and coordinate persistence across sessions so it never obscures critical portal controls.
  - Computes RFC 6238 HMAC-SHA1 TOTP tokens client-side using `crypto.subtle`.
  - Injected via an isolated Shadow DOM root (`unfugly-ktrete-authenticator-host`) to prevent CSS contamination from/to the host page.
  - Features a Google Authenticator-style circular radial SVG countdown ring (30s period) that depletes dynamically and transitions from sky cyan to warning rose when $\le 5$ seconds remain.
  - Real-time live code updates in both full island (`#unfugly-code-text`) and minimized capsule (`#unfugly-mini-code-click`) views with smooth opacity transitions whenever tokens roll over.
  - Provides instant one-click copy with visual toast confirmation (both on the main bar and direct copy button in minimized view), an OTP field autofill helper for the portal login form, and minimize/expand toggle controls.
  - Non-destructive setup preview & debug hooks: `Alt+S`, `Ctrl+Shift+U`, settings menu item, and `window.__unfuglyOpenSetupModal()` allow previewing the setup modal with existing secrets fully preserved.
- **Portal Anti-DevTools & Right-Click Unblocking (`theajack/disable-devtool` Shield)**:
  - Runs at `document_start` to intercept capture-phase keyboard shortcuts (`F12`, `Ctrl+Shift+I/J/C`, `Ctrl+U`) and context menu blocks (`contextmenu`, `selectstart`, `copy`).
  - Completely neutralizes the portal's embedded `disable-devtool` library:
    - **Bot Bypass (`disable by bot`)**: Appends `Googlebot` to `Navigator.prototype.userAgent` getter, triggering the library's internal `if (d.seo && info.seoBot)` early-exit before any detectors or intervals initialize.
    - **Global Pre-emption**: Pre-defines `window.DisableDevtool` and `globalThis.DisableDevtool` with permanent `isSuspend = true` and `isRunning = true`.
    - **Console Benchmark Defanging**: Replaces `console.table` and `console.clear` with 0ms no-ops, preventing `disable-devtool`'s `Performance` detector from measuring DevTools rendering overhead.
    - **Redirect & Tab Close Interception**: Overrides `window.close()`, `window.history.back()`, `window.open("", "_self")`, and intercepts `setTimeout` redirect routines targeting `theajack.github.io`.
    - **Declarative Net Request Fail-Safe**: `extension/rules.json` intercepts any attempted main-frame or sub-frame navigation to `*://theajack.github.io/*` and immediately bounces it back to `https://dld.srmist.edu.in/ktretecurricula/#/`, backed by a secondary `chrome.tabs.onUpdated` listener in `background.js`.
- **Built-in DOM & Dialog HTML Inspector (`Alt+I`)**:
  - A built-in floating developer inspection drawer activated via `Alt+I`, the settings popover, or `window.__unfuglyInspect()`.
  - Enables viewing, formatting, and 1-click copying of active modal dialog HTML structures, full page HTML, and an interactive element reticle picker without opening browser DevTools.
- **Automated Human-Paced OTP Autofill (Submissions & 5-Min Checks)**:
  - Continuous `MutationObserver` and periodic polling (every 1.5s) detects OTP input triggers across all portal lifecycle stages: initial login, assignment / test submissions, and 5-minute inactivity verification prompts.
  - Automatically identifies both single 6-digit inputs and split 6-box digit inputs (`input[maxlength="1"]`, `otp-box`, etc.).
  - **Human-Cadence Keystroke Emulation**: Prevents behavioral bot flags by avoiding instantaneous synchronous 0ms dumps. Introduces a natural 1.3s–1.7s reaction delay after modal appearance, followed by realistic sequential keystrokes (120ms–200ms per digit with random jitter), firing full `keydown`, `keypress`, `input` (`inputType: 'insertText'`), `change`, and `keyup` bubbling events with prototype descriptor setters.
  - Features an 8-second post-fill cooldown and guard flags (`isTypingOtp`, `pendingInjectTimer`) to eliminate race conditions or duplicate entries.




