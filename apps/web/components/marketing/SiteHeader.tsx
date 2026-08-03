"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const NAV_LINKS = [
  { label: "Company", href: "/company" },
  { label: "Solutions", href: "/solutions" },
  { label: "Resources", href: "/resources" },
  { label: "FAQ", href: "/faq" },
];

/**
 * Shared dark-theme header for the auth pages and the marketing pages linked
 * from their nav (Company/Solutions/Resources/FAQ), so the brand mark and
 * nav stay identical everywhere it appears instead of drifting per-page.
 */
export default function SiteHeader({
  ctaHref,
  ctaLabel,
}: {
  ctaHref: string;
  ctaLabel: string;
}) {
  const { t } = useTranslation();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative z-20 flex items-center justify-between px-6 md:px-20 py-6 max-w-7xl w-full mx-auto"
    >
      <Link href="/login" className="flex items-center gap-3 group cursor-pointer">
        <Image
          src="/logo.png"
          alt="EDUX"
          width={36}
          height={36}
          className="h-9 w-9 rounded-xl bg-neutral-950/80 border border-neutral-700/80 backdrop-blur-md p-1.5 shadow-sm group-hover:border-neutral-400 transition-colors"
        />
        <span className="text-xl font-medium tracking-tight text-white group-hover:text-neutral-300 transition-colors">
          EDU AI
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-300 font-medium">
        {NAV_LINKS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="relative hover:text-white transition-colors duration-200 py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-white hover:after:w-full after:transition-all after:duration-300"
          >
            {t(item.label)}
          </Link>
        ))}
      </nav>

      <Link
        href={ctaHref}
        className="px-6 py-2.5 rounded-full bg-neutral-900/80 backdrop-blur-md border border-neutral-700 text-neutral-200 hover:text-white hover:bg-neutral-800 hover:border-neutral-500 font-medium text-sm transition-all duration-300 shadow-sm hover:shadow-neutral-800/40"
      >
        {t(ctaLabel)}
      </Link>
    </motion.header>
  );
}
