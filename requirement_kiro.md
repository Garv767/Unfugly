# Requirements Document: Webapp Enhancements

## Introduction

This document specifies the requirements for transforming the Unfugly browser extension functionality into a full-featured webapp. The webapp will replicate all extension features while adding mobile responsiveness, addressing HttpOnly cookie authentication challenges, and implementing automated feedback submission as the unique selling point. The system must handle session management through a backend proxy that stores cookies in a database, scrape data from academia.srmist.edu.in, and provide pixel-perfect UI parity with the extension for desktop users while offering an optimized mobile experience.

## Glossary

- **Webapp**: The web application being developed to replicate extension functionality
- **Extension**: The existing browser extension that currently provides Unfugly features
- **Backend_Proxy**: The server-side component that proxies requests to academia.srmist.edu.in and manages session cookies
- **Academia_Portal**: The academia.srmist.edu.in website that provides student data
- **HttpOnly_Cookie**: A browser cookie with the HttpOnly flag set, inaccessible to client-side JavaScript
- **Session_Cookie**: Authentication credentials stored as cookies for academia.srmist.edu.in
- **Feedback_Filler**: Automated system for submitting feedback forms on Academia_Portal
- **Desktop_UI**: The user interface designed for desktop/laptop screen sizes
- **Mobile_UI**: The user interface optimized for mobile device screen sizes
- **Calendar_Component**: UI component displaying academic calendar and day order information
- **Timetable_JSON**: Parsed data structure representing student timetable with slots and courses
- **Course_Slot_Map**: Mapping between course codes, slot identifiers, and course details
- **Edited_Slots**: User-customized timetable entries stored in database
- **Day_Order**: Academic calendar system identifying which timetable day (1-5) applies to a date
- **Scraper**: Backend service that fetches data from Academia_Portal using stored Session_Cookies
- **Database**: PostgreSQL database storing user data, Session_Cookies, and Edited_Slots
- **Attendance_Predictor**: Feature calculating projected attendance based on date ranges
- **Profile_Data**: Student information including name, registration number, program, section, semester
- **Attendance_Data**: Array of courses with hours conducted, hours absent, and attendance percentage
- **Marks_Data**: Array of courses with component marks and total scores
- **Feedback_Submission_Count**: Integer counter tracking total feedback forms submitted by user

## Requirements

### Requirement 1: HttpOnly Cookie Authentication & Session Management

**User Story:** As a student, I want to authenticate with my Academia_Portal credentials through the webapp, so that I can access my academic data without manually handling cookies.

#### Acceptance Criteria

1. WHEN a student submits login credentials, THE Webapp SHALL send credentials to Backend_Proxy
2. THE Backend_Proxy SHALL authenticate with Academia_Portal and capture Session_Cookies
3. THE Backend_Proxy SHALL capture these Session_Cookies from Academia_Portal: JSESSIONID, iamcsr, zccpn, wms-tkp-token_client_10002227248, and tracking cookies
4. THE Backend_Proxy SHALL store Session_Cookies in Database associated with student's net ID
5. FOR Extension requests, THE Backend_Proxy SHALL verify session with Academia_Portal to ensure users can only fetch their own data
6. FOR Webapp requests, THE Backend_Proxy SHALL handle proxy login and manage the complete session lifecycle
7. THE Backend_Proxy SHALL store Session_Cookies for later reuse in subsequent requests
8. WHEN authentication succeeds, THE Webapp SHALL receive a JWT authentication token
9. THE Webapp SHALL store the JWT token in browser localStorage for subsequent requests
10. WHEN Session_Cookies expire, THE Webapp SHALL prompt the student to re-authenticate
11. THE Backend_Proxy SHALL act as proxy for all Academia_Portal requests using stored Session_Cookies
12. FOR ALL authenticated requests, THE Backend_Proxy SHALL validate JWT token before proxying

**Correctness Properties (Property-Based Testing):**

- **Round-trip authentication**: FOR ALL valid credentials submitted to Webapp, IF Backend_Proxy successfully authenticates AND stores Session_Cookies, THEN subsequent proxy request with JWT SHALL succeed
- **Session cookie persistence**: FOR ALL authenticated users, IF Session_Cookies are stored in Database, THEN retrieving Session_Cookies from Database SHALL return identical cookie values including JSESSIONID, iamcsr, zccpn, and wms-tkp-token_client_10002227248
- **Token validation invariant**: FOR ALL incoming requests to Backend_Proxy, IF JWT token is invalid OR expired, THEN Backend_Proxy SHALL reject request with 401 status
- **Authentication state consistency**: FOR ALL authentication attempts, IF Academia_Portal returns success AND Session_Cookies are captured, THEN Database SHALL contain Session_Cookies entry for that net ID
- **User data isolation**: FOR ALL Extension API requests, IF session is verified with Academia_Portal, THEN user SHALL only access their own data

### Requirement 2: Backend Proxy & Data Management

**User Story:** As a student, I want the webapp to automatically fetch and cache my academic data, so that I can view timetable, attendance, and marks without repeated manual actions.

#### Acceptance Criteria

1. THE Backend_Proxy SHALL store Session_Cookies in Database with net_id as primary key
2. WHEN Webapp requests data scraping, THE Backend_Proxy SHALL fetch Profile_Data from Academia_Portal
3. THE Backend_Proxy SHALL scrape Attendance_Data from Academia_Portal attendance endpoint
4. THE Backend_Proxy SHALL scrape Marks_Data from Academia_Portal marks endpoint
5. THE Backend_Proxy SHALL scrape timetable HTML from Academia_Portal unified timetable endpoint
6. THE Backend_Proxy SHALL parse timetable HTML into Timetable_JSON structure
7. THE Backend_Proxy SHALL scrape course registration data to build Course_Slot_Map
8. THE Backend_Proxy SHALL store all scraped data in Database associated with student's net ID
9. WHEN Webapp requests user data, THE Backend_Proxy SHALL first check Database for cached data
10. IF cached data exists AND was updated within 1 hour, THE Backend_Proxy SHALL return cached data without scraping
11. THE Backend_Proxy SHALL fetch Edited_Slots from Database and merge with timetable data
12. THE Backend_Proxy SHALL provide Server-Sent Events endpoint for scraping progress updates
13. WHEN scraping completes, THE Backend_Proxy SHALL update last_updated_ist timestamp in Database
14. IF scraping fails due to expired Session_Cookies, THE Backend_Proxy SHALL return authentication error
15. THE Backend_Proxy SHALL scrape Academic Calendar data and store in Database

**Correctness Properties (Property-Based Testing):**

- **Data persistence invariant**: FOR ALL scraped datasets stored in Database, retrieving data for the same net_id SHALL return identical dataset until next update
- **Cache freshness property**: FOR ALL cached data requests, IF last_updated_ist timestamp is within 1 hour, THEN Backend_Proxy SHALL return cached data without Academia_Portal request
- **Scrape-store-retrieve round-trip**: FOR ALL successful scraping operations, IF data is stored in Database, THEN immediate retrieval SHALL return the scraped data
- **Edited slots merge correctness**: FOR ALL timetable requests, IF Edited_Slots exist in Database for net_id, THEN returned timetable data SHALL contain merged Edited_Slots
- **Progress event completeness**: FOR ALL scraping operations, IF scraping starts, THEN Server-Sent Events SHALL emit progress messages AND final completion/error event

### Requirement 3: Desktop UI Rendering Parity

**User Story:** As a desktop user, I want the webapp UI to match the extension UI exactly, so that I have a familiar and consistent experience.

#### Acceptance Criteria

1. THE Desktop_UI SHALL render timetable using identical table structure as Extension
2. THE Desktop_UI SHALL use identical color scheme for timetable slots as Extension (#F1948A headers, #F8C471 day labels)
3. THE Desktop_UI SHALL display course titles and room numbers in same format as Extension
4. THE Desktop_UI SHALL highlight current day order with identical opacity and grayscale filter as Extension
5. THE Desktop_UI SHALL render Edited_Slots with #FBC02D background color matching Extension
6. THE Desktop_UI SHALL show three-button control group (Hide/Show/Modify) with identical styling as Extension
7. THE Desktop_UI SHALL implement edit mode with click-to-edit slot behavior matching Extension
8. THE Desktop_UI SHALL show remove edit button (×) on edited slots matching Extension styling
9. THE Desktop_UI SHALL render attendance cards with identical layout and color coding as Extension
10. THE Desktop_UI SHALL display marks section with course cards matching Extension styling
11. THE Desktop_UI SHALL show grade prediction table tooltip matching Extension implementation
12. THE Desktop_UI SHALL render profile sidebar with identical information display as Extension
13. THE Desktop_UI SHALL implement timetable download with identical png generation as Extension
14. WHEN comparing Desktop_UI screenshot to Extension screenshot at same viewport size, THE layouts SHALL be pixel-identical for timetable section

**Correctness Properties (Property-Based Testing):**

- **Color consistency property**: FOR ALL UI elements with specified colors in Extension, THE Desktop_UI SHALL use identical hex color values
- **Edit state invariant**: FOR ALL slot edit operations, IF slot is edited in modify mode, THEN slot background SHALL be #FBC02D AND edit SHALL persist to Database
- **Day order highlighting property**: FOR ALL dates with valid Day_Order, IF date is current date, THEN timetable row for that Day_Order SHALL have opacity 1 AND other rows SHALL have opacity 0.65
- **Download image consistency**: FOR ALL timetable download operations, THE generated PNG SHALL contain all visible timetable cells with correct background colors

### Requirement 4: Mobile Responsiveness

**User Story:** As a mobile user, I want the webapp to provide an optimized mobile interface, so that I can easily view my timetable, attendance, and marks on my phone.

#### Acceptance Criteria

1. WHEN viewport width is less than 1024px, THE Webapp SHALL display Mobile_UI instead of Desktop_UI
2. THE Mobile_UI SHALL show bottom navigation bar with tabs: Timetable, Attendance, Marks, Calendar
3. THE Mobile_UI SHALL display one tab content at a time based on active selection
4. THE Mobile_UI SHALL render timetable as day-by-day card view instead of full week table
5. THE Mobile_UI SHALL show day order navigation with left/right arrow buttons
6. THE Mobile_UI SHALL default to current Day_Order based on today's date and Calendar_Component data
7. THE Mobile_UI SHALL display each timetable slot as a card with course title, time, slot ID, and room
8. THE Mobile_UI SHALL use 4px left border on slot cards to indicate course type color
9. THE Mobile_UI SHALL show top navigation bar with SRM Unfuglied branding and hamburger menu
10. THE Mobile_UI SHALL display profile information in hamburger menu dropdown
11. THE Mobile_UI SHALL render attendance cards in single column grid layout
12. THE Mobile_UI SHALL display marks cards in vertical stack with expandable tooltips
13. THE Mobile_UI SHALL support touch gestures for day order navigation (swipe left/right)
14. THE Mobile_UI SHALL scale all touch targets to minimum 44px for accessibility
15. THE Mobile_UI SHALL implement edit mode for timetable slots on mobile with touch-friendly interface

**Correctness Properties (Property-Based Testing):**

- **Responsive breakpoint property**: FOR ALL viewport widths, IF width < 1024px THEN Mobile_UI SHALL display, ELSE Desktop_UI SHALL display
- **Tab navigation invariant**: FOR ALL tab selections on Mobile_UI, ONLY the content for active tab SHALL be visible
- **Day order synchronization**: FOR ALL date changes, IF Calendar_Component provides Day_Order for current date, THEN Mobile_UI SHALL display that Day_Order by default
- **Slot card completeness**: FOR ALL timetable slots in Timetable_JSON for selected day order, THE Mobile_UI SHALL render a corresponding card with all slot data
- **Touch target size property**: FOR ALL interactive elements on Mobile_UI, THE touch target area SHALL be minimum 44px × 44px

### Requirement 5: Feedback Filler for Webapp (USP Feature)

**User Story:** As a student, I want the webapp to automatically fill and submit my course feedback forms, so that I can complete mandatory feedback requirements without manual repetition.

#### Acceptance Criteria

1. THE Webapp SHALL provide Feedback_Filler feature accessible from dashboard
2. THE Feedback_Filler SHALL directly open the current feedback form from Academia_Portal
3. THE Feedback_Filler SHALL display all subjects requiring feedback with 1-5 rating scale
4. THE Feedback_Filler SHALL handle 15 rating sections with 5-level rating per subject
5. THE Feedback_Filler SHALL provide "same for all subjects" toggle for comments
6. WHEN toggle is enabled, THE Feedback_Filler SHALL display single comment input for all subjects
7. WHEN toggle is disabled, THE Feedback_Filler SHALL show individual comment boxes per subject with subject name
8. WHEN student initiates feedback automation, THE Feedback_Filler SHALL prompt for feedback preferences (ratings, comments)
9. THE Feedback_Filler SHALL support predefined feedback templates (Excellent, Good, Average)
10. THE Feedback_Filler SHALL allow custom feedback text for individual courses
11. THE Backend_Proxy SHALL navigate to feedback form pages using stored Session_Cookies
12. THE Backend_Proxy SHALL parse feedback form structure to identify input fields and radio buttons
13. THE Backend_Proxy SHALL fill feedback form fields with student's specified ratings and comments
14. THE Backend_Proxy SHALL submit filled feedback form to Academia_Portal
15. THE Feedback_Filler SHALL verify submission success by checking confirmation page or response
16. THE Feedback_Filler SHALL display submission progress with per-course status updates
17. WHEN all feedback forms are submitted, THE Feedback_Filler SHALL display summary with success/failure counts
18. THE Backend_Proxy SHALL store only the count of feedback submissions per user for analytics
19. THE Backend_Proxy SHALL increment Feedback_Submission_Count in Database after each successful submission
20. IF feedback submission fails, THE Feedback_Filler SHALL log error details and allow retry
21. THE Feedback_Filler SHALL implement rate limiting to avoid overwhelming Academia_Portal (max 1 submission per 5 seconds)

**Correctness Properties (Property-Based Testing):**

- **Form field population completeness**: FOR ALL feedback forms with N input fields, IF Feedback_Filler processes form, THEN ALL N fields SHALL be populated with valid data
- **Submission count invariant**: FOR ALL successful feedback submissions, THE Feedback_Submission_Count in Database SHALL increment by exactly 1
- **Comment toggle consistency**: FOR ALL subjects, IF "same for all subjects" toggle is enabled, THEN all subjects SHALL receive identical comment text
- **Rating sections completeness**: FOR ALL feedback forms, THE Feedback_Filler SHALL populate all 15 rating sections with 5-level ratings
- **Rate limiting invariant**: FOR ALL consecutive feedback submissions, THE time interval between submissions SHALL be >= 5 seconds
- **Error recovery property**: FOR ALL failed submissions, IF failure is due to temporary error (timeout, 5xx), THEN retry SHALL succeed OR return permanent error

### Requirement 6: Calendar UI Reliability

**User Story:** As a student, I want the calendar UI to reliably display day orders and academic events, so that I can plan my schedule accurately.

#### Acceptance Criteria

1. THE Calendar_Component SHALL fetch calendar data from Backend_Proxy on page load
2. THE Calendar_Component SHALL display academic calendar in month view format
3. THE Calendar_Component SHALL show day order number for each academic day
4. THE Calendar_Component SHALL highlight current date with distinct visual styling
5. THE Calendar_Component SHALL display holidays and exam dates with color coding
6. THE Calendar_Component SHALL support navigation between months (previous/next arrows)
7. THE Calendar_Component SHALL display day order legend explaining numbering system
8. WHEN calendar data is missing for a month, THE Calendar_Component SHALL display "No data available" message
9. THE Calendar_Component SHALL update displayed day order when user navigates to different dates
10. THE Calendar_Component SHALL integrate with Attendance_Predictor to provide date selection
11. THE Calendar_Component SHALL cache calendar data in browser localStorage for offline access
12. THE Calendar_Component SHALL refresh calendar data from Backend_Proxy every 24 hours
13. THE Calendar_Component SHALL handle missing day order data gracefully (display "-" for non-academic days)
14. THE Calendar_Component SHALL provide tooltip on hover showing full date details and events
15. THE Calendar_Component SHALL ensure day order calculations match Extension implementation exactly

**Correctness Properties (Property-Based Testing):**

- **Day order lookup consistency**: FOR ALL dates in calendar data, IF getDayOrderForDate(date, calendarData) is called, THEN result SHALL match Academia_Portal's day order for that date
- **Date navigation invariant**: FOR ALL month navigation operations, IF user navigates from Month M to Month M+1 and back to Month M, THEN displayed calendar SHALL be identical to original Month M view
- **Current date highlighting property**: FOR ALL calendar renders, IF current system date is within displayed month, THEN current date cell SHALL have distinct highlight styling
- **Cache freshness property**: FOR ALL calendar data caches, IF cached data timestamp is > 24 hours old, THEN Calendar_Component SHALL fetch fresh data from Backend_Proxy
- **Tooltip data completeness**: FOR ALL calendar date cells with day order data, hovering SHALL display tooltip containing date, day order, and any associated events
