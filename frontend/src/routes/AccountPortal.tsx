import ArrowBack from "@mui/icons-material/ArrowBack";
import { Alert, AlertTitle, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Link as RouterLink, Navigate } from "react-router-dom";
import { DemoAdminUnlock } from "../components/DemoAdminUnlock.js";
import { PortalLicenceCard } from "../components/portal/PortalLicenceCard.js";
import {
  PortalCard,
  PortalPageHeader,
  PortalTabPanel,
  PortalTabs,
} from "../components/portal/PortalChrome.js";
import { PortalShell } from "../components/portal/PortalShell.js";
import { StatusDot } from "../components/StatusTag.js";
import { useAuth } from "../lib/auth.js";
import { COMPOSITION_RHYTHM } from "../lib/composition.js";
import { fetchMe, fetchMyLicense, logout, type Me, type MyLicense } from "../platform-admin/lib/auth.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";

const Credentials = lazy(() => import("../platform-admin/Credentials.js"));
const AccountProfilePanel = lazy(() =>
  import("../platform-admin/AccountProfilePanel.js").then((m) => ({ default: m.AccountProfilePanel })),
);
const RequestPlan = lazy(() => import("../platform-admin/RequestPlan.js"));
const Security = lazy(() => import("../platform-admin/Security.js"));
const UserProfilePanel = lazy(() =>
  import("../components/profile/UserProfilePanel.js").then((m) => ({ default: m.UserProfilePanel })),
);
const WorkspaceSettingsPanel = lazy(() =>
  import("../components/profile/WorkspaceSettingsPanel.js").then((m) => ({
    default: m.WorkspaceSettingsPanel,
  })),
);
const AccountHub = lazy(() =>
  import("../platform-admin/AccountHub.js").then((m) => ({ default: m.AccountHub })),
);
const Companies = lazy(() => import("../platform-admin/Companies.js"));

/** Odd peer group — Overview · Companies · Profile · Security · Workspace */
const TAB_LABELS = ["Overview", "Companies", "Profile", "Security", "Workspace"] as const;

function tabIndexFromHash(): number {
  const hash = window.location.hash.slice(1);
  if (hash === "join" || hash === "companies") return 1;
  if (hash === "profile") return 2;
  if (hash === "security") return 3;
  if (hash === "settings" || hash === "workspace") return 4;
  return 0;
}

function hashFromTab(index: number): string {
  switch (index) {
    case 1:
      return "#companies";
    case 2:
      return "#profile";
    case 3:
      return "#security";
    case 4:
      return "#settings";
    default:
      return "";
  }
}

function scrollToHashAnchor(hash: string) {
  if (!hash || hash === "companies" || hash === "profile" || hash === "security" || hash === "workspace") {
    return;
  }
  requestAnimationFrame(() => {
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export function AccountPortal() {
  const { user } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [license, setLicense] = useState<MyLicense | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState(tabIndexFromHash);

  const wantsCreate = new URLSearchParams(window.location.search).get("mode") === "create";

  useEffect(() => {
    fetchMe().then((m) => {
      setMe(m);
      setChecking(false);
      if (m.account) fetchMyLicense().then(setLicense);
    });
  }, []);

  const syncTabFromLocation = useCallback(() => {
    const next = tabIndexFromHash();
    setTab(next);
    scrollToHashAnchor(window.location.hash.slice(1));
  }, []);

  useEffect(() => {
    syncTabFromLocation();
    window.addEventListener("hashchange", syncTabFromLocation);
    return () => window.removeEventListener("hashchange", syncTabFromLocation);
  }, [syncTabFromLocation]);

  async function refresh() {
    setMe(await fetchMe());
    setLicense(await fetchMyLicense());
  }

  async function handleSignOut() {
    await logout();
    setMe(null);
  }

  function handleTabChange(_e: React.SyntheticEvent, next: number) {
    setTab(next);
    const hash = hashFromTab(next);
    const path = `${window.location.pathname}${window.location.search}${hash}`;
    window.history.replaceState(null, "", path);
    if (hash === "#settings") {
      scrollToHashAnchor("settings");
    } else if (hash === "#companies") {
      scrollToHashAnchor("join");
    }
  }

  if (checking) {
    return (
      <PortalShell active="account">
        <Box sx={{ display: "flex", justifyContent: "center", py: COMPOSITION_RHYTHM.lg }}>
          <CircularProgress />
        </Box>
      </PortalShell>
    );
  }
  if (!me?.account) {
    const q = wantsCreate ? "?tab=account&mode=create" : "?tab=account";
    return <Navigate to={`/login${q}`} replace />;
  }

  const account = me.account;
  const ownsCompany = me.memberships.some((m) => m.role === "OWNER");
  const isPlatformAdmin = account.isPlatformAdmin;

  return (
    <PortalShell
      active="account"
      showCompanyNav={ownsCompany}
      showLicensingNav={isPlatformAdmin}
      footer={
        <Button variant="text" size="small" onClick={handleSignOut}>
          Sign out
        </Button>
      }
    >
      <Stack spacing={COMPOSITION_RHYTHM.md}>
        <PortalPageHeader
          title={AORMS_PORTALS.account.personal}
          documentTitle={
            tab === 0
              ? `${AORMS_PORTALS.account.personal} — ${AORMS_PORTALS.account.name}`
              : `${TAB_LABELS[tab]} — ${AORMS_PORTALS.account.personal} — ${AORMS_PORTALS.account.name}`
          }
          subtitle={`Your portable identity, companies, and security — separate from ${AORMS_PORTALS.studio.title}.`}
          meta={
            <Stack
              direction="row"
              spacing={COMPOSITION_RHYTHM.xs}
              sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
            >
              <Typography variant="body2">{account.email}</Typography>
              {account.publicId && <StatusDot color="cool-gray" label={account.publicId} />}
            </Stack>
          }
          actions={
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              size="small"
              startIcon={<ArrowBack />}
            >
              Workspace sign-in
            </Button>
          }
        />

        <PortalTabs
          value={tab}
          onChange={handleTabChange}
          labels={[...TAB_LABELS]}
          ariaLabel="Account sections"
        />

        <Suspense
          fallback={
            <Box sx={{ display: "flex", justifyContent: "center", py: COMPOSITION_RHYTHM.lg }}>
              <CircularProgress />
            </Box>
          }
        >
          <PortalTabPanel active={tab === 0}>
            <AccountHub me={me} />
            {license ? <PortalLicenceCard license={license} /> : <RequestPlan />}
            {user?.isDemo ? (
              <PortalCard>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Demo workspace
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Unlock admin mutations for this demo session (users, credentials, firm settings).
                </Typography>
                <DemoAdminUnlock />
              </PortalCard>
            ) : null}
            <PortalCard>
              <Typography variant="body2" color="text.secondary">
                {ownsCompany ? (
                  <>
                    Company owners manage GST, members, workspace users, and audit logs in the{" "}
                    <RouterLink to="/company-account">Company account</RouterLink>.
                  </>
                ) : (
                  <>
                    After you create or join a company, owners can manage firm settings in the{" "}
                    <RouterLink to="/company-account">Company account</RouterLink>.
                  </>
                )}
              </Typography>
            </PortalCard>
          </PortalTabPanel>

          <PortalTabPanel active={tab === 1}>
            <Companies me={me} onChange={setMe} />
          </PortalTabPanel>

          <PortalTabPanel active={tab === 2}>
            <AccountProfilePanel account={account} onSaved={refresh} />
          </PortalTabPanel>

          <PortalTabPanel active={tab === 3}>
            <Security me={me} onChange={refresh} />
            <Credentials />
          </PortalTabPanel>

          <PortalTabPanel active={tab === 4}>
            {!user ? (
              <Alert severity="warning">
                <AlertTitle>Workspace sign-in required</AlertTitle>
                Work profile and workspace settings need an active {AORMS_PORTALS.studio.sessionLabel}.{" "}
                <RouterLink to="/login">{AORMS_PORTALS.studio.signInLink}</RouterLink> first, then
                return here.
              </Alert>
            ) : (
              <>
                <PortalCard sx={{ overflow: "hidden", p: 0 }}>
                  <WorkspaceSettingsPanel />
                </PortalCard>
                <PortalCard sx={{ overflow: "hidden", p: 0 }}>
                  <UserProfilePanel />
                </PortalCard>
              </>
            )}
          </PortalTabPanel>
        </Suspense>
      </Stack>
    </PortalShell>
  );
}
