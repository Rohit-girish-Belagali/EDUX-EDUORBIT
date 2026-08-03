import MarketingPage from "@/components/marketing/MarketingPage";

export default function CompanyPage() {
  return (
    <MarketingPage
      eyebrow="Company"
      title="A student startup, building in the open"
      subtitle="EDU AI (EDUX) started as a student project and is still built that way — a small team shipping an agent-native learning companion in public."
    >
      <section>
        <h2 className="text-xl font-semibold text-white mb-2">Why we're building this</h2>
        <p>
          We started as students who wanted an AI tutor that actually adapts to how a
          person learns, instead of a chat window bolted onto a search engine. That's
          the whole premise of EDU AI: personalized tutoring, deep research, and
          knowledge tools built around one continuous learning workspace rather than a
          single chatbot.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-2">How we work</h2>
        <p>
          The project is developed openly — the codebase, releases, and roadmap are all
          public, and anyone can self-host it. Being a small, student-run team means we
          move quickly and stay close to the people actually using it, rather than
          shipping behind a long release cycle.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-2">Get involved</h2>
        <p>
          Contributions, bug reports, and feature ideas are welcome — see the
          Resources page for where to find the repository, docs, and community.
        </p>
      </section>
    </MarketingPage>
  );
}
