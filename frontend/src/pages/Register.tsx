import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import AuthLayout from "../components/AuthLayout";
import Field from "../components/Field";
import { buttonPrimary, focusRing } from "../components/ui";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Errors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function validate(
  username: string,
  email: string,
  password: string,
  confirmPassword: string,
): Errors {
  const errors: Errors = {};

  if (!username.trim()) errors.username = "Choose a username.";
  else if (username.trim().length < 3) errors.username = "Use at least 3 characters.";

  if (!email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "That email address looks incomplete.";

  if (!password) errors.password = "Choose a password.";
  else if (password.length < 8) errors.password = "Use at least 8 characters.";

  if (!confirmPassword) errors.confirmPassword = "Type your password again.";
  else if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match.";

  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const nextErrors = validate(username, email, password, confirmPassword);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      await register(username.trim(), email.trim(), password);
      navigate("/problems", { replace: true });
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
    <AuthLayout
      title="Create your account"
      subtitle="Free for every YZU student."
    >
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
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="s1131234@mail.yzu.edu.tw"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          hint="At least 8 characters."
        />
        <Field
          id="confirm-password"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={errors.confirmPassword}
        />

        {error && (
          <p role="alert" className="rounded-lg border border-yzu-red/40 bg-yzu-red/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button type="submit" disabled={isSubmitting} className={buttonPrimary}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>

        <p className="text-center text-xs text-neutral-500">
          By creating an account, you agree to the{" "}
          <Link to="/terms" className={`rounded-sm text-neutral-300 underline underline-offset-2 hover:text-white ${focusRing}`}>
            Terms of use
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className={`rounded-sm text-neutral-300 underline underline-offset-2 hover:text-white ${focusRing}`}>
            Privacy policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-neutral-400">
        Already have an account?{" "}
        <Link to="/login" className={`rounded-sm font-semibold text-white underline-offset-4 hover:underline ${focusRing}`}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
