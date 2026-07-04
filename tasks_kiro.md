# Implementation Plan: Webapp Enhancements

## Overview

This implementation plan transforms the Unfugly browser extension into a full-featured webapp with mobile responsiveness and automated feedback submission. The plan is optimized for same-day completion by 11:45 PM, prioritizing the Feedback Filler (USP feature) and core functionality over polish.

**Technology Stack:**
- Frontend: Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS
- Backend: Node.js with Express.js, Playwright (Chromium), JWT
- Database: Supabase (PostgreSQL)

**Priority Order:**
1. **CRITICAL (Feedback Filler USP)**: Requirements 1, 2, 5
2. **HIGH (Core Functionality)**: Requirements 3, 6
3. **MEDIUM (Enhancement)**: Requirement 4

## Tasks

### Phase 1: Foundation & Authentication (Requirements 1, 2)

- [ ] 1. Set up project structure and database
  - Initialize Next.js 14 project with TypeScript and Tailwind CSS
  - Set up Express.js backend API server
  - Install dependencies: Playwright, JWT, Supabase client
  - Create database schema: `users`, `user_logs`, `academic_calendar` tables
  - Configure environment variables for JWT secret and Supabase credentials
  - _Requirements: 1.1, 1.2, 2.1_

- [ ] 2. Implement backend authentication with Playwright
  - [ ] 2.1 Create POST `/api/v1/auth/login` endpoint
    - Initialize Playwright browser context with Chromium
    - Navigate to academia.srmist.edu.in login page
    - Fill credentials in Zoho iframe and submit
    - Handle CAPTCHA detection and return 403 error
    - Extract session cookies: JSESSIONID, iamcsr, zccpn, wms-tkp-token_client_10002227248
    - Store cookies in `user_logs.academia_cookies` as JSONB array
    - Generate JWT token with 7-day expiration
    - Return token and net_id to client
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.8_
  
  - [ ] 2.2 Create JWT authentication middleware
    - Implement JWT verification middleware for protected routes
    - Extract net_id from JWT claims
    - Return 401 for invalid/expired tokens
    - _Requirements: 1.12_
  
  - [ ] 2.3 Create POST `/api/v1/auth/logout` endpoint
    - Close browser context and invalidate session
    - _Requirements: 1.10_

- [ ] 3. Implement backend data scraping service
  - [ ] 3.1 Create POST `/api/v1/scrape/all` endpoint
    - Fetch stored cookies from `user_logs` table
    - Restore Playwright browser context with cookies
    - Navigate to My_Time_Table_2023_24 page
    - Scrape profile data (name, registration number, program, section, semester)
    - Scrape course registration data to build CourseSlotMap
    - _Requirements: 2.2, 2.7_
  
  - [ ] 3.2 Add attendance and marks scraping
    - Navigate to My_Attendance page
    - Extract attendance data: course code, hours conducted, hours present, percentage
    - Extract marks data: course code, component marks, total marks
    - _Requirements: 2.3, 2.4_
  
  - [ ] 3.3 Add timetable scraping and parsing
    - Navigate to Unified_Time_Table_2025 page
    - Extract timetable HTML
    - Parse HTML table into TimetableJSON structure
    - Map slots to courses, classrooms, and colors
    - _Requirements: 2.5, 2.6_
  
  - [ ] 3.4 Implement data persistence
    - Store all scraped data in `user_logs` table
    - Set `last_synced_ist` timestamp
    - Create or update entry in `users` table
    - _Requirements: 2.8_
  
  - [ ] 3.5 Add Server-Sent Events for progress tracking
    - Create GET `/api/v1/scrape/progress/:net_id` SSE endpoint
    - Emit progress events: "Fetching profile...", "Fetching attendance...", "Generating timetable...", "Complete"
    - Handle errors and emit error events
    - _Requirements: 2.12_

- [ ] 4. Implement caching and user data endpoints
  - [ ] 4.1 Create GET `/api/v1/user/data` endpoint with caching
    - Check `last_synced_ist` timestamp in database
    - Return cached data if timestamp is within 1 hour
    - Otherwise trigger fresh scrape
    - Merge `edited_slots` from database with timetable data
    - _Requirements: 2.9, 2.10, 2.11_
  
  - [ ] 4.2 Create PUT `/api/v1/user/slots` endpoint
    - Accept `edited_slots_json` in request body
    - Update `user_logs.edited_slots` for authenticated user
    - _Requirements: 3.7_

- [ ] 5. Checkpoint - Backend authentication and scraping complete
  - Test login flow with valid credentials
  - Verify cookies are stored correctly in database
  - Test scraping flow and confirm all data sections are extracted
  - Test SSE progress events
  - Ensure all tests pass, ask the user if questions arise

### Phase 2: USP Feature - Feedback Filler (Requirement 5) 🔥 CRITICAL

- [ ] 6. Implement feedback submission backend
  - [ ] 6.1 Create POST `/api/v1/feedback/submit` endpoint
    - Accept course_code, ratings array (15 ratings, 1-5 scale), and comment
    - Fetch stored cookies from database
    - Use Playwright to navigate to Academia feedback form
    - Parse feedback form HTML to identify input fields and radio buttons
    - Fill all 15 rating sections with provided ratings
    - Fill comment field with provided text
    - Submit form and verify success via confirmation page
    - Return success status
    - _Requirements: 5.11, 5.12, 5.13, 5.14, 5.15_
  
  - [ ] 6.2 Implement batch feedback submission
    - Create POST `/api/v1/feedback/batch` endpoint
    - Accept array of submissions with course_code, ratings, and comment
    - Implement rate limiting: 5-second delay between submissions
    - Track success/failure for each submission
    - Increment `user_logs.feedback_count` on each success
    - Return results array with per-course status
    - _Requirements: 5.19, 5.21_
  
  - [ ] 6.3 Add feedback count tracking
    - Create GET `/api/v1/feedback/count` endpoint
    - Return total feedback submissions from `user_logs.feedback_count`
    - _Requirements: 5.18, 5.19_

- [ ] 7. Create FeedbackFiller frontend component
  - [ ] 7.1 Build feedback preferences UI
    - Create modal/dialog component for feedback filler
    - Display list of all courses from CourseSlotMap
    - Add 1-5 rating scale inputs for each of 15 sections per course
    - Show subject name for each course
    - _Requirements: 5.1, 5.3, 5.4_
  
  - [ ] 7.2 Add comment input with toggle
    - Implement "same comment for all subjects" toggle
    - When enabled, show single comment input box
    - When disabled, show individual comment boxes per subject with subject names
    - _Requirements: 5.5, 5.6, 5.7_
  
  - [ ] 7.3 Implement predefined templates
    - Add template selector: Excellent (all 5s), Good (all 4s), Average (all 3s)
    - Apply selected template ratings to all courses
    - Allow custom ratings to override template
    - _Requirements: 5.9, 5.10_
  
  - [ ] 7.4 Add submission flow
    - Implement "Submit All Feedback" button
    - Call POST `/api/v1/feedback/batch` with all course preferences
    - Display progress bar showing X/Y courses submitted
    - Show per-course submission status: pending, submitting, success, error
    - Display final summary: total submitted, success count, failure count
    - Show error messages for failed submissions with retry option
    - _Requirements: 5.8, 5.16, 5.17, 5.20_

- [ ] 8. Checkpoint - Feedback Filler complete
  - Test feedback form navigation and parsing
  - Verify all 15 rating sections are filled correctly
  - Test batch submission with multiple courses
  - Verify rate limiting (5-second delay between submissions)
  - Confirm feedback_count increments in database
  - Test error handling and retry logic
  - Ensure all tests pass, ask the user if questions arise

### Phase 3: Frontend Core - Login & Dashboard (Requirements 1, 2, 3)

- [ ] 9. Create login page
  - [ ] 9.1 Build login UI component
    - Create `/login/page.tsx` with credential form
    - Add username and password input fields
    - Implement client-side validation for empty fields
    - Add loading state during authentication
    - Display error messages for invalid credentials or CAPTCHA required
    - _Requirements: 1.1, 1.10_
  
  - [ ] 9.2 Implement login flow
    - Call POST `/api/v1/auth/login` on form submit
    - Store JWT token in localStorage on success
    - Redirect to dashboard on successful login
    - _Requirements: 1.8, 1.9_

- [ ] 10. Create dashboard page
  - [ ] 10.1 Build dashboard layout
    - Create `/dashboard/page.tsx` with main layout
    - Add top navigation bar with logo and logout button
    - Implement logout handler: clear localStorage and redirect to login
    - Fetch JWT token from localStorage on mount
    - Redirect to login if no token present
    - _Requirements: 1.9_
  
  - [ ] 10.2 Implement initial data loading
    - Call GET `/api/v1/user/data` on dashboard mount
    - Display loading spinner during data fetch
    - Handle 401 errors: clear localStorage and redirect to login
    - Store fetched data in React state
    - _Requirements: 2.9, 2.10_
  
  - [ ] 10.3 Add scraping trigger and progress
    - Add "Refresh Data" button to trigger POST `/api/v1/scrape/all`
    - Connect to SSE endpoint `/api/v1/scrape/progress/:net_id`
    - Display progress messages in UI banner
    - Update dashboard with fresh data when scraping completes
    - _Requirements: 2.12, 2.13_

- [ ] 11. Implement desktop timetable view
  - [ ] 11.1 Create TimetableView component foundation
    - Create `/components/TimetableView.tsx` component
    - Accept props: htmlContent, courseData, netId, calendarData, timetableJSON, dbEditedSlots
    - Parse timetable HTML into JSON structure if not provided
    - Implement day order highlighting based on current date
    - _Requirements: 3.1, 3.4_
  
  - [ ] 11.2 Render desktop table layout
    - Render full week timetable table with days as rows
    - Use identical color scheme: #F1948A for headers, #F8C471 for day labels
    - Display course titles and room numbers in each slot
    - Apply edited slot styling: #FBC02D background for user edits
    - Highlight current day order: opacity 1 for current, 0.65 for others
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 11.3 Add three-button control group
    - Create Hide/Show/Modify button group
    - Implement hide state: collapse timetable, only show buttons
    - Implement show state: display timetable in read-only mode
    - Implement modify state: enable click-to-edit on slots
    - _Requirements: 3.6_
  
  - [ ] 11.4 Implement slot editing
    - Add click handlers to slots in modify mode
    - Show prompt for course title and room number on slot click
    - Update slot display with edited values
    - Call PUT `/api/v1/user/slots` to persist changes
    - Add remove edit button (×) on edited slots
    - Implement remove handler: restore original values and update database
    - _Requirements: 3.7, 3.8_
  
  - [ ] 11.5 Add timetable download
    - Install html2canvas library
    - Implement download button
    - Generate PNG from timetable table element
    - Trigger browser download with generated image
    - _Requirements: 3.13_

- [ ] 12. Build attendance and marks sections
  - [ ] 12.1 Create attendance cards component
    - Render attendance data as card grid
    - Display course code, title, percentage, hours conducted, hours absent
    - Apply color coding: red for <75%, yellow for 75-85%, green for >85%
    - Match extension card layout and styling
    - _Requirements: 3.9_
  
  - [ ] 12.2 Create marks cards component
    - Render marks data as card grid
    - Display course code, type, component breakdown
    - Show total obtained marks and max marks
    - Match extension card styling
    - _Requirements: 3.10_
  
  - [ ] 12.3 Add grade prediction tooltip
    - Create tooltip component with grade prediction table
    - Calculate predicted grade based on current marks
    - Show on hover over marks cards
    - Match extension tooltip styling
    - _Requirements: 3.11_

- [ ] 13. Add profile sidebar
  - Create profile section in dashboard
  - Display student name, registration number, program, section, semester
  - Show profile photo using GET `/api/v1/user/photo` proxy
  - Match extension profile layout
  - _Requirements: 3.12_

- [ ] 14. Checkpoint - Desktop UI complete
  - Compare desktop UI screenshot to extension at 1920x1080
  - Verify timetable table layout is pixel-identical
  - Test edit functionality and database persistence
  - Test timetable download PNG generation
  - Verify attendance and marks cards match extension styling
  - Ensure all tests pass, ask the user if questions arise

### Phase 4: Calendar Integration (Requirement 6)

- [ ] 15. Implement calendar backend
  - [ ] 15.1 Create GET `/api/v1/calendar` endpoint
    - Fetch calendar data from `academic_calendar` table
    - Return calendar JSON with day orders and events
    - _Requirements: 6.1_
  
  - [ ] 15.2 Seed calendar data
    - Scrape or manually populate calendar data from Academia
    - Insert into `academic_calendar` table
    - Ensure day order mappings are accurate
    - _Requirements: 6.15_

- [ ] 16. Create calendar component
  - [ ] 16.1 Build calendar month view
    - Create `/calendar/page.tsx` with calendar layout
    - Render current month grid with dates
    - Display day order number for each academic day
    - Show "-" for non-academic days
    - _Requirements: 6.2, 6.3, 6.13_
  
  - [ ] 16.2 Add calendar navigation
    - Implement previous/next month arrow buttons
    - Update calendar grid when navigating
    - _Requirements: 6.6_
  
  - [ ] 16.3 Add date highlighting and tooltips
    - Highlight current date with distinct styling
    - Add hover tooltip showing date, day order, and events
    - _Requirements: 6.4, 6.5, 6.14_
  
  - [ ] 16.4 Implement calendar caching
    - Store calendar data in localStorage
    - Check cache age on mount
    - Refresh from API if cache is >24 hours old
    - Enable offline access with cached data
    - _Requirements: 6.11, 6.12_

- [ ] 17. Integrate calendar with timetable
  - Implement `getDayOrderForDate()` function
  - Use calendar data to determine current day order
  - Pass day order to TimetableView for highlighting
  - Verify day order calculations match Academia exactly
  - _Requirements: 6.9, 6.15_

- [ ] 18. Create AttendancePredict component
  - [ ] 18.1 Build date range selector
    - Create modal with from/to date pickers
    - Integrate with calendar for date selection
    - _Requirements: 6.10_
  
  - [ ] 18.2 Implement attendance projection
    - Calculate course occurrences between date range using calendar day orders
    - Compute projected attendance percentage for each course
    - Display projected values alongside current values
    - _Requirements: 6.10_

- [ ] 19. Checkpoint - Calendar integration complete
  - Verify calendar displays accurate day orders
  - Test month navigation and date highlighting
  - Confirm timetable highlights correct current day
  - Test attendance predictor calculations
  - Ensure calendar works offline with cache
  - Ensure all tests pass, ask the user if questions arise

### Phase 5: Mobile Responsiveness (Requirement 4) - Optional for MVP

- [ ] 20. Implement mobile layout foundation
  - [ ] 20.1 Add responsive breakpoint detection
    - Implement viewport width detection hook
    - Switch between desktop/mobile layouts at 1024px breakpoint
    - _Requirements: 4.1_
  
  - [ ] 20.2 Create bottom navigation bar
    - Add fixed bottom navigation with 4 tabs: Timetable, Attendance, Marks, Calendar
    - Implement tab switching to show/hide content sections
    - Style navigation bar for mobile
    - _Requirements: 4.2, 4.3_
  
  - [ ] 20.3 Add top mobile navigation
    - Create top navigation bar with logo and hamburger menu
    - Implement hamburger menu dropdown with profile information
    - _Requirements: 4.9, 4.10_

- [ ] 21. Create mobile timetable view
  - [ ] 21.1 Implement day-by-day card layout
    - Render timetable as single day view instead of full week table
    - Display each slot as a card with course title, time, slot ID, and room
    - Add 4px left border on cards for course type color
    - Default to current day order based on calendar
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 4.8_
  
  - [ ] 21.2 Add day navigation
    - Implement left/right arrow buttons for day order navigation
    - Add swipe gesture support for day switching
    - _Requirements: 4.5, 4.13_
  
  - [ ] 21.3 Implement mobile edit mode
    - Make slot cards tappable in edit mode
    - Show modal for editing course title and room
    - Ensure touch targets are minimum 44px
    - _Requirements: 4.14, 4.15_

- [ ] 22. Optimize mobile layouts for other sections
  - Render attendance cards in single column grid
  - Stack marks cards vertically with expandable details
  - Ensure all interactive elements meet 44px touch target minimum
  - _Requirements: 4.11, 4.12, 4.14_

- [ ] 23. Final checkpoint - Mobile responsiveness complete
  - Test on mobile viewports: 375px (iPhone SE), 390px (iPhone 14), 768px (iPad)
  - Verify bottom navigation switches tabs correctly
  - Test day order navigation with arrows and swipes
  - Confirm all touch targets meet 44px minimum
  - Ensure all tests pass, ask the user if questions arise

### Phase 6: Testing & Deployment

- [ ] 24. Testing and error handling
  - [ ] 24.1 Write unit tests for backend endpoints
    - Test authentication flow with valid/invalid credentials
    - Test scraping service with mock Playwright responses
    - Test JWT middleware validation
    - _Requirements: All_
  
  - [ ] 24.2 Write integration tests for data flow
    - Test end-to-end login → scrape → persist → fetch flow
    - Test cache hit/miss scenarios
    - Test SSE progress events
    - _Requirements: 1, 2_
  
  - [ ] 24.3 Write frontend component tests
    - Test login form submission and error handling
    - Test timetable rendering and edit functionality
    - Test feedback filler UI interactions
    - _Requirements: 3, 5_
  
  - [ ] 24.4 Add comprehensive error handling
    - Implement error boundaries in React components
    - Add fallback UI for failed data loads
    - Add retry logic for network failures
    - Display user-friendly error messages
    - _Requirements: All_

- [ ] 25. Deployment preparation
  - [ ] 25.1 Configure production environment
    - Set up Vercel project for Next.js frontend
    - Set up Railway/Render for Express backend with Playwright
    - Configure environment variables for production
    - Set up Supabase connection pooling
    - _Requirements: All_
  
  - [ ] 25.2 Optimize performance
    - Run Lighthouse audit and fix performance issues
    - Optimize bundle size with code splitting
    - Add lazy loading for heavy components
    - Compress images and assets
    - _Requirements: All_
  
  - [ ] 25.3 Deploy to production
    - Deploy frontend to Vercel
    - Deploy backend to Railway/Render with Docker
    - Verify health checks pass
    - Test production deployment end-to-end
    - _Requirements: All_

- [ ] 26. Final verification
  - Test complete user journey: login → dashboard → timetable edit → feedback submission
  - Verify Feedback Filler (USP) works flawlessly
  - Confirm desktop UI matches extension pixel-perfectly
  - Test calendar integration and day order accuracy
  - Ensure all critical features work by 11:45 PM deadline

## Notes

- **Tasks marked with `*` are optional** for MVP and can be skipped for faster delivery
- **Priority 1 (Tasks 1-8)**: Authentication, scraping, and Feedback Filler MUST be completed first as the USP feature
- **Priority 2 (Tasks 9-19)**: Desktop UI and calendar integration for core functionality
- **Priority 3 (Tasks 20-23)**: Mobile responsiveness can be deferred if time is tight
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and user alignment
- All database operations use parameterized queries to prevent SQL injection
- JWT tokens expire after 7 days, requiring re-authentication
- Browser contexts automatically close after scraping to prevent memory leaks
- Rate limiting on feedback submission prevents overwhelming Academia portal
- SSE provides real-time progress updates during long-running scraping operations

## Timeline Estimate (Same-Day Completion)

- **Phase 1** (Tasks 1-5): 3-4 hours - Foundation critical for everything else
- **Phase 2** (Tasks 6-8): 2-3 hours - USP feature, highest priority
- **Phase 3** (Tasks 9-14): 3-4 hours - Core UI functionality
- **Phase 4** (Tasks 15-19): 2 hours - Calendar integration
- **Phase 5** (Tasks 20-23): 2-3 hours - Mobile (defer if needed)
- **Phase 6** (Tasks 24-26): 1-2 hours - Deployment and final testing

**Total: 13-18 hours** (realistic for same-day completion with focus on MVP)