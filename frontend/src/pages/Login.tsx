import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import AuthLayout from "../components/AuthLayout";
import Field from "../components/Field";
import { buttonPrimary, focusRing } from "../components/ui";

interface Errors {
  username?: string;
  password?: string;
}

export default function Login() {
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname ?? "/problems";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const nextErrors: Errors = {};
    if (!username.trim()) nextErrors.username = "Enter your username.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to keep practicing for the CPE.">
      {sessionExpired && (
        <p role="status" className="mb-6 rounded-lg border border-yzu-yellow/40 bg-yzu-yellow/10 px-3 py-2 text-sm text-yzu-yellow">
          Your session expired. Sign in again to continue where you left off.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <Field
          id="username"
          label="Username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          error={errors.username}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />

        {error && (
          <p role="alert" className="rounded-lg border border-yzu-red/40 bg-yzu-red/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button type="submit" disabled={isSubmitting} className={buttonPrimary}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-neutral-400">
        New to YZU Judge?{" "}
        <Link to="/register" className={`rounded-sm font-semibold text-white underline-offset-4 hover:underline ${focusRing}`}>
          Create a free account
        </Link>
      </p>
    </AuthLayout>
  );
}
