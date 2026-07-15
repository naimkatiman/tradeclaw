import type { ReactNode } from 'react';

/**
 * The signal workspace is intentionally public and read-only by default.
 * Mutating actions (alerts, integrations, paper trading) enforce their own
 * session checks at the API boundary.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
