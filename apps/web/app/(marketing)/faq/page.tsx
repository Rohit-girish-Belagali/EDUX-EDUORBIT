import MarketingPage from "@/components/marketing/MarketingPage";

const FAQS = [
  {
    q: "Is EDU AI free?",
    a: "The software itself is free and open source. If you connect it to a paid LLM provider, usage of that provider is billed separately by them, not by us.",
  },
  {
    q: "Do I need an account to use it?",
    a: "Not by default — EDU AI runs single-user with authentication off. Sign-in becomes required only when a deployment turns on multi-user mode.",
  },
  {
    q: "How does sign-in work?",
    a: "You can sign in with email/password or Google. The first account created on a deployment automatically becomes the admin, who can then manage other users and their access.",
  },
  {
    q: "Can I self-host it?",
    a: "Yes — it's designed to be self-hosted, with a Docker setup for the full stack (frontend, backend, and optional sidecars).",
  },
  {
    q: "Where is my data stored?",
    a: "Locally, on whatever machine or server you deploy to — chat history, knowledge bases, and workspaces are stored as files under a single data directory, not in a hosted database we operate.",
  },
];

export default function FaqPage() {
  return (
    <MarketingPage eyebrow="FAQ" title="Common questions">
      <div className="divide-y divide-neutral-900">
        {FAQS.map((item) => (
          <div key={item.q} className="py-6 first:pt-0">
            <h2 className="text-base font-semibold text-white mb-2">{item.q}</h2>
            <p className="text-sm text-neutral-400 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </MarketingPage>
  );
}
