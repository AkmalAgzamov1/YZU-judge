import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import AppShell from "../components/AppShell";
import { buttonPrimary } from "../components/ui";
import { useAuth } from "./AuthContext";

// Hides admin pages in the UI. The backend still checks every admin request.
export default function RequireAdmin() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div aria-busy="true" aria-label="Loading" className="min-h-svh bg-ink-0" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!user.is_admin) {
    return (
      <AppShell>
        <div className="mx-auto flex max-w-xl flex-col items-center py-24 text-center">
          <h1 className="text-3xl font-semibold text-white">Admins only</h1>
          <p className="mt-3 text-base text-neutral-400">This part of YZU Judge is for the people who add problems.</p>
          <Link to="/problems" className={`${buttonPrimary} mt-8`}>
            Back to problems
          </Link>
        </div>
      </AppShell>
    );
  }

  return <Outlet />;
}
