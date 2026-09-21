# Bugfix Requirements Document

## Introduction

The webapp crashes when Academia portal pages (My_attendance, course registration) become unavailable after semester ends. The backend scraper returns null data for unavailable pages, and the frontend crashes when attempting to access properties like `profileData.name` on null values. This affects new users who cannot use the webapp at all during these periods.

This bugfix implements graceful degradation: the system should handle HTTP 401/404 errors from Academia, attempt to use cached data, return partial data with unavailable sections marked as null, and display "Page unreachable" messages in the UI rather than crashing.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN Academia pages return HTTP 404 or 401 errors THEN the backend scraper sets `profileData` to null

1.2 WHEN the backend returns null profileData THEN the frontend crashes with "Cannot read properties of null (reading 'profileData')" at line `if (cachedData.profileData)` and when rendering profile information

1.3 WHEN the scraping fails and no cached data exists THEN new users cannot access the webapp at all

1.4 WHEN partial scraping failures occur (some pages available, others not) THEN the entire scraping operation may fail without preserving available data

### Expected Behavior (Correct)

2.1 WHEN Academia pages return HTTP 404 or 401 errors THEN the backend SHALL attempt to retrieve cached data from the database

2.2 WHEN cached data exists but fresh scraping fails THEN the backend SHALL return the cached data with a flag indicating which sections are unavailable

2.3 WHEN no cached data exists and scraping fails THEN the backend SHALL return a partial data structure with null values for unavailable sections and error messages

2.4 WHEN the frontend receives null or undefined profileData THEN the frontend SHALL check for null before accessing nested properties and display appropriate error messages

2.5 WHEN some Academia pages are available and others are not THEN the backend SHALL return successfully scraped data for available pages and null with error messages for unavailable pages

2.6 WHEN the frontend displays unavailable sections THEN the frontend SHALL show "Page unreachable" messages instead of attempting to render null data

### Unchanged Behavior (Regression Prevention)

3.1 WHEN all Academia pages are available and scraping succeeds THEN the system SHALL CONTINUE TO scrape, cache, and display all data correctly

3.2 WHEN cached data exists and fresh scraping succeeds THEN the system SHALL CONTINUE TO merge fresh data with cached data, preferring fresh data

3.3 WHEN the user has valid authentication cookies THEN the system SHALL CONTINUE TO attempt scraping before falling back to cached data

3.4 WHEN profile data is available THEN the frontend SHALL CONTINUE TO display profile information, timetable, attendance, and marks as before

3.5 WHEN the scraping process reports progress THEN the system SHALL CONTINUE TO emit progress events via Server-Sent Events (SSE)
