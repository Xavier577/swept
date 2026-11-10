# Builds and releases

Swept targets macOS 13 (Ventura) and later, on Apple Silicon and 64-bit Intel Macs. One Universal DMG contains both architectures. Native CI checks run on macOS 15 for each architecture. Ventura remains a release qualification check; a deployment target alone is not proof of compatibility.

## Checks

Pull requests and pushes to `main` run `.github/workflows/checks.yml`:

- Go race tests and vet on Apple Silicon and Intel.
- Go formatting, Vue/TypeScript compilation, frontend formatting, and generated-binding consistency.
- Behavioral UI tests for selection, cleanup review, scan cancellation, Docker actions, and themes.
- A production app build and native launch check on each architecture.
- Website build, release-catalog tests, and browser tests that actually download disposable fixture files.

Tests use temporary directories, local mock Docker sockets, and frontend fixtures. They do not clean your caches or touch a running container engine. Browser fixtures are excluded from production builds. The launch check proves startup, not every native interaction.

Require the two Desktop checks and Website check in the `main` branch ruleset. Keep Actions enabled for pull requests. Fork tests do not receive release secrets.

## Local packages

```sh
cd desktop
SWEPT_ARCH=universal SWEPT_VERSION=0.2.0 ./scripts/build.sh
SWEPT_VERSION=0.2.0 ./scripts/package.sh --local
```

The result is `bin/release/Swept-0.2.0-universal-local-test.dmg`, with a SHA-256 file and JSON size report. It is ad-hoc signed and not notarized. Public releases never silently fall back when signing fails. Unnotarized distribution must be explicitly configured.

The version passed to packaging must match the built app. Packaging verifies both architectures, refuses to replace an existing DMG, and measures the final compressed download and installed files. Do not publish a fixed size estimate on the website; it reads the uploaded asset size.

## Apple setup

An Apple Developer Program membership is needed for Developer ID signing and notarization. It is not needed for local builds or hosting on GitHub. Without signing/notarization, distribution is possible but macOS presents security warnings.

After enrollment:

1. Create a **Developer ID Application** certificate with its private key, using Xcode or Keychain Access. Export the identity as a password-protected `.p12` file. An Apple Development or Mac App Distribution certificate is not a substitute.
2. Create an app-specific password for the Apple Account used with `notarytool`.
3. Create a GitHub environment named `release`. Add these environment secrets:

| Secret | Value |
| --- | --- |
| `APPLE_CERTIFICATE_P12_BASE64` | Base64-encoded exported `.p12`, including the private key |
| `APPLE_CERTIFICATE_PASSWORD` | Password protecting that export |
| `APPLE_SIGNING_IDENTITY` | Full `Developer ID Application: … (TEAMID)` identity name |
| `APPLE_ID` | Apple Account email |
| `APPLE_TEAM_ID` | Developer membership team ID |
| `APPLE_APP_PASSWORD` | App-specific password for notarization |

Keep these out of commits, logs, chat, and frontend variables. The release job imports them into a temporary keychain, then deletes it even if packaging fails. Limit the environment to version tags and trusted maintainers.

Apple: [Developer ID certificates](https://developer.apple.com/help/account/certificates/create-developer-id-certificates/), [notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution).

## Releases without Apple enrollment

Release status and notarization are independent. Set the repository variable `MACOS_RELEASE_SIGNING=unnotarized` to publish without Apple credentials. Leave it unset, or set it to `notarized`, to require Developer ID signing and notarization. Missing credentials or failed notarization stop the build; they never cause a fallback.

Use `vX.Y.Z` for a regular release and `vX.Y.Z-beta.N` only for a prerelease. Unnotarized DMGs end in `-unnotarized.dmg`, regardless of release status. The website and release notes explain the first-launch warning.

```sh
cd desktop
SWEPT_ARCH=universal SWEPT_VERSION=0.2.0 SWEPT_RELEASE_TAG=v0.2.0 ./scripts/build.sh
SWEPT_VERSION=0.2.0 SWEPT_RELEASE_TAG=v0.2.0 ./scripts/package.sh --unnotarized
```

## Terminal installation

The download page provides a version-pinned command and a link to inspect `web/public/install.sh`. It downloads the Universal DMG and matching checksum from the same GitHub release over HTTPS. Before installing, it checks SHA-256, image integrity, both executable architectures, the app signature, bundle ID, and version. These checks detect corruption and mismatched artifacts; they do not certify safety or protect against a compromised release account.

The installer asks before installing an unnotarized release and explains that it removes quarantine from Swept only. It leaves Gatekeeper enabled for other apps. Notarized releases retain quarantine and must pass Gatekeeper assessment.

Installation defaults to `~/Applications`, without sudo. `--destination /absolute/folder` chooses another writable directory. Quit Swept first. Replacement requires confirmation; the previous app is restored if moving the new app into place fails. Settings and history are untouched. Cancellation or failed verification installs nothing.

Native behavioral tests (`python3 desktop/scripts/installer_test.py`) use temporary signed Universal apps and real DMGs, with local download fixtures. They exercise cancellation, corrupt/missing checksums, scoped quarantine removal, replacement and rollback. Also test the hosted command against the actual release before calling a release verified.

## Cut a release

1. Merge the intended changes. Update the source version in `desktop/build/config.yml`, `desktop/build/darwin/Info.plist`, and the frontend package metadata together.
2. Tag that commit `vX.Y.Z` and push the tag. The tag controls release status; `MACOS_RELEASE_SIGNING` controls notarization. A manual rerun must also select that tag.
3. The workflow runs all checks and builds a Universal app and DMG. In notarized mode it signs with hardened runtime, notarizes, staples, and verifies both. In unnotarized mode it retains ad-hoc signing and labels the assets. Both modes generate checksums and exact sizes.
4. It creates a **draft GitHub Release** with the DMG, checksum, size metadata, and release notes. An existing release is never overwritten on a rerun.
5. Complete the package checks below. Edit the release notes to describe user-visible changes, then publish the draft. Publishing updates the website automatically.

The draft is the review point for the actual installer. A failed build, signing request, or notarization must not publish a public download. If the website update fails, the previous deployed site stays available; fix the failure and rerun Website. You can also run Website manually.

If a future workflow publishes releases with `GITHUB_TOKEN`, explicitly dispatch `pages.yml` afterwards: token-generated release events do not trigger another workflow. Publishing the draft through GitHub's UI does trigger Website.

## Package checks before publication

Use the actual downloaded draft DMG, not a dev server:

- Verify its checksum, mount it, install, and launch. Notarized releases must pass Gatekeeper without an exception. Unnotarized releases must clearly explain the exception; test the Terminal route too.
- Check launch and core navigation on both Apple Silicon and Intel, including macOS 13. Record OS version, CPU, app version, and results in the draft notes. Do not claim an untested compatibility floor.
- Check light/dark switching, saved preferences, folder navigation, scan cancellation and immediate retry.
- Use disposable files to review and perform a batch cleanup. Confirm unselected files remain, history records the result, and Trash remains a distinct action.
- With a disposable local Docker setup, check multi-item review, cleanup, and resources that become active after review. Check the engine-stopped view too.
- Check the public page's latest and older-version downloads after publishing.

## Current external setup

The workflows and local verification can be completed without an Apple account. Notarized releases still need enrollment and the secrets above. Explicitly unnotarized releases do not require these credentials. Native builds, tests, and launch passed on both macOS 15 architectures in [GitHub CI](https://github.com/Xavier577/swept/actions/runs/42741151341); macOS 13 and 14 remain unverified. No signing identity was installed on the development Mac when this pipeline was added.

## Local verification — 10 November 2026

On the development Apple Silicon Mac: Go race tests and vet passed, all 14 desktop UI scenarios passed, all four release-catalog tests and four website browser tests passed, and actionlint accepted the workflows. Both production bundles exclude test pages and placeholder downloads.

The Universal local-test DMG is 9.17 MiB (20.11 MiB installed files). Both Mach-O slices declare macOS 13.0. Image verification, checksum verification, app-signature verification, and native startup passed. The app copied from the DMG was checked through computer use for light/dark switching, Home scan cancellation, successful retry, and multi-item review. No user files were deleted.

Later verification: [GitHub CI](https://github.com/Xavier577/swept/actions/runs/42741151341) passed on Apple Silicon and Intel macOS 15, including native launch. Developer ID signing/notarization and macOS 13/14 execution remain unverified. GitHub pushes use HTTPS with GitHub CLI authentication; commits remain GPG-signed.

## First public preview

[v0.2.0-beta.1](https://github.com/Xavier577/swept/releases/tag/v0.2.0-beta.1) is published. The Universal DMG is 9.20 MiB; installed app files total 20.15 MiB. It is ad-hoc signed and not notarized by Apple.

The [release workflow](https://github.com/Xavier577/swept/actions/runs/42743768971) passed on both architectures and created the uploaded assets. Before publication, the downloaded DMG passed SHA-256, image integrity, app-signature, and architecture verification. Its app launched locally and displayed the beta version correctly. macOS 13 and 14 remain unverified; the release notes state this explicitly.
