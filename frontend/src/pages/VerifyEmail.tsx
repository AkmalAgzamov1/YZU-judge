import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError, authApi } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import AuthLayout from "../components/AuthLayout";
import CodeField from "../components/CodeField";
import JunkMailNotice from "../components/JunkMailNotice";
import { buttonPrimary, focusRing } from "../components/ui";
import { isSixDigits, useCooldown } from "../lib/useCooldown";

// Keeps the address through a page reload; router state alone would lose it.
const PENDING_EMAIL_KEY = "yzu-judge:pending-email";

interface VerifyState {
  email?: string;
  from?: string;
}

function readPendingEmail(): string {
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function writePendingEmail(email: string | null) {
  try {
    if (email) sessionStorage.setItem(PENDING_EMAIL_KEY, email);
    else sessionStorage.removeItem(PENDING_EMAIL_KEY);
  } catch {
    // Private windows may block storage; the page still works without it.
  }
}

function message(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}

export default function VerifyEmail() {
  const { signInWithToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? null) as VerifyState | null;
  const email = state?.email ?? readPendingEmail();

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A code was sent just before this page opened.
  const cooldown = useCooldown(60);

  useEffect(() => {
    if (state?.email) writePendingEmail(state.email);
  }, [state?.email]);

  if (!email) {
    return <Navigate to="/register" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!isSixDigits(code)) {
      setCodeError("Enter the 6-digit code from the email.");
      return;
    }
    setCodeError("");
    setIsSubmitting(true);

    try {
      const result = await authApi.verifyEmail(email, code);
      await signInWithToken(result.access_token);
      writePendingEmail(null);
      navigate(state?.from ?? "/problems", { replace: true });
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
      await authApi.resendCode(email);
      setNotice("We sent a new code. The old one no longer works.");
      setCode("");
      cooldown.start();
    } catch (err) {
      setError(message(err));
    }
  }

  return (
    <AuthLayout title="Check your email" subtitle={`We sent a 6-digit code to ${email}.`}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <CodeField value={code} onChange={setCode} error={codeError} />

        <JunkMailNotice email={email} />

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

        <button type="submit" disabled={isSubmitting} className={buttonPrimary}>
          {isSubmitting ? "Checking…" : "Verify and sign in"}
        </button>
      </form>

      <div className="mt-8 flex flex-col items-center gap-3 text-sm text-neutral-400">
        <p>
          No email? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown.secondsLeft > 0}
            className={`rounded-sm font-semibold text-white underline-offset-4 hover:underline disabled:cursor-default disabled:font-normal disabled:text-neutral-500 disabled:no-underline ${focusRing}`}
          >
            {cooldown.secondsLeft > 0 ? `send a new code in ${cooldown.secondsLeft}s` : "send a new code"}
          </button>
          .
        </p>
        <p>
          Wrong email?{" "}
          <Link to="/register" className={`rounded-sm font-semibold text-white underline-offset-4 hover:underline ${focusRing}`}>
            Sign up again
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
