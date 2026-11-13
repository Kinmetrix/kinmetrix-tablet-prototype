import { expect, test, type Page } from "@playwright/test";
import { TABLET_VIEWPORT } from "../src/shared/theme/tabletViewport";

test.describe("tablet Safari edge fit", () => {
  test.use({
    viewport: { width: 1133, height: 704 },
    hasTouch: true,
    isMobile: true,
  });

  test("uses 1:1 scale and top-left alignment when viewport height is below canvas", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute(
      "data-preview-fit",
      "tablet",
    );
    await expect
      .poll(async () =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue("--preview-scale"),
        ),
      )
      .toBe("1");
    const deviceBox = await page.locator(".device").boundingBox();
    expect(deviceBox?.x ?? -1).toBeLessThan(2);
    expect(deviceBox?.y ?? -1).toBeLessThan(2);
  });
});

test("tablet canvas is 1133×744 inside device frame", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const device = page.locator(".device");
  await expect(device).toHaveAttribute(
    "data-tablet-width",
    String(TABLET_VIEWPORT.width),
  );
  await expect(device).toHaveAttribute(
    "data-tablet-height",
    String(TABLET_VIEWPORT.height),
  );
  await expect(page.locator(".app[data-tablet-canvas]")).toHaveCSS(
    "width",
    `${TABLET_VIEWPORT.width}px`,
  );
  await expect(page.locator(".app[data-tablet-canvas]")).toHaveCSS(
    "height",
    `${TABLET_VIEWPORT.height}px`,
  );
  await expect(page.locator(".system-status-bar")).toBeVisible();
  await expect(page.locator(".system-status-bar")).toHaveCSS("height", "24px");
});

async function openJordanAnalysisFromShell(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "App sections" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Members", exact: true }).click();
  await page.getByRole("button", { name: "Jordan Hale" }).click();
  await page.getByRole("button", { name: "View latest analysis" }).click();
}

test("home shell loads team roster", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "App sections" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Team overview", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sam Bennett" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recent activity", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Onboarding", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Workspace", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Device setup", exact: true }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Templates", level: 1 }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Smart sessions/ }).click();
  await expect(
    page.getByRole("heading", { name: "Smart sessions", level: 1 }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Team settings", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Onboarding preferences/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Waiver policy/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Device/ }).click();
  await expect(
    page.getByRole("heading", { name: "Device", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Arc is connected.")).toBeVisible();

  await page.getByRole("button", { name: "Help", exact: true }).click();
  await expect(page.getByText("Open Device to connect Arc.")).toBeVisible();

  await page
    .getByRole("button", { name: "Current team, Northridge Athletics" })
    .click();
  await page.getByRole("option", { name: "Eastside Performance" }).click();
  await expect(
    page.getByRole("button", { name: "Current team, Eastside Performance" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Team overview", level: 1 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Members", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Roster", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Alex Morgan" })).toBeVisible();
});

test("compare members shows multi-series radar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Members", exact: true }).click();
  await page.getByRole("button", { name: "Compare (3)" }).click();
  await expect(
    page.getByRole("navigation", { name: "App sections" }),
  ).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Compare members", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("3 members selected")).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Force by neck angle for 3 members/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Stability", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Members", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Force by neck angle for 3 members"),
  ).toBeVisible();
});

test("enter team view opens the kiosk sign-in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Kiosk Mode" }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to start", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "App sections" }),
  ).toBeHidden();
  await page
    .getByRole("button", { name: "Staff only: open team configuration" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Staff sign-in", level: 1 }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to start", level: 1 }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Staff only: open team configuration" })
    .click();
  await page.getByRole("button", { name: "Open team configuration" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Enter the 4-digit staff PIN.",
  );
  await page.getByLabel("PIN").fill("12");
  await page.getByRole("button", { name: "Open team configuration" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Enter the 4-digit staff PIN.",
  );
  await page.getByLabel("PIN").fill("1234");
  await page.getByRole("button", { name: "Open team configuration" }).click();
  await expect(
    page.getByRole("heading", { name: "Team overview", level: 1 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Kiosk Mode" }).click();
  await page.getByLabel("Last name").fill("Nobody");
  await page.getByRole("button", { name: "Find my record" }).click();
  await expect(
    page.getByRole("heading", { name: "Is this you?", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Jordan Hale")).toBeVisible();
  await expect(page.getByText("March 14, 1998")).toBeVisible();
  await page.getByRole("button", { name: "Not me" }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to start", level: 1 }),
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: "On-screen Kinmetrix code. Point the Kinmetrix app at it.",
    })
    .click();
  await expect(page.getByText("Kinmetrix app on your phone")).toBeVisible();
  await page.getByRole("button", { name: "Yes, this is me" }).click();
  await expect(
    page.getByRole("button", { name: "Back to kiosk" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Jordan Hale home" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to kiosk" }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to start", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "App sections" }),
  ).toBeHidden();
});

test("member sidebar lists catalog destinations without a working-as head", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "App sections" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Members", exact: true }).click();
  await page.getByRole("button", { name: "Jordan Hale" }).click();

  const sidebar = page.locator("aside.app-sidebar");
  const header = page.locator(".member-shell-header");
  const home = sidebar.getByRole("button", { name: "Home", exact: true });
  const history = sidebar.getByRole("button", { name: "History", exact: true });
  const start = sidebar.getByRole("button", { name: "Start", exact: true });

  await expect(home).toBeVisible();
  await expect(history).toBeVisible();
  await expect(start).toBeVisible();
  await expect(home.locator("svg")).toHaveCount(1);
  await expect(history.locator("svg")).toHaveCount(1);
  await expect(start.locator("svg")).toHaveCount(1);
  await expect(sidebar.getByText("Working as")).toHaveCount(0);
  await expect(sidebar.getByRole("button", { name: /Device/ })).toHaveCount(0);
  await expect(
    sidebar.getByRole("button", { name: "Back to roster" }),
  ).toHaveCount(0);
  await expect(sidebar.locator(".member-account")).toContainText("Jordan Hale");
  await expect(sidebar.locator(".member-account img")).toBeVisible();
  await expect(header.getByText("Northridge Athletics")).toBeVisible();
  await expect(header.getByRole("button", { name: "Connected" })).toBeVisible();
  await expect(
    header.getByRole("button", { name: "Back to roster" }),
  ).toBeVisible();

  await header.getByRole("button", { name: "Connected" }).click();
  await expect(
    page.getByRole("heading", { name: "Device", level: 1 }),
  ).toBeVisible();
  await header.getByRole("button", { name: "Back to roster" }).click();
  await expect(
    page.getByRole("heading", { name: "Roster", level: 1 }),
  ).toBeVisible();
});

test("session report overview loads", async ({ page }) => {
  await openJordanAnalysisFromShell(page);
  await expect(
    page.getByRole("navigation", { name: "Report sections" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Overview", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Jordan Hale")).toBeVisible();
  await expect(
    page.getByText("Strength", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("plan sheet aligns with tablet frame right edge", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openJordanAnalysisFromShell(page);
  await page.getByRole("button", { name: "Plan your next visit" }).click();
  await expect(
    page.getByRole("heading", { name: "Plan your next visit" }),
  ).toBeVisible();

  const alignment = await page.evaluate((width) => {
    const root = document.documentElement;
    const scale = Number.parseFloat(
      root.style.getPropertyValue("--preview-scale") || "1",
    );
    const previewLeft = Number.parseFloat(
      root.style.getPropertyValue("--preview-left") || "0",
    );
    const deviceRight = previewLeft + width * scale;
    const dialog = document.querySelector("#sheet") as HTMLElement | null;
    if (!dialog) {
      return { ok: false, reason: "no dialog" };
    }
    const dialogRight = dialog.getBoundingClientRect().right;
    return {
      ok: Math.abs(dialogRight - deviceRight) < 2,
      dialogRight,
      deviceRight,
    };
  }, TABLET_VIEWPORT.width);

  expect(alignment.ok, JSON.stringify(alignment)).toBe(true);
});

test("print sheet previews take-home schedule before printing", async ({
  page,
}) => {
  await openJordanAnalysisFromShell(page);
  await page.getByRole("button", { name: "Print or export report" }).click();
  await expect(
    page.getByRole("heading", { name: "Print or export" }),
  ).toBeVisible();
  await expect(page.getByText("Included when you print")).toBeVisible();
  await expect(
    page.locator("#sheet").getByText(/sessions per week/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Print / save PDF" }).click();
  await expect(
    page.getByRole("heading", { name: "Print or export" }),
  ).toBeHidden();
});

test("measurements tab and definitions sheet", async ({ page }) => {
  await openJordanAnalysisFromShell(page);
  await page.getByRole("button", { name: "Measurements", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Measurements", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByText("The measurements behind your session."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: "About average peak force" }).click();
  await expect(
    page.getByRole("heading", { name: "Understanding the results" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(
    page.getByRole("heading", { name: "Understanding the results" }),
  ).toBeHidden();
});

test("back to home returns to home shell", async ({ page }) => {
  await openJordanAnalysisFromShell(page);
  await expect(
    page.getByRole("navigation", { name: "Report sections" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to home" }).click();
  await expect(
    page.getByRole("navigation", { name: "App sections" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Report sections" }),
  ).toBeHidden();
});

async function openMemberStart(page: Page, memberName: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Members", exact: true }).click();
  await page.getByRole("button", { name: memberName }).click();
  await page
    .locator("aside.app-sidebar")
    .getByRole("button", { name: "Start", exact: true })
    .click();
}

test("jordan hale start options select range of motion then program", async ({
  page,
}) => {
  await openMemberStart(page, "Jordan Hale");
  const startOptions = page
    .getByRole("group", { name: "Start options" })
    .getByRole("button");
  await expect(startOptions).toHaveCount(4);
  const program = startOptions.filter({ hasText: "Return to play" });
  await expect(program).toContainText("Return to play");
  await expect(program).toContainText("In progress · Return day 2");
  const overflowed = await startOptions.evaluateAll(
    (buttons) =>
      buttons.filter((button) => button.scrollWidth > button.clientWidth)
        .length,
  );
  expect(overflowed).toBe(0);

  const rangeOfMotion = startOptions.filter({ hasText: "Range of motion" });
  await rangeOfMotion.click();
  await expect(rangeOfMotion).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Range of motion" }),
  ).toBeVisible();

  await program.click();
  await expect(rangeOfMotion).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("heading", { name: "Return to play" }),
  ).toBeVisible();
});

test("sam bennett start options are disabled", async ({ page }) => {
  await openMemberStart(page, "Sam Bennett");
  const startOptions = page
    .getByRole("group", { name: "Start options" })
    .getByRole("button");
  await expect(startOptions).toHaveCount(4);
  await expect(startOptions.nth(0)).toBeDisabled();
  await expect(startOptions.nth(1)).toBeDisabled();
  await expect(startOptions.nth(2)).toBeDisabled();
  await expect(startOptions.nth(3)).toBeDisabled();
  await expect(startOptions.filter({ hasText: "Smart session" })).toContainText(
    "Needs an analyzed assessment first.",
  );
  await expect(startOptions.filter({ hasText: "Program" })).toContainText(
    "No program on this account.",
  );
});
