# Swept engineering conventions

- Product: a macOS developer storage cleaner. Wails 3 / Go backend, Vue 3 with strict TypeScript UI.
- Preserve the agreed behavior: reviewed permanent cleanup is primary; Trash is an explicit alternative. Do not run cleanup against the user's personal files during development.
- Keep the desktop bridge thin. Filesystem policy, discovery, measurement, and cleanup belong in the Go core. Managed storage belongs to its owning tool.
- Prefer idiomatic, readable code with explicit errors and bounded concurrency. Add abstractions when concrete behavior requires them. Avoid generic framework scaffolding and unrelated refactors.
- Reuse shared design tokens and UI primitives. Refine the primitive when several screens need the same behavior; do not duplicate local variants.
- Tests must verify real-world expected behavior. Prefer real temporary filesystem scenarios and user interactions. Do not add tests merely to mirror implementation, exercise trivial getters, inflate coverage, or assert private structure.
- Production data comes from actual scans/tool reports. Test fixtures stay in test directories. Do not silently replace failures with fabricated values.
- Keep generated Wails bindings generated. Run Go race tests, vet, TypeScript checks, frontend behavior tests, formatting, and a production build as appropriate to the changes.
- Keep documentation concise and accurate. README holds setup and implementation limits; branding/BRANDING.md holds the design system. Avoid proliferating planning documents.
