import { Link } from "react-router-dom";
import Logo from "./Logo";
import { CPE_OFFICIAL_URL } from "../lib/links";
import { focusRing } from "./ui";

const linkClass = `rounded-sm text-sm text-neutral-400 transition duration-300 ease-soft hover:text-white ${focusRing}`;

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 px-4 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <Logo />
          <p className="text-sm text-neutral-500">
            A CPE practice site made at Yuan Ze University. Not affiliated with
            the CPE organizers.
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-3">
          <Link to={{ pathname: "/", hash: "#how" }} className={linkClass}>
            How it works
          </Link>
          <Link to="/privacy" className={linkClass}>
            Privacy policy
          </Link>
          <Link to={{ pathname: "/", hash: "#faq" }} className={linkClass}>
            FAQ
          </Link>
          <Link to="/terms" className={linkClass}>
            Terms of use
          </Link>
          <a
            href="https://github.com/AkmalAgzamov1/YZU-judge"
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          >
            Source on GitHub
          </a>
          <a href={CPE_OFFICIAL_URL} target="_blank" rel="noreferrer" className={linkClass}>
            Official CPE website
          </a>
        </nav>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-2 text-xs text-neutral-600 md:flex-row md:justify-between">
        <p>© 2026 YZU Judge. Made in Taoyuan.</p>
        <p>
          Yuan Ze University logo used with permission. Campus photo by Emily
          rao, CC0, via{" "}
          <a
            href="https://commons.wikimedia.org/wiki/File:%E5%85%83%E6%99%BA%E5%A4%A7%E5%AD%B8%E7%BE%8E%E9%BA%97%E7%9A%84%E6%A0%A1%E9%96%80.jpg"
            target="_blank"
            rel="noreferrer"
            className={`underline underline-offset-2 hover:text-neutral-400 ${focusRing}`}
          >
            Wikimedia Commons
          </a>
        </p>
      </div>
    </footer>
  );
}
