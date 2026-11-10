import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("visitors download the latest stable or an older Intel build without leaving the page", async ({
  page,
}) => {
  await page.goto("/e2e/downloads.html");
  const latest = page.locator(".download-card");
  await expect(latest.getByText("v0.3.0", { exact: true })).toBeVisible();
  for (const [link, filename] of [
    [
      latest.getByRole("link", { name: /Download Swept v0.3.0/ }),
      "Swept-test-universal.dmg",
    ],
    [
      page
        .getByRole("article", { name: "Swept v0.2.0", exact: true })
        .getByRole("link", { name: /Download Swept/ }),
      "Swept-test-intel.dmg",
    ],
  ] as const) {
    if (filename.includes("intel"))
      await page.getByText("All versions", { exact: false }).click();
    const pending = page.waitForEvent("download");
    await link.click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(filename);
    expect(await readFile((await download.path())!, "utf8")).toContain(
      "Not an installer.",
    );
  }
  const preview = page.getByRole("article", {
    name: "Swept v0.4.0-beta.1",
    exact: true,
  });
  await expect(preview.getByText("Preview", { exact: true })).toBeVisible();
  await expect(
    preview.getByRole("link", { name: /Download Swept/ }),
  ).toHaveCount(0);
});

test("an unpublished app has an honest empty state", async ({ page }) => {
  await page.goto("/e2e/downloads.html?empty");
  await expect(
    page.getByText("Getting ready for the first release"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Download Swept/ })).toHaveCount(
    0,
  );
  await expect(page.locator(".version-history")).toHaveCount(0);
});

for (const theme of ["light", "dark"]) {
  test(`version history fits a phone in ${theme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/e2e/downloads.html?theme=${theme}`);
    await page.getByText("All versions", { exact: false }).click();
    await expect(
      page.getByRole("link", { name: /Download Swept v0.2.0/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  });
}
