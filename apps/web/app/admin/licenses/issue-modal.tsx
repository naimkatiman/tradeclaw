'use client';

interface IssueModalProps {
  plaintextKey: string;
  onClose: () => void;
}

export default function IssueModal({ plaintextKey, onClose }: IssueModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-lg border border-amber-600 bg-neutral-900 p-6">
        <h2 className="mb-2 text-lg font-bold text-amber-400">
          Copy this key now
        </h2>
        <p className="mb-4 text-sm text-neutral-300">
          This key will <strong>not</strong> be shown again. Copy it to your
          clipboard and deliver it to the customer. If lost, you must issue a new key.
        </p>
        <div className="mb-4 rounded border border-neutral-700 bg-neutral-950 p-3">
          <code className="break-all font-mono text-sm text-emerald-300">
            {plaintextKey}
          </code>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(plaintextKey)}
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
