const techStack = [
  { name: "Next.js 16", category: "Frontend", color: "text-white" },
  { name: "TypeScript", category: "Language", color: "text-blue-400" },
  { name: "Tailwind CSS", category: "Styling", color: "text-cyan-400" },
  { name: "PostgreSQL", category: "Database", color: "text-blue-300" },
  { name: "TimescaleDB", category: "Time-Series", color: "text-yellow-400" },
  { name: "Redis", category: "Cache", color: "text-red-400" },
  { name: "Docker", category: "Deploy", color: "text-blue-500" },
  { name: "GitHub Actions", category: "CI/CD", color: "text-zinc-300" },
];

export function TechStackSection() {
  return (
    <section className="bg-[#0d1117] px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Built with{" "}
            <span className="text-zinc-500">modern tools</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
            Production-grade stack. No legacy baggage. Easy to extend.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {techStack.map((tech) => (
            <div
              key={tech.name}
              className="flex flex-col items-center rounded-xl border border-white/5 bg-white/[0.02] p-5 text-center transition-all hover:border-white/10"
            >
              <span className={`text-lg font-semibold ${tech.color}`}>
                {tech.name}
              </span>
              <span className="mt-1 text-xs text-zinc-500">
                {tech.category}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
