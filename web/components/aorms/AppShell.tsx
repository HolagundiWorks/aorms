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
          <SideNavLink href="/tasks">Tasks</SideNavLink>
          <SideNavLink href="/proposals">Proposals</SideNavLink>
          <SideNavLink href="/letters">Letters</SideNavLink>
          <SideNavLink href="/contracts">Contracts</SideNavLink>
          <SideNavLink href="/invoices">Invoices</SideNavLink>
          <SideNavLink href="/purchase-orders">Purchase Orders</SideNavLink>
          <SideNavLink href="/rate-books">Rate Books</SideNavLink>
          <SideNavLink href="/estimates">Estimates</SideNavLink>
          <SideNavLink href="/spec-sheets">Spec Sheets</SideNavLink>
          <SideNavLink href="/transmittals">Transmittals</SideNavLink>
          <SideNavLink href="/drawings">Drawings</SideNavLink>
          <SideNavLink href="/moms">Meeting Minutes</SideNavLink>
          <SideNavLink href="/ai-runs">AI Runs</SideNavLink>
          <SideNavLink href="/knowledge-bank">Knowledge Bank</SideNavLink>
          <SideNavLink href="/contractors">Contractors</SideNavLink>
          <SideNavLink href="/approvals">Approvals</SideNavLink>
          <SideNavLink href="/team-members">Team Members</SideNavLink>
          <SideNavLink href="/teams">Teams</SideNavLink>
          <SideNavLink href="/payslips">Payslips</SideNavLink>
          <SideNavLink href="/job-applications">Job Applications</SideNavLink>
          <SideNavLink href="/master-plans">Master Plans</SideNavLink>
          <SideNavLink href="/standards">Standards</SideNavLink>
          <SideNavLink href="/compliance">Compliance</SideNavLink>
          <SideNavLink href="/lessons">Lessons Learned</SideNavLink>
          <SideNavLink href="/reports">Financial Reports</SideNavLink>
          <SideNavLink href="/workload">Workload</SideNavLink>
          <SideNavLink href="/audit-log">Audit Log</SideNavLink>
        </SideNavItems>
      </SideNav>
      <Content>{children}</Content>
    </>
  );
}
