import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import Turnstile, { TURNSTILE_SITE_KEY } from "../components/Turnstile";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const captchaRequired = !!TURNSTILE_SITE_KEY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, turnstileToken);
      navigate(from, { replace: true });
    } catch (err) {
      // Turnstile tokens are single-use — reset after a failed attempt.
      setTurnstileToken(null);
      setCaptchaKey((k) => k + 1);
      if (err instanceof ApiError && err.status === 403) {
        setError("Bot verification failed — please complete the challenge and try again.");
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Incorrect email or password.");
      } else {
        setError(err instanceof ApiError ? err.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
        <p className="text-sm text-gray-500 mb-8">
          Don't have an account?{" "}
          <Link to="/register" className="text-violet-700 hover:underline">
            Join KalpaDB
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <Link to="/forgot-password" className="text-xs text-violet-700 hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <Turnstile key={captchaKey} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || (captchaRequired && !turnstileToken)}
            className="bg-violet-700 text-white py-2.5 rounded-md font-medium hover:bg-violet-800 disabled:opacity-60 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
