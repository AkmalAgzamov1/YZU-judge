import { useCallback, useEffect, useState } from "react";

// Seconds left before "Send a new code" works again; matches the server's 60 s.
export function useCooldown(initialSeconds = 0) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const start = useCallback((seconds = 60) => setSecondsLeft(seconds), []);

  return { secondsLeft, start };
}

// Students may type the code as "123 456"; the server ignores spaces too.
export function isSixDigits(code: string): boolean {
  return /^\d{6}$/.test(code.replace(/\s/g, ""));
}
