import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError, authApi, type CurrentUser } from "../api/client";

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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "access_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      value={{ user, isLoading, login, register, logout }}
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
