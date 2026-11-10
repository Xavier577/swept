# How Swept works

Swept finds storage you can review and remove. Scans are read-only. Cleanup runs after you select items and confirm.

- [Scanning and classification](scanning.md): where we look, how we measure, and what the labels mean.
- [Cleanup](cleanup.md): review, deletion checks, protected paths, and managed tools.

- [Builds and releases](releases.md): CI checks, signing setup, DMGs, and publishing.

## Code structure

Vue handles navigation, selection, and review. Wails connects it to Go. The Go core owns filesystem rules and cleanup.

| Code | Responsibility |
| --- | --- |
| [service.go](../desktop/service.go) | Desktop calls |
| [scan.go](../desktop/scan.go) | Background scan jobs, cancellation, and completion events |
| [catalog.go](../desktop/internal/cleaner/catalog.go) | Known locations and classification rules |
| [browser.go](../desktop/internal/cleaner/browser.go) | Browser cache allowlist and storage boundaries |
| [scan.go](../desktop/internal/cleaner/scan.go) | Directory traversal, measurement, and navigation cache |
| [policy.go](../desktop/internal/cleaner/policy.go) | Path boundaries and deletion protections |
| [cleanup.go](../desktop/internal/cleaner/cleanup.go) | Revalidation, deletion, and outcomes |
| [engine.go](../desktop/internal/cleaner/engine.go) | Settings, scan state, and cleanup history |
| [managed](../desktop/internal/managed) | Docker, Homebrew, Conda, and simulator cleanup |
| [platform](../desktop/internal/platform) | Native macOS Trash and disk capacity |

The desktop service serializes scans, cleanup, and tool operations. Scans run as background jobs. Wails events report progress and completion with a job ID, so delayed replies cannot change a newer scan. Cancellation stops traversal and releases the operation before the UI enables its controls. A cancelled scan cannot authorize cleanup.

Settings and the latest 50 filesystem cleanup results live in `~/Library/Application Support/Swept/state.json`. Scan snapshots and folder measurements stay in memory. Managed-tool results currently appear in their panels rather than persistent history.

Appearance changes apply and save immediately. They keep scan results and do not save unfinished folder edits. Project folders and exclusions use **Save preferences**.

Scanning and cleanup run locally. No telemetry or content upload is implemented.

See the [project README](../README.md) for setup and verification, and [branding](../branding/BRANDING.md) for the design system.
