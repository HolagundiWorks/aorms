"use client";

import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SideNav,
  SideNavItems,
  SideNavLink,
  Content,
} from "@carbon/react";
import { Logout } from "@carbon/icons-react";
import { signOut } from "../../lib/actions/auth";

/** Root application shell — Carbon UI Shell (Header + SideNav). One instance for the whole (app) route group. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header aria-label="AORMS">
        <HeaderName href="/dashboard" prefix="AORMS">
          Office Hub
        </HeaderName>
        <HeaderGlobalBar>
          <form action={signOut}>
            {/* Carbon doesn't forward a `type` prop, but a <button> defaults to
                type="submit" inside a <form> — this still triggers signOut. */}
            <HeaderGlobalAction aria-label="Sign out">
              <Logout size={20} />
            </HeaderGlobalAction>
          </form>
        </HeaderGlobalBar>
      </Header>
      <SideNav aria-label="Side navigation" isFixedNav expanded isChildOfHeader={false}>
        <SideNavItems>
          <SideNavLink href="/dashboard">Dashboard</SideNavLink>
          <SideNavLink href="/clients">Clients</SideNavLink>
          <SideNavLink href="/projects">Projects</SideNavLink>
        </SideNavItems>
      </SideNav>
      <Content>{children}</Content>
    </>
  );
}
