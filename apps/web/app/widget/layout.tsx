/**
 * Bare widget layout — no navbar, no footer, no mobile nav.
 * Widget pages under /widget/* render standalone for iframe embedding.
 * The root layout still wraps this, but widget pages fill the viewport
 * with their own background so parent chrome is hidden.
 */
export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
