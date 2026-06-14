import { useState } from "react";
import { Link } from "react-router-dom";
import { auth, ApiError } from "../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      // The backend always returns 200 (never reveals if the email exists);
      // a failure here is a network/rate-limit issue.
      if (err instanceof ApiError && err.status === 429) {
        setError("Too many requests — please wait a minute and try again.");
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h1>
          <p className="text-gray-500 text-sm">
            If <strong>{email}</strong> is registered, we've sent a password reset link. It may take a
            minute to arrive.
          </p>
          <Link to="/login" className="mt-6 inline-block text-violet-700 hover:underline text-sm">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset your password</h1>
        <p className="text-sm text-gray-500 mb-8">
          Enter your email and we'll send you a reset link.
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-violet-700 text-white py-2.5 rounded-md font-medium hover:bg-violet-800 disabled:opacity-60 transition-colors"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>

          <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 text-center">
            Back to sign in
          </Link>
        </form>
      </div>
    </div>
  );
}
