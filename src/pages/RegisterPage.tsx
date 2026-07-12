import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { auth, ApiError } from "../lib/api";
import Turnstile, { TURNSTILE_SITE_KEY } from "../components/Turnstile";
import { useSeo } from "../hooks/useSeo";

export default function RegisterPage() {
  useSeo({ title: "Create an account" });
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [hp, setHp] = useState(""); // honeypot — real users leave this empty
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0); // bump to reset the widget
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const captchaRequired = !!TURNSTILE_SITE_KEY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await auth.register(username, email, password, {
        turnstileToken,
        website: hp,
      });
      await setSession(res.access_token);
      navigate("/");
    } catch (err) {
      // Turnstile tokens are single-use — reset the widget after any failure.
      setTurnstileToken(null);
      setCaptchaKey((k) => k + 1);
      if (err instanceof ApiError && err.status === 422) {
        const m = err.message.toLowerCase();
        if (m.includes("username")) {
          setError(
            "Username must be 3–100 characters: letters, numbers, dots, hyphens and underscores only (no spaces)."
          );
        } else if (m.includes("password")) {
          setError("Password must be at least 8 characters.");
        } else if (m.includes("email")) {
          setError("Please enter a valid email address.");
        } else {
          setError(err.message || "Check your details and try again.");
        }
      } else if (err instanceof ApiError && err.status === 409) {
        setError("That email or username is already registered.");
      } else if (err instanceof ApiError && err.status === 403) {
        setError("Bot verification failed — please complete the challenge and try again.");
      } else if (err instanceof ApiError && err.status === 400) {
        setError("Your submission was rejected. Please try again.");
      } else {
        setError(err instanceof ApiError ? err.message : "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Join KalpaDB</h1>
        <p className="text-sm text-gray-500 mb-8">
          Already have an account?{" "}
          <Link to="/login" className="text-violet-700 hover:underline">
            Sign in
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={100}
              pattern="[a-zA-Z0-9_.\-]+"
              title="Letters, numbers, dots, hyphens and underscores only — no spaces."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Letters, numbers, dots, hyphens and underscores — no spaces.
            </p>
          </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Honeypot: hidden from real users; bots that fill it are rejected. */}
          <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
            <label>
              Website
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
              />
            </label>
          </div>

          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              required
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-violet-700 focus:ring-violet-500"
            />
            <span>
              I agree that any contribution I make may be published under{" "}
              <Link to="/license" target="_blank" className="text-violet-700 hover:underline">
                CC BY-SA 4.0
              </Link>{" "}
              and that KalpaDB may use, adapt, and relicense it as part of the database.
            </span>
          </label>

          <Turnstile key={captchaKey} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !agreeTerms || (captchaRequired && !turnstileToken)}
            className="bg-violet-700 text-white py-2.5 rounded-md font-medium hover:bg-violet-800 disabled:opacity-60 transition-colors"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
