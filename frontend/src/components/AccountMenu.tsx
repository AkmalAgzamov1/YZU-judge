import { ClockCounterClockwise, GearSix, ShieldCheck, SignOut } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n";
import Avatar from "./Avatar";
import { focusRing } from "./ui";

const itemClass = `flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-neutral-300 transition duration-200 ease-soft hover:bg-ink-3 hover:text-white ${focusRing}`;

// The signed in user's avatar. Everything about "me" (my submissions, my account,
// admin, signing out) lives behind it, so the bar itself keeps only the main sections.
export default function AccountMenu() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Close when the page changes, so the menu never stays open over the next page.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!user) return null;

  const item = (to: string, icon: ReactNode, label: string) => (
    <Link to={to} className={itemClass}>
      {icon}
      {label}
    </Link>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t("Your account")}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-10 items-center rounded-lg px-2 transition duration-300 ease-soft active:scale-[0.98] ${
          open ? "bg-white/10" : "hover:bg-white/10"
        } ${focusRing}`}
      >
        <Avatar name={user.username} />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-white/10 bg-ink-2 p-1 shadow-2xl"
        >
          <p className="truncate px-3 pt-2 pb-3 text-sm font-semibold text-white">{user.username}</p>
          <div className="flex flex-col gap-0.5 border-t border-white/10 pt-1">
            {item("/submissions", <ClockCounterClockwise size={18} aria-hidden="true" />, t("Submissions"))}
            {item("/account", <GearSix size={18} aria-hidden="true" />, t("Your account"))}
            {user.is_admin && item("/admin", <ShieldCheck size={18} aria-hidden="true" />, t("Admin"))}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/");
              }}
              className={itemClass}
            >
              <SignOut size={18} aria-hidden="true" />
              {t("Sign out")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
