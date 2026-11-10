# Scanning and classification

Overview discovers cleanup candidates. Explorer measures the folder you open. Both use the same measurement and classification code.

## Where we look

Overview checks these locations inside your home folder. Missing locations are ignored.

| Area | Paths relative to `~` |
| --- | --- |
| Node.js | `.npm/_cacache`, `.npm/_logs`, `.yarn/cache`, `.pnpm-store`, `Library/pnpm/store` |
| Xcode | `Library/Developer/Xcode/DerivedData`, `Library/Developer/Xcode/Archives`, `Library/Developer/Xcode/iOS DeviceSupport` |
| Python | `.cache/pip`, `anaconda3/pkgs`, `miniconda3/pkgs` |
| Other tools | `.gradle/caches`, `.m2/repository`, `.cargo/registry`, `.cargo/git/db`, `go/pkg/mod` |
| App caches and logs | Individual entries in `Library/Caches` and `Library/Logs`; recognised browser caches are listed separately |

Xcode locations are split into individual child folders. Recognised entries under `Library/Caches` are assigned to their tool category, including Homebrew, pip, Poetry, uv, Yarn, pnpm, and Go build caches.

Overview also searches project roots from Preferences. Existing `~/Developer`, `~/Projects`, and `~/Code` are initial defaults.

| Project artifact | Recognition rule |
| --- | --- |
| `node_modules` | Directory name |
| `target` | Directory name and a sibling `Cargo.toml` |
| `.next` | Directory name and a sibling `package.json` |
| `__pycache__` | Directory name |
| `.venv` or `venv` | Directory name and a contained `pyvenv.cfg` |

Project discovery skips `.git`, `.Trash`, directories named `Library`, and `.app` bundles. Once an artifact is found, its contents are measured as one candidate. Overlapping project roots do not produce duplicate candidates.

Custom cache locations are not automatically detected. Explorer can inspect other accessible folders inside your home.

## How we measure

Explorer uses `os.ReadDir` to list immediate children. Each child is measured recursively with `fs.WalkDir` and a cancellable directory reader. A folder row includes regular files beneath it.

We read directory entries and file metadata. We do not read document text or source code to determine size or classification.

- **Allocated size:** filesystem blocks multiplied by 512 bytes. This is the displayed size.
- **Logical size:** the file's reported length. Sparse files can have a much larger logical size.
- **File count:** regular files, with hardlinks counted once within each measured item.

The walk also records a SHA-256 fingerprint of paths, identities, modes, sizes, and timestamps. Cleanup compares this metadata fingerprint before deletion. It is not a hash of file contents.

Traversal stays inside your home, does not follow symlink targets, and skips separate mounted filesystems and excluded paths. Expected skips appear as notes. Read failures appear as warnings; only permission failures show Full Disk Access guidance.

Unreadable or excluded contents are not counted as empty. An incompletely measured folder cannot be deleted as a whole; open it to review accessible children.

## What the labels mean

| Label | Meaning |
| --- | --- |
| Rebuildable | Recognised cache or generated output that can normally be downloaded or built again |
| Review first | Known content with additional consequences, such as an environment with unrecorded packages |
| Review contents | Contents may be irreplaceable, or Swept has no specific classification for them |
| Protected folder | Deletion policy blocks this folder |
| Partially measured | Some contents were skipped or unreadable; whole-folder cleanup is blocked |
| Use Conda | Use Conda's cleanup action instead of deleting its package cache directly |

Classification describes content. It does not prove that content is unused. Modification time is not last-used time.

Descendants inherit their recognised cache or artifact classification. Parents do not inherit a child's classification: `~/go/pkg/mod` is Go modules, but `~/go` may contain unrelated work. The list and cleanup review use the same labels and reasons.

### Browser and app caches

Only recognised cache locations are **Rebuildable**. Other app storage under `~/Library/Caches` says **Review contents** and requires the stronger permanent-deletion confirmation.

Browser cleanup is limited to these directories under `~/Library/Caches`:

| Browser | Removable cache folders |
| --- | --- |
| Chrome, Beta, Dev, Canary | `Google/<browser>/<profile>/Cache` and `Code Cache` |
| Chromium | `Chromium/<profile>/Cache` and `Code Cache` |
| Firefox | `Firefox/Profiles/<profile>/cache2` |

Chrome and Chromium profiles must be named `Default`, `Profile <number>`, `System Profile`, or `Guest Profile`. Other layouts are not automatically recognised.

Overview lists each cache separately. Explorer and review use the same classification. Browser parents, profile roots, site storage, and other unrecognised contents in these browser trees cannot be selected. A directory called `Cache` elsewhere does not qualify.

Profile data under `~/Library/Application Support`, along with Safari, Cookies, and WebKit data under `~/Library`, is protected. Known cache trees for Safari, Edge, Brave, Vivaldi, and Opera are also protected; they do not yet have removable cache rules. Custom browser locations are not automatically identified or given browser-specific protections.

The browser cache description explains that cookies, saved passwords, history, and site storage are kept. Quit the browser before cleaning. Cached resources must be downloaded or compiled again.

Location references: [Chromium user data and cache directories](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_dir.md), [Firefox profiles](https://firefox-source-docs.mozilla.org/toolkit/profile/index.html), [Firefox HTTP cache](https://firefox-source-docs.mozilla.org/networking/cache2/doc.html).

## Navigation and refresh

Explorer keeps the last 32 measured folders in memory. Returning to a cached folder reuses its result. A first visit or explicit **Refresh sizes** measures it again.

**Cancel** stops the current scan. Once traversal stops, controls become available again. The previous folder, results, and selection stay in place; partial results from the cancelled scan are discarded. You can browse or start another scan without restarting Swept.

A macOS directory read can remain blocked on folder access after cancellation. That read cannot update scan results. Repeated visits share the pending read, with at most eight OS reads outstanding. Other accessible folders can still be scanned.

Filesystem cleanup, successful managed-tool execution, and preference changes clear cached scans. Restarting the app clears them too. There is no filesystem watcher; external changes appear after refresh. Cleanup still rechecks selected items before removal.

Source: [catalog.go](../desktop/internal/cleaner/catalog.go), [scan.go](../desktop/internal/cleaner/scan.go).
