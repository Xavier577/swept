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

The result is `bin/release/Swept-0.2.0-universal-local-test.dmg`, with a SHA-256 file and JSON size report. It is ad-hoc signed and not notarized. Stable releases never silently fall back to this mode. Preview tags explicitly create ad-hoc signed, unnotarized public builds.

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

## Preview releases without Apple enrollment

Use a `vX.Y.Z-beta.N` tag. The same tests run, then the Release workflow creates a Universal DMG without Developer ID signing or notarization. The filename ends in `-unnotarized.dmg`; the disk image includes installation guidance, and both GitHub and the website label it as a preview. The website shows the notarization warning alongside each download. A preview never becomes the recommended stable release when a stable release exists.

For a local packaging check:

```sh
cd desktop
SWEPT_ARCH=universal SWEPT_VERSION=0.2.0 SWEPT_RELEASE_TAG=v0.2.0-beta.1 ./scripts/build.sh
SWEPT_VERSION=0.2.0 SWEPT_RELEASE_TAG=v0.2.0-beta.1 ./scripts/package.sh --preview
```

Publish the draft only after checking the uploaded DMG and checksum. Users may need Apple's per-app **Open Anyway** flow. Do not tell them to disable Gatekeeper or remove quarantine globally.

## Cut a release

1. Merge the intended changes. Update the source version in `desktop/build/config.yml`, `desktop/build/darwin/Info.plist`, and the frontend package metadata together.
2. Tag that commit `vX.Y.Z` and push the tag. Stable tags use the signed/notarized path; `vX.Y.Z-beta.N` tags use the explicit preview path. A manual rerun must also select that tag.
3. The workflow runs all checks, builds the Universal app, signs it with hardened runtime, notarizes and staples the app, creates the DMG, then signs, notarizes, staples, and verifies the DMG. It generates checksums and exact sizes.
4. It creates a **draft GitHub Release** with the DMG, checksum, size metadata, and release notes. An existing release is never overwritten on a rerun.
5. Complete the package checks below. Edit the release notes to describe user-visible changes, then publish the draft. Publishing updates the website automatically.

The draft is the review point for the actual installer. A failed build, signing request, or notarization must not publish a public download. If the website update fails, the previous deployed site stays available; fix the failure and rerun Website. You can also run Website manually.

If a future workflow publishes releases with `GITHUB_TOKEN`, explicitly dispatch `pages.yml` afterwards: token-generated release events do not trigger another workflow. Publishing the draft through GitHub's UI does trigger Website.

## Package checks before stable publication

Use the actual downloaded draft DMG, not a dev server:

- Verify its checksum, mount it, drag Swept to Applications, and launch it without bypassing Gatekeeper.
- Check launch and core navigation on both Apple Silicon and Intel, including macOS 13. Record OS version, CPU, app version, and results in the draft notes. Do not claim an untested compatibility floor.
- Check light/dark switching, saved preferences, folder navigation, scan cancellation and immediate retry.
- Use disposable files to review and perform a batch cleanup. Confirm unselected files remain, history records the result, and Trash remains a distinct action.
- With a disposable local Docker setup, check multi-item review, cleanup, and resources that become active after review. Check the engine-stopped view too.
- Check the public page's latest and older-version downloads after publishing.

## Current external setup

The workflows and local verification can be completed without an Apple account. A notarized stable release still needs enrollment and the secrets above. Preview releases do not require these credentials. Native builds, tests, and launch passed on both macOS 15 architectures in [GitHub CI](https://github.com/Xavier577/swept/actions/runs/42741151341); macOS 13 and 14 remain unverified. No signing identity was installed on the development Mac when this pipeline was added.

## Local verification — 10 November 2026

On the development Apple Silicon Mac: Go race tests and vet passed, all 14 desktop UI scenarios passed, all four release-catalog tests and four website browser tests passed, and actionlint accepted the workflows. Both production bundles exclude test pages and placeholder downloads.

The Universal local-test DMG is 9.17 MiB (20.11 MiB installed files). Both Mach-O slices declare macOS 13.0. Image verification, checksum verification, app-signature verification, and native startup passed. The app copied from the DMG was checked through computer use for light/dark switching, Home scan cancellation, successful retry, and multi-item review. No user files were deleted.

Later verification: [GitHub CI](https://github.com/Xavier577/swept/actions/runs/42741151341) passed on Apple Silicon and Intel macOS 15, including native launch. Developer ID signing/notarization and macOS 13/14 execution remain unverified. GitHub pushes use HTTPS with GitHub CLI authentication; commits remain GPG-signed.

## First public preview

[v0.2.0-beta.1](https://github.com/Xavier577/swept/releases/tag/v0.2.0-beta.1) is published. The Universal DMG is 9.20 MiB; installed app files total 20.15 MiB. It is ad-hoc signed and not notarized by Apple.

The [release workflow](https://github.com/Xavier577/swept/actions/runs/42743768971) passed on both architectures and created the uploaded assets. Before publication, the downloaded DMG passed SHA-256, image integrity, app-signature, and architecture verification. Its app launched locally and displayed the beta version correctly. macOS 13 and 14 remain unverified; the release notes state this explicitly.
