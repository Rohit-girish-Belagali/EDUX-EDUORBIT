"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { firebaseLogin, firebaseGoogleLogin, fetchAuthStatus, checkIsFirstUser } from "@/lib/auth";
import AuthPageChrome from "@/components/auth/AuthPageChrome";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import PhoneSignIn from "@/components/auth/PhoneSignIn";

function LoginPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const registered = searchParams.get("registered") === "1";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    // If already authenticated, skip login
    fetchAuthStatus().then((status) => {
      if (status?.authenticated) {
        router.replace(next);
        return;
      }
      // No users registered yet — send straight to registration page
      checkIsFirstUser().then((first) => {
        if (first) router.replace("/register");
      });
    });
  }, [router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await firebaseLogin(username, password);
    if (result.ok) {
      router.replace(next);
    } else {
      setError(result.error ?? t("Login failed"));
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    const result = await firebaseGoogleLogin();
    if (result.ok) {
      router.replace(next);
    } else {
      setError(result.error ?? t("Login failed"));
      setGoogleLoading(false);
    }
  }

  return (
    <AuthPageChrome
      headerCtaHref="/register"
      headerCtaLabel="Get Started"
      cardTitle="Sign in to EDU AI"
      cardSubtitle="Enter your credentials to access your agent workspace."
      heroNotice={
        registered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-neutral-700 bg-neutral-900/80 backdrop-blur-md px-4 py-3 text-sm text-neutral-200 max-w-md"
          >
            {t("Account created successfully! Sign in to continue.")}
          </motion.div>
        )
      }
    >
      <GoogleSignInButton onClick={handleGoogle} disabled={googleLoading || loading} />

      <PhoneSignIn onSuccess={() => router.replace(next)} onError={setError} />

      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-neutral-800" />
        <span className="text-[11px] uppercase tracking-wider text-neutral-500">
          {t("or")}
        </span>
        <div className="h-px flex-1 bg-neutral-800" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-xs font-medium text-neutral-300 mb-1.5"
          >
            {t("Email address")}
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-neutral-800
                       bg-black/80 text-white placeholder-neutral-500
                       focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-500
                       transition-all text-sm shadow-inner"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium text-neutral-300 mb-1.5"
          >
            {t("Password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-neutral-800
                       bg-black/80 text-white placeholder-neutral-500
                       focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-500
                       transition-all text-sm shadow-inner"
            placeholder="••••••••"
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3.5 py-2.5">
            {error}
          </p>
        )}

        {/* Sleek Solid White Submit Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-3 px-5 rounded-xl font-semibold text-sm
                     bg-white text-black hover:bg-neutral-200 active:bg-neutral-300
                     disabled:opacity-50 disabled:cursor-not-allowed
                     shadow-md hover:shadow-neutral-200/20 transition-all duration-200"
        >
          {loading ? t("Signing in…") : t("Sign In")}
        </motion.button>
      </form>

      <p className="text-center text-xs text-neutral-400 pt-1">
        {t("Don't have an account?")}{" "}
        <Link
          href="/register"
          className="text-neutral-200 hover:text-white font-medium underline transition-colors"
        >
          {t("Create one")}
        </Link>
      </p>
    </AuthPageChrome>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-black text-neutral-400 flex items-center justify-center text-sm">
          Loading sign in...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
