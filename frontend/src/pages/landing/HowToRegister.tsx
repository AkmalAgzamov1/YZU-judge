import { Check, Copy, DownloadSimple } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import Reveal from "../../components/Reveal";
import SectionHeader from "../../components/SectionHeader";
import { focusRing } from "../../components/ui";
import { CPE_ACCOUNT_EMAIL, CPE_OFFICIAL_URL } from "../../lib/links";

const EMAIL_SUBJECT = "CPE帳號處理單";

const EMAIL_BODY = `Dear CPE Team,

My name is [your name], an international student at Yuan Ze University (student ID [your student ID]).

Could you please help me create a CPE account? My signed account form is attached.

Thank you,
[your name]
Yuan Ze University`;

const linkClass = `rounded-sm text-neutral-300 underline underline-offset-2 hover:text-white ${focusRing}`;

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
      {children}
    </a>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs text-neutral-400 transition duration-300 ease-soft hover:bg-white/10 hover:text-white ${focusRing}`}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function EmailTemplate() {
  const rows = [
    { label: "To", value: CPE_ACCOUNT_EMAIL },
    { label: "Subject", value: EMAIL_SUBJECT },
  ];

  return (
    <div className="mt-5 rounded-lg border border-white/10 bg-ink-1 font-mono text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3 border-b border-white/10 px-4 py-2">
          <span className="w-16 shrink-0 text-xs text-neutral-500">{row.label}</span>
          <span className="min-w-0 flex-1 truncate text-neutral-200">{row.value}</span>
          <CopyButton text={row.value} label={row.label.toLowerCase()} />
        </div>
      ))}
      <div className="flex items-start gap-3 px-4 py-3">
        <pre className="min-w-0 flex-1 whitespace-pre-wrap text-neutral-300">{EMAIL_BODY}</pre>
        <CopyButton text={EMAIL_BODY} label="message" />
      </div>
    </div>
  );
}

const steps: { title: string; body: ReactNode }[] = [
  {
    title: "Download and fill in the account form",
    body: (
      <>
        <p>
          Download the{" "}
          <a
            href="/cpe-account-form.pdf"
            download="CPE-account-form.pdf"
            className={`inline-flex items-center gap-1 ${linkClass}`}
          >
            CPE account form (帳號處理單), PDF
            <DownloadSimple size={14} aria-hidden="true" />
          </a>{" "}
          and fill in your part: the date, your name, student ID, department, email, phone number
          and your ARC or passport number. Tick 外籍人士 (foreign national) as the reason.
        </p>
        <p className="mt-3">
          Print it and attach copies of your student ID and your ARC in the space at the bottom.
        </p>
      </>
    ),
  },
  {
    title: "Hand it in at your department office",
    body: (
      <>
        <p>
          Your department checks it, and a teacher fills in their part and signs it. When it is
          ready, the department contacts you and gives the signed form back.
        </p>
        <p className="mt-3">For IBPI students, the office is room R70201.</p>
      </>
    ),
  },
  {
    title: "Email the signed form to the CPE office",
    body: (
      <>
        <p>
          Scan the signed form into one PDF and send it to {CPE_ACCOUNT_EMAIL}, from the same
          email you wrote on the form. Send it at least one week before registration closes.
        </p>
        <p className="mt-3">
          The form itself still lists an old address, cpe@cse.nsysu.edu.tw. Do not use it, send
          to {CPE_ACCOUNT_EMAIL}. A short message is enough:
        </p>
        <EmailTemplate />
      </>
    ),
  },
  {
    title: "Log in and change your password",
    body: (
      <p>
        The CPE office usually answers within a few days. Your username and your password are
        both your ARC number, so change the password right after the first login and check that
        your name and details are correct. No reply three days before registration closes? Email
        them again.
      </p>
    ),
  },
  {
    title: "Sign up for the exam itself",
    body: (
      <>
        <p>
          Having an account does not mean you are registered. Every sitting has its own
          registration window: log in on the{" "}
          <ExternalLink href={CPE_OFFICIAL_URL}>official CPE website</ExternalLink> and sign up
          for the exam each time, choosing the school where you will take it.
        </p>
        <p className="mt-3 text-white">
          Seats at Yuan Ze fill up within 30 minutes to an hour after registration opens. To take
          the exam on campus instead of travelling to another school, sign up the moment it opens.
        </p>
        <p className="mt-3">
          If you sign up and miss the exam without a valid reason, you lose your place at the
          next one.
        </p>
      </>
    ),
  },
];

export default function HowToRegister() {
  return (
    <section id="register" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader index="02" label="Registration" title="How to register for the CPE">
          <p>
            With a Taiwanese national ID card you sign up on the{" "}
            <ExternalLink href={CPE_OFFICIAL_URL}>official CPE website</ExternalLink> yourself.
            The site cannot check an ARC, so international students need the CPE office to open
            the account for them.
          </p>
          <p className="mt-4 text-white">
            The whole process takes one to two weeks. Start well before registration opens.
          </p>
        </SectionHeader>

        <Reveal className="mt-16 lg:ml-[33.333%]">
          <ol className="divide-y divide-white/10 border-y border-white/10">
            {steps.map((step, index) => (
              <li key={step.title} className="grid gap-3 py-8 sm:grid-cols-[3rem_1fr] sm:gap-6">
                <p className="font-mono text-sm text-neutral-500">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <div>
                  <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                  <div className="mt-3 max-w-[680px] text-base text-neutral-400">{step.body}</div>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
