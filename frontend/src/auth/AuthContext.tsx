import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError, authApi, SESSION_EXPIRED_EVENT, type CurrentUser } from "../api/client";

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  // True after the server rejected a stored token, until the next sign in.
  sessionExpired: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "access_token";

// Tokens last 7 days; trading them in this often keeps open tabs signed in.
const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000;

async function refreshToken() {
  try {
    const result = await authApi.refresh();
    localStorage.setItem(TOKEN_KEY, result.access_token);
  } catch {
    // A failed refresh is not fatal: the current token may still be valid,
    // and a truly expired one triggers the session expired event.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    // Only fired for requests that carried a token, so the user was signed in.
    function handleExpired() {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setSessionExpired(true);
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  // Every visit and every few hours, swap the token for a fresh one.
  useEffect(() => {
    if (!user) return;
    void refreshToken();
    const timer = setInterval(() => void refreshToken(), REFRESH_EVERY_MS);
    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authApi.me();

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 0) {
          // Keep the token if the backend is temporarily unreachable.
          // The user can retry when the server is available.
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await authApi.login({ username, password });

      localStorage.setItem(TOKEN_KEY, result.access_token);
      setSessionExpired(false);

      try {
        const currentUser = await authApi.me();
        setUser(currentUser);
      } catch (error) {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        throw error;
      }
    },
    [],
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      await authApi.register({ username, email, password });
      await login(username, password);
    },
    [login],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, sessionExpired }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
