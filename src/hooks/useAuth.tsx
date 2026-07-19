import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, auth, getToken, setToken, type UserOut } from "../lib/api";

interface AuthState {
  user: UserOut | null;
  loading: boolean;
  login: (email: string, password: string, turnstileToken?: string | null) => Promise<void>;
  setSession: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    auth.me()
      .then(setUser)
      .catch((err) => {
        // Discard the token only when the server actually rejected it. A
        // network error / timeout / 5xx means the server was unreachable
        // (e.g. briefly overloaded) — dropping the token then silently logs
        // everyone out for no reason.
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setToken(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string, turnstileToken?: string | null) {
    const { access_token } = await auth.login(email, password, { turnstileToken });
    await setSession(access_token);
  }

  /** Establish a session from an existing access token (e.g. returned by register). */
  async function setSession(token: string) {
    setToken(token);
    const me = await auth.me();
    setUser(me);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
