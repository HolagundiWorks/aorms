import ArrowBack from "@mui/icons-material/ArrowBack";
import { Alert, AlertTitle, Button, Link, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";
import { AuthBrandBlock } from "../components/AormsLogo.js";
import { AuthRailLayout } from "../components/AuthRailLayout.js";
import { AUTH_PAGE_SEO, applyPublicPageSeo } from "../lib/public-page-seo.js";
import { trpc } from "../lib/trpc.js";

/** External-party access page (/access). */
export function ExternalLogin() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);

  const login = trpc.auth.login.useMutation({
    meta: { errorTitle: "Couldn't sign in" },
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/", { replace: true });
    },
    onError: (err) => {
      if (err.message === "totp_required") setNeedCode(true);
    },
  });

  const errorText =
    login.error?.message === "totp_invalid"
      ? "That code is incorrect — try the current 6-digit code."
      : login.error?.message;
  const showError = Boolean(login.error) && login.error?.message !== "totp_required";

  useEffect(() => {
    applyPublicPageSeo(AUTH_PAGE_SEO.externalAccess);
  }, []);

  const form = (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <AuthBrandBlock tagline={AORMS_PORTALS.external.authTagline} />
        <h1 className="esti-label">{AORMS_PORTALS.external.stageHeadline}</h1>
        <p>
          {AORMS_PORTALS.external.signInIntro}
          If you are an office team member, use{" "}
          <Link component={RouterLink} to="/login">
            {AORMS_PORTALS.studio.signInTitle}
          </Link>
          .
        </p>
      </Stack>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate({ email, password, code: needCode ? code : undefined });
        }}
      >
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography
              component="label"
              htmlFor="access-email"
              variant="body2"
              sx={{ fontWeight: 600 }}
            >
              Email
            </Typography>
            <TextField
              id="access-email"
              type="email"
              autoComplete="email"
              placeholder="you@firm.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              aria-label="Email"
            />
          </Stack>
          <Stack spacing={0.75}>
            <Typography
              component="label"
              htmlFor="access-password"
              variant="body2"
              sx={{ fontWeight: 600 }}
            >
              Password
            </Typography>
            <TextField
              id="access-password"
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
                htmlFor="access-totp"
                variant="body2"
                sx={{ fontWeight: 600 }}
              >
                Authenticator code
              </Typography>
              <TextField
                id="access-totp"
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
              <AlertTitle>Access denied</AlertTitle>
              {errorText}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={login.isPending || (needCode && code.length < 6)}
          >
            {login.isPending ? "Signing in…" : needCode ? "Verify" : "Sign in"}
          </Button>
          <Link component={RouterLink} to="/forgot-password" variant="body2">
            Forgot password?
          </Link>
        </Stack>
      </form>

      <Button component={RouterLink} to="/" variant="text" size="small" startIcon={<ArrowBack />}>
        Back to home
      </Button>
    </Stack>
  );

  return <AuthRailLayout variant="external" showMarketingFooter={false} rail={form} />;
}
