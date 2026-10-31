import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { buttonGhostSmall, buttonPrimarySmall, focusRing } from "./ui";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-2 py-2 sm:px-3 text-sm font-medium transition duration-300 ease-soft ${focusRing} ${
    isActive ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
  }`;

// Full width bar for the app itself. The floating pill stays on the landing
// page; inside the app the space goes to problems and code.
export default function AppNav() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-0/80 px-4 backdrop-blur-xl">
      <nav aria-label="App" className="mx-auto flex h-16 max-w-6xl items-center gap-2">
        <Link to="/" className={`mr-2 rounded-lg sm:mr-4 ${focusRing}`} aria-label="YZU Judge home">
          <Logo compact />
        </Link>

        <NavLink to="/problems" className={linkClass}>
          Problems
        </NavLink>
        <NavLink to="/submissions" className={linkClass}>
          Submissions
        </NavLink>
        <NavLink to="/mock" className={linkClass}>
          <span className="sm:hidden">Mock</span>
          <span className="hidden sm:inline">Mock CPE</span>
        </NavLink>
        {user?.is_admin && (
          // Admin work happens on a laptop; the phone nav has no room for it.
          <NavLink to="/admin" className={(state) => `${linkClass(state)} hidden sm:inline-flex`}>
            Admin
          </NavLink>
        )}

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <NavLink to="/account" className={linkClass} aria-label="Your account">
              <span className="flex items-center gap-2">
                <Avatar name={user.username} />
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
