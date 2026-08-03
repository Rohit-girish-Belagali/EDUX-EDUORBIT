import MarketingPage from "@/components/marketing/MarketingPage";

export default function PrivacyPage() {
  return (
    <MarketingPage
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="EDU AI (EDUX) is self-hosted, open-source software. This describes how data flows through the software itself — a specific deployment's operator is responsible for how they run and secure it."
    >
      <section>
        <h2 className="text-xl font-semibold text-white mb-2">What's stored, and where</h2>
        <p>
          Chat history, uploaded knowledge-base documents, notebooks, and account records
          are stored as local files (SQLite and plain files) on whichever machine or
          server the software is deployed to. There is no central server operated by
          the project that collects this data — each deployment holds its own data.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-2">Account & sign-in data</h2>
        <p>
          When a deployment enables authentication, sign-in can go through email/password
          (handled by the deployment itself) or a third-party identity provider such as
          Google via Firebase Authentication. In that case, the provider handles credential
          verification per its own privacy policy; the deployment receives only the
          resulting account identifier and email.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-2">Third-party AI providers</h2>
        <p>
          Messages and documents you send through the assistant are relayed to whichever
          LLM provider the deployment is configured to use (e.g. OpenAI, Anthropic, Google,
          or a local model). That provider's own privacy policy governs how they handle
          the content once it reaches them.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-2">Your control over your data</h2>
        <p>
          Because everything lives in a data directory you or your deployment's operator
          control, deleting an account, a knowledge base, or the whole deployment removes
          the underlying files with it. There is no separate copy retained by the project.
        </p>
      </section>
    </MarketingPage>
  );
}
