import MarketingPage from "@/components/marketing/MarketingPage";

const SOLUTIONS = [
  {
    title: "Chat",
    description:
      "A conversational workspace for deep problem solving, reasoning, and quick answers — the default surface for day-to-day tutoring.",
  },
  {
    title: "Deep Research",
    description:
      "Multi-step research runs that survey sources and assemble a structured report instead of a single-shot answer.",
  },
  {
    title: "Knowledge Center",
    description:
      "Upload documents into knowledge bases the assistant can retrieve from — your own material, not just general web knowledge.",
  },
  {
    title: "Learning Space",
    description:
      "Guided learning flows and quizzes that track mastery over time rather than treating every question as a one-off.",
  },
  {
    title: "Co-Writer & Book",
    description:
      "Long-form writing and structured document tools for building out notes, essays, or full books alongside the assistant.",
  },
  {
    title: "Partners & My Agents",
    description:
      "Configurable AI personas ('partners') you can assign specific knowledge, skills, and tools to for a given task.",
  },
  {
    title: "Skills",
    description:
      "An installable skills catalog that extends what the assistant can do, with admin-controlled rollout in shared deployments.",
  },
  {
    title: "Multi-User Deployments",
    description:
      "Optional authentication with isolated per-user workspaces, admin grants, and scoped access — off by default, ready when you need it.",
  },
];

export default function SolutionsPage() {
  return (
    <MarketingPage
      eyebrow="Solutions"
      title="One workspace, several ways to learn"
      subtitle="EDU AI isn't a single chatbot — it's a set of surfaces built around one continuous learning workspace."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {SOLUTIONS.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5"
          >
            <h2 className="text-base font-semibold text-white mb-1.5">{item.title}</h2>
            <p className="text-sm text-neutral-400 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </MarketingPage>
  );
}
