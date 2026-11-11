import { EnvelopeSimple, InstagramLogo } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import {
  CPE_OFFICIAL_URL,
  FOUNDER_EMAIL,
  FOUNDER_INSTAGRAM_HANDLE,
  FOUNDER_INSTAGRAM_URL,
} from "../lib/links";
import { focusRing } from "./ui";

// The circle lights up when the whole row (icon and text) is hovered.
const iconButtonClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-neutral-400 transition duration-300 ease-soft group-hover:border-white/30 group-hover:text-white";

const contactClass = `flex w-fit items-center gap-3 rounded-full text-sm text-neutral-400 transition duration-300 ease-soft hover:text-white ${focusRing}`;

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
          <div className="mt-1 flex flex-col gap-2">
            <a
              href={FOUNDER_INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className={`${contactClass} group`}
            >
              <span className={iconButtonClass}>
                <InstagramLogo size={20} aria-hidden="true" />
              </span>
              <span>
                <span className="sr-only">Instagram: </span>
                {FOUNDER_INSTAGRAM_HANDLE}
              </span>
            </a>
            <a href={`mailto:${FOUNDER_EMAIL}`} className={`${contactClass} group`}>
              <span className={iconButtonClass}>
                <EnvelopeSimple size={20} aria-hidden="true" />
              </span>
              <span>
                <span className="sr-only">Email: </span>
                {FOUNDER_EMAIL}
              </span>
            </a>
          </div>
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
        <p>© 2026 YZU Judge. Made by Akmal Agzamov in his tiny room :)</p>
        <p>
          Logo of the YZU International Bachelor Program in Informatics. Campus photo by Emily
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
