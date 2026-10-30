import type { ReactNode } from "react";

interface MessageProps {
  title: string;
  body: string;
  action?: ReactNode;
}

// Empty, error and "nothing matches" states inside hairline lists.
export default function Message({ title, body, action }: MessageProps) {
  return (
    <div className="flex flex-col items-center border-y border-white/10 px-4 py-20 text-center">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-base text-neutral-400">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
