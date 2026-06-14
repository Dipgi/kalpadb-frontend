import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { auth, ApiError } from "../lib/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await auth.resetPassword(token!, password);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("This reset link is invalid or has expired. Request a new one.");
      } else if (err instanceof ApiError && err.status === 422) {
        setError("Password must be 8–128 characters.");
      } else {
        setError(err instanceof ApiError ? err.message : "Could not reset password.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Centered>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Invalid link</h1>
        <p className="text-gray-500 text-sm">
          This page needs a reset link from your email.
        </p>
        <Link to="/forgot-password" className="mt-6 inline-block text-violet-700 hover:underline text-sm">
          Request a reset link
        </Link>
      </Centered>
    );
  }

  if (done) {
    return (
      <Centered>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Password updated ✓</h1>
        <p className="text-gray-500 text-sm">You can now sign in with your new password.</p>
        <Link to="/login" className="mt-6 inline-block text-violet-700 hover:underline text-sm">
          Go to sign in →
        </Link>
      </Centered>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Set a new password</h1>
        <p className="text-sm text-gray-500 mb-8">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-violet-700 text-white py-2.5 rounded-md font-medium hover:bg-violet-800 disabled:opacity-60 transition-colors"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">{children}</div>
    </div>
  );
}
