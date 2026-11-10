import { writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const repository = "Xavier577/swept";
const api = `https://api.github.com/repos/${repository}/releases`;
const downloadPrefix = `https://github.com/${repository}/releases/download/`;

function architecture(name) {
  if (/universal/i.test(name)) return "universal";
  if (/(?:arm64|aarch64|apple[-_. ]?silicon)/i.test(name)) return "arm64";
  if (/(?:intel|x86_64|amd64|x64)/i.test(name)) return "intel";
  return "unknown";
}

// Fetch every page before replacing the catalog. API failures must fail deployment,
// not replace working downloads with an empty or partially updated list.
export async function fetchCatalog(request = fetch, token = "") {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2026-03-10",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  async function get(url, allowMissing = false) {
    const response = await request(url, {
      headers,
      signal: AbortSignal.timeout(30000),
    });
    if (allowMissing && response.status === 404) return null;
    if (!response.ok)
      throw new Error(`GitHub release lookup failed (${response.status}).`);
    return response.json();
  }
  const releases = [];
  for (let page = 1; ; page++) {
    const batch = await get(`${api}?per_page=100&page=${page}`);
    if (!Array.isArray(batch))
      throw new Error("GitHub returned an invalid release list.");
    for (const release of batch) {
      if (release.draft || !release.published_at) continue;
      const downloads = release.assets
        .filter(
          (asset) =>
            asset.state === "uploaded" &&
            /\.dmg$/i.test(asset.name) &&
            asset.size > 0 &&
            asset.browser_download_url.startsWith(downloadPrefix),
        )
        .map((asset) => ({
          name: asset.name,
          url: asset.browser_download_url,
          size: asset.size,
          architecture: architecture(asset.name),
        }));
      const order = { universal: 0, arm64: 1, intel: 2, unknown: 3 };
      downloads.sort(
        (a, b) =>
          order[a.architecture] - order[b.architecture] ||
          a.name.localeCompare(b.name),
      );
      releases.push({
        tag: release.tag_name,
        publishedAt: release.published_at,
        prerelease: release.prerelease,
        notesUrl: release.html_url,
        downloads,
      });
    }
    if (batch.length < 100) break;
  }
  releases.sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  const latest = await get(`${api}/latest`, true);
  return { latestTag: latest?.tag_name || null, releases };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const catalog = await fetchCatalog(fetch, process.env.GITHUB_TOKEN);
  const destination = new URL("../src/data/releases.json", import.meta.url);
  const temporary = new URL("../src/data/releases.json.tmp", import.meta.url);
  await writeFile(temporary, JSON.stringify(catalog, null, 2) + "\n");
  await rename(temporary, destination);
  console.log(`Synced ${catalog.releases.length} published releases.`);
}
