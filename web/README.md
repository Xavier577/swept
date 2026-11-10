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

`src/release.ts` holds the published release URL, version, download size, and verified minimum macOS version. Until those are ready, the page explains that the first public release is being prepared. Do not link local ad-hoc signed test builds as public downloads.

Host the signed, notarized Universal DMG and checksums on GitHub Releases. The website only links to them. The desktop release workflow and signing credentials still need to be configured.

## Screenshots

`public/screenshots` contains the real app UI rendered with sample data. The page labels the samples. The fixture is `desktop/frontend/e2e/screenshots.html`; it replaces the desktop transport and cannot clean files. It is excluded from both production builds.

To refresh the images, start the desktop frontend, open `/e2e/screenshots.html?theme=light`, and use the app's controls to capture Overview, Space explorer, and Cleanup review. Repeat in Dark mode. Keep the screenshots free of personal paths and projects.

Before publishing, check both themes, mobile layout, walkthrough tabs, screenshot expansion, FAQ disclosure, and the download link.
