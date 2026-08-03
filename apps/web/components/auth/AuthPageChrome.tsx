"use client";

import { useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import SiteHeader from "@/components/marketing/SiteHeader";
import SiteFooter from "@/components/marketing/SiteFooter";

// Dynamically import Three.js 3D Rotating Education Artifact with SSR disabled
const RotatingEducationArtifact = dynamic(
  () => import("@/components/ui/RotatingEducationArtifact"),
  { ssr: false },
);

// Dynamically import Rainbow Cursor Trail with SSR disabled
const RainbowCursorTrail = dynamic(
  () => import("@/components/ui/RainbowCursorTrail"),
  { ssr: false },
);

/**
 * Shared visual shell for /login and /register — header, hero copy, 3D
 * artifact, footer, and the tilting glassmorphic card. Both pages render
 * identically except for the card's title/notice/form content, which is
 * passed in via props/children so the two stay visually in sync by
 * construction instead of by copy-pasting markup.
 */
export default function AuthPageChrome({
  headerCtaHref,
  headerCtaLabel,
  heroNotice,
  cardTitle,
  cardSubtitle,
  cardNotice,
  children,
}: {
  headerCtaHref: string;
  headerCtaLabel: string;
  heroNotice?: React.ReactNode;
  cardTitle: string;
  cardSubtitle: string;
  cardNotice?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

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

      <SiteHeader ctaHref={headerCtaHref} ctaLabel={headerCtaLabel} />

      {/* Main Container */}
      <main className="relative z-20 max-w-7xl w-full mx-auto px-6 md:px-20 py-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-grow">
        {/* Left Column: Hero & Auth Card */}
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

          {heroNotice}

          {/* Card wrapper — hosts the rotating glow ring behind the card itself */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative w-full max-w-md"
          >
            {/* Rotating glow ring — a blurred conic gradient spun behind the
                card so only a soft, moving light sweep peeks out past its edges. */}
            <motion.div
              aria-hidden
              animate={{ rotate: 360 }}
              transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-1 rounded-[28px] opacity-70 blur-md pointer-events-none"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0%, #5b8cff 12%, transparent 28%, transparent 55%, #1e3a8a 70%, transparent 88%)",
              }}
            />

            {/* Sleek Interactive Dark Glassmorphic Card with 3D Mouse Tilt */}
            <motion.div
              ref={cardRef}
              style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
              className="relative w-full bg-neutral-950/90 backdrop-blur-2xl border border-neutral-800/90 rounded-3xl p-7 shadow-2xl shadow-black/90 space-y-5 transition-all duration-300 hover:border-neutral-700/90 group"
            >
              <Image
                src="/logo.png"
                alt="EDUX"
                width={40}
                height={40}
                className="h-10 w-10 rounded-xl bg-neutral-900/80 border border-neutral-700/80 p-2"
              />

              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  {t(cardTitle)}
                </h2>
                <p className="text-xs text-neutral-400">{t(cardSubtitle)}</p>
              </div>

              {cardNotice}

              {children}
            </motion.div>
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

      <SiteFooter />
    </div>
  );
}
