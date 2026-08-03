import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="relative z-20 max-w-7xl w-full mx-auto px-6 md:px-20 py-6 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
      <div>EDUX · Agent-Native Learning Companion</div>
      <div className="flex gap-6">
        <Link href="/privacy" className="hover:text-neutral-300 transition-colors">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-neutral-300 transition-colors">
          Terms of Service
        </Link>
        <a
          href="https://eduorbit.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-neutral-300 transition-colors"
        >
          Documentation
        </a>
      </div>
    </footer>
  );
}
