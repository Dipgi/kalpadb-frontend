import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { auth } from "../lib/api";

type Status = "verifying" | "success" | "error" | "missing";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "missing");
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // guard against double-run (StrictMode) — token is single-use
    auth
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {status === "verifying" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Verifying your email…</h1>
            <p className="text-gray-500 text-sm">One moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Email verified ✓</h1>
            <p className="text-gray-500 text-sm">
              Your email address is confirmed. You can now sign in.
            </p>
            <Link to="/login" className="mt-6 inline-block text-violet-700 hover:underline text-sm">
              Go to sign in →
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Verification failed</h1>
            <p className="text-gray-500 text-sm">
              This verification link is invalid or has expired. Try registering again, or sign in if
              you've already verified.
            </p>
            <Link to="/login" className="mt-6 inline-block text-violet-700 hover:underline text-sm">
              Back to sign in
            </Link>
          </>
        )}

        {status === "missing" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Invalid link</h1>
            <p className="text-gray-500 text-sm">
              This page needs a verification link from your email.
            </p>
            <Link to="/login" className="mt-6 inline-block text-violet-700 hover:underline text-sm">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
