export default function LoadingToday() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 pt-20" data-condition="loading">
      <p>Loading the published record.</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Follows stay on this device.</p>
      <p className="mt-4 text-sm">Wait for this check to finish.</p>
    </main>
  );
}
