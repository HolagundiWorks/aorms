import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { login as platformLogin, type Me } from "../platform-admin/lib/auth.js";
import { trpc } from "../lib/trpc.js";
import {
  AORMS_CONSULTANCY,
  AORMS_PLATFORM,
  AORMS_PMC,
  AORMS_PORTALS,
  AORMS_STUDIO,
  HCW_LICENSE_MANAGER,
} from "../lib/product-nomenclature.js";
import { AuthRailLayout } from "../components/AuthRailLayout.js";
import {
  AuthBrandPane,
  AuthLabeledField,
  AuthSplitCard,
} from "../components/auth/AuthSplitCard.js";
import { GoogleIconCircle } from "../components/GoogleIconCircle.js";
import { COMPOSITION_RHYTHM } from "../lib/composition.js";
import { AUTH_PAGE_SEO, applyPublicPageSeo } from "../lib/public-page-seo.js";
import {
  isAdminHost,
  isConsultancyHost,
  isPlatformHost,
  isPmcHost,
  isStudioHost,
  platformHomeHref,
} from "../lib/aorms-surface-urls.js";

const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE !== "false";
const PlatformLogin = lazy(() => import("../platform-admin/Login.js"));

export type LoginTab = "workspace" | "portals" | "account";
/** Account-tab variants folded into the unified login. */
export type AccountScope = "personal" | "company" | "licensing";

const LOGIN_TABS: { id: LoginTab; label: string }[] = [
  { id: "workspace", label: "Workspace" },
  { id: "portals", label: "Portals" },
  { id: "account", label: "Account" },
];

const ACCOUNT_SCOPES: { id: AccountScope; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "company", label: "Company" },
  { id: "licensing", label: "Licensing" },
];

interface CompanyOption {
  publicId: string | null;
  name: string;
  role: string;
}

interface TenantItem {
  id: string;
  label: string;
}

const WORKSPACE_ITEM: TenantItem = { id: "workspace", label: "Personal workspace" };

const GOOGLE_ERRORS: Record<string, string> = {
  not_configured: "Google sign-in isn't configured on this server yet — use email and password.",
  denied: "Google sign-in was cancelled.",
  state_mismatch: "The sign-in attempt expired — please try again.",
  exchange_failed: "Google could not complete the sign-in — please try again.",
  userinfo_failed: "Google did not confirm your email — please try again.",
};

function companyItem(c: CompanyOption): TenantItem {
  return { id: c.publicId ?? c.name, label: `${c.name} — ${c.role}` };
}

function authProductName(): string {
  if (isStudioHost()) return AORMS_STUDIO.title;
  if (isConsultancyHost()) return AORMS_CONSULTANCY.title;
  if (isPmcHost()) return AORMS_PMC.title;
  if (isAdminHost()) return HCW_LICENSE_MANAGER.consoleTitle;
  return AORMS_PLATFORM.name;
}

function parseTab(raw: string | null): LoginTab {
  if (raw === "portals" || raw === "access") return "portals";
  if (raw === "account" || raw === "licensing" || raw === "company") return "account";
  return "workspace";
}

function parseAccountScope(params: URLSearchParams): AccountScope {
  const scope = params.get("scope");
  const tab = params.get("tab");
  if (scope === "company" || tab === "company") return "company";
  if (scope === "licensing" || scope === "admin" || tab === "licensing") return "licensing";
  if (isAdminHost()) return "licensing";
  return "personal";
}

function brandCopy(
  tab: LoginTab,
  choosing: boolean,
  scope: AccountScope,
): { title: string; lead: ReactNode } {
  if (choosing) {
    return {
      title: "Choose where to go",
      lead: "Open your workspace, manage your account, or review your company.",
    };
  }
  if (tab === "portals") {
    return {
      title: AORMS_PORTALS.external.stageHeadline,
      lead: AORMS_PORTALS.external.signInIntro,
    };
  }
  if (tab === "account") {
    if (scope === "company") {
      return {
        title: AORMS_PORTALS.account.company,
        lead: "Sign in as the company owner to manage profile, members, and licence.",
      };
    }
    if (scope === "licensing") {
      return {
        title: AORMS_PORTALS.auth.licensingHeadline,
        lead: AORMS_PORTALS.auth.licensingSubline,
      };
    }
    return {
      title: AORMS_PORTALS.account.stageHeadline,
      lead: AORMS_PORTALS.account.stageSubline,
    };
  }
  return {
    title: "Sign in",
    lead: `One AORMS sign-in for ${AORMS_STUDIO.title}, ${AORMS_CONSULTANCY.title}, ${AORMS_PMC.title}, portals, and licensing.`,
  };
}

/**
 * Unified AORMS sign-in — Workspace · Portals · Account on one page.
 * Legacy routes redirect here: `/access` → portals · company/licensing → Account scope.
 */
export function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params.get("tab"));
  const accountScope = parseAccountScope(params);
  const wantsCreate = params.get("mode") === "create";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[] | null>(null);
  const [companyBusy, setCompanyBusy] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantItem | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(
    GOOGLE_ERRORS[params.get("google_error") ?? ""] ?? null,
  );

  useEffect(() => {
    if (PUBLIC_SITE) {
      applyPublicPageSeo(
        tab === "portals" ? AUTH_PAGE_SEO.externalAccess : AUTH_PAGE_SEO.login,
      );
    }
  }, [tab]);

  function selectTab(next: LoginTab) {
    setCompanies(null);
    setNeedCode(false);
    setCode("");
    setCompanyError(null);
    setGoogleError(null);
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === "workspace") p.delete("tab");
        else p.set("tab", next);
        if (next !== "account") {
          p.delete("mode");
          p.delete("scope");
        }
        p.delete("google");
        p.delete("google_error");
        return p;
      },
      { replace: true },
    );
  }

  function selectAccountScope(scope: AccountScope) {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("tab", "account");
        if (scope === "personal") p.delete("scope");
        else p.set("scope", scope);
        if (scope !== "personal") p.delete("mode");
        return p;
      },
      { replace: true },
    );
  }

  async function afterWorkspaceLogin(data: unknown) {
    setCompanies((data as { companies?: CompanyOption[] }).companies ?? []);
  }

  const workspaceLogin = trpc.auth.login.useMutation({
    meta: { errorTitle: "Couldn't sign in" },
    onSuccess: afterWorkspaceLogin,
    onError: (err) => {
      if (err.message === "totp_required") setNeedCode(true);
    },
  });

  const portalLogin = trpc.auth.login.useMutation({
    meta: { errorTitle: "Couldn't sign in" },
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/", { replace: true });
    },
    onError: (err) => {
      if (err.message === "totp_required") setNeedCode(true);
    },
  });

  const fromGoogle = trpc.auth.sessionFromPlatform.useMutation({
    meta: { errorTitle: "Couldn't sign in with Google" },
    onSuccess: afterWorkspaceLogin,
    onError: () =>
      setGoogleError("Google sign-in could not open the workspace — try email and password."),
  });
  const googleStarted = useRef(false);
  useEffect(() => {
    if (params.get("google") === "1" && !googleStarted.current) {
      googleStarted.current = true;
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete("google");
          return p;
        },
        { replace: true },
      );
      fromGoogle.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startGoogle() {
    window.location.href = `/platform/auth/google/start?return=${encodeURIComponent("/login?google=1")}`;
  }

  function selectedCompany(): CompanyOption | null {
    const item = tenant ?? WORKSPACE_ITEM;
    if (item.id === "workspace") return null;
    return companies?.find((c) => (c.publicId ?? c.name) === item.id) ?? null;
  }

  async function enterWorkspace() {
    const company = selectedCompany();
    if (company && password) {
      setCompanyBusy(true);
      await platformLogin(email, password, company.publicId ?? company.name, needCode ? code : undefined);
      setCompanyBusy(false);
    }
    await utils.auth.me.invalidate();
    navigate("/", { replace: true });
  }

  async function openCompanyAccount(company: CompanyOption) {
    if (!password) {
      window.location.href = "/company-account";
      return;
    }
    setCompanyBusy(true);
    setCompanyError(null);
    const res = await platformLogin(
      email,
      password,
      company.publicId ?? company.name,
      needCode ? code : undefined,
    );
    setCompanyBusy(false);
    if (!res.account) {
      setCompanyError("Could not open that company right now — try again.");
      return;
    }
    window.location.href = "/company-account";
  }

  const activeLogin = tab === "portals" ? portalLogin : workspaceLogin;
  const errorText =
    activeLogin.error?.message === "totp_invalid"
      ? "That authenticator code is incorrect."
      : activeLogin.error?.message;
  const showError = Boolean(activeLogin.error) && activeLogin.error?.message !== "totp_required";

  const choosing = Boolean(companies) && tab === "workspace";
  const copy = brandCopy(tab, choosing, accountScope);
  const product =
    tab === "portals"
      ? AORMS_PLATFORM.name
      : tab === "account"
        ? accountScope === "licensing"
          ? HCW_LICENSE_MANAGER.consoleTitle
          : accountScope === "company"
            ? AORMS_PORTALS.account.company
            : AORMS_PORTALS.account.name
        : authProductName();
  const tagline =
    tab === "portals"
      ? AORMS_PORTALS.external.authTagline
      : tab === "account"
        ? accountScope === "licensing"
          ? AORMS_PORTALS.auth.licensingSubline
          : AORMS_PORTALS.account.hubCaption
        : AORMS_PLATFORM.expansion;

  const tabBar = (
    <Tabs
      value={tab}
      onChange={(_, v: LoginTab) => selectTab(v)}
      variant="fullWidth"
      aria-label="Sign-in surface"
      sx={{
        minHeight: 44,
        borderBottom: 1,
        borderColor: "divider",
        "& .MuiTab-root": {
          textTransform: "none",
          minHeight: 44,
          fontWeight: 600,
        },
      }}
    >
      {LOGIN_TABS.map((t) => (
        <Tab key={t.id} value={t.id} label={t.label} />
      ))}
    </Tabs>
  );

  const workspaceOrPortalForm = (
    <Stack spacing={COMPOSITION_RHYTHM.md}>
      {tab === "workspace" && PUBLIC_SITE && !choosing && (
        <Stack spacing={COMPOSITION_RHYTHM.sm}>
          <Button
            variant="outlined"
            size="large"
            fullWidth
            startIcon={<GoogleIconCircle />}
            disabled={fromGoogle.isPending}
            onClick={startGoogle}
          >
            Continue with Google
          </Button>
          <Divider>
            <Typography variant="caption" color="text.secondary">
              or email
            </Typography>
          </Divider>
        </Stack>
      )}

      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          activeLogin.mutate({ email, password, code: needCode ? code : undefined });
        }}
      >
        <Stack spacing={COMPOSITION_RHYTHM.sm}>
          <AuthLabeledField
            id={`${tab}-email`}
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@firm.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <AuthLabeledField
            id={`${tab}-password`}
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {needCode && (
            <AuthLabeledField
              id={`${tab}-totp`}
              label="Authenticator code"
              placeholder="123456"
              autoComplete="one-time-code"
              helperText="6-digit code from your authenticator app."
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          )}
          {showError && (
            <Alert severity="error">
              <AlertTitle>{tab === "portals" ? "Access denied" : "Sign-in failed"}</AlertTitle>
              {errorText}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            endIcon={<ArrowForward />}
            disabled={activeLogin.isPending || (needCode && code.length < 6)}
          >
            {activeLogin.isPending ? "Signing in…" : needCode ? "Verify" : "Sign in"}
          </Button>
        </Stack>
      </Box>

      <Stack
        direction="row"
        spacing={COMPOSITION_RHYTHM.sm}
        sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}
      >
        <Button component={RouterLink} to="/forgot-password" variant="text" size="small">
          Forgot password?
        </Button>
        {tab === "workspace" &&
          (PUBLIC_SITE ? (
            <Button
              variant="text"
              size="small"
              onClick={() => {
                setCompanies(null);
                setNeedCode(false);
                setCode("");
                setParams(
                  (prev) => {
                    const p = new URLSearchParams(prev);
                    p.set("tab", "account");
                    p.set("mode", "create");
                    p.delete("google");
                    p.delete("google_error");
                    return p;
                  },
                  { replace: true },
                );
              }}
            >
              {AORMS_PORTALS.account.create}
            </Button>
          ) : (
            <Button component={RouterLink} to="/signup" variant="text" size="small">
              Create account
            </Button>
          ))}
      </Stack>
    </Stack>
  );

  const destinationPicker = companies ? (
    (() => {
      const owned = companies.filter((c) => c.role === "OWNER");
      const current = selectedCompany();
      const accountCompany =
        current && current.role === "OWNER"
          ? current
          : owned.length === 1
            ? owned[0]!
            : null;
      const showDropdown = companies.length > 1 || owned.length > 1;
      const tenantItems = [WORKSPACE_ITEM, ...companies.map(companyItem)];
      return (
        <Stack spacing={COMPOSITION_RHYTHM.sm}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            endIcon={<ArrowForward />}
            disabled={companyBusy}
            onClick={() => void enterWorkspace()}
          >
            {companyBusy ? "Opening…" : "Open workspace"}
          </Button>
          <Button
            component={RouterLink}
            to="/account"
            variant="outlined"
            size="large"
            fullWidth
            disabled={companyBusy}
          >
            {AORMS_PORTALS.account.myAccount}
          </Button>
          {owned.length > 0 ? (
            <Button
              variant="outlined"
              size="large"
              fullWidth
              disabled={companyBusy || !accountCompany}
              onClick={() => accountCompany && void openCompanyAccount(accountCompany)}
            >
              {accountCompany
                ? `Company account — ${accountCompany.name}`
                : "Company account (owner only)"}
            </Button>
          ) : (
            <Button
              component={RouterLink}
              to="/account#join"
              variant="outlined"
              size="large"
              fullWidth
              disabled={companyBusy}
            >
              Request to join a company
            </Button>
          )}
          {showDropdown ? (
            <AuthLabeledField
              id="tenant-select"
              label="Workspace context (optional)"
              select
              size="small"
              value={(tenant ?? WORKSPACE_ITEM).id}
              onChange={(e) =>
                setTenant(tenantItems.find((item) => item.id === e.target.value) ?? null)
              }
            >
              {tenantItems.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.label}
                </MenuItem>
              ))}
            </AuthLabeledField>
          ) : null}
          {companyError && (
            <Alert severity="error">
              <AlertTitle>Could not open the company</AlertTitle>
              {companyError}
            </Alert>
          )}
          <Button variant="text" size="small" onClick={() => setCompanies(null)}>
            Sign in as someone else
          </Button>
        </Stack>
      );
    })()
  ) : null;

  const formPane = (
    <Stack spacing={COMPOSITION_RHYTHM.sm}>
      {fromGoogle.isPending && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Completing Google sign-in…
          </Typography>
        </Stack>
      )}

      {googleError && tab === "workspace" && !companies && (
        <Alert severity="warning" onClose={() => setGoogleError(null)}>
          <AlertTitle>Google sign-in</AlertTitle>
          {googleError}
        </Alert>
      )}

      {choosing
        ? destinationPicker
        : tab === "account"
          ? (
              <Stack spacing={COMPOSITION_RHYTHM.sm}>
                <Stack
                  direction="row"
                  spacing={COMPOSITION_RHYTHM.xs}
                  useFlexGap
                  sx={{ flexWrap: "wrap", gap: 0.5 }}
                >
                  {ACCOUNT_SCOPES.map((s) => (
                    <Button
                      key={s.id}
                      size="small"
                      variant={accountScope === s.id ? "contained" : "text"}
                      color={accountScope === s.id ? "primary" : "inherit"}
                      onClick={() => selectAccountScope(s.id)}
                      sx={{ textTransform: "none", minHeight: 32, borderRadius: "8px" }}
                    >
                      {s.label}
                    </Button>
                  ))}
                </Stack>
                <Suspense
                  fallback={
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  }
                >
                  <PlatformLogin
                    key={accountScope}
                    portal={accountScope !== "licensing"}
                    companyPortal={accountScope === "company"}
                    embedded
                    initialMode={
                      wantsCreate && accountScope === "personal" ? "register" : "signin"
                    }
                    onLogin={(_me: Me) => {
                      if (accountScope === "company") {
                        window.location.href = "/company-account";
                      } else if (accountScope === "licensing") {
                        window.location.href = "/platform-admin";
                      } else {
                        window.location.href = "/account";
                      }
                    }}
                    onBack={() => selectTab("workspace")}
                  />
                </Suspense>
              </Stack>
            )
          : workspaceOrPortalForm}

      {!choosing && tab !== "account" && (
        <Button
          component={isPlatformHost() ? RouterLink : "a"}
          {...(isPlatformHost() ? { to: "/" } : { href: platformHomeHref() })}
          variant="text"
          size="small"
          fullWidth
          startIcon={<ArrowBack />}
        >
          Back to home
        </Button>
      )}
    </Stack>
  );

  const rail = (
    <AuthSplitCard
      brand={
        <AuthBrandPane
          product={product}
          tagline={tagline}
          title={copy.title}
          lead={copy.lead}
        />
      }
      header={tabBar}
    >
      {formPane}
    </AuthSplitCard>
  );

  return (
    <AuthRailLayout
      variant={tab === "portals" ? "external" : tab === "account" ? "portal" : "workspace"}
      showMarketingFooter={false}
      layout="horizontal"
      rail={rail}
    />
  );
}
