import { useI18n } from "../i18n";
import { isMicrosoftMailbox } from "../lib/mailbox";

// Shown under the code field when the address is on Outlook, Hotmail, Live or YZU mail.
// Every "Not junk" click also teaches Microsoft to trust the next codes.
export default function JunkMailNotice({ email }: { email: string }) {
  const { t, tx } = useI18n();

  if (!isMicrosoftMailbox(email)) return null;

  return (
    <div role="note" className="rounded-lg border border-yzu-yellow/40 bg-yzu-yellow/10 px-3 py-3 text-sm text-yzu-yellow">
      <p className="font-semibold">{t("Look in your Junk Email folder")}</p>
      <p className="mt-1 text-yzu-yellow/90">
        {tx(
          "Outlook and YZU mail often put our code there. If you find it, mark it as <b>Not junk</b> so the next codes go straight to your inbox.",
          { b: (text) => <span className="font-semibold">{text}</span> },
        )}
      </p>
    </div>
  );
}
