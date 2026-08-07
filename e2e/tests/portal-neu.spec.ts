import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";

/**
 * Smoke: external client portal uses no-rail PortalNeuFrame chrome.
 */
test("client portal shows soft neu frame (no SoftRail)", async ({ page }) => {
  await loginAs(page, "client");

  await expect(page.locator(".esti-portal-neu")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".esti-portal-neu__topbar")).toBeVisible();
  await expect(page.locator(".esti-portal-neu__stage")).toBeVisible();
  await expect(page.locator("#esti-main")).toBeVisible();

  // Identity + sign-out in the top bar (no left SoftRail)
  await expect(page.getByText(/client portal/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  await expect(page.locator(".esti-portal-neu__clock")).toBeVisible();

  await page.screenshot({ path: "test-results/portal-client-neu.png", fullPage: true });
});

/**
 * Account hub after email-only platform sign-in.
 */
test("account hub shows horizontal nav in top bar", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: /aorms account/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: /sign in with just your email/i }).click();
  await page.locator("#auth-email, input[type='email']").first().fill("principal@demo.aorms.in");
  await page.locator("#auth-password, input[type='password']").first().fill(
    process.env.SEED_DEMO_PASSWORD ?? "demo1234",
  );
  await page.getByRole("button", { name: /^(Sign in|Continue)$/ }).click();

  await expect(page.locator(".esti-portal-neu")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("navigation", { name: /account navigation/i })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: /account navigation/i })
      .getByRole("link", { name: /personal account/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();

  await page.screenshot({ path: "test-results/portal-account-neu.png", fullPage: true });
});
