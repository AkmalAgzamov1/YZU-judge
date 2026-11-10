import { isMicrosoftMailbox } from "../lib/mailbox";

// Shown under the code field when the address is on Outlook, Hotmail, Live or YZU mail.
// Every "Not junk" click also teaches Microsoft to trust the next codes.
export default function JunkMailNotice({ email }: { email: string }) {
  if (!isMicrosoftMailbox(email)) return null;

  return (
    <div role="note" className="rounded-lg border border-yzu-yellow/40 bg-yzu-yellow/10 px-3 py-3 text-sm text-yzu-yellow">
      <p className="font-semibold">Look in your Junk Email folder</p>
      <p className="mt-1 text-yzu-yellow/90">
        Outlook and YZU mail often put our code there. If you find it, mark it as{" "}
        <span className="font-semibold">Not junk</span> so the next codes go straight to your inbox.
      </p>
    </div>
  );
}
