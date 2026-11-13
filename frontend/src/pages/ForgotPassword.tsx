import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, authApi } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import AuthLayout from "../components/AuthLayout";
import CodeField from "../components/CodeField";
import JunkMailNotice from "../components/JunkMailNotice";
import Field from "../components/Field";
import { buttonPrimary, focusRing } from "../components/ui";
import { useI18n } from "../i18n";
import { tr } from "../i18n/translate";
import { isSixDigits, useCooldown } from "../lib/useCooldown";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Errors {
  email?: string;
  code?: string;
  password?: string;
  confirmPassword?: string;
}

function message(error: unknown): string {
  return error instanceof ApiError ? error.message : tr("Something went wrong. Please try again.");
}

export default function ForgotPassword() {
  const { signInWithToken } = useAuth();
  const { t, tx } = useI18n();
  const navigate = useNavigate();
  const cooldown = useCooldown();

  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function sendCode() {
    await authApi.forgotPassword(email.trim());
    cooldown.start();
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim()) return setErrors({ email: t("Enter the email you signed up with.") });
    if (!EMAIL_PATTERN.test(email.trim())) return setErrors({ email: t("That email address looks incomplete.") });
    setErrors({});
    setIsSubmitting(true);

    try {
      await sendCode();
      setStep("reset");
    } catch (err) {
      setError(message(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const nextErrors: Errors = {};
    if (!isSixDigits(code)) nextErrors.code = t("Enter the 6-digit code from the email.");
    if (!password) nextErrors.password = t("Choose a new password.");
    else if (password.length < 8) nextErrors.password = t("Use at least 8 characters.");
    if (!confirmPassword) nextErrors.confirmPassword = t("Type your new password again.");
    else if (confirmPassword !== password) nextErrors.confirmPassword = t("Passwords do not match.");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const result = await authApi.resetPassword({ email: email.trim(), code, password });
      await signInWithToken(result.access_token);
      navigate("/problems", { replace: true });
    } catch (err) {
      setError(message(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError("");
    setNotice("");

    try {
      await sendCode();
      setCode("");
      setNotice(t("If the email has an account, a new code is on its way."));
    } catch (err) {
      setError(message(err));
    }
  }

  const alerts = (
    <>
      {notice && (
        <p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-yzu-red/40 bg-yzu-red/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </>
  );

  if (step === "email") {
    return (
      <AuthLayout title={t("Reset your password")} subtitle={t("We will email you a code to choose a new one.")}>
        <form onSubmit={handleEmailSubmit} noValidate className="flex flex-col gap-6">
          <Field
            id="email"
            label={t("Email")}
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
          />
          {alerts}
          <button type="submit" disabled={isSubmitting} className={buttonPrimary}>
            {isSubmitting ? t("Sending…") : t("Send code")}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-neutral-400">
          {t("Remembered it?")}{" "}
          <Link to="/login" className={`rounded-sm font-semibold text-white underline-offset-4 hover:underline ${focusRing}`}>
            {t("Sign in")}
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t("Choose a new password")}
      subtitle={t("If {email} has an account, we sent it a 6-digit code.", { email: email.trim() })}
    >
      <form onSubmit={handleResetSubmit} noValidate className="flex flex-col gap-6">
        <CodeField value={code} onChange={setCode} error={errors.code} />
        <JunkMailNotice email={email} />
        <Field
          id="password"
          label={t("New password")}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          hint={t("At least 8 characters.")}
        />
        <Field
          id="confirm-password"
          label={t("Confirm new password")}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={errors.confirmPassword}
        />
        {alerts}
        <button type="submit" disabled={isSubmitting} className={buttonPrimary}>
          {isSubmitting ? t("Saving…") : t("Save and sign in")}
        </button>
      </form>

      <div className="mt-8 flex flex-col items-center gap-3 text-sm text-neutral-400">
        <p>
          {tx("No email? Check your spam folder, or {resend}.", {
            resend: (
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown.secondsLeft > 0}
                className={`rounded-sm font-semibold text-white underline-offset-4 hover:underline disabled:cursor-default disabled:font-normal disabled:text-neutral-500 disabled:no-underline ${focusRing}`}
              >
                {cooldown.secondsLeft > 0
                  ? t("send a new code in {seconds}s", { seconds: cooldown.secondsLeft })
                  : t("send a new code")}
              </button>
            ),
          })}
        </p>
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setCode("");
            setError("");
            setNotice("");
          }}
          className={`rounded-sm font-semibold text-white underline-offset-4 hover:underline ${focusRing}`}
        >
          {t("Use a different email")}
        </button>
      </div>
    </AuthLayout>
  );
}
