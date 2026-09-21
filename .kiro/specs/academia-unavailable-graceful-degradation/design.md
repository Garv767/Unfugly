# Academia Unavailable Graceful Degradation Bugfix Design

## Overview

The webapp crashes when Academia portal pages become unavailable (returning HTTP 404/401 errors) after semester ends. The bug manifests as frontend crashes when attempting to access properties on null `profileData` objects, and backend scraping failures that provide no fallback mechanism.

The fix implements graceful degradation at three levels:
1. **Backend Error Handling**: Wrap each page scrape in try-catch blocks, return partial data structures with null values for failed sections
2. **Caching Fallback**: Attempt to retrieve and return cached data from the database when fresh scraping fails
3. **Frontend Null Safety**: Add null checks before accessing nested properties, display "Page unreachable" UI components for unavailable sections

This ensures new users can access the webapp during off-semester periods, and existing users see cached data with clear indicators for unavailable sections.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when Academia pages return HTTP 404/401 errors and scraping fails, resulting in null profileData
- **Property (P)**: The desired behavior - system should return partial data with error flags, attempt cached data retrieval, and display appropriate error messages without crashing
- **Preservation**: Existing functionality when all Academia pages are available must remain unchanged
- **scraper.js**: The backend scraper in `unfugly-backend/scraper.js` that orchestrates page navigation and data extraction via Playwright
- **extractors.js**: The extraction functions in `unfugly-backend/extractors.js` that parse DOM elements to extract profile, attendance, marks, and timetable data
- **profileData**: The user profile object containing name, registrationNo, programmeBranch, schoolDepartment, section, and semester
- **Partial Data Structure**: A response object where unavailable sections are set to null with accompanying error messages, while available sections contain data
- **Graceful Degradation**: The system's ability to continue functioning with reduced capability when some services are unavailable

## Bug Details

### Bug Condition

The bug manifests when Academia portal pages return HTTP 404 or 401 status codes (indicating pages are unavailable after semester ends), causing the backend scraper to fail without fallback mechanisms, and the frontend to crash when attempting to access properties on null profileData objects.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { httpStatusCode: number, scrapingResult: object, cachedDataExists: boolean }
  OUTPUT: boolean
  
  RETURN (input.httpStatusCode IN [404, 401] OR input.scrapingResult.profileData == null)
         AND (input.cachedDataExists == false OR cacheNotRetrieved)
         AND frontendAttemptsPropertyAccess(input.scrapingResult.profileData)
END FUNCTION
```

### Examples

- **Example 1 (Profile Page Unavailable)**: 
  - Trigger: Navigate to My_Time_Table_2023_24, page returns 404
  - Current Behavior: `scrapedData.profileData` remains null, scraper continues, frontend crashes at `if (cachedData.profileData)` check because null check fails later when accessing `cachedData.profileData.name`
  - Expected Behavior: Backend wraps in try-catch, sets profileData to null with error message, checks database for cached profile, returns partial structure; frontend checks for null before accessing nested properties, displays "Profile page unreachable" message

- **Example 2 (Attendance Page Unavailable)**: 
  - Trigger: Profile scraping succeeds, but My_Attendance page returns 401
  - Current Behavior: Entire scraping operation may fail, or attendanceData is set to null without indication
  - Expected Behavior: Profile data is scraped successfully, attendance section wrapped in try-catch, attendanceData set to null with error flag, frontend displays "Attendance page currently unavailable - please try again later"

- **Example 3 (New User During Off-Semester)**: 
  - Trigger: New user attempts login when all Academia pages are unavailable, no cached data exists
  - Current Behavior: Webapp is completely unusable, user sees crash or infinite loading
  - Expected Behavior: Backend returns partial structure with all sections null and error messages, frontend displays welcome screen with "Academia services currently unavailable" message, allows user to explore empty state UI

- **Edge Case (Partial Availability - Some Pages Work)**: 
  - Trigger: Profile and timetable pages available, attendance and marks pages return 404
  - Expected Behavior: Backend successfully scrapes profile and timetable, wraps attendance/marks scraping in try-catch, returns mixed structure with some data and some null sections with error flags, frontend displays available data normally and shows "Page unavailable" for missing sections

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When all Academia pages are available and scraping succeeds, the system must continue to scrape, cache, and display all data correctly as it does now
- When cached data exists and fresh scraping succeeds, the system must continue to merge fresh data with cached data, preferring fresh data
- When the user has valid authentication cookies, the system must continue to attempt scraping before falling back to cached data
- Server-Sent Events (SSE) progress reporting must continue to emit progress events during scraping
- Database upsert logic for saving scraped data must remain unchanged when data is successfully scraped

**Scope:**
All inputs where Academia pages return HTTP 200 status codes and DOM elements are present should be completely unaffected by this fix. This includes:
- Successful scraping during active semester periods
- Profile, attendance, marks, and timetable display when data is available
- User authentication and session management flows
- Data caching and localStorage synchronization
- UI navigation and tab switching

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **No Error Handling Around Page Scraping**: The scraper.js file directly calls `playPage.goto()` and extraction functions without try-catch blocks. When Academia pages return 404/401 or timeout, these operations throw exceptions that are caught only by the outer try-catch, causing the entire scraping operation to fail without preserving successfully scraped sections.

2. **No Fallback to Cached Data**: When scraping fails, the backend does not attempt to retrieve cached data from the database. The `scraper.js` file only attempts to resume sessions from cookies but never falls back to previously cached profile, attendance, or marks data from the `users` and `user_logs` tables.

3. **Optimistic Property Access in Frontend**: The frontend code in `dashboard/page.tsx` checks `if (cachedData.profileData)` at line 71 but then accesses nested properties like `profileData.name`, `profileData.section`, `profileData.semester` in child components without additional null checks. When profileData is null or undefined, these property accesses throw "Cannot read properties of null" errors.

4. **All-or-Nothing Scraping Strategy**: The scraper treats all pages as equally required. If one page fails (e.g., attendance), the entire operation fails, even though profile and timetable pages might have been successfully scraped. There's no partial success mechanism.

5. **Insufficient Error Propagation**: When extraction functions return empty objects or null values, the scraper doesn't distinguish between "page unavailable" and "parsing error" scenarios. The frontend receives null values without context about why the data is missing.

## Correctness Properties

Property 1: Bug Condition - Graceful Degradation on Page Unavailability

_For any_ backend scraping request where one or more Academia pages return HTTP 404/401 errors or timeout, the fixed scraper SHALL wrap each page scraping operation in try-catch blocks, continue scraping remaining pages, attempt to retrieve cached data from the database for failed sections, return a partial data structure with null values and error messages for unavailable sections, and return successfully scraped data for available sections.

**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

Property 2: Bug Condition - Frontend Null Safety

_For any_ frontend render operation where profileData or nested properties are null or undefined, the fixed frontend SHALL check for null/undefined before accessing nested properties, display "Page unreachable" messages for unavailable sections, render available data sections normally, and prevent "Cannot read properties of null" crashes.

**Validates: Requirements 2.4, 2.6**

Property 3: Preservation - Successful Scraping Unchanged

_For any_ backend scraping request where all Academia pages return HTTP 200 and DOM elements are present (successful scraping scenario), the fixed scraper SHALL produce exactly the same result as the original scraper, preserving scraping logic, caching behavior, SSE progress reporting, and data structure format.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

#### Backend Changes

**File**: `unfugly-backend/scraper.js`

**Function**: `router.post('/all', verifyJWT, async (req, res) => {...})`

**Specific Changes**:

1. **Individual Page Try-Catch Wrapping**: Wrap each page scraping operation (profile, attendance, timetable) in individual try-catch blocks to isolate failures
   - Lines 202-215: Wrap profile scraping in try-catch, catch errors and set `scrapedData.profileData = null` with error flag
   - Lines 217-227: Wrap attendance/marks scraping in try-catch, catch errors and preserve profile data while setting attendance/marks to null
   - Lines 229-246: Wrap timetable scraping in try-catch, catch errors and preserve previously scraped sections

2. **Cached Data Fallback Logic**: After each scraping failure, attempt to retrieve cached data from database
   - Query `users` table for profile data (name, registration_no, programme_branch, school_department, section, semester)
   - Query `user_logs` table for attendance, marks, and timetable data (attendance_data, marks_data, timetable_html, timetable_json)
   - Merge cached data with successfully scraped sections, preferring fresh data when available

3. **Partial Data Structure Response**: Modify response structure to include error flags for each section
   ```javascript
   {
     profileData: { ...data } || null,
     attendanceData: { ...data } || null,
     marksData: { ...data } || null,
     timetableHTML: "..." || null,
     courseSlotMap: { ...data } || null,
     batch: "..." || null,
     errors: {
       profile: "Profile page unavailable (HTTP 404)" || null,
       attendance: "Attendance page unavailable (HTTP 401)" || null,
       marks: null,  // No error, data available
       timetable: "Timetable page timeout" || null
     }
   }
   ```

4. **Enhanced Progress Reporting**: Emit progress events for both successes and failures
   - `emitProgress(net_id, 'profile', 'Profile page unavailable - using cached data')`
   - `emitProgress(net_id, 'partial_success', 'Scraped 2/4 sections - some pages unavailable')`

5. **Don't Close Browser on Partial Success**: Only close the browser session after attempting all pages, not on first failure

**File**: `unfugly-backend/routes/v1/scrape.js`

**Similar Changes**: The `/v1/scrape/all` endpoint follows a similar pattern and needs identical changes for consistency

#### Frontend Changes

**File**: `webapp/src/app/dashboard/page.tsx`

**Specific Changes**:

1. **Enhanced Null Checking**: Add null-safe property access patterns
   - Line 71-79: Change from `if (cachedData.profileData)` to `if (cachedData?.profileData?.name)` to check nested properties
   - Before calling `setData(cachedData)`, validate that at least profile name exists

2. **Error State Management**: Add state to track unavailable sections
   ```typescript
   const [unavailableSections, setUnavailableSections] = useState<string[]>([]);
   ```

3. **Error Display Logic**: When receiving scraped data with errors object, update unavailable sections state and display toast notifications
   ```typescript
   if (scrapedData.errors && Object.keys(scrapedData.errors).length > 0) {
     setPartialErrors(scrapedData.errors);
     setShowErrorToast(true);
     setTimeout(() => setShowErrorToast(false), 6000);
   }
   ```

**File**: `webapp/src/components/TimetableView.tsx`

**Changes**:
1. **Null-Safe Property Access**: Lines 251-252 already use optional chaining (`profileData?.section`), verify similar patterns throughout
2. **"Page Unreachable" UI**: Add conditional rendering when timetable data is null

**File**: `webapp/src/components/AttendanceView.tsx` (if exists)

**Changes**:
1. **Null Data Handling**: Check if attendanceData is null before rendering table
2. **Empty State UI**: Display "Attendance data currently unavailable" message with icon when null

**File**: `webapp/src/components/MarksView.tsx` (if exists)

**Changes**:
1. **Null Data Handling**: Check if marksData is null before rendering table
2. **Empty State UI**: Display "Marks data currently unavailable" message when null

**File**: `extension/content.js`

**Similar Changes**: Lines 1008-1012 need null-safe checks before accessing profileData properties

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (exploratory testing), then verify the fix works correctly (fix checking) and preserves existing behavior (preservation testing).

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Mock Academia page responses to return 404/401 errors, run scraper against mocked responses, observe failures and null data propagation. Test frontend with null data inputs to trigger crashes. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Profile Page 404 Test**: Mock My_Time_Table_2023_24 to return 404, run scraper (will fail on unfixed code with exception or null profileData)
2. **Attendance Page 401 Test**: Mock My_Attendance to return 401, run scraper (will fail or return null attendanceData on unfixed code)
3. **Frontend Null Crash Test**: Pass `{ profileData: null }` to dashboard component, attempt to render (will crash on unfixed code at property access)
4. **No Cached Data Test**: Clear database cache, trigger scraping with all pages returning 404 (will result in completely unusable state on unfixed code)
5. **Partial Page Failure Test**: Mock profile available but attendance unavailable (may lose all data or crash on unfixed code)

**Expected Counterexamples**:
- Scraper throws unhandled exceptions when pages return 404/401
- Entire scraping operation fails even when some pages are available
- Frontend throws "Cannot read properties of null (reading 'name')" when profileData is null
- No fallback to cached data occurs when scraping fails
- User sees white screen or infinite loading when all pages are unavailable

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (Academia pages unavailable), the fixed system produces the expected graceful degradation behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := scraper_fixed(input)
  
  // Backend fix checks
  ASSERT result is not an exception
  ASSERT result contains partial data structure
  ASSERT result.errors object indicates which sections failed
  ASSERT successfully scraped sections contain valid data
  ASSERT failed sections are null with error messages
  IF cached data exists for failed section THEN
    ASSERT result contains cached data for that section
  END IF
  
  // Frontend fix checks
  ASSERT frontend_render(result) does not throw exception
  ASSERT frontend displays "Page unavailable" for null sections
  ASSERT frontend displays available data sections normally
END FOR
```

**Concrete Test Cases**:
1. **Profile Page Unavailable**: Mock 404, verify scraper returns `{ profileData: null, errors: { profile: "..." } }`, verify frontend displays "Profile page unavailable" message
2. **Attendance Page Unavailable with Cache**: Mock 401 for attendance, seed cached attendance in database, verify scraper returns cached attendance with error flag indicating stale data
3. **All Pages Unavailable**: Mock all pages returning 404, verify frontend renders empty state UI with "Academia services unavailable" message without crashing
4. **Partial Availability**: Mock profile available, attendance/marks unavailable, verify mixed response with some data and some nulls, verify frontend renders available sections and shows "unavailable" for others

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (all Academia pages available), the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  // Input: All pages return HTTP 200, valid DOM elements present
  ASSERT scraper_original(input) == scraper_fixed(input)
  ASSERT frontend_original(validData) == frontend_fixed(validData)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs
- It can test different combinations of valid data structures

**Test Plan**: 
1. Record behavior on UNFIXED code for successful scraping scenarios (all pages available)
2. Capture full response structure when scraping succeeds
3. Write property-based tests that generate valid profile, attendance, marks, and timetable data
4. Verify fixed code produces identical results for all generated valid inputs

**Test Cases**:
1. **Successful Profile Scraping Preservation**: Run scraper with valid profile page, verify profileData structure matches original implementation exactly (same field names, same extraction logic)
2. **Successful Attendance Scraping Preservation**: Run scraper with valid attendance page, verify attendanceData calculations (classesToSkip, classesToAttend) match original logic exactly
3. **Successful Marks Scraping Preservation**: Run scraper with valid marks page, verify marksData structure and component parsing matches original
4. **Frontend Display Preservation**: Pass valid complete data to frontend, verify rendering output (DOM structure, styling, displayed values) matches original exactly
5. **SSE Progress Events Preservation**: Run successful scraping, verify progress events emitted match original sequence and messages
6. **Database Caching Preservation**: Run successful scraping, verify data saved to database matches original format and fields

### Unit Tests

- **Backend Unit Tests**:
  - Test individual try-catch blocks around each page scraping operation
  - Test cached data retrieval function with various database states (data exists, data missing, database error)
  - Test partial data structure assembly with different combinations of null/valid sections
  - Test error message generation for different HTTP status codes and timeout scenarios
  
- **Frontend Unit Tests**:
  - Test null checks before property access with various null/undefined inputs
  - Test "Page Unavailable" component rendering with different error messages
  - Test empty state UI rendering when all data is null
  - Test mixed state rendering when some sections have data and others are null

### Property-Based Tests

- **Backend PBT**:
  - Generate random combinations of page availability (some pages 200, others 404/401)
  - Verify scraper always returns valid partial structure, never throws unhandled exceptions
  - Verify errors object correctly reflects which pages failed
  - Verify successfully scraped sections always have valid data structure

- **Frontend PBT**:
  - Generate random combinations of null/valid data for profileData, attendanceData, marksData
  - Verify frontend never crashes with "Cannot read properties of null" errors
  - Verify display logic correctly shows data when available and error messages when null
  - Verify optional chaining (`?.`) prevents crashes across all property access paths

- **Preservation PBT**:
  - Generate many valid complete data structures (all pages available scenario)
  - Run both original and fixed scraper logic (using feature flags or parallel test setup)
  - Assert responses are identical for all generated valid inputs
  - Generate many combinations of valid profile, attendance, marks, and timetable data
  - Verify frontend rendering output is identical for original and fixed code

### Integration Tests

- **End-to-End Scraping Flow**: 
  - Test full scraping flow with mocked Academia pages returning various status codes
  - Test user login → scraping → data display flow with pages unavailable
  - Test background scraping with partial failures and toast notification display

- **Database Caching Integration**:
  - Test scraping failure → cached data retrieval → frontend display flow
  - Test successful scraping → database upsert → localStorage sync flow unchanged

- **Multi-User Scenario Testing**:
  - Test new user (no cache) during off-semester (all pages unavailable)
  - Test existing user (has cache) with stale data and scraping failures
  - Test existing user with cache and successful scraping (verify fresh data preferred)
