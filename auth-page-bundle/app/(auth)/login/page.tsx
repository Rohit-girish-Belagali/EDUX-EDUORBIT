"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { login, fetchAuthStatus, checkIsFirstUser } from "@/lib/auth";

// Dynamically import Three.js 3D Rotating Education Artifact with SSR disabled
const RotatingEducationArtifact = dynamic(
  () => import("@/components/ui/RotatingEducationArtifact"),
  { ssr: false }
);

// Dynamically import Rainbow Cursor Trail with SSR disabled
const RainbowCursorTrail = dynamic(
  () => import("@/components/ui/RainbowCursorTrail"),
  { ssr: false }
);

// Hardcoded credential defaults specified by user
const HARDCODED_EMAIL = "rohitgirishbelagali@gmail.com";
const HARDCODED_PASSWORD = "SP@ssw0rd!";

function LoginPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const registered = searchParams.get("registered") === "1";

  const [username, setUsername] = useState(HARDCODED_EMAIL);
  const [password, setPassword] = useState(HARDCODED_PASSWORD);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Mouse tracking for 3D card tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const rotateX = useTransform(mouseY, [-500, 500], [5, -5]);
  const rotateY = useTransform(mouseX, [-500, 500], [-5, 5]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    mouseX.set(clientX);
    mouseY.set(clientY);
  };

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

    const isHardcodedValid =
      (username.trim().toLowerCase() === HARDCODED_EMAIL.toLowerCase() ||
        username.trim() === "rohitgirishbelagali") &&
      password === HARDCODED_PASSWORD;

    if (isHardcodedValid) {
      setTimeout(() => {
        router.replace(next);
      }, 400);
      return;
    }

    const result = await login(username, password);
    if (result.ok) {
      router.replace(next);
    } else {
      setError(result.error ?? t("Login failed"));
      setLoading(false);
    }
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-full min-h-screen bg-black text-white font-sans overflow-x-hidden flex flex-col justify-between selection:bg-neutral-800 selection:text-white"
    >
      {/* Interactive Rainbow Cursor Trail (Follows Mouse Movement Only) */}
      <RainbowCursorTrail />

      {/* Subtle Background Accent Gradient */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/gradient.png"
        alt="gradient"
        className="absolute top-0 right-0 opacity-15 pointer-events-none z-0 max-w-full md:max-w-[45vw] grayscale contrast-125 mix-blend-screen"
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-20 flex items-center justify-between px-6 md:px-20 py-6 max-w-7xl w-full mx-auto"
      >
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-neutral-950/80 border border-neutral-700/80 backdrop-blur-md flex items-center justify-center font-semibold text-white text-xs shadow-sm group-hover:border-neutral-400 transition-colors">
            EDU
          </div>
          <span className="text-xl font-medium tracking-tight text-white group-hover:text-neutral-300 transition-colors">
            EDU AI
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-300 font-medium">
          {["Company", "Solutions", "Resources", "FAQ"].map((item) => (
            <a
              key={item}
              href="#"
              className="relative hover:text-white transition-colors duration-200 py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-white hover:after:w-full after:transition-all after:duration-300"
            >
              {item}
            </a>
          ))}
        </nav>

        <Link
          href="/register"
          className="px-6 py-2.5 rounded-full bg-neutral-900/80 backdrop-blur-md border border-neutral-700 text-neutral-200 hover:text-white hover:bg-neutral-800 hover:border-neutral-500 font-medium text-sm transition-all duration-300 shadow-sm hover:shadow-neutral-800/40"
        >
          {t("Get Started")}
        </Link>
      </motion.header>

      {/* Main Container */}
      <main className="relative z-20 max-w-7xl w-full mx-auto px-6 md:px-20 py-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-grow">
        {/* Left Column: Hero & Login Form */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
          {/* Animated Tag Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center p-[1px] rounded-full bg-gradient-to-r from-neutral-700 via-neutral-500 to-neutral-800 w-fit hover:border-neutral-400 transition-all duration-300 shadow-lg"
          >
            <div className="px-4 py-1.5 rounded-full bg-neutral-950/90 backdrop-blur-md text-xs md:text-sm font-medium tracking-wider text-neutral-200 flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-200" />
              </span>
              Machine Learning & Deep Reasoning
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.15] text-white"
          >
            Turning data <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-400">
              into resources
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-neutral-300/90 text-base md:text-lg max-w-xl leading-relaxed font-normal"
          >
            Harness the power of AI to transform complex learning into actionable
            knowledge, personalized tutoring, and deep problem solving.
          </motion.p>

          {/* Registered success notice */}
          {registered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-neutral-700 bg-neutral-900/80 backdrop-blur-md px-4 py-3 text-sm text-neutral-200 max-w-md"
            >
              {t("Account created successfully! Sign in to continue.")}
            </motion.div>
          )}

          {/* Sleek Interactive Dark Glassmorphic Login Card with 3D Mouse Tilt */}
          <motion.div
            ref={cardRef}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-full max-w-md bg-neutral-950/85 backdrop-blur-2xl border border-neutral-800/90 rounded-3xl p-7 shadow-2xl shadow-black/90 space-y-5 transition-all duration-300 hover:border-neutral-700/90 group"
          >
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-white tracking-tight">
                {t("Sign in to EDU AI")}
              </h2>
              <p className="text-xs text-neutral-400">
                Enter your credentials to access your agent workspace.
              </p>
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

              {/* Hardcoded indicator pill */}
              <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
                <span>Default credentials pre-filled</span>
                <button
                  type="button"
                  onClick={() => {
                    setUsername(HARDCODED_EMAIL);
                    setPassword(HARDCODED_PASSWORD);
                  }}
                  className="text-neutral-300 hover:text-white underline font-medium transition-colors"
                >
                  Reset Defaults
                </button>
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
                disabled={loading}
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
          </motion.div>
        </div>

        {/* Right Column: 3D Rotating Education Artifact */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="lg:col-span-5 relative w-full min-h-[450px] lg:min-h-[600px] flex items-center justify-center"
        >
          <RotatingEducationArtifact />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 max-w-7xl w-full mx-auto px-6 md:px-20 py-6 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
        <div>EDUX · Agent-Native Learning Companion</div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-neutral-300 transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-neutral-300 transition-colors">
            Terms of Service
          </a>
          <a href="#" className="hover:text-neutral-300 transition-colors">
            Documentation
          </a>
        </div>
      </footer>
    </div>
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
