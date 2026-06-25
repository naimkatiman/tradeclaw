'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Lock, X } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Short heading shown in the modal. */
  title: string;
  /** One-liner explaining what the user tried to do and why it's Pro-only. */
  reason: string;
  /** `from` param appended to /pricing for attribution tracking. */
  from: string;
}

/**
 * Pre-action upgrade modal for free users.
 *
 * Shows *before* the API call fires so users never see a raw 402 JSON
 * response. Used wherever a free-tier action would be rejected server-side.
 */
export function UpgradeModal({ open, onClose, title, reason, from }: UpgradeModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = 'upgrade-modal-title';

  useEffect(() => {
    if (!open) return;
    // Focus the close button when the modal opens
    closeRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm mx-4 rounded-2xl border border-emerald-500/20 bg-[#0a0a0a] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Lock size={20} className="text-emerald-400" />
          </div>
          <h3 id={titleId} className="text-sm font-semibold text-white mb-1.5">{title}</h3>
          <p className="text-xs text-zinc-400 leading-relaxed mb-5">{reason}</p>

          <Link
            href={`/pricing?from=${encodeURIComponent(from)}`}
            className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors text-center"
          >
            Upgrade to Pro · $29/mo
          </Link>
          <button
            onClick={onClose}
            className="mt-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing upgrade modal state.
 *
 * Usage:
 * ```tsx
 * const { showUpgrade, modal } = useUpgradeModal();
 * // Before a Pro-only action:
 * if (tier === 'free') { showUpgrade('Export CSV', 'CSV export is a Pro feature.', 'csv-export'); return; }
 * // Render the modal:
 * return <>{modal}</>
 * ```
 */
export function useUpgradeModal() {
  const [state, setState] = useState<{ open: boolean; title: string; reason: string; from: string }>({
    open: false,
    title: '',
    reason: '',
    from: '',
  });

  const showUpgrade = (title: string, reason: string, from: string) => {
    setState({ open: true, title, reason, from });
  };

  const close = () => setState((s) => ({ ...s, open: false }));

  const modal = (
    <UpgradeModal
      open={state.open}
      onClose={close}
      title={state.title}
      reason={state.reason}
      from={state.from}
    />
  );

  return { showUpgrade, modal };
}
