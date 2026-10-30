import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { buttonGhostSmall, buttonPrimarySmall, focusRing } from "./ui";

const sections = [
  { id: "why", label: "Why the CPE" },
  { id: "features", label: "Features" },
  { id: "how", label: "How it works" },
  { id: "faq", label: "FAQ" },
];

// Highlights the landing section currently in the middle of the viewport.
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );

    sections.forEach(({ id }) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [enabled]);

  return enabled ? active : null;
}

export default function SiteNav() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const activeSection = useActiveSection(location.pathname === "/");

  // Close the mobile menu whenever the route or hash changes.
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

  const linkClass = (isActive: boolean) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition duration-300 ease-soft ${focusRing} ${
      isActive ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
    }`;

  const accountLinks = user ? (
    <>
      <Link to="/problems" className={linkClass(false)}>
        Problems
      </Link>
      <NavLink to="/account" className={({ isActive }) => linkClass(isActive)} aria-label="Your account">
        <span className="flex items-center gap-2">
          <Avatar name={user.username} />
          {user.username}
        </span>
      </NavLink>
    </>
  ) : (
    <>
      <NavLink
        to="/login"
        className={({ isActive }) =>
          `${buttonGhostSmall} ${isActive ? "bg-white/10 text-white" : ""}`
        }
      >
        Sign in
      </NavLink>
      <Link to="/register" className={buttonPrimarySmall}>
        Create account
      </Link>
    </>
  );

  // Items for the mobile panel, in reading order.
  const mobileItems = [
    ...sections.map(({ id, label }) => (
      <Link
        key={id}
        to={{ pathname: "/", hash: `#${id}` }}
        className={`block rounded-lg px-3 py-3 text-3xl font-semibold tracking-tight ${focusRing} ${
          activeSection === id ? "text-white" : "text-neutral-400"
        }`}
      >
        {label}
      </Link>
    )),
    user ? (
      <div key="app" className="flex flex-col gap-1">
        <Link to="/problems" className={`block rounded-lg px-3 py-3 text-3xl font-semibold tracking-tight text-neutral-400 ${focusRing}`}>
          Problems
        </Link>
        <Link to="/account" className={`block rounded-lg px-3 py-3 text-3xl font-semibold tracking-tight text-neutral-400 ${focusRing}`}>
          Your account
        </Link>
      </div>
    ) : (
      <div key="auth" className="flex flex-col gap-3 px-3 pt-6">
        <Link to="/register" className={`${buttonPrimarySmall} py-3 text-base`}>
          Create account
        </Link>
        <Link to="/login" className={`${buttonGhostSmall} border border-white/10 py-3 text-base`}>
          Sign in
        </Link>
      </div>
    ),
  ];

  return (
    <>
      <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <nav
          aria-label="Main"
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-ink-1/70 p-2 backdrop-blur-xl md:w-auto md:justify-start"
        >
          <Link to="/" className={`rounded-lg px-3 py-2 ${focusRing}`} aria-label="YZU Judge home">
            <Logo />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {sections.map(({ id, label }) => (
              <Link
                key={id}
                to={{ pathname: "/", hash: `#${id}` }}
                aria-current={activeSection === id ? "true" : undefined}
                className={linkClass(activeSection === id)}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <span aria-hidden="true" className="mx-2 h-6 w-px bg-white/10" />
            {accountLinks}
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className={`relative h-10 w-10 rounded-lg transition duration-300 ease-soft hover:bg-white/10 md:hidden ${focusRing}`}
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
      </header>

      <div
        id="mobile-menu"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-0 z-40 bg-ink-0/90 px-4 pt-24 backdrop-blur-2xl transition-opacity duration-300 ease-soft md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1">
          {mobileItems.map((item, index) => (
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
