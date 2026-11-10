# Swept

**A little room to build.** A local macOS storage cleaner for developers, rebuilt with Wails 3, Go, and Vue 3 / TypeScript.

Swept finds developer caches and generated artifacts, explains what they contain, and lets you review individual items before cleaning. **Clean now permanently removes reviewed files.** Move to Trash is a separate, optional action. Scanning never changes your files.

## Run

Requirements: macOS 12+, Go 1.26+, Node.js 22.12+ (or a current LTS), Xcode Command Line Tools, and Wails 3.0.0.

```sh
go install github.com/wailsapp/wails/v3/cmd/wails3@v3.0.0
export PATH="$PATH:$(go env GOPATH)/bin"
cd desktop
./scripts/build.sh
open bin/Swept.app
```

The build produces an ad-hoc signed local app. Copy it to Applications if desired. Public distribution requires your own Apple Developer signing identity and notarization; this repository does not contain signing credentials.

For development, build once, then run `wails3 dev`. Go services generate TypeScript bindings; do not hand-edit `frontend/bindings`.

## Use

1. Open **Preferences** and choose project folders. Existing `~/Developer`, `~/Projects`, and `~/Code` are initial defaults. Known user caches are scanned independently of these folders.
2. Choose **Scan my Mac**. Watch progress or cancel. A cancelled scan cannot authorize cleanup.
3. Build a sweep from the overview: filter by category, inspect paths, and select items across categories for one review. Selections stay with you when switching categories. Nothing is selected automatically. “Select rebuildable items” is an explicit convenience action.
4. Choose **Review cleanup**. The dialog lists every selection, including items hidden by a search filter. Permanent cleanup requires acknowledgement; items labelled “Review contents” also require typing `CLEAN`.
5. Review the result in **Your sweeps**. Errors are reported per item, including partial deletion. The current view refreshes after cleaning.

Use **Space explorer** to browse folders inside your home with measured sizes and size bars, clickable breadcrumbs, back/forward navigation, quick folders, and a path field. The last 32 measured folders are kept for the session: navigation reuses them, while **Refresh sizes** explicitly rescans. New folders are measured on their first visit. Cleanup and preference changes invalidate cached measurements. Show hidden files when needed, reveal or copy paths, and review selected files for cleanup. Explorer selections belong to the current folder; overview selections are kept separately. Known cache and build-artifact paths keep the same classification in Explorer and the overview, including their contents. Mixed parent folders stay “Review contents”; protected roots say “Protected folder” and explain how to inspect their contents. Protected folders can be inspected, but cannot be removed wholesale. Symlink targets are not traversed. This version intentionally does not clean external volumes or privileged system directories.

## Coverage

| Category | File discovery | Tool-managed cleanup |
| --- | --- | --- |
| Node.js | npm caches/logs, Yarn cache, pnpm stores, project node_modules and Next.js builds | — |
| Xcode | DerivedData, Archives, iOS DeviceSupport | Unavailable simulators through `xcrun simctl` |
| Docker | Offline allocated size of standard Docker Desktop / OrbStack data disks; detailed usage from the running local engine | Review individual untagged images, unused build-cache records, stopped containers, and unreferenced local volumes |
| Homebrew | User cache and logs | Dry-run preview followed by Homebrew's own cleanup |
| Python | pip/uv/Poetry caches, bytecode, virtual environments, Conda cache inspection | Conda dry-run preview and native cache cleanup |
| App caches | Known browser cache subfolders and other entries in `~/Library/Caches`; unrecognised app storage requires review | — |
| Logs | Immediate children of `~/Library/Logs` | — |
| Other developer tools | Gradle, Maven, Cargo, Go modules/build cache, CocoaPods, Rust target directories | — |

The Docker screen measures known storage files without starting an engine. OrbStack totals can include Linux machines and swap; allocated size is not reclaimable space. Custom locations and other providers may not be detected. Start your local engine for the image/container/volume breakdown and cleanup. Docker uses a captured local Unix socket, never a remote context. Managed tools may be unavailable, stopped, or lack permissions; Swept reports the error rather than showing invented usage. Docker cleanup accepts a reviewed selection with one confirmation, rechecks each resource, and reports individual outcomes; it never runs a global container or volume prune. Other managed tools apply their own cleanup rules to the current state at execution time. Their output appears in the tool panel; the persistent history currently covers filesystem cleanup only.

Archives, virtual environments, Maven artifacts, simulator data, and Docker volumes may contain irreplaceable work. Classification describes the kind of content, not whether it is unused. Modified dates are not “last used” dates. Close related apps/builds before cleaning.

Browser cleanup offers Chrome/Chromium `Cache` and `Code Cache`, and Firefox `cache2`, at recognised locations. Browser parents and other storage in known browser cache trees are protected. Profile data under Application Support and Safari/Cookies/WebKit data under Library cannot be removed through filesystem cleanup. See [browser cache coverage and limits](docs/scanning.md#browser-and-app-caches).

## Filesystem guarantees and limits

- The backend accepts IDs from completed scans, never arbitrary cleanup paths from the frontend.
- Before deletion, it rechecks file identity and a metadata fingerprint of the scanned tree. Changed or unreadable items require another scan.
- Cleanup is restricted to the user's home. Home roots, credentials, cloud storage, application databases, and OS-managed directories are protected.
- Permanent removal uses directory-relative Go filesystem operations. The reviewed target is renamed and its identity checked before removal. Remaining files after a failure are restored when possible; otherwise their staging path is reported. Cleanup is not an atomic transaction across multiple items.
- Symlinks are not followed. Scans use allocated file blocks, count hardlinks once within each item, and distinguish logical bytes. Hardlinks shared across items, APFS clones/snapshots, open files, and concurrent disk activity mean estimates are not promises of immediately reclaimable space.
- “Removed size” and the observed free-space change are separate numbers. Moving to Trash does not immediately free space.
- Exclusions, mounted filesystems, and unreadable contents prevent whole-folder cleanup. Expected skips appear as informational notes, separate from actual scan warnings. Only permission failures show Full Disk Access guidance. Detail output is bounded.
- Scanning and cleanup run locally. No telemetry or content upload is implemented.

Settings and the latest 50 filesystem cleanup results are stored in `~/Library/Application Support/Swept/state.json`. Full Disk Access is optional; enable it if access-denied warnings affect locations you need to inspect, then quit and reopen Swept.

## Documentation

See [docs](docs/README.md) for scanning, classification, cleanup, and the current implementation limits.

## Architecture

```text
desktop/
  main.go / service.go       Wails startup and desktop service boundary
  internal/cleaner/          Discovery, measurements, policy, cleanup, local state
  internal/managed/          Docker / Homebrew / Xcode / Conda command adapters
  internal/platform/         macOS Trash and filesystem capacity
  frontend/src/
    components/ui/          Reusable UI primitives
    components/             Shared file list, scan status, review dialog
    views/                  Overview, preferences, history, managed tools
    composables/            Application state and service orchestration
    tokens.css              Shared semantic design tokens
  frontend/e2e/             Browser interaction scenarios (test harness only)
  scripts/build.sh          Reproducible local .app build and ad-hoc signing
```

The prior Tauri/React POC remains available in Git history at `f96fc91`. Its fabricated data and deletion APIs are not part of the rebuilt app.

## Verification

```sh
cd desktop
go test -race ./...
go vet ./...
npm --prefix frontend run check
npm --prefix frontend run format:check
npm --prefix frontend test
```

Browser tests use an installed Google Chrome and a test-only Vue harness. They check selection, review, cancellation, permanent-removal consent, and the distinct Trash action. Go scenarios use real temporary files to check discovery, deep/sparse sizing, hardlinks, symlink escapes, selected-only deletion, changed files, exclusions, partial outcomes, persistence, and cancelled scans. They never target your actual caches.

## Branding

See `branding/BRANDING.md`. The design system carries the existing blue/cyan broom identity into both themes, with reusable tokens and primitives. The original purple remains a secondary accent.
