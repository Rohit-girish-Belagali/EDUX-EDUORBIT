import MarketingPage from "@/components/marketing/MarketingPage";

export default function TermsPage() {
  return (
    <MarketingPage
      eyebrow="Legal"
      title="Terms of Service"
      subtitle="EDU AI (EDUX) is distributed as open-source software under the Apache 2.0 license. These terms cover using the software; they aren't a substitute for reading the license itself."
    >
      <section>
        <h2 className="text-xl font-semibold text-white mb-2">The software</h2>
        <p>
          EDU AI is provided "as is," without warranty of any kind, per the Apache 2.0
          license under which it's released. You're free to run, modify, and self-host
          it subject to that license's terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-2">Who's responsible for a deployment</h2>
        <p>
          Whoever deploys and operates an instance — including this one — is responsible
          for how it's configured, who's given access, what third-party AI providers it's
          connected to, and compliance with any laws that apply to their use of it.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-2">Acceptable use</h2>
        <p>
          Don't use the software to violate applicable law, to attempt to gain
          unauthorized access to a deployment or its underlying infrastructure, or to
          circumvent access controls set by a deployment's administrator.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-2">Third-party services</h2>
        <p>
          Features that call out to third-party providers — LLM APIs, Google sign-in via
          Firebase, or similar — are also governed by those providers' own terms. We
          don't control and aren't responsible for their behavior.
        </p>
      </section>
    </MarketingPage>
  );
}
