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
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { login as platformLogin } from "../platform-admin/lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { AuthBrandBlock } from "../components/AormsLogo.js";
import { AORMS_STUDIO, AORMS_PORTALS } from "../lib/product-nomenclature.js";
import { AuthRailLayout } from "../components/AuthRailLayout.js";
import { GoogleIconCircle } from "../components/GoogleIconCircle.js";
import { COMPOSITION_RHYTHM } from "../lib/composition.js";
import { AUTH_PAGE_SEO, applyPublicPageSeo } from "../lib/public-page-seo.js";
import { isPlatformHost, platformHomeHref } from "../lib/aorms-surface-urls.js";

const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE !== "false";

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

/**
 * AStudio staff sign-in — horizontal brand | form card.
 * Canon: COMPOSITION-PRINCIPLES · AuthRailLayout soft card.
 */
export function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [params, setParams] = useSearchParams();

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
    if (PUBLIC_SITE) applyPublicPageSeo(AUTH_PAGE_SEO.login);
  }, []);

  async function afterLogin(data: unknown) {
    setCompanies((data as { companies?: CompanyOption[] }).companies ?? []);
  }

  const login = trpc.auth.login.useMutation({
    meta: { errorTitle: "Couldn't sign in" },
    onSuccess: afterLogin,
    onError: (err) => {
      if (err.message === "totp_required") setNeedCode(true);
    },
  });

  const fromGoogle = trpc.auth.sessionFromPlatform.useMutation({
    meta: { errorTitle: "Couldn't sign in with Google" },
    onSuccess: afterLogin,
    onError: () => setGoogleError("Google sign-in could not open the workspace — try email and password."),
  });
  const googleStarted = useRef(false);
  useEffect(() => {
    if (params.get("google") === "1" && !googleStarted.current) {
      googleStarted.current = true;
      setParams({}, { replace: true });
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
    const res = await platformLogin(email, password, company.publicId ?? company.name, needCode ? code : undefined);
    setCompanyBusy(false);
    if (!res.account) {
      setCompanyError("Could not open that company right now — try again.");
      return;
    }
    window.location.href = "/company-account";
  }

  const errorText =
    login.error?.message === "totp_invalid"
      ? "That authenticator code is incorrect."
      : login.error?.message;
  const showError = Boolean(login.error) && login.error?.message !== "totp_required";

  const title = companies ? "Choose where to go" : "Sign in";
  const lead = companies
    ? "Open your workspace, manage your account, or review your company."
    : PUBLIC_SITE
      ? `${AORMS_STUDIO.title} — architecture consultancy workspace for Indian practices.`
      : "Sign in, then choose your workspace, account, or company.";

  const brandPane = (
    <Stack
      className="esti-auth-card__brand"
      spacing={COMPOSITION_RHYTHM.md}
      sx={{
        flex: { md: "0 0 42%" },
        width: { xs: "100%", md: "auto" },
        p: { xs: COMPOSITION_RHYTHM.md, md: COMPOSITION_RHYTHM.lg },
        justifyContent: "center",
        borderBottom: { xs: 1, md: 0 },
        borderRight: { xs: 0, md: 1 },
        borderColor: "divider",
        backgroundColor: "action.hover",
      }}
    >
      <AuthBrandBlock
        product={AORMS_STUDIO.title}
        tagline={AORMS_STUDIO.expansion}
        logoVariant="stage"
      />
      <Box>
        <Typography variant="h4" component="h1" className="esti-auth-title">
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          className="esti-auth-lead"
          sx={{ mt: 1 }}
        >
          {lead}
        </Typography>
      </Box>
    </Stack>
  );

  const formPane = (
    <Stack
      className="esti-auth-form"
      spacing={COMPOSITION_RHYTHM.md}
      sx={{
        flex: 1,
        minWidth: 0,
        p: { xs: COMPOSITION_RHYTHM.md, md: COMPOSITION_RHYTHM.lg },
        justifyContent: "center",
      }}
    >
      {fromGoogle.isPending && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Completing Google sign-in…
          </Typography>
        </Stack>
      )}

      {googleError && !companies && (
        <Alert severity="warning" onClose={() => setGoogleError(null)}>
          <AlertTitle>Google sign-in</AlertTitle>
          {googleError}
        </Alert>
      )}

      {companies ? (
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
                <TextField
                  id="tenant-select"
                  select
                  label="Workspace context (optional)"
                  size="small"
                  fullWidth
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
                </TextField>
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
      ) : (
        <Stack spacing={COMPOSITION_RHYTHM.md}>
          {PUBLIC_SITE && (
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
              login.mutate({ email, password, code: needCode ? code : undefined });
            }}
          >
            <Stack spacing={COMPOSITION_RHYTHM.sm}>
              <Stack spacing={0.75}>
                <Typography
                  component="label"
                  htmlFor="email"
                  variant="body2"
                  sx={{ fontWeight: 600 }}
                >
                  Email
                </Typography>
                <TextField
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@firm.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  autoFocus
                  aria-label="Email"
                />
              </Stack>
              <Stack spacing={0.75}>
                <Typography
                  component="label"
                  htmlFor="password"
                  variant="body2"
                  sx={{ fontWeight: 600 }}
                >
                  Password
                </Typography>
                <TextField
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  aria-label="Password"
                />
              </Stack>
              {needCode && (
                <Stack spacing={0.75}>
                  <Typography
                    component="label"
                    htmlFor="totp-code"
                    variant="body2"
                    sx={{ fontWeight: 600 }}
                  >
                    Authenticator code
                  </Typography>
                  <TextField
                    id="totp-code"
                    placeholder="123456"
                    autoComplete="one-time-code"
                    helperText="6-digit code from your authenticator app."
                    slotProps={{ htmlInput: { inputMode: "numeric" } }}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    fullWidth
                    aria-label="Authenticator code"
                  />
                </Stack>
              )}
              {showError && (
                <Alert severity="error">
                  <AlertTitle>Sign-in failed</AlertTitle>
                  {errorText}
                </Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                endIcon={<ArrowForward />}
                disabled={login.isPending || (needCode && code.length < 6)}
              >
                {login.isPending ? "Signing in…" : needCode ? "Verify" : "Sign in"}
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
            {PUBLIC_SITE ? (
              <Button component={RouterLink} to="/account?mode=create" variant="text" size="small">
                {AORMS_PORTALS.account.create}
              </Button>
            ) : (
              <Button component={RouterLink} to="/signup" variant="text" size="small">
                Create account
              </Button>
            )}
          </Stack>
        </Stack>
      )}

      {!companies && (
        <Stack
          spacing={0.5}
          sx={{ pt: COMPOSITION_RHYTHM.sm, borderTop: 1, borderColor: "divider" }}
        >
          {PUBLIC_SITE && (
            <Button component={RouterLink} to="/account" variant="text" size="small" fullWidth>
              Manage your {AORMS_PORTALS.account.name} &amp; licence
            </Button>
          )}
          <Button component={RouterLink} to="/access" variant="text" size="small" fullWidth>
            {AORMS_PORTALS.external.loginPageLink}
          </Button>
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
        </Stack>
      )}
    </Stack>
  );

  const form = (
    <Box
      className="esti-auth-card__split"
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: "stretch",
        minHeight: { md: 440 },
      }}
    >
      {brandPane}
      {formPane}
    </Box>
  );

  return (
    <AuthRailLayout
      variant="workspace"
      showMarketingFooter={false}
      layout="horizontal"
      rail={form}
    />
  );
}
