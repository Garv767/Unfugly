# Unfugly Webapp

**A premium Next.js dashboard providing cross-device access to SRM academic data.**

Built with Next.js (using the App Router) and styled with TailwindCSS, this webapp connects to the Unfugly backend to fetch cached profile, attendance, marks, and timetable data.

---

## ⚡ Key Features

*   **Premium Dark Mode UI**: Rich glassmorphism aesthetics and micro-animations.
*   **Persistent Caching**: Uses a self-cleaning `localStorage` strategy to display cached data immediately before updating from the database.
*   **Timetable Interface**: Displays the 5-day grid dynamically, enabling custom slot editing synced to the database.
*   **Attendance & Marks Predictive Analytics**: Embedded prediction calculators for planning margins.

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file inside the `webapp/` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to inspect.

### 4. Build for Production
```bash
npm run build
```
