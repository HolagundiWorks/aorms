import NextLink from "next/link";
import { Button, Stack, Tag } from "@carbon/react";
import { setPublicProfile } from "../../../lib/actions/account-profile";

/** Opt-in switch for the public verified profile (/p/<handle>). Verified Identities only. */
export function PublicProfileToggle({ handle, enabled, verified }: { handle: string; enabled: boolean; verified: boolean }) {
  return (
    <Stack gap={4}>
      <p className="cds--type-body-01">
        A public page showing your name, photo, COA number, qualifications, certificate titles and Studio history. No files, contact details or
        pay information are ever shown. It is off unless you turn it on, and only a verified Identity can.
      </p>
      <Stack gap={3} orientation="horizontal" style={{ alignItems: "center" }}>
        <Tag type={enabled && verified ? "green" : "gray"} size="md">
          {enabled && verified ? "Public" : "Private"}
        </Tag>
        {enabled && verified && (
          <NextLink href={`/p/${handle}`} className="cds--link">
            View public page →
          </NextLink>
        )}
      </Stack>
      {verified ? (
        <form action={setPublicProfile}>
          <input type="hidden" name="enable" value={enabled ? "0" : "1"} />
          <Button type="submit" kind={enabled ? "tertiary" : "primary"} size="sm">
            {enabled ? "Make private" : "Make public"}
          </Button>
        </form>
      ) : (
        <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
          Verify your AORMS Identity to enable a public profile.
        </p>
      )}
    </Stack>
  );
}
