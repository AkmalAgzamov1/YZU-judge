import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useI18n, type Key } from "../i18n";
import AccountMenu from "./AccountMenu";
import LanguageSwitch from "./LanguageSwitch";
import Logo from "./Logo";
import { buttonGhostSmall, buttonPrimarySmall, focusRing } from "./ui";

// The three places a student goes. Everything personal sits behind the avatar.
const mainLinks: { to: string; label: Key }[] = [
  { to: "/problems", label: "Problems" },
  { to: "/learn", label: "Learn" },
  { to: "/mock", label: "Mock CPE" },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition duration-300 ease-soft ${focusRing} ${
    isActive ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
  }`;

const panelLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-3 text-3xl font-semibold tracking-tight transition duration-300 ease-soft ${focusRing} ${
    isActive ? "text-white" : "text-neutral-400 hover:text-white"
  }`;

interface NavbarProps {
  // floating: the landing and legal pages, a pill off the top edge over the page.
  // Otherwise a full width bar, 4rem tall, that the app's layouts measure against.
  floating?: boolean;
}

// One nav for the whole site: the same items on the landing page and inside the app.
export default function Navbar({ floating = false }: NavbarProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the phone menu whenever the route changes.
  const [lastLocation, setLastLocation] = useState(location);
  if (lastLocation !== location) {
    setLastLocation(location);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const nav = (
    <nav
      aria-label="Main"
      className={
        floating
          ? "flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-ink-1/70 p-2 backdrop-blur-xl md:w-auto"
          : "mx-auto flex h-16 w-full max-w-6xl items-center gap-2"
      }
    >
      <Link to="/" className={`shrink-0 rounded-lg px-2 py-1 ${focusRing}`} aria-label={t("YZU Judge home")}>
        <Logo mark />
      </Link>

      <div className="hidden items-center gap-1 md:ml-4 md:flex">
        {mainLinks.map(({ to, label }) => (
          <NavLink key={to} to={to} className={linkClass}>
            {t(label)}
          </NavLink>
        ))}
      </div>

      <div className="ml-auto hidden items-center gap-1 md:flex">
        <LanguageSwitch compact />
        {user ? (
          <AccountMenu />
        ) : (
          <>
            <Link to="/login" className={buttonGhostSmall}>
              {t("Sign in")}
            </Link>
            <Link to="/register" className={buttonPrimarySmall}>
              {t("Create account")}
            </Link>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? t("Close menu") : t("Open menu")}
        className={`relative ml-auto h-10 w-10 shrink-0 rounded-lg transition duration-300 ease-soft hover:bg-white/10 md:hidden ${focusRing}`}
      >
        <span
          className={`absolute top-1/2 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-white transition duration-500 ease-soft ${
            open ? "-translate-y-1/2 rotate-45" : "-translate-y-1"
          }`}
        />
        <span
          className={`absolute top-1/2 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-white transition duration-500 ease-soft ${
            open ? "-translate-y-1/2 -rotate-45" : "translate-y-0.5"
          }`}
        />
      </button>
    </nav>
  );

  // Items for the phone panel, in reading order.
  const panelItems = [
    ...mainLinks.map(({ to, label }) => (
      <NavLink key={to} to={to} className={panelLinkClass}>
        {t(label)}
      </NavLink>
    )),
    ...(user
      ? [
          <NavLink key="submissions" to="/submissions" className={panelLinkClass}>
            {t("Submissions")}
          </NavLink>,
          <NavLink key="account" to="/account" className={panelLinkClass}>
            {t("Your account")}
          </NavLink>,
        ]
      : [
          <div key="auth" className="flex flex-col gap-3 px-3 pt-6">
            <Link to="/register" className={`${buttonPrimarySmall} py-3 text-base`}>
              {t("Create account")}
            </Link>
            <Link to="/login" className={`${buttonGhostSmall} border border-white/10 py-3 text-base`}>
              {t("Sign in")}
            </Link>
          </div>,
        ]),
    <div key="language" className="px-3 pt-6">
      <LanguageSwitch className="w-full" />
    </div>,
  ];

  return (
    <>
      <header
        className={
          floating
            ? "fixed inset-x-0 top-4 z-50 flex justify-center px-4"
            : "sticky top-0 z-50 border-b border-white/10 bg-ink-0/80 px-4 backdrop-blur-xl"
        }
      >
        {nav}
      </header>

      <div
        id="mobile-menu"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-0 z-40 overflow-y-auto bg-ink-0/90 px-4 pt-24 pb-12 backdrop-blur-2xl transition-opacity duration-300 ease-soft md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1">
          {panelItems.map((item, index) => (
            <div
              key={index}
              style={{ transitionDelay: open ? `${Math.min(index * 60, 400)}ms` : "0ms" }}
              className={`transition duration-500 ease-soft motion-reduce:translate-y-0 ${
                open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
