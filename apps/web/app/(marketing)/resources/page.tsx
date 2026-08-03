import MarketingPage from "@/components/marketing/MarketingPage";

const RESOURCES = [
  {
    title: "Documentation",
    description: "Full setup, configuration, and feature docs.",
    href: "https://eduorbit.com",
  },
  {
    title: "GitHub Repository",
    description: "Source code, releases, and the public roadmap.",
    href: "https://github.com/eduorbit/EDUX",
  },
  {
    title: "Discord Community",
    description: "Ask questions and talk to other users and contributors.",
    href: "https://discord.gg/eRsjPgMU4t",
  },
  {
    title: "Roadmap & Issues",
    description: "Vote on upcoming features or report a bug.",
    href: "https://github.com/eduorbit/EDUX/issues/498",
  },
];

export default function ResourcesPage() {
  return (
    <MarketingPage
      eyebrow="Resources"
      title="Docs, code, and community"
      subtitle="Everything you need to set up, extend, or contribute to EDU AI."
    >
      <div className="space-y-4">
        {RESOURCES.map((item) => (
          <a
            key={item.title}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5 hover:border-neutral-600 hover:bg-neutral-900/60 transition-colors group"
          >
            <div>
              <h2 className="text-base font-semibold text-white mb-1">{item.title}</h2>
              <p className="text-sm text-neutral-400">{item.description}</p>
            </div>
            <span className="text-neutral-500 group-hover:text-white transition-colors">
              →
            </span>
          </a>
        ))}
      </div>
    </MarketingPage>
  );
}
