import { createApp, h } from "vue";
import ReleaseDownloads from "../src/components/ReleaseDownloads.vue";
import type { ReleaseCatalog } from "../src/releases";
import "../src/style.css";
const catalog: ReleaseCatalog = {
  latestTag: "v0.3.0",
  releases: [
    {
      tag: "v0.4.0-beta.1",
      prerelease: true,
      publishedAt: "2026-11-10T12:00:00Z",
      notesUrl: "#preview",
      downloads: [],
    },
    {
      tag: "v0.3.0",
      prerelease: false,
      publishedAt: "2026-11-09T12:00:00Z",
      notesUrl: "#stable",
      downloads: [
        {
          name: "Swept-test-universal.dmg",
          url: "/e2e/Swept-test-universal.dmg",
          size: 9615442,
          architecture: "universal",
        },
      ],
    },
    {
      tag: "v0.2.0",
      prerelease: false,
      publishedAt: "2026-11-08T12:00:00Z",
      notesUrl: "#older",
      downloads: [
        {
          name: "Swept-test-intel.dmg",
          url: "/e2e/Swept-test-intel.dmg",
          size: 5284823,
          architecture: "intel",
        },
      ],
    },
  ],
};
const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get("theme") || "light";
createApp({
  render: () =>
    h("main", { class: "shell", style: "padding-block:48px" }, [
      h("h1", "Download UI test"),
      h(
        "p",
        "Sample releases. Downloaded files are test placeholders, not installers.",
      ),
      h(ReleaseDownloads, {
        catalog: params.has("empty")
          ? { latestTag: null, releases: [] }
          : catalog,
      }),
    ]),
}).mount("#app");
