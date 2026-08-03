import SiteHeader from "@/components/marketing/SiteHeader";
import SiteFooter from "@/components/marketing/SiteFooter";

export default function MarketingPage({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader ctaHref="/register" ctaLabel="Get Started" />

      <main className="flex-grow max-w-4xl w-full mx-auto px-6 md:px-20 py-12">
        <span className="inline-block text-xs md:text-sm font-medium tracking-wider text-neutral-400 uppercase mb-3">
          {eyebrow}
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
          {title}
        </h1>
        {subtitle && (
          <p className="text-neutral-300/90 text-base md:text-lg max-w-2xl leading-relaxed mb-10">
            {subtitle}
          </p>
        )}

        <div className="space-y-8 text-neutral-300 leading-relaxed">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}
