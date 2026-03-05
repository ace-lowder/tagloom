# Frontend Scope Boundaries

## Frozen Backend Contract

The tag generation backend route is **frozen** for this UI refinement scope:

- File: `src/app/api/tags/route.ts`
- Endpoint: `POST /api/tags`
- Request body: `{ title: string, description?: string }`
- Response: `{ tags: { target: string[]; discovery: string[] }, source: "model" | "fallback", error?: string }`

Do not modify backend logic, prompt behavior, request/response structure, or error semantics while implementing landing, blog, support, animation, and navigation UX changes.

All CTA and generator visual effects must remain frontend-only.
