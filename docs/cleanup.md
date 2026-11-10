# Cleanup

Permanent removal is the default. Move to Trash is an explicit alternative. Scanning never deletes files.

## Select and review

Overview selections can span categories. Explorer selections belong to the current folder. The review shows every selected item, including items hidden by a filter.

Permanent cleanup requires acknowledgement. If any selected item is classified as **Review contents**, the dialog also requires `CLEAN` once for the selection. Trash uses its own confirmation action.

The frontend sends a completed scan ID and selected item IDs. The backend resolves their paths from its saved scan; it does not accept arbitrary cleanup paths.

## Recheck before removal

The backend checks that every ID belongs to the scan and is eligible for cleanup. Duplicate IDs are counted once. Selecting both a folder and its descendant is rejected.

For each item, it then:

1. Reapplies path protections.
2. Confirms the filesystem identity still matches the scan.
3. Measures the item again using current exclusions.
4. Compares the metadata fingerprint.
5. Refuses removal if the item changed or became unreadable.

These checks also apply to cached Explorer results.

## Permanent removal

Go opens the parent directory, renames the target to a unique `.swept-cleaning-…` sibling, checks its identity again, and removes it recursively through directory-relative filesystem operations.

The temporary name is staging, not a backup. If removal fails, Swept tries to restore the remaining contents to the original name. It never overwrites a file recreated there. If restoration fails, the result reports the staging path.

Cleanup is not an atomic transaction. Files can change after validation, deletion can partially fail, and some selected items can succeed while others fail. Each item gets its own outcome.

## Move to Trash

Swept calls macOS `NSFileManager.trashItemAtURL`. Files remain recoverable through Trash. Space is released after Trash is emptied.

## Protected paths

Filesystem cleanup is restricted to your home folder. Symlink paths and separate mounted filesystems are rejected.

Top-level folders such as Desktop, Documents, Downloads, and Library cannot be removed wholesale. Open them to review their contents.

Protected trees also block deletion of their contents. These include credentials, Keychains, Mail, Messages, application data, app containers, cloud storage, and CoreSimulator data. Swept also blocks deletion of its own running application. The exact list lives in [policy.go](../desktop/internal/cleaner/policy.go).

Protection controls deletion. Accessible protected folders can still be browsed and measured.

Browser cleanup allows only the [recognised cache subfolders](scanning.md#browser-and-app-caches). Browser parents and other contents in known browser cache trees are blocked in both selection and backend cleanup. Profile data under Application Support, plus Safari, Cookies, and WebKit data under Library, stays protected.

## Tool-managed cleanup

Some storage needs the owning tool's rules.

| Tool | Inspection | Cleanup |
| --- | --- | --- |
| Docker | Running local engine inventory | Selected resources through the Docker API |
| Homebrew | `brew cleanup --dry-run` | `brew cleanup` |
| Conda | `conda clean --all --dry-run` | `conda clean --all --yes` |
| Xcode simulators | `xcrun simctl list devices unavailable` | `xcrun simctl delete unavailable` |

Tool previews expire after ten minutes and are consumed on execution. Confirmation requires `CLEAN`. Homebrew, Conda, and simulator cleanup apply their tool's rules to the state at execution time; their preview is not a frozen file selection.

Docker supports one review for multiple selected resources. Before each removal, Swept rechecks eligibility and the recorded identity or revision. It removes specific stopped containers, unreferenced local volumes, unused untagged images, or eligible build-cache records. It does not run a global container or volume prune. Containers are removed without deleting their mounted volumes.

Docker connects through the configured local Unix socket. Remote contexts are rejected. OrbStack is not required; a compatible local Docker engine is.

The offline storage estimate only measures known Docker Desktop and OrbStack disk-image files. It does not inspect resources inside them or offer the images for deletion. Allocated image size is not reclaimable space; OrbStack storage can include Linux machines and swap. Other providers and custom storage locations may be missed by this estimate.

## Results and free space

Swept reports removed size separately from the observed change in available disk space. Hardlinks, APFS shared blocks and snapshots, open files, and concurrent disk activity can make these numbers differ.

Filesystem cleanup clears scan snapshots and saves individual outcomes in history. A failure to save history is reported separately; it does not undo deletion.

Source: [cleanup.go](../desktop/internal/cleaner/cleanup.go), [macos.go](../desktop/internal/platform/macos.go), [managed tools](../desktop/internal/managed/tools.go), [Docker](../desktop/internal/managed/docker.go).
