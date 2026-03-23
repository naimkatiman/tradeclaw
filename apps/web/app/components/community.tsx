export function CommunitySection() {
  return (
    <section className="bg-[#0A0A0A] px-6 py-24">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Join the{" "}
          <span className="text-emerald-400">community</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
          TradeClaw is built by traders, for traders. Contribute strategies,
          report bugs, or just say hi.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <CommunityCard
            icon="💬"
            title="Discord"
            description="Chat with contributors. Share strategies. Get help."
            link="#"
            linkText="Join Discord"
          />
          <CommunityCard
            icon="🐛"
            title="GitHub Issues"
            description="Report bugs, request features, track progress."
            link="https://github.com/naimkatiman/tradeclaw/issues"
            linkText="Open Issue"
          />
          <CommunityCard
            icon="🤝"
            title="Contribute"
            description="First PR? We have good-first-issue labels waiting."
            link="https://github.com/naimkatiman/tradeclaw/blob/main/CONTRIBUTING.md"
            linkText="Read Guide"
          />
        </div>
      </div>
    </section>
  );
}

function CommunityCard({
  icon,
  title,
  description,
  link,
  linkText,
}: {
  icon: string;
  title: string;
  description: string;
  link: string;
  linkText: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-left">
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300"
      >
        {linkText} →
      </a>
    </div>
  );
}
