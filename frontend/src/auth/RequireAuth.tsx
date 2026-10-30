import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

function AccountSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your account" className="px-4 pt-24">
      <div className="mx-auto max-w-4xl animate-pulse pt-16">
        <div className="h-4 w-48 rounded bg-ink-2" />
        <div className="mt-3 h-10 w-64 rounded-lg bg-ink-2" />
        <div className="mt-12 h-64 rounded-3xl bg-ink-1" />
      </div>
    </div>
  );
}

export default function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AccountSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
