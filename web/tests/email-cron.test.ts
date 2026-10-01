import { afterEach, describe, expect, it } from "vitest";
import { mailerConfigured, sendEmail } from "../lib/email/send";
import { GET } from "../app/api/cron/licence-reminders/route";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("sendEmail", () => {
  it("reports not-sent (never pretends) when SMTP isn't configured", async () => {
    delete process.env.SMTP_HOST;
    expect(mailerConfigured()).toBe(false);
    const r = await sendEmail({ to: "a@b.co", subject: "s", text: "t" });
    expect(r.sent).toBe(false);
  });
});

describe("licence-reminders cron auth", () => {
  const req = (auth?: string) => new Request("https://aorms.in/api/cron/licence-reminders", { headers: auth ? { authorization: auth } : {} });
  it("rejects when CRON_SECRET is unset, even with a header", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req("Bearer anything"))).status).toBe(401);
  });
  it("rejects a wrong or missing token", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer nope"))).status).toBe(401);
  });
  it("with the right token but no SMTP, does nothing and says so", async () => {
    process.env.CRON_SECRET = "s3cret";
    delete process.env.SMTP_HOST;
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ sent: 0 });
  });
});
