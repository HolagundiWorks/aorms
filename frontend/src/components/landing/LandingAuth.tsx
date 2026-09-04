/** Sign in / create workspace / password reset — embedded on the landing page. Pure Carbon. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Form,
  InlineNotification,
  PasswordInput,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  TextInput,
} from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { trpc } from "../../lib/trpc.js";
import { AORMS_OFFICE_HUB } from "../../lib/product-nomenclature.js";

function startGoogle() {
  window.location.href = `/platform/auth/google/start?return=${encodeURIComponent("/#sign-in")}`;
}

function SignInPanel() {
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
    login.error?.message === "totp_invalid" ? "That authenticator code is incorrect." : login.error?.message;
  const showError = Boolean(login.error) && login.error?.message !== "totp_required";

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        login.mutate({ email, password, code: needCode ? code : undefined });
      }}
    >
      <Stack gap={5}>
        <Button kind="tertiary" renderIcon={ArrowRight} onClick={startGoogle} type="button">
          Continue with Google
        </Button>
        <TextInput
          id="signin-email"
          labelText="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <PasswordInput
          id="signin-password"
          labelText="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {needCode ? (
          <TextInput
            id="signin-totp"
            labelText="Authenticator code"
            placeholder="123456"
            autoComplete="one-time-code"
            helperText="6-digit code from your authenticator app."
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        ) : null}
        {showError ? <InlineNotification kind="error" title="Sign-in failed" subtitle={errorText} lowContrast /> : null}
        <Button type="submit" renderIcon={ArrowRight} disabled={login.isPending || (needCode && code.length < 6)}>
          {login.isPending ? "Signing in…" : needCode ? "Verify" : "Sign in"}
        </Button>
      </Stack>
    </Form>
  );
}

function CreateWorkspacePanel({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const bootstrap = trpc.auth.bootstrap.useMutation({
    meta: { errorTitle: "Couldn't create the account" },
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/", { replace: true });
    },
  });

  const passwordTooShort = password.length > 0 && password.length < 8;

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        bootstrap.mutate({ companyName, adminName, email, password });
      }}
    >
      <Stack gap={5}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
          Create your firm and admin account. Your Standard AORMS licence includes the full
          workspace and 5 GB storage.
        </p>
        <TextInput
          id="signup-company"
          labelText="Firm name"
          autoComplete="organization"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />
        <TextInput
          id="signup-name"
          labelText="Your name (admin)"
          autoComplete="name"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          required
        />
        <TextInput
          id="signup-email"
          labelText="Admin email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <PasswordInput
          id="signup-password"
          labelText="Password"
          autoComplete="new-password"
          helperText="At least 8 characters."
          invalid={passwordTooShort}
          invalidText="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {bootstrap.error ? (
          <InlineNotification kind="error" title="Setup failed" subtitle={bootstrap.error.message} lowContrast />
        ) : null}
        <Button type="submit" renderIcon={ArrowRight} disabled={bootstrap.isPending || password.length < 8}>
          {bootstrap.isPending ? "Setting up…" : "Create workspace"}
        </Button>
        <Button kind="ghost" type="button" onClick={onDone}>
          Already set up? Sign in
        </Button>
      </Stack>
    </Form>
  );
}

function ForgotPasswordPanel({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const request = trpc.auth.requestPasswordReset.useMutation({
    meta: { errorTitle: "Couldn't send the reset email" },
  });

  if (request.isSuccess) {
    return (
      <Stack gap={5}>
        <InlineNotification
          kind="success"
          lowContrast
          title="Check your email"
          subtitle="If that email has an account, a reset link is on its way. The link is valid for 1 hour."
        />
        <Button kind="ghost" type="button" onClick={onDone}>
          Back to sign in
        </Button>
      </Stack>
    );
  }

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        request.mutate({ email });
      }}
    >
      <Stack gap={5}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
          Enter your email and we'll send a reset link if an account exists.
        </p>
        <TextInput
          id="forgot-email"
          labelText="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {request.error ? <InlineNotification kind="error" title="Couldn't send the reset email" subtitle={request.error.message} lowContrast /> : null}
        <Button type="submit" renderIcon={ArrowRight} disabled={request.isPending || !email}>
          {request.isPending ? "Sending…" : "Send reset link"}
        </Button>
        <Button kind="ghost" type="button" onClick={onDone}>
          Back to sign in
        </Button>
      </Stack>
    </Form>
  );
}

function ResetPasswordPanel({ token, onDone }: { token: string; onDone: () => void }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const reset = trpc.auth.resetPassword.useMutation({
    meta: { errorTitle: "Couldn't reset the password" },
    onSuccess: () => setTimeout(() => navigate("/", { replace: true }), 1500),
  });
  const mismatch = confirm.length > 0 && password !== confirm;

  if (reset.isSuccess) {
    return (
      <InlineNotification
        kind="success"
        lowContrast
        title="Password updated"
        subtitle="You can now sign in with your new password. Redirecting…"
      />
    );
  }

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        if (!mismatch) reset.mutate({ token, password });
      }}
    >
      <Stack gap={5}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
          Choose a new password for your workspace.
        </p>
        <PasswordInput
          id="reset-password"
          labelText="New password"
          autoComplete="new-password"
          helperText="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <PasswordInput
          id="reset-confirm"
          labelText="Confirm password"
          autoComplete="new-password"
          invalid={mismatch}
          invalidText="Passwords don't match."
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {reset.error ? <InlineNotification kind="error" title="Couldn't reset the password" subtitle={reset.error.message} lowContrast /> : null}
        <Button type="submit" renderIcon={ArrowRight} disabled={reset.isPending || password.length < 8 || mismatch}>
          {reset.isPending ? "Updating…" : "Set new password"}
        </Button>
        <Button kind="ghost" type="button" onClick={onDone}>
          Back to sign in
        </Button>
      </Stack>
    </Form>
  );
}

/** Embedded sign-in / create-workspace / password-reset — landing page, no dedicated auth routes. */
export function LandingAuth() {
  const [tab, setTab] = useState<0 | 1 | 2>(0);
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Password-reset links arrive as /#sign-in?token=... or /?token=...#sign-in — read once.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) setResetToken(token);
  }, []);

  if (resetToken) {
    return (
      <div style={{ maxWidth: 420 }}>
        <h2 className="cds--type-heading-04" style={{ marginBottom: "1.5rem" }}>
          Choose a new password
        </h2>
        <ResetPasswordPanel token={resetToken} onDone={() => setResetToken(null)} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h2 className="cds--type-heading-04" style={{ marginBottom: "0.25rem" }}>
        Sign in to {AORMS_OFFICE_HUB.title}
      </h2>
      <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}>
        One sign-in for your office hub. No desktop apps required.
      </p>
      <Tabs selectedIndex={tab} onChange={({ selectedIndex }) => setTab(selectedIndex as 0 | 1 | 2)}>
        <TabList aria-label="Sign in or create a workspace">
          <Tab>Sign in</Tab>
          <Tab>Create workspace</Tab>
          <Tab>Forgot password</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div style={{ paddingTop: "1.5rem" }}>
              <SignInPanel />
            </div>
          </TabPanel>
          <TabPanel>
            <div style={{ paddingTop: "1.5rem" }}>
              <CreateWorkspacePanel onDone={() => setTab(0)} />
            </div>
          </TabPanel>
          <TabPanel>
            <div style={{ paddingTop: "1.5rem" }}>
              <ForgotPasswordPanel onDone={() => setTab(0)} />
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
