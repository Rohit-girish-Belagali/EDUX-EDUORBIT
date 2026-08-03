"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { firebaseRegister, firebaseGoogleLogin, checkIsFirstUser, fetchAuthStatus } from "@/lib/auth";
import AuthPageChrome from "@/components/auth/AuthPageChrome";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import PhoneSignIn from "@/components/auth/PhoneSignIn";

export default function RegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isFirst, setIsFirst] = useState(false);
  const [checkingFirst, setCheckingFirst] = useState(true);

  useEffect(() => {
    // Redirect if already logged in
    fetchAuthStatus().then((status) => {
      if (status?.authenticated) router.replace("/");
    });

    // Check if this will be the first (admin) user
    checkIsFirstUser().then((first) => {
      setIsFirst(first);
      setCheckingFirst(false);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("Passwords do not match"));
      return;
    }

    setLoading(true);
    const result = await firebaseRegister(username, password);

    if (result.ok) {
      router.replace("/login?registered=1");
    } else {
      setError(result.error ?? t("Registration failed"));
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    const result = await firebaseGoogleLogin();
    if (result.ok) {
      router.replace("/");
    } else {
      setError(result.error ?? t("Registration failed"));
      setGoogleLoading(false);
    }
  }

  return (
    <AuthPageChrome
      headerCtaHref="/login"
      headerCtaLabel="Sign In"
      cardTitle="Create your EDU AI account"
      cardSubtitle="Set up your workspace to start building and learning."
      cardNotice={
        !checkingFirst &&
        isFirst && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs text-blue-300">
            <strong>{t("First user:")}</strong>{" "}
            {t(
              "You will be granted admin privileges and can manage other users from the admin dashboard.",
            )}
          </div>
        )
      }
    >
      <GoogleSignInButton onClick={handleGoogle} disabled={googleLoading || loading} />

      <PhoneSignIn onSuccess={() => router.replace("/")} onError={setError} />

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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-neutral-800
                       bg-black/80 text-white placeholder-neutral-500
                       focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-500
                       transition-all text-sm shadow-inner"
            placeholder="••••••••"
          />
          <p className="mt-1.5 text-[11px] text-neutral-500">{t("At least 6 characters")}</p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-medium text-neutral-300 mb-1.5"
          >
            {t("Confirm password")}
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? t("Creating account…") : t("Create account")}
        </motion.button>
      </form>

      <p className="text-center text-xs text-neutral-400 pt-1">
        {t("Already have an account?")}{" "}
        <Link
          href="/login"
          className="text-neutral-200 hover:text-white font-medium underline transition-colors"
        >
          {t("Sign in")}
        </Link>
      </p>
    </AuthPageChrome>
  );
}
