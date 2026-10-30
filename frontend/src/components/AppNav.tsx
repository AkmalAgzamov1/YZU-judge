import { UserCircle } from "@phosphor-icons/react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Logo from "./Logo";
import { buttonGhostSmall, buttonPrimarySmall, focusRing } from "./ui";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition duration-300 ease-soft ${focusRing} ${
    isActive ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
  }`;

// Full width bar for the app itself. The floating pill stays on the landing
// page; inside the app the space goes to problems and code.
export default function AppNav() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-0/80 px-4 backdrop-blur-xl">
      <nav aria-label="App" className="mx-auto flex h-16 max-w-6xl items-center gap-2">
        <Link to="/" className={`mr-4 rounded-lg ${focusRing}`} aria-label="YZU Judge home">
          <Logo />
        </Link>

        <NavLink to="/problems" className={linkClass}>
          Problems
        </NavLink>
        <span
          aria-disabled="true"
          title="Coming soon"
          className="hidden cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 sm:flex"
        >
          Submissions
          <span className="rounded bg-ink-2 px-1 py-0.5 font-mono text-xs text-neutral-500">soon</span>
        </span>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <NavLink to="/account" className={linkClass} aria-label="Your account">
              <span className="flex items-center gap-2">
                <UserCircle size={20} aria-hidden="true" />
                <span className="hidden sm:inline">{user.username}</span>
              </span>
            </NavLink>
          ) : (
            <>
              <Link to="/login" className={buttonGhostSmall}>
                Sign in
              </Link>
              <Link to="/register" className={`${buttonPrimarySmall} hidden sm:inline-flex`}>
                Create account
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
