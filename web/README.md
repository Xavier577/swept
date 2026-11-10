# Swept website

The download page uses Vue and Vite. It shares the app's color tokens and branding. No backend, analytics, or external fonts.

```sh
cd web
npm ci
npm run dev
npm run build
```

The build goes to `web/dist`. Relative asset paths work at the GitHub Pages `/swept/` path or a custom domain. The Website workflow checks pull requests and deploys changes on `main`. Set the repository's Pages source to **GitHub Actions** before the first deployment.

## Downloads

GitHub Releases is the source of truth. `npm run releases:sync` fetches every published release and writes `src/data/releases.json`. The latest stable release stays recommended even when a newer preview exists. The version history includes previews and versions without a DMG; missing installers never get a download button.

Buttons link directly to uploaded GitHub DMG assets. File sizes come from the assets. Name installers with `universal`, `arm64`, or `intel` so the page can identify the architecture. Unknown names retain their filename and do not claim compatibility.

The Website workflow syncs before deploying on `main`, a release change, or a manual run. Upload every asset before publishing the release. A failed API request fails the build and leaves the live site intact. No token reaches the browser. Pull requests use the checked-in catalog and separate fixtures.

Stable tags create a signed, notarized Universal DMG in a draft release. Beta tags create an explicitly unnotarized preview. Files ending in `-unnotarized.dmg` show a launch warning and installation help beside the download. Publish the reviewed draft through GitHub to update Pages. A workflow publishing with `GITHUB_TOKEN` must explicitly dispatch `pages.yml`; its release event will not start another workflow. See [release setup](../docs/releases.md).

```sh
npm test              # release pagination, filtering, and API failures
npm run test:ui       # real browser downloads, empty state, mobile layouts
npm run format:check
```

Browser tests use installed Chrome locally and Playwright Chromium in CI. `/e2e/downloads.html` contains clearly labelled sample releases and placeholder downloads. It is excluded from `dist`; never copy it into the public site. The checked-in catalog provides a snapshot of published releases; deployment refreshes it from GitHub.

## Screenshots

`public/screenshots` contains the real app UI rendered with sample data. The page labels the samples. The fixture is `desktop/frontend/e2e/screenshots.html`; it replaces the desktop transport and cannot clean files. It is excluded from both production builds.

To refresh the images, start the desktop frontend, open `/e2e/screenshots.html?theme=light`, and use the app's controls to capture Overview, Space explorer, and Cleanup review. Repeat in Dark mode. Keep the screenshots free of personal paths and projects.

Before publishing, check both themes, mobile layout, walkthrough tabs, screenshot expansion, FAQ disclosure, and the download link.
