# Workspace Customization Rules (AGENTS.md)

This workspace contains code rules and guidelines to follow during development:

## Development Constraints
- Use rich aesthetics with high visual quality (gradients, smooth transitions, Inter typography, sleek dark mode).
- Ensure all Supabase column mappings are uniform and use `snake_case` (e.g. `user_net_id`, `feedback_count`, `timetable_json`).
- Ensure API data payloads remain uniform between backend and webapp.
- Keep component code modularized, reusable, and free of placeholder images.
- Enforce the single feedback increment logic: only increment by exactly `+1` per form submission.
- Do not mention or make it public in user-facing texts/logs/promotions that the backend stores student session cookies.

## Git Commit Guidelines
- Always commit with a conventional commit message (e.g., `feat: ...`, `fix: ...`, `refactor: ...`, `seo: ...`) and a detailed, descriptive body outlining the core changes.

## Single Source of Truth & Architecture Governance
- All AI agents and developers working in this workspace MUST strictly follow `docs/NEW_ARCHITECTURE.md` as the single authoritative source of truth for system architecture, authentication models, database schema, API versioning, and feature flows.
- Never improvise alternative architectural patterns (such as altering the AES-256-GCM vault format, diverging from the Webapp-first model, or re-introducing full raw attendance/marks dumps).
- Whenever changes or additions to the system design are agreed upon, the agent MUST immediately update `docs/NEW_ARCHITECTURE.md` before or alongside writing implementation code, ensuring architectural decisions are permanently persisted and never lost across conversation contexts.
