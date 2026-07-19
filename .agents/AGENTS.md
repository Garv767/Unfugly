# Workspace Customization Rules (AGENTS.md)

This workspace contains code rules and guidelines to follow during development:

## Development Constraints
- Use rich aesthetics with high visual quality (gradients, smooth transitions, Inter typography, sleek dark mode).
- Ensure all Supabase column mappings are uniform and use `snake_case` (e.g. `user_net_id`, `feedback_count`, `timetable_json`).
- Ensure API data payloads remain uniform between backend and webapp.
- Keep component code modularized, reusable, and free of placeholder images.
- Enforce the single feedback increment logic: only increment by exactly `+1` per form submission.

## Git Commit Guidelines
- Always commit with a conventional commit message (e.g., `feat: ...`, `fix: ...`, `refactor: ...`, `seo: ...`) and a detailed, descriptive body outlining the core changes.
