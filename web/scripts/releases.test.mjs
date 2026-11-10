import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchCatalog } from "./releases.mjs";

const repo = "https://github.com/Xavier577/swept/releases";
function release(tag, options = {}) {
  return {
    tag_name: tag,
    published_at: "2026-11-01T10:00:00Z",
    draft: false,
    prerelease: false,
    html_url: `${repo}/tag/${tag}`,
    assets: [],
    ...options,
  };
}
function asset(name, tag = "v0.3.0", options = {}) {
  return {
    name,
    state: "uploaded",
    size: 9613843,
    browser_download_url: `${repo}/download/${tag}/${name}`,
    ...options,
  };
}
const response = (body, status = 200) =>
  new Response(JSON.stringify(body), { status });

test("all release pages are included, while GitHub's stable release stays the recommended version", async () => {
  const first = Array.from({ length: 100 }, (_, n) => release(`v0.1.${n}`));
  first[0] = release("v0.4.0-beta.1", {
    prerelease: true,
    published_at: "2026-11-10T10:00:00Z",
    assets: [asset("Swept-universal.dmg", "v0.4.0-beta.1")],
  });
  first[1] = release("v0.5.0-draft", { draft: true });
  const calls = [];
  const catalog = await fetchCatalog(async (url) => {
    calls.push(url);
    if (url.endsWith("/latest")) return response({ tag_name: "v0.3.0" });
    if (url.endsWith("page=1")) return response(first);
    if (url.endsWith("page=2"))
      return response([
        release("v0.3.0", {
          assets: [
            asset("Swept-intel.dmg"),
            asset("Swept-arm64.dmg"),
            asset("Swept-universal.dmg"),
          ],
        }),
      ]);
    throw new Error(`Unexpected URL: ${url}`);
  });
  assert.equal(catalog.latestTag, "v0.3.0");
  assert.equal(catalog.releases.length, 100);
  assert.equal(catalog.releases[0].tag, "v0.4.0-beta.1");
  assert.ok(!catalog.releases.some((item) => item.tag === "v0.5.0-draft"));
  assert.equal(calls.length, 3);
  assert.deepEqual(
    catalog.releases
      .find((item) => item.tag === "v0.3.0")
      .downloads.map((file) => file.architecture),
    ["universal", "arm64", "intel"],
  );
});

test("downloads point to completed DMG assets, without mislabelling unknown architectures", async () => {
  const catalog = await fetchCatalog(async (url) =>
    url.endsWith("/latest")
      ? response({ tag_name: "v0.3.0" })
      : response([
          release("v0.3.0", {
            assets: [
              asset("Swept.dmg"),
              asset("Swept-universal.dmg", "v0.3.0", { state: "starter" }),
              asset("Swept-zero.dmg", "v0.3.0", { size: 0 }),
              asset("source.zip"),
              asset("elsewhere.dmg", "v0.3.0", {
                browser_download_url: "https://example.com/app.dmg",
              }),
            ],
          }),
          release("v0.1.0"),
        ]),
  );
  assert.deepEqual(catalog.releases[0].downloads, [
    {
      name: "Swept.dmg",
      architecture: "unknown",
      unnotarized: false,
      size: 9613843,
      url: `${repo}/download/v0.3.0/Swept.dmg`,
    },
  ]);
  assert.equal(catalog.releases[1].tag, "v0.1.0");
  assert.deepEqual(catalog.releases[1].downloads, []);
});

test("a failure partway through pagination fails the sync instead of returning a partial catalog", async () => {
  await assert.rejects(
    fetchCatalog(async (url) =>
      url.endsWith("page=1")
        ? response(Array.from({ length: 100 }, (_, n) => release(`v0.${n}`)))
        : response({ message: "Rate limit" }, 403),
    ),
    /403/,
  );
});

test("a repository without published releases produces the real empty state", async () => {
  const catalog = await fetchCatalog(async (url) =>
    url.endsWith("/latest") ? response({}, 404) : response([]),
  );
  assert.deepEqual(catalog, { latestTag: null, releases: [] });
});

test("unnotarized preview downloads stay available when there is no stable release", async () => {
  const catalog = await fetchCatalog(async (url) =>
    url.endsWith("/latest")
      ? response({}, 404)
      : response([
          release("v0.2.0-beta.1", {
            prerelease: true,
            assets: [
              asset(
                "Swept-0.2.0-beta.1-universal-unnotarized.dmg",
                "v0.2.0-beta.1",
              ),
            ],
          }),
        ]),
  );
  assert.equal(catalog.latestTag, null);
  assert.equal(catalog.releases[0].downloads[0].unnotarized, true);
  assert.equal(catalog.releases[0].downloads[0].architecture, "universal");
});
