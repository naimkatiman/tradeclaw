import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';
import { EmailCapture } from './components/EmailCapture';
import { RelatedPosts } from './components/RelatedPosts';
import { TrialCTA } from './components/TrialCTA';

type AnchorProps = ComponentPropsWithoutRef<'a'>;

function MdxAnchor({ href, children, ...rest }: AnchorProps) {
  if (!href) return <a {...rest}>{children}</a>;
  if (href.startsWith('/')) {
    return (
      <Link href={href} className="text-emerald-400 hover:underline">
        {children}
      </Link>
    );
  }
  if (href.startsWith('#')) {
    return (
      <a href={href} className="text-emerald-400 hover:underline" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-emerald-400 hover:underline"
      {...rest}
    >
      {children}
    </a>
  );
}

export const mdxComponents = {
  a: MdxAnchor,
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="text-lg font-semibold text-white mt-8 mb-3" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="font-semibold text-white mt-6 mb-2" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="text-zinc-300 leading-7" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="space-y-2 text-zinc-400 list-disc list-inside" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="space-y-2 text-zinc-400 list-decimal list-inside" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<'strong'>) => (
    <strong className="text-white" {...props} />
  ),
  code: (props: ComponentPropsWithoutRef<'code'>) => (
    <code
      className="text-emerald-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs"
      {...props}
    />
  ),
  pre: (props: ComponentPropsWithoutRef<'pre'>) => (
    <pre
      className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-xs text-zinc-300 overflow-x-auto leading-relaxed font-mono"
      {...props}
    />
  ),
  hr: () => <hr className="border-zinc-800 my-8" />,
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote
      className="border-l-2 border-emerald-500/40 pl-4 text-zinc-400 italic"
      {...props}
    />
  ),
  EmailCapture,
  RelatedPosts,
  TrialCTA,
};
