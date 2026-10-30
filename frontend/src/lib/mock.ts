import { useEffect, useState } from "react";
import { serverDate } from "./progress";

// Problems needed in one sitting. Departments differ; this is the common rule.
export const PASS_BAR = 2;

export const letter = (position: number) => String.fromCharCode(64 + position);

export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
}

// Milliseconds left until endsAt, ticking every second. serverTime corrects
// for a student whose computer clock is off.
export function useCountdown(endsAt: string, serverTime: string) {
  const [offset] = useState(() => serverDate(serverTime).getTime() - Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return Math.max(0, serverDate(endsAt).getTime() - (now + offset));
}
