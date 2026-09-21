# Unfugly Chrome Extension

**Revamp your SRM Academia with a unified dashboard and auto-customizable timetable.**

The Unfugly Chrome Extension injects directly into the SRM Academia page to provide a redesigned UI, collect course registrations, automate faculty feedback, and synchronize your data to the cloud.

---

## 🎯 Features

*   **Redesigned UI**: Replaces the clunky default SRM interface with a modern dashboard.
*   **Feedback Fastrack**: Click a single button to auto-fill and submit the entire semester's faculty feedback instantly.
*   **Timetable Customization**: Click on unallocated slots in the timetable to add custom tasks or titles.
*   **Download & Share**: Export your personalized timetable grid as an image.

---

## 📂 Extension Structure

*   `content.js`: Main DOM scraping, UI injection, and page logic.
*   `editTimetable.js`: Interactive edit capabilities for the timetable grid.
*   `analytics.js`: Coordinates background data syncing with the Unfugly backend.
*   `background.js`: Chrome extension service worker for cookie capturing and network proxies.
*   `predict.js`: Interactive attendance and marks margin predictors.

---

## 🚀 Installation & Development

1.  Open Google Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** (top right toggle).
3.  Click **Load unpacked** (top left button).
4.  Select the `extension/` directory of this project.
5.  Navigate to [SRM Academia](https://academia.srmist.edu.in/) to test!
